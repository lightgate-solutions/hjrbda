"use client";

import { useEffect, useState } from "react";

interface NotificationCountBadgeProps {
  count: number;
  className?: string;
}

/**
 * Renders the unread count badge only after mount to avoid hydration mismatch
 * (server has no Convex data; client may have count > 0).
 */
export function NotificationCountBadge({
  count,
  className,
}: NotificationCountBadgeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || count <= 0) return null;

  return (
    <span
      className={
        className ??
        "absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-background"
      }
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
