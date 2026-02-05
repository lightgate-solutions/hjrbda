"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, Wallet, History } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface FinanceSidebarProps {
  isCollapsed: boolean;
}

export function FinanceSidebar({ isCollapsed }: FinanceSidebarProps) {
  const pathname = usePathname();

  const links = [
    {
      title: "Overview",
      icon: LayoutDashboard,
      href: "/finance",
      exact: true,
    },
    {
      title: "Expenses",
      icon: Receipt,
      href: "/finance/expenses",
    },
    {
      title: "Payruns",
      icon: Wallet,
      href: "/finance/payruns",
    },
    {
      title: "Balance History",
      icon: History,
      href: "/finance/balance/history",
    },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <div
        data-collapsed={isCollapsed}
        className="group flex flex-col gap-4 py-2 data-[collapsed=true]:py-2"
      >
        <div className="px-2">
          {/* Placeholder for potential top action like "New Transaction" if needed later */}
        </div>
        <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
          {links.map((link, _index) => {
            const isActive = link.exact
              ? pathname === link.href
              : pathname?.startsWith(link.href);

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
              </Link>
            );
          })}
        </nav>
      </div>
    </TooltipProvider>
  );
}
