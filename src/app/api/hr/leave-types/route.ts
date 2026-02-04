import { getLeaveTypes, createLeaveType } from "@/actions/hr/leaves";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  try {
    const leaveTypes = await getLeaveTypes();
    return NextResponse.json({ leaveTypes });
  } catch (error) {
    console.error("Error fetching leave types:", error);
    return NextResponse.json(
      { error: "Failed to fetch leave types" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, maxDays, requiresApproval } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Leave type name is required" },
        { status: 400 },
      );
    }

    const result = await createLeaveType({
      name,
      description,
      maxDays,
      requiresApproval,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error.reason }, { status: 400 });
    }

    return NextResponse.json({
      message: result.success?.reason,
      success: true,
    });
  } catch (error) {
    console.error("Error creating leave type:", error);
    return NextResponse.json(
      { error: "Failed to create leave type" },
      { status: 500 },
    );
  }
}
