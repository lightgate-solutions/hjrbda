import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCardSkeleton } from "../base/stats-card-skeleton";
import { ActionButtonsSkeleton } from "../base/action-buttons-skeleton";

export function StaffDashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96 mt-2" />
        </div>
        <Skeleton className="h-9 w-20" />
      </div>

      {/* Stats Row */}
      <StatsCardSkeleton count={4} />

      {/* Productivity and deadlines */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {/* Productivity Trend Chart */}
        <Card className="lg:col-span-2 border border-blue-100 dark:border-gray-800 bg-[#F3F6FC] dark:bg-gray-900/50 shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-48" />
              </div>
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-5 w-32" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="border border-purple-100 dark:border-gray-800 bg-[#FAF9FF] dark:bg-gray-900/50 shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-40" />
              </div>
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-5 w-24" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between border-b border-purple-100/50 dark:border-gray-800 pb-3 last:border-0"
                >
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <div className="text-right space-y-1 ml-4">
                    <Skeleton className="h-5 w-8" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned tasks and documents */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {/* Assigned Tasks */}
        <Card className="border border-emerald-100 dark:border-gray-800 bg-[#F0F9F4] dark:bg-gray-900/50 shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-32" />
              </div>
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-5 w-48" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between border-b border-emerald-100/50 dark:border-gray-800 pb-3 last:border-0"
                >
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-2 w-2 rounded-full mt-2" />
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-100/50 dark:border-gray-800">
              <Skeleton className="h-4 w-24" />
            </div>
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card className="border border-purple-100 dark:border-gray-800 bg-[#FAF9FF] dark:bg-gray-900/50 shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-32" />
              </div>
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-5 w-40" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between border-b border-purple-100/50 dark:border-gray-800 pb-3 last:border-0"
                >
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-3 w-20 ml-2" />
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-purple-100/50 dark:border-gray-800">
              <Skeleton className="h-4 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <ActionButtonsSkeleton count={4} />
    </div>
  );
}
