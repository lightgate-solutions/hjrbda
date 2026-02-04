import { db } from "@/db";
import { employees } from "@/db/schema/hr";
import { tasks } from "@/db/schema/tasks/tasks";
import { auth } from "@/lib/auth";
import { and, eq, ne, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const h = Object.fromEntries(request.headers);
    const session = await auth.api.getSession({ headers: h });
    const authUserId = session?.user?.id;
    const role = session?.user?.role;
    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve employee to determine scope (employee vs manager)
    const me = await db
      .select({ id: employees.id, isManager: employees.isManager })
      .from(employees)
      .where(eq(employees.authId, authUserId))
      .limit(1)
      .then((r) => r[0]);

    // Build where clause based on role
    const scopeWhere =
      role === "admin"
        ? undefined
        : me?.isManager
          ? eq(tasks.assignedBy, me.id)
          : eq(tasks.assignedTo, me?.id ?? -1);

    // active: not Completed
    const activeWhere = scopeWhere
      ? and(scopeWhere, ne(tasks.status, "Completed"))
      : ne(tasks.status, "Completed");
    const pendingWhere = scopeWhere
      ? and(scopeWhere, eq(tasks.status, "Todo"))
      : eq(tasks.status, "Todo");
    const inProgressWhere = scopeWhere
      ? and(scopeWhere, eq(tasks.status, "In Progress"))
      : eq(tasks.status, "In Progress");

    const activeRow = await db
      .select({ c: sql<number>`count(*)` })
      .from(tasks)
      .where(activeWhere)
      .limit(1)
      .then((r) => r[0]);
    const pendingRow = await db
      .select({ c: sql<number>`count(*)` })
      .from(tasks)
      .where(pendingWhere)
      .limit(1)
      .then((r) => r[0]);
    const inProgressRow = await db
      .select({ c: sql<number>`count(*)` })
      .from(tasks)
      .where(inProgressWhere)
      .limit(1)
      .then((r) => r[0]);

    const active = Number(activeRow?.c ?? 0);
    const pending = Number(pendingRow?.c ?? 0);
    const inProgress = Number(inProgressRow?.c ?? 0);

    return NextResponse.json(
      { active, pending, inProgress },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error fetching task stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
