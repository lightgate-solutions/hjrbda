import { db } from "@/db";
import { milestones, projects, projectMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/actions/auth/dal";

async function checkProjectAccess(
  projectId: number,
  userId: number,
  isAdmin: boolean,
) {
  if (isAdmin) return true;

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: {
      members: {
        where: eq(projectMembers.employeeId, userId),
      },
    },
  });

  if (!project) return false;

  return (
    project.creatorId === userId ||
    project.supervisorId === userId ||
    project.members.length > 0
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const projectId = Number(id);

    const isAdmin =
      user.role.toLowerCase() === "admin" ||
      user.department.toLowerCase() === "admin";

    // Check access
    const hasAccess = await checkProjectAccess(projectId, user.id, isAdmin);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to this project" },
        { status: 403 },
      );
    }

    const rows = await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, projectId));
    return NextResponse.json({ milestones: rows });
  } catch (error: unknown) {
    console.error("Error fetching milestones:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch milestones";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const projectId = Number(id);

    const isAdmin =
      user.role.toLowerCase() === "admin" ||
      user.department.toLowerCase() === "admin";

    // Check access
    const hasAccess = await checkProjectAccess(projectId, user.id, isAdmin);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to this project" },
        { status: 403 },
      );
    }

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
  } catch (error: unknown) {
    console.error("Error creating milestone:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create milestone";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const projectId = Number(id);

    const isAdmin =
      user.role.toLowerCase() === "admin" ||
      user.department.toLowerCase() === "admin";

    // Check access
    const hasAccess = await checkProjectAccess(projectId, user.id, isAdmin);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to this project" },
        { status: 403 },
      );
    }

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
  } catch (error: unknown) {
    console.error("Error updating milestone:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update milestone";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const projectId = Number(id);

    const isAdmin =
      user.role.toLowerCase() === "admin" ||
      user.department.toLowerCase() === "admin";

    // Check access
    const hasAccess = await checkProjectAccess(projectId, user.id, isAdmin);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to this project" },
        { status: 403 },
      );
    }

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
  } catch (error: unknown) {
    console.error("Error deleting milestone:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete milestone";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
