"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useVisibleUnreadNotificationCount } from "@/hooks/use-visible-unread-notification-count";
import { NotificationCountBadge } from "./notification-count-badge";

interface NotificationBellProps {
  employeeId: number;
}

export default function NotificationBell({
  employeeId,
}: NotificationBellProps) {
  const count = useVisibleUnreadNotificationCount(employeeId);

  return (
    <Link href="/notification">
      <div className="relative inline-flex cursor-pointer transition-colors hover:text-primary">
        <Bell className="h-5 w-5" />
        <NotificationCountBadge count={count} />
      </div>
    </Link>
  );
}
