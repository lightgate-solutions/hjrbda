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
  Mail,
  FileText,
  Briefcase,
  Bell,
  Calendar,
  Upload,
  Share2,
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
}

interface RecentDocument {
  id: number;
  name: string;
  uploadedDate: string;
  size: string;
}

export default function StaffDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [_isDark, setIsDark] = useState(false);

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
      const [statsRes, documentsRes] = await Promise.all([
        fetch("/api/dashboard/stats", {
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
          documents: statsData.documents || 0,
          projects: statsData.projects || 0,
          emails: statsData.emails || { unread: 0, inbox: 0 },
          notifications: statsData.notifications || 0,
        });
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
            Overview and recent activity
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
          title="Documents"
          value={stats.documents}
          icon={FileText}
          href="/documents"
          accentColor="mint"
        />
        <StatsCard
          title="Projects"
          value={stats.projects}
          icon={Briefcase}
          href="/projects"
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
          title="Notifications"
          value={stats.notifications}
          icon={Bell}
          href="/notification"
          accentColor="lavender"
        />
      </div>

      {/* Recent documents */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
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
