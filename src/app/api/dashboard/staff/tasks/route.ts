import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { employees } from "@/db/schema/hr";
import { tasks } from "@/db/schema/tasks/tasks";
import { taskAssignees } from "@/db/schema/tasks/taskAssignees";
import { eq, and, inArray, or, ne, sql, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    const authUserId = session?.user?.id;

    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get employee info
    const employeeResult = await db
      .select({
        id: employees.id,
      })
      .from(employees)
      .where(eq(employees.authId, authUserId))
      .limit(1);

    const employee = employeeResult[0];
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    // Get tasks assigned to this employee (both directly and via assignees table)
    let assignedTaskIds: { taskId: number }[] = [];
    try {
      assignedTaskIds = await db
        .select({ taskId: taskAssignees.taskId })
        .from(taskAssignees)
        .where(eq(taskAssignees.employeeId, employee.id));
    } catch (error) {
      // If taskAssignees table doesn't exist or has issues, continue with direct assignment only
      console.error("Error fetching task assignees:", error);
    }

    const taskIds = assignedTaskIds.map((t) => t.taskId);

    // Build where clause - tasks assigned directly or via assignees table
    const whereClause: SQL<unknown> =
      taskIds.length > 0
        ? (or(eq(tasks.assignedTo, employee.id), inArray(tasks.id, taskIds)) ??
          eq(tasks.assignedTo, employee.id))
        : eq(tasks.assignedTo, employee.id);

    // Get active tasks (not completed) ordered by due date (soonest first, nulls last)
    const assignedTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .where(and(whereClause, ne(tasks.status, "Completed")))
      .orderBy(sql`${tasks.dueDate} ASC NULLS LAST, ${tasks.createdAt} DESC`)
      .limit(5);

    // Format tasks for display
    const formattedTasks = assignedTasks.map((task) => {
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      const now = new Date();
      let _daysLeft = null;
      let dueDateStr = "No due date";

      if (dueDate) {
        const diffTime = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        _daysLeft = diffDays;
        dueDateStr =
          diffDays > 0
            ? `${diffDays} day${diffDays !== 1 ? "s" : ""} left`
            : diffDays === 0
              ? "Due today"
              : `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""} overdue`;
      }

      return {
        id: task.id,
        title: task.title,
        dueDate: dueDateStr,
        priority: (task.priority || "medium").toLowerCase(),
        status: task.status === "In Progress" ? "in-progress" : "todo",
      };
    });

    return NextResponse.json({ tasks: formattedTasks });
  } catch (error) {
    console.error("Error fetching assigned tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch assigned tasks", tasks: [] },
      { status: 500 },
    );
  }
}
