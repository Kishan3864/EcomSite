import { db } from "@/lib/db";
import { BUSINESS } from "@/config/business";
import { toIstInput } from "@/lib/maintenance";

/**
 * Domain-sale mode: one switch that replaces the WHOLE public site with a
 * single page saying the domain is for sale, with the offer, a countdown to
 * the offer's end and a WhatsApp button.
 *
 * Built the same way as maintenance mode (src/lib/maintenance.ts) — a row in
 * StoreSetting under `domain-sale`, held in memory for a few seconds, served by
 * the proxy before the app — and it wins over maintenance when both are on.
 * Unlike maintenance, nothing on the storefront stays open (no /track, no
 * /legal) and a signed-in admin is NOT let through to the shop: the owner sees
 * exactly what a buyer sees. The admin itself stays reachable, or the switch
 * could never be turned off, and API routes are outside the proxy's matcher,
 * so payment callbacks for anything already in flight still land.
 *
 * The countdown runs to a real time the owner sets in the admin, the same for
 * every visitor. When it passes the page says the offer has ended and shows the
 * regular price; it never quietly restarts.
 *
 * It fails OPEN, like maintenance: if the database cannot be asked, the last
 * known answer stands, and with no answer at all the shop stays up.
 */

export interface DomainSaleState {
  on: boolean;
  /** The offer price in whole rupees, or null for none. */
  offerPrice: number | null;
  /** The price once the offer ends, shown struck through beside the offer. Null for none. */
  regularPrice: number | null;
  /** ISO time the offer ends, or null for no countdown. */
  offerEndsAt: string | null;
  /** Digits only, country code first — what wa.me wants. */
  whatsapp: string;
  /** The paragraph under the headline. */
  pitch: string;
  /** Short selling points, one per card. */
  highlights: string[];
}

export const DOMAIN_SALE_KEY = "domain-sale";

export const DOMAIN_SALE_DEFAULT: DomainSaleState = {
  on: false,
  offerPrice: null,
  regularPrice: null,
  offerEndsAt: null,
  whatsapp: "917600908865",
  pitch:
    "A short, brandable .com made for online shopping. If you searched for it and found it taken — you found the owner. Message on WhatsApp and it can be yours.",
  highlights: [
    "Premium .com — the extension buyers trust most",
    "Two everyday words — easy to say, spell and remember",
    "Made for e-commerce — “weekend” + “cart” says shopping on its own",
    "Live store included — catalogue, checkout and admin panel, ready to run",
  ],
};

const TTL_MS = 5_000;

interface Held {
  at: number;
  state: DomainSaleState;
}
// On globalThis for the same reason as maintenance: the proxy and the server
// actions are separate bundles in one process.
const slot = globalThis as unknown as { __weekendcartDomainSale?: Held };

const rupees = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 100_000_000 ? value : null;

export function normaliseDomainSale(value: unknown): DomainSaleState {
  const row = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
  const whatsapp = typeof row.whatsapp === "string" ? row.whatsapp.replace(/\D/g, "") : "";
  const pitch = typeof row.pitch === "string" && row.pitch.trim() ? row.pitch.trim().slice(0, 400) : DOMAIN_SALE_DEFAULT.pitch;
  const highlights = Array.isArray(row.highlights)
    ? row.highlights.filter((h): h is string => typeof h === "string" && h.trim() !== "").map((h) => h.trim().slice(0, 120)).slice(0, 6)
    : DOMAIN_SALE_DEFAULT.highlights;
  return {
    on: row.on === true,
    offerPrice: rupees(row.offerPrice),
    regularPrice: rupees(row.regularPrice),
    offerEndsAt: typeof row.offerEndsAt === "string" && !Number.isNaN(Date.parse(row.offerEndsAt)) ? new Date(row.offerEndsAt).toISOString() : null,
    whatsapp: whatsapp.length >= 11 && whatsapp.length <= 15 ? whatsapp : DOMAIN_SALE_DEFAULT.whatsapp,
    pitch,
    highlights,
  };
}

