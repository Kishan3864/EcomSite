import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  CUSTOMER_COOKIE,
  adminToken,
  customerToken,
} from "@/lib/auth/session";

/**
 * Edge route guard.
 *
 * Only checks that a signed, unexpired cookie is present — the page itself
 * still does the database lookup (is the user active? was the token revoked?)
 * through `requireAdmin` / `requireCustomer`. This keeps unauthenticated
 * traffic from ever rendering a protected route while avoiding a DB round-trip
 * on every request at the edge.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const isLogin = pathname === "/admin/login";
    const claims = await adminToken.verify(request.cookies.get(ADMIN_COOKIE)?.value);

    if (!claims && !isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
    if (claims && isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/account")) {
    const claims = await customerToken.verify(request.cookies.get(CUSTOMER_COOKIE)?.value);
    if (!claims) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
