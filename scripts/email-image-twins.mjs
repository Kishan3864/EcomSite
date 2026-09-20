import { readdir, stat, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative, dirname, basename, extname } from "node:path";
import sharp from "sharp";

/**
 * Writes a JPEG twin of every product image, for use in email only.
 *
 * Why: Outlook on Windows renders with Word's engine, which has never
 * supported WebP. Most of the catalogue's images are .webp, so an order
 * confirmation opened in Outlook showed alt text where the product should be.
 * The site keeps serving WebP — nothing here touches how pages load images, and
 * the Next image optimiser is untouched. The twins exist purely so that
 * `thumbnail()` in the order email has something every mail client can decode.
 *
 * Twins live beside the original as `<name>.email.jpg`, so they are obvious in
 * a directory listing and impossible to confuse with a source image.
 *
 * Idempotent: a twin is rebuilt only when it is missing or older than its
 * source, so running it twice costs one directory walk and nothing else. Safe
 * to run on the server after adding product images, and safe to run on a
 * schedule.
 *
 *   node scripts/email-image-twins.mjs            # build what is missing
 *   node scripts/email-image-twins.mjs --force    # rebuild every twin
 *   node scripts/email-image-twins.mjs --dry-run  # say what it would do
 *
 * Only ever writes files matching *.email.jpg. It never deletes, never
 * overwrites a source image, and never touches anything outside public/products.
 */

const ROOT = "public/products";
const SUFFIX = ".email.jpg";
/** Twice the 64px the email renders at, for a retina display. */
const WIDTH = 128;
const QUALITY = 78;

const force = process.argv.includes("--force");
const dryRun = process.argv.includes("--dry-run");

const SOURCE = /\.(webp|png|jpe?g)$/i;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

function twinPath(file) {
  return join(dirname(file), basename(file, extname(file)) + SUFFIX);
}

async function main() {
  if (!existsSync(ROOT)) {
    console.error(`${ROOT} does not exist — run this from the app directory.`);
    process.exit(1);
  }

  let made = 0;
  let skipped = 0;
  let bytes = 0;

  for await (const file of walk(ROOT)) {
    // A twin is not a source for another twin.
    if (file.endsWith(SUFFIX)) continue;
    if (!SOURCE.test(file)) continue;

    const twin = twinPath(file);
    if (!force && existsSync(twin)) {
      const [src, dst] = await Promise.all([stat(file), stat(twin)]);
      if (dst.mtimeMs >= src.mtimeMs) {
        skipped++;
        bytes += dst.size;
        continue;
      }
    }

    if (dryRun) {
      console.log(`would write ${relative(ROOT, twin)}`);
      made++;
      continue;
    }

    await mkdir(dirname(twin), { recursive: true });
    // Flattened onto white: a transparent PNG turned into JPEG goes black
    // otherwise, and the email's own background is white.
    const out = await sharp(file)
      .resize(WIDTH, WIDTH, { fit: "cover", position: "centre" })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: QUALITY, progressive: true, mozjpeg: true })
      .toFile(twin);

    made++;
    bytes += out.size;
  }

  const mb = (bytes / (1024 * 1024)).toFixed(2);
  console.log(
    dryRun
      ? `\n${made} twin(s) would be written. Nothing was changed.`
      : `\n${made} written, ${skipped} already current. Twins now occupy ${mb} MB.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
