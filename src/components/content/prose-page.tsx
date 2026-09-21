import Link from "next/link";
import { ArrowRight, CalendarClock, List, MessageCircle, type LucideIcon } from "lucide-react";
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

export interface RelatedLink {
  href: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
}

/**
 * Shared layout for the policy pages: a sticky contents list on desktop, the
 * document in one readable card (~68ch measure), then related pages.
 */
export function ProsePage({
  eyebrow,
  title,
  intro,
  updatedAt,
  crumbs,
  sections,
  footerNote,
  related,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updatedAt: string;
  crumbs: Crumb[];
  sections: PolicySection[];
  footerNote?: React.ReactNode;
  related?: RelatedLink[];
}) {
  return (
    <div className="container-page pb-10 pt-5 sm:pb-16 sm:pt-7">
      <BreadcrumbJsonLd items={crumbs} />
      <Breadcrumbs items={crumbs} className="mb-4" />

      <header className="aurora relative mb-6 overflow-hidden rounded-3xl px-5 py-7 sm:mb-8 sm:px-10 sm:py-10">
        <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="t-h1 mt-3 max-w-[24ch]">{title}</h1>
          <p className="t-body mt-3 max-w-[64ch] text-ink-700">{intro}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface/80 px-3 text-[12.5px] text-ink-700 ring-1 ring-inset ring-line">
              <CalendarClock size={14} aria-hidden className="text-brand-700" />
              Last updated{" "}
              <time dateTime={updatedAt} className="font-semibold tabular-nums text-ink-900">
                {formatDate(updatedAt)}
              </time>
            </span>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface/80 px-3 text-[12.5px] tabular-nums text-ink-700 ring-1 ring-inset ring-line">
              <List size={14} aria-hidden className="text-brand-700" />
              {sections.length} sections
            </span>
            <Link
              href="/contact"
              className="tap inline-flex h-8 items-center gap-1.5 rounded-full bg-surface/80 px-3 text-[12.5px] font-semibold text-brand-700 ring-1 ring-inset ring-line transition-colors hover:bg-surface"
            >
              <MessageCircle size={14} aria-hidden />
              Questions? Talk to a human
            </Link>
          </div>
        </div>
      </header>

      {/* min-w-0 on both columns: a table's min-content would otherwise size
          the single phone column and push the page sideways. */}
      <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8">
        <nav aria-label="On this page" className="min-w-0">
          {/* Phones and tablets: one swipeable row of chips */}
          <div className="lg:hidden">
            <p className="t-label mb-2.5">On this page</p>
            <ul className="rail -mx-3 gap-2 px-3 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="chip tap h-9 whitespace-nowrap px-3.5 text-[12.5px] font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
                  >
                    {section.heading}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Desktop: a sticky, numbered index that scrolls on its own */}
          <div className="card sticky-under-header hidden max-h-[calc(100dvh-var(--sticky-top)-24px)] overflow-y-auto p-2 lg:block">
            <p className="t-label px-3 pb-1.5 pt-2">On this page</p>
            <ol>
              {sections.map((section, i) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="group flex items-baseline gap-2.5 rounded-md px-3 py-2 text-[13px] leading-[1.4] text-ink-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
                  >
                    <span
                      aria-hidden
                      className="shrink-0 text-[11px] font-semibold tabular-nums text-ink-400 group-hover:text-brand-600"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className="min-w-0 space-y-4 sm:space-y-5">
          <article className="card card-divided overflow-hidden">
            {sections.map((section, i) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-h`}
                className="scroll-mt-(--sticky-top) px-5 py-6 sm:px-9 sm:py-8"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 px-1.5 text-[11px] font-semibold tabular-nums text-brand-700"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 id={`${section.id}-h`} className="t-h2 max-w-[34ch] text-[18px] sm:text-[20px]">
                    {section.heading}
                  </h2>
                </div>

                <div className="sm:pl-10">
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="mt-3 max-w-[68ch] text-[14.5px] leading-[1.75] text-ink-600">
                      {paragraph}
                    </p>
                  ))}

                  {section.bullets && (
                    <ul className="mt-4 max-w-[68ch] space-y-2.5">
                      {section.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="relative pl-5 text-[14.5px] leading-[1.7] text-ink-600 before:absolute before:left-0.5 before:top-[0.7em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-brand-400"
                        >
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.table && (
                    <div className="mt-5 overflow-x-auto rounded-xl ring-1 ring-inset ring-line">
                      <table className="w-full border-collapse text-[13.5px] tabular-nums sm:min-w-[420px]">
                        <thead className="bg-ink-50">
                          <tr>
                            {section.table.head.map((cell) => (
                              <th
                                key={cell}
                                scope="col"
                                className="t-label px-3 py-2.5 text-left align-bottom sm:px-4"
                              >
                                {cell}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {section.table.rows.map((row) => (
                            <tr key={row.join()} className="border-t border-line">
                              {row.map((cell, ci) => (
                                <td
                                  key={cell + ci}
                                  className={
                                    ci === 0
                                      ? "px-3 py-3 align-top font-medium text-ink-900 sm:px-4"
                                      : "px-3 py-3 align-top text-ink-600 sm:px-4"
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
                </div>
              </section>
            ))}
          </article>

          {footerNote && (
            <div className="card-muted break-words p-4 text-[13.5px] leading-[1.7] text-ink-600 sm:p-5">
              {footerNote}
            </div>
          )}

          {related && related.length > 0 && (
            <nav aria-label="Related policies">
              <h2 className="t-label mb-3 mt-2">Related policies</h2>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {related.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="card card-interactive group flex h-full items-center gap-3.5 p-4"
                      >
                        {Icon && (
                          <span className="icon-tile icon-tile-sm">
                            <Icon size={16} aria-hidden />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="t-h3 block text-[14px]">{item.title}</span>
                          {item.description && (
                            <span className="t-small mt-0.5 line-clamp-2 block">{item.description}</span>
                          )}
                        </span>
                        <ArrowRight
                          size={16}
                          aria-hidden
                          className="shrink-0 text-ink-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-700"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
