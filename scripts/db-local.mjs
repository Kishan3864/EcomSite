#!/usr/bin/env node
/**
 * Manages the isolated local Postgres cluster used for development.
 *
 *   npm run db:start   — init (first time) and start Postgres on port 5433
 *   npm run db:stop    — stop it
 *   npm run db:status  — is it running?
 *
 * The cluster lives in ./.pgdata (gitignored) and never touches a system-wide
 * Postgres on 5432. Production uses a normal managed Postgres via DATABASE_URL.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, appendFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const DATA = join(ROOT, ".pgdata");
const PORT = process.env.LOCAL_PG_PORT ?? "5433";
const USER = "mayura";
const DB = "mayura";

function findBin(name) {
  const candidates = [
    process.env.PG_BIN && join(process.env.PG_BIN, name),
    `C:\\Program Files\\PostgreSQL\\17\\bin\\${name}.exe`,
    `C:\\Program Files\\PostgreSQL\\16\\bin\\${name}.exe`,
    `C:\\Program Files\\PostgreSQL\\15\\bin\\${name}.exe`,
    `/usr/lib/postgresql/16/bin/${name}`,
    `/usr/local/bin/${name}`,
    `/opt/homebrew/bin/${name}`,
    name,
  ].filter(Boolean);
  for (const c of candidates) {
    const probe = spawnSync(c, ["--version"], { stdio: "ignore" });
    if (probe.status === 0) return c;
  }
  throw new Error(`Could not find ${name}. Install PostgreSQL or set PG_BIN.`);
}

const pgctl = findBin("pg_ctl");
const psql = findBin("psql");
const initdb = findBin("initdb");

function run(bin, args, opts = {}) {
  return execFileSync(bin, args, { stdio: "inherit", ...opts });
}

function status() {
  const r = spawnSync(pgctl, ["-D", DATA, "status"], { encoding: "utf8" });
  return r.status === 0;
}

const cmd = process.argv[2];

if (cmd === "start") {
  if (!existsSync(join(DATA, "PG_VERSION"))) {
    mkdirSync(DATA, { recursive: true });
    console.log("Initialising local Postgres cluster in .pgdata …");
    run(initdb, ["-D", DATA, "-U", USER, "--auth=trust", "-E", "UTF8", "--locale=C"], {
      stdio: "ignore",
    });
    appendFileSync(
      join(DATA, "postgresql.conf"),
      `\nport = ${PORT}\nlisten_addresses = 'localhost'\nlogging_collector = off\n`,
    );
  }
  if (status()) {
    console.log(`Local Postgres already running on ${PORT}.`);
  } else {
    // Detached + ignored stdio: on Windows pg_ctl otherwise keeps the console
    // pipe open through the postgres child and never returns.
    run(pgctl, ["-D", DATA, "-l", join(DATA, "server.log"), "-w", "start"], { stdio: "ignore", windowsHide: true });
  }
  // Create the app database if it is missing (idempotent).
  const exists = spawnSync(
    psql,
    ["-U", USER, "-h", "localhost", "-p", PORT, "-d", "postgres", "-tAc",
      `select 1 from pg_database where datname='${DB}'`],
    { encoding: "utf8" },
  ).stdout.trim();
  if (exists !== "1") {
    run(psql, ["-U", USER, "-h", "localhost", "-p", PORT, "-d", "postgres", "-c", `create database ${DB}`]);
  }
  console.log(`\nReady: postgresql://${USER}@localhost:${PORT}/${DB}`);
} else if (cmd === "stop") {
  if (status()) run(pgctl, ["-D", DATA, "-m", "fast", "stop"]);
  else console.log("Local Postgres is not running.");
} else if (cmd === "status") {
  console.log(status() ? `running on ${PORT}` : "stopped");
  process.exit(status() ? 0 : 1);
} else {
  console.log("usage: db-local.mjs start|stop|status");
  process.exit(1);
}
