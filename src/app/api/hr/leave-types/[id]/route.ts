import { updateLeaveType, deleteLeaveType } from "@/actions/hr/leaves";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const leaveTypeId = Number(id);
    if (Number.isNaN(leaveTypeId)) {
      return NextResponse.json(
        { error: "Invalid leave type ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { updates } = body;

    const result = await updateLeaveType(leaveTypeId, updates);

    if (result.error) {
      return NextResponse.json({ error: result.error.reason }, { status: 400 });
    }

    return NextResponse.json({
      message: result.success?.reason,
      success: true,
    });
  } catch (error) {
    console.error("Error updating leave type:", error);
    return NextResponse.json(
      { error: "Failed to update leave type" },
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
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const leaveTypeId = Number(id);
    if (Number.isNaN(leaveTypeId)) {
      return NextResponse.json(
        { error: "Invalid leave type ID" },
        { status: 400 },
      );
    }

    const result = await deleteLeaveType(leaveTypeId);

    if (result.error) {
      return NextResponse.json({ error: result.error.reason }, { status: 400 });
    }

    return NextResponse.json({
      message: result.success?.reason,
      success: true,
    });
  } catch (error) {
    console.error("Error deleting leave type:", error);
    return NextResponse.json(
      { error: "Failed to delete leave type" },
      { status: 500 },
    );
  }
}
