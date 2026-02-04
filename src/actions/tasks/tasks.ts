"use server";

import { db } from "@/db";
import { tasks, taskAssignees } from "@/db/schema";
import { getEmployee } from "../hr/employees";
import {
  and,
  type asc,
  type desc,
  DrizzleQueryError,
  eq,
  or,
  inArray,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { CreateTask } from "@/types";
import { createNotification } from "../notification/notification";

type CreateTaskWithAssignees = CreateTask & { assignees?: number[] };

export async function createTask(taskData: CreateTaskWithAssignees) {
  try {
    const creator = await getEmployee(taskData.assignedBy);
    if (!creator) {
      return {
        success: null,
        error: { reason: "Creator not found" },
      };
    }

    const assignees = (taskData.assignees || []).filter(Boolean);
    const isSelfTask =
      assignees.length === 1 &&
      assignees[0] === taskData.assignedBy &&
      (!taskData.assignedTo || taskData.assignedTo === taskData.assignedBy);

    if (!creator.isManager && !isSelfTask) {
      return {
        success: null,
        error: { reason: "Only managers can create tasks for others" },
      };
    }

    const firstAssignee = assignees[0] ?? taskData.assignedTo ?? null;

    const [created] = await db
      .insert(tasks)
      .values({
        ...taskData,
        assignedTo: firstAssignee ?? undefined,
      })
      .returning({ id: tasks.id });

    if (created?.id && assignees.length) {
      const rows = assignees.map((empId) => ({
        taskId: created.id,
        employeeId: empId,
      }));
      await db.insert(taskAssignees).values(rows);

      // Notify all assignees about the new task
      for (const employeeId of assignees) {
        const dueDate = taskData.dueDate
          ? new Date(taskData.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : null;

        // Extract first sentence for context
        let context = "";
        if (taskData.description) {
          const firstSentence = taskData.description.split(/[.!?]\s/)[0];
          const preview =
            firstSentence.length > 80
              ? `${firstSentence.substring(0, 80)}...`
              : firstSentence;
          context = ` — ${preview}`;
        }

        const message = `${creator.name} assigned you "${taskData.title}"${dueDate ? ` • Due ${dueDate}` : ""}${context}`;

        await createNotification({
          user_id: employeeId,
          title: isSelfTask ? "New Self-Task" : "New Task Assignment",
          message: isSelfTask
            ? `You created a new task: "${taskData.title}"`
            : message,
          notification_type: "message",
          reference_id: created.id,
        });
      }
    }

    revalidatePath("/tasks/history");
    return {
      success: { reason: "Task created successfully" },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message },
      };
    }
    return {
      success: null,
      error: { reason: "An unexpected error occurred" },
    };
  }
}

export async function updateTask(
  employeeId: number,
  taskId: number,
  updates: Partial<CreateTask>,
) {
  const employee = await getEmployee(employeeId);
  if (!employee) {
    return {
      success: null,
      error: { reason: "Employee not found" },
    };
  }

  type TaskInsert = typeof tasks.$inferInsert;
  type TaskUpdate = Partial<TaskInsert>;
  // Enforce permissions:
  // - Managers can update any fields on tasks they created
  // - Self-taskers can update any fields on tasks they created for themselves
  // - Employees can only update status (except to Completed) and attachments

  // Get current task before update for permissions and notifications
  const currentTask = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1)
    .then((r) => r[0]);

  if (!currentTask) {
    return {
      success: null,
      error: { reason: "Task not found" },
    };
  }

  const isSelfTask =
    currentTask.assignedBy === employeeId &&
    currentTask.assignedTo === employeeId;

  let allowedUpdates: Partial<CreateTask> = { ...updates };
  if (!employee.isManager && !isSelfTask) {
    // Filter down to only status and attachments for non-managers
    allowedUpdates = {} as Partial<CreateTask>;
    if (typeof updates.status !== "undefined") {
      // Employees cannot set status to "Completed"
      if (updates.status === "Completed") {
        return {
          success: null,
          error: { reason: "Only managers can mark tasks as completed" },
        };
      }
      allowedUpdates.status = updates.status as CreateTask["status"];
    }
    // Allow employees to add attachments
    if (updates.attachments !== undefined) {
      (allowedUpdates as Record<string, unknown>).attachments =
        updates.attachments;
    }
    // If nothing to update after filtering, exit early
    if (Object.keys(allowedUpdates).length === 0) {
      return {
        success: null,
        error: {
          reason: "Employees can only update task status and attachments",
        },
      };
    }
    // Ensure employee has access to this task (either directly assigned or via assignees table)
    const taskVisible = await getTaskForEmployee(employeeId, taskId);
    if (!taskVisible) {
      return {
        success: null,
        error: { reason: "You are not assigned to this task" },
      };
    }
  } else if (employee.isManager && !isSelfTask) {
    // Manager path: ensure the task belongs to this manager
    const taskOwned = await getTaskByManager(employeeId, taskId);
    if (!taskOwned) {
      return {
        success: null,
        error: { reason: "You can only update tasks you created" },
      };
    }
  }

  const processedUpdates: TaskUpdate = {
    ...allowedUpdates,
    updatedAt: new Date(),
  } as TaskUpdate;

  // Normalize empty string fields to null where applicable
  const normalized = { ...processedUpdates } as Record<string, unknown>;
  for (const [key, value] of Object.entries(normalized)) {
    if (value === "") {
      normalized[key] = null;
    }
  }

  try {
    // Update the task
    await db
      .update(tasks)
      .set(normalized as unknown as TaskUpdate)
      .where(eq(tasks.id, taskId));

    // Notify assignees if manager (or self) made significant changes
    if ((employee.isManager || isSelfTask) && currentTask) {
      const hasSignificantChanges =
        updates.title ||
        updates.description ||
        updates.dueDate ||
        updates.priority;

      if (hasSignificantChanges) {
        // Get all assignees
        const assigneesList = await db
          .select({ employeeId: taskAssignees.employeeId })
          .from(taskAssignees)
          .where(eq(taskAssignees.taskId, taskId));

        const assigneeIds = assigneesList
          .map((a) => a.employeeId)
          .filter(Boolean);
        if (currentTask.assignedTo) assigneeIds.push(currentTask.assignedTo);

        // Notify each assignee
        for (const assigneeId of assigneeIds) {
          let changeDesc = "";
          if (updates.title) changeDesc = "Task title updated";
          else if (updates.description) changeDesc = "Task description updated";
          else if (updates.dueDate) changeDesc = "Due date changed";
          else if (updates.priority) changeDesc = "Priority changed";

          await createNotification({
            user_id: assigneeId,
            title: "Task Updated",
            message: `${employee.name} updated "${currentTask.title}" • ${changeDesc}`,
            notification_type: "message",
            reference_id: taskId,
          });
        }
      }
    }

    // Notify manager when employee starts task
    if (
      !employee.isManager &&
      updates.status === "In Progress" &&
      currentTask
    ) {
      await createNotification({
        user_id: currentTask.assignedBy,
        title: "Task Started",
        message: `${employee.name} started working on "${currentTask.title}"`,
        notification_type: "message",
        reference_id: taskId,
      });
    }

    revalidatePath("/tasks/history");
    return {
      success: { reason: "Task updated successfully" },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message },
      };
    }
    return {
      success: null,
      error: { reason: "An unexpected error occurred" },
    };
  }
}

