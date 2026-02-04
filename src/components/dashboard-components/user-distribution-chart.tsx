"use client";

import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface UserDistributionData {
  name: string;
  value: number;
  colorLight: string;
  colorDark: string;
  [key: string]: string | number;
}

export default function UserDistributionChart() {
  const [userDistributionData, setUserDistributionData] = useState<
    UserDistributionData[]
  >([]);
  const [colors, setColors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch user distribution from API
    async function fetchUserDistribution() {
      try {
        setLoading(true);
        const response = await fetch("/api/dashboard/user-distribution", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (response.status === 403) {
            // Admin access required - this is expected for non-admin users
            setUserDistributionData([]);
            setError("Admin access required");
            return;
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || "Failed to fetch user distribution",
          );
        }

        const data = await response.json();

        if (data.distribution && Array.isArray(data.distribution)) {
          setUserDistributionData(data.distribution);
          setError(null);
        } else {
          setUserDistributionData([]);
        }
      } catch (err) {
        toast.error("Error fetching user distribution:");
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load user distribution",
        );
        setUserDistributionData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchUserDistribution();
  }, []);

  useEffect(() => {
    const updateColors = () => {
      if (userDistributionData.length === 0) return;

      const isDark = document.documentElement.classList.contains("dark");
      const newColors = userDistributionData.map((item) =>
        isDark ? item.colorDark : item.colorLight,
      );
      setColors(newColors);
    };

    // Initial check
    updateColors();

    // Watch for theme changes
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [userDistributionData]);

  if (loading) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (error || userDistributionData.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-gray-600 dark:text-gray-400">
        <div className="text-center">
          <p className="text-sm font-medium">
            {error || "No user distribution data available"}
          </p>
          <p className="text-xs mt-1">
            {error === "Admin access required"
              ? "Admin access is required to view user distribution"
              : "User distribution will appear as users are added to the system"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={userDistributionData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="hsl(var(--primary))"
            dataKey="value"
            label={({
              cx,
              cy,
              midAngle,
              innerRadius,
              outerRadius,
              percent,
              name: _name,
            }) => {
              // Handle undefined values
              if (
                midAngle === undefined ||
                innerRadius === undefined ||
                outerRadius === undefined ||
                percent === undefined
              ) {
                return null;
              }

              const RADIAN = Math.PI / 180;
              const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
              const x = cx + radius * Math.cos(-midAngle * RADIAN);
              const y = cy + radius * Math.sin(-midAngle * RADIAN);

              return (
                <text
                  x={x}
                  y={y}
                  fill="hsl(var(--foreground))"
                  textAnchor={x > cx ? "start" : "end"}
                  dominantBaseline="central"
                  fontSize={12}
                  fontWeight={600}
                  style={{
                    filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
                  }}
                >
                  {`${(percent * 100).toFixed(0)}%`}
                </text>
              );
            }}
          >
            {userDistributionData.map((entry, index) => (
              <Cell
                key={`cell-${entry.name}-${index}`}
                fill={colors[index] || entry.colorLight}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "hsl(var(--foreground))",
            }}
            labelStyle={{
              color: "hsl(var(--foreground))",
              marginBottom: "4px",
              fontWeight: "600",
            }}
            itemStyle={{
              color: "hsl(var(--foreground))",
              fontWeight: "500",
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{
              fontSize: "12px",
              color: "hsl(var(--foreground))",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
