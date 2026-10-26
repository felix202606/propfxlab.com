"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

let firstClientRead: number | undefined;

/** getSnapshot must be stable between calls, so the clock is read once per page load. */
function getSnapshot(): number {
  firstClientRead ??= Date.now();
  return firstClientRead;
}

/**
 * Current time after hydration, null during SSR and the hydration pass, so
 * time-windowed content never differs between cached HTML and first render.
 */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
