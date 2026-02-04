import { getUser } from "@/actions/auth/dal";
import { TaskBoardContainer } from "@/components/task/task-board-container";
import { redirect } from "next/navigation";

export default async function ManagerTasksPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <TaskBoardContainer
      employeeId={user.id}
      role={user.isManager ? "manager" : "employee"}
    />
  );
}
