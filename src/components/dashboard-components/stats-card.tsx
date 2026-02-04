"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: LucideIcon;
  className?: string;
  href?: string;
  accentColor?: "blue" | "mint" | "lavender" | "beige" | "gray";
}

export default function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  className,
  href,
  accentColor = "gray",
}: StatsCardProps) {
  const isPositive = change?.startsWith("+");
  const isNegative = change?.startsWith("-");

  const accentColors = {
    blue: "bg-[#F3F6FC] dark:bg-gray-900/50 border-blue-100 dark:border-gray-800",
    mint: "bg-[#F0F9F4] dark:bg-gray-900/50 border-emerald-100 dark:border-gray-800",
    lavender:
      "bg-[#FAF9FF] dark:bg-gray-900/50 border-purple-100 dark:border-gray-800",
    beige:
      "bg-[#FDFCFB] dark:bg-gray-900/50 border-amber-100 dark:border-gray-800",
    gray: "bg-[#F8FAFB] dark:bg-gray-900/50 border-gray-200 dark:border-gray-800",
  };

  const iconColors = {
    blue: {
      bg: "bg-[#E0F2FE] dark:bg-blue-950/50",
      icon: "text-[#0284C7] dark:text-blue-400",
    },
    mint: {
      bg: "bg-[#ECFDF5] dark:bg-emerald-950/50",
      icon: "text-[#10B981] dark:text-emerald-400",
    },
    lavender: {
      bg: "bg-[#F3E8FF] dark:bg-purple-950/50",
      icon: "text-[#9333EA] dark:text-purple-400",
    },
    beige: {
      bg: "bg-[#FEF3C7] dark:bg-amber-950/50",
      icon: "text-[#F59E0B] dark:text-amber-400",
    },
    gray: {
      bg: "bg-[#F3F4F6] dark:bg-gray-800/60",
      icon: "text-[#374151] dark:text-gray-300",
    },
  };

  const cardContent = (
    <Card
      className={cn(
        "border rounded-xl transition-all hover:shadow-lg",
        accentColors[accentColor],
        href && "cursor-pointer",
        className,
      )}
    >
      <CardContent className="p-6 max-h-20">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-600 dark:text-gray-400">
              {title}
            </p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
              {change && (
                <span
                  className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-md",
                    isPositive &&
                      "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50",
                    isNegative &&
                      "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50",
                    !isPositive &&
                      !isNegative &&
                      "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800",
                  )}
                >
                  {change}
                </span>
              )}
            </div>
          </div>
          <div
            className={`rounded-lg ${iconColors[accentColor].bg} p-2.5 shrink-0`}
          >
            <Icon className={`h-5 w-5 ${iconColors[accentColor].icon}`} />
          </div>
        </div>
      </CardContent>
      {href && (
        <Link
          href={href}
          className="absolute inset-0 z-10"
          aria-label={`View ${title}`}
          tabIndex={-1}
        />
      )}
    </Card>
  );

  if (href) {
    return <div className="relative">{cardContent}</div>;
  }

  return cardContent;
}
