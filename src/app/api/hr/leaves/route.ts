import { getAllLeaveApplications, applyForLeave } from "@/actions/hr/leaves";
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
    const employeeIdParam = searchParams.get("employeeId");
    const employeeId = employeeIdParam ? Number(employeeIdParam) : undefined;
    const status = searchParams.get("status") || undefined;
    const leaveType = searchParams.get("leaveType") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const search = searchParams.get("search") || undefined;
    const pageParam = searchParams.get("page");
    const page = pageParam ? Number(pageParam) : 1;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 10;

    const result = await getAllLeaveApplications({
      employeeId,
      status,
      leaveType,
      startDate,
      endDate,
      search,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching leaves:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave applications" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { employeeId, leaveType, startDate, endDate, reason } = body;

    if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const result = await applyForLeave({
      employeeId,
      leaveType,
      startDate,
      endDate,
      reason,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error.reason }, { status: 400 });
    }

    return NextResponse.json({
      message: result.success?.reason,
      success: true,
    });
  } catch (error) {
    console.error("Error applying for leave:", error);
    return NextResponse.json(
      { error: "Failed to apply for leave" },
      { status: 500 },
    );
  }
}
