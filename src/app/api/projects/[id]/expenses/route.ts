import { db } from "@/db";
import { expenses, projects, projectMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { createNotification } from "@/actions/notification/notification";
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
      .from(expenses)
      .where(eq(expenses.projectId, projectId));
    return NextResponse.json({ expenses: rows });
  } catch (error: unknown) {
    console.error("Error fetching expenses:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch expenses";
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
    const { title, amount, spentAt, notes } = body ?? {};
    if (!title)
      return NextResponse.json({ error: "title is required" }, { status: 400 });

    const [created] = await db
      .insert(expenses)
      .values({
        projectId,
        title,
        amount: Number(amount) || 0,
        spentAt: spentAt ? new Date(spentAt) : null,
        notes,
      })
      .returning();

    // Notify project supervisor about new expense
    const [project] = await db
      .select({
        supervisorId: projects.supervisorId,
        name: projects.name,
        code: projects.code,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (project?.supervisorId) {
      await createNotification({
        user_id: project.supervisorId,
        title: "New Project Expense",
        message: `${user.name} added expense "${title}" (₦${Number(amount).toLocaleString()}) to project ${project.name} (${project.code})`,
        notification_type: "message",
        reference_id: projectId,
      });
    }

    return NextResponse.json({ expense: created }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating expense:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create expense";
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
    const { id: expenseId, title, amount, spentAt, notes } = body ?? {};
    if (!expenseId)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    // Get expense details before update
    const [existingExpense] = await db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.projectId, projectId),
          eq(expenses.id, Number(expenseId)),
        ),
      )
      .limit(1);

    const [updated] = await db
      .update(expenses)
      .set({
        title,
        amount: amount !== undefined ? Number(amount) : undefined,
        spentAt: spentAt ? new Date(spentAt) : null,
        notes,
      })
      .where(
        and(
          eq(expenses.projectId, projectId),
          eq(expenses.id, Number(expenseId)),
        ),
      )
      .returning();

    // Notify project supervisor about expense update
    const [project] = await db
      .select({
        supervisorId: projects.supervisorId,
        name: projects.name,
        code: projects.code,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (project?.supervisorId && existingExpense) {
      await createNotification({
        user_id: project.supervisorId,
        title: "Project Expense Updated",
        message: `${user.name} updated expense "${existingExpense.title}" in project ${project.name} (${project.code})`,
        notification_type: "message",
        reference_id: projectId,
      });
    }

    return NextResponse.json({ expense: updated });
  } catch (error: unknown) {
    console.error("Error updating expense:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update expense";
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
    const { id: expenseId } = body ?? {};
    if (!expenseId)
      return NextResponse.json({ error: "id is required" }, { status: 400 });

    // Get expense details before deletion
    const [expenseToDelete] = await db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.projectId, projectId),
          eq(expenses.id, Number(expenseId)),
        ),
      )
      .limit(1);

    await db
      .delete(expenses)
      .where(
        and(
          eq(expenses.projectId, projectId),
          eq(expenses.id, Number(expenseId)),
        ),
      );

    // Notify project supervisor about expense deletion
    const [project] = await db
      .select({
        supervisorId: projects.supervisorId,
        name: projects.name,
        code: projects.code,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (project?.supervisorId && expenseToDelete) {
      await createNotification({
        user_id: project.supervisorId,
        title: "Project Expense Removed",
        message: `${user.name} removed expense "${expenseToDelete.title}" from project ${project.name} (${project.code})`,
        notification_type: "message",
        reference_id: projectId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting expense:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete expense";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
