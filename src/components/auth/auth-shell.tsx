import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { BRAND, Logo } from "@/components/brand/logo";
import { POOL, img } from "@/data/images";

const PROMISES = [
  "Track every order to the doorstep",
  "One-tap reorder from your history",
  "Early access to limited maker runs",
  "Free returns with a saved address",
];

/** The panel is a full-height column, so these have to hold a portrait crop. */
const EDITORIAL = [POOL.jewellery[1], POOL.jewellery[3], POOL.jewellery[5]];

/**
 * The auth screens own the whole viewport, so no storefront chrome is there to
 * navigate with. The way back to the shop and the route to support both sit in
 * the form column rather than the editorial panel, which is desktop-only.
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
  imageIndex?: number;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      {/* The bottom inset keeps the support line clear of a phone's home bar. */}
      <div className="flex flex-col px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-10 sm:py-7 lg:px-14">
        <header className="flex items-center justify-between gap-3 sm:gap-4">
          <Logo href={null} size="sm" />
          <Link
            href="/"
            className="tap -mr-2 inline-flex h-10 items-center gap-1.5 px-2 text-[12.5px] font-medium text-ink-600 transition-colors hover:text-brand-700 sm:mr-0 sm:h-auto sm:px-0 sm:text-[13px]"
          >
            <ArrowLeft size={14} /> Back to the shop
          </Link>
        </header>

        {/* The skip link lands here, past the mark and the way back out. On a
            phone the form starts just under the header rather than floating in
            the middle of a tall screen. */}
        <main id="main" className="flex flex-1 items-start pt-6 pb-8 sm:items-center sm:py-14">
          <div className="mx-auto w-full max-w-md">
            <h1 className="font-display text-[22px] leading-[1.08] tracking-[-0.03em] text-ink-950 sm:text-[36px]">
              {title}
            </h1>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-600 sm:mt-2.5 sm:text-[14.5px]">
              {subtitle}
            </p>

            <div className="mt-5 space-y-4 sm:mt-8 sm:space-y-5">{children}</div>

            <div className="mt-5 border-t border-hairline pt-4 text-[13px] text-ink-600 sm:mt-7 sm:pt-5 sm:text-[13.5px]">
              {footer}
            </div>
          </div>
        </main>

        <footer className="text-[12px] text-ink-500">
          Trouble signing in?{" "}
          <Link href="/contact" className="underline underline-offset-2 hover:text-ink-700">
            Talk to our team
          </Link>
        </footer>
      </div>

      <aside className="relative hidden overflow-hidden bg-brand-950 lg:block">
        <Image
          src={img(EDITORIAL[imageIndex % EDITORIAL.length], { fit: "portrait", w: 1200 })}
          alt=""
          fill
          sizes="50vw"
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/70 to-brand-950/20" />

        <div className="relative flex h-full flex-col justify-end p-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-300">
            Why sign in
          </p>
          <h2 className="mt-3 max-w-md font-display text-[34px] leading-[1.1] tracking-[-0.025em] text-white">
            Your orders, addresses and wishlist in one place.
          </h2>
          <ul className="mt-6 space-y-3">
            {PROMISES.map((promise) => (
              <li key={promise} className="flex items-start gap-2.5 text-[14px] text-white/75">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-400 text-brand-950">
                  <Check size={12} strokeWidth={3} />
                </span>
                {promise}
              </li>
            ))}
          </ul>

          <p className="mt-10 text-[12px] text-white/35">{BRAND.legalName}</p>
        </div>
      </aside>
    </div>
  );
}
