import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "../base/table-skeleton";

export function PayrollTableSkeleton() {
  return (
    <section className="p-6 space-y-6">
      <div>
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-96 mt-2" />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-7 w-40" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-5 w-64" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TableSkeleton columns={7} rows={10} showActions />
        </CardContent>
      </Card>
    </section>
  );
}
