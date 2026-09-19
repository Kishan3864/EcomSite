import { db } from "@/lib/db";

/**
 * Maintenance mode: one switch that takes the whole public storefront down to
 * a holding page, and leaves the admin alone.
 *
 * The state is a row in the existing StoreSetting table under the key
 * `maintenance`, so it survives a deploy and a restart and needs no schema
 * change. The proxy asks for it on every storefront page request, which must
 * not mean a database query on every request — this box runs other sites too.
 * So the answer is held in memory for a few seconds, and the admin action that
 * flips the switch overwrites that copy in the same process, which is what
 * makes it take effect at once rather than after the cache runs out.
 *
 * IT SWITCHES ITSELF OFF. When a "back by" time was given and has passed, the
 * very check that reads the switch turns it off, writes that down in the
 * activity log, and lets the request through to the shop. There is no cron and
 * no timer to keep alive: the first visitor after the time is the trigger, and
 * until somebody visits there is nobody to be shown the wrong page. The expiry
 * is compared against the copy in memory, so it is exact to the second rather
 * than to the cache's five.
 *
 * THIS ASSUMES ONE PROCESS. deploy/ecosystem.config.cjs runs the app under PM2
 * in fork mode with one instance, so the memory copy the admin action
 * overwrites is the same one the proxy reads, and the switch is instant. If
 * that file is ever changed to exec_mode "cluster" or instances > 1, each
 * worker keeps its own copy: the worker that handled the click flips at once,
 * and every other worker goes on serving the OLD state until its own copy
 * expires, up to TTL_MS later. Nothing breaks — the database row is still the
 * truth and every worker reaches it within five seconds — but "takes effect
 * immediately" becomes "within five seconds", and for those seconds some
 * shoppers see the shop and some see the holding page. If that matters then,
 * lower TTL_MS or move the flag to something shared between workers. The
 * automatic switch-off is safe under cluster mode either way: the write is
 * conditional, so only one worker's write lands and only one log line is made.
 *
 * It fails OPEN. If the database cannot be asked, the last known answer stands,
 * and with no answer at all the shop stays up: a database hiccup must never be
 * what takes the storefront down.
 */

export interface MaintenanceState {
  on: boolean;
  /** What the holding page says. */
  message: string;
  /** ISO time the shop comes back by itself, or null to stay down until switched off. */
  backBy: string | null;
}

export const MAINTENANCE_KEY = "maintenance";
export const MAINTENANCE_DEFAULT: MaintenanceState = {
  on: false,
  message: "We are making a few improvements and will be back shortly. Thank you for your patience.",
  backBy: null,
};

/**
 * What stays reachable while the shop is paused, and why each one.
 *
 *   /track    a customer with a parcel on the way can still see where it is.
 *             Read-only, and the question they are most likely to have.
 *   /legal    the refund, shipping and privacy policies. Static text a customer
 *             may need exactly when something looks wrong.
 *
 * Deliberately NOT here: the catalogue, cart and checkout (the point of the
 * pause), sign-in and accounts (nothing to do there while nothing can be
 * bought), and the contact form (it writes to the database, which may be the
 * thing being worked on — the holding page gives the email address instead).
 */
export const OPEN_DURING_MAINTENANCE = ["/track", "/legal"];

export const staysOpen = (pathname: string) =>
  OPEN_DURING_MAINTENANCE.some((p) => pathname === p || pathname.startsWith(`${p}/`));

const TTL_MS = 5_000;

interface Held {
  at: number;
  state: MaintenanceState;
}
// On globalThis, not a module variable: the proxy and the server actions are
// separate bundles in one process, and each would otherwise keep its own copy.
const slot = globalThis as unknown as { __weekendcartMaintenance?: Held };

export function normaliseMaintenance(value: unknown): MaintenanceState {
  const row = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
  const message = typeof row.message === "string" && row.message.trim() ? row.message.trim().slice(0, 600) : MAINTENANCE_DEFAULT.message;
  const backBy = typeof row.backBy === "string" && !Number.isNaN(Date.parse(row.backBy)) ? new Date(row.backBy).toISOString() : null;
  return { on: row.on === true, message, backBy };
}

const expired = (state: MaintenanceState, now: number) => state.on && state.backBy !== null && Date.parse(state.backBy) <= now;

/**
 * The "back by" time has passed: open the shop.
 *
 * Conditional on the row still saying ON, so of several requests arriving in
 * the same second exactly one makes the change and exactly one writes the log
 * line; the rest find it already done.
 */
