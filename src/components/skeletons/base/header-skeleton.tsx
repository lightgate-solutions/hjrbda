import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface HeaderSkeletonProps {
  showBackButton?: boolean;
  showAction?: boolean;
  className?: string;
}

export function HeaderSkeleton({
  showBackButton = false,
  showAction = false,
  className,
}: HeaderSkeletonProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-4">
        {showBackButton && <Skeleton className="h-9 w-9" />}
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
      </div>
      {showAction && <Skeleton className="h-9 w-32" />}
    </div>
  );
}
