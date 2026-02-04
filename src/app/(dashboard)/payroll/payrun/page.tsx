import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PayrunTable } from "@/components/payroll/payrun-table";

export default function PayrunPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payrun Management</CardTitle>
            <CardDescription>
              Generate, review, and approve payruns for salary and allowance
              disbursements
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <PayrunTable />
        </CardContent>
      </Card>
    </div>
  );
}
