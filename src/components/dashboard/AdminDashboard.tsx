"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import StatsCard from "@/components/dashboard-components/stats-card";
import ActivityChart from "@/components/dashboard-components/activity-chart";
import RecentDocuments from "@/components/dashboard-components/recent-documents";
import RecentNotifications from "@/components/dashboard-components/recent-notifications";
import {
  Users,
  FileText,
  DollarSign,
  CheckSquare,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  documents: number;
  projects: number;
  emails: {
    unread: number;
    inbox: number;
  };
  notifications: number;
  totalUsers?: number;
}

export default function AdminDashboard({ employeeId }: { employeeId: number }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickActions = [
    {
      icon: Users,
      label: "Add Users",
      bgColor: "bg-[#E0F2FE] dark:bg-blue-950/50",
      iconColor: "text-[#0284C7] dark:text-blue-400",
      href: "/hr/admin/users",
    },
    {
      icon: FileText,
      label: "Upload Documents",
      bgColor: "bg-[#F3E8FF] dark:bg-purple-950/50",
      iconColor: "text-[#9333EA] dark:text-purple-400",
      href: "/documents",
    },
    {
      icon: CheckSquare,
      label: "Manage Projects",
      bgColor: "bg-[#ECFDF5] dark:bg-emerald-950/50",
      iconColor: "text-[#10B981] dark:text-emerald-400",
      href: "/projects",
    },
    {
      icon: DollarSign,
      label: "Approve Finance",
      bgColor: "bg-[#FEF3C7] dark:bg-amber-950/50",
      iconColor: "text-[#F59E0B] dark:text-amber-400",
      href: "/finance/expenses",
    },
  ];

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/dashboard/stats", {
        credentials: "include",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch stats");
      }

      const data = await response.json();

      // Fetch total users for admin
      let totalUsers = 0;
      try {
        const usersResponse = await fetch("/api/hr/admin/users?limit=1", {
          credentials: "include",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          totalUsers = usersData.total || 0;
        } else if (usersResponse.status === 403) {
          // Admin check failed - expected for non-admin users
          console.warn("User is not an admin, cannot fetch total users");
        }
      } catch (err) {
        // Ignore error, use 0
        console.error("Error fetching total users:", err);
      }

      if (data && typeof data === "object") {
        setStats({ ...data, totalUsers });
        setError(null);
      } else {
        throw new Error("Invalid data format received");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard stats",
      );
      // Set default values on error
      setStats({
        tasks: { active: 0, pending: 0, inProgress: 0, total: 0 },
        documents: 0,
        projects: 0,
        emails: { unread: 0, inbox: 0 },
        notifications: 0,
        totalUsers: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchStats();
    } finally {
      setRefreshing(false);
    }
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Static array for loading skeletons
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
            Admin Dashboard
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Centralized analytics and management across all modules
          </p>
        </div>
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
            Admin Dashboard
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Centralized analytics and management across all modules
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 text-sm text-gray-600 dark:text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
            Admin Dashboard
          </h2>
          <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
            Centralized analytics and management across all modules
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={stats.totalUsers || 0}
          icon={Users}
          href="/hr/admin/users"
          accentColor="blue"
        />
        <StatsCard
          title="Documents"
          value={stats.documents}
          icon={FileText}
          href="/documents/all"
          accentColor="lavender"
        />
        <StatsCard
          title="Active Projects"
          value={stats.projects}
          icon={CheckSquare}
          href="/projects"
          accentColor="mint"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} href={action.href}>
              <Card className="border border-gray-200/60 dark:border-gray-800 bg-white/80 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800/60 transition-all cursor-pointer shadow-sm hover:shadow-md rounded-xl backdrop-blur-sm">
                <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                  <div className={`rounded-xl p-3 mb-3 ${action.bgColor}`}>
                    <Icon className={`h-5 w-5 ${action.iconColor}`} />
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {action.label}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Activity Trends, Recent Documents & Notifications */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border border-blue-100 dark:border-gray-800 bg-[#F3F6FC] dark:bg-gray-900/50 shadow-sm rounded-xl lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-50 font-bold">
              Activity Trends
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 font-semibold">
              System activity over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityChart />
          </CardContent>
        </Card>
        <RecentDocuments />
        <RecentNotifications employeeId={employeeId} />
      </div>
    </div>
  );
}
