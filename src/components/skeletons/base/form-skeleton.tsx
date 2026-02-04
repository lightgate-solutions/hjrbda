import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface FormSkeletonProps {
  fieldCount?: number;
  showSubmitButton?: boolean;
  className?: string;
}

export function FormSkeleton({
  fieldCount = 6,
  showSubmitButton = true,
  className,
}: FormSkeletonProps) {
  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-5 w-96 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Array.from({ length: fieldCount }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          {showSubmitButton && (
            <div className="flex gap-3 pt-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
