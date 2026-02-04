"use server";

import { db } from "@/db";
import { taskReviews, tasks } from "@/db/schema";
import { getEmployee } from "../hr/employees";
import { DrizzleQueryError, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAuth, requireManager } from "@/actions/auth/dal";

type NewReview = typeof taskReviews.$inferInsert;

export const reviewTask = async (reviewData: NewReview) => {
  const authData = await requireManager();

  // Verify the user is the one doing the review
  if (authData.employee.id !== reviewData.reviewedBy) {
    return {
      success: null,
      error: { reason: "You can only review as yourself" },
    };
  }

  try {
    const manager = await getEmployee(reviewData.reviewedBy);

    if (!manager || !manager.isManager) {
      return {
        success: null,
        error: { reason: "Only managers can review tasks" },
      };
    }

    await db.insert(taskReviews).values({
      ...reviewData,
    });

    // Status side-effects based on review decision
    if (reviewData.status === "Accepted") {
      // Accepted -> Completed
      await db
        .update(tasks)
        .set({ status: "Completed", updatedAt: new Date() })
        .where(eq(tasks.id, reviewData.taskId));
    } else if (reviewData.status === "Rejected") {
      // Rejected -> keep task In Progress (don’t downgrade a Completed task)
      const current = await db
        .select({ status: tasks.status })
        .from(tasks)
        .where(eq(tasks.id, reviewData.taskId))
        .limit(1)
        .then((r) => r[0]);

      if (current && current.status !== "Completed") {
        await db
          .update(tasks)
          .set({ status: "In Progress", updatedAt: new Date() })
          .where(eq(tasks.id, reviewData.taskId));
      }
    }

    revalidatePath("/tasks");
    return {
      success: { reason: "Task reviewed successfully" },
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
};

export const getSubmissionReviews = async (submissionId: number) => {
  await requireAuth();
  return await db
    .select()
    .from(taskReviews)
    .where(eq(taskReviews.submissionId, submissionId));
};
