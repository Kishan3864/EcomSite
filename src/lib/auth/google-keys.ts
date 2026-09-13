import { createLocalJWKSet, type JWTVerifyGetKey } from "jose";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { httpsFetch } from "@/lib/net/outbound";

/**
 * Google's signing keys, held locally so that signing in needs no network.
 *
 * This is the whole answer to a sign-in that works sometimes. The redirect
 * flow has to call Google while the customer waits — and on this server that
 * call is a coin toss, because outbound connections to Google time out
 * unpredictably on both address families. Nothing in our code can make an
 * unreliable network reliable while somebody is standing there waiting.
 *
 * So the waiting is taken out of it. A Google sign-in through the browser's own
 * Google Identity Services hands us a signed ID token; verifying it needs only
 * Google's public keys, and those change every few days, not every sign-in. We
 * fetch them in the background, keep them in memory, and write them to disk so
 * a restart does not need a live fetch either. A customer pressing the button
 * then waits on nothing but our own database.
 *
 * `jose`'s createRemoteJWKSet would fetch on demand, which is exactly the
 * behaviour we are removing: one bad moment and a sign-in fails.
 */

const CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";

/** Outside .next, which every deploy replaces. */
const CACHE_FILE = join(process.cwd(), ".cache", "google-jwks.json");

interface Jwks {
  keys: Record<string, unknown>[];
}

let current: Jwks | null = null;
let verifier: JWTVerifyGetKey | null = null;
let lastFetched = 0;

function isJwks(value: unknown): value is Jwks {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as Jwks).keys) &&
    (value as Jwks).keys.length > 0
  );
}

function adopt(jwks: Jwks) {
  current = jwks;
  verifier = createLocalJWKSet(jwks as Parameters<typeof createLocalJWKSet>[0]);
}

/** Fetches a fresh key set. Returns false rather than throwing: callers cope. */
export async function refreshGoogleKeys(): Promise<boolean> {
  try {
    const response = await httpsFetch(CERTS_URL, { timeoutMs: 8_000 });
    if (response.status !== 200) return false;

    const parsed: unknown = JSON.parse(response.body);
    if (!isJwks(parsed)) return false;

    adopt(parsed);
    lastFetched = Date.now();

    await mkdir(dirname(CACHE_FILE), { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(parsed), "utf8");
    return true;
  } catch {
    return false;
  }
}

async function loadFromDisk(): Promise<boolean> {
  try {
    const parsed: unknown = JSON.parse(await readFile(CACHE_FILE, "utf8"));
    if (!isJwks(parsed)) return false;
    adopt(parsed);
    return true;
  } catch {
    return false;
  }
}

/**
 * The key set to verify against, or null if we have never managed to get one.
 *
 * Order: memory, then the file from a previous run, then the network. Only the
 * very first sign-in after a fresh install can reach that third step.
 */
export async function googleKeySet(): Promise<JWTVerifyGetKey | null> {
  if (verifier) return verifier;
  if (await loadFromDisk()) return verifier;
  if (await refreshGoogleKeys()) return verifier;
  return null;
}

/**
 * Google rotates keys and publishes the new one before it starts using it, so
 * a set a few hours old still verifies today's tokens. This is for the case
 * where it does not: a token signed by a key we have never seen. One refresh,
 * not more often than every five minutes, so a flood of bad tokens cannot turn
 * into a flood of outbound requests.
 */
export async function refreshGoogleKeysIfStale(): Promise<JWTVerifyGetKey | null> {
  if (Date.now() - lastFetched < 5 * 60_000) return verifier;
  await refreshGoogleKeys();
  return verifier;
}

/** True once there is a usable key set, whatever its age. */
export function hasGoogleKeys() {
  return current !== null;
}
