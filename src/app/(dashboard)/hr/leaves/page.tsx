import LeavesTable from "@/components/hr/leaves-table";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Settings } from "lucide-react";

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect("/auth/login");
  }

  // Get employee info to check department
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
  const isHr =
    employee?.department?.toLowerCase() === "hr" ||
    employee?.department?.toLowerCase() === "human resources" ||
    employee?.role?.toLowerCase() === "hr";

  const canManageLeaves = isAdmin || isAdminDept || isHr;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {canManageLeaves ? "Leave Management" : "My Leaves"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {canManageLeaves
                ? "View and manage employee leave applications"
                : "View and apply for leaves"}
            </p>
          </div>
        </div>
        {canManageLeaves && (
          <Button asChild variant="outline">
            <Link href="/hr/leaves/annual-balances">
              <Settings className="mr-2 h-4 w-4" />
              Manage Annual Leaves
            </Link>
          </Button>
        )}
      </div>
      <LeavesTable
        employeeId={canManageLeaves ? undefined : employee.id}
        isHR={canManageLeaves}
        showFilters={true}
      />
    </div>
  );
}
