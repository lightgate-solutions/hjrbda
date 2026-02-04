import { getLeaveBalance } from "@/actions/hr/leaves";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get("employeeId");
    const yearParam = searchParams.get("year");
    const year = yearParam ? Number(yearParam) : undefined;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 },
      );
    }

    const balances = await getLeaveBalance(Number(employeeId), year);

    return NextResponse.json({ balances });
  } catch (error) {
    console.error("Error fetching leave balances:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave balances" },
      { status: 500 },
    );
  }
}

// POST method removed - annual leave balances are now managed through
// the global annual leave settings API at /api/hr/leaves/annual-settings
// Individual employee balances are automatically calculated from approved leaves
