"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A string remembered in this browser, as React state.
 *
 * `useSyncExternalStore` rather than an effect that reads storage and sets
 * state: the server render and the first client render both get `fallback`, so
 * they agree, and the stored value arrives on the next pass without a cascade.
 * Every component using the same key stays in step, in this tab through the
 * event below and across tabs through the browser's own `storage` event.
 *
 * A browser that refuses storage still works; it just forgets.
 */
const CHANGED = "weekendcart:stored";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

export function useStored(key: string, fallback: string): [string, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(key) ?? fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );
  const set = useCallback(
    (next: string) => {
      try {
        window.localStorage.setItem(key, next);
      } catch {}
      window.dispatchEvent(new Event(CHANGED));
    },
    [key],
  );
  return [value, set];
}
