"use client";

import { useEffect, useState } from "react";

/**
 * Returns true only after the component has mounted on the client.
 * Use to defer Radix Select (and similar) until after mount to avoid
 * server/client aria-controls ID hydration mismatch.
 */
export function useSelectMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
