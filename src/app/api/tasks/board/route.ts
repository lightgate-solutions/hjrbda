import { NextResponse, type NextRequest } from "next/server";
import { and, asc, eq, ilike, or, inArray, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  tasks,
  taskAssignees,
  employees,
  taskLabels,
  taskLabelAssignments,
  taskMessages,
} from "@/db/schema";
import { updateTask } from "@/actions/tasks/tasks";

export async function GET(request: NextRequest) {
  try {
    type StatusType =
      | "Backlog"
      | "Todo"
      | "In Progress"
      | "Review"
      | "Completed";
    type PriorityType = "Low" | "Medium" | "High" | "Urgent";

    const { searchParams } = request.nextUrl;

    const role = searchParams.get("role") || undefined;
    const employeeId = searchParams.get("employeeId");
    if (!employeeId || !role) {
      return NextResponse.json(
        { error: "Missing employeeId or role parameter" },
        { status: 400 },
      );
    }

    const priority = searchParams.get("priority") || undefined;
    const assignee = searchParams.get("assignee") || undefined;
    const q = searchParams.get("q") || "";

    let where: SQL | undefined;

    if (role === "employee") {
      const eid = Number(employeeId || "0");
      const rows = await db
        .select({ id: taskAssignees.taskId })
        .from(taskAssignees)
        .where(eq(taskAssignees.employeeId, eid));
      const ids = rows.map((r) => r.id);
      where = ids.length
        ? or(eq(tasks.assignedTo, eid), inArray(tasks.id, ids))
        : eq(tasks.assignedTo, eid);
    } else if (role === "manager") {
      where = eq(tasks.assignedBy, Number(employeeId || "0"));
    } else if (role === "self") {
      const eid = Number(employeeId || "0");
      where = and(eq(tasks.assignedTo, eid), eq(tasks.assignedBy, eid));
    } else if (role === "admin") {
      // Admin sees all tasks without filtering
      where = undefined;
    }

    if (q) {
      where = where
        ? and(
            where,
            or(
              ilike(tasks.title, `%${q}%`),
              ilike(tasks.description, `%${q}%`),
            ),
          )
        : or(ilike(tasks.title, `%${q}%`), ilike(tasks.description, `%${q}%`));
    }

    if (priority && priority !== "all") {
      where = where
        ? and(where, eq(tasks.priority, priority as PriorityType))
        : eq(tasks.priority, priority as PriorityType);
    }

    if (assignee === "me") {
      const eid = Number(employeeId || "0");
      where = where
        ? and(where, eq(tasks.assignedTo, eid))
        : eq(tasks.assignedTo, eid);
    }

    // Fetch all tasks
    const allTasks = await db
      .select()
      .from(tasks)
      .where(where)
      .orderBy(asc(tasks.createdAt));

    if (!allTasks.length) {
      return NextResponse.json({
        tasksByStatus: {},
        labels: [],
        statuses: ["Backlog", "Todo", "In Progress", "Review", "Completed"],
      });
    }

    const taskIds = allTasks.map((t) => t.id);

    // Get all employee IDs for enrichment
    const employeeIds = Array.from(
      new Set(
        allTasks
          .flatMap((t) => [t.assignedTo, t.assignedBy])
          .filter(Boolean) as number[],
      ),
    );

    // Fetch employee data
    const employeeRows = employeeIds.length
      ? await db
          .select({
            id: employees.id,
            email: employees.email,
            name: employees.name,
          })
          .from(employees)
          .where(inArray(employees.id, employeeIds))
      : [];

    const employeeMap = new Map(
      employeeRows.map((r) => [
        r.id,
        {
          id: r.id,
          email: r.email,
          name: r.name,
          avatar: null as string | null,
        },
      ]),
    );

    // Fetch assignees for all tasks
    const assigneesRows = await db
      .select({
        taskId: taskAssignees.taskId,
        id: employees.id,
        email: employees.email,
        name: employees.name,
      })
      .from(taskAssignees)
      .leftJoin(employees, eq(employees.id, taskAssignees.employeeId))
      .where(inArray(taskAssignees.taskId, taskIds));

    const assigneesMap = new Map<
      number,
      {
        id: number | null;
        email: string | null;
        name: string | null;
        avatar: string | null;
      }[]
    >();
    for (const r of assigneesRows) {
      const list = assigneesMap.get(r.taskId) ?? [];
      list.push({ id: r.id, email: r.email, name: r.name, avatar: null });
      assigneesMap.set(r.taskId, list);
    }

    // Fetch labels for all tasks
    const labelAssignments = await db
      .select({
        taskId: taskLabelAssignments.taskId,
        id: taskLabels.id,
        name: taskLabels.name,
        color: taskLabels.color,
      })
      .from(taskLabelAssignments)
      .leftJoin(taskLabels, eq(taskLabels.id, taskLabelAssignments.labelId))
      .where(inArray(taskLabelAssignments.taskId, taskIds));

    const labelsMap = new Map<
      number,
      { id: number | null; name: string | null; color: string | null }[]
    >();
    for (const r of labelAssignments) {
      const list = labelsMap.get(r.taskId) ?? [];
      list.push({ id: r.id, name: r.name, color: r.color });
      labelsMap.set(r.taskId, list);
    }

    // Fetch comment counts for all tasks
    const messageCounts = await db
      .select({
        taskId: taskMessages.taskId,
      })
      .from(taskMessages)
      .where(inArray(taskMessages.taskId, taskIds));

    const commentsMap = new Map<number, number>();
    for (const r of messageCounts) {
      commentsMap.set(r.taskId, (commentsMap.get(r.taskId) || 0) + 1);
    }

    // Enrich tasks and group by status
    type EnrichedTask = {
      id: number;
      title: string;
      description: string | null;
      status: StatusType;
      priority: string;
      dueDate: string | null;
      attachments: { url: string; name: string }[];
      links: { url: string; title: string }[];
      progressCompleted: number;
      progressTotal: number;
      createdAt: Date;
      updatedAt: Date;
      assignedBy: {
        id: number;
        email: string | null;
        name: string | null;
        avatar: string | null;
      } | null;
      assignees: {
        id: number | null;
        email: string | null;
        name: string | null;
        avatar: string | null;
      }[];
      labels: {
        id: number | null;
        name: string | null;
        color: string | null;
      }[];
      comments: number;
    };

    const tasksByStatus: Record<StatusType, EnrichedTask[]> = {
      Backlog: [],
      Todo: [],
      "In Progress": [],
      Review: [],
      Completed: [],
    };

    for (const task of allTasks) {
      const enriched: EnrichedTask = {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status as StatusType,
        priority: task.priority,
        dueDate: task.dueDate,
        attachments: (task.attachments || []) as {
          url: string;
          name: string;
        }[],
        links: (task.links || []) as { url: string; title: string }[],
        progressCompleted: task.progressCompleted || 0,
        progressTotal: task.progressTotal || 0,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        assignedBy: employeeMap.get(task.assignedBy) || null,
        assignees: assigneesMap.get(task.id) || [],
        labels: labelsMap.get(task.id) || [],
        comments: commentsMap.get(task.id) || 0,
      };

      if (tasksByStatus[task.status as StatusType]) {
        tasksByStatus[task.status as StatusType].push(enriched);
      }
    }

    // Fetch all available labels
    const allLabels = await db.select().from(taskLabels);

    return NextResponse.json({
      tasksByStatus,
      labels: allLabels,
      statuses: ["Backlog", "Todo", "In Progress", "Review", "Completed"],
    });
  } catch (error) {
    console.error("Error fetching board tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch board tasks" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const employeeId = searchParams.get("employeeId");
    const role = searchParams.get("role");

    if (!employeeId || !role) {
      return NextResponse.json(
        { error: "Missing employeeId or role" },
        { status: 400 },
      );
    }

    let where: SQL | undefined;
    if (role === "admin") {
      where = eq(tasks.status, "Completed");
    } else if (role === "manager") {
      where = and(
        eq(tasks.assignedBy, Number(employeeId)),
        eq(tasks.status, "Completed"),
      );
    } else if (role === "self") {
      where = and(
        eq(tasks.assignedBy, Number(employeeId)),
        eq(tasks.assignedTo, Number(employeeId)),
        eq(tasks.status, "Completed"),
      );
    } else {
      return NextResponse.json(
        {
          error:
            "Only managers, admins, and self-assignees can clear completed tasks",
        },
        { status: 403 },
      );
    }

    await db.delete(tasks).where(where);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing completed tasks:", error);
    return NextResponse.json(
      { error: "Failed to clear completed tasks" },
      { status: 500 },
    );
  }
}

// Update task status (for drag and drop)
export async function PATCH(request: NextRequest) {
  try {
    const { taskId, status, employeeId } = await request.json();

    if (!taskId || !status || !employeeId) {
      return NextResponse.json(
        { error: "Missing taskId, status or employeeId" },
        { status: 400 },
      );
    }

    const res = await updateTask(employeeId, taskId, { status });

    if (!res.success) {
      return NextResponse.json(
        { error: res.error?.reason || "Failed to update task status" },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating task status:", error);
    return NextResponse.json(
      { error: "Failed to update task status" },
      { status: 500 },
    );
  }
}
