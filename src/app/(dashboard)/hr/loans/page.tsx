import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import LoanApplicationsTable from "@/components/loans/loan-applications-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Settings } from "lucide-react";

export default async function LoansPage() {
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
  const isAdminDept = employee?.department?.toLowerCase() === "admin";
  const isHR =
    employee?.department?.toLowerCase() === "hr" ||
    employee?.department?.toLowerCase() === "human resources" ||
    employee?.role?.toLowerCase() === "hr";

  const canManageLoans = isAdmin || isAdminDept || isHR;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {canManageLoans ? "Loan Management" : "My Loans"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {canManageLoans
                ? "Review and manage employee loan applications"
                : "View and apply for loans"}
            </p>
          </div>
        </div>
        {canManageLoans && (
          <Button asChild variant="outline">
            <Link href="/hr/loans/types">
              <Settings className="mr-2 h-4 w-4" />
              Manage Loan Types
            </Link>
          </Button>
        )}
      </div>

      <LoanApplicationsTable
        employeeId={employee.id}
        isHR={canManageLoans}
        showFilters={true}
      />
    </div>
  );
}
