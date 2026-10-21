import { requireAdmin } from "@/lib/auth/admin";
import { getDomainSale, offerPickerBounds } from "@/lib/domain-sale";
import { toIstInput } from "@/lib/maintenance";
import { FormSection, VisibilityPill } from "@/components/admin/ui";
import { DomainSaleForm } from "@/components/admin/domain-sale-form";

export const metadata = { title: "Domain sale" };

export default async function DomainSaleSettingsPage() {
  await requireAdmin("OWNER");
  const state = await getDomainSale();

  return (
    <div className="max-w-3xl">
      <FormSection
        title="Domain for sale"
        description="On, the whole website becomes one page: the domain is for sale, your offer with a countdown, and WhatsApp buttons. Every address shows it, for every visitor — you included. Only this admin stays open, so you can switch it back off here."
      >
        <p className="flex items-center gap-2 text-[13px] text-ink-700">
          The website is
          <VisibilityPill own={state.on ? "hidden" : "active"} label={state.on ? "Showing the sale page" : "The normal shop"} />
        </p>
        <DomainSaleForm
          view={{
            on: state.on,
            offerPrice: state.offerPrice,
            regularPrice: state.regularPrice,
            offerEndsInput: state.offerEndsAt ? toIstInput(new Date(state.offerEndsAt)) : "",
            ...offerPickerBounds(),
            whatsapp: state.whatsapp,
            pitch: state.pitch,
            highlights: state.highlights,
          }}
        />
      </FormSection>
    </div>
  );
}
