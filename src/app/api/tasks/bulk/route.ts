import { db } from "@/db";
import { tasks } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, taskIds, userId, role } = body;

    if (!userId || !taskIds || !Array.isArray(taskIds)) {
      return NextResponse.json(
        { error: "userId and taskIds array are required" },
        { status: 400 },
      );
    }

    if (action === "delete") {
      // Build condition based on user role
      if (role !== "manager")
        return NextResponse.json(
          {
            error: "Only managers can delete tasks",
          },
          { status: 403 },
        );

      const deleted = await db
        .delete(tasks)
        .where(and(inArray(tasks.id, taskIds), eq(tasks.assignedBy, userId)))
        .returning();

      return NextResponse.json({
        message: `${deleted.length} task(s) deleted successfully`,
        deletedCount: deleted.length,
        deletedIds: deleted.map((t) => t.id),
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error performing bulk operation:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk operation" },
      { status: 500 },
    );
  }
}
