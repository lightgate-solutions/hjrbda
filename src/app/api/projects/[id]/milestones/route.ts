import { db } from "@/db";
import { milestones } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getProject } from "@/actions/projects";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const projectId = Number(id);

    // Check access
    await getProject(projectId);

    const rows = await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, projectId));
    return NextResponse.json({ milestones: rows });
  } catch (error: any) {
    console.error("Error fetching milestones:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch milestones" },
      { status: error.message?.includes("access") ? 403 : 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const projectId = Number(id);

    // Check access
    await getProject(projectId);

    const body = await request.json();
    const { title, description, dueDate } = body ?? {};
    if (!title)
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    const [created] = await db
      .insert(milestones)
      .values({
        projectId,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        completed: 0,
      })
      .returning();
    return NextResponse.json({ milestone: created }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating milestone:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create milestone" },
      { status: error.message?.includes("access") ? 403 : 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const projectId = Number(id);

    // Check access
    await getProject(projectId);

    const body = await request.json();
    const {
      id: milestoneId,
      title,
      description,
      dueDate,
      completed,
    } = body ?? {};
    if (!milestoneId)
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    const [updated] = await db
      .update(milestones)
      .set({
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        completed: completed ? 1 : 0,
      })
      .where(
        and(
          eq(milestones.projectId, projectId),
          eq(milestones.id, Number(milestoneId)),
        ),
      )
      .returning();
    return NextResponse.json({ milestone: updated });
  } catch (error: any) {
    console.error("Error updating milestone:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update milestone" },
      { status: error.message?.includes("access") ? 403 : 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const projectId = Number(id);

    // Check access
    await getProject(projectId);

    const body = await request.json();
    const { id: milestoneId } = body ?? {};
    if (!milestoneId)
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    await db
      .delete(milestones)
      .where(
        and(
          eq(milestones.projectId, projectId),
          eq(milestones.id, Number(milestoneId)),
        ),
      );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting milestone:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete milestone" },
      { status: error.message?.includes("access") ? 403 : 500 },
    );
  }
}
