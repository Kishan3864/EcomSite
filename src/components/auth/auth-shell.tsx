import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BRAND, Logo } from "@/components/brand/logo";
import { BUSINESS } from "@/config/business";
import { AuthArt } from "@/components/auth/auth-art";

const PROMISES = [
  "Track every order to the doorstep",
  "Reorder from your history in one tap",
  "Addresses and wishlist saved for checkout",
  "Free returns within the return window",
];

/**
 * The line along the foot of the panel: what the shop is, in three facts.
 *
 * The two numbers are read from the business record rather than typed out, so
 * the promise made to somebody signing up cannot drift away from the one the
 * shipping and returns policies make on the same site.
 */
const ASSURANCES = [
  "Bought and invoiced by us",
  `Dispatched in ${BUSINESS.ops.dispatchDays} working days`,
  `${BUSINESS.ops.returnWindowDays}-day returns`,
];

/**
 * The frame every sign-in screen sits in.
 *
 * Two things shape it. It must not scroll: on a laptop the whole of signing in
 * — heading, form, both buttons, the way to the other screen — belongs on one
 * screenful, so the page is exactly the height of the viewport and only the
 * form column will scroll if a phone or a short window forces it to. And the
 * form column is 400px wide, because Google draws its own button in a frame it
 * will not make wider than that, and the column matching the button is the only
 * way the two ever line up.
 *
 * The right-hand panel is illustrated rather than photographed — see AuthArt —
 * and carries real headed copy, so the page has something to say to a reader
 * and to a search engine rather than a darkened stock photograph.
 *
 * What it promises is set as a ruled index rather than a list of ticks in
 * saffron boxes. Four saffron squares repeated down one panel spend the site's
 * only warm colour on its least important line, which is precisely what makes
 * an accent stop meaning anything; the rules between the rows do the same work
 * and cost nothing.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  imageIndex = 0,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  /** Kept so callers need not change; the panel no longer varies by page. */
  imageIndex?: number;
}) {
  void imageIndex;

  return (
    <div className="grid min-h-dvh lg:h-dvh lg:grid-cols-2 lg:overflow-hidden">
      {/* Only this column may scroll, and only when it has to. */}
      <div className="flex flex-col px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8 sm:pt-5 sm:pb-5 lg:overflow-y-auto lg:px-12">
        <header className="flex shrink-0 items-center justify-between gap-3">
          <Logo href={null} size="sm" />
          <Link
            href="/"
            className="tap -mr-2 inline-flex h-9 items-center gap-1.5 px-2 text-[13px] font-medium text-ink-600 transition-colors duration-200 hover:text-brand-700 sm:mr-0 sm:px-0"
          >
            <ArrowLeft size={14} /> Back to the shop
          </Link>
        </header>

        {/* The skip link lands here, past the mark and the way back out. Every
            input on these screens is 40px, the height Google gives its button,
            so the whole column runs on one measure. */}
        <main
          id="main"
          className="flex flex-1 items-center py-6 [&_input:not([type=checkbox])]:h-10"
        >
          <div className="mx-auto w-full max-w-[400px]">
            <h1 className="font-display text-[26px] leading-[1.05] tracking-[-0.03em] text-ink-950 sm:text-[32px]">
              {title}
            </h1>
            <p className="mt-2 max-w-[46ch] text-[14px] leading-[1.55] text-ink-600 sm:mt-2.5">
              {subtitle}
            </p>

            <div className="mt-5 space-y-3.5 sm:mt-6 sm:space-y-4">{children}</div>

            {/* True on every screen that uses this shell: TLS on the wire,
                bcrypt at rest. Worth saying plainly where someone is deciding
                whether to trust the shop with an address and a card — and worth
                saying in words rather than with a padlock glyph, which is the
                badge every phishing page in the world also wears. */}
            <p className="mt-5 text-center text-[13px] leading-[1.5] text-ink-500">
              Encrypted connection. Your password is never stored in plain text.
            </p>

            <div className="mt-4 border-t border-hairline pt-4 text-center text-[13px] leading-[1.5] text-ink-600">
              {footer}
            </div>
          </div>
        </main>

        <footer className="shrink-0 text-center text-[13px] text-ink-500 lg:text-left">
          Trouble signing in?{" "}
          <Link
            href="/contact"
            className="underline underline-offset-2 transition-colors duration-200 hover:text-brand-700"
          >
            Talk to our team
          </Link>
        </footer>
      </div>

      <aside className="deep-plane relative hidden overflow-hidden lg:flex lg:flex-col">
        <AuthArt className="pointer-events-none absolute -right-12 top-2 h-[62%] w-auto opacity-95" />

        <div className="relative mt-auto p-10 xl:p-14">
          <span className="eyebrow eyebrow-dark">Why create an account</span>
          <h2 className="mt-4 max-w-md font-display text-[30px] leading-[1.1] tracking-[-0.025em] text-white xl:text-[34px]">
            Your orders, addresses and wishlist in one place.
          </h2>
          <p className="mt-3 max-w-[46ch] text-[14px] leading-[1.6] text-white/70 xl:text-[15px]">
            {BRAND.name} holds its own stock and invoices every order itself, so
            what you buy, where it is and who to ask about it all live behind one
            sign-in.
          </p>

          <ul className="mt-7 border-b border-white/10">
            {PROMISES.map((promise) => (
              <li
                key={promise}
                className="flex min-h-[46px] items-center border-t border-white/10 py-2.5 text-[13.5px] leading-[1.45] text-white/80"
              >
                {promise}
              </li>
            ))}
          </ul>

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {ASSURANCES.map((label) => (
              <li
                key={label}
                className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white/50"
              >
                {label}
              </li>
            ))}
          </ul>

          <p className="mt-7 text-[13px] text-white/40">{BRAND.legalName}</p>
        </div>
      </aside>
    </div>
  );
}