export async function deleteTask(employeeId: number, taskId: number) {
  try {
    const deleter = await getEmployee(employeeId);
    if (!deleter) {
      return {
        success: null,
        error: { reason: "Employee not found" },
      };
    }

    // Get task details before deletion for permissions and notifications
    const task = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1)
      .then((r) => r[0]);

    if (!task) {
      return {
        success: null,
        error: { reason: "Task not found" },
      };
    }

    const isSelfTask =
      task.assignedBy === employeeId && task.assignedTo === employeeId;

    if (!deleter.isManager && !isSelfTask) {
      return {
        success: null,
        error: { reason: "Only managers can delete tasks assigned to others" },
      };
    }

    if (task) {
      // Get all assignees to notify them (only if not self-task)
      const assigneesList = isSelfTask
        ? []
        : await db
            .select({ employeeId: taskAssignees.employeeId })
            .from(taskAssignees)
            .where(eq(taskAssignees.taskId, taskId));

      const assigneeIds = assigneesList
        .map((a) => a.employeeId)
        .filter(Boolean);
      if (task.assignedTo && !isSelfTask) assigneeIds.push(task.assignedTo);

      // Delete the task
      await db.delete(tasks).where(eq(tasks.id, taskId));

      // Notify assignees that task was cancelled
      for (const assigneeId of assigneeIds) {
        await createNotification({
          user_id: assigneeId,
          title: "Task Cancelled",
          message: `${deleter.name} cancelled the task "${task.title}"`,
          notification_type: "message",
          reference_id: taskId,
        });
      }
    } else {
      await db.delete(tasks).where(eq(tasks.id, taskId));
    }

    revalidatePath("/tasks");
    return {
      success: { reason: "Task deleted successfully" },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message },
      };
    }
    return {
      success: null,
      error: { reason: "An unexpected error occurred" },
    };
  }
}

export async function getTasksForEmployee(
  where:
    | ReturnType<typeof or>
    | ReturnType<typeof eq>
    | ReturnType<typeof and>
    | undefined,
  order: ReturnType<typeof asc> | ReturnType<typeof desc>,
  limit: number = 10,
  offset: number = 0,
) {
  const rows = await db
    .select()
    .from(tasks)
    .where(where)
    .orderBy(order)
    .limit(limit)
    .offset(offset);
  return rows;
}

export async function getTaskForEmployee(employeeId: number, taskId: number) {
  // A task is visible to an employee if either it's directly assignedTo them
  // or they appear in task_assignees for that task.
  const ids = await db
    .select({ id: taskAssignees.taskId })
    .from(taskAssignees)
    .where(eq(taskAssignees.employeeId, employeeId));
  const taskIds = ids.map((r) => r.id);

  return await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.id, taskId),
        or(eq(tasks.assignedTo, employeeId), inArray(tasks.id, taskIds)),
      ),
    )
    .limit(1)
    .then((res) => res[0]);
}

export async function getTaskByManager(managerId: number, taskId: number) {
  return await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.assignedBy, managerId)))
    .limit(1)
    .then((res) => res[0]);
}

// Returns all tasks created by a given manager
export async function getTasksByManager(managerId: number) {
  return await db.select().from(tasks).where(eq(tasks.assignedBy, managerId));
}
