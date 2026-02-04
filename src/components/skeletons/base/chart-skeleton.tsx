import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChartSkeletonProps {
  height?: string;
  showLegend?: boolean;
  className?: string;
}

export function ChartSkeleton({
  height = "300px",
  showLegend = false,
  className,
}: ChartSkeletonProps) {
  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-48" />
        </div>
        <CardDescription>
          <Skeleton className="h-5 w-32" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="w-full rounded-lg bg-accent/20 animate-pulse"
          style={{ height }}
        />
        {showLegend && (
          <div className="mt-4 flex gap-4 justify-center">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
