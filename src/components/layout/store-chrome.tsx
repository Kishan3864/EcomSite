import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { PageTransition } from "@/components/layout/page-transition";
import { StoreProvider } from "@/store/store";
import { ToastProvider } from "@/components/ui/toast";

/**
 * Everything that wraps a storefront page: providers, header, footer, mobile
 * nav and the cart drawer. Used by the `(store)` route group and by the root
 * 404, so the admin panel can opt out of all of it.
 */
export function StoreChrome({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <ToastProvider>
        <div className="flex min-h-dvh flex-col">
          <Header />
          <main id="main" className="flex-1 pb-16 lg:pb-0">
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer />
        </div>
        <BottomNav />
        <CartDrawer />
      </ToastProvider>
    </StoreProvider>
  );
}