async function switchOffByItself(state: MaintenanceState): Promise<MaintenanceState> {
  const off: MaintenanceState = { on: false, message: state.message, backBy: null };
  slot.__weekendcartMaintenance = { at: Date.now(), state: off };
  try {
    const changed = await db.storeSetting.updateMany({
      where: { key: MAINTENANCE_KEY, value: { path: ["on"], equals: true } },
      data: { value: off as object },
    });
    if (changed.count > 0) {
      await db.activityLog.create({
        data: {
          actorName: "System",
          action: "store.maintenance.auto-off",
          entity: "StoreSetting",
          entityId: MAINTENANCE_KEY,
          summary: `Maintenance mode switched itself OFF — the “back by” time (${state.backBy}) passed and the storefront reopened`,
          metadata: { backBy: state.backBy, message: state.message },
        },
      });
    }
  } catch (error) {
    // The shop is open in memory already, which is what the shopper needs. The
    // row is retried by the next read once the cache runs out.
    console.error("[maintenance] could not record the automatic switch-off", error instanceof Error ? error.message : error);
  }
  return off;
}

/** The current state, from memory when it is fresh and from the database when it is not. */
export async function getMaintenance(): Promise<MaintenanceState> {
  const now = Date.now();
  const held = slot.__weekendcartMaintenance;
  if (held && now - held.at < TTL_MS) {
    return expired(held.state, now) ? switchOffByItself(held.state) : held.state;
  }
  try {
    const row = await db.storeSetting.findUnique({ where: { key: MAINTENANCE_KEY }, select: { value: true } });
    const state = normaliseMaintenance(row?.value);
    if (expired(state, now)) return switchOffByItself(state);
    slot.__weekendcartMaintenance = { at: now, state };
    return state;
  } catch (error) {
    console.error("[maintenance] could not read the switch", error instanceof Error ? error.message : error);
    return held?.state ?? MAINTENANCE_DEFAULT;
  }
}

/** Write the switch, and make this process believe it immediately. */
export async function saveMaintenance(state: MaintenanceState): Promise<void> {
  await db.storeSetting.upsert({
    where: { key: MAINTENANCE_KEY },
    create: { key: MAINTENANCE_KEY, value: state as object },
    update: { value: state as object },
  });
  slot.__weekendcartMaintenance = { at: Date.now(), state };
}

/** Seconds a crawler or a client should wait: until "back by", else an hour. Never under a minute. */
export function retryAfterSeconds(state: MaintenanceState, now: number = Date.now()): number {
  if (!state.backBy) return 3600;
  return Math.max(60, Math.round((Date.parse(state.backBy) - now) / 1000));
}

/** A Date as the value a datetime-local input wants, in India time. */
export const toIstInput = (date: Date) => new Date(date.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 16);

/**
 * What the "back by" picker may offer: nothing before a few minutes from now,
 * and two hours from now as the suggestion when a pause is being started.
 * Worked out on the server so the form renders the same on both sides.
 */
