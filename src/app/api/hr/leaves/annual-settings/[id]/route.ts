import { deleteAnnualLeaveSetting } from "@/actions/hr/leaves";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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
    const settingId = Number(id);
    if (Number.isNaN(settingId)) {
      return NextResponse.json(
        { error: "Invalid setting ID" },
        { status: 400 },
      );
    }

    const result = await deleteAnnualLeaveSetting(settingId);

    if (result.error) {
      return NextResponse.json({ error: result.error.reason }, { status: 400 });
    }

    return NextResponse.json({
      message: result.success?.reason,
      success: true,
    });
  } catch (error) {
    console.error("Error deleting annual leave setting:", error);
    return NextResponse.json(
      { error: "Failed to delete annual leave setting" },
      { status: 500 },
    );
  }
}
