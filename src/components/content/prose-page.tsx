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

// The contents list has two shapes. Below lg it is a row of square hairline
// chips — swipeable on phones, wrapped on tablets — so fifteen headings cost
// one line instead of a screenful. From lg it becomes what it really is: a
// ruled index, numbered in tabular figures, each entry sitting on its own
// rule down the left column.
//
// ORDER MATTERS IN THIS STRING. Every hover colour set without a breakpoint
// has to be restated as `lg:hover:` — lg: utilities sort after hover: ones and
// would otherwise cancel the hover state the chips set. That is why the border
// and text colours appear twice; it is not a duplication to tidy away.
const TOC_LINK =
  "tap flex h-10 items-center gap-2.5 whitespace-nowrap rounded-full border bg-surface px-3.5 text-[13px] font-medium text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700 " +
  "lg:h-auto lg:items-baseline lg:whitespace-normal lg:rounded-lg lg:border-0 lg:bg-transparent lg:px-3 lg:py-2 lg:font-normal lg:text-ink-600 lg:hover:bg-ink-50 lg:hover:text-brand-700";

/**
 * Shared layout for the policy pages and /services: a ruled index on the left,
 * the document itself on the right.
 *
 * This is the longest reading on the site and the writing in it is the best
 * the shop has, so it is set as a document rather than as a page of marketing:
 * one measure of about 68 characters — wider than the 46 a headline or a
 * product blurb wants, because a policy is read in paragraphs — a rule above
 * every heading, and no box around anything.
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

      <header className="mb-7 pb-6 sm:mb-10 sm:pb-8">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="mt-3 max-w-[22ch] font-display text-[26px] leading-[1.06] tracking-[-0.03em] text-ink-950 sm:mt-4 sm:text-[42px]">
          {title}
        </h1>
        <p className="mt-4 max-w-[62ch] text-[14px] leading-[1.6] text-ink-600 sm:text-[15px]">
          {intro}
        </p>
        <p className="mt-4 text-[13px] text-ink-500">
          Last updated {formatDate(updatedAt)} · Questions?{" "}
          <Link href="/contact" className="font-medium text-brand-700 hover:underline">
            Talk to a human
          </Link>
        </p>
      </header>

      {/* min-w-0 on both columns: a table's min-content would otherwise size
          the single phone column and push the page sideways. */}
      <div className="grid gap-7 sm:gap-9 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="On this page" className="min-w-0 lg:sticky lg:top-[132px] lg:h-fit">
          <p className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500 lg:mb-3">
            On this page
          </p>
          <ul className="rail -mx-3 gap-2 px-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 lg:block">
            {sections.map((section, i) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className={TOC_LINK}>
                  <span
                    aria-hidden
                    className="hidden shrink-0 text-[11px] font-semibold tabular-nums text-ink-400 lg:block"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {section.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-4 sm:space-y-5">
          {sections.map((section) => (
            // The phone header is far shorter than the desktop one, so the
            // anchor offset is too.
            <section
              key={section.id}
              id={section.id}
              className="card scroll-mt-20 p-5 sm:p-8 lg:scroll-mt-32"
            >
              <h2 className="max-w-[34ch] font-display text-[20px] leading-[1.15] tracking-[-0.02em] text-ink-950 sm:text-[26px]">
                {section.heading}
              </h2>

              {section.paragraphs?.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-3 max-w-[68ch] text-[14px] leading-[1.75] text-ink-600 sm:mt-4 sm:text-[15px]"
                >
                  {paragraph}
                </p>
              ))}

              {section.bullets && (
                // A short rule for a bullet rather than a coloured dot: the
                // same hairline the rest of the page is built from, set at the
                // cap height of the first line.
                <ul className="mt-4 max-w-[68ch] space-y-2.5 sm:mt-5">
                  {section.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="relative pl-6 text-[14px] leading-[1.7] text-ink-600 before:absolute before:left-0 before:top-[0.8em] before:h-px before:w-3.5 before:bg-ink-400 sm:text-[15px]"
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
                <div className="mt-5 overflow-x-auto sm:mt-6">
                  <table className="w-full border-collapse text-[13.5px] tabular-nums sm:min-w-[420px] sm:text-[14px]">
                    <thead>
                      <tr>
                        {section.table.head.map((cell) => (
                          <th
                            key={cell}
                            className="py-2.5 pr-3 text-left align-bottom text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500 sm:pr-4 sm:align-middle"
                          >
                            {cell}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.rows.map((row) => (
                        <tr key={row.join()}>
                          {row.map((cell, i) => (
                            <td
                              key={cell + i}
                              // Top-aligned on phones, where cells wrap to
                              // uneven heights and centring reads as drift.
                              className={
                                i === 0
                                  ? "py-3 pr-3 align-top font-medium text-ink-900 sm:pr-4 sm:align-middle"
                                  : "py-3 pr-3 align-top text-ink-600 sm:pr-4 sm:align-middle"
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
            <div className="max-w-[68ch] break-words card p-4 text-[13.5px] leading-[1.7] text-ink-600 sm:p-5">
              {footerNote}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
