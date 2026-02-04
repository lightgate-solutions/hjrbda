"use server";

import { db } from "@/db";
import { taskMessages, tasks, taskAssignees, employees } from "@/db/schema";
import { DrizzleQueryError, and, eq, gt, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createNotification } from "../notification/notification";

type NewMessage = typeof taskMessages.$inferInsert;

export const createTaskMessage = async (msg: NewMessage) => {
  try {
    // Ensure the task exists and the sender is either assignedBy or assignedTo
    const t = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, msg.taskId))
      .limit(1)
      .then((r) => r[0]);

    if (!t) {
      return { success: null, error: { reason: "Task not found" } };
    }

    if (msg.senderId !== t.assignedBy && msg.senderId !== t.assignedTo) {
      // Check if sender is in additional assignees list
      const extra = await db
        .select({ employeeId: taskAssignees.employeeId })
        .from(taskAssignees)
        .where(eq(taskAssignees.taskId, msg.taskId));
      const extraIds = new Set(extra.map((r) => r.employeeId));
      if (!extraIds.has(msg.senderId)) {
        return {
          success: null,
          error: {
            reason: "Only assigned employees or the manager can post messages",
          },
        };
      }
    }

    const inserted = await db
      .insert(taskMessages)
      .values({ ...msg })
      .returning({
        id: taskMessages.id,
        taskId: taskMessages.taskId,
        senderId: taskMessages.senderId,
        content: taskMessages.content,
        createdAt: taskMessages.createdAt,
      });
    // Revalidate task page so task view will pick up new messages if necessary
    revalidatePath(`/tasks/${msg.taskId}`);

    // Enrich with sender details for immediate UI render
    let senderName: string | null | undefined = null;
    let senderEmail: string | null | undefined = null;
    try {
      const emp = await db
        .select({ name: employees.name, email: employees.email })
        .from(employees)
        .where(eq(employees.id, msg.senderId))
        .limit(1)
        .then((r) => r[0]);
      senderName = emp?.name ?? null;
      senderEmail = emp?.email ?? null;
    } catch {}

    // Notify all task participants except the sender
    const participants = new Set<number>();
    if (t.assignedBy && t.assignedBy !== msg.senderId) {
      participants.add(t.assignedBy);
    }
    if (t.assignedTo && t.assignedTo !== msg.senderId) {
      participants.add(t.assignedTo);
    }

    // Also get additional assignees
    const extraAssignees = await db
      .select({ employeeId: taskAssignees.employeeId })
      .from(taskAssignees)
      .where(eq(taskAssignees.taskId, msg.taskId));

    for (const { employeeId } of extraAssignees) {
      if (employeeId && employeeId !== msg.senderId) {
        participants.add(employeeId);
      }
    }

    // Send notifications to all participants
    for (const userId of participants) {
      const commentPreview =
        msg.content.length > 100
          ? `${msg.content.substring(0, 100)}...`
          : msg.content;

      const message = `${senderName || "Someone"} commented on "${t.title}" • ${commentPreview}`;

      await createNotification({
        user_id: userId,
        title: "New Comment",
        message,
        notification_type: "message",
        reference_id: msg.taskId,
      });
    }

    const message = inserted?.[0]
      ? { ...inserted[0], senderName, senderEmail }
      : null;

    return { success: { reason: "Message posted", message }, error: null };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return { success: null, error: { reason: err.cause?.message } };
    }
    return { success: null, error: { reason: "An unexpected error occurred" } };
  }
};

export const getMessagesForTask = async (
  taskId: number,
  opts?: { afterId?: number; limit?: number },
) => {
  const whereBase = eq(taskMessages.taskId, taskId);
  const where = opts?.afterId
    ? and(whereBase, gt(taskMessages.id, opts.afterId))
    : whereBase;
  const baseSelect = db
    .select({
      id: taskMessages.id,
      taskId: taskMessages.taskId,
      senderId: taskMessages.senderId,
      content: taskMessages.content,
      createdAt: taskMessages.createdAt,
      senderName: employees.name,
      senderEmail: employees.email,
    })
    .from(taskMessages)
    .leftJoin(employees, eq(employees.id, taskMessages.senderId))
    .where(where);

  if (opts?.limit && !opts.afterId) {
    // Initial load: get latest N messages by id desc, then reverse for ascending display
    const newestFirst = await baseSelect
      .orderBy(desc(taskMessages.id))
      .limit(opts.limit);
    return newestFirst.slice().reverse();
  }
  // Default: ascending by createdAt for deterministic order
  return await baseSelect.orderBy(taskMessages.createdAt);
};
