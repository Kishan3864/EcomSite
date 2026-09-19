// Keeps Next's optimised-image cache ACROSS deploys.
//
// Next writes every resized, re-encoded image to <distDir>/cache/images. The
// deploy builds each release into a fresh directory and swaps it in, so every
// deploy started with that cache EMPTY: the first visitor to a product page
// asked for ~20 variants nobody had encoded yet, the optimiser queued them, the
// queue outlived nginx's 60 s proxy_read_timeout and the gallery 504'd — until
// the cache filled and it "fixed itself". Once per deploy.
//
// The cache now lives in shared/next-image-cache, outside any release, and each
// build's cache/images is a symlink to it. The cache key is (source url, width,
// quality, format) — nothing about the build — so an entry written by one
// release is a hit for the next.
//
// Runs as npm's `postbuild`, so it acts on whichever directory was just built.
// It only acts on a deploy build (NEXT_DIST_DIR is set by deploy/deploy.sh): a
// local `npm run build` is left alone, and Windows needs no symlink rights.
//
// It must never fail a build. Whatever goes wrong, the release simply keeps
// an ordinary, release-local cache — the old behaviour — and says so.
import { cpSync, existsSync, lstatSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";

const dist = process.env.NEXT_DIST_DIR;
if (!dist) process.exit(0);

try {
  const root = process.cwd();
  const shared = resolve(root, "shared", "next-image-cache");
  const link = resolve(root, dist, "cache", "images");
  mkdirSync(shared, { recursive: true });
  mkdirSync(join(root, dist, "cache"), { recursive: true });

  // First time only: carry over what the live release has already encoded.
  const live = resolve(root, ".next", "cache", "images");
  if (existsSync(live) && !lstatSync(live).isSymbolicLink()) {
    cpSync(live, shared, { recursive: true, force: false, errorOnExist: false });
  }

  if (existsSync(link) || lstatSync(link, { throwIfNoEntry: false })) rmSync(link, { recursive: true, force: true });
  symlinkSync(shared, link, "junction"); // the type only matters on Windows; Linux ignores it
  console.log(`  image cache: ${dist}/cache/images -> shared/next-image-cache (kept across deploys)`);
} catch (error) {
  console.warn(`  image cache: could not link the shared cache (${error?.message ?? error}). This release keeps its own; nothing else is affected.`);
}
