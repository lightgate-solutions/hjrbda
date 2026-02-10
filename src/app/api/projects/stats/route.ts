import { db } from "@/db";
import { expenses, projects, projectMembers } from "@/db/schema";
import { and, eq, ilike, or, exists, sql, type SQL } from "drizzle-orm";
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
        ilike(projects.street, `%${q}%`),
        ilike(projects.city, `%${q}%`),
        ilike(projects.state, `%${q}%`),
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

    // Use SQL aggregation instead of loading all rows into memory
    const [projectStats] = await db
      .select({
        total: sql<number>`count(*)`,
        actual: sql<number>`coalesce(sum(${projects.budgetPlanned}), 0)`,
      })
      .from(projects)
      .where(where);

    // Use a subquery to sum expenses only for matching projects
    const [expenseStats] = await db
      .select({
        total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(
        exists(
          db
            .select({ id: projects.id })
            .from(projects)
            .where(
              and(
                eq(projects.id, expenses.projectId),
                ...(where ? [where] : []),
              ),
            ),
        ),
      );

    return NextResponse.json(
      {
        total: Number(projectStats.total),
        actual: Number(projectStats.actual),
        expenses: Number(expenseStats.total),
      },
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
