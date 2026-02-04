import { db } from "@/db";
import { leaveBalances } from "@/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
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
    const balanceId = Number(id);
    if (Number.isNaN(balanceId)) {
      return NextResponse.json(
        { error: "Invalid balance ID" },
        { status: 400 },
      );
    }

    await db.delete(leaveBalances).where(eq(leaveBalances.id, balanceId));

    return NextResponse.json({
      message: "Annual leave balance deleted successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error deleting annual leave balance:", error);
    return NextResponse.json(
      { error: "Failed to delete annual leave balance" },
      { status: 500 },
    );
  }
}
