import Link from "next/link";
import {
  ArrowLeft,
  Heart,
  LockKeyhole,
  Repeat,
  RotateCcw,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { BRAND, Logo } from "@/components/brand/logo";
import { BUSINESS } from "@/config/business";
import { AuthArt } from "@/components/auth/auth-art";

const PROMISES: { icon: LucideIcon; label: string }[] = [
  { icon: Truck, label: "Track every order to the doorstep" },
  { icon: Repeat, label: "Reorder from your history in one tap" },
  { icon: Heart, label: "Addresses and wishlist saved for checkout" },
  { icon: RotateCcw, label: "Free returns within the return window" },
];

/** Read from the business record so they cannot drift from the policies. */
const ASSURANCES = [
  "Bought and invoiced by us",
  `Dispatched in ${BUSINESS.ops.dispatchDays} working days`,
  `${BUSINESS.ops.returnWindowDays}-day returns`,
];

/**
 * The frame every sign-in screen sits in: the form in a card on the left, an
 * aurora brand panel on the right (lg+). The card's inner width is 400px —
 * the widest Google will draw its button — so the two line up.
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
  footer?: React.ReactNode;
  /** Kept so callers need not change; the panel no longer varies by page. */
  imageIndex?: number;
}) {
  void imageIndex;

  return (
    <div className="grid min-h-dvh lg:h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Only this column may scroll, and only when it has to. */}
      <div className="flex flex-col px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8 sm:pt-5 sm:pb-5 lg:overflow-y-auto lg:px-12">
        <header className="flex shrink-0 items-center justify-between gap-3">
          <Logo size="sm" />
          <Link
            href="/"
            className="tap inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-ink-600 ring-1 ring-inset ring-line transition-colors duration-200 hover:bg-surface hover:text-brand-700"
          >
            <ArrowLeft size={14} aria-hidden /> Back to the shop
          </Link>
        </header>

        {/* Skip-link target. Every input is 40px, the height of Google's button. */}
        <main
          id="main"
          className="flex flex-1 items-center py-6 sm:py-8 [&_input:not([type=checkbox])]:h-10 [&_input:not([type=checkbox])]:rounded-md [&_select]:rounded-md"
        >
          <div className="card mx-auto w-full max-w-[448px] p-4 shadow-lg sm:p-6">
            <h1 className="t-h1 text-[24px] sm:text-[28px]">{title}</h1>
            <p className="t-body mt-1.5 max-w-[46ch]">{subtitle}</p>

            <div className="mt-5 space-y-3.5 sm:mt-6 sm:space-y-4">{children}</div>

            {/* Said in words, not with a padlock badge. */}
            <p className="t-small mt-5 flex items-center justify-center gap-1.5 text-center">
              <LockKeyhole size={14} aria-hidden className="shrink-0" />
              Encrypted connection. Your password is never stored in plain text.
            </p>

            {footer && (
              <div className="mt-4 border-t border-line pt-4 text-center text-[13px] leading-[1.5] text-ink-600">
                {footer}
              </div>
            )}
          </div>
        </main>

        <footer className="t-small shrink-0 text-center lg:text-left">
          Trouble signing in?{" "}
          <Link
            href="/contact"
            className="font-medium text-brand-700 underline-offset-2 transition-colors duration-200 hover:underline"
          >
            Talk to our team
          </Link>
        </footer>
      </div>

      <aside className="relative hidden p-3 lg:flex">
        <div className="aurora relative flex w-full flex-col overflow-hidden rounded-3xl">
          <div aria-hidden className="grid-lines pointer-events-none absolute inset-0" />
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-10 pt-10">
            <AuthArt />
          </div>

          <div className="relative p-10 pt-4 xl:p-12 xl:pt-4">
            <span className="eyebrow">Why create an account</span>
            <h2 className="t-h1 mt-3 max-w-md text-[26px] xl:text-[30px]">
              Your orders, addresses and wishlist in one place.
            </h2>
            <p className="t-body mt-3 max-w-[46ch] text-ink-700">
              {BRAND.name} holds its own stock and invoices every order itself, so what you buy,
              where it is and who to ask about it all live behind one sign-in.
            </p>

            <ul className="mt-6 grid grid-cols-2 gap-2.5">
              {PROMISES.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="glass flex items-center gap-3 rounded-xl p-3 text-[13px] leading-[1.4] text-ink-800 ring-1 ring-inset ring-white/70"
                >
                  <span className="icon-tile icon-tile-sm">
                    <Icon size={16} aria-hidden />
                  </span>
                  {label}
                </li>
              ))}
            </ul>

            <ul className="mt-6 flex flex-wrap gap-2">
              {ASSURANCES.map((label) => (
                <li
                  key={label}
                  className="inline-flex h-7 items-center rounded-full bg-surface/70 px-3 text-[11.5px] font-semibold text-ink-700 ring-1 ring-inset ring-line"
                >
                  {label}
                </li>
              ))}
            </ul>

            <p className="t-small mt-6">{BRAND.legalName}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
