import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { buttonClasses } from "@/components/ui/button";
import { DateCell, PageHeader, Pill } from "@/components/admin/ui";
import { updateBanner } from "@/services/admin/banners-actions";
import { BannerForm } from "../banner-form";
import { BANNER_STATUS, PLACEMENT_META, bannerStatus, toInputDateTime } from "../lib";

export const metadata = { title: "Edit banner" };

export default async function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { id } = await params;

  const banner = await db.banner.findUnique({ where: { id } });
  if (!banner) notFound();

  const status = bannerStatus(banner, new Date());
  const tone = BANNER_STATUS[status];
  // Bind the id so the client form only ever deals with (prevState, formData).
  const action = updateBanner.bind(null, banner.id);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={banner.title}
        back={{ href: "/admin/banners", label: "Banners" }}
        meta={
          <>
            <Pill tone={tone.tone} dot>
              {tone.label}
            </Pill>
            <span className="text-[12px] text-ink-500">
              {PLACEMENT_META[banner.placement].label} · position {banner.sortOrder}
            </span>
            <span className="text-[12px] text-ink-400">
              updated <DateCell value={banner.updatedAt} time />
            </span>
          </>
        }
        actions={
          <Link href={banner.href} target="_blank" className={buttonClasses("outline", "sm")}>
            <ExternalLink size={14} /> Open target page
          </Link>
        }
      />
      <BannerForm
        action={action}
        readOnly={!hasRole(session, "MANAGER")}
        initial={{
          placement: banner.placement,
          eyebrow: banner.eyebrow,
          title: banner.title,
          subtitle: banner.subtitle,
          cta: banner.cta,
          href: banner.href,
          imageUrl: banner.imageUrl,
          imageAlt: banner.imageAlt,
          align: banner.align,
          theme: banner.theme,
          sortOrder: banner.sortOrder,
          startsAt: toInputDateTime(banner.startsAt),
          endsAt: toInputDateTime(banner.endsAt),
          isActive: banner.isActive,
        }}
      />
    </div>
  );
}
