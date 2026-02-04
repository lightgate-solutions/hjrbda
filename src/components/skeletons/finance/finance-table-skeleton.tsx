import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "../base/table-skeleton";

export function FinanceTableSkeleton() {
  return (
    <section className="p-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-8 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TableSkeleton columns={6} rows={10} showActions />
        </CardContent>
      </Card>
    </section>
  );
}
