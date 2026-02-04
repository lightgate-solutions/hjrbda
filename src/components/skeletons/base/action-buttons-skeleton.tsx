import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ActionButtonsSkeletonProps {
  count?: number;
  layout?: "2x2" | "1x4";
  className?: string;
}

export function ActionButtonsSkeleton({
  count = 4,
  layout = "1x4",
  className,
}: ActionButtonsSkeletonProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        layout === "2x2" ? "grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card
          key={i}
          className="border border-gray-200/60 dark:border-gray-800 bg-white/80 dark:bg-gray-900/50 shadow-sm rounded-xl"
        >
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <Skeleton className="h-11 w-11 rounded-xl mb-3" />
            <Skeleton className="h-5 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
