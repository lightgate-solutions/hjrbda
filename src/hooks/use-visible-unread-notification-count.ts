"use client";

import { useQuery } from "convex/react";
import { useMemo, useEffect, useState, useRef } from "react";
import { api } from "../../convex/_generated/api";
import { getNotificationViewUrl } from "@/lib/notification-view-url";

export function useVisibleUnreadNotificationCount(employeeId: number): number {
  const notifications = useQuery(api.notifications.getUserNotifications, {
    userId: employeeId,
  });
  const list = Array.isArray(notifications) ? notifications : [];
  const [validIds, setValidIds] = useState<Set<string>>(new Set());
  // Stable dependency: only re-run when notification ids change, not when array reference changes (avoids infinite loop with Convex)
  const listKey = useMemo(
    () =>
      list
        .map((n) => n._id)
        .sort()
        .join(","),
    [list],
  );
  const prevListKeyRef = useRef<string>("");
  const listRef = useRef(list);
  listRef.current = list;

  useEffect(() => {
    if (listKey === prevListKeyRef.current) return;
    prevListKeyRef.current = listKey;

    let cancelled = false;
    const listToValidate = listRef.current;

    async function validate() {
      const ids = new Set<string>();
      for (const n of listToValidate) {
        if (cancelled) return;
        const viewUrl = getNotificationViewUrl(n);
        if (!viewUrl || n.referenceId == null) {
          ids.add(n._id);
          continue;
        }
        if (viewUrl.startsWith("/projects/")) {
          const res = await fetch(`/api/projects/${n.referenceId}`);
          if (res.ok) ids.add(n._id);
        } else if (viewUrl.includes("/mail/inbox?id=")) {
          const res = await fetch(`/api/mail/${n.referenceId}/exists`);
          if (res.ok) ids.add(n._id);
        } else {
          ids.add(n._id);
        }
      }
      if (!cancelled) setValidIds(ids);
    }

    validate();
    return () => {
      cancelled = true;
    };
  }, [listKey]);

  return useMemo(() => {
    if (validIds.size === 0 && list.some((n) => !n.isRead))
      return list.filter((n) => !n.isRead).length;
    return list.filter((n) => !n.isRead && validIds.has(n._id)).length;
  }, [list, validIds]);
}
