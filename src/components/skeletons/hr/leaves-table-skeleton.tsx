import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "../base/table-skeleton";

export function LeavesTableSkeleton() {
  return (
    <section className="p-6">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            <Skeleton className="h-7 w-32" />
          </CardTitle>
          <Skeleton className="h-9 w-32" />
        </CardHeader>
        <CardContent>
          <TableSkeleton columns={6} rows={10} showActions />
        </CardContent>
      </Card>
    </section>
  );
}
