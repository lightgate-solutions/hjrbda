import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  columns: number;
  rows?: number;
  showActions?: boolean;
  showAvatar?: boolean;
  className?: string;
}

export function TableSkeleton({
  columns,
  rows = 10,
  showActions = true,
  showAvatar = false,
  className,
}: TableSkeletonProps) {
  const skeletonRows = Array.from({ length: rows }, (_, i) => `row-${i}`);

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {Array.from({ length: columns }, (_, i) => `head-${i}`).map((id) => (
            <TableHead key={id}>
              <Skeleton className="h-5 w-24" />
            </TableHead>
          ))}
          {showActions && (
            <TableHead className="text-right">
              <Skeleton className="h-5 w-16 ml-auto" />
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {skeletonRows.map((index) => (
          <TableRow key={index}>
            {Array.from({ length: columns }, (_, colIndex) => ({
              id: `cell-${colIndex}`,
              colIndex,
            })).map(({ id, colIndex }) => (
              <TableCell key={id}>
                {colIndex === 0 && showAvatar ? (
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ) : (
                  <Skeleton className="h-5 w-32" />
                )}
              </TableCell>
            ))}
            {showActions && (
              <TableCell className="flex space-x-2 justify-end">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