/** The current state, from memory when it is fresh and from the database when it is not. */
export async function getDomainSale(): Promise<DomainSaleState> {
  const now = Date.now();
  const held = slot.__weekendcartDomainSale;
  if (held && now - held.at < TTL_MS) return held.state;
  try {
    const row = await db.storeSetting.findUnique({ where: { key: DOMAIN_SALE_KEY }, select: { value: true } });
    const state = normaliseDomainSale(row?.value);
    slot.__weekendcartDomainSale = { at: now, state };
    return state;
  } catch (error) {
    console.error("[domain-sale] could not read the switch", error instanceof Error ? error.message : error);
    return held?.state ?? DOMAIN_SALE_DEFAULT;
  }
}

/** Write the switch, and make this process believe it immediately. */
export async function saveDomainSale(state: DomainSaleState): Promise<void> {
  await db.storeSetting.upsert({
    where: { key: DOMAIN_SALE_KEY },
    create: { key: DOMAIN_SALE_KEY, value: state as object },
    update: { value: state as object },
  });
  slot.__weekendcartDomainSale = { at: Date.now(), state };
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** +91 76009 08865 from 917600908865; anything else is shown as +digits. */
const showPhone = (digits: string) =>
  digits.length === 12 && digits.startsWith("91") ? `+91 ${digits.slice(2, 7)} ${digits.slice(7)}` : `+${digits}`;

const ICON_CHAT = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg>`;
const ICON_CHECK = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

/**
 * The sale page, as one self-contained document — served by the proxy before
 * the app, like the maintenance page. It loads only the logo and the icons,
 * static files the proxy never touches; the rest is inline.
 *
 * The countdown ticks in the browser towards `offerEndsAt` and reloads once at
 * zero; that reload is rendered by the server with the offer marked as ended.
 */
export function domainSaleHtml(state: DomainSaleState, now: number = Date.now()): string {
  const domain = BUSINESS.domain;
  const endsAt = state.offerEndsAt ? Date.parse(state.offerEndsAt) : null;
  const offerLive = endsAt === null || endsAt > now;
  const showOffer = offerLive && state.offerPrice !== null;
  const save =
    showOffer && state.regularPrice !== null && state.regularPrice > state.offerPrice!
      ? Math.round((1 - state.offerPrice! / state.regularPrice) * 100)
      : null;
  const endText = endsAt
    ? new Date(endsAt).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })
    : null;

  const ask = showOffer
    ? `Hi! I want to buy ${domain}. Is the offer price of ${inr(state.offerPrice!)} still available?`
    : `Hi! I'm interested in buying ${domain}. What is the price?`;
  const wa = `https://wa.me/${state.whatsapp}?text=${encodeURIComponent(ask)}`;
  const phone = showPhone(state.whatsapp);

  let priceBlock: string;
  if (showOffer) {
    priceBlock = `<p class="label">${endsAt ? "Limited-time offer" : "Offer price"}</p>
      <div class="price"><span class="now">${inr(state.offerPrice!)}</span>${
        state.regularPrice !== null && state.regularPrice > state.offerPrice! ? `<s class="was">${inr(state.regularPrice)}</s>` : ""
      }</div>${save ? `<p class="save">You save ${save}% — ${inr(state.regularPrice! - state.offerPrice!)} off</p>` : ""}`;
  } else if (!offerLive) {
    priceBlock = `<p class="label ended">The offer has ended</p>
      ${state.regularPrice !== null ? `<div class="price"><span class="now">${inr(state.regularPrice)}</span></div>` : `<div class="price"><span class="now sm">Price on request</span></div>`}
      <p class="save muted">Message on WhatsApp for the current price.</p>`;
  } else {
    priceBlock = `<p class="label">Price</p>
      <div class="price"><span class="now sm">${state.regularPrice !== null ? inr(state.regularPrice) : "Make an offer"}</span></div>`;
  }

  const countdown =
    endsAt && offerLive
      ? `<div class="timer" id="timer" data-until="${escapeHtml(state.offerEndsAt!)}">
        <p class="label hot"><span class="dot"></span>Offer ends in</p>
        <div class="count" aria-hidden="true">
          <div class="unit"><span class="num" id="d">--</span><span class="lab">Days</span></div>
          <div class="unit"><span class="num" id="h">--</span><span class="lab">Hours</span></div>
          <div class="unit"><span class="num" id="m">--</span><span class="lab">Mins</span></div>
          <div class="unit"><span class="num" id="s">--</span><span class="lab">Secs</span></div>
        </div>
        <p class="until">Ends ${escapeHtml(endText ?? "")} IST.${
          state.regularPrice !== null && state.offerPrice !== null && state.regularPrice > state.offerPrice ? ` After that the price is ${inr(state.regularPrice)}.` : ""
        }</p>
      </div>`
      : "";

  const title = `${domain} is for sale`;
  const description = showOffer ? `${domain} is for sale — offer price ${inr(state.offerPrice!)}. Message the owner on WhatsApp.` : `${domain} is for sale. Message the owner on WhatsApp.`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0a1e2e">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(BUSINESS.url)}">
<meta property="og:image" content="${escapeHtml(BUSINESS.url)}/apple-icon.png">
<meta name="twitter:card" content="summary">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="icon" href="/icon1.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-icon.png">
<style>
:root{--bg:#0a1e2e;--panel:#12324a;--line:rgba(255,255,255,.12);--text:#fff;--soft:#b9c7d3;--gold:#d9b556;--gold2:#f8efd6;--wa:#1faa59;--wa2:#178a48;--hot:#ff6b81}
*{box-sizing:border-box}
html,body{margin:0}
body{min-height:100dvh;background:var(--bg);color:var(--text);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden;
background-image:radial-gradient(60% 50% at 0% 0%,rgba(47,118,166,.45),transparent 70%),radial-gradient(50% 45% at 100% 30%,rgba(114,98,230,.28),transparent 70%),radial-gradient(60% 40% at 50% 100%,rgba(217,181,86,.14),transparent 70%)}
a{color:inherit}
.wrap{max-width:1120px;margin:0 auto;padding:18px 16px 110px}
header{display:flex;align-items:center;justify-content:space-between;gap:12px}
.logo{height:30px;width:auto;display:block}
.pill{display:inline-flex;align-items:center;gap:8px;font:700 11px/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--bg);background:var(--gold);padding:8px 12px;border-radius:999px;white-space:nowrap}
.dot{width:8px;height:8px;border-radius:50%;background:currentColor;display:inline-block}
.pill .dot{background:#b3261e}
.hero{display:grid;gap:28px;padding:44px 0 8px}
.eyebrow{margin:0 0 14px;color:var(--gold);font:700 12px/1.3 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase}
h1{margin:0;line-height:1.02;letter-spacing:-.03em}
.domain{display:block;font-size:clamp(40px,11vw,92px);font-weight:800;overflow-wrap:anywhere;background:linear-gradient(100deg,#fff 0%,var(--gold2) 45%,var(--gold) 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.forsale{display:block;margin-top:10px;font:500 clamp(26px,6vw,46px)/1.1 Georgia,"Times New Roman",serif;color:var(--soft)}
.lead{margin:20px 0 0;max-width:52ch;color:var(--soft);font-size:17px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:56px;padding:14px 24px;border-radius:14px;font-weight:700;font-size:17px;text-decoration:none;transition:transform .15s,background .15s,box-shadow .15s}
.btn-wa{background:var(--wa);color:#fff;box-shadow:0 10px 30px rgba(31,170,89,.35)}
.btn-wa:hover,.btn-wa:focus-visible{background:var(--wa2);transform:translateY(-1px);outline:0}
.cta{margin-top:26px;display:flex;flex-wrap:wrap;gap:12px 18px;align-items:center}
.cta .tel{color:var(--soft);font-size:15px;text-decoration:none}
.cta .tel strong{color:#fff}
.card{background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.03));border:1px solid var(--line);border-radius:22px;padding:22px;box-shadow:0 30px 80px rgba(0,0,0,.35)}
.offer{position:relative;overflow:hidden}
.offer:before{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,var(--gold),#fff,var(--gold))}
.label{margin:0 0 8px;font:700 11.5px/1.2 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--soft)}
.label.hot{display:flex;align-items:center;gap:8px;color:var(--hot)}
.label.ended{color:var(--hot)}
.price{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 14px}
.now{font-size:clamp(38px,9vw,52px);font-weight:800;letter-spacing:-.02em;color:var(--gold)}
.now.sm{font-size:30px;color:#fff}
.was{color:var(--soft);font-size:20px}
.save{margin:6px 0 0;color:#7ee2a8;font-weight:700;font-size:15px}
.save.muted{color:var(--soft);font-weight:500}
.timer{margin-top:20px;padding-top:18px;border-top:1px solid var(--line)}
.count{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.unit{background:rgba(0,0,0,.28);border:1px solid var(--line);border-radius:14px;padding:12px 4px 10px;text-align:center}
.num{display:block;font-size:clamp(26px,7vw,34px);font-weight:800;line-height:1;font-variant-numeric:tabular-nums}
.lab{display:block;margin-top:6px;font:700 10px/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--soft)}
.until{margin:12px 0 0;font-size:13.5px;color:var(--soft)}
.offer .btn{width:100%;margin-top:20px}
.note{margin:12px 0 0;text-align:center;font-size:13px;color:var(--soft)}
h2{margin:0 0 18px;font:500 clamp(26px,5vw,36px)/1.15 Georgia,"Times New Roman",serif;letter-spacing:-.01em}
section{padding-top:56px}
.grid{display:grid;gap:12px}
.feat{display:flex;gap:12px;align-items:flex-start;padding:18px;font-size:15.5px}
.tick{flex:none;display:grid;place-items:center;width:32px;height:32px;border-radius:10px;background:rgba(217,181,86,.16);color:var(--gold)}
.steps{counter-reset:s;display:grid;gap:12px;margin:0;padding:0;list-style:none}
.steps li{counter-increment:s;display:flex;gap:14px;align-items:flex-start;padding:18px}
.steps li:before{content:counter(s);flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:var(--gold);color:var(--bg);font-weight:800}
.steps strong{display:block}
.steps span{color:var(--soft);font-size:14.5px}
.final{text-align:center;padding:34px 22px}
.final p{margin:0 auto 22px;max-width:46ch;color:var(--soft)}
footer{margin-top:44px;padding-top:18px;border-top:1px solid var(--line);display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 18px;font-size:13px;color:var(--soft)}
.fab{position:fixed;left:16px;right:16px;bottom:14px;z-index:10;box-shadow:0 12px 32px rgba(0,0,0,.45)}
@media(min-width:720px){.grid{grid-template-columns:repeat(2,1fr)}.steps{grid-template-columns:repeat(3,1fr)}.steps li{flex-direction:column}}
@media(min-width:960px){
  .wrap{padding:26px 32px 48px}
  .logo{height:36px}
  .hero{grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:56px;align-items:center;padding-top:72px}
  .fab{display:none}
}
@media(prefers-reduced-motion:no-preference){
  .dot{animation:pulse 1.4s ease-in-out infinite}
  .btn-wa{animation:glow 2.6s ease-in-out infinite}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.8)}}
  @keyframes glow{0%,100%{box-shadow:0 10px 30px rgba(31,170,89,.30)}50%{box-shadow:0 10px 44px rgba(31,170,89,.60)}}
}
</style>
</head>
<body>
<div class="wrap">
<header>
  <img class="logo" src="/brand/weekendcart-logo-light.svg" alt="${escapeHtml(BUSINESS.brandName)}" width="148" height="36">
  <span class="pill"><span class="dot"></span>Domain for sale</span>
</header>
<main>
  <div class="hero">
    <div>
      <p class="eyebrow">Looked it up and found it taken? You found the owner.</p>
      <h1><span class="domain">${escapeHtml(domain)}</span><span class="forsale">is for sale.</span></h1>
      <p class="lead">${escapeHtml(state.pitch)}</p>
      <div class="cta">
        <a class="btn btn-wa" href="${escapeHtml(wa)}" target="_blank" rel="noopener">${ICON_CHAT}Buy it on WhatsApp</a>
        <a class="tel" href="${escapeHtml(wa)}" target="_blank" rel="noopener">or message <strong>${escapeHtml(phone)}</strong></a>
      </div>
    </div>
    <div class="card offer">
      ${priceBlock}
      ${countdown}
      <a class="btn btn-wa" href="${escapeHtml(wa)}" target="_blank" rel="noopener">${ICON_CHAT}${showOffer ? "Claim this price on WhatsApp" : "Ask the price on WhatsApp"}</a>
      <p class="note">One domain, one owner — once it is sold, it is gone.</p>
    </div>
  </div>
  ${
    state.highlights.length
      ? `<section aria-labelledby="why"><h2 id="why">Why ${escapeHtml(domain)}</h2><div class="grid">${state.highlights
          .map((h) => `<div class="card feat"><span class="tick">${ICON_CHECK}</span><span>${escapeHtml(h)}</span></div>`)
          .join("")}</div></section>`
      : ""
  }
  <section aria-labelledby="how">
    <h2 id="how">How buying works</h2>
    <ol class="steps">
      <li class="card"><div><strong>Message on WhatsApp</strong><span>Say you want ${escapeHtml(domain)} — the owner replies directly.</span></div></li>
      <li class="card"><div><strong>Agree the deal</strong><span>Confirm the price and how you would like to pay.</span></div></li>
      <li class="card"><div><strong>It is yours</strong><span>The domain is transferred to your account.</span></div></li>
    </ol>
  </section>
  <section>
    <div class="card final">
      <h2>Don&rsquo;t let someone else take it</h2>
      <p>There is only one ${escapeHtml(domain)}. ${showOffer && endsAt ? "The offer price holds only until the timer runs out." : "Message now and get an answer from the owner."}</p>
      <a class="btn btn-wa" href="${escapeHtml(wa)}" target="_blank" rel="noopener">${ICON_CHAT}Message ${escapeHtml(phone)}</a>
    </div>
  </section>
</main>
<footer>
  <span>&copy; ${new Date(now).getFullYear()} ${escapeHtml(domain)}</span>
  <span>WhatsApp <a href="${escapeHtml(wa)}" target="_blank" rel="noopener">${escapeHtml(phone)}</a></span>
</footer>
</div>
<a class="btn btn-wa fab" href="${escapeHtml(wa)}" target="_blank" rel="noopener">${ICON_CHAT}Buy ${escapeHtml(domain)} on WhatsApp</a>
<script>
(function(){
  var box=document.getElementById("timer");if(!box)return;
  var until=Date.parse(box.getAttribute("data-until")),ids=["d","h","m","s"],done=false;
  function pad(n){return(n<10?"0":"")+n}
  function tick(){
    var left=Math.max(0,Math.floor((until-Date.now())/1000));
    var v=[Math.floor(left/86400),Math.floor(left%86400/3600),Math.floor(left%3600/60),left%60];
    for(var i=0;i<4;i++)document.getElementById(ids[i]).textContent=pad(v[i]);
    if(left===0&&!done){done=true;setTimeout(function(){location.reload()},1200)}
  }
  tick();setInterval(tick,1000);
})();
</script>
</body>
</html>`;
}

/**
 * What the "offer ends" picker may offer: nothing before a few minutes from
 * now, and 24 hours from now as the suggestion. Worked out here, not in the
 * page, so the page stays pure.
 */
export function offerPickerBounds(now: Date = new Date()) {
  return {
    minInput: toIstInput(new Date(now.getTime() + 5 * 60_000)),
    suggestInput: toIstInput(new Date(now.getTime() + 24 * 3_600_000)),
  };
}
