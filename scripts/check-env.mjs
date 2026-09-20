import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parse } from "dotenv";

/**
 * Finds secrets that .env silently mangles before the app ever sees them.
 *
 * Written after a 16-character mailbox password arrived at the SMTP server as 8
 * characters. The password contained a `#`, and in an unquoted .env value
 * dotenv's rule for the value is [^#\r\n]+ — it stops at the first `#` and
 * throws the rest away. No error, no warning, nothing in any log: the app
 * simply authenticates with half a password and the server says 535.
 *
 * Two things do this, and both are invisible by inspection:
 *
 *   #   truncates an UNQUOTED value from that character on.
 *   $   is expanded — Next runs dotenv-expand — so $FOO becomes the value of
 *       FOO, or an empty string when FOO is not set.
 *
 * Quoting the value defeats both. This script reports every key whose stored
 * value differs from what is written on the line, so the next one is caught in
 * a single run instead of an afternoon.
 *
 *   node scripts/check-env.mjs
 *
 * It never prints a secret: secrets are reported as a length and the first
 * eight characters of a SHA-256, which is enough to compare two values without
 * revealing either. Nothing is written or changed.
 */

const NODE_ENV = process.env.NODE_ENV || "production";
// Lowest precedence first — the order Next applies them, each overriding the last.
const FILES = [".env", `.env.${NODE_ENV}`, ".env.local", `.env.${NODE_ENV}.local`];

/** Anything whose value must never be printed. */
const SECRET = /PASS|SECRET|KEY|TOKEN|SALT|AUTH|CREDENTIAL|DATABASE_URL|DSN|WEBHOOK/i;

const short = (v) => createHash("sha256").update(v).digest("hex").slice(0, 8);
const describe = (key, value) =>
  SECRET.test(key) ? `length ${value.length}, sha256 ${short(value)}` : JSON.stringify(value);

/**
 * The raw right-hand side of a line, exactly as typed, before dotenv touches it.
 * Deliberately naive — that is the point: it is the human's intent, and the
 * comparison against dotenv's answer is what reveals the damage.
 */
function rawValues(text) {
  const out = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*#/.test(line) || !line.includes("=")) continue;
    const m = line.match(/^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*)$/);
    if (!m) continue;
    out.set(m[1], m[2]);
  }
  return out;
}

const isQuoted = (raw) => {
  const t = raw.trim();
  return (
    (t.startsWith('"') && t.endsWith('"') && t.length > 1) ||
    (t.startsWith("'") && t.endsWith("'") && t.length > 1) ||
    (t.startsWith("`") && t.endsWith("`") && t.length > 1)
  );
};

let problems = 0;
let checked = 0;
let anyFile = false;

for (const file of FILES) {
  if (!existsSync(file)) continue;
  anyFile = true;

  const text = readFileSync(file, "utf8");
  const parsed = parse(text);
  const raw = rawValues(text);

  console.log(`\n${file}`);
  console.log("-".repeat(file.length));

  for (const [key, storedValue] of Object.entries(parsed)) {
    checked++;
    const rawLine = raw.get(key) ?? "";
    const quoted = isQuoted(rawLine);
    const notes = [];

    // The one that cost the afternoon.
    if (!quoted && rawLine.includes("#")) {
      notes.push(
        `TRUNCATED AT '#': the line holds ${rawLine.trim().length} characters, the app gets ${storedValue.length}`,
      );
    }

    // Next runs dotenv-expand, so an unquoted $NAME is substituted.
    if (!quoted && /\$\w|\$\{/.test(rawLine)) {
      notes.push("CONTAINS '$': it will be expanded as a variable, not sent literally");
    }

    // Quoting also protects whitespace at the ends, which is otherwise trimmed.
    if (!quoted && rawLine !== rawLine.trim()) {
      notes.push("leading or trailing whitespace is trimmed away");
    }

    if (!quoted && SECRET.test(key)) {
      notes.push("unquoted secret — quote it so # and $ cannot bite later");
    }

    const bad = notes.some((n) => n.startsWith("TRUNCATED") || n.startsWith("CONTAINS"));
    if (bad) problems++;

    const mark = bad ? "BROKEN " : notes.length ? "warn   " : "ok     ";
    console.log(`  ${mark} ${key.padEnd(34)} ${describe(key, storedValue)}`);
    for (const note of notes) console.log(`          → ${note}`);
  }
}

if (!anyFile) {
  console.log("No .env file found here. Run this from the app directory.");
  process.exit(1);
}

console.log(
  `\n${checked} value(s) checked. ${problems} being mangled before the app sees them.` +
    (problems
      ? `\n\nFix each one by wrapping the value in double quotes:\n  SMTP_PASS="the#whole$value"\nThen restart the app — a running process keeps the value it started with.`
      : `\n\nEvery value reaches the app exactly as written.`) +
    `\n\nNothing above is a secret: secrets are shown as a length and a short hash.`,
);

process.exit(problems ? 1 : 0);
