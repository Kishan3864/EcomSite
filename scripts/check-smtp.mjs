import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createTransport } from "nodemailer";

/**
 * Tells you which credentials the app will actually use, and whether they work.
 *
 * Built after a long hunt for a 535 that a plain dotenv script could not
 * reproduce. Two things make the app and a hand-written test disagree, and this
 * checks both:
 *
 *  1. Next loads MORE env files than dotenv does, and some of them win.
 *     Precedence is: real process env > .env.$NODE_ENV.local > .env.local >
 *     .env.$NODE_ENV > .env. A forgotten .env.local or .env.production quietly
 *     overrides .env, so the app authenticates with something you are not
 *     looking at.
 *  2. A value can be mangled between .env and the server. This prints the
 *     length and a short hash of the password — never the password — so the
 *     figure can be compared with the line the app logs on its first send. If
 *     the hashes differ, the app is not sending what .env holds.
 *
 * Run it in the app directory, the same place PM2 runs from:
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

/** Parses one env file the way dotenv does, enough for this report. */
function parse(file) {
  const out = new Map();
  if (!existsSync(file)) return null;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    // Surrounding quotes are dotenv's, not part of the value.
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out.set(m[1], value);
  }
  return out;
}

const NODE_ENV = process.env.NODE_ENV || "production";
// Lowest precedence first, so later files overwrite earlier ones — the order
// Next itself applies.
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
  for (const k of present) winner.set(k, { file, value: parsed.get(k) });
}

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
}

// A variable exported in the shell or set by PM2 beats every file.
const overridden = KEYS.filter((k) => process.env[k] !== undefined && winner.has(k) && process.env[k] !== winner.get(k).value);
if (overridden.length) {
  console.log(`\n  NOTE: the real process environment overrides the files for: ${overridden.join(", ")}`);
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
    `\n\nCompare that hash with the "[mail] using …" line the app logs on its first send.` +
    `\nIf they differ, the running app is not using this .env.`,
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
