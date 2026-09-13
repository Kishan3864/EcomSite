import Link from "next/link";
import { ArrowLeft, Check, Lock, PackageCheck, RotateCcw, ShieldCheck } from "lucide-react";
import { BRAND, Logo } from "@/components/brand/logo";
import { AuthArt } from "@/components/auth/auth-art";

const PROMISES = [
  "Track every order to the doorstep",
  "Reorder from your history in one tap",
  "Addresses and wishlist saved for checkout",
  "Free returns within the return window",
];

/** The line along the foot of the panel: what the shop is, in three facts. */
const ASSURANCES = [
  { Icon: ShieldCheck, label: "Bought and invoiced by us" },
  { Icon: PackageCheck, label: "Dispatched in 2 days" },
  { Icon: RotateCcw, label: "7-day returns" },
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
            className="tap -mr-2 inline-flex h-9 items-center gap-1.5 px-2 text-[12.5px] font-medium text-ink-600 transition-colors hover:text-brand-700 sm:mr-0 sm:px-0"
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
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500 sm:mt-2 sm:text-[13.5px]">
              {subtitle}
            </p>

            <div className="mt-5 space-y-3.5 sm:mt-6 sm:space-y-4">{children}</div>

            {/* True on every screen that uses this shell: TLS on the wire,
                bcrypt at rest. Worth saying plainly where someone is deciding
                whether to trust the shop with an address and a card. */}
            <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-ink-400">
              <Lock size={11} className="shrink-0" />
              Encrypted connection. Your password is never stored in plain text.
            </p>

            <div className="mt-4 border-t border-hairline pt-3.5 text-center text-[12.5px] text-ink-600 sm:text-[13px]">
              {footer}
            </div>
          </div>
        </main>

        <footer className="shrink-0 text-center text-[11.5px] text-ink-400 lg:text-left">
          Trouble signing in?{" "}
          <Link href="/contact" className="underline underline-offset-2 hover:text-ink-700">
            Talk to our team
          </Link>
        </footer>
      </div>

      <aside className="relative hidden overflow-hidden bg-brand-950 lg:flex lg:flex-col">
        <AuthArt className="pointer-events-none absolute -right-12 top-2 h-[62%] w-auto opacity-95" />

        <div className="relative mt-auto p-10 xl:p-14">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gold-300">
            Why create an account
          </p>
          <h2 className="mt-3 max-w-md font-display text-[30px] leading-[1.1] tracking-[-0.025em] text-white xl:text-[34px]">
            Your orders, addresses and wishlist in one place.
          </h2>
          <p className="mt-2.5 max-w-sm text-[13px] leading-relaxed text-white/55">
            {BRAND.name} holds its own stock and invoices every order itself, so
            what you buy, where it is and who to ask about it all live behind one
            sign-in.
          </p>

          <ul className="mt-5 space-y-2">
            {PROMISES.map((promise) => (
              <li key={promise} className="flex items-start gap-2.5 text-[13.5px] text-white/80">
                <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center bg-gold-400 text-brand-950">
                  <Check size={11} strokeWidth={3.5} />
                </span>
                {promise}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-5">
            {ASSURANCES.map(({ Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-[11.5px] text-white/45">
                <Icon size={13} className="text-gold-400" />
                {label}
              </span>
            ))}
          </div>

          <p className="mt-6 text-[11px] text-white/25">{BRAND.legalName}</p>
        </div>
      </aside>
    </div>
  );
}
