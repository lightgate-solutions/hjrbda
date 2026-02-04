import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { employees } from "@/db/schema/hr";
import { tasks } from "@/db/schema/tasks/tasks";
import { eq, and, sql, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    const authUserId = session?.user?.id;

    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get manager employee info
    const employeeResult = await db
      .select({
        id: employees.id,
        isManager: employees.isManager,
      })
      .from(employees)
      .where(eq(employees.authId, authUserId))
      .limit(1);

    const employee = employeeResult[0];
    if (!employee || !employee.isManager) {
      return NextResponse.json(
        { error: "Forbidden - Manager access required" },
        { status: 403 },
      );
    }

    // Get subordinates (team members)
    const subordinates = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        department: employees.department,
        role: employees.role,
      })
      .from(employees)
      .where(
        and(
          eq(employees.managerId, employee.id),
          eq(employees.isManager, false),
        ),
      );

    // Get task counts for each team member
    const teamMemberIds = subordinates.map((s) => s.id);

    if (teamMemberIds.length === 0) {
      return NextResponse.json({ teamMembers: [] });
    }

    // Get completed tasks for each team member in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Get task stats for each team member
    const taskStats = await db
      .select({
        employeeId: tasks.assignedTo,
        tasksCompleted: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'Completed' AND ${tasks.createdAt} >= ${thirtyDaysAgo})`,
        totalCompleted: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'Completed')`,
      })
      .from(tasks)
      .where(
        and(
          inArray(tasks.assignedTo, teamMemberIds),
          eq(tasks.assignedBy, employee.id),
        ),
      )
      .groupBy(tasks.assignedTo);

    // Calculate performance for each team member
    const taskMap = new Map<
      number,
      { tasksCompleted: number; totalCompleted: number }
    >();

    for (const row of taskStats) {
      taskMap.set(Number(row.employeeId), {
        tasksCompleted: Number(row.tasksCompleted || 0),
        totalCompleted: Number(row.totalCompleted || 0),
      });
    }

    // Get total tasks assigned to each member to calculate performance
    const totalTasksByMember = await db
      .select({
        employeeId: tasks.assignedTo,
        totalTasks: sql<number>`COUNT(*)`,
      })
      .from(tasks)
      .where(
        and(
          inArray(tasks.assignedTo, teamMemberIds),
          eq(tasks.assignedBy, employee.id),
        ),
      )
      .groupBy(tasks.assignedTo);

    const totalTasksMap = new Map<number, number>();
    for (const row of totalTasksByMember) {
      totalTasksMap.set(Number(row.employeeId), Number(row.totalTasks || 0));
    }

    // Format team members with performance
    const teamMembers = subordinates.map((member) => {
      const stats = taskMap.get(member.id) || {
        tasksCompleted: 0,
        totalCompleted: 0,
      };
      const totalTasks = totalTasksMap.get(member.id) || 0;

      // Calculate performance as percentage based on completion rate
      // Use a weighted calculation: (completed in 30 days / total tasks assigned) * 100
      // If no tasks assigned, performance is 0%
      const performance =
        totalTasks > 0
          ? Math.min(Math.round((stats.tasksCompleted / totalTasks) * 100), 100)
          : 0;

      return {
        id: member.id,
        name: member.name || "Unknown",
        role: member.role || member.department || "Team Member",
        tasksCompleted: stats.tasksCompleted,
        performance: `${Math.min(performance, 100)}%`,
      };
    });

    // Sort by tasks completed (descending)
    teamMembers.sort((a, b) => b.tasksCompleted - a.tasksCompleted);

    return NextResponse.json({ teamMembers });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members", teamMembers: [] },
      { status: 500 },
    );
  }
}
