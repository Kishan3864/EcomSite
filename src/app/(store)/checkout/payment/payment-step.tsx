"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Globe } from "lucide-react";
import type { PaymentMethodId } from "@/lib/types";
import { CheckoutAside, CheckoutShell } from "@/components/checkout/shell";
import { useCheckoutPaymentMethods } from "@/components/checkout/payment-methods";
import { OrderSummary } from "@/components/cart/order-summary";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { OptionCard } from "@/components/ui/field";
import { PaymentMark, type PaymentMarkName } from "@/components/brand/payment-marks";
import { useStore } from "@/store/store";
import { computeTotals } from "@/lib/pricing";
import { cn, formatINR } from "@/lib/utils";

/**
 * The two rows of marks, and why the gateway carries all seven.
 *
 * THE SEVEN LIVE ON THE GATEWAY CARD, and that is the load-bearing fact here.
 * The owner asked for UPI, Google Pay, PhonePe, Paytm, cards, net banking and
 * wallets, each with an icon. They were briefly split — apps on the UPI card,
 * categories on the gateway card — which reads well and is wrong, because the
 * UPI card is conditional: `paymentSwitches()` in storefront-config.ts only
 * offers it when the UPI toggle is on AND a VPA/QR is configured, and in this
 * shop's live config it is neither. The gateway and cash are all that render.
 * So three of the owner's seven were invisible to every real customer. The list
 * has to survive the UPI card being absent, and it does now.
 *
 * It is not padding. Every one of these is a route waiting inside PayU's own
 * checkout: it opens on UPI with Google Pay, PhonePe and Paytm as the intent
 * apps, and offers cards, net banking and wallets beside them. The row states
 * what the next screen will offer.
 *
 * THE UPI CARD'S ROW STAYS DIFFERENT, because it is a different deal — paid
 * straight into the shop's account with no gateway in between, so what matters
 * there is which app can pay the QR in front of you, not which route a
 * processor takes afterwards. Three apps, and the line under them says every
 * other UPI app works the same way.
 */
const UPI_APPS: readonly { id: PaymentMarkName; label: string }[] = [
  { id: "gpay", label: "Google Pay" },
  { id: "phonepe", label: "PhonePe" },
  { id: "paytm", label: "Paytm" },
];

/**
 * EVERY CELL CARRIES A CAPTION, Paytm included.
 *
 * Paytm's mark is a wordmark, so its caption repeats it, and for two rounds it
 * was dropped for that reason. Both times the cell it left behind was the one
 * hole in an otherwise even grid — the columns are equal width, so a cell with
 * no text is a gap you can see from across the room. A logo beside its own name
 * is what every payments row looks like; a row with a hole in it is not. The
 * repetition is the cheaper of the two faults.
 */
const GATEWAY_ROUTES: readonly { id: PaymentMarkName; label: string }[] = [
  { id: "upi", label: "UPI" },
  { id: "gpay", label: "Google Pay" },
  { id: "phonepe", label: "PhonePe" },
  { id: "paytm", label: "Paytm" },
  // Cards is two schemes, not one category. A single generic card glyph said
  // "some card" where the two marks a shopper is holding say "your card", and
  // recognition is the entire reason these are logos and not words.
  { id: "visa", label: "Visa" },
  { id: "mastercard", label: "Mastercard" },
  { id: "netbanking", label: "Net banking" },
  { id: "wallets", label: "Wallets" },
];

/**
 * One mark per method, on the card's title line.
 *
 * The gateway's lead is a GLOBE, not a card. It was CardsMark, which put the
 * same drawing on the title line and again as CARDS in the row 215px below it —
 * one picture, two meanings, on one card. That is the defect the trust row's
 * Landmark was changed for, reintroduced at half the distance. A globe says
 * what the card actually is: the payment happens somewhere else, on PayU's
 * checkout, rather than in any one instrument. Cash keeps its banknote and the
 * UPI card its phone; neither is repeated anywhere on the page.
 */
/**
 * The marks whose artwork runs edge to edge of its own square canvas.
 *
 * PhonePe's disc and Google Pay's ribbons touch all four sides; every other
 * asset here is a wordmark inset in a band across the middle. Contained in the
 * same box these two come out about twice the visual mass, so the row insets
 * them to match. Nothing to do with the files being wrong — it is how each
 * scheme composed its own square.
 */
