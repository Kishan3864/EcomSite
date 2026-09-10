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

  /**
   * URL hygiene, before anything else.
   *
   * One page must have exactly one address. Without this, /Products,
   * /products/ and /products are three URLs serving identical HTML — search
   * engines split ranking between them and analytics counts them separately.
   * A 308 keeps the method and body intact, so a POST that arrives at a
   * mis-cased URL is not silently turned into a GET.
   */
  if (pathname !== pathname.toLowerCase()) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url, 308);
  }

  // Trailing slash on anything but the root.
  if (pathname.length > 1 && pathname.endsWith("/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/[/]+$/, "");
    return NextResponse.redirect(url, 308);
  }

  if (pathname.startsWith("/admin")) {
    const isLogin = pathname === "/admin/login";
    const claims = await adminToken.verify(request.cookies.get(ADMIN_COOKIE)?.value);

    if (!claims && !isLogin) {
      // Route handlers under /admin (CSV exports) serve machine clients: answer
      // with 401 JSON rather than bouncing them to the login page.
      if (pathname.endsWith("/export")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
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
  /**
   * Runs on every page request so URL normalisation is universal, but skips
   * build output, image optimisation, API routes and any path with a file
   * extension — those are never user-facing URLs and paying middleware cost on
   * each static asset would undo the speed it is meant to protect.
   */
  matcher: ["/((?!_next/static|_next/image|api/|.*[.][a-zA-Z0-9]+$).*)"],
};
