import { Key, RotateCcw, ShieldCheck } from "lucide-react";
import { BUSINESS } from "@/config/business";
import { cn } from "@/lib/utils";

/**
 * The three promises checkout makes, as a panel rather than a strip.
 *
 * WHERE IT WAS. A full-bleed band of three uppercase stamps above the progress
 * nav — the first thing on the page and the last thing anyone read. It was
 * wallpaper: no sentence, no space, nothing to look at, and the third promise
 * carried `hidden sm:inline`, so a phone had only ever shown two of the three.
 * It is now under the page heading, in the content column, on every step. All
 * three labels show at every width; that regression is not coming back.
 *
 * WHY IT HAS GLYPHS NOW, when the note in its old home argued flatly that it
 * should not. That note was refusing the trust SEAL: a "VERIFIED SECURE"
 * rosette, a padlock in a warm colour, a tick in a badge — the thing every scam
 * site wears, worth less than the sentence beside it. That refusal still holds.
 * What it did not distinguish is the other kind of mark. A glyph that names a
 * MECHANISM — the shield the connection is checked by, the key that encrypts
 * it, the arrow that sends a parcel back — is wayfinding. It says what happens,
 * and then the sentence says it properly.
 *
 * THE SHIELD IS THE OWNER'S CALL, and it reverses half of that old ban on
 * purpose. He asked for a "secure" icon; he got a Landmark, and the same bank
 * building was already the NET BANKING mark inside the gateway card a few
 * hundred pixels below (payment-marks.tsx, and settings-client.tsx maps lucide
 * Landmark to net banking too) — one drawing meaning two things on one screen,
 * which is exactly what the wayfinding argument exists to prevent. So: a
 * thin-stroke ShieldCheck, at the same size, the same 1.5 weight and the same
 * ink as the other two glyphs in this row. Never filled, never coloured, never
 * in a badge or a rosette. A line glyph sitting in a row of line glyphs is not
 * a seal, and Landmark goes back to meaning net banking and nothing else.
 *
 * NO GOLD, still: the page spends its one warm colour on the step counter, and
 * three glyphs here would spend it three times over on a row nobody is meant to
 * stare at. Ink strokes at 18px and ink-500 — the sized-icon colour, moved up
 * from ink-400 because ink-400 is 2.55:1 on white and read as three glyphs that
 * had failed to load beside the full-colour marks further down the page.
 *
 * WHY EACH ONE GAINED A SENTENCE. Three words in small caps is a claim; a claim
 * with nothing under it is what a shopper discounts. The clauses are also what
 * make the row honest — "256-bit encryption" is the shop's own marketing gloss
 * and appears nowhere in policies.ts, which says only that pages are served
 * over HTTPS with TLS. The owner's words stay as the label and the accurate
 * sentence sits under them, rather than the page claiming a bit count it has
 * never published.
 *
 * AND WHY THE SENTENCES ARE OFF ON A PHONE. With all three clauses set, this
 * panel was ~280px of a 390px screen, sitting between the heading and the first
 * payment card — so the choice the page exists to offer started below the fold.
 * The labels are the promise; the clauses are the small print behind it, and
 * small print is what a phone can afford to drop. `hidden sm:block` takes the
 * panel back to roughly 120px there and gives the sentences back from sm up.
 *
 * The first clause is also the short one now. It used to carry "Card numbers,
 * CVV and UPI PINs are entered there and never reach our servers", which the
 * gateway card says again, better, where the shopper is actually choosing. Two
 * near-identical sentences on one screen read as a shop insisting rather than a
 * shop informing. This one keeps only the part it alone can say.
 */
const SIGNALS = [
  {
    Icon: ShieldCheck,
    label: "Secure checkout",
    line: "PayU and your own bank take the payment, not us.",
  },
  {
    Icon: Key,
    label: "256-bit encryption",
    line: "Every page of this shop, including this one, is served over HTTPS with TLS.",
  },
  {
    Icon: RotateCcw,
    label: "Easy returns",
    line: `${BUSINESS.ops.returnWindowDays} days from delivery to change your mind on any eligible item.`,
  },
];

export function CheckoutTrustRow({ className }: { className?: string }) {
  return (
    // `card` spelled out rather than the `detail-panel`
    // utility, which is the same two declarations plus a rule zeroing the
    // box-shadow on its last child — and the last child here is the third
    // column, whose box-shadow IS its divider.
    //
    // `role="list"` because Tailwind's preflight sets `list-style: none`, which
    // drops listitem semantics in Safari and takes the panel's "3 items" with
    // it.
    <ul role="list" className={cn("grid card md:grid-cols-3", className)}>
      {SIGNALS.map(({ Icon, label, line }, i) => (
        <li
          key={label}
          className={cn(
            "flex items-center gap-2.5 p-3 sm:items-start sm:gap-3 sm:p-4",
            // Stacked until md, three columns above it — not sm. At 640px each
            // cell gets ~135px of text column and the clauses set as six lines
            // of two words, so the panel was a ragged block of near-vertical
            // type through the whole tablet band. Dividers move with the
            // layout: a row line below md, a column rule above it. Applied by
            // index rather than `:not(:last-child)` so the two never land on
            // one element at one breakpoint: both set `box-shadow`, and the
            // later one would win outright. `max-md:` and `md:` cannot both
            // match.
            i < SIGNALS.length - 1 && "max-md:table-row-line",
            i > 0 && "md:rule-hair-l",
          )}
        >
          <Icon size={18} strokeWidth={1.5} aria-hidden className="shrink-0 text-ink-500 sm:mt-px" />
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase leading-none tracking-[0.1em] text-ink-500 sm:text-[11.5px] sm:tracking-[0.12em]">
              {label}
            </span>
            <span className="mt-1.5 hidden text-[12.5px] leading-[1.5] text-ink-600 sm:block">
              {line}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
