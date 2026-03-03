import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CardSkeletonProps {
  showHeader?: boolean;
  showDescription?: boolean;
  showFooter?: boolean;
  contentLines?: number;
  className?: string;
}

export function CardSkeleton({
  showHeader = true,
  showDescription = false,
  showFooter = false,
  contentLines = 3,
  className,
}: CardSkeletonProps) {
  return (
    <Card className={cn("shadow-sm", className)}>
      {showHeader && (
        <CardHeader>
          <Skeleton className="h-7 w-48" />
          {showDescription && <Skeleton className="h-5 w-64 mt-2" />}
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: contentLines }, (_, i) => ({
            id: `line-${i}`,
            isLast: i === contentLines - 1,
          })).map(({ id, isLast }) => (
            <Skeleton
              key={id}
              className={cn("h-5", isLast ? "w-2/3" : "w-full")}
            />
          ))}
        </div>
      </CardContent>
      {showFooter && (
        <CardFooter>
          <Skeleton className="h-9 w-24" />
        </CardFooter>
      )}
    </Card>
  );
}
