import { Breadcrumbs } from "@/components/ui/primitives";
import { AccountNav } from "@/components/account/account-nav";
import { requireCustomer } from "@/lib/auth/customer";
import { getCustomerOrders, getCustomerProfile } from "@/services/orders";

/**
 * One gate for the whole account section: anyone who is not signed in is sent
 * to the login page and brought back here afterwards.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireCustomer("/account");
  const [profile, orders] = await Promise.all([getCustomerProfile(), getCustomerOrders()]);

  return (
    <div className="container-page py-3 sm:py-7">
      {/* Phones skip the trail: the account tabs already say where you are. */}
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "My account", href: "/account" },
        ]}
        className="mb-5 hidden sm:block"
      />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
        {/* min-w-0 so the sideways tab row scrolls instead of widening the page. */}
        <aside className="min-w-0 lg:sticky lg:top-[132px] lg:h-fit">
          <AccountNav profile={profile} orderCount={orders.length} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
