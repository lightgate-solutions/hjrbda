"use server";

import { db } from "@/db";
import { employees, taskReviews, taskSubmissions, tasks } from "@/db/schema";
import { getEmployee } from "../hr/employees";
import { DrizzleQueryError, and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createNotification } from "../notification/notification";
import { requireAuth, requireManager } from "@/actions/auth/dal";

type NewSubmission = typeof taskSubmissions.$inferInsert;

export async function submitTask(submissionData: NewSubmission) {
  const authData = await requireAuth();

  // Verify user can only submit their own tasks
  if (authData.employee.id !== submissionData.submittedBy) {
    return {
      success: null,
      error: { reason: "You can only submit your own tasks" },
    };
  }

  try {
    const employee = await getEmployee(submissionData.submittedBy);

    if (!employee || employee.isManager) {
      return {
        success: null,
        error: { reason: "Only employees can submit tasks" },
      };
    }

    const task = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, submissionData.taskId))
      .limit(1)
      .then((r) => r[0]);

    if (!task) {
      return {
        success: null,
        error: { reason: "Task not found" },
      };
    }

    if (task.status === "Completed") {
      return {
        success: null,
        error: { reason: "Cannot submit a task that is already completed" },
      };
    }

    await db.insert(taskSubmissions).values({
      ...submissionData,
    });

    // Update task status to "Review"
    await db
      .update(tasks)
      .set({ status: "Review", updatedAt: new Date() })
      .where(eq(tasks.id, submissionData.taskId));

    // Notify the manager that the task has been submitted
    if (task.assignedBy) {
      let note = "";
      if (submissionData.submissionNote) {
        const preview = submissionData.submissionNote.substring(0, 60);
        note = ` — ${preview}${submissionData.submissionNote.length > 60 ? "..." : ""}`;
      }

      const message = `${employee.name} submitted "${task.title}" for your review${note}`;

      await createNotification({
        user_id: task.assignedBy,
        title: "Task Submission Ready",
        message,
        notification_type: "message",
        reference_id: submissionData.taskId,
      });
    }

    revalidatePath("/tasks");
    return {
      success: { reason: "Task submitted successfully" },
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

export async function getTaskSubmissions(taskId: number) {
  await requireAuth();
  return await db
    .select()
    .from(taskSubmissions)
    .where(eq(taskSubmissions.taskId, taskId));
}

export async function getEmployeeSubmissions(employeeId: number) {
  await requireAuth();
  return await db
    .select()
    .from(taskSubmissions)
    .where(eq(taskSubmissions.submittedBy, employeeId));
}

export async function getSubmissionById(submissionId: number) {
  await requireAuth();
  return await db
    .select()
    .from(taskSubmissions)
    .where(eq(taskSubmissions.id, submissionId))
    .limit(1)
    .then((res) => res[0]);
}

export async function getManagerTeamSubmissions(managerId: number) {
  const authData = await requireManager();

  // Verify the user is requesting their own team's submissions
  if (authData.employee.id !== managerId) {
    throw new Error("You can only view your own team's submissions");
  }

  // All submissions for tasks assigned by this manager
  const rows = await db
    .select({
      id: taskSubmissions.id,
      taskId: taskSubmissions.taskId,
      submittedBy: taskSubmissions.submittedBy,
      submissionNote: taskSubmissions.submissionNote,
      submittedFiles: taskSubmissions.submittedFiles,
      submittedAt: taskSubmissions.submittedAt,
      employeeName: employees.name,
      employeeEmail: employees.email,
      taskTitle: tasks.title,
    })
    .from(taskSubmissions)
    .leftJoin(tasks, eq(tasks.id, taskSubmissions.taskId))
    .leftJoin(employees, eq(employees.id, taskSubmissions.submittedBy))
    .where(eq(tasks.assignedBy, managerId))
    .orderBy(desc(taskSubmissions.submittedAt));
  return rows;
}

export async function createSubmissionReview(args: {
  submissionId: number;
  taskId: number;
  reviewedBy: number;
  status: "Accepted" | "Rejected";
  reviewNote?: string;
}) {
  const authData = await requireManager();

  // Verify the user is the one doing the review
  if (authData.employee.id !== args.reviewedBy) {
    return {
      success: null,
      error: { reason: "You can only review as yourself" },
    };
  }

  try {
    // Validate the reviewer is the manager who assigned the task
    const t = await db
      .select({ assignedBy: tasks.assignedBy })
      .from(tasks)
      .where(and(eq(tasks.id, args.taskId)))
      .limit(1)
      .then((r) => r[0]);
    if (!t || t.assignedBy !== args.reviewedBy) {
      return {
        success: null,
        error: {
          reason: "Only the assigning manager can review this submission",
        },
      };
    }

    await db.insert(taskReviews).values({
      taskId: args.taskId,
      submissionId: args.submissionId,
      reviewedBy: args.reviewedBy,
      status: args.status,
      reviewNote: args.reviewNote,
    });

    // Notify the employee about the review decision
    const submission = await db
      .select()
      .from(taskSubmissions)
      .where(eq(taskSubmissions.id, args.submissionId))
      .limit(1)
      .then((r) => r[0]);

    const taskDetails = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, args.taskId))
      .limit(1)
      .then((r) => r[0]);

    if (submission?.submittedBy) {
      const statusText = args.status === "Accepted" ? "approved" : "rejected";
      const feedback = args.reviewNote
        ? ` • ${args.reviewNote.substring(0, 80)}${args.reviewNote.length > 80 ? "..." : ""}`
        : "";

      const message = `Your submission for "${taskDetails?.title}" was ${statusText}${feedback}`;

      await createNotification({
        user_id: submission.submittedBy,
        title: `Submission ${args.status}`,
        message,
        notification_type: "approval",
        reference_id: args.taskId,
      });
    }

    // Mirror status side-effects here too to keep behavior consistent
    if (args.status === "Accepted") {
      // Accepted -> Completed
      await db
        .update(tasks)
        .set({ status: "Completed", updatedAt: new Date() })
        .where(eq(tasks.id, args.taskId));
    } else if (args.status === "Rejected") {
      // Rejected -> ensure task remains In Progress (don’t downgrade a Completed task)
      const current = await db
        .select({ status: tasks.status })
        .from(tasks)
        .where(eq(tasks.id, args.taskId))
        .limit(1)
        .then((r) => r[0]);

      if (current && current.status !== "Completed") {
        await db
          .update(tasks)
          .set({ status: "In Progress", updatedAt: new Date() })
          .where(eq(tasks.id, args.taskId));
      }
    }

    revalidatePath(`/tasks/manager`);
    revalidatePath(`/tasks`);
    return { success: { reason: "Review submitted" }, error: null };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return { success: null, error: { reason: err.cause?.message } };
    }
    return { success: null, error: { reason: "An unexpected error occurred" } };
  }
}
