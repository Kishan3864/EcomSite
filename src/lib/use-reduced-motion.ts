"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

/**
 * The server cannot know the preference, so hydration must assume `false` and
 * correct itself on the next render.
 *
 * Motion's own `useReducedMotion` reads the media query during the first client
 * render, which produces markup that does not match the server for anyone who
 * has reduced motion enabled. `useSyncExternalStore` is built for exactly this:
 * React uses the server snapshot while hydrating, then re-renders with the real
 * value.
 */
function getServerSnapshot() {
  return false;
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
