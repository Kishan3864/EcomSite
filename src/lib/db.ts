import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * One Prisma client per process.
 *
 * Next.js re-evaluates modules on every hot reload in development, which would
 * otherwise open a fresh connection pool each time; caching the instance on
 * `globalThis` keeps it to one. Production gets a plain module singleton.
 */

declare global {
  var __weekendcartPrisma: PrismaClient | undefined;
}

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and point it at a Postgres database.",
    );
  }

  /**
   * How many connections this process may hold — and why the default is small.
   *
   * There is no single right number, because this file runs in two very
   * different situations:
   *
   *   serving    ONE PM2 fork handling every visitor. It wants a generous pool,
   *              or concurrent checkouts queue behind each other.
   *   building   `next build` forks ELEVEN workers, each importing this module
   *              and each opening its own pool. Eleven generous pools is 275
   *              connections against a server that allows 100, and the build
   *              dies with "sorry, too many clients already" — which is exactly
   *              what happened the first time this was raised to 25 flat.
   *
   * So the large pool is opt-in, not the default: `deploy/ecosystem.config.cjs`
   * sets DB_POOL_MAX for the serving process and nothing else does. A build, a
   * seed script, `prisma studio` and `next dev` all get the small one. Failing
   * safe matters more than failing big here — a slightly tight pool is slow,
   * an oversized one takes the database down for every app on the box.
   */
  const max = Number(process.env.DB_POOL_MAX) || 5;

  /**
   * `connectionTimeoutMillis` is the load-bearing line, and it was absent.
   *
   * Without it pg-pool queues a request that finds the pool full and never
   * times it out — no deadline, no queue cap. The eleventh concurrent checkout
   * simply waited; nginx gave up after 60 seconds; the shopper got a 502 on a
   * page that may not even have needed the database. That is the honest
   * mechanism behind "sometimes the site just stops".
   *
   * With a timeout, an exhausted pool becomes a fast, catchable error that the
   * checkout's error boundary shows as "try again". A failure you can see
   * beats a wait you cannot.
   *
   * `maxLifetimeSeconds` retires connections quietly rather than letting a
   * long-lived one rot behind a restarted database.
   */
  const adapter = new PrismaPg({
    connectionString,
    max,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    maxLifetimeSeconds: 900,
  });

  return new PrismaClient({
    adapter,
    /**
     * An interactive transaction holds a connection for its whole body, so an
     * unbounded one can pin a connection while the pool starves. `maxWait` is
     * how long a transaction waits to start; `timeout` is how long its body
     * may run before it is rolled back. Both bounded, deliberately.
     */
    transactionOptions: { maxWait: 5_000, timeout: 15_000 },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db: PrismaClient = globalThis.__weekendcartPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalThis.__weekendcartPrisma = db;

export type { PrismaClient };
