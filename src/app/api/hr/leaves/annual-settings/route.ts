import {
  getAllAnnualLeaveSettings,
  setAnnualLeaveAllocation,
} from "@/actions/hr/leaves";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  try {
    const settings = await getAllAnnualLeaveSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching annual leave settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch annual leave settings" },
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
    const { allocatedDays, year, description } = body;

    if (!allocatedDays || !year) {
      return NextResponse.json(
        { error: "Allocated days and year are required" },
        { status: 400 },
      );
    }

    const result = await setAnnualLeaveAllocation({
      allocatedDays,
      year,
      description,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error.reason }, { status: 400 });
    }

    return NextResponse.json({
      message: result.success?.reason,
      success: true,
    });
  } catch (error) {
    console.error("Error setting annual leave allocation:", error);
    return NextResponse.json(
      { error: "Failed to set annual leave allocation" },
      { status: 500 },
    );
  }
}
