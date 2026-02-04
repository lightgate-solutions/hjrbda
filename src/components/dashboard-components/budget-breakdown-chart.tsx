"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface BudgetData {
  department: string;
  budget: number;
}

export default function BudgetBreakdownChart() {
  const [budgetData, setBudgetData] = useState<BudgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

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

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    async function fetchBudgetData() {
      try {
        setLoading(true);
        const response = await fetch("/api/finance/budget-breakdown", {
          credentials: "include",
          cache: "no-store",
        });

        // Handle non-ok responses
        if (!response.ok) {
          // Don't log 403 errors as they're expected for non-admin users
          // (though this component should only be visible to admins)
          if (response.status !== 403) {
            const errorData = await response.json().catch(() => ({}));
            toast.error(
              "Error fetching budget breakdown:",
              errorData.error || response.statusText,
            );
          }
          setBudgetData([]);
          return;
        }

        const data = await response.json();
        setBudgetData(data.breakdown || []);
      } catch (_error) {
        toast.error("Error fetching budget breakdown");
        setBudgetData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchBudgetData();
  }, []);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `₦${(value / 1000000).toFixed(1)}M`;
    }
    return `₦${(value / 1000).toFixed(0)}K`;
  };

  if (loading) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    );
  }

  if (budgetData.length === 0) {
    return (
      <div className="w-full h-[300px] flex flex-col items-center justify-center text-gray-600 dark:text-gray-400">
        <p className="text-sm font-medium">No budget data available</p>
        <p className="text-xs mt-1">
          Add expenses with categories to see budget breakdown
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={budgetData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? "#374151" : "#e5e7eb"}
            strokeOpacity={isDark ? 0.6 : 0.5}
          />
          <XAxis
            dataKey="department"
            tick={{
              fontSize: 14,
              fill: isDark ? "#e5e7eb" : "#111827",
              fontWeight: 700,
              fontFamily: "inherit",
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
            interval={0}
          />
          <YAxis
            tick={{
              fontSize: 13,
              fill: isDark ? "#e5e7eb" : "#111827",
              fontWeight: 700,
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
            tickFormatter={formatCurrency}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#1f2937" : "#ffffff",
              border: isDark ? "1px solid #374151" : "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "10px 14px",
              boxShadow: isDark
                ? "0 4px 12px rgba(0,0,0,0.5)"
                : "0 4px 12px rgba(0,0,0,0.2)",
              color: isDark ? "#f3f4f6" : "#111827",
            }}
            labelStyle={{
              color: isDark ? "#f3f4f6" : "#111827",
              marginBottom: "6px",
              fontWeight: "700",
              fontSize: "15px",
            }}
            itemStyle={{
              color: isDark ? "#e5e7eb" : "#111827",
              fontSize: "14px",
              fontWeight: "600",
            }}
            formatter={(
              value: number,
              _name: string,
              props: { payload?: { department?: string } },
            ) => [
              `₦${value.toLocaleString()}`,
              props.payload?.department || "",
            ]}
            labelFormatter={(label) => `Department: ${label}`}
          />
          <Bar
            dataKey="budget"
            fill={isDark ? "#60a5fa" : "#2563eb"}
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
