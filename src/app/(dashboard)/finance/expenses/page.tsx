import { ExpensesTable } from "@/components/finance/expenses-table";
import { BalanceCard } from "@/components/finance/balance-card";
import { BackButton } from "@/components/ui/back-button";

export default function ExpensesPage() {
  return (
    <div className="p-2 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold">Company Expenses</h1>
            <p className="text-sm text-muted-foreground">
              Track and manage company expenses
            </p>
          </div>
        </div>
      </div>
      <div className="mb-4">
        <BalanceCard />
      </div>
      <ExpensesTable />
    </div>
  );
}
