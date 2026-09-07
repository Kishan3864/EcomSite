import Link from "next/link";
import { Breadcrumbs, type Crumb } from "@/components/ui/primitives";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { formatDate } from "@/lib/utils";

export interface PolicySection {
  id: string;
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: { head: string[]; rows: string[][] };
}

/**
 * Shared layout for policy and information pages: sticky contents rail on the
 * left, readable measure on the right.
 */
export function ProsePage({
  eyebrow,
  title,
  intro,
  updatedAt,
  crumbs,
  sections,
  footerNote,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updatedAt: string;
  crumbs: Crumb[];
  sections: PolicySection[];
  footerNote?: React.ReactNode;
}) {
  return (
    <div className="container-page py-5 sm:py-7">
      <BreadcrumbJsonLd items={crumbs} />
      <Breadcrumbs items={crumbs} className="mb-6" />

      <header className="mb-10 max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
          {eyebrow}
        </p>
        <h1 className="mt-2.5 font-display text-[32px] leading-[1.06] tracking-[-0.03em] text-ink-950 sm:text-[42px]">
          {title}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-600">{intro}</p>
        <p className="mt-4 text-[12.5px] text-ink-400">
          Last updated {formatDate(updatedAt)} · Questions?{" "}
          <Link href="/contact" className="font-medium text-brand-700 hover:underline">
            Talk to a human
          </Link>
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="On this page" className="lg:sticky lg:top-[132px] lg:h-fit">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            On this page
          </p>
          <ul className="space-y-1 border-l border-hairline">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-[13px] text-ink-600 transition-colors hover:border-brand-500 hover:text-brand-700"
                >
                  {section.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="max-w-2xl space-y-10">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-32">
              <h2 className="font-display text-[22px] leading-tight tracking-[-0.02em] text-ink-950 sm:text-[26px]">
                {section.heading}
              </h2>

              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-3.5 text-[14.5px] leading-[1.75] text-ink-600">
                  {paragraph}
                </p>
              ))}

              {section.bullets && (
                <ul className="mt-4 space-y-2.5">
                  {section.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="relative pl-5 text-[14.5px] leading-[1.7] text-ink-600 before:absolute before:left-0 before:top-[0.7em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-brand-500"
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}

              {section.table && (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[420px] border-collapse text-[13.5px]">
                    <thead>
                      <tr className="border-b border-ink-200">
                        {section.table.head.map((cell) => (
                          <th
                            key={cell}
                            className="py-2.5 pr-4 text-left text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500"
                          >
                            {cell}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.rows.map((row) => (
                        <tr key={row.join()} className="border-b border-hairline last:border-b-0">
                          {row.map((cell, i) => (
                            <td
                              key={cell + i}
                              className={
                                i === 0
                                  ? "py-3 pr-4 font-medium text-ink-900"
                                  : "py-3 pr-4 text-ink-600"
                              }
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}

          {footerNote && (
            <div className="rounded-xl border border-hairline bg-surface p-5 text-[13.5px] leading-relaxed text-ink-600">
              {footerNote}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
