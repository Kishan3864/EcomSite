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

// Below lg the contents list is a row of chips — swipeable on phones, wrapped
// on tablets — so fifteen headings cost one line instead of a screenful. From
// lg it is the sidebar list with a rule down its left edge. The hover colours
// are repeated under lg: because lg: utilities sort after hover: ones and would
// otherwise cancel the sidebar's hover state.
const TOC_LINK =
  "tap flex h-10 items-center whitespace-nowrap rounded-md border border-ink-200 bg-surface px-3.5 text-[12.5px] font-medium text-ink-700 transition-colors hover:border-brand-500 hover:text-brand-700 " +
  "lg:-ml-px lg:block lg:h-auto lg:whitespace-normal lg:rounded-none lg:border-0 lg:border-l-2 lg:border-transparent lg:bg-transparent lg:py-1.5 lg:pl-4 lg:pr-0 lg:text-[13px] lg:font-normal lg:text-ink-600 lg:hover:border-brand-500 lg:hover:text-brand-700";

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
      <Breadcrumbs items={crumbs} className="mb-4 sm:mb-6" />

      <header className="mb-6 max-w-3xl sm:mb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-display text-[22px] leading-[1.1] tracking-[-0.03em] text-ink-950 sm:mt-2.5 sm:text-[42px] sm:leading-[1.06]">
          {title}
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-600 sm:mt-4 sm:text-[15px]">
          {intro}
        </p>
        <p className="mt-3 text-[12px] text-ink-400 sm:mt-4 sm:text-[12.5px]">
          Last updated {formatDate(updatedAt)} · Questions?{" "}
          <Link href="/contact" className="font-medium text-brand-700 hover:underline">
            Talk to a human
          </Link>
        </p>
      </header>

      {/* min-w-0 on both columns: a table's min-content would otherwise size
          the single phone column and push the page sideways. */}
      <div className="grid gap-6 sm:gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="On this page" className="min-w-0 lg:sticky lg:top-[132px] lg:h-fit">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 lg:mb-3">
            On this page
          </p>
          <ul className="rail -mx-3 gap-2 px-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 lg:block lg:space-y-1 lg:border-l lg:border-hairline">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className={TOC_LINK}>
                  {section.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 max-w-2xl space-y-7 sm:space-y-10">
          {sections.map((section) => (
            // The phone header is far shorter than the desktop one, so the
            // anchor offset is too.
            <section key={section.id} id={section.id} className="scroll-mt-20 lg:scroll-mt-32">
              <h2 className="font-display text-[18px] leading-tight tracking-[-0.02em] text-ink-950 sm:text-[26px]">
                {section.heading}
              </h2>

              {section.paragraphs?.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-2.5 text-[14px] leading-[1.75] text-ink-600 sm:mt-3.5 sm:text-[14.5px]"
                >
                  {paragraph}
                </p>
              ))}

              {section.bullets && (
                <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5">
                  {section.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="relative pl-4 text-[14px] leading-[1.7] text-ink-600 before:absolute before:left-0 before:top-[0.7em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-brand-500 sm:pl-5 sm:text-[14.5px]"
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}

              {section.table && (
                // Two- and three-column tables fit a phone once the cells
                // tighten, so the 420px floor only applies from sm; the
                // scroller stays as a guard.
                <div className="mt-4 overflow-x-auto sm:mt-5">
                  <table className="w-full border-collapse text-[13px] sm:min-w-[420px] sm:text-[13.5px]">
                    <thead>
                      <tr className="border-b border-ink-200">
                        {section.table.head.map((cell) => (
                          <th
                            key={cell}
                            className="py-2 pr-3 text-left align-bottom text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500 sm:py-2.5 sm:pr-4 sm:align-middle"
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
                              // Top-aligned on phones, where cells wrap to
                              // uneven heights and centring reads as drift.
                              className={
                                i === 0
                                  ? "py-2.5 pr-3 align-top font-medium text-ink-900 sm:py-3 sm:pr-4 sm:align-middle"
                                  : "py-2.5 pr-3 align-top text-ink-600 sm:py-3 sm:pr-4 sm:align-middle"
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
            <div className="break-words rounded-xl border border-hairline bg-surface p-4 text-[13px] leading-relaxed text-ink-600 sm:p-5 sm:text-[13.5px]">
              {footerNote}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
