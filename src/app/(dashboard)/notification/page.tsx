import { requireAuth } from "@/actions/auth/dal";
import NotificationsClient from "./notifications-client";

export default async function NotificationsPage() {
  const authData = await requireAuth();
  const employeeId = authData.employee.id;

  return <NotificationsClient employeeId={employeeId} />;
}
