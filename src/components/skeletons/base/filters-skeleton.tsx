import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface FiltersSkeletonProps {
  showSearch?: boolean;
  dropdownCount?: number;
  showDateRange?: boolean;
  className?: string;
}

export function FiltersSkeleton({
  showSearch = true,
  dropdownCount = 2,
  showDateRange = false,
  className,
}: FiltersSkeletonProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {showSearch && <Skeleton className="h-10 w-64" />}
      {Array.from({ length: dropdownCount }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-32" />
      ))}
      {showDateRange && <Skeleton className="h-10 w-48" />}
    </div>
  );
}
