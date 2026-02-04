"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, Send, Archive, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface MailSidebarProps {
  stats: {
    unreadCount: number;
    inboxCount: number;
    archivedCount: number;
    sentCount: number;
    trashCount: number;
  };
  onCompose: () => void;
  isCollapsed: boolean;
}

export function MailSidebar({
  stats,
  onCompose,
  isCollapsed,
}: MailSidebarProps) {
  const pathname = usePathname();

  const links = [
    {
      title: "Inbox",
      label: stats.unreadCount > 0 ? stats.unreadCount.toString() : "",
      icon: Inbox,
      variant: "default",
      href: "/mail/inbox",
      count: stats.inboxCount,
    },
    {
      title: "Sent",
      label: "",
      icon: Send,
      variant: "ghost",
      href: "/mail/sent",
      count: stats.sentCount,
    },
    {
      title: "Archive",
      label: "",
      icon: Archive,
      variant: "ghost",
      href: "/mail/archive",
      count: stats.archivedCount,
    },
    {
      title: "Trash",
      label: "",
      icon: Trash2,
      variant: "ghost",
      href: "/mail/trash",
      count: stats.trashCount,
    },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <div
        data-collapsed={isCollapsed}
        className="group flex flex-col gap-4 py-2 data-[collapsed=true]:py-2"
      >
        <div className="px-2">
          <Button
            onClick={onCompose}
            className={cn(
              "w-full justify-start gap-2 h-10 shadow-sm",
              isCollapsed && "h-9 w-9 p-0 justify-center",
            )}
            size={isCollapsed ? "icon" : "lg"}
            title={isCollapsed ? "Compose" : undefined}
          >
            <Plus className="h-4 w-4" />
            {!isCollapsed && "Compose"}
          </Button>
        </div>
        <Separator />
        <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
          {links.map((link, _index) => {
            const isActive =
              pathname === link.href ||
              (link.href === "/mail/inbox" && pathname === "/mail");

            if (isCollapsed) {
              return (
                <Tooltip key={link.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={link.href}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                        isActive &&
                          "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary",
                      )}
                    >
                      <link.icon className="h-4 w-4" />
                      <span className="sr-only">{link.title}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="flex items-center gap-4"
                  >
                    {link.title}
                    {link.label && (
                      <span className="ml-auto text-muted-foreground">
                        {link.label}
                      </span>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center justify-between whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                  isActive
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "hover:bg-muted hover:text-accent-foreground",
                )}
              >
                <div className="flex items-center gap-3">
                  <link.icon className="h-4 w-4" />
                  <span>{link.title}</span>
                </div>
                {link.label && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {link.label}
                  </span>
                )}
                {!link.label && link.count > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {link.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </TooltipProvider>
  );
}
