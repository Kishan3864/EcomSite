/**
 * Sign-in, registration and password help sit outside the `(store)` group on
 * purpose: a customer part-way through signing in has one job, and the
 * marquee, header, bottom nav and cart drawer only get in the way. Nothing
 * here needs `StoreProvider` either — the forms talk to server actions.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-canvas">{children}</div>;
}
