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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CheckCircle2,
  Clock,
  Mail,
  FileText,
  Calendar,
  Upload,
  PlusCircle,
  Share2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  tasks: {
    active: number;
    pending: number;
    inProgress: number;
    total: number;
  };
  documents: number;
  projects: number;
  emails: {
    unread: number;
    inbox: number;
  };
  notifications: number;
}

interface ProductivityTrend {
  week: string;
  productivity: number;
}

interface AssignedTask {
  id: number;
  title: string;
  dueDate: string;
  priority: string;
  status: string;
}

interface UpcomingDeadline {
  id: number;
  title: string;
  date: string;
  daysLeft: number;
  category: string;
}

interface RecentDocument {
  id: number;
  name: string;
  uploadedDate: string;
  size: string;
}

export default function StaffDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [productivityTrends, setProductivityTrends] = useState<
    ProductivityTrend[]
  >([]);
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<
    UpcomingDeadline[]
  >([]);
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Detect theme changes
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const fetchStaffData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel with cache busting headers
      const [statsRes, productivityRes, tasksRes, deadlinesRes, documentsRes] =
        await Promise.all([
          fetch("/api/dashboard/stats", {
            credentials: "include",
            cache: "no-store",
            headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
          }),
          fetch("/api/dashboard/staff/productivity", {
            credentials: "include",
            cache: "no-store",
            headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
          }),
          fetch("/api/dashboard/staff/tasks", {
            credentials: "include",
            cache: "no-store",
            headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
          }),
          fetch("/api/dashboard/staff/deadlines", {
            credentials: "include",
            cache: "no-store",
            headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
          }),
          fetch("/api/dashboard/staff/documents", {
            credentials: "include",
            cache: "no-store",
            headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
          }),
        ]);

      // Process stats
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          tasks: statsData.tasks || {
            active: 0,
            pending: 0,
            inProgress: 0,
            total: 0,
          },
          documents: statsData.documents || 0,
          projects: statsData.projects || 0,
          emails: statsData.emails || { unread: 0, inbox: 0 },
          notifications: statsData.notifications || 0,
        });
      }

      // Process productivity trends
      if (productivityRes.ok) {
        const productivityData = await productivityRes.json();
        setProductivityTrends(productivityData.trends || []);
      }

      // Process assigned tasks
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setAssignedTasks(tasksData.tasks || []);
      }

      // Process upcoming deadlines
      if (deadlinesRes.ok) {
        const deadlinesData = await deadlinesRes.json();
        setUpcomingDeadlines(deadlinesData.deadlines || []);
      }

      // Process recent documents
      if (documentsRes.ok) {
        const documentsData = await documentsRes.json();
        setRecentDocuments(documentsData.documents || []);
      } else {
        // Log error for debugging
        const errorData = await documentsRes.json().catch(() => ({}));
        console.error(
          "Error fetching documents:",
          documentsRes.status,
          errorData,
        );
      }
    } catch (error) {
      console.error("Error fetching staff data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaffData();
  }, [fetchStaffData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchStaffData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchStaffData]);

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

  if (!stats) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
            My Dashboard
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Personal productivity and task overview
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
            My Dashboard
          </h2>
          <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
            Personal productivity and task overview
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

      {/* Stats Row - Match Admin/Manager Dashboard styling */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Tasks"
          value={stats.tasks.active}
          icon={CheckCircle2}
          href="/tasks/employee"
          accentColor="mint"
        />
        <StatsCard
          title="Pending Tasks"
          value={stats.tasks.pending}
          icon={Clock}
          href="/tasks/employee"
          accentColor="beige"
        />
        <StatsCard
          title="Unread Emails"
          value={stats.emails.unread}
          icon={Mail}
          href="/mail/inbox"
          accentColor="blue"
        />
        <StatsCard
          title="Upcoming Deadlines"
          value={upcomingDeadlines.length}
          icon={Calendar}
          href="/tasks/employee"
          accentColor="lavender"
        />
      </div>

      {/* Productivity and deadlines */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {/* Productivity Trend */}
        <Card className="lg:col-span-2 border border-blue-100 dark:border-gray-800 bg-[#F3F6FC] dark:bg-gray-900/50 shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-50 font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#0284C7] dark:text-blue-400" />
              Productivity Trend
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 font-semibold">
              Weekly productivity score
            </CardDescription>
          </CardHeader>
          <CardContent>
            {productivityTrends.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-gray-600 dark:text-gray-400">
                <div className="text-center">
                  <p className="text-sm font-medium">
                    No productivity data available
                  </p>
                  <p className="text-xs mt-1">
                    Productivity will appear as tasks are completed
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={productivityTrends}
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
                      dataKey="week"
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
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#1f2937" : "#ffffff",
                        border: isDark
                          ? "1px solid #374151"
                          : "1px solid #e5e7eb",
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
                    />
                    <Line
                      type="monotone"
                      dataKey="productivity"
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
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="border border-purple-100 dark:border-gray-800 bg-[#FAF9FF] dark:bg-gray-900/50 shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-50 font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#9333EA] dark:text-purple-400" />
              Upcoming Deadlines
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 font-semibold">
              Next due dates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <div className="py-8 text-center text-gray-600 dark:text-gray-400">
                <p className="text-sm font-medium">No upcoming deadlines</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingDeadlines.map((deadline) => (
                  <div
                    key={deadline.id}
                    className="flex items-start justify-between border-b border-purple-100/50 dark:border-gray-800 pb-3 last:border-0"
                  >
                    <div className="space-y-1 flex-1">
                      <p className="font-bold text-sm text-gray-900 dark:text-gray-100 line-clamp-1">
                        {deadline.title}
                      </p>
                      <span className="text-xs font-semibold bg-[#F3E8FF] dark:bg-purple-950/50 text-[#9333EA] dark:text-purple-400 px-2 py-1 rounded-full inline-block">
                        {deadline.category}
                      </span>
                    </div>
                    <div className="text-right text-xs text-gray-600 dark:text-gray-400">
                      <p className="font-bold text-gray-900 dark:text-gray-100">
                        {deadline.daysLeft}d
                      </p>
                      <p>{deadline.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assigned tasks and documents */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {/* Assigned Tasks */}
        <Card className="border border-emerald-100 dark:border-gray-800 bg-[#F0F9F4] dark:bg-gray-900/50 shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-50 font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#10B981] dark:text-emerald-400" />
              Assigned Tasks
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 font-semibold">
              Your active and pending tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignedTasks.length === 0 ? (
              <div className="py-8 text-center text-gray-600 dark:text-gray-400">
                <p className="text-sm font-medium">No assigned tasks</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignedTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/employee`}
                    className="block"
                  >
                    <div className="flex items-start justify-between border-b border-emerald-100/50 dark:border-gray-800 pb-3 last:border-0 hover:bg-white/60 dark:hover:bg-gray-800/50 -mx-4 px-4 py-2 rounded transition-colors">
                      <div className="space-y-1 flex-1">
                        <p className="font-bold text-sm text-gray-900 dark:text-gray-100">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={`px-2 py-1 rounded-full font-semibold ${
                              task.priority === "high"
                                ? "bg-red-500/20 text-red-700 dark:text-red-400"
                                : task.priority === "medium"
                                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                                  : "bg-gray-500/20 text-gray-700 dark:text-gray-400"
                            }`}
                          >
                            {task.priority}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {task.dueDate}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                          task.status === "in-progress"
                            ? "bg-[#10B981] dark:bg-emerald-400"
                            : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-emerald-100/50 dark:border-gray-800">
              <Link
                href="/tasks/employee"
                className="text-sm font-bold text-[#10B981] dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                View all tasks
                <svg
                  className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-label="Arrow right"
                  role="img"
                >
                  <title>Arrow right</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card className="border border-purple-100 dark:border-gray-800 bg-[#FAF9FF] dark:bg-gray-900/50 shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-50 font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#9333EA] dark:text-purple-400" />
              My Documents
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 font-semibold">
              Recently uploaded files
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentDocuments.length === 0 ? (
              <div className="py-8 text-center text-gray-600 dark:text-gray-400">
                <p className="text-sm font-medium">No recent documents</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentDocuments.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/documents/${doc.id}`}
                    className="flex items-start justify-between border-b border-purple-100/50 dark:border-gray-800 pb-3 last:border-0 hover:bg-white/60 dark:hover:bg-gray-800/50 -mx-4 px-4 rounded transition-colors"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900 dark:text-gray-100 line-clamp-1">
                        {doc.name}
                      </p>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        {doc.size}
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap ml-2">
                      {doc.uploadedDate}
                    </p>
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-purple-100/50 dark:border-gray-800">
              <Link
                href="/documents/all"
                className="text-sm font-bold text-[#9333EA] dark:text-purple-400 hover:underline inline-flex items-center gap-1"
              >
                View all documents
                <svg
                  className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-label="Arrow right"
                  role="img"
                >
                  <title>Arrow right</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Match Admin/Manager Dashboard styling */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/documents">
          <Card className="border border-gray-200/60 dark:border-gray-800 bg-white/80 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800/60 transition-all cursor-pointer shadow-sm hover:shadow-md rounded-xl backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="rounded-xl p-3 mb-3 bg-[#E0F2FE] dark:bg-blue-950/50">
                <Upload className="h-5 w-5 text-[#0284C7] dark:text-blue-400" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Upload Document
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/tasks/employee">
          <Card className="border border-gray-200/60 dark:border-gray-800 bg-white/80 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800/60 transition-all cursor-pointer shadow-sm hover:shadow-md rounded-xl backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="rounded-xl p-3 mb-3 bg-[#ECFDF5] dark:bg-emerald-950/50">
                <PlusCircle className="h-5 w-5 text-[#10B981] dark:text-emerald-400" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                View Tasks
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/mail/inbox">
          <Card className="border border-gray-200/60 dark:border-gray-800 bg-white/80 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800/60 transition-all cursor-pointer shadow-sm hover:shadow-md rounded-xl backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="rounded-xl p-3 mb-3 bg-[#F3E8FF] dark:bg-purple-950/50">
                <Share2 className="h-5 w-5 text-[#9333EA] dark:text-purple-400" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Check Mail
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/projects">
          <Card className="border border-gray-200/60 dark:border-gray-800 bg-white/80 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800/60 transition-all cursor-pointer shadow-sm hover:shadow-md rounded-xl backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="rounded-xl p-3 mb-3 bg-[#FEF3C7] dark:bg-amber-950/50">
                <Calendar className="h-5 w-5 text-[#F59E0B] dark:text-amber-400" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                View Projects
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
