"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface ActivityTrend {
  date: string;
  activity: number;
}

export default function ActivityChart() {
  const [activityData, setActivityData] = useState<ActivityTrend[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial theme
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    checkTheme();

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Fetch activity trends from API
    async function fetchActivityTrends() {
      try {
        setLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch("/api/dashboard/activity-trends", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle non-ok responses
        if (!response.ok) {
          // Don't log 403 errors as they're expected for non-admin users
          // (though this component should only be visible to admins)
          if (response.status !== 403 && response.status !== 401) {
            const errorData = await response.json().catch(() => ({}));
            toast.error(
              "Error fetching activity trends:",
              errorData.error || response.statusText,
            );
          }
          setActivityData([]);
          return;
        }

        const data = await response.json();

        if (data.trends) {
          setActivityData(data.trends || []);
        } else {
          setActivityData([]);
        }
      } catch (error) {
        // Suppress network errors (common during server restarts)
        if (error instanceof Error && error.name === "AbortError") {
          // Timeout - don't log
        } else if (
          error instanceof TypeError &&
          error.message === "Failed to fetch"
        ) {
          // Network error - don't spam console
        } else {
          toast.error("Error fetching activity trends");
        }
        setActivityData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchActivityTrends();

    return () => observer.disconnect();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (activityData.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-gray-600 dark:text-gray-400">
        <div className="text-center">
          <p className="text-sm font-medium">No activity data available</p>
          <p className="text-xs mt-1">
            Activity will appear as users interact with the system
          </p>
        </div>
      </div>
    );
  }

  // Reduce data points for cleaner display - show every 3rd day
  const displayData = activityData.filter(
    (_, index) => index % 3 === 0 || index === activityData.length - 1,
  );

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={displayData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? "#374151" : "#e5e7eb"}
            strokeOpacity={isDark ? 0.6 : 0.5}
            horizontal={true}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{
              fontSize: 12,
              fill: isDark ? "#e5e7eb" : "#111827",
              fontWeight: 600,
            }}
            stroke={isDark ? "#6b7280" : "#9ca3af"}
            axisLine={{
              stroke: isDark ? "#6b7280" : "#9ca3af",
              strokeWidth: 2,
            }}
            tickLine={{
              stroke: isDark ? "#6b7280" : "#9ca3af",
              strokeWidth: 1,
            }}
            angle={-45}
            textAnchor="end"
            height={80}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{
              fontSize: 13,
              fill: isDark ? "#e5e7eb" : "#111827",
              fontWeight: 600,
            }}
            stroke={isDark ? "#6b7280" : "#9ca3af"}
            axisLine={{
              stroke: isDark ? "#6b7280" : "#9ca3af",
              strokeWidth: 2,
            }}
            tickLine={{
              stroke: isDark ? "#6b7280" : "#9ca3af",
              strokeWidth: 1,
            }}
            domain={["dataMin - 50", "dataMax + 50"]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#1f2937" : "#ffffff",
              border: isDark ? "1px solid #374151" : "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "10px 14px",
              boxShadow: isDark
                ? "0 4px 12px rgba(0,0,0,0.5)"
                : "0 4px 12px rgba(0,0,0,0.15)",
              color: isDark ? "#f3f4f6" : "#111827",
            }}
            labelStyle={{
              color: isDark ? "#f3f4f6" : "#111827",
              marginBottom: "6px",
              fontWeight: "700",
              fontSize: "14px",
            }}
            itemStyle={{
              color: isDark ? "#e5e7eb" : "#111827",
              fontSize: "13px",
              fontWeight: "600",
            }}
            formatter={(value: number) => [`${value} activities`, "Activity"]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="activity"
            stroke={isDark ? "#60a5fa" : "#2563eb"}
            strokeWidth={3}
            dot={false}
            activeDot={{
              r: 7,
              strokeWidth: 3,
              stroke: isDark ? "#1f2937" : "#ffffff",
              fill: isDark ? "#60a5fa" : "#2563eb",
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
