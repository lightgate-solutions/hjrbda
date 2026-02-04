/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

"use server";

import { db } from "@/db";
import { askHrQuestions, askHrResponses, employees } from "@/db/schema";
import {
  DrizzleQueryError,
  eq,
  and,
  or,
  desc,
  ilike,
  count,
  isNull,
  not,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { alias } from "drizzle-orm/pg-core";
import { getUser } from "@/actions/auth/dal";
import { createNotification } from "@/actions/notification/notification";
import { z } from "zod";

const questionSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(100, "Title must not exceed 100 characters"),
  question: z.string().min(10, "Question must be at least 10 characters"),
  isAnonymous: z.boolean().default(false),
  isPublic: z.boolean().default(false),
  allowPublicResponses: z.boolean().default(false),
  category: z.enum([
    "General",
    "Benefits",
    "Payroll",
    "Leave",
    "Employment",
    "Workplace",
    "Training",
    "Other",
  ]),
});

const responseSchema = z.object({
  response: z.string().min(1, "Response is required"),
  isInternal: z.boolean().default(false),
});

const redirectSchema = z.object({
  employeeId: z.number().int().positive("Valid employee is required"),
});

export async function getAskHrQuestions(filters?: {
  employeeId?: number;
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  onlyMine?: boolean;
  includeRedirected?: boolean;
  publicOnly?: boolean;
}) {
  try {
    // Get current user
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        questions: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
    }

    const questionAuthor = alias(employees, "author");
    const redirectEmployee = alias(employees, "redirected_to");

    // Build query conditions
    const conditions: any[] = [];

    // Handle filtering based on user role and requested view
    const isHrAdmin =
      currentUser.department === "HR" || currentUser.role === "admin";

    if (filters?.publicOnly) {
      // Public questions view - visible to all
      conditions.push(eq(askHrQuestions.isPublic, true));
    } else if (!isHrAdmin) {
      // Regular users can see:
      // 1. Their own questions
      // 2. Questions redirected to them
      // 3. Public questions
      if (filters?.onlyMine) {
        conditions.push(eq(askHrQuestions.employeeId, currentUser.id));
      } else {
        conditions.push(
          or(
            eq(askHrQuestions.employeeId, currentUser.id),
            eq(askHrQuestions.redirectedTo, currentUser.id),
            eq(askHrQuestions.isPublic, true),
          ),
        );
      }
    } else if (filters?.onlyMine) {
      // HR/admin requesting only their questions
      conditions.push(eq(askHrQuestions.employeeId, currentUser.id));
    }

    // Other filters
    if (filters?.employeeId) {
      conditions.push(eq(askHrQuestions.employeeId, filters.employeeId));
    }
    if (filters?.category) {
      conditions.push(eq(askHrQuestions.category, filters.category as any));
    }
    if (filters?.status) {
      conditions.push(eq(askHrQuestions.status, filters.status as any));
    }

    // Redirected questions filter
    if (filters?.includeRedirected) {
      conditions.push(not(isNull(askHrQuestions.redirectedTo)));
    }

    // Search by title or content
    if (filters?.search) {
      conditions.push(
        or(
          ilike(askHrQuestions.title, `%${filters.search}%`),
          ilike(askHrQuestions.question, `%${filters.search}%`),
          ilike(questionAuthor.name, `%${filters.search}%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const totalResult = await db
      .select({ count: count() })
      .from(askHrQuestions)
      .leftJoin(
        questionAuthor,
        eq(askHrQuestions.employeeId, questionAuthor.id),
      )
      .leftJoin(
        redirectEmployee,
        eq(askHrQuestions.redirectedTo, redirectEmployee.id),
      )
      .where(whereClause);

    const total = totalResult[0]?.count || 0;

    // Get paginated results
    const result = await db
      .select({
        id: askHrQuestions.id,
        title: askHrQuestions.title,
        question: askHrQuestions.question,
        isAnonymous: askHrQuestions.isAnonymous,
        isPublic: askHrQuestions.isPublic,
        allowPublicResponses: askHrQuestions.allowPublicResponses,
        category: askHrQuestions.category,
        status: askHrQuestions.status,
        createdAt: askHrQuestions.createdAt,
        updatedAt: askHrQuestions.updatedAt,
        // Author information
        authorId: askHrQuestions.employeeId,
        authorName: questionAuthor.name,
        authorEmail: questionAuthor.email,
        authorDepartment: questionAuthor.department,
        // Redirected information
        redirectedTo: askHrQuestions.redirectedTo,
        redirectedName: redirectEmployee.name,
        redirectedEmail: redirectEmployee.email,
        redirectedDepartment: redirectEmployee.department,
      })
      .from(askHrQuestions)
      .leftJoin(
        questionAuthor,
        eq(askHrQuestions.employeeId, questionAuthor.id),
      )
      .leftJoin(
        redirectEmployee,
        eq(askHrQuestions.redirectedTo, redirectEmployee.id),
      )
      .where(whereClause)
      .orderBy(desc(askHrQuestions.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      questions: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (_error) {
    return {
      questions: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
      error: "Failed to fetch questions",
    };
  }
}

// Get a single question with all responses
export async function getAskHrQuestion(questionId: number) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return { error: "Not authenticated" };
    }

    const questionAuthor = alias(employees, "author");
    const redirectEmployee = alias(employees, "redirected_to");

    // Get the question with author info
    const question = await db
      .select({
        id: askHrQuestions.id,
        title: askHrQuestions.title,
        question: askHrQuestions.question,
        isAnonymous: askHrQuestions.isAnonymous,
        isPublic: askHrQuestions.isPublic,
        allowPublicResponses: askHrQuestions.allowPublicResponses,
        category: askHrQuestions.category,
        status: askHrQuestions.status,
        createdAt: askHrQuestions.createdAt,
        updatedAt: askHrQuestions.updatedAt,
        // Author information
        authorId: askHrQuestions.employeeId,
        authorName: questionAuthor.name,
        authorEmail: questionAuthor.email,
        authorDepartment: questionAuthor.department,
        // Redirected information
        redirectedTo: askHrQuestions.redirectedTo,
        redirectedName: redirectEmployee.name,
        redirectedEmail: redirectEmployee.email,
        redirectedDepartment: redirectEmployee.department,
      })
      .from(askHrQuestions)
      .leftJoin(
        questionAuthor,
        eq(askHrQuestions.employeeId, questionAuthor.id),
      )
      .leftJoin(
        redirectEmployee,
        eq(askHrQuestions.redirectedTo, redirectEmployee.id),
      )
      .where(eq(askHrQuestions.id, questionId))
      .limit(1)
      .then((rows) => rows[0]);

    // Check access permissions
    if (!question) {
      return { error: "Question not found" };
    }

    const isHrAdmin =
      currentUser.department === "HR" || currentUser.role === "admin";
    const isOwner = question.authorId === currentUser.id;
    const isRedirected = question.redirectedTo === currentUser.id;
    const isPublic = question.isPublic;

    if (!isHrAdmin && !isOwner && !isRedirected && !isPublic) {
      return { error: "You don't have permission to view this question" };
    }

    // Get all responses
    const responses = await db
      .select({
        id: askHrResponses.id,
        response: askHrResponses.response,
        isInternal: askHrResponses.isInternal,
        createdAt: askHrResponses.createdAt,
        respondentId: askHrResponses.respondentId,
        respondentName: employees.name,
        respondentEmail: employees.email,
        respondentDepartment: employees.department,
      })
      .from(askHrResponses)
      .leftJoin(employees, eq(askHrResponses.respondentId, employees.id))
      .where(eq(askHrResponses.questionId, questionId))
      .orderBy(askHrResponses.createdAt);

    // Filter out internal notes for non-HR/admin users
    const filteredResponses = isHrAdmin
      ? responses
      : responses.filter((r) => !r.isInternal);

    // Determine if the user can respond
    const canRespond =
      isHrAdmin || isRedirected || (isPublic && question.allowPublicResponses);

    return {
      question,
      responses: filteredResponses,
      canRespond,
      canRedirect: isHrAdmin,
    };
  } catch (_error) {
    return { error: "Failed to fetch question details" };
  }
}

// Submit a new question
export async function submitAskHrQuestion(
  data: z.infer<typeof questionSchema>,
) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: null,
        error: { reason: "Not authenticated" },
      };
    }

    // Validate input
    const validated = questionSchema.safeParse(data);
    if (!validated.success) {
      const formattedErrors = validated.error.message;
      return {
        success: null,
        error: { reason: "Validation failed", errors: formattedErrors },
      };
    }

    // Insert the question
    const [question] = await db
      .insert(askHrQuestions)
      .values({
        employeeId: currentUser.id,
        title: validated.data.title,
        question: validated.data.question,
        isAnonymous: validated.data.isAnonymous,
        isPublic: validated.data.isPublic,
        allowPublicResponses: validated.data.allowPublicResponses,
        category: validated.data.category as any,
        status: "Open",
      })
      .returning();

    // Notify HR department
    await notifyHrDepartment(
      "New HR Question",
      `A new question has been submitted: ${validated.data.title}`,
      question.id,
    );

    revalidatePath("/hr/ask-hr");
    return {
      success: { reason: "Question submitted successfully" },
      error: null,
      questionId: question.id,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error" },
      };
    }

    return {
      success: null,
      error: { reason: "Failed to submit your question. Please try again." },
    };
  }
}

// Submit a response to a question
export async function respondToAskHrQuestion(
  questionId: number,
  data: z.infer<typeof responseSchema>,
) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: null,
        error: { reason: "Not authenticated" },
      };
    }

    // Validate input
    const validated = responseSchema.safeParse(data);
    if (!validated.success) {
      return {
        success: null,
        error: { reason: "Validation failed", errors: validated.error.message },
      };
    }

    // Get the question to check permissions
    const question = await db
      .select()
      .from(askHrQuestions)
      .where(eq(askHrQuestions.id, questionId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!question) {
      return {
        success: null,
        error: { reason: "Question not found" },
      };
    }

    // Check if user can respond (HR/admin or redirected user)
    const isHrAdmin =
      currentUser.department === "HR" || currentUser.role === "admin";
    const isRedirected = question.redirectedTo === currentUser.id;

    if (!isHrAdmin && !isRedirected) {
      return {
        success: null,
        error: {
          reason: "You don't have permission to respond to this question",
        },
      };
    }

    // Only HR/admin can create internal notes
    if (data.isInternal && !isHrAdmin) {
      return {
        success: null,
        error: { reason: "Only HR and admin can create internal notes" },
      };
    }

    // Use a transaction for all database operations
    await db.transaction(async (tx) => {
      // Insert the response
      await tx.insert(askHrResponses).values({
        questionId,
        respondentId: currentUser.id,
        response: validated.data.response,
        isInternal: validated.data.isInternal,
      });

      // Update question status to Answered if it's not an internal note
      if (!validated.data.isInternal) {
        await tx
          .update(askHrQuestions)
          .set({
            status: "Answered",
            updatedAt: new Date(),
          })
          .where(eq(askHrQuestions.id, questionId));

        // Notify the question author if it's not an internal note
        if (!data.isInternal) {
          await createNotification({
            user_id: question.employeeId,
            title: "HR Question Answered",
            message: `Your question "${question.title}" has received a response`,
            notification_type: "message",
            reference_id: questionId,
          });
        }
      }
    });

    revalidatePath(`/hr/ask-hr/${questionId}`);
    revalidatePath("/hr/ask-hr");

    return {
      success: { reason: "Response submitted successfully" },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error" },
      };
    }

    return {
      success: null,
      error: { reason: "Failed to submit your response. Please try again." },
    };
  }
}

// Redirect a question to another employee
export async function redirectAskHrQuestion(
  questionId: number,
  data: z.infer<typeof redirectSchema>,
) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: null,
        error: { reason: "Not authenticated" },
      };
    }

    // Validate input
    const validated = redirectSchema.safeParse(data);
    if (!validated.success) {
      return {
        success: null,
        error: { reason: "Validation failed", errors: validated.error.message },
      };
    }

    // Only HR/admin can redirect questions
    if (currentUser.department !== "HR" && currentUser.role !== "admin") {
      return {
        success: null,
        error: { reason: "Only HR and admin can redirect questions" },
      };
    }

    // Get the question
    const question = await db
      .select()
      .from(askHrQuestions)
      .where(eq(askHrQuestions.id, questionId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!question) {
      return {
        success: null,
        error: { reason: "Question not found" },
      };
    }

    // Get the target employee
    const targetEmployee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, validated.data.employeeId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!targetEmployee) {
      return {
        success: null,
        error: { reason: "Target employee not found" },
      };
    }

    // Use a transaction for all database operations
    await db.transaction(async (tx) => {
      // Update the question status and redirect
      await tx
        .update(askHrQuestions)
        .set({
          redirectedTo: validated.data.employeeId,
          status: "Redirected",
          updatedAt: new Date(),
        })
        .where(eq(askHrQuestions.id, questionId));

      // Add a system note about the redirection
      await tx.insert(askHrResponses).values({
        questionId,
        respondentId: currentUser.id,
        response: `This question has been redirected to ${targetEmployee.name} (${targetEmployee.department})`,
        isInternal: false,
      });

      // Notification will be handled outside the transaction due to its own error handling
    });

    // Notify the redirected employee
    await createNotification({
      user_id: validated.data.employeeId,
      title: "HR Question Redirected to You",
      message: `A HR question has been redirected to you: "${question.title}"`,
      notification_type: "message",
      reference_id: questionId,
    });

    revalidatePath(`/hr/ask-hr/${questionId}`);
    revalidatePath("/hr/ask-hr");

    return {
      success: { reason: "Question redirected successfully" },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error" },
      };
    }

    return {
      success: null,
      error: { reason: "Failed to redirect the question. Please try again." },
    };
  }
}

// Update question status
export async function updateAskHrQuestionStatus(
  questionId: number,
  status: "Open" | "In Progress" | "Answered" | "Closed",
) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: null,
        error: { reason: "Not authenticated" },
      };
    }

    // Only HR/admin can update status
    if (currentUser.department !== "HR" && currentUser.role !== "admin") {
      return {
        success: null,
        error: { reason: "Only HR and admin can update question status" },
      };
    }

    // Get the question
    const question = await db
      .select()
      .from(askHrQuestions)
      .where(eq(askHrQuestions.id, questionId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!question) {
      return {
        success: null,
        error: { reason: "Question not found" },
      };
    }

    // Use a transaction for all database operations
    await db.transaction(async (tx) => {
      // Update status
      await tx
        .update(askHrQuestions)
        .set({
          status: status as any,
          updatedAt: new Date(),
        })
        .where(eq(askHrQuestions.id, questionId));

      // If changing to "In Progress", add a system note
      if (status === "In Progress") {
        await tx.insert(askHrResponses).values({
          questionId,
          respondentId: currentUser.id,
          response: "HR is now working on this question",
          isInternal: false,
        });
      }

      // If changing to "Closed", add a system note
      if (status === "Closed") {
        await tx.insert(askHrResponses).values({
          questionId,
          respondentId: currentUser.id,
          response: "This question has been marked as closed",
          isInternal: false,
        });
      }
    });

    // Notifications are handled outside the transaction due to their own error handling
    if (status === "In Progress") {
      // Notify the author
      await createNotification({
        user_id: question.employeeId,
        title: "HR Question Update",
        message: `Your question "${question.title}" is now being processed`,
        notification_type: "message",
        reference_id: questionId,
      });
    }

    if (status === "Closed") {
      // Notify the author
      await createNotification({
        user_id: question.employeeId,
        title: "HR Question Closed",
        message: `Your question "${question.title}" has been closed`,
        notification_type: "message",
        reference_id: questionId,
      });
    }

    revalidatePath(`/hr/ask-hr/${questionId}`);
    revalidatePath("/hr/ask-hr");

    return {
      success: { reason: `Question status updated to ${status}` },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error" },
      };
    }

    return {
      success: null,
      error: { reason: "Failed to update question status. Please try again." },
    };
  }
}

// Helper function to notify all HR department members
async function notifyHrDepartment(
  title: string,
  message: string,
  referenceId: number,
) {
  // Get all HR department members
  const hrEmployees = await db
    .select({
      id: employees.id,
    })
    .from(employees)
    .where(eq(employees.department, "HR"));

  // Create notifications for each HR employee
  for (const employee of hrEmployees) {
    await createNotification({
      user_id: employee.id,
      title,
      message,
      notification_type: "message",
      reference_id: referenceId,
    });
  }
}

// Get employees for redirection (for dropdown)
export async function getEmployeesForRedirection() {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return [];
    }

    // Only HR/admin can access this
    if (currentUser.department !== "HR" && currentUser.role !== "admin") {
      return [];
    }

    return await db
      .select({
        id: employees.id,
        name: employees.name,
        department: employees.department,
        role: employees.role,
      })
      .from(employees)
      .orderBy(employees.name);
  } catch (_error) {
    return [];
  }
}

// Schema for toggling question visibility and response permissions
const visibilitySchema = z.object({
  isPublic: z.boolean(),
  allowPublicResponses: z.boolean(),
});

// Toggle a question's public visibility and response permissions
export async function updateQuestionVisibility(
  questionId: number,
  data: z.infer<typeof visibilitySchema>,
) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: null,
        error: { reason: "Not authenticated" },
      };
    }

    // Only HR/admin or the question owner can update visibility
    const isHrAdmin =
      currentUser.department === "HR" || currentUser.role === "admin";

    if (!isHrAdmin) {
      // Check if user is the author
      const question = await db
        .select({ employeeId: askHrQuestions.employeeId })
        .from(askHrQuestions)
        .where(eq(askHrQuestions.id, questionId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!question || question.employeeId !== currentUser.id) {
        return {
          success: null,
          error: {
            reason:
              "You don't have permission to update this question's visibility",
          },
        };
      }
    }

    // Validate input
    const validated = visibilitySchema.safeParse(data);
    if (!validated.success) {
      return {
        success: null,
        error: { reason: "Validation failed" },
      };
    }

    // Use a transaction for updating the question
    await db.transaction(async (tx) => {
      await tx
        .update(askHrQuestions)
        .set({
          isPublic: validated.data.isPublic,
          allowPublicResponses: validated.data.allowPublicResponses,
          updatedAt: new Date(),
        })
        .where(eq(askHrQuestions.id, questionId));
    });

    revalidatePath(`/hr/ask-hr/${questionId}`);
    revalidatePath("/hr/ask-hr");

    return {
      success: {
        reason: validated.data.isPublic
          ? "Question is now public"
          : "Question is now private",
      },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error" },
      };
    }

    return {
      success: null,
      error: { reason: "Failed to update question visibility" },
    };
  }
}
