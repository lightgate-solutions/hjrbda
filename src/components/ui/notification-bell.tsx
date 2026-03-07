"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { NotificationCountBadge } from "./notification-count-badge";

interface NotificationBellProps {
  employeeId: number;
}

export default function NotificationBell({
  employeeId,
}: NotificationBellProps) {
  const rawUnread = useQuery(api.notifications.getUnreadCount, {
    userId: employeeId,
  });
  const count = typeof rawUnread === "number" ? rawUnread : 0;

  return (
    <Link href="/notification">
      <div className="relative inline-flex cursor-pointer transition-colors hover:text-primary">
        <Bell className="h-5 w-5" />
        <NotificationCountBadge count={count} />
      </div>
    </Link>
  );
}
