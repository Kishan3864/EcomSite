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
    <div className="container-page pb-12 pt-4 sm:pb-16 sm:pt-6 lg:pt-8">
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[272px_minmax(0,1fr)] lg:gap-8">
        {/* min-w-0 so the chip row scrolls instead of widening the page. */}
        <aside className="no-scrollbar min-w-0 lg:sticky lg:top-[calc(var(--header-h)+16px)] lg:max-h-[calc(100dvh-var(--header-h)-32px)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:transition-[top] lg:duration-300">
          <AccountNav profile={profile} orderCount={orders.length} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
