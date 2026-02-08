import { getUser } from "@/actions/auth/dal";
import { getUserPreferences } from "@/actions/user-preferences/preferences";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import HrDashboard from "@/components/dashboard/HrDashboard";
import StaffDashboard from "@/components/dashboard/StaffDashboard";
import ManagerDashboard from "@/components/dashboard/ManagerDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please log in to access the dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check user preferences for defaultView (gracefully handle if table doesn't exist)
  let defaultView = "dashboard";
  try {
    const preferences = await getUserPreferences();
    defaultView = preferences?.defaultView || "dashboard";
  } catch {
    // If preferences can't be loaded, default to dashboard view
  }

  // If user has set a defaultView preference and it's not "dashboard", redirect them
  if (defaultView && defaultView !== "dashboard") {
    switch (defaultView) {
      case "documents":
        redirect("/documents");
        break;
      case "tasks":
        // Task/Performance module removed; redirect to dashboard
        redirect("/");
        break;
      case "projects":
        redirect("/projects");
        break;
      case "mail":
        redirect("/mail/inbox");
        break;
      default:
        // If invalid defaultView, continue to show dashboard
        break;
    }
  }

  // Normalize role to lowercase and trim for comparison
  const normalizedRole = user.role?.toLowerCase().trim() || "staff";
  const isManager = user.isManager || false;

  // Priority: Admin > Manager (if isManager flag) > Role-based > Default Staff

  // Admin always gets admin dashboard
  if (normalizedRole === "admin") {
    return <AdminDashboard employeeId={user.id} />;
  }

  // If user has manager flag and is not admin, show manager dashboard
  if (isManager) {
    return <ManagerDashboard />;
  }

  // Role-based dashboards
  switch (normalizedRole) {
    case "hr":
    case "human resources":
    case "humanresource":
    case "human-resources":
      return <HrDashboard />;

    case "finance":
    case "accounting":
    case "accountant":
      return <StaffDashboard />;

    default:
      // Default fallback: Show staff dashboard for any unrecognized role
      // This ensures ALL users get a dashboard, even if their role is not explicitly handled
      // Handles: "staff", "employee", "user", "", null, undefined, and any other values
      return <StaffDashboard />;
  }
}
