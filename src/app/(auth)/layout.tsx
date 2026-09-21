/**
 * Sign-in, registration and password help sit outside the `(store)` group on
 * purpose: a customer part-way through signing in has one job, and the
 * marquee, header, bottom nav and cart drawer only get in the way. Nothing
 * here needs `StoreProvider` either — the forms talk to server actions.
 *
 * The ground stays `canvas`, deliberately. Google renders its own button into
 * an iframe it controls, and the sign-in row around it is matched to this
 * colour; repainting the page under the one thing on this site that must never
 * break buys a slightly crisper input and risks the whole way in.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-storefront className="min-h-dvh bg-canvas">
      {children}
    </div>
  );
}
