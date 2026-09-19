import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin";
import { BADGE_ORDER, BrandMark, ProductBadgeMark, ProductBadges } from "@/components/product/badges";
import { TierBlock, TierChip, TierCrest, type TierName } from "@/components/account/tier";

/**
 * A design preview, for the owner only.
 *
 * It shows the badge set, the brand treatment and the loyalty tier BEFORE any
 * of them is wired into a card, a listing or the account panel, so they can be
 * approved or sent back without the shop changing. Anyone who is not signed in
 * to the admin gets a 404, and it is never indexed.
 */
export const metadata: Metadata = { title: "Design preview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TIERS: TierName[] = ["Silver", "Gold", "WeekendCart Club"];

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-ink-200 py-8">
      <h2 className="font-display text-[22px] tracking-[-0.02em] text-ink-950">{title}</h2>
      {note && <p className="mt-1 max-w-[70ch] text-[13.5px] leading-relaxed text-ink-500">{note}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** A stand-in product card: a flat tile where the photograph would be. */
function MockCard({ title, price, mrp, stock, badges }: { title: string; price: number; mrp: number; stock: number; badges: ("bestseller" | "new" | "trending" | "limited" | "exclusive" | "handpicked")[] }) {
  return (
    <div className="w-[220px]">
      <div className="relative aspect-square bg-ink-100">
        <div className="absolute left-2 top-2 flex max-w-[calc(100%-16px)] flex-col items-start gap-1">
          <ProductBadges product={{ badges, price, mrp, stock }} max={3} />
        </div>
      </div>
      <p className="mt-2.5 text-[11.5px] text-ink-500">WeekendCart</p>
      <p className="text-[14px] font-medium leading-snug text-ink-950">{title}</p>
      <p className="mt-1 text-[14px] font-semibold tabular-nums text-ink-950">
        ₹{price.toLocaleString("en-IN")}
        {mrp > price && <span className="ml-1.5 text-[12.5px] font-normal text-ink-400 line-through">₹{mrp.toLocaleString("en-IN")}</span>}
      </p>
    </div>
  );
}

export default async function BadgePreviewPage() {
  if (!(await getAdminSession())) notFound();

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700">Design preview · not wired into the shop yet</p>
      <h1 className="mt-2 font-display text-[34px] leading-tight tracking-[-0.025em] text-ink-950">Badges, brand and loyalty tier</h1>

      <Section
        title="The badge set"
        note="Nine marks to one specification: one height, square corners, a 12px glyph drawn here as inline SVG, small caps, a tint of the mark's own hue and a hairline of the same hue. The price cut is the one solid mark. Six are given to a product in the admin; sale, low stock and sold out are worked out by the shop."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">Product page size</p>
            <div className="flex flex-wrap gap-2">
              {BADGE_ORDER.map((kind) => (
                <ProductBadgeMark key={kind} kind={kind} size="md" label={kind === "sale" ? "32% off" : kind === "low-stock" ? "Only 3 left" : undefined} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">Card and listing size</p>
            <div className="flex flex-wrap gap-1.5">
              {BADGE_ORDER.map((kind) => (
                <ProductBadgeMark key={kind} kind={kind} size="sm" label={kind === "sale" ? "32% off" : kind === "low-stock" ? "Only 3 left" : undefined} />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 bg-ink-950 p-5">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">On a dark ground, as over a photograph</p>
          <div className="flex flex-wrap gap-2">
            {BADGE_ORDER.map((kind) => (
              <ProductBadgeMark key={kind} kind={kind} size="md" label={kind === "sale" ? "32% off" : undefined} />
            ))}
          </div>
        </div>
      </Section>

      <Section title="Two and three together" note="At most three show, ordered by what affects buying first: sold out, a price cut, running low, then what describes the product.">
        <div className="flex flex-wrap gap-6">
          <MockCard title="Mixer Grinder 750W, 3 jars" price={2499} mrp={3499} stock={40} badges={["bestseller"]} />
          <MockCard title="Electric Kettle 1.5L" price={1199} mrp={1199} stock={6} badges={["new", "handpicked"]} />
          <MockCard title="Steam Iron 1600W" price={1499} mrp={2199} stock={3} badges={["trending", "limited", "exclusive"]} />
          <MockCard title="Vacuum Cleaner 1200W" price={4299} mrp={5999} stock={0} badges={["bestseller"]} />
        </div>
      </Section>

      <Section
        title="The product page header"
        note="Today the brand and the badges are three grey words in one row. The brand becomes a maker's line with a monogram, linking to everything from that brand, and the badges become badges."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-surface p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">Today</p>
            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">WeekendCart</span>
              <span className="px-2 py-1 text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-ink-600">Bestseller</span>
              <span className="px-2 py-1 text-[10.5px] font-semibold uppercase leading-none tracking-[0.1em] text-ink-600">New in</span>
            </div>
            <p className="font-display text-[30px] leading-[1.12] tracking-[-0.025em] text-ink-950">Mixer Grinder 750W, 3 jars</p>
          </div>
          <div className="bg-surface p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-700">Proposed</p>
            <ProductBadges product={{ badges: ["bestseller", "new"], price: 2499, mrp: 3499, stock: 40 }} size="md" className="mb-3" />
            <p className="font-display text-[30px] leading-[1.12] tracking-[-0.025em] text-ink-950">Mixer Grinder 750W, 3 jars</p>
            <BrandMark name="WeekendCart" href="/products?brands=weekendcart" className="mt-3" />
          </div>
        </div>
      </Section>

      <Section
        title="Loyalty tier"
        note="One shield for all three so they read as one ladder; the metal and the device change as it climbs. It states the tier and the points and nothing else — no perks are claimed, because none are written down as policy, and no progress bar, because there are no points thresholds."
      >
        <div className="flex flex-wrap items-end gap-8">
          {TIERS.map((tier) => (
            <div key={tier} className="text-center">
              <TierCrest tier={tier} size={72} className="mx-auto" />
              <p className="mt-2 text-[12.5px] font-semibold text-ink-800">{tier}</p>
            </div>
          ))}
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {TIERS.map((tier, i) => (
            <div key={tier} className="bg-brand-900 p-5">
              <TierBlock tier={tier} points={[240, 1860, 7420][i]!} onDark />
            </div>
          ))}
        </div>
        <p className="mb-2 mt-7 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">On a light page, and as one line</p>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="bg-surface p-5">
            <TierBlock tier="Gold" points={1860} />
          </div>
          <div className="flex flex-wrap gap-5">
            {TIERS.map((tier) => (
              <TierChip key={tier} tier={tier} />
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
