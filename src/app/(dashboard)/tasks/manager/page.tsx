/** biome-ignore-all lint/style/noNonNullAssertion: <> */

import { getUser } from "@/actions/auth/dal";
import { db } from "@/db";
import { tasks, taskAssignees, employees } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TaskReviewActions } from "@/components/task/task-review-actions";

function formatDate(val?: unknown) {
  if (!val) return "N/A";
  try {
    const d = typeof val === "string" ? new Date(val) : (val as Date);
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(val);
  }
}

type ReviewTask = {
  id: number;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  createdAt: Date;
  assignees: { id: number; name: string | null; email: string | null }[];
};

const ManagerReviewPage = async () => {
  const employee = await getUser();

  if (!employee?.id) {
    return (
      <div className="p-2">
        <p>Please log in to view this page.</p>
      </div>
    );
  }

  // Fetch tasks in Review status that this manager created
  const reviewTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.assignedBy, employee.id))
    .then((allTasks) => allTasks.filter((t) => t.status === "Review"));

  // Get assignees for these tasks
  const taskIds = reviewTasks.map((t) => t.id);
  const assigneesMap = new Map<
    number,
    { id: number; name: string | null; email: string | null }[]
  >();

  if (taskIds.length > 0) {
    const assigneesRows = await db
      .select({
        taskId: taskAssignees.taskId,
        id: employees.id,
        name: employees.name,
        email: employees.email,
      })
      .from(taskAssignees)
      .leftJoin(employees, eq(employees.id, taskAssignees.employeeId))
      .where(inArray(taskAssignees.taskId, taskIds));

    for (const r of assigneesRows) {
      const list = assigneesMap.get(r.taskId) ?? [];
      list.push({ id: r.id!, name: r.name, email: r.email });
      assigneesMap.set(r.taskId, list);
    }
  }

  const tasksWithAssignees: ReviewTask[] = reviewTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    dueDate: t.dueDate,
    createdAt: t.createdAt,
    assignees: assigneesMap.get(t.id) || [],
  }));

  return (
    <div className="p-2 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold">Review</h2>
            <p className="text-sm text-muted-foreground">
              Review tasks submitted by your team. Accept to mark as completed,
              or reject with feedback to send back to Todo.
            </p>
          </div>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Assignees</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasksWithAssignees.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{task.title}</p>
                  {task.description && (
                    <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                      {task.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {task.assignees.length > 0 ? (
                  <div className="space-y-1">
                    {task.assignees.map((a) => (
                      <div key={a.id} className="text-sm">
                        {a.name || a.email}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </TableCell>
              <TableCell>
                <span
                  className={
                    task.priority === "Urgent"
                      ? "text-pink-600"
                      : task.priority === "High"
                        ? "text-red-600"
                        : task.priority === "Medium"
                          ? "text-cyan-600"
                          : "text-gray-600"
                  }
                >
                  {task.priority}
                </span>
              </TableCell>
              <TableCell>{formatDate(task.dueDate)}</TableCell>
              <TableCell>{formatDate(task.createdAt)}</TableCell>
              <TableCell className="text-right">
                <TaskReviewActions taskId={task.id} employeeId={employee.id} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableCaption>
          {tasksWithAssignees.length === 0
            ? "No tasks pending review."
            : `${tasksWithAssignees.length} task${tasksWithAssignees.length === 1 ? "" : "s"} pending review.`}
        </TableCaption>
      </Table>
    </div>
  );
};

export default ManagerReviewPage;
