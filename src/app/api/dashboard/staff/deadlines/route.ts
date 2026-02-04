import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { employees } from "@/db/schema/hr";
import { tasks } from "@/db/schema/tasks/tasks";
import { projects } from "@/db/schema/projects";
import { taskAssignees } from "@/db/schema/tasks/taskAssignees";
import { eq, and, inArray, or, ne, sql, asc, type SQL } from "drizzle-orm";
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

    // Get tasks assigned to this employee with due dates (both directly and via assignees table)
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

    // Build where clause for tasks
    const taskWhereClause: SQL<unknown> =
      taskIds.length > 0
        ? (or(eq(tasks.assignedTo, employee.id), inArray(tasks.id, taskIds)) ??
          eq(tasks.assignedTo, employee.id))
        : eq(tasks.assignedTo, employee.id);

    // Get upcoming tasks with due dates (next 30 days or overdue, not completed)
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    thirtyDaysFromNow.setHours(23, 59, 59, 999);

    const upcomingTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        dueDate: tasks.dueDate,
        status: tasks.status,
      })
      .from(tasks)
      .where(
        and(
          taskWhereClause,
          ne(tasks.status, "Completed"),
          sql`${tasks.dueDate} IS NOT NULL`,
          sql`${tasks.dueDate} <= ${thirtyDaysFromNow}`,
        ),
      )
      .orderBy(asc(tasks.dueDate))
      .limit(15);

    // Get projects assigned to this employee (if any project assignment exists)
    // For now, we'll use projects where employee is supervisor or member
    // This might need adjustment based on your project assignment schema
    const upcomingProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .where(
        and(
          ne(projects.status, "completed"),
          sql`${projects.createdAt} IS NOT NULL`,
        ),
      )
      .orderBy(asc(projects.createdAt))
      .limit(5);

    // Format deadlines
    const deadlines = [];

    // Add tasks as deadlines (include overdue tasks and tasks due within 30 days)
    for (const task of upcomingTasks) {
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const diffTime = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const dateStr = dueDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        deadlines.push({
          id: task.id,
          title: task.title,
          date: dateStr,
          daysLeft: Math.max(diffDays, 0), // Show 0 for overdue tasks instead of negative
          category: "Task",
        });
      }
    }

    // Add projects as deadlines (using created date + 30 days as estimated due date)
    for (const project of upcomingProjects) {
      const createdDate = new Date(project.createdAt);
      const estimatedDueDate = new Date(createdDate);
      estimatedDueDate.setDate(estimatedDueDate.getDate() + 30);
      const diffTime = estimatedDueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const dateStr = estimatedDueDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      deadlines.push({
        id: project.id,
        title: project.name,
        date: dateStr,
        daysLeft: diffDays,
        category: "Project",
      });
    }

    // Sort by days left and limit to 5
    deadlines.sort((a, b) => a.daysLeft - b.daysLeft);
    const topDeadlines = deadlines.slice(0, 5);

    return NextResponse.json({ deadlines: topDeadlines });
  } catch (error) {
    console.error("Error fetching upcoming deadlines:", error);
    return NextResponse.json(
      { error: "Failed to fetch upcoming deadlines", deadlines: [] },
      { status: 500 },
    );
  }
}
