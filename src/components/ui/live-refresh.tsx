"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps a server-rendered page current without anyone pressing reload.
 *
 * `router.refresh()` re-runs the server components and swaps in the new
 * markup, so scroll position, open menus and half-typed fields all survive —
 * a full reload would throw those away and is exactly what an owner watching
 * the orders screen does not want.
 *
 * Two rules keep it cheap. It never ticks while the tab is hidden: a phone in
 * a pocket should not be asking the server anything. And it refreshes at once
 * when the tab comes back, so the first thing seen after switching to it is
 * current rather than however old the last tick left it.
 */
export function LiveRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const start = () => {
      if (timer === null) timer = setInterval(refresh, Math.max(5, seconds) * 1000);
    };
    const stop = () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
        start();
      } else {
        stop();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, seconds]);

  return null;
}
