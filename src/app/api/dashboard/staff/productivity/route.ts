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

    // Get date 28 days ago (4 weeks)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    fourWeeksAgo.setHours(0, 0, 0, 0);

    // Get tasks assigned to this employee, grouped by week
    // Use raw SQL since DATE_TRUNC is PostgreSQL specific
    // Only count tasks that were completed (status = 'Completed') and use updated_at to track when they were completed
    const taskData = await db.execute(sql`
      SELECT 
        DATE_TRUNC('week', updated_at)::date as week_start,
        COUNT(*)::int as completed
      FROM tasks
      WHERE assigned_to = ${employee.id}
        AND status = 'Completed'
        AND updated_at >= ${fourWeeksAgo}
      GROUP BY DATE_TRUNC('week', updated_at)
      ORDER BY week_start
    `);

    // Format data for chart - last 4 weeks
    const productivityData: Array<{ week: string; productivity: number }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Handle results - db.execute returns rows directly in node-postgres
    type TaskRow = {
      week_start?: string | Date;
      completed?: number | string;
    };
    const rows: TaskRow[] = Array.isArray(taskData)
      ? taskData
      : (taskData as { rows?: TaskRow[] })?.rows || [];
    const taskMap = new Map<string, number>();

    // Map database results by week start date
    for (const row of rows) {
      if (row?.week_start) {
        const weekStartKey = (row.week_start as string).split("T")[0];
        const completed = Number(row.completed || 0);
        // Calculate productivity score (completed tasks * 10, max 100)
        const productivity = Math.min(completed * 10, 100);
        taskMap.set(weekStartKey, productivity);
      }
    }

    // Fill in last 4 weeks starting from today
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - i * 7);

      // Get to Monday of this week
      const dayOfWeek = weekStart.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStart.setDate(weekStart.getDate() + daysToMonday);
      weekStart.setHours(0, 0, 0, 0);

      const weekNumber = 4 - i;
      const weekKey = `Week ${weekNumber}`;
      const weekStartKey = weekStart.toISOString().split("T")[0];
      const productivity = taskMap.get(weekStartKey) || 0;

      productivityData.push({
        week: weekKey,
        productivity,
      });
    }

    return NextResponse.json({ trends: productivityData });
  } catch (error) {
    console.error("Error fetching productivity trends:", error);
    return NextResponse.json(
      { error: "Failed to fetch productivity trends", trends: [] },
      { status: 500 },
    );
  }
}
