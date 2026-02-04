"use client";

import { useEffect, useState } from "react";
import { StatCard } from "./stat-card";
import {
  ClipboardList,
  FileText,
  Briefcase,
  Mail,
  Bell,
  Clock,
  CheckCircle2,
} from "lucide-react";
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

interface DashboardStatsProps {
  userRole?: "admin" | "manager" | "finance" | "hr" | "staff";
  isManager?: boolean;
}

export function DashboardStats({
  userRole: _userRole = "staff",
  isManager = false,
}: DashboardStatsProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const response = await fetch("/api/dashboard/stats", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to fetch stats");
        }

        const data = await response.json();

        // Ensure data structure is correct
        if (data && typeof data === "object") {
          setStats(data);
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
        });
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    const skeletons = Array.from({ length: 7 }, (_, i) => ({
      id: `skeleton-loading-${i}`,
    }));
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {skeletons.map((skeleton) => (
          <Skeleton key={skeleton.id} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
        No data available
      </div>
    );
  }

  const taskHref = isManager ? "/tasks" : "/tasks/employee";
  const projectHref = "/projects";
  const documentHref = "/documents/all";
  const emailHref = "/mail/inbox";
  const notificationHref = "/notification";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {/* Tasks */}
      <StatCard
        title="Active Tasks"
        value={stats.tasks.active}
        icon={ClipboardList}
        href={taskHref}
        description={
          stats.tasks.total > 0
            ? `${stats.tasks.pending} pending, ${stats.tasks.inProgress} in progress`
            : undefined
        }
        iconColor="text-blue-600 dark:text-blue-400"
        iconBgColor="bg-blue-50 dark:bg-blue-950/30"
        emptyMessage="No active tasks"
      />
      <StatCard
        title="Pending Tasks"
        value={stats.tasks.pending}
        icon={Clock}
        href={taskHref}
        iconColor="text-amber-600 dark:text-amber-400"
        iconBgColor="bg-amber-50 dark:bg-amber-950/30"
        emptyMessage="No pending tasks"
      />
      <StatCard
        title="In Progress"
        value={stats.tasks.inProgress}
        icon={CheckCircle2}
        href={taskHref}
        iconColor="text-indigo-600 dark:text-indigo-400"
        iconBgColor="bg-indigo-50 dark:bg-indigo-950/30"
        emptyMessage="No tasks in progress"
      />

      {/* Documents */}
      <StatCard
        title="Documents"
        value={stats.documents}
        icon={FileText}
        href={documentHref}
        iconColor="text-purple-600 dark:text-purple-400"
        iconBgColor="bg-purple-50 dark:bg-purple-950/30"
        emptyMessage="No documents"
      />

      {/* Projects */}
      <StatCard
        title="Projects"
        value={stats.projects}
        icon={Briefcase}
        href={projectHref}
        iconColor="text-emerald-600 dark:text-emerald-400"
        iconBgColor="bg-emerald-50 dark:bg-emerald-950/30"
        emptyMessage="No projects"
      />

      {/* Emails */}
      <StatCard
        title="Unread Emails"
        value={stats.emails.unread}
        icon={Mail}
        href={emailHref}
        description={
          stats.emails.inbox > 0
            ? `${stats.emails.inbox} total in inbox`
            : undefined
        }
        iconColor="text-red-600 dark:text-red-400"
        iconBgColor="bg-red-50 dark:bg-red-950/30"
        emptyMessage="No unread emails"
      />

      {/* Notifications */}
      <StatCard
        title="Notifications"
        value={stats.notifications}
        icon={Bell}
        href={notificationHref}
        iconColor="text-orange-600 dark:text-orange-400"
        iconBgColor="bg-orange-50 dark:bg-orange-950/30"
        emptyMessage="No notifications"
      />
    </div>
  );
}
