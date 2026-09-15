import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { PageTransition } from "@/components/layout/page-transition";
import { StoreProvider } from "@/store/store";
import { ToastProvider } from "@/components/ui/toast";
import { getStorefrontConfig } from "@/services/storefront-config";
import { GoogleOneTap } from "@/components/auth/google-identity";
import { configuredProvider } from "@/lib/auth/oauth";

/**
 * Everything that wraps a storefront page: providers, header, footer, mobile
 * nav and the cart drawer. Used by the `(store)` route group and by the root
 * 404, so the admin panel can opt out of all of it.
 *
 * Delivery, payment and tax settings are read here — once, without touching
 * cookies — so every page keeps its static render while still reflecting what
 * the owner last saved in the admin panel.
 */
export async function StoreChrome({ children }: { children: React.ReactNode }) {
  const config = await getStorefrontConfig();

  return (
    <StoreProvider config={config}>
      <ToastProvider>
        <div className="flex min-h-dvh flex-col">
          <Header />
          {/* The bottom nav reserves its own height after the footer, so this is
              only the breathing room between the page and the footer. */}
          {/* `overflow-x-clip`, not `hidden`. A full-bleed band that reaches
              past the gutter — the product gallery's snap track on a phone is
              the one that bites — can put the whole document into a horizontal
              scroll from a couple of stray pixels, and chasing each one is
              endless. `clip` trims the bleed without creating a scroll
              container, so the sticky header and the listing toolbar keep
              working; `hidden` would break both. */}
          <main id="main" className="flex-1 overflow-x-clip pb-8 lg:pb-0">
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer />
          {/* Inside the column, after the footer: the nav keeps its own height
              free at the foot of the page so the footer's last row clears it. */}
          <BottomNav />
        </div>
        <CartDrawer />
        {/* Only when Google sign-in is configured, so an unconfigured store never
            loads Google's script or makes a request that is bound to fail. */}
        {configuredProvider("google") ? <GoogleOneTap /> : null}
      </ToastProvider>
    </StoreProvider>
  );
}
