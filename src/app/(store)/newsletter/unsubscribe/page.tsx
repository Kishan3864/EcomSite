import type { Metadata } from "next";
import Link from "next/link";
import { Link2Off } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { verifyUnsubscribe } from "@/lib/newsletter-token";
import { UnsubscribeForm } from "./unsubscribe-form";

export const metadata: Metadata = {
  title: "Unsubscribe",
  description: "Stop receiving WeekendCart newsletter emails.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);

/**
 * Where the Unsubscribe link in every newsletter email lands.
 *
 * Opening it changes nothing: link scanners open every URL in a message, so
 * the removal waits for a person to press the button. The link is checked
 * here only to decide what to show; the action checks it again before it
 * deletes anything.
 */
export default async function NewsletterUnsubscribePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const e = first(params.e);
  const t = first(params.t);
  const email = e && t ? verifyUnsubscribe(e, t) : null;

  return (
    <div className="container-page py-10 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <section className="border border-hairline bg-surface px-5 py-8 sm:px-10 sm:py-12">
          {email && e && t ? (
            <UnsubscribeForm email={email} e={e} t={t} />
          ) : (
            <div>
              <span className="flex h-11 w-11 items-center justify-center bg-brand-50 text-brand-700">
                <Link2Off size={19} aria-hidden />
              </span>
              <p className="eyebrow mt-6">Email preferences</p>
              <h1 className="mt-3 font-display text-[26px] leading-[1.12] tracking-[-0.02em] text-ink-950 sm:text-[32px]">
                This link is not working
              </h1>
              <p className="mt-4 text-[14.5px] leading-relaxed text-ink-600">
                The unsubscribe link looks incomplete, or it was changed on the way here. Please
                use the Unsubscribe link at the bottom of any WeekendCart email, or contact us and
                we will remove your address ourselves.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/" className={buttonClasses("primary", "lg", "w-full sm:w-auto")}>
                  Back to the store
                </Link>
                <Link href="/contact" className={buttonClasses("outline", "lg", "w-full sm:w-auto")}>
                  Contact us
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
