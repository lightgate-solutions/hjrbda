import {
  getLeaveApplication,
  updateLeaveApplication,
  deleteLeaveApplication,
} from "@/actions/hr/leaves";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const leaveId = Number(id);
    if (Number.isNaN(leaveId)) {
      return NextResponse.json({ error: "Invalid leave ID" }, { status: 400 });
    }

    const leave = await getLeaveApplication(leaveId);
    if (!leave) {
      return NextResponse.json({ error: "Leave not found" }, { status: 404 });
    }

    return NextResponse.json({ leave });
  } catch (error) {
    console.error("Error fetching leave:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave application" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const leaveId = Number(id);
    if (Number.isNaN(leaveId)) {
      return NextResponse.json({ error: "Invalid leave ID" }, { status: 400 });
    }

    const body = await request.json();
    const { leaveType, startDate, endDate, reason } = body;

    // Calculate total days (excluding weekends)
    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalDays = 0;
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        totalDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    const updates = {
      leaveType,
      startDate: new Date(startDate).toDateString(),
      endDate: new Date(endDate).toDateString(),
      reason,
      totalDays,
    };

    const result = await updateLeaveApplication(leaveId, updates);

    if (result.error) {
      return NextResponse.json({ error: result.error.reason }, { status: 400 });
    }

    return NextResponse.json({
      message: result.success?.reason,
      success: true,
    });
  } catch (error) {
    console.error("Error updating leave:", error);
    return NextResponse.json(
      { error: "Failed to update leave application" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const leaveId = Number(id);
    if (Number.isNaN(leaveId)) {
      return NextResponse.json({ error: "Invalid leave ID" }, { status: 400 });
    }

    const body = await request.json();
    const { updates } = body;

    // Get approver employee ID from session
    let approverId: number | undefined;
    if (updates.status === "Approved" || updates.status === "Rejected") {
      const authUserId = session.user.id;
      const [approver] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.authId, authUserId))
        .limit(1);
      approverId = approver?.id;
    }

    const result = await updateLeaveApplication(leaveId, updates, approverId);

    if (result.error) {
      return NextResponse.json({ error: result.error.reason }, { status: 400 });
    }

    return NextResponse.json({
      message: result.success?.reason,
      success: true,
    });
  } catch (error) {
    console.error("Error updating leave:", error);
    return NextResponse.json(
      { error: "Failed to update leave application" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const leaveId = Number(id);
    if (Number.isNaN(leaveId)) {
      return NextResponse.json({ error: "Invalid leave ID" }, { status: 400 });
    }

    const result = await deleteLeaveApplication(leaveId);

    if (result.error) {
      return NextResponse.json({ error: result.error.reason }, { status: 400 });
    }

    return NextResponse.json({
      message: result.success?.reason,
      success: true,
    });
  } catch (error) {
    console.error("Error deleting leave:", error);
    return NextResponse.json(
      { error: "Failed to delete leave application" },
      { status: 500 },
    );
  }
}
