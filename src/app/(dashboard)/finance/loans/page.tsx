import { BackButton } from "@/components/ui/back-button";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import LoanDisbursementTable from "@/components/loans/loan-disbursement-table";

export default async function FinanceLoansPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect("/auth/login");
  }

  // Get employee info
  const [employee] = await db
    .select({
      id: employees.id,
      role: employees.role,
      department: employees.department,
    })
    .from(employees)
    .where(eq(employees.authId, session.user.id))
    .limit(1);

  if (!employee) {
    return redirect("/auth/login");
  }

  const isAdmin = session.user.role === "admin";
  const isFinance = employee?.department?.toLowerCase() === "finance";

  // Only admin and Finance can access this page
  if (!isAdmin && !isFinance) {
    return redirect("/unauthorized");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold">Loan Disbursement</h1>
          <p className="text-sm text-muted-foreground">
            Review and disburse approved loans
          </p>
        </div>
      </div>

      <LoanDisbursementTable />
    </div>
  );
}
