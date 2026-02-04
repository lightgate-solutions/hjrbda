"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Zap,
  Mail,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Briefcase,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import StatsCard from "@/components/dashboard-components/stats-card";

// Chart colors that work well in both light and dark modes
const chartColors = {
  completed: { light: "#10b981", dark: "#34d399" },
  inProgress: { light: "#3b82f6", dark: "#60a5fa" },
  pending: { light: "#f59e0b", dark: "#fbbf24" },
};

interface TeamPerformance {
  week: string;
  completed: number;
  inProgress: number;
  pending: number;
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
  tasksCompleted: number;
  performance: string;
}

interface ProjectStatus {
  id: number;
  name: string;
  progress: number;
  members: number;
  dueDate: string;
}

interface RecentDocument {
  id: number;
  name: string;
  uploadedBy: string;
  date: string;
  size: string;
}

interface ManagerMetrics {
  teamMembers: number;
  activeProjects: number;
  unreadEmails: number;
  completedTasks: number;
}

export default function ManagerDashboard() {
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<ProjectStatus[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [metrics, setMetrics] = useState<ManagerMetrics>({
    teamMembers: 0,
    activeProjects: 0,
    unreadEmails: 0,
    completedTasks: 0,
  });
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

  const fetchManagerData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel with cache busting headers
      const [performanceRes, membersRes, projectsRes, documentsRes, statsRes] =
        await Promise.all([
          fetch("/api/dashboard/manager/team-performance", {
            credentials: "include",
            cache: "no-store",
            headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
          }),
          fetch("/api/dashboard/manager/team-members", {
            credentials: "include",
            cache: "no-store",
            headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
          }),
          fetch("/api/dashboard/manager/projects", {
            credentials: "include",
            cache: "no-store",
            headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
          }),
          fetch("/api/dashboard/manager/documents", {
            credentials: "include",
            cache: "no-store",
            headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
          }),
          fetch("/api/dashboard/stats", {
            credentials: "include",
            cache: "no-store",
            headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
          }),
        ]);

      // Process responses and calculate metrics
      let performanceData: TeamPerformance[] = [];
      let teamMembersData: TeamMember[] = [];
      let projectsData: ProjectStatus[] = [];
      let documentsData: RecentDocument[] = [];
      let statsData: {
        emails?: { unread?: number };
        tasks?: { active?: number };
      } | null = null;

      // Process team performance
      if (performanceRes.ok) {
        const data = await performanceRes.json();
        performanceData = data.performance || [];
        setTeamPerformance(performanceData);
      }

      // Process team members
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        teamMembersData = membersData.teamMembers || [];
        setTeamMembers(teamMembersData);
      }

      // Process projects
      if (projectsRes.ok) {
        const projectsDataRes = await projectsRes.json();
        projectsData = projectsDataRes.projects || [];
        setProjects(projectsData);
      }

      // Process documents
      if (documentsRes.ok) {
        const documentsDataRes = await documentsRes.json();
        documentsData = documentsDataRes.documents || [];
        setRecentDocuments(documentsData);
      } else {
        // Log error for debugging
        const errorData = await documentsRes.json().catch(() => ({}));
        console.error(
          "Error fetching manager documents:",
          documentsRes.status,
          errorData,
        );
      }

      // Process stats
      if (statsRes.ok) {
        statsData = await statsRes.json();
      }

      // Calculate all metrics after all data is processed
      const completedTasksFromPerformance = performanceData.reduce(
        (sum, week) => sum + (week.completed || 0),
        0,
      );

      setMetrics({
        teamMembers: teamMembersData.length,
        activeProjects: projectsData.length,
        unreadEmails: statsData?.emails?.unread || 0,
        completedTasks:
          completedTasksFromPerformance > 0
            ? completedTasksFromPerformance
            : statsData?.tasks?.active || 0,
      });
    } catch (error) {
      console.error("Error fetching manager data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManagerData();
  }, [fetchManagerData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchManagerData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchManagerData]);

  // Calculate trends (simplified - could be enhanced with historical data)
  const _managerMetrics = [
    {
      label: "Team Members",
      value: metrics.teamMembers.toString(),
      icon: Users,
      trend: "0%",
    },
    {
      label: "Active Projects",
      value: metrics.activeProjects.toString(),
      icon: Zap,
      trend: metrics.activeProjects > 0 ? `+${metrics.activeProjects}` : "0",
    },
    {
      label: "Unread Emails",
      value: metrics.unreadEmails.toString(),
      icon: Mail,
      trend:
        metrics.unreadEmails > 0
          ? `-${Math.min(metrics.unreadEmails, 8)}`
          : "0",
    },
    {
      label: "Completed Tasks",
      value: metrics.completedTasks.toString(),
      icon: CheckCircle2,
      trend:
        metrics.completedTasks > 0
          ? `+${Math.round(metrics.completedTasks * 0.12)}%`
          : "0%",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-8 p-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Static array for loading skeletons
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
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
            Manager Dashboard
          </h2>
          <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
            Team performance and project overview
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

      {/* Stats Row - Match Admin Dashboard styling */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Team Members"
          value={metrics.teamMembers}
          icon={Users}
          href="/hr/admin/users"
          accentColor="blue"
        />
        <StatsCard
          title="Active Projects"
          value={metrics.activeProjects}
          icon={Zap}
          href="/projects"
          accentColor="mint"
        />
        <StatsCard
          title="Unread Emails"
          value={metrics.unreadEmails}
          icon={Mail}
          href="/mail/inbox"
          accentColor="blue"
        />
        <StatsCard
          title="Completed Tasks"
          value={metrics.completedTasks}
          icon={CheckCircle2}
          href="/tasks"
          accentColor="mint"
        />
      </div>

      {/* Team performance and projects */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {/* Weekly Performance */}
        <Card className="lg:col-span-2 border border-blue-100 dark:border-gray-800 bg-[#F3F6FC] dark:bg-gray-900/50 shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-50 font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#0284C7] dark:text-blue-400" />
              Team Performance
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 font-semibold">
              Weekly task completion breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teamPerformance.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-gray-600 dark:text-gray-400">
                <div className="text-center">
                  <p className="text-sm font-medium">
                    No performance data available
                  </p>
                  <p className="text-xs mt-1">
                    Activity will appear as tasks are assigned and completed
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={teamPerformance}
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
                      domain={["dataMin - 5", "dataMax + 5"]}
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
                    <Legend
                      wrapperStyle={{ paddingTop: "20px", fontWeight: 600 }}
                      iconType="square"
                    />
                    <Bar
                      dataKey="completed"
                      fill={
                        isDark
                          ? chartColors.completed.dark
                          : chartColors.completed.light
                      }
                      radius={[8, 8, 0, 0]}
                      name="Completed"
                    />
                    <Bar
                      dataKey="inProgress"
                      fill={
                        isDark
                          ? chartColors.inProgress.dark
                          : chartColors.inProgress.light
                      }
                      radius={[8, 8, 0, 0]}
                      name="In Progress"
                    />
                    <Bar
                      dataKey="pending"
                      fill={
                        isDark
                          ? chartColors.pending.dark
                          : chartColors.pending.light
                      }
                      radius={[8, 8, 0, 0]}
                      name="Pending"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projects Status */}
        <Card className="border border-emerald-100 dark:border-gray-800 bg-[#F0F9F4] dark:bg-gray-900/50 shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-50 font-bold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#10B981] dark:text-emerald-400" />
              Projects Status
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 font-semibold">
              Active project progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="py-8 text-center text-gray-600 dark:text-gray-400">
                <p className="text-sm font-medium">No active projects</p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block space-y-2 hover:bg-white/60 dark:hover:bg-gray-800/50 -mx-4 px-4 py-2 rounded transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1">
                        {project.name}
                      </p>
                      <span className="text-xs font-bold text-[#10B981] dark:text-emerald-400">
                        {project.progress}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                      {project.members} members • Due {project.dueDate}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team members and recent docs */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {/* Team Members */}
        <Card className="border border-purple-100 dark:border-gray-800 bg-[#FAF9FF] dark:bg-gray-900/50 shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-50 font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-[#9333EA] dark:text-purple-400" />
              Team Members
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 font-semibold">
              Individual performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teamMembers.length === 0 ? (
              <div className="py-8 text-center text-gray-600 dark:text-gray-400">
                <p className="text-sm font-medium">No team members found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between border-b border-purple-100/50 dark:border-gray-800 pb-3 last:border-0"
                  >
                    <div className="space-y-1 flex-1">
                      <p className="font-bold text-sm text-gray-900 dark:text-gray-100">
                        {member.name}
                      </p>
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        {member.role}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-gray-900 dark:text-gray-100">
                        {member.tasksCompleted}
                      </p>
                      <p className="text-xs font-bold text-[#10B981] dark:text-emerald-400">
                        {member.performance}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card className="border border-purple-100 dark:border-gray-800 bg-[#FAF9FF] dark:bg-gray-900/50 shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-gray-50 font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#9333EA] dark:text-purple-400" />
              Recent Documents
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 font-semibold">
              Team uploads and resources
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
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-[#F3E8FF] dark:bg-purple-950/50 p-2 shrink-0 mt-0.5">
                          <FileText className="h-4 w-4 text-[#9333EA] dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-900 dark:text-gray-100 line-clamp-1">
                            {doc.name}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                              {doc.date}
                            </span>
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                              {doc.size}
                            </span>
                            {doc.uploadedBy && (
                              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                by {doc.uploadedBy}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
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

      {/* Quick Actions - Match Admin Dashboard styling */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/documents">
          <Card className="border border-gray-200/60 dark:border-gray-800 bg-white/80 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800/60 transition-all cursor-pointer shadow-sm hover:shadow-md rounded-xl backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="rounded-xl p-3 mb-3 bg-[#E0F2FE] dark:bg-blue-950/50">
                <Upload className="h-5 w-5 text-[#0284C7] dark:text-blue-400" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Upload Resource
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/tasks">
          <Card className="border border-gray-200/60 dark:border-gray-800 bg-white/80 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800/60 transition-all cursor-pointer shadow-sm hover:shadow-md rounded-xl backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="rounded-xl p-3 mb-3 bg-[#ECFDF5] dark:bg-emerald-950/50">
                <CheckCircle2 className="h-5 w-5 text-[#10B981] dark:text-emerald-400" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Assign Task
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/projects">
          <Card className="border border-gray-200/60 dark:border-gray-800 bg-white/80 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800/60 transition-all cursor-pointer shadow-sm hover:shadow-md rounded-xl backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="rounded-xl p-3 mb-3 bg-[#F3E8FF] dark:bg-purple-950/50">
                <Briefcase className="h-5 w-5 text-[#9333EA] dark:text-purple-400" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Assign Project
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/mail/inbox">
          <Card className="border border-gray-200/60 dark:border-gray-800 bg-white/80 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800/60 transition-all cursor-pointer shadow-sm hover:shadow-md rounded-xl backdrop-blur-sm">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="rounded-xl p-3 mb-3 bg-[#FEF3C7] dark:bg-amber-950/50">
                <Clock className="h-5 w-5 text-[#F59E0B] dark:text-amber-400" />
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Schedule Meeting
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