export function pickerBounds(now: Date = new Date()) {
  return {
    minInput: toIstInput(new Date(now.getTime() + 5 * 60_000)),
    suggestInput: toIstInput(new Date(now.getTime() + 2 * 3_600_000)),
  };
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * The shopfront, shut for the moment: drawn here, as inline SVG.
 *
 * An awning in the shop's ocean and cream, a door with a "back soon" card hung
 * on it, a lit window, a parcel waiting outside. Square corners and flat fills,
 * like the rest of the site. About two kilobytes, no request, nothing borrowed.
 */
const ARTWORK = `<svg class="art" viewBox="0 0 360 250" role="img" aria-label="The WeekendCart shopfront with a back soon sign on the door" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="222" width="360" height="6" fill="#d9d5cc"/>
<rect x="46" y="70" width="268" height="152" fill="#ffffff" stroke="#1c333f" stroke-width="3"/>
<rect x="46" y="70" width="268" height="26" fill="#1c333f"/>
<text x="180" y="88" text-anchor="middle" font-family="Georgia,serif" font-size="13" letter-spacing="2" fill="#f4f3f0">WEEKENDCART</text>
<g stroke="#1c333f" stroke-width="3" stroke-linejoin="round">
<path d="M34 96h292l-12 30H46Z" fill="#f4f3f0"/>
<path d="M34 96h41.700l-5 30H46Z" fill="#2f5265"/><path d="M117.400 96h41.700l-1.700 30h-38.300Z" fill="#2f5265"/>
<path d="M200.800 96h41.700l5 30h-38.300Z" fill="#2f5265"/><path d="M284.300 96H326l-12 30h-24.700Z" fill="#2f5265"/>
</g>
<rect x="66" y="142" width="112" height="62" fill="#fdf8ec" stroke="#1c333f" stroke-width="3"/>
<path d="M122 142v62M66 173h112" stroke="#1c333f" stroke-width="2"/>
<rect x="78" y="182" width="16" height="22" fill="#a9820f"/><rect x="98" y="176" width="12" height="28" fill="#4c7c94"/>
<rect x="134" y="186" width="30" height="18" fill="#dbe7ed" stroke="#1c333f" stroke-width="1.500"/>
<rect x="206" y="138" width="78" height="84" fill="#dbe7ed" stroke="#1c333f" stroke-width="3"/>
<circle cx="273" cy="182" r="3" fill="#1c333f"/>
<path d="M231 150l14-9 14 9" fill="none" stroke="#1c333f" stroke-width="1.500"/>
<rect x="219" y="150" width="52" height="30" fill="#ffffff" stroke="#1c333f" stroke-width="2"/>
<text x="245" y="163" text-anchor="middle" font-family="system-ui,sans-serif" font-size="8.500" font-weight="700" letter-spacing="1" fill="#1c333f">BACK</text>
<text x="245" y="174" text-anchor="middle" font-family="system-ui,sans-serif" font-size="8.500" font-weight="700" letter-spacing="1" fill="#a9820f">SOON</text>
<g stroke="#1c333f" stroke-width="2.500" stroke-linejoin="round">
<rect x="296" y="190" width="40" height="32" fill="#e9cf9b"/><path d="M316 190v32M296 202h40" fill="none" stroke-width="1.800"/>
<rect x="306" y="168" width="26" height="22" fill="#f0dcb0"/><path d="M319 168v22" fill="none" stroke-width="1.800"/>
</g>
<g stroke="#1c333f" stroke-width="2.500" stroke-linejoin="round">
<path d="M16 222h22l-3-22H19Z" fill="#a9820f"/>
<path d="M27 200c-9-6-12-16-9-26 8 3 12 12 9 26Zm0 0c8-7 9-18 5-27-7 5-9 15-5 27Z" fill="#3f7a5a"/>
</g>
</svg>`;

/**
 * The holding page, as one self-contained document.
 *
 * Built by hand rather than rendered by the app: it is served by the proxy,
 * before the app, and it has to work when the app is the thing being fixed. It
 * loads exactly two things, both static files the proxy never touches — the
 * logo and the favicon — and everything else is in the document.
 *
 * The countdown is live. The target time is written into the page, a few lines
 * of script tick it down each second, and at zero the page reloads; that reload
 * is the request that finds the time has passed and opens the shop. With no
 * "back by" time it quietly asks every minute whether the shop has reopened.
 * Without JavaScript the "back by" time is still there as plain text.
 */
export function maintenanceHtml(state: MaintenanceState, brand: { name: string; email: string; phone?: string | undefined }): string {
  const backText = state.backBy
    ? new Date(state.backBy).toLocaleString("en-IN", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })
    : null;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#f4f3f0">
<title>${escapeHtml(brand.name)} — back soon</title>
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="icon" href="/icon1.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-icon.png">
<style>
*{box-sizing:border-box}
html,body{margin:0;min-height:100%}
body{background:#f4f3f0;color:#12171b;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{min-height:100dvh;display:flex;flex-direction:column;max-width:1040px;margin:0 auto;padding:20px 20px 28px}
header{display:flex;align-items:center;justify-content:space-between;gap:16px}
.logo{height:34px;width:auto;display:block}
.pill{font:600 10.500px/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#5f4a0f;background:#faf0d2;padding:7px 9px;white-space:nowrap}
main{flex:1;display:grid;gap:28px;align-content:center;padding:28px 0}
.art{width:100%;max-width:420px;height:auto;display:block;margin:0 auto}
h1{font:500 32px/1.12 Georgia,"Times New Roman",serif;letter-spacing:-.02em;margin:0 0 12px}
.lead{margin:0;color:#46555d;max-width:46ch}
.back{margin-top:22px;background:#fff;padding:18px;border-left:3px solid #a9820f}
.eyebrow{font:600 10.500px/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#6b7780;margin:0 0 10px}
.count{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 12px}
.unit{background:#1c333f;color:#fff;padding:12px 4px 9px;text-align:center}
.num{display:block;font:500 28px/1 Georgia,serif;font-variant-numeric:tabular-nums}
.lab{display:block;margin-top:6px;font:600 9.500px/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#a9c1cd}
.when{margin:0;font-size:14px;color:#46555d}
.when strong{color:#12171b}
.links{margin-top:22px;display:grid;gap:8px}
.links a{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fff;padding:13px 16px;color:#12171b;text-decoration:none;font-weight:600;font-size:14.500px}
.links a:hover,.links a:focus-visible{background:#eef4f7;outline:0}
.links a span{font-weight:400;font-size:13px;color:#6b7780}
footer{margin-top:8px;font-size:13px;color:#6b7780;display:flex;flex-wrap:wrap;gap:6px 18px}
footer a{color:#2f5265}
@media(min-width:820px){
  .wrap{padding:28px 32px 36px}
  .logo{height:40px}
  main{grid-template-columns:minmax(0,1fr) minmax(0,1.050fr);gap:56px;align-items:center}
  .art{max-width:none;order:2}
  h1{font-size:44px}
}
@media(prefers-reduced-motion:no-preference){.num{transition:opacity .2s}}
</style>
</head>
<body>
<div class="wrap">
<header>
  <img class="logo" src="/brand/weekendcart-logo.svg" alt="${escapeHtml(brand.name)}" width="148" height="40">
  <span class="pill">Planned pause</span>
</header>
<main>
  ${ARTWORK}
  <div>
    <h1>We&rsquo;ve stepped away from the counter</h1>
    <p class="lead">${escapeHtml(state.message)}</p>
    ${
      state.backBy
        ? `<div class="back" id="back" data-until="${escapeHtml(state.backBy)}">
      <p class="eyebrow">The shop reopens in</p>
      <div class="count" aria-hidden="true">
        <div class="unit"><span class="num" id="d">--</span><span class="lab">Days</span></div>
        <div class="unit"><span class="num" id="h">--</span><span class="lab">Hours</span></div>
        <div class="unit"><span class="num" id="m">--</span><span class="lab">Minutes</span></div>
        <div class="unit"><span class="num" id="s">--</span><span class="lab">Seconds</span></div>
      </div>
      <p class="when">Back by <strong>${escapeHtml(backText ?? "")}</strong>, India time. This page will open the shop by itself.</p>
    </div>`
        : `<div class="back"><p class="eyebrow">Back shortly</p><p class="when">We have not set a time, but it will not be long. This page checks every minute and opens the shop by itself.</p></div>`
    }
    <nav class="links" aria-label="Still open">
      <a href="/track">Track an order <span>See where your parcel is</span></a>
      <a href="/legal/refunds">Returns &amp; refunds policy <span>Read the policy</span></a>
      <a href="mailto:${escapeHtml(brand.email)}">Email us <span>${escapeHtml(brand.email)}</span></a>
    </nav>
  </div>
</main>
<footer>
  <span>Need help with an order? Write to us.</span>
  ${brand.phone ? `<span>Call <a href="tel:${escapeHtml(brand.phone.replace(/[^+\d]/g, ""))}">${escapeHtml(brand.phone)}</a></span>` : ""}
</footer>
</div>
<script>
(function(){
  var box=document.getElementById("back");
  function reopen(){fetch(location.href,{method:"HEAD",cache:"no-store"}).then(function(r){if(r.status!==503)location.reload()}).catch(function(){})}
  if(!box){setInterval(reopen,60000);return}
  var until=Date.parse(box.getAttribute("data-until")),ids=["d","h","m","s"],done=false;
  function pad(n){return(n<10?"0":"")+n}
  function tick(){
    var left=Math.max(0,Math.floor((until-Date.now())/1000));
    var v=[Math.floor(left/86400),Math.floor(left%86400/3600),Math.floor(left%3600/60),left%60];
    for(var i=0;i<4;i++)document.getElementById(ids[i]).textContent=i?pad(v[i]):String(v[i]);
    if(left===0&&!done){done=true;setTimeout(function(){location.reload()},1500);setInterval(reopen,15000)}
  }
  tick();setInterval(tick,1000);
})();
</script>
</body>
</html>`;
}
