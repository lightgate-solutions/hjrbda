"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, Send, Archive, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface MailNavProps {
  stats: {
    unreadCount: number;
    inboxCount: number;
    archivedCount: number;
    sentCount: number;
    trashCount: number;
  };
  onCompose?: () => void;
}

export function MailNav({ stats, onCompose }: MailNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/mail/inbox",
      label: "Inbox",
      icon: Inbox,
      badge: stats.unreadCount,
      total: stats.inboxCount,
    },
    {
      href: "/mail/sent",
      label: "Sent",
      icon: Send,
      badge: stats.sentCount,
    },
    {
      href: "/mail/archive",
      label: "Archive",
      icon: Archive,
      badge: stats.archivedCount,
    },
    {
      href: "/mail/trash",
      label: "Trash",
      icon: Trash2,
      badge: stats.trashCount,
    },
  ];

  const isActive = (href: string) => {
    return pathname?.startsWith(href);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mail</h2>
        </div>

        <Button onClick={onCompose} className="w-full gap-2">
          <Pencil className="h-4 w-4" />
          Compose
        </Button>

        <Separator />

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge > 0 && (
                  <Badge
                    variant={active ? "secondary" : "outline"}
                    className="h-5 min-w-[20px] flex items-center justify-center px-1.5 text-xs"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {stats.unreadCount > 0 && (
        <div className="mt-auto p-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md">
            <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Unread Messages
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.unreadCount}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