const EDGE_TO_EDGE_MARKS = new Set<PaymentMarkName>(["gpay", "phonepe"]);

const LEAD_MARKS: Partial<Record<PaymentMethodId, PaymentMarkName>> = {
  upi: "upiapp",
  cod: "cod",
};

/**
 * The mark beside a method's name.
 *
 * Ink only, every one of them — but ink-600, not the ink-400 decorative glyph
 * strokes usually take. These carry information, so SC 1.4.11's 3:1 applies,
 * and ink-400 is 2.55:1 on the white card and 2.02:1 on the brand-100 fill of
 * the chosen one — faintest on the card the customer has actually picked, and
 * on a phone outdoors effectively not there at all. ink-600 is 7.3:1 on white
 * and 5.35:1 on the fill. Colour is still rationed to the panel below, and that
 * panel only exists on the chosen card, so at most one coloured row is ever on
 * screen and it is always on the card just picked. That is what keeps the
 * logos from out-shouting the selection state they sit inside.
 *
 * Returns null for a method it does not know: the gateway card is absent
 * whenever PayU is unconfigured, and the shop can add a route tomorrow.
 */
function MethodLead({ id }: { id: PaymentMethodId }) {
  const name = LEAD_MARKS[id];
  // mt-px against `items-start`, not `items-center`: the longest method name
  // wraps to two lines on a phone, and a mark centred on a two-line block
  // floats between them instead of sitting on the name.
  const wrap = "mt-px shrink-0 text-ink-600";

  if (id === "online") {
    return (
      <span className={wrap}>
        <Globe size={17} strokeWidth={1.6} aria-hidden />
      </span>
    );
  }
  if (!name) return null;
  return (
    <span className={wrap}>
      <PaymentMark name={name} size={17} />
    </span>
  );
}

/**
 * A white plinth of marks inside a chosen card.
 *
 * White on purpose. Brand colours shift on a tinted ground, and one white
 * object holding all of them is both truer to each mark and quieter than seven
 * loose logos scattered on the fill. `shadow-xs` for the 1px ink ring: the
 * stamps this replaces had no shadow at all, so they were invisible white on a
 * white card and would have been white blocks on the tint.
 *
 * A COLUMN GRID, NOT `flex-wrap`. Seven items of five different widths wrapped
 * by flex leave whatever happens to be last stranded alone on its own line —
 * at 390px the gateway row broke 3 / 3 / 1, with WALLETS orphaned. `auto-fill`
 * with a 7.5rem floor lays the same seven into whatever number of equal columns
 * fits: two on a phone, three or four as the card widens, with the last cell
 * simply empty. 7.5rem is set by the widest item, NET BANKING at ~115px. The
 * rows line up under each other, which is the only way a list this long reads
 * as a table of routes rather than as spillage.
 *
 * `role="list"` because Tailwind's preflight strips `list-style`, and Safari
 * drops listitem semantics with it; `aria-label` because the caption beside it
 * is a sibling span, so without one a screen reader gets "list, 7 items, UPI,
 * Google Pay…" with nothing saying these are what the next screen accepts.
 */
