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
    <div className="container-page relative py-10 sm:py-16">
      <div aria-hidden className="grid-lines pointer-events-none absolute inset-x-0 top-0 h-72" />
      <div className="relative mx-auto w-full max-w-xl">
        <section className="card px-5 py-8 shadow-lg sm:px-10 sm:py-12">
          {email && e && t ? (
            <UnsubscribeForm email={email} e={e} t={t} />
          ) : (
            <div>
              <span className="icon-tile">
                <Link2Off size={20} aria-hidden />
              </span>
              <p className="eyebrow mt-6">Email preferences</p>
              <h1 className="t-h1 mt-3">
                This link is not working
              </h1>
              <p className="t-body mt-4">
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
