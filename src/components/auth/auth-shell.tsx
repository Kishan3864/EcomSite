import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { POOL, img } from "@/data/images";

const PROMISES = [
  "Track every order to the doorstep",
  "One-tap reorder from your history",
  "Early access to limited maker runs",
  "Free returns with a saved address",
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  imageIndex = 6,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  imageIndex?: number;
}) {
  return (
    <div className="grid min-h-[calc(100dvh-120px)] lg:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <h1 className="font-display text-[30px] leading-[1.08] tracking-[-0.03em] text-ink-950 sm:text-[36px]">
            {title}
          </h1>
          <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-600">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-7 border-t border-hairline pt-5 text-[13.5px] text-ink-600">
            {footer}
          </div>

          <p className="mt-6 text-[11.5px] leading-relaxed text-ink-400">
            This is a demonstration storefront. Authentication is not connected to a backend yet —
            any details you enter stay in your browser.
          </p>
        </div>
      </div>

      {/* Editorial panel */}
      <div className="relative hidden overflow-hidden bg-brand-950 lg:block">
        <Image
          src={img(POOL.lifestyle[imageIndex % POOL.lifestyle.length], {
            fit: "portrait",
            w: 1000,
          })}
          alt=""
          fill
          sizes="50vw"
          className="object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/60 to-brand-950/25" />

        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo href="/" className="[&_span]:!text-white" />

          <div>
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

            <p className="mt-8 text-[12.5px] text-white/40">
              Trouble signing in?{" "}
              <Link href="/contact" className="underline underline-offset-2 hover:text-white/70">
                Talk to our team
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
