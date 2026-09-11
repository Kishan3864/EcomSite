import type { Metadata } from "next";
import { ACTIVE, CONCEPTS, type Concept, type MarkTone } from "@/components/brand/mark-geometry";
import { DRAFTS } from "@/components/brand/concepts-draft";
import { DESIGNS, type Design } from "./designs";

/**
 * TEMPORARY — a page for choosing the logo. It is deleted, along with
 * concepts-draft.ts, as soon as a direction is picked.
 *
 * Kept out of search: noindex here, and disallowed in robots.ts.
 */

export const metadata: Metadata = {
  title: "Choose a logo",
  robots: { index: false, follow: false },
};

const ALL: { key: string; concept: Concept; note: string }[] = [
  { key: "0", concept: CONCEPTS.classic, note: "The original: a bag on two wheels with a smiling W, and speed lines." },
  { key: "A", concept: CONCEPTS.wcart, note: "The letter W is the cart's basket. One stroke, two wheels." },
  { key: "B", concept: CONCEPTS.folded, note: "A bag folded from two panels, with a W cut clean through it." },
  { key: "C", concept: CONCEPTS.monogram, note: "A handle over a W makes the bag. App-icon tile, fashion-house type." },
  ...DRAFTS,
];

function markBox({ x0, y0, x1, y1 }: Concept["ink"]) {
  const side = Math.max(x1 - x0, y1 - y0) + 4;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return `${cx - side / 2} ${cy - side / 2} ${side} ${side}`;
}

/** Mark and wordmark, the way the header will draw them. */
function Lockup({ concept, tone }: { concept: Concept; tone: MarkTone }) {
  const word = concept.word;
  const colours = word.colours[tone];
  return (
    <div className="flex items-center gap-3 whitespace-nowrap">
      <svg
        viewBox={markBox(concept.ink)}
        width={52}
        height={52}
        aria-hidden="true"
        className="shrink-0"
        dangerouslySetInnerHTML={{ __html: `<defs>${concept.defs(tone)}</defs>${concept.body(tone)}` }}
      />
      <span
        className="leading-none"
        style={{ fontSize: `${(28 * word.size) / 40}px`, letterSpacing: `${word.tracking}em` }}
      >
        <span style={{ color: colours.first, fontWeight: word.weight }}>
          {word.text.slice(0, word.splitAt)}
        </span>
        <span style={{ color: colours.second, fontWeight: word.secondWeight ?? word.weight }}>
          {word.text.slice(word.splitAt)}
        </span>
      </span>
    </div>
  );
}

/** The favicon at real tab sizes, on a light and a dark browser tab strip. */
function Favicons({ concept }: { concept: Concept }) {
  const icon = concept.icon();
  return (
    <div className="grid grid-cols-2 gap-px bg-hairline">
      {[
        { bg: "#dee1e6", label: "Light tab", fg: "#3c4043" },
        { bg: "#35363a", label: "Dark tab", fg: "#e8eaed" },
      ].map((tab) => (
        <div key={tab.label} className="flex items-center gap-4 px-4 py-3" style={{ background: tab.bg }}>
          {[16, 32, 64].map((size) => (
            <svg
              key={size}
              viewBox="0 0 64 64"
              width={size}
              height={size}
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: icon }}
            />
          ))}
          <span className="ml-auto text-[11px] font-medium" style={{ color: tab.fg }}>
            {tab.label}
          </span>
        </div>
      ))}
    </div>
  );
}

const TABS = [
  { bg: "#dee1e6", label: "Light tab", fg: "#3c4043" },
  { bg: "#35363a", label: "Dark tab", fg: "#e8eaed" },
];

/** One of the twenty typographic directions. */
function DesignCard({ design }: { design: Design }) {
  return (
    <section className="overflow-hidden border border-hairline bg-surface">
      <div className="flex items-start gap-4 px-5 py-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-ink-950 font-display text-[20px] text-white">
          {design.key}
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink-950">{design.name}</h2>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-700">
            {design.font}
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">{design.note}</p>
        </div>
      </div>
      <div className="flex min-h-[124px] items-center overflow-x-auto border-t border-hairline bg-canvas px-5 py-6">
        {design.render(false)}
      </div>
      <div className="flex min-h-[124px] items-center overflow-x-auto px-5 py-6" style={{ background: "#0b1611" }}>
        {design.render(true)}
      </div>
      <div className="grid grid-cols-2 gap-px bg-hairline">
        {TABS.map((tab) => (
          <div key={tab.label} className="flex items-center gap-4 px-4 py-3" style={{ background: tab.bg }}>
            {[16, 32, 64].map((size) => (
              <svg key={size} viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
                {design.icon()}
              </svg>
            ))}
            <span className="ml-auto text-[11px] font-medium" style={{ color: tab.fg }}>
              {tab.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function LogoChooserPage() {
  return (
    <main className="min-h-dvh bg-canvas px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-3xl border-b border-ink-950 pb-6">
          <span className="eyebrow">Temporary page</span>
          <h1 className="mt-3 font-display text-[32px] leading-[1.05] tracking-[-0.03em] text-ink-950 sm:text-[44px]">
            Choose the WeekendCart logo
          </h1>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-600">
            Thirty-four directions, each shown on a light page, a dark page, and as a favicon at the
            real 16, 32 and 64 pixel sizes a browser tab uses. Pasand ka <strong>letter</strong>{" "}
            batao — wahi final hoga, aur ye page hata diya jaayega.
          </p>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {ALL.map(({ key, concept, note }) => {
            const live = concept === ACTIVE;
            return (
              <section key={key} className="overflow-hidden border border-hairline bg-surface">
                <div className="flex items-start gap-4 px-5 py-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-ink-950 font-display text-[22px] text-white">
                    {key}
                  </span>
                  <div className="min-w-0">
                    <h2 className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink-950">
                      {concept.name.replace(/^[A-Z0-9]+ — /, "")}
                      {live && (
                        <span className="bg-brand-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
                          Live now
                        </span>
                      )}
                    </h2>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">{note}</p>
                  </div>
                </div>

                <div className="overflow-x-auto border-t border-hairline bg-canvas px-5 py-6">
                  <Lockup concept={concept} tone="light" />
                </div>
                <div className="overflow-x-auto px-5 py-6" style={{ background: "#0b1611" }}>
                  <Lockup concept={concept} tone="dark" />
                </div>
                <Favicons concept={concept} />
              </section>
            );
          })}
        </div>

        <header className="mt-16 max-w-3xl border-b border-ink-950 pb-6">
          <span className="eyebrow">20 naye designs</span>
          <h2 className="mt-3 font-display text-[28px] leading-[1.08] tracking-[-0.03em] text-ink-950 sm:text-[38px]">
            Different type, colour and layout in every one
          </h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-600">
            Stacked W with eekend and Cart, a trolley standing in for a letter, script, retro,
            serif, sticker and badge styles — each in its own typeface and palette. Number batao.
          </p>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {DESIGNS.map((design) => (
            <DesignCard key={design.key} design={design} />
          ))}
        </div>
      </div>
    </main>
  );
}
