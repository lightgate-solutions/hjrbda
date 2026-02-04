import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSkeleton } from "../base/header-skeleton";
import { StatsCardSkeleton } from "../base/stats-card-skeleton";
import { FiltersSkeleton } from "../base/filters-skeleton";

export function ProjectsPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <HeaderSkeleton showBackButton={false} showAction />

      {/* Stats Row */}
      <StatsCardSkeleton count={4} />

      {/* Filters Row */}
      <div className="flex items-center justify-between">
        <FiltersSkeleton showSearch dropdownCount={2} showDateRange />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-2 w-2 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9" />
      </div>
    </div>
  );
}
