import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function FinanceDashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header with date range picker */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96 mt-2" />
        </div>
        <Skeleton className="h-10 w-48" />
      </div>

      {/* Stats Row - 3 cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart and Quick Actions */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-7">
        {/* Chart */}
        <Card className="lg:col-span-4 border border-blue-100 dark:border-gray-800 bg-[#F3F6FC] dark:bg-gray-900/50 shadow-sm rounded-xl">
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

        {/* Quick Actions Card */}
        <Card className="lg:col-span-3 border border-purple-100 dark:border-gray-800 bg-[#FAF9FF] dark:bg-gray-900/50 shadow-sm rounded-xl">
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
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
