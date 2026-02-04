import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <section className="p-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <TableSkeleton columns={6} rows={10} showActions={false} />
        </CardContent>
      </Card>
    </section>
  );
}
