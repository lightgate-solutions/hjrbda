import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { employees } from "@/db/schema/hr";
import { eq, sql } from "drizzle-orm";
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

    // Get date 28 days ago (4 weeks)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    fourWeeksAgo.setHours(0, 0, 0, 0);

    // Get tasks assigned by this manager, grouped by week
    // Use raw SQL since DATE_TRUNC is PostgreSQL specific
    const taskData = await db.execute(sql`
      SELECT 
        DATE_TRUNC('week', created_at)::date as week_start,
        COUNT(*) FILTER (WHERE status = 'Completed') as completed,
        COUNT(*) FILTER (WHERE status = 'In Progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'Pending') as pending
      FROM tasks
      WHERE assigned_by = ${employee.id}
        AND created_at >= ${fourWeeksAgo}
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week_start
    `);

    // Format data for chart - last 4 weeks
    const performanceData: Array<{
      week: string;
      completed: number;
      inProgress: number;
      pending: number;
    }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Handle results - db.execute returns rows directly in node-postgres
    // Check if it's an array or has rows property
    type TaskRow = {
      week_start?: string | Date;
      completed?: number | string;
      in_progress?: number | string;
      pending?: number | string;
    };
    const rows: TaskRow[] = Array.isArray(taskData)
      ? taskData
      : (taskData as { rows?: TaskRow[] })?.rows || [];
    const taskMap = new Map<
      string,
      { completed: number; inProgress: number; pending: number }
    >();

    // Map database results by week start date (PostgreSQL DATE_TRUNC uses Monday as week start)
    for (const row of rows) {
      if (row?.week_start) {
        // PostgreSQL returns date as string in YYYY-MM-DD format
        const weekStartKey = (row.week_start as string).split("T")[0];
        taskMap.set(weekStartKey, {
          completed: Number(row.completed || 0),
          inProgress: Number(row.in_progress || 0),
          pending: Number(row.pending || 0),
        });
      }
    }

    // Fill in last 4 weeks starting from today
    // PostgreSQL DATE_TRUNC('week', ...) uses Monday as the start of the week
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(today);
      // Calculate the Monday of the week that is i weeks ago
      weekStart.setDate(weekStart.getDate() - i * 7);

      // Get to Monday of this week (PostgreSQL week starts on Monday)
      const dayOfWeek = weekStart.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
      weekStart.setDate(weekStart.getDate() + daysToMonday);
      weekStart.setHours(0, 0, 0, 0);

      const weekNumber = 4 - i;
      const weekKey = `Week ${weekNumber}`;
      const weekStartKey = weekStart.toISOString().split("T")[0]; // YYYY-MM-DD format
      const data = taskMap.get(weekStartKey) || {
        completed: 0,
        inProgress: 0,
        pending: 0,
      };

      performanceData.push({
        week: weekKey,
        ...data,
      });
    }

    return NextResponse.json({ performance: performanceData });
  } catch (error) {
    console.error("Error fetching team performance:", error);
    return NextResponse.json(
      { error: "Failed to fetch team performance", performance: [] },
      { status: 500 },
    );
  }
}
