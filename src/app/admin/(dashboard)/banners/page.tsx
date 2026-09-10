import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, ImageOff, Plus, Power, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmForm } from "@/components/admin/client";
import { Card, DateCell, PageHeader, Pill } from "@/components/admin/ui";
import { deleteBanner, moveBanner, toggleBannerActive } from "@/services/admin/banners-actions";
import { cn } from "@/lib/utils";
import { BANNER_STATUS, PLACEMENTS, PLACEMENT_META, bannerStatus } from "./lib";
import { Form } from "@/components/ui/form";

export const metadata = { title: "Banners" };

export default async function BannersPage() {
  const session = await requireAdmin();
  const canEdit = hasRole(session, "MANAGER");
  const now = new Date();

  const banners = await db.banner.findMany({
    orderBy: [{ placement: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const liveHeroes = banners.filter(
    (b) => b.placement === "HERO" && bannerStatus(b, now) === "live",
  ).length;

  return (
    <>
      <PageHeader
        title="Banners"
        description="The artwork on the home page: the hero carousel, the feature panels between rails, and the promo tiles."
        actions={
          canEdit && (
            <Link href="/admin/banners/new" className={buttonClasses("primary", "sm")}>
              <Plus size={15} /> New banner
            </Link>
          )
        }
      />

      {liveHeroes === 0 && (
        <div className="mb-5 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-[13px] text-gold-900">
          No hero slide is live right now, so the home page opens without its carousel. Activate one
          below or add a new hero banner.
        </div>
      )}

      <div className="space-y-6">
        {PLACEMENTS.map((placement) => {
          const rows = banners.filter((b) => b.placement === placement);
          const meta = PLACEMENT_META[placement];

          return (
            <Card
              key={placement}
              title={meta.label}
              description={meta.description}
              padded={false}
              actions={
                <span className="text-[12px] text-ink-500 tabular-nums">
                  {rows.length} banner{rows.length === 1 ? "" : "s"}
                </span>
              }
            >
              {rows.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13px] text-ink-400">
                  Nothing here yet.{" "}
                  {canEdit && (
                    <Link
                      href={`/admin/banners/new?placement=${placement}`}
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      Add the first one
                    </Link>
                  )}
                </p>
              ) : (
                <ul className="divide-y divide-hairline">
                  {rows.map((b, i) => {
                    const status = bannerStatus(b, now);
                    const tone = BANNER_STATUS[status];

                    return (
                      <li key={b.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                        <span
                          className={cn(
                            "relative shrink-0 overflow-hidden rounded-lg border border-hairline bg-ink-100",
                            placement === "PROMO_TILE" ? "h-16 w-16" : "h-16 w-28",
                          )}
                        >
                          {b.imageUrl ? (
                            // Admin preview of a merchandiser-supplied URL.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={b.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full items-center justify-center text-ink-300">
                              <ImageOff size={18} />
                            </span>
                          )}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/admin/banners/${b.id}`}
                              className="truncate text-[14px] font-semibold text-ink-950 hover:text-brand-700"
                            >
                              {b.title}
                            </Link>
                            <Pill tone={tone.tone} dot>
                              {tone.label}
                            </Pill>
                          </div>
                          <p className="mt-0.5 truncate text-[12px] text-ink-500">
                            {b.eyebrow && <span className="text-ink-400">{b.eyebrow} · </span>}
                            {b.subtitle || "No subtitle"}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11.5px] text-ink-400">
                            <span className="font-mono">{b.href}</span>
                            {placement === "MID" && <span>{b.theme} theme</span>}
                            {placement !== "PROMO_TILE" && <span>text {b.align}</span>}
                            {b.startsAt && (
                              <span>
                                from <DateCell value={b.startsAt} />
                              </span>
                            )}
                            {b.endsAt && (
                              <span>
                                until <DateCell value={b.endsAt} />
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          {canEdit && (
                            <>
                              <Form action={moveBanner}>
                                <input type="hidden" name="id" value={b.id} />
                                <input type="hidden" name="direction" value="up" />
                                <button
                                  type="submit"
                                  disabled={i === 0}
                                  title="Move up"
                                  className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900 disabled:opacity-30"
                                >
                                  <ArrowUp size={14} />
                                </button>
                              </Form>
                              <Form action={moveBanner}>
                                <input type="hidden" name="id" value={b.id} />
                                <input type="hidden" name="direction" value="down" />
                                <button
                                  type="submit"
                                  disabled={i === rows.length - 1}
                                  title="Move down"
                                  className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900 disabled:opacity-30"
                                >
                                  <ArrowDown size={14} />
                                </button>
                              </Form>
                              <Form action={toggleBannerActive}>
                                <input type="hidden" name="id" value={b.id} />
                                <button
                                  type="submit"
                                  title={b.isActive ? "Deactivate" : "Activate"}
                                  className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900"
                                >
                                  <Power size={14} />
                                </button>
                              </Form>
                            </>
                          )}
                          <Link
                            href={b.href}
                            target="_blank"
                            title="Open target page"
                            className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-brand-700"
                          >
                            <ExternalLink size={14} />
                          </Link>
                          {hasRole(session, "OWNER") && (
                            <ConfirmForm
                              action={deleteBanner}
                              message={`Delete “${b.title}”? This cannot be undone.`}
                            >
                              <input type="hidden" name="id" value={b.id} />
                              <button
                                type="submit"
                                title="Delete"
                                className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-sale-50 hover:text-sale-600"
                              >
                                <Trash2 size={14} />
                              </button>
                            </ConfirmForm>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
