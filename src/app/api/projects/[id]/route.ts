import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/actions/auth/dal";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const id = Number(projectId);

    const isAdmin =
      user.role.toLowerCase() === "admin" ||
      user.department.toLowerCase() === "admin";

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
      with: {
        supervisor: {
          columns: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        contractor: {
          columns: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        creator: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          with: {
            employee: {
              columns: {
                id: true,
                name: true,
                email: true,
                role: true,
                department: true,
              },
            },
          },
        },
        milestones: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check access control
    const hasAccess =
      isAdmin ||
      project.creatorId === user.id ||
      project.supervisorId === user.id ||
      project.members.some((m) => m.employeeId === user.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have access to this project" },
        { status: 403 },
      );
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 },
    );
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

    const { id: projectId } = await params;
    const id = Number(projectId);

    const isAdmin =
      user.role.toLowerCase() === "admin" ||
      user.department.toLowerCase() === "admin";

    // Only admin or project creator can update
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    });

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!isAdmin && project.creatorId !== user.id) {
      return NextResponse.json(
        { error: "Only the creator or an admin can edit project details" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      name,
      code,
      description,
      location,
      supervisorId,
      budgetPlanned,
      budgetActual,
      status,
    } = body ?? {};

    const [updated] = await db
      .update(projects)
      .set({
        name,
        code,
        description,
        location,
        supervisorId: supervisorId ?? null,
        budgetPlanned:
          budgetPlanned !== undefined ? Number(budgetPlanned) : undefined,
        budgetActual:
          budgetActual !== undefined ? Number(budgetActual) : undefined,
        status,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();
    if (!updated)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ project: updated });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const id = Number(projectId);

    const isAdmin =
      user.role.toLowerCase() === "admin" ||
      user.department.toLowerCase() === "admin";

    // Only admin or project creator can delete
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    });

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!isAdmin && project.creatorId !== user.id) {
      return NextResponse.json(
        { error: "Only the creator or an admin can delete projects" },
        { status: 403 },
      );
    }

    const [_deleted] = await db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 },
    );
  }
}
