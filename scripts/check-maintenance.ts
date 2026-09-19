/**
 * Maintenance mode cannot lock the owner out. This proves it.
 *
 *   npm run build && npx next start -p 3999      # in one terminal
 *   npx tsx scripts/check-maintenance.ts http://localhost:3999
 *
 * LOCAL ONLY. It switches maintenance mode ON by writing the settings row,
 * waits out the proxy's few-second memory of the old state, and then asks the
 * running server the questions that matter when the switch is on and the
 * owner's admin session has EXPIRED — so every request here carries no cookie:
 *
 *   the storefront     must answer 503 with Retry-After and noindex
 *   /admin/login       must answer 200 — this is the way back in
 *   /admin             must redirect to the login, never serve the holding page
 *   an API route       must not be 503 — PayU's callbacks keep landing
 *
 * The original row is read first and put back in a finally block in this same
 * run, and on an interrupt. It refuses to run against anything but a local
 * database, because it really does take the shop down for a few seconds.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";

const base = (process.argv[2] ?? "").replace(/\/$/, "");
const url = process.env.DATABASE_URL ?? "";
if (!base) {
  console.log("Usage: npx tsx scripts/check-maintenance.ts http://localhost:3999");
  process.exit(1);
}
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url) || !/^https?:\/\/(localhost|127\.0\.0\.1)[:/]?/.test(base)) {
  console.log("Refusing to run: both the database and the server must be local.");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const KEY = "maintenance";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const expect = (condition: boolean, label: string) => {
  console.log(`${condition ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${label}`);
  if (!condition) failures += 1;
};
const get = (path: string) => fetch(`${base}${path}`, { redirect: "manual" });

async function main() {
  const original = await db.storeSetting.findUnique({ where: { key: KEY } });
  const restore = async () => {
    if (original) await db.storeSetting.update({ where: { key: KEY }, data: { value: original.value as Prisma.InputJsonValue } });
    else await db.storeSetting.deleteMany({ where: { key: KEY } });
  };
  process.once("SIGINT", () => void restore().finally(() => process.exit(130)));

  try {
    const backBy = new Date(Date.now() + 3_600_000).toISOString();
    await db.storeSetting.upsert({
      where: { key: KEY },
      create: { key: KEY, value: { on: true, message: "Lock-out test.", backBy } },
      update: { value: { on: true, message: "Lock-out test.", backBy } },
    });
    // Written behind the app's back, so the proxy still remembers "off" for up
    // to five seconds. The admin's own switch does not have this wait.
    console.log("\nMaintenance ON, no admin cookie on any request. Waiting out the proxy's memory…");
    await sleep(6_000);

    const home = await get("/");
    expect(home.status === 503, `storefront /  answers ${home.status} (want 503)`);
    expect(Number(home.headers.get("retry-after")) >= 60, `Retry-After: ${home.headers.get("retry-after")}`);
    expect((home.headers.get("x-robots-tag") ?? "").includes("noindex"), `X-Robots-Tag: ${home.headers.get("x-robots-tag")}`);
    const product = await get("/products");
    expect(product.status === 503, `storefront /products answers ${product.status} (want 503)`);

    const login = await get("/admin/login");
    expect(login.status === 200, `/admin/login answers ${login.status} (want 200 — the way back in)`);
    expect(!(await login.text()).includes("We&rsquo;ll be right back"), "/admin/login is the real sign-in page, not the holding page");

    const admin = await get("/admin");
    const to = admin.headers.get("location") ?? "";
    expect(admin.status >= 300 && admin.status < 400 && to.includes("/admin/login"), `/admin with an expired session redirects to the login (${admin.status} → ${to || "-"})`);

    const api = await get("/api/me");
    expect(api.status !== 503, `an API route answers ${api.status}, not 503 — payment callbacks still land`);
  } finally {
    await restore();
  }

  await sleep(6_000);
  const after = await get("/");
  const row = await db.storeSetting.findUnique({ where: { key: KEY } });
  expect(JSON.stringify(row?.value ?? null) === JSON.stringify(original?.value ?? null), "settings row restored exactly, in this run");
  expect(after.status === 200, `storefront / is back: ${after.status}`);

  console.log(failures === 0 ? "\nMaintenance lock-out checks passed.\n" : `\n${failures} check(s) FAILED.\n`);
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
