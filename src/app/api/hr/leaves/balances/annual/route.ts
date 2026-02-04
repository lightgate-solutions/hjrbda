import { db } from "@/db";
import { leaveBalances, employees } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const pageParam = searchParams.get("page");
    const page = pageParam ? Number(pageParam) : 1;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 10;
    const offset = (page - 1) * limit;

    // Get current year for filtering
    const currentYear = new Date().getFullYear();
    const yearParamStr = searchParams.get("year");
    const yearParam = yearParamStr ? Number(yearParamStr) : currentYear;

    // Get total count for this year
    const totalResult = await db
      .select({ count: count() })
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.leaveType, "Annual"),
          eq(leaveBalances.year, yearParam),
        ),
      );

    const total = totalResult[0]?.count || 0;

    // Get paginated results
    const balances = await db
      .select({
        id: leaveBalances.id,
        employeeId: leaveBalances.employeeId,
        employeeName: employees.name,
        employeeEmail: employees.email,
        totalDays: leaveBalances.totalDays,
        usedDays: leaveBalances.usedDays,
        remainingDays: leaveBalances.remainingDays,
        year: leaveBalances.year,
      })
      .from(leaveBalances)
      .leftJoin(employees, eq(leaveBalances.employeeId, employees.id))
      .where(
        and(
          eq(leaveBalances.leaveType, "Annual"),
          eq(leaveBalances.year, yearParam),
        ),
      )
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      balances,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching annual leave balances:", error);
    return NextResponse.json(
      { error: "Failed to fetch annual leave balances" },
      { status: 500 },
    );
  }
}
