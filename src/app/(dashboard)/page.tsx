/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
/** biome-ignore-all lint/style/noNonNullAssertion: <> */
/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <> */

"use client";

import AdminDashboard from "@/components/dashboard/AdminDashboard";
import HrDashboard from "@/components/dashboard/HrDashboard";
import StaffDashboard from "@/components/dashboard/StaffDashboard";
import ManagerDashboard from "@/components/dashboard/ManagerDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function DashboardPage() {
  const { data: user } = useCurrentUser();

  if (!user) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Fetching Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Loading</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Normalize role to lowercase and trim for comparison
  const normalizedRole = user.role?.toLowerCase().trim() || "staff";
  const isManager = user.isManager || false;

  // Priority: Admin > Manager (if isManager flag) > Role-based > Default Staff

  // Admin always gets admin dashboard
  if (normalizedRole === "admin") {
    return (
      <div>
        <AdminDashboard employeeId={user.id} />
      </div>
    );
  }

  // If user has manager flag and is not admin, show manager dashboard
  if (isManager) {
    return (
      <div>
        <ManagerDashboard />
      </div>
    );
  }

  // Role-based dashboards
  switch (normalizedRole) {
    case "hr":
    case "human resources":
    case "humanresource":
    case "human-resources":
      return (
        <div>
          <HrDashboard />
        </div>
      );

    case "finance":
    case "accounting":
    case "accountant":
      return (
        <div>
          <StaffDashboard />
        </div>
      );

    default:
      // Default fallback: Show staff dashboard for any unrecognized role
      // This ensures ALL users get a dashboard, even if their role is not explicitly handled
      // Handles: "staff", "employee", "user", "", null, undefined, and any other values
      return (
        <div>
          <StaffDashboard />
        </div>
      );
  }
}
