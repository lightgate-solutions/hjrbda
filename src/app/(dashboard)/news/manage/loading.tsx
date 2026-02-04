import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <section className="p-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Manage News</CardTitle>
        </CardHeader>
        <CardContent>
          <TableSkeleton columns={5} rows={10} showActions />
        </CardContent>
      </Card>
    </section>
  );
}