function MarkRow({
  label,
  items,
}: {
  label: string;
  items: readonly { id: PaymentMarkName; label: string }[];
}) {
  return (
    <div className="bg-surface px-2.5 py-2.5 shadow-xs">
      <span className="block text-[10.5px] font-semibold uppercase leading-none tracking-[0.12em] text-ink-500">
        {label}
      </span>
      <ul
        role="list"
        aria-label={label}
        // TWO NUMBERS, ONE PER BREAKPOINT, both set by the longest caption.
        //
        // The column has to hold the 40px tile, an 8px gap and NET BANKING on
        // ONE line — a caption that wraps makes its row taller than the others
        // and undoes the whole point of a grid. At 11px/0.1em that caption is
        // ~95px, so 9rem. But the phone only has ~294px inside this plinth, and
        // 9rem columns fit exactly one of them: seven stacked rows, ~530px of a
        // 390px screen spent on a list of logos.
        //
        // So the phone drops the caption to 10px/0.06em (~78px) and the column
        // to 8.25rem, which fits two. Same tile, same alignment, half the
        // height.
        // A FIXED COUNT, not auto-fill. auto-fill sized the columns off the
        // container and split eight marks 5 and 3, which leaves a hole at the
        // end of the first row — the exact raggedness this row keeps being
        // rebuilt to remove. Two and four divide eight evenly, so the grid is
        // always complete: four rows of two on a phone, two rows of four above.
        className="mt-2.5 grid grid-cols-2 items-center gap-x-3 gap-y-1.5 sm:grid-cols-4 sm:gap-y-2"
      >
        {items.map((item) => (
          // ink-500, up from ink-400: these are the house glyphs, and at 2.55:1
          // they read as marks that failed to load beside the full-colour ones.
          // ink-500 is 5.02:1 on this white plinth, which the row always has —
          // the plinth is why they do not need ink-600 the way the lead marks
          // on the tinted card do.
          // EVERY MARK SITS IN THE SAME BOX. The marks are five different
          // shapes — two slanted bars, a round G, a square tile, a wordmark,
          // three stroked glyphs — and drawn at a shared `size` they still
          // looked mismatched, because `size` sets the viewBox edge and each
          // mark fills a different fraction of it. Worse, a wide mark pushed
          // its own label right while a narrow one pulled it left, so seven
          // labels started at seven different x positions and the row read as
          // scattered rather than as a set.
          //
          // The slot fixes both: 34x20, mark centred inside it, label always
          // beginning at the same offset in every cell. PaymentMark scales
          // each mark to fill the slot's height (or its width, for the one
          // wordmark), so they now match optically and not just nominally.
          <li key={item.id} className="flex items-center gap-2 text-ink-500">
            {/* No tile behind the mark. The grey plate was holding the row's
                alignment while the marks were mismatched; the fixed box does
                that on its own, and on the white plinth the plate was just a
                second rectangle around every logo.

                THE INSET IS AN OPTICAL CORRECTION, not a whim. Every asset is
                a 512-square, but the schemes fill that square differently:
                PhonePe's disc and Google Pay's ribbons run edge to edge, while
                UPI, Paytm, Visa and Mastercard are wordmarks sitting in a band
                across the middle with the scheme's own padding above and below.
                Contained in the same box, the two round ones therefore render
                roughly twice the visual mass of the words. The inset takes them
                back down so the row reads as one size. */}
            <span
              className={cn(
                "flex h-6 w-10 shrink-0 items-center justify-center sm:h-7 sm:w-12",
                EDGE_TO_EDGE_MARKS.has(item.id) && "p-1 sm:p-[5px]",
              )}
            >
              <PaymentMark name={item.id} size={15} />
            </span>
            {/* Sentence case, not uppercase. These are brand names and the
                brands capitalise them themselves — PhonePe, Paytm, Mastercard
                — so forcing caps overrode the spelling each of them is
                trademarked under. UPI stays all-caps because UPI is an
                initialism, which the data now carries rather than the CSS.
                Tracking goes with it: letterspacing is for uppercase runs and
                only smears lowercase.
                Also the item's only accessible name — every mark is aria-hidden. */}
            <span className="min-w-0 text-[10.5px] font-semibold leading-none text-ink-600 sm:text-[11px]">
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * How the customer would like to pay.
 *
 * Only the routes that can actually take money are listed — see
 * storefront-config.ts — so this page never offers a choice that dead-ends.
 *
 * The gateway is one option, not four: PayU's own checkout already asks for
 * UPI, card, net banking or wallet, and asking here as well would be a second
 * redundant step and a chance to pick "card" and then want UPI. UPI paid
 * straight to the shop is separate because it is genuinely a different deal —
 * no gateway, and a wait for confirmation — and the card says so.
 */
export function PaymentStep() {
  const { cart, checkout, config, customer, dispatch, hydrated } = useStore();
  const paymentMethods = useCheckoutPaymentMethods();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && cart.length > 0 && !checkout.addressId) router.replace("/checkout/address");
  }, [hydrated, cart.length, checkout.addressId, router]);

  const selectedDelivery =
    config.deliveryOptions.find((d) => d.id === checkout.deliveryId) ?? config.deliveryOptions[0];
  const totals = computeTotals(cart, {
    delivery: selectedDelivery,
    rates: config.rates,
  });

  // Cash on delivery is the shop's rule and the product's. A bag holding one
  // prepaid-only line cannot be sent COD however the rest of it is priced, and
  // the reason has to be the one shown — "over the limit" for an expensive bag
  // is a different sentence from "this item is prepaid only".
  const prepaidOnly = cart.find((line) => !line.codAvailable);
  const overCodLimit = totals.total > config.codLimit;
  const codAllowed = !prepaidOnly && !overCodLimit;
  const codReason = prepaidOnly
    ? `${prepaidOnly.title} is prepaid only, so this order cannot be sent cash on delivery.`
    : `Cash on delivery is available on orders up to ${formatINR(config.codLimit)}.`;

  const available = paymentMethods.map((m) => m.id);

  // A draft saved in this browser before the shop's payment options changed may
  // name one that is no longer offered — "card" from when the gateway listed
  // each method separately. Anything that was a gateway choice still is one;
  // anything else falls back to no choice rather than a wrong one.
  const stored = checkout.paymentMethod;
  const selected: PaymentMethodId | null =
    stored && available.includes(stored)
      ? stored
      : stored && stored !== "cod" && available.includes("online")
        ? "online"
        : null;

  // Arrive with a method already chosen, rather than with nothing chosen.
  //
  // In order of what we know about this shopper:
  //   1. how they usually pay, if they are signed in and have a preference;
  //   2. otherwise the first method the shop offers — which is the one the
  //      list calls Recommended, because `paymentMethods` is already in the
  //      order the shop wants them read.
  //
  // Cash on delivery is never auto-selected: it is the one method that can be
  // unavailable for the basket in front of them, and it is the one where a
  // default nobody noticed costs the shop money. It is always a deliberate
  // choice. Anything already stored on the draft wins over both — unless what
  // is stored is a cash-on-delivery choice the basket has since outgrown.
  //
  // That last clause is new, and it is the other half of making selection
  // visible. A card that cannot be used no longer renders as chosen, so a stale
  // `cod` draft would otherwise leave the page with nothing marked at all and
  // the reason buried in a dimmed card's subtitle. Treating it as unset lets
  // the rules below move the customer to a prepaid method they can actually
  // use; the dimmed card and its sentence still explain why cash is out.
  const storedCodDead = checkout.paymentMethod === "cod" && !codAllowed;

  useEffect(() => {
    if (!hydrated) return;
    if (checkout.paymentMethod && !storedCodDead) return;

    const preferred = customer?.preferredPayment as PaymentMethodId | undefined;
    const usable = (id: PaymentMethodId | undefined): id is PaymentMethodId =>
      Boolean(id) && paymentMethods.some((m) => m.id === id) && !(id === "cod" && !codAllowed);

    const fallback = paymentMethods.find((m) => m.id !== "cod")?.id;
    const pick = usable(preferred) ? preferred : usable(fallback) ? fallback : undefined;
    if (!pick) return;

    dispatch({ type: "checkout/patch", patch: { paymentMethod: pick, paymentDetail: null } });
  }, [
    hydrated,
    checkout.paymentMethod,
    storedCodDead,
    customer,
    paymentMethods,
    codAllowed,
    dispatch,
  ]);

  /** Cash on delivery is the one method a basket can rule out. */
  const codDisabled = (id: PaymentMethodId) => id === "cod" && !codAllowed;

  // One tab stop for the whole group, which is what a radio group is: Tab
  // lands on the chosen card and the arrow keys move between them. If nothing
  // is chosen — the effect above can find no usable method and returns — the
  // first card that CAN be picked takes the stop, because a group where every
  // card is `tabIndex={-1}` has left the tab order entirely.
  const activeId = selected && !codDisabled(selected) ? selected : null;
  const tabbableId =
    activeId ?? paymentMethods.find((m) => !codDisabled(m.id))?.id ?? paymentMethods[0]?.id;

  function choose(id: PaymentMethodId) {
    dispatch({ type: "checkout/patch", patch: { paymentMethod: id, paymentDetail: null } });
    setError(null);
  }

  function next() {
    if (!selected) {
      setError("Choose how you would like to pay.");
      return;
    }
    if (selected === "cod" && !codAllowed) {
      setError(codReason);
      return;
    }
    dispatch({
      type: "checkout/patch",
      patch: {
        paymentMethod: selected,
        paymentDetail:
          selected === "cod" ? "Pay on delivery" : selected === "upi" ? "UPI" : "PayU",
      },
    });
    router.push("/checkout/review");
  }

  return (
    <CheckoutShell
      step="payment"
      title="How would you like to pay?"
      description="Nothing is charged yet — you will see a full summary before the payment goes through."
      aside={
        <>
          <CheckoutAside />
          <OrderSummary totals={totals} lines={cart} delivery={selectedDelivery} />
        </>
      }
      total={totals.total}
      action={
        <Button
          size="lg"
          className="w-full px-4 sm:w-auto sm:min-w-[240px] sm:px-8"
          onClick={next}
        >
          Review order
          <ArrowRight size={17} />
        </Button>
      }
    >
      <div className="space-y-3 sm:space-y-4">
        {/* A radio group, not three unrelated toggles.
            These cards are mutually exclusive — picking one unpicks the rest —
            and they used to ship as separate `aria-pressed` buttons inside a
            bare <ul>: no group, no name, no "1 of 3", and nothing telling a
            screen reader that the options are one choice. Visible selection was
            fixed while programmatic selection was not, which is half a fix. A
            <div> rather than a <ul> because a radiogroup's children are radios,
            not list items, and <li role="presentation"> is a longer way to say
            the same thing. */}
        <div role="radiogroup" aria-label="Payment method" className="space-y-2 sm:space-y-3">
          {paymentMethods.map((method) => {
            const disabled = codDisabled(method.id);
            const active = selected === method.id && !disabled;

            return (
              <div key={method.id}>
                {/* There is a glyph beside the name now, and the rule that said
                    there must not be is still mostly right.

                    What it banned was a trust SEAL: a shield stamped on "pay
                    online" to make the option feel safer than the one beside
                    it. That is a virtue asserted about ourselves, it is the
                    badge every scam site wears, and it stays banned — which is
                    why the gateway card takes a CARD and not the ShieldCheck
                    the account settings page happens to map it to. A mark that
                    says what a method IS is a different object. It is
                    wayfinding: the customer is scanning for the way they
                    actually pay, and a phone, a card and a banknote sort three
                    cards faster than three sentences do.

                    (The trust panel above the cards does now carry a thin
                    ShieldCheck for SECURE CHECKOUT. The owner asked for it, and
                    it replaced a bank building that was also the NET BANKING
                    mark down here — one drawing, two meanings, one screen. A
                    line glyph in a row of line glyphs is not the seal the ban
                    was written against; a shield on one of three competing
                    payment options would be. See trust-row.tsx.)

                    The colour follows the same line. Ink strokes up here, where
                    a mark is a signpost; the brands' own colours only inside the
                    panel below, which renders only on the chosen card — so the
                    page can never hold more than one coloured row, and the row
                    it holds is always confirming the choice just made rather
                    than competing with it. */}
                <OptionCard
                  radio
                  tabbable={method.id === tabbableId}
                  selected={selected === method.id}
                  onSelect={() => choose(method.id)}
                  disabled={disabled}
                  // The sentence naming why cash is unavailable, rendered below
                  // the card instead of inside it. As the dimmed subtitle it
                  // composited to 2.53:1 and sat on a card that `disabled` had
                  // taken out of the tab order, so the one person who most
                  // needed telling was never told. See field.tsx.
                  note={disabled ? codReason : undefined}
                  title={
                    <span className="flex items-start gap-2">
                      <MethodLead id={method.id} />
                      {method.name}
                    </span>
                  }
                  // The word, spelled out, because the owner asked to be able to
                  // tell at a glance and three visual signals are still three
                  // visual signals. Two things about where it sits.
                  //
                  // It is passed from here rather than built into OptionCard:
                  // the address step and the settings list both already show
                  // "Default" on this line, and two lookalike words at 11px
                  // meaning chosen-now and saved-for-later would be a worse bug
                  // than the one being fixed.
                  //
                  // And it is in the badge slot, not the `meta` column on the
                  // right. As a fixed right-hand column it took ~74px off the
                  // title at the instant of the tap, so "Pay online — card, UPI,
                  // net banking" broke over two lines and pushed "Fastest" onto
                  // a third — the card reflowing under the thumb that chose it.
                  // Here it joins the badge on the title's own wrap row: the
                  // title keeps the full column and reads on one line at 390px,
                  // and the badge and the word share the line below it. The
                  // badge is NOT replaced while selected, because in test mode
                  // it is the "Test · owner only" warning.
                  //
                  // aria-hidden: the button's own aria-checked already says it.
                  badge={
                    <>
                      {method.badge ? <Badge tone="outline">{method.badge}</Badge> : null}
                      {active && (
                        // A SOLID TAG, not tinted words. As brand-700 text on
                        // the brand-100 fill it was the same colour family as
                        // everything around it and read as another label; the
                        // one element on the card whose whole job is to say
                        // "this one" should be the one element that inverts.
                        // White on brand-700 is 8.35:1, the same pairing the
                        // marker already uses, so the tick and the tag are
                        // plainly one statement made twice.
                        <span
                          aria-hidden
                          className="bg-brand-700 px-1.5 py-1 text-[10px] font-semibold uppercase leading-none tracking-[0.14em] text-white"
                        >
                          Selected
                        </span>
                      )}
                    </>
                  }
                  subtitle={method.description}
                >
                  {method.id === "upi" && (
                    <div className="space-y-3.5">
                      <MarkRow label="Pay from any UPI app" items={UPI_APPS} />
                      <p className="text-[12.5px] leading-[1.5] text-ink-600">
                        BHIM, Amazon Pay and every other UPI app work the same way.
                      </p>
                      {/* Three ruled rows: what to do, in the order it happens. */}
                      <ol>
                        {[
                          "Scan our QR, or tap through to your UPI app on a phone.",
                          `Pay ${formatINR(totals.total)} and copy the 12-digit reference your app shows.`,
                          "Enter it on the next screen. We check it against our bank and confirm — usually within a few hours, and you get an email the moment we do.",
                        ].map((line, i) => (
                          <li
                            key={line}
                            className="flex gap-3 py-2.5 text-[13px] leading-[1.55] text-ink-600"
                          >
                            {/* Ocean, not ink-400: these sit on the chosen
                                card's brand-100 fill, where ink-400 is 2:1 and
                                a numeral is text, not a glyph stroke. */}
                            <span className="shrink-0 font-semibold tabular-nums text-brand-700">
                              {i + 1}
                            </span>
                            <span className="min-w-0">{line}</span>
                          </li>
                        ))}
                      </ol>
                      <p className="text-[13px] leading-[1.55] text-ink-600">
                        Your UPI PIN is entered only inside your own payment app — it never reaches
                        our servers.
                      </p>
                    </div>
                  )}

                  {method.id === "online" && (
                    <div className="space-y-3.5">
                      <MarkRow label="Accepted on PayU's checkout" items={GATEWAY_ROUTES} />
                      <p className="text-[13px] leading-[1.55] text-ink-600">
                        You pick UPI, card or net banking on PayU&apos;s checkout at the last
                        step. Card numbers, CVV and UPI PINs are entered there — they never reach
                        our servers, and we never store them.
                      </p>
                    </div>
                  )}

                  {method.id === "cod" && (
                    <p className="text-[13px] leading-[1.55] text-ink-600">
                      Keep {formatINR(totals.total)} ready, or pay the delivery partner by UPI at the
                      door. There is no extra charge for cash on delivery.
                    </p>
                  )}
                </OptionCard>
              </div>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="text-[13px] font-medium text-sale-600">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* A 44px touch target on phones, which is the size the rest of the
              shop uses and the size the old comment here claimed. It was
              `py-2.5` on 11px text with no line-height utility — 16.5 + 20 =
              36.5px — and the comment asserting 40px was what kept anyone from
              measuring it. `min-h-11` states the target outright instead of
              deriving it from padding; the negative margin keeps the row. */}
          <Link
            href="/checkout/address"
            className="-my-2.5 inline-flex min-h-11 items-center py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500 transition-colors duration-200 hover:text-ink-950 lg:my-0 lg:min-h-0 lg:py-0"
          >
            Back to address
          </Link>
          <Button size="lg" className="hidden min-w-[200px] lg:inline-flex" onClick={next}>
            Review order
            <ArrowRight size={17} />
          </Button>
        </div>
      </div>
    </CheckoutShell>
  );
}
