import { BackButton } from "@/components/ui/back-button";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import LoanTypesTable from "@/components/loans/loan-types-table";

export default async function LoanTypesPage() {
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

  // Only admin and HR can access this page
  if (!isAdmin && !isAdminDept && !isHR) {
    return redirect("/unauthorized");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <BackButton href="/hr/loans" label="Back to Loan Management" />
        <div>
          <h1 className="text-2xl font-bold">Loan Types</h1>
          <p className="text-sm text-muted-foreground">
            Configure loan types and eligibility rules
          </p>
        </div>
      </div>

      <LoanTypesTable employeeId={employee.id} />
    </div>
  );
}
