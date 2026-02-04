import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FinancePayrunTable } from "@/components/finance/finance-payrun-table";

export default function FinancePayrunsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payrun Disbursement</CardTitle>
          <CardDescription>
            Process and disburse approved payruns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FinancePayrunTable />
        </CardContent>
      </Card>
    </div>
  );
}
