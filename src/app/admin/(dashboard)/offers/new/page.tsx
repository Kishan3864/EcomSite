import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { PageHeader } from "@/components/admin/ui";
import { createOffer } from "@/services/admin/offers-actions";
import { OfferForm } from "../offer-form";

export default async function NewOfferPage() {
  await requireAdmin("MANAGER");
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="New offer"
        description="Create a coupon code or bank offer. It goes live on the storefront the moment it is active and inside its dates."
        back={{ href: "/admin/offers", label: "Coupons & offers" }}
      />
      <OfferForm action={createOffer} categories={categories} submitLabel="Create offer" />
    </div>
  );
}
