/** biome-ignore-all lint/a11y/useValidAriaRole: <> */
import { getUser } from "@/actions/auth/dal";
import { TaskBoardContainer } from "@/components/task/task-board-container";
import { redirect } from "next/navigation";

export default async function EmployeeTasksPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return <TaskBoardContainer employeeId={user.id} role="employee" />;
}
