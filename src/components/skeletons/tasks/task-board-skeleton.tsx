import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FiltersSkeleton } from "../base/filters-skeleton";

export function TaskBoardSkeleton() {
  const columns = ["Pending", "In Progress", "Review", "Completed"];

  return (
    <div className="space-y-6 p-6">
      {/* Header with filters */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <FiltersSkeleton showSearch dropdownCount={2} />
      </div>

      {/* Task Board - 4 columns */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {columns.map((column) => (
          <Card key={column} className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="border shadow-sm">
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex items-center gap-2 pt-2">
                        <Skeleton className="h-6 w-16 rounded-full" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
