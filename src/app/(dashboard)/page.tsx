/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
/** biome-ignore-all lint/style/noNonNullAssertion: <> */
/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <> */

"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardSkeleton = () => (
  <div className="space-y-8 p-6">
    <div className="space-y-2">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-5 w-96" />
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => `skeleton-${i}`).map((id) => (
        <Skeleton key={id} className="h-24 rounded-lg" />
      ))}
    </div>
  </div>
);

const AdminDashboard = dynamic(
  () => import("@/components/dashboard/AdminDashboard"),
  { loading: () => <DashboardSkeleton /> },
);
const HrDashboard = dynamic(
  () => import("@/components/dashboard/HrDashboard"),
  { loading: () => <DashboardSkeleton /> },
);
const StaffDashboard = dynamic(
  () => import("@/components/dashboard/StaffDashboard"),
  { loading: () => <DashboardSkeleton /> },
);
const ManagerDashboard = dynamic(
  () => import("@/components/dashboard/ManagerDashboard"),
  { loading: () => <DashboardSkeleton /> },
);

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

  // Normalize values for comparison
  const normalizedRole = user.role?.toLowerCase().trim() || "user";
  const normalizedDept = user.department?.toLowerCase().trim() || "";
  const isManager = user.isManager || false;

  // Priority: Admin (role=admin OR dept=admin) > HR dept > Manager flag > Default Staff

  // Admin-level users always get admin dashboard
  if (normalizedRole === "admin" || normalizedDept === "admin") {
    return (
      <div>
        <AdminDashboard employeeId={user.id} />
      </div>
    );
  }

  // HR department gets HR dashboard
  if (normalizedDept === "hr") {
    return (
      <div>
        <HrDashboard />
      </div>
    );
  }

  // Managers get manager dashboard
  if (isManager) {
    return (
      <div>
        <ManagerDashboard />
      </div>
    );
  }

  // All other users (finance, operations, etc.) get staff dashboard
  return (
    <div>
      <StaffDashboard />
    </div>
  );
}
