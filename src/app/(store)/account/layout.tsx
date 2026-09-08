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
    <div className="container-page py-5 sm:py-7">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "My account", href: "/account" },
        ]}
        className="mb-5"
      />

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
        <aside className="lg:sticky lg:top-[132px] lg:h-fit">
          <AccountNav profile={profile} orderCount={orders.length} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
