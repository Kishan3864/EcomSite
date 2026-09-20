import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import {
  ADMIN_COOKIE,
  CUSTOMER_COOKIE,
  DEVICE_COOKIE,
  adminToken,
  customerToken,
} from "@/lib/auth/session";
import { BUSINESS } from "@/config/business";
import { getMaintenance, maintenanceHtml, retryAfterSeconds, staysOpen } from "@/lib/maintenance";

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

  /**
   * Maintenance mode, for everything that is not the admin.
   *
   * Placed after the /admin block on purpose: the admin and its login stay
   * reachable whatever the switch says, or nobody could switch it back off. API
   * routes never reach this function at all (see the matcher), so PayU's
   * callbacks and webhooks keep landing while the shop is shut.
   *
   * 503 with Retry-After is the status that tells a search engine "come back,
   * nothing has moved" — a 200 holding page gets indexed in place of the shop,
   * and a 404 gets pages dropped. A signed-in admin is let through, so the
   * owner can look at the shop while shoppers cannot.
   *
   * `getMaintenance` answers from memory for a few seconds at a time, so this is
   * not a database query per request.
   */
  const maintenance = await getMaintenance();
  // Order tracking and the policy pages stay open through a pause — see
  // OPEN_DURING_MAINTENANCE for which and why.
  if (maintenance.on && !staysOpen(pathname)) {
    const admin = await adminToken.verify(request.cookies.get(ADMIN_COOKIE)?.value);
    if (!admin) {
      return new NextResponse(
        maintenanceHtml(maintenance, { name: BUSINESS.brandName, email: BUSINESS.supportEmail, phone: BUSINESS.supportPhone }),
        {
          status: 503,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Retry-After": String(retryAfterSeconds(maintenance)),
            "Cache-Control": "no-store",
            "X-Robots-Tag": "noindex",
          },
        },
      );
    }
    const preview = NextResponse.next();
    preview.headers.set("X-Maintenance-Preview", "1");
    preview.headers.set("Cache-Control", "no-store");
    return preview;
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

  /**
   * The contact form's device marker.
   *
   * Issued here rather than while the page renders, because a server component
   * cannot set a cookie, and rather than in the submit action, because a cookie
   * set by an action is not readable by that same action — the first message
   * would always be counted as coming from an unknown device. Setting it on the
   * way to the page means it is already in the jar by the time anything is
   * submitted.
   */
  if (pathname === "/contact" && !request.cookies.get(DEVICE_COOKIE)?.value) {
    const response = NextResponse.next();
    response.cookies.set(DEVICE_COOKIE, randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
    });
    return response;
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
