import { NextResponse, type NextRequest } from "next/server";
import {
  getTaskForEmployee,
  getTaskByManager,
  deleteTask,
  updateTask,
} from "@/actions/tasks/tasks";
import type { CreateTask } from "@/types";
import { db } from "@/db";
import { employees, taskAssignees } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const { searchParams } = _request.nextUrl;
    const employeeId = Number(searchParams.get("employeeId"));
    const role = searchParams.get("role");
    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 },
      );
    }
    let task: CreateTask | undefined;
    if (role === "manager") {
      task = await getTaskByManager(employeeId, id);
    } else {
      task = await getTaskForEmployee(employeeId, id);
    }
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    // Enrich with emails
    const ids = [task.assignedTo, task.assignedBy].filter(Boolean) as number[];
    // Load assignees for this task
    const assigneesRows = await db
      .select({
        id: employees.id,
        email: employees.email,
        name: employees.name,
      })
      .from(taskAssignees)
      .leftJoin(employees, eq(employees.id, taskAssignees.employeeId))
      .where(eq(taskAssignees.taskId, id));
    if (ids.length) {
      const rows = await db
        .select({
          id: employees.id,
          email: employees.email,
          name: employees.name,
        })
        .from(employees)
        .where(inArray(employees.id, ids));
      const map = new Map(
        rows.map((r) => [r.id, { email: r.email, name: r.name }]),
      );
      return NextResponse.json({
        task: {
          ...task,
          assignedToEmail: map.get(task.assignedTo || -1)?.email ?? null,
          assignedByEmail: map.get(task.assignedBy || -1)?.email ?? null,
          assignedToName: map.get(task.assignedTo || -1)?.name ?? null,
          assignedByName: map.get(task.assignedBy || -1)?.name ?? null,
          assignees: assigneesRows.map((r) => ({
            id: r.id,
            email: r.email,
            name: r.name,
          })),
        },
      });
    }
    return NextResponse.json({
      task: {
        ...task,
        assignees: assigneesRows.map((r) => ({
          id: r.id,
          email: r.email,
          name: r.name,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const { searchParams } = _request.nextUrl;
    const employeeId = Number(searchParams.get("employeeId"));
    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 },
      );
    }
    const deleted = await deleteTask(employeeId, id);

    if (!deleted.success) {
      return NextResponse.json(
        { error: deleted.error?.reason || "Task not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: deleted.success.reason });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const body = await request.json();
    const content: Partial<CreateTask> = {};
    const keys = Object.keys(body) as Array<keyof CreateTask>;
    for (const key of keys) {
      const value = body[key];
      if (value !== undefined) {
        (content as Record<string, unknown>)[key as string] = value as unknown;
      }
    }
    const { searchParams } = request.nextUrl;
    const employeeId = Number(searchParams.get("employeeId"));
    const role = searchParams.get("role");
    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 },
      );
    }
    const updated = await updateTask(employeeId, id, content);
    if (!updated.success) {
      return NextResponse.json(
        { error: updated.error?.reason || "Task not found or not updated" },
        { status: 404 },
      );
    }

    // Fetch and return the updated task object so clients can update instantly
    let task: CreateTask | undefined;
    if (role === "manager") {
      task = await getTaskByManager(employeeId, id);
    } else if (role === "employee") {
      task = await getTaskForEmployee(employeeId, id);
    } else {
      // Fallback: return 200 with no task if role missing
      return NextResponse.json({ message: updated.success.reason });
    }

    // Enrich with emails for the updated object if available
    if (task) {
      const ids = [task.assignedTo, task.assignedBy].filter(
        Boolean,
      ) as number[];
      const assigneesRows = await db
        .select({
          id: employees.id,
          email: employees.email,
          name: employees.name,
        })
        .from(taskAssignees)
        .leftJoin(employees, eq(employees.id, taskAssignees.employeeId))
        .where(eq(taskAssignees.taskId, id));
      if (ids.length) {
        const rows = await db
          .select({
            id: employees.id,
            email: employees.email,
            name: employees.name,
          })
          .from(employees)
          .where(inArray(employees.id, ids));
        const map = new Map(
          rows.map((r) => [r.id, { email: r.email, name: r.name }]),
        );
        return NextResponse.json({
          task: {
            ...task,
            assignedToEmail: map.get(task.assignedTo || -1)?.email ?? null,
            assignedByEmail: map.get(task.assignedBy || -1)?.email ?? null,
            assignedToName: map.get(task.assignedTo || -1)?.name ?? null,
            assignedByName: map.get(task.assignedBy || -1)?.name ?? null,
            assignees: assigneesRows.map((r) => ({
              id: r.id,
              email: r.email,
              name: r.name,
            })),
          },
        });
      }
    }
    return NextResponse.json({
      task: {
        ...task,
        assignees: [],
      },
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const body = await request.json();
    const { employeeId, ...updates } = body;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 },
      );
    }

    const updated = await updateTask(employeeId, id, updates);
    if (!updated.success) {
      return NextResponse.json(
        { error: updated.error?.reason || "Task not found or not updated" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: updated.success.reason });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 },
    );
  }
}
