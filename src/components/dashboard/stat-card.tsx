"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  href?: string;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  iconColor?: string;
  iconBgColor?: string;
  emptyMessage?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  href,
  description,
  trend,
  iconColor = "text-blue-600",
  iconBgColor = "bg-blue-50 dark:bg-blue-950/30",
  emptyMessage,
  className,
}: StatCardProps) {
  const isEmpty = typeof value === "number" && value === 0;
  const displayValue = isEmpty && emptyMessage ? emptyMessage : value;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200 ease-out",
        "hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/30",
        "border border-border/40 hover:border-border bg-card",
        "hover:-translate-y-1",
        href && "cursor-pointer",
        className,
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p
                className={cn(
                  "text-2xl font-bold tracking-tight transition-colors",
                  isEmpty ? "text-foreground" : "text-foreground",
                )}
              >
                {typeof displayValue === "number" && displayValue > 0
                  ? displayValue.toLocaleString()
                  : displayValue}
              </p>
              {trend && !isEmpty && (
                <span
                  className={cn(
                    "text-xs font-semibold px-1.5 py-0.5 rounded-md",
                    trend.isPositive
                      ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30"
                      : "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30",
                  )}
                >
                  {trend.isPositive ? "+" : ""}
                  {trend.value}%
                </span>
              )}
            </div>
            {description && !isEmpty && (
              <p className="text-xs text-muted-foreground/70 line-clamp-1">
                {description}
              </p>
            )}
          </div>
          <div
            className={cn(
              "rounded-lg p-2.5 transition-all duration-200 shrink-0",
              "group-hover:scale-110",
              iconBgColor,
              isEmpty ? "opacity-30 grayscale" : "opacity-100",
            )}
          >
            <Icon className={cn("size-4 transition-colors", iconColor)} />
          </div>
        </div>
        {href && !isEmpty && (
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center text-xs font-medium text-primary/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            View all
            <svg
              className="ml-1.5 size-3 transition-transform duration-200 group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        )}
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
}
