import { db } from "@/db";
import { expenses, projects, projectMembers } from "@/db/schema";
import { and, eq, ilike, or, inArray, exists, type SQL } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/actions/auth/dal";

export async function GET(request: NextRequest) {
  try {
    const { employee } = await requireAuth();
    const isAdmin =
      employee.role.toLowerCase() === "admin" ||
      employee.department.toLowerCase() === "admin";

    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q") || "";
    const status = searchParams.get("status") || "";

    let where: SQL | undefined;
    if (q) {
      where = or(
        ilike(projects.name, `%${q}%`),
        ilike(projects.code, `%${q}%`),
        ilike(projects.location, `%${q}%`),
      );
    }

    if (!isAdmin) {
      const accessFilter = or(
        eq(projects.creatorId, employee.id),
        eq(projects.supervisorId, employee.id),
        exists(
          db
            .select()
            .from(projectMembers)
            .where(
              and(
                eq(projectMembers.projectId, projects.id),
                eq(projectMembers.employeeId, employee.id),
              ),
            ),
        ),
      );
      where = where ? and(where, accessFilter) : accessFilter;
    }

    if (status && status !== "all") {
      where = where
        ? and(
            where,
            eq(
              projects.status,
              status as "pending" | "in-progress" | "completed",
            ),
          )
        : eq(
            projects.status,
            status as "pending" | "in-progress" | "completed",
          );
    }

    const rows = await db.select().from(projects).where(where);
    const total = rows.length;
    const actual = rows.reduce((acc, p) => acc + (p.budgetPlanned ?? 0), 0);

    let expensesTotal = 0;
    if (rows.length > 0) {
      const ids = rows.map((p) => p.id);
      const exps = await db
        .select()
        .from(expenses)
        .where(inArray(expenses.projectId, ids));
      expensesTotal = exps.reduce((acc, e) => acc + (e.amount ?? 0), 0);
    }

    return NextResponse.json(
      { total, actual, expenses: expensesTotal },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error fetching project stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
