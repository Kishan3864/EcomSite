"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "@/store/store";

/**
 * Google Identity Services: the One Tap prompt ("Sign in to weekendcart.com
 * with google.com") and the personalised "Continue as …" button.
 *
 * On Chrome the prompt is drawn by the browser itself through FedCM, which is
 * why it appears in the browser's own corner rather than inside the page.
 * Google decides when to show it and when to show the personalised button —
 * after someone closes the prompt, Google holds it back for a cooling-off
 * period, and that is Google's rule, not a fault here.
 */

interface GsiId {
  initialize(config: Record<string, unknown>): void;
  prompt(): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GsiId } };
  }
}

let setup: Promise<GsiId | null> | null = null;
let prompted = false;

/** What a successful sign-in does next, set by whichever component is showing. */
let afterSignIn: () => void = () => window.location.reload();

/** Only same-site paths, so a crafted ?next= cannot bounce someone off-site. */
function safePath(next: string | undefined, fallback: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector<HTMLScriptElement>("script[data-gsi]");
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("gsi failed to load")), { once: true });
    if (!existing) {
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.dataset.gsi = "1";
      document.head.appendChild(script);
    }
  });
}

async function onCredential(response: { credential?: string }) {
  if (!response.credential) return;
  try {
    const res = await fetch("/api/auth/one-tap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ credential: response.credential }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (res.ok && data.ok) {
      afterSignIn();
      return;
    }
    // The login page already turns these codes into sentences.
    // A full load, not router.push: the session cookie just changed, and every
    // server-rendered part of the page has to read it again.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/login?error=${encodeURIComponent(data.error ?? "oauth_failed")}`);
  } catch {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login?error=oauth_failed");
  }
}

/**
 * Load GIS and initialise it once per page load. GIS warns in the console if
 * initialize() runs twice, and the prompt and the button both need it, so
 * they share this one promise.
 */
function setupGoogle(): Promise<GsiId | null> {
  if (setup) return setup;
  setup = (async () => {
    try {
      const res = await fetch("/api/auth/one-tap", { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        enabled: boolean;
        clientId?: string;
        nonce?: string;
        origin?: string;
      };
      if (!data.enabled || !data.clientId || !data.nonce) return null;

      // Google accepts only the origins registered on the OAuth client. On any
      // other host — the secondary domain, localhost — GIS would fail with a
      // console error, so it is not loaded there and the plain redirect button
      // does the job instead.
      if (window.location.origin !== data.origin) return null;

      await loadScript();
      const id = window.google?.accounts?.id;
      if (!id) return null;

      id.initialize({
        client_id: data.clientId,
        nonce: data.nonce,
        callback: onCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
        context: "signin",
        itp_support: true,
        use_fedcm_for_prompt: true,
      });
      return id;
    } catch {
      return null;
    }
  })();
  return setup;
}

/** Show the prompt once per page load. A second prompt() while one is open errors. */
function promptOnce(id: GsiId) {
  if (prompted) return;
  prompted = true;
  id.prompt();
}

/**
 * The One Tap prompt for signed-out visitors, mounted once in the store chrome.
 * Skipped on the payment processing screen, where a sign-in popup would sit on
 * top of a checkout in progress.
 */
export function GoogleOneTap() {
  const { customer, sessionChecked } = useStore();
  const pathname = usePathname();

  useEffect(() => {
    if (prompted || !sessionChecked || customer) return;
    if (pathname.startsWith("/checkout/processing")) return;
    afterSignIn = () => window.location.reload();
    setupGoogle().then((id) => {
      if (id) promptOnce(id);
    });
  }, [sessionChecked, customer, pathname]);

  return null;
}

/**
 * The One Tap prompt on the sign-in pages, which sit outside the store chrome.
 *
 * These pages show our own "Continue with Google" button rather than Google's
 * rendered one: Google draws its button inside an iframe capped at 400px wide
 * and about 40px tall, so it can never match the full-width, 48px Sign in
 * button beneath it. The personalised "Continue as <name>" experience comes
 * from this prompt instead, in the browser's corner.
 */
export function GooglePrompt({ next }: { next?: string }) {
  useEffect(() => {
    afterSignIn = () => window.location.assign(safePath(next, "/account"));
    setupGoogle().then((id) => {
      if (id) promptOnce(id);
    });
  }, [next]);

  return null;
}

/**
 * "Continue with Google", as Google's own button rather than a link to the
 * redirect flow.
 *
 * The difference is where the work happens. The redirect flow sends the
 * customer to Google and then makes *this server* call Google to redeem the
 * code, while they wait — and on this box that call succeeds or times out more
 * or less at random, which is what "sometimes it works" has meant all along.
 * Google's button hands the browser a signed ID token instead; the server only
 * checks the signature against keys it already holds, so nothing at sign-in
 * time depends on this server reaching Google at all.
 *
 * Google's button is shown as Google draws it, not as we would like it drawn.
 * The first attempt hid it behind ours at opacity 0 to keep the page looking
 * the same; Google refuses to act on a click it cannot prove the person could
 * see — a transparent or covered button is exactly how a clickjacking attack
 * is built — so the click fell through to the link underneath and started the
 * very redirect flow this was meant to replace. It looked identical and did
 * the wrong thing.
 *
 * So it is rendered plainly. Until GIS answers, our own button is shown so the
 * space is never empty; if GIS never loads at all — a blocked script, a browser
 * that refuses third-party frames — ours stays, and it is still a working link
 * to the redirect flow.
 */
export function GoogleButton({
  next,
  href,
  children,
}: {
  next?: string;
  /** The redirect flow, still there for when Google's own button cannot load. */
  href: string;
  children: ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    afterSignIn = () => window.location.assign(safePath(next, "/account"));

    setupGoogle().then((id) => {
      const parent = host.current;
      if (cancelled || !id || !parent) return;
      try {
        id.renderButton(parent, {
          type: "standard",
          // Black, square, full-width-for-this-column: as close to the store's
          // own buttons as Google's own options reach. Everything inside the
          // button is drawn by Google in its own frame, so these five options
          // are the whole of what can be asked for.
          theme: "filled_black",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          // Google caps this at 400 and ignores anything larger, which is why
          // the form column above is 400 wide — see AuthShell.
          width: Math.min(parent.clientWidth || 320, 400),
        });
      } catch {
        return; // Leave ours showing; it is still a working link.
      }

      // renderButton fills the container asynchronously, so asking straight
      // away would always find it empty and leave the fallback in place for
      // good. Watch for the iframe instead, and give up after two seconds.
      const started = Date.now();
      const poll = setInterval(() => {
        if (cancelled || !host.current) return clearInterval(poll);
        if (host.current.childElementCount > 0) {
          clearInterval(poll);
          setRendered(true);
        } else if (Date.now() - started > 2_000) {
          clearInterval(poll);
        }
      }, 100);
    });

    return () => {
      cancelled = true;
    };
  }, [next]);

  return (
    <>
      {/* Always in the document and never display:none — Google will not draw
          its button into a hidden container, and while it is empty it takes no
          height, so nothing shifts. */}
      <div ref={host} className="flex justify-center empty:hidden" />

      {/* Ours, until Google's is up — and permanently if GIS never loads. */}
      {!rendered && (
        <a
          href={href}
          // The same box Google's button will take when it arrives: 40px,
          // square, black — so the swap from one to the other does not move
          // anything on the page.
          className="tap flex h-10 w-full items-center justify-center gap-3 border border-ink-950 bg-ink-950 px-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:bg-brand-800 sm:px-6"
        >
          {children}
        </a>
      )}
    </>
  );
}
