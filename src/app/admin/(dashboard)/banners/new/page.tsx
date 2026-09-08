import { requireAdmin } from "@/lib/auth/admin";
import { PageHeader } from "@/components/admin/ui";
import { createBanner } from "@/services/admin/banners-actions";
import type { BannerPlacement } from "@/generated/prisma/client";
import { BannerForm } from "../banner-form";
import { PLACEMENTS } from "../lib";

export const metadata = { title: "New banner" };

export default async function NewBannerPage({
  searchParams,
}: {
  searchParams: Promise<{ placement?: string }>;
}) {
  await requireAdmin("MANAGER");
  const { placement } = await searchParams;
  const preset = PLACEMENTS.includes(placement as BannerPlacement)
    ? (placement as BannerPlacement)
    : undefined;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="New banner"
        description="Pick where it goes, write the copy and point it at a storefront page."
        back={{ href: "/admin/banners", label: "Banners" }}
      />
      <BannerForm
        action={createBanner}
        initial={preset ? { placement: preset } : undefined}
        submitLabel="Create banner"
      />
    </div>
  );
}
