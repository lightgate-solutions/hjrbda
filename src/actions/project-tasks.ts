"use server";

import { db } from "@/db";
import { tasks, projectMembers, projects } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/actions/auth/dal";
import { createNotification } from "./notification/notification";
import { z } from "zod";

const projectTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(1000).nullable().optional(),
  assignedTo: z.number().int().positive(),
  projectId: z.number().int().positive(),
  milestoneId: z.number().int().positive().nullable().optional(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
  dueDate: z.string().nullable().optional(),
});

export type ProjectTaskInput = z.infer<typeof projectTaskSchema>;

export async function listProjectTasks(projectId: number) {
  await requireAuth();

  return await db.query.tasks.findMany({
    where: eq(tasks.projectId, projectId),
    with: {
      assignedTo: true,
      milestone: true,
    },
    orderBy: [desc(tasks.createdAt)],
  });
}

export async function createProjectTask(input: ProjectTaskInput) {
  const { employee } = await requireAuth();

  const parsed = projectTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: { reason: "Invalid input" } };
  }

  const { projectId, assignedTo, ...taskData } = parsed.data;

  // Check if project exists and user is creator or supervisor
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project) {
    return { success: false, error: { reason: "Project not found" } };
  }

  const isAuthorized =
    project.creatorId === employee.id || project.supervisorId === employee.id;
  if (!isAuthorized) {
    return {
      success: false,
      error: { reason: "Only project creator or supervisor can create tasks" },
    };
  }

  // Check if assignedTo is a member of the project
  const member = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.employeeId, assignedTo),
    ),
  });

  // Also allow assigning to supervisor or creator
  const isSpecialMember =
    project.supervisorId === assignedTo || project.creatorId === assignedTo;

  if (!member && !isSpecialMember) {
    return {
      success: false,
      error: { reason: "Task can only be assigned to project members" },
    };
  }

  try {
    const [row] = await db
      .insert(tasks)
      .values({
        ...taskData,
        projectId,
        assignedTo,
        assignedBy: employee.id,
        status: "Todo",
      })
      .returning();

    // Notify assignee
    await createNotification({
      user_id: assignedTo,
      title: "New Project Task",
      message: `You have been assigned a new task: ${row.title} in project ${project.name}`,
      notification_type: "message",
      reference_id: row.id,
    });

    revalidatePath(`/projects/${projectId}`);
    return { success: true, task: row };
  } catch (_err) {
    return { success: false, error: { reason: "Could not create task" } };
  }
}

export async function updateProjectTaskStatus(
  taskId: number,
  status:
    | "Todo"
    | "In Progress"
    | "Review"
    | "Completed"
    | "Backlog"
    | "Pending",
) {
  const { employee } = await requireAuth();

  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: { project: true },
  });

  if (!task || !task.projectId) {
    return { success: false, error: { reason: "Task not found" } };
  }

  // Check access: assigned user, project creator, or supervisor
  const isProjectLead =
    task.project?.creatorId === employee.id ||
    task.project?.supervisorId === employee.id;
  const isManager = employee.isManager || employee.role === "admin";
  const hasAccess =
    task.assignedTo === employee.id || isProjectLead || isManager;

  if (!hasAccess) {
    return { success: false, error: { reason: "Unauthorized" } };
  }

  // Employees (assignees who are not project leads or managers) cannot set to Completed
  if (status === "Completed" && !isProjectLead && !isManager) {
    return {
      success: false,
      error: { reason: "Only project managers can complete tasks" },
    };
  }

  try {
    await db
      .update(tasks)
      .set({ status, updatedAt: new Date() })
      .where(eq(tasks.id, taskId));

    revalidatePath(`/projects/${task.projectId}`);
    return { success: true };
  } catch (_err) {
    return {
      success: false,
      error: { reason: "Could not update task status" },
    };
  }
}

export async function updateProjectTask(
  taskId: number,
  input: Partial<ProjectTaskInput>,
) {
  const { employee } = await requireAuth();

  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: { project: true },
  });

  if (!task || !task.projectId) {
    return { success: false, error: { reason: "Task not found" } };
  }

  const isAuthorized =
    task.project?.creatorId === employee.id ||
    task.project?.supervisorId === employee.id;
  if (!isAuthorized) {
    return { success: false, error: { reason: "Unauthorized" } };
  }

  try {
    await db
      .update(tasks)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(tasks.id, taskId));

    revalidatePath(`/projects/${task.projectId}`);
    return { success: true };
  } catch (_err) {
    return { success: false, error: { reason: "Could not update task" } };
  }
}

export async function deleteProjectTask(taskId: number) {
  const { employee } = await requireAuth();

  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: { project: true },
  });

  if (!task || !task.projectId) {
    return { success: false, error: { reason: "Task not found" } };
  }

  const isAuthorized =
    task.project?.creatorId === employee.id ||
    task.project?.supervisorId === employee.id;
  if (!isAuthorized) {
    return { success: false, error: { reason: "Unauthorized" } };
  }

  try {
    await db.delete(tasks).where(eq(tasks.id, taskId));
    revalidatePath(`/projects/${task.projectId}`);
    return { success: true };
  } catch (_err) {
    return { success: false, error: { reason: "Could not delete task" } };
  }
}
