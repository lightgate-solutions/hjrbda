/** biome-ignore-all lint/a11y/useValidAriaRole: <> */
import { getUser } from "@/actions/auth/dal";
import { TaskBoardContainer } from "@/components/task/task-board-container";
import { redirect } from "next/navigation";

export default async function AdminTasksPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is admin (by role or department)
  if (user.role !== "admin" && user.department !== "admin") {
    redirect("/tasks/employee");
  }

  return <TaskBoardContainer employeeId={user.id} role="admin" />;
}
