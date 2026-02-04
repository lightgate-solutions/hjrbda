/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DocumentsFolderSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <Skeleton className="h-6 w-64" />

      {/* File/Folder List */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50"
              >
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
