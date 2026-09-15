/**
 * Deploy the shop, from this PC, in one command.
 *
 *   npm run deploy            # live shop  — main branch
 *   npm run deploy staging    # rehearsal  — staging branch
 *
 * The flow, and the whole point of this file:
 *
 *   local commit  →  push to GitHub  →  server pulls from GitHub  →  build
 *
 * GitHub is the single source of truth. The server never receives code from
 * anywhere else, so what is live is always a commit you can see on github.com.
 *
 * It used to be possible to push code straight to the server, bypassing GitHub
 * (`git push production main`). That is what let the two drift apart: the
 * server ran a redesign GitHub had never heard of, and the next ordinary
 * `deploy.sh` — which pulls from GitHub — quietly reset the live site back to
 * the older commit and took the redesign off the shop. One source of truth is
 * the fix for that, and this script is the only door to it.
 *
 * Everything that could differ between machines is an environment variable, so
 * nobody has to edit this file to deploy from somewhere else.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SERVER = process.env.DEPLOY_SSH_HOST || "flexyuser@187.127.141.107";
const APP_DIR = process.env.DEPLOY_APP_DIR || "~/ecom.flexypdf.com";

/**
 * The key to reach the server with.
 *
 * Left unset, ssh uses whatever the agent and ~/.ssh/config already offer,
 * which is what a normal `ssh flexyuser@…` does. Named, it is used alone, so a
 * box with several keys does not offer the wrong one three times and get itself
 * refused for too many attempts.
 */
const KEY =
  process.env.DEPLOY_SSH_KEY ??
  (existsSync(join(homedir(), ".ssh", "flexypdf_deploy"))
    ? join(homedir(), ".ssh", "flexypdf_deploy")
    : null);

const TARGET = (process.argv[2] || "production").toLowerCase();
const BRANCH = TARGET === "staging" ? "staging" : "main";
if (!["production", "staging"].includes(TARGET)) {
  fail(`Unknown target "${TARGET}". Use: production (default) or staging.`);
}

const C = { cyan: "\x1b[1;36m", dim: "\x1b[90m", red: "\x1b[1;31m", green: "\x1b[1;32m", off: "\x1b[0m" };
const step = (s) => console.log(`\n${C.cyan}▸ ${s}${C.off}`);
const note = (s) => console.log(`${C.dim}  ${s}${C.off}`);

function fail(message) {
  console.error(`\n${C.red}✗ ${message}${C.off}\n`);
  process.exit(1);
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

function ssh(remoteCommand, { stream = false } = {}) {
  const args = ["-o", "BatchMode=yes", "-o", "ConnectTimeout=20"];
  if (KEY) args.push("-o", "IdentitiesOnly=yes", "-i", KEY);
  args.push(SERVER, remoteCommand);
  const result = spawnSync("ssh", args, {
    stdio: stream ? "inherit" : ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  if (result.error) fail(`Could not run ssh: ${result.error.message}`);
  return result;
}

/* ── 1. Is this PC in a fit state to deploy from? ───────────────────────── */

step("Checking the working tree");

const branch = git("rev-parse", "--abbrev-ref", "HEAD");
if (branch !== BRANCH) {
  fail(`You are on "${branch}" but ${TARGET} deploys "${BRANCH}".\n  Switch first:  git switch ${BRANCH}`);
}

// A dirty tree is the classic "it works on my machine": the thing you tested
// is not the thing that would be pushed.
const dirty = git("status", "--porcelain");
if (dirty) {
  fail(
    `You have uncommitted changes. Commit them first — only committed work can be deployed.\n\n${dirty
      .split("\n")
      .map((l) => `    ${l}`)
      .join("\n")}`,
  );
}

note(`branch ${branch} at ${git("log", "-1", "--format=%h — %s")}`);

/* ── 2. GitHub first, always ────────────────────────────────────────────── */

step("Fetching GitHub");
execFileSync("git", ["fetch", "origin", BRANCH], { stdio: "inherit" });

// Behind origin means somebody else pushed. Pushing now would either be
// refused or, worse, force the shop back to an older state.
const behind = git("rev-list", "--count", `HEAD..origin/${BRANCH}`);
if (behind !== "0") {
  fail(
    `origin/${BRANCH} has ${behind} commit(s) you do not have.\n` +
      `  Bring them in first:  git pull --rebase origin ${BRANCH}`,
  );
}

const ahead = git("rev-list", "--count", `origin/${BRANCH}..HEAD`);
if (ahead === "0") {
  note("GitHub is already up to date — nothing new to push.");
} else {
  step(`Pushing ${ahead} commit(s) to GitHub`);
  execFileSync("git", ["push", "origin", BRANCH], { stdio: "inherit" });
}

const commit = git("rev-parse", "HEAD");

/* ── 3. The server pulls it back down and builds ────────────────────────── */

step(`Deploying on ${SERVER}`);
note("the server pulls from GitHub; the live site keeps serving until the build is finished");
console.log();

const deployed = ssh(`cd ${APP_DIR} && bash deploy/deploy.sh ${TARGET}`, { stream: true });
if (deployed.status !== 0) {
  fail(
    `The deploy failed on the server (exit ${deployed.status}).\n` +
      `  The shop has not been changed — deploy.sh only swaps a build that finished.\n` +
      `  Logs:  ssh ${SERVER} "pm2 logs weekendcart --lines 50"`,
  );
}

/* ── 4. Say what is actually live, rather than assuming ─────────────────── */

step("Confirming what is live");

const live = ssh(`cd ${APP_DIR} && git rev-parse HEAD`);
const liveCommit = (live.stdout || "").trim();

if (liveCommit !== commit) {
  fail(
    `The server is on ${liveCommit.slice(0, 7)} but ${commit.slice(0, 7)} was deployed.\n` +
      `  Something else moved it. Check:  ssh ${SERVER} "cd ${APP_DIR} && git reflog -5"`,
  );
}

console.log(`\n${C.green}✓ Live at ${commit.slice(0, 7)} — ${git("log", "-1", "--format=%s")}${C.off}`);
console.log(`${C.dim}  GitHub, this PC and the server are all on the same commit.${C.off}\n`);
