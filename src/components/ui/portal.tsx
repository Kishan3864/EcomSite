"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

/**
 * Nothing to subscribe to: the only transition is server render to hydrated,
 * which React drives itself. Same idea as `usePrefersReducedMotion` — hydrate
 * against the server snapshot, then re-render with the real one.
 */
function subscribe() {
  return () => {};
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/**
 * Renders children at the end of <body>.
 *
 * Storefront pages sit inside the route transition, and its transform makes it
 * the containing block for every `position: fixed` descendant as well as a new
 * stacking context. An overlay rendered in place is therefore trapped: it
 * covers the page rather than the viewport, and no z-index can lift it above
 * the sticky header. Leaving the tree is the only reliable way out.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return mounted ? createPortal(children, document.body) : null;
}
