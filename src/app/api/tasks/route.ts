import { NextResponse, type NextRequest } from "next/server";
import { getTasksForEmployee, createTask } from "@/actions/tasks/tasks";
import type { CreateTask, Task } from "@/types";
import { and, asc, desc, eq, ilike, or, inArray } from "drizzle-orm";
import { db } from "@/db";
import { tasks, taskAssignees, employees } from "@/db/schema";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CreateTask> & {
      assignees?: number[];
    };
    const created = await createTask(
      body as CreateTask & { assignees?: number[] },
    );

    if (!created.success) {
      return NextResponse.json(
        { error: created.error?.reason || "Task not created" },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: created.success.reason });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 },
    );
  }
}

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
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    const sortableColumns = {
      createdAt: tasks.createdAt,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      assignedTo: tasks.assignedTo,
      assignedBy: tasks.assignedBy,
    };
    type SortableColumn = keyof typeof sortableColumns;

    const sortByParam = searchParams.get("sortBy") as SortableColumn | null;
    const status = searchParams.get("status") || "all";
    const priority = searchParams.get("priority") || undefined;
    const q = searchParams.get("q") || "";
    const sortDirection =
      searchParams.get("sortDirection") === "asc" ? "asc" : "desc";
    const sortColumn =
      (sortByParam && sortableColumns[sortByParam]) || tasks.createdAt;
    const order = sortDirection === "asc" ? asc(sortColumn) : desc(sortColumn);

    let where: ReturnType<typeof or> | ReturnType<typeof eq> | undefined;
    if (role === "employee") {
      const eid = Number(employeeId || "0");
      // Fetch tasks where employee is explicitly assigned via join table
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
    if (status && status !== "all") {
      where = where
        ? and(where, eq(tasks.status, status as StatusType))
        : eq(tasks.status, status as StatusType);
    }
    console.log("Status: ", status);
    if (priority) {
      where = where
        ? and(where, eq(tasks.priority, priority as PriorityType))
        : eq(tasks.priority, priority as PriorityType);
    }
    const all_tasks: Task[] = await getTasksForEmployee(
      where,
      order,
      limit,
      offset,
    );
    // Enrich with emails and names for assignedTo/assignedBy
    const ids = Array.from(
      new Set(
        all_tasks
          .flatMap((t) => [t.assignedTo, t.assignedBy])
          .filter(Boolean) as number[],
      ),
    );
    let map = new Map<number, { email: string | null; name: string | null }>();
    if (ids.length) {
      const rows = await db
        .select({
          id: employees.id,
          email: employees.email,
          name: employees.name,
        })
        .from(employees)
        .where(inArray(employees.id, ids));
      map = new Map(rows.map((r) => [r.id, { email: r.email, name: r.name }]));
    }

    // Build assignees map for these tasks
    const taskIds = all_tasks.map((t) => t.id);
    const assigneesMap = new Map<
      number,
      { id: number | null; email: string | null; name: string | null }[]
    >();
    if (taskIds.length) {
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
      for (const r of assigneesRows) {
        const list = assigneesMap.get(r.taskId) ?? [];
        list.push({ id: r.id, email: r.email, name: r.name });
        assigneesMap.set(r.taskId, list);
      }
    }

    const enriched = all_tasks.map((t) => {
      return {
        ...t,
        assignedToEmail: map.get(t.assignedTo || -1)?.email ?? null,
        assignedByEmail: map.get(t.assignedBy || -1)?.email ?? null,
        assignedToName: map.get(t.assignedTo || -1)?.name ?? null,
        assignedByName: map.get(t.assignedBy || -1)?.name ?? null,
        assignees: assigneesMap.get(t.id) ?? [],
      };
    });
    return NextResponse.json({ tasks: enriched }, { status: 200 });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 },
    );
  }
}
