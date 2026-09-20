import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createTransport } from "nodemailer";
import dotenv from "dotenv";

/**
 * Tells you which credentials the app will actually use, and whether they work.
 *
 * Built after a long hunt for a 535 that a hand-written test could not
 * reproduce, and then rewritten after this script itself became part of the
 * problem. Three things make the app and a test script disagree, and it checks
 * all of them:
 *
 *  1. The value is mangled between the file and the app. dotenv's rule for an
 *     UNQUOTED value is [^#\r\n]+ — it stops at the first '#' and discards the
 *     rest — and Next then runs dotenv-expand, so an unquoted '$NAME' is
 *     substituted. A 16-character password containing '#' reached the SMTP
 *     server as 8 characters, with nothing logged anywhere.
 *
 *  2. Next loads MORE env files than a test script does, and some of them win:
 *     real process env > .env.$NODE_ENV.local > .env.local > .env.$NODE_ENV >
 *     .env. A forgotten .env.local overrides .env invisibly.
 *
 *  3. The app runs somewhere else, and reads a different .env entirely. Compare
 *     the `cwd` the app logs with the directory this reports.
 *
 * The parsing here is done by the REAL dotenv, not by hand. The earlier version
 * hand-rolled it, took everything after the '=', and so read the full password
 * while the app read the truncated one — then authenticated successfully and
 * reported that all was well. Never re-implement a config format when the
 * library production uses is installed beside you.
 *
 *   node scripts/check-smtp.mjs            # report only
 *   node scripts/check-smtp.mjs --verify   # also ask the server to authenticate
 *   node scripts/check-smtp.mjs --send you@example.com
 *
 * It never prints a password, and never writes anything.
 */

const args = process.argv.slice(2);
const wantVerify = args.includes("--verify");
const sendTo = args.includes("--send") ? args[args.indexOf("--send") + 1] : null;

const short = (value) => createHash("sha256").update(value).digest("hex").slice(0, 8);

/** Parses with the real dotenv, keeping the raw line beside each value. */
function parse(file) {
  if (!existsSync(file)) return null;
  const text = readFileSync(file, "utf8");
  const parsed = dotenv.parse(text);
  const lines = text.split(/\r?\n/);

  const out = new Map();
  for (const [key, value] of Object.entries(parsed)) {
    const line = lines.find((l) => new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`).test(l)) ?? "";
    const raw = line.slice(line.indexOf("=") + 1).trim();
    const quoted =
      (raw.startsWith('"') && raw.endsWith('"') && raw.length > 1) ||
      (raw.startsWith("'") && raw.endsWith("'") && raw.length > 1);
    out.set(key, { value, raw, quoted });
  }
  return out;
}

/** What an unquoted value loses on its way to the app, or null when it is safe. */
function mangled(entry) {
  if (!entry || entry.quoted) return null;
  if (entry.raw.includes("#")) {
    return `TRUNCATED AT '#' — the line holds ${entry.raw.length} characters, the app gets ${entry.value.length}`;
  }
  if (/\$\w|\$\{/.test(entry.raw)) {
    return "CONTAINS '$' — it is expanded as a variable, not sent literally";
  }
  return null;
}

const NODE_ENV = process.env.NODE_ENV || "production";
// Lowest precedence first, so later files overwrite earlier ones — Next's order.
const FILES = [".env", `.env.${NODE_ENV}`, ".env.local", `.env.${NODE_ENV}.local`];
const KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "GMAIL_USER", "GMAIL_APP_PASSWORD"];

console.log(`NODE_ENV=${NODE_ENV}\nWorking directory: ${process.cwd()}\n`);

console.log("Env files, lowest precedence first:");
const winner = new Map();
for (const file of FILES) {
  const parsed = parse(file);
  if (!parsed) {
    console.log(`  ${file.padEnd(28)} (absent)`);
    continue;
  }
  const present = KEYS.filter((k) => parsed.has(k));
  console.log(`  ${file.padEnd(28)} sets: ${present.length ? present.join(", ") : "none of the mail keys"}`);
  for (const k of present) winner.set(k, { file, ...parsed.get(k) });
}

const broken = [];

console.log("\nWhat wins, before the real process environment is applied:");
for (const key of KEYS) {
  const hit = winner.get(key);
  if (!hit) {
    console.log(`  ${key.padEnd(20)} —`);
    continue;
  }
  const secret = key.includes("PASS");
  const shown = secret
    ? `length ${hit.value.length}, sha256 ${short(hit.value)}${/\s/.test(hit.value) ? ", CONTAINS WHITESPACE" : ""}`
    : hit.value;
  console.log(`  ${key.padEnd(20)} ${shown}    (from ${hit.file})`);

  const damage = mangled(hit);
  if (damage) {
    broken.push(key);
    console.log(`  ${" ".repeat(20)} !! ${damage}`);
    console.log(`  ${" ".repeat(20)} !! quote it:  ${key}="…"`);
  }
}

// A variable exported in the shell or set by PM2 beats every file.
const overridden = KEYS.filter(
  (k) => process.env[k] !== undefined && winner.has(k) && process.env[k] !== winner.get(k).value,
);
if (overridden.length) {
  console.log(`\n  NOTE: the real process environment overrides the files for: ${overridden.join(", ")}`);
}

if (broken.length) {
  const rule = "─".repeat(64);
  console.log(
    `\n  ${rule}\n` +
      `  ${broken.length} value(s) are mangled before the app ever sees them: ${broken.join(", ")}\n` +
      `  The app is NOT using what the line appears to say. Quote them, then\n` +
      `  restart — a running process keeps whatever it started with.\n` +
      `  ${rule}`,
  );
}

const user = process.env.SMTP_USER?.trim() || winner.get("SMTP_USER")?.value?.trim();
const pass = process.env.SMTP_PASS ?? winner.get("SMTP_PASS")?.value;
const host = process.env.SMTP_HOST || winner.get("SMTP_HOST")?.value || "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT || winner.get("SMTP_PORT")?.value) || 465;

if (!user || !pass) {
  console.log("\nNo SMTP_USER/SMTP_PASS found. The app would fall back to the Gmail pair, or send nothing.");
  process.exit(1);
}

console.log(
  `\nThe app will authenticate as ${user} at ${host}:${port} (secure=${port === 465})` +
    `\n  password length ${pass.length}, sha256 ${short(pass)}` +
    `\n\nCompare that hash with sendingHash in the app's "[mail] attempt {…}" line.` +
    `\nIf they differ, the running app is not sending what this file holds.`,
);

if (wantVerify || sendTo) {
  const transport = createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  try {
    await transport.verify();
    console.log("\nverify(): the server accepted these credentials.");
    if (broken.length) {
      console.log(
        "  BUT one of the values above is mangled for the app, so this success\n" +
          "  says nothing about what the app is sending. Fix the quoting first.",
      );
    }
  } catch (error) {
    console.log(`\nverify() FAILED: ${error.code ?? ""} ${error.message ?? error}`);
    process.exit(1);
  }

  if (sendTo) {
    const info = await transport.sendMail({
      from: user,
      to: sendTo,
      subject: "WeekendCart SMTP check",
      text: "If you are reading this, the app's own credentials work from the app's own directory.",
    });
    console.log(`Sent to ${sendTo}: ${info.accepted.length ? "accepted" : "not accepted"}`);
  }
  transport.close();
}
