"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface NotificationBellProps {
  employeeId: number;
}

export default function NotificationBell({
  employeeId,
}: NotificationBellProps) {
  const unreadCount = useQuery(api.notifications.getUnreadCount, {
    userId: employeeId,
  });

  return (
    <Link href="/notification">
      <div className="relative cursor-pointer hover:text-primary transition-colors">
        <Bell className="h-5 w-5" />
        {(unreadCount ?? 0) > 0 && (
          <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
        )}
      </div>
    </Link>
  );
}
