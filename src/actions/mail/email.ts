/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

"use server";

import { db } from "@/db";
import {
  email,
  emailRecipient,
  emailAttachment,
  employees,
  document,
  documentVersions,
} from "@/db/schema";
import { createNotification } from "../notification/notification";
import { and, eq, or, ilike, sql, desc, inArray } from "drizzle-orm";
import * as z from "zod";
import { getUser } from "../auth/dal";
import { sendInAppEmailNotification } from "@/lib/emails";
import { filterUsersByEmailPreference } from "@/lib/notification-helpers";

/**
 * Send external email notifications to recipients who have email notifications enabled
 * This runs asynchronously and does not block the main email send operation
 */
async function sendExternalEmailNotifications({
  recipientIds,
  emailId,
  emailSubject,
  emailBody,
  emailType,
  senderName,
  senderEmail,
  attachmentCount = 0,
}: {
  recipientIds: number[];
  emailId: number;
  emailSubject: string;
  emailBody: string;
  emailType: "sent" | "reply" | "forward";
  senderName: string;
  senderEmail: string;
  attachmentCount?: number;
}) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Filter users by preference (hierarchical check built-in)
    const recipientsToNotify = await filterUsersByEmailPreference(
      recipientIds,
      "in_app_message",
    );

    if (recipientsToNotify.length === 0) {
      console.log(
        "No recipients opted in for in-app message email notifications",
      );
      return;
    }

    // Fetch recipient email addresses
    const recipients = await db
      .select({
        employeeId: employees.id,
        employeeName: employees.name,
        employeeEmail: employees.email,
      })
      .from(employees)
      .where(inArray(employees.id, recipientsToNotify));

    // Send emails in parallel
    const emailPromises = recipients.map((recipient) =>
      sendInAppEmailNotification({
        recipient: {
          email: recipient.employeeEmail,
          name: recipient.employeeName,
        },
        sender: {
          name: senderName,
          email: senderEmail,
        },
        emailData: {
          id: emailId,
          subject: emailSubject,
          body: emailBody,
          attachmentCount,
          emailType,
        },
        appUrl,
      }).catch((error) => {
        console.error(
          `Failed to send external email notification to ${recipient.employeeEmail}:`,
          error,
        );
        return { error: error.message };
      }),
    );

    await Promise.allSettled(emailPromises);
    console.log(
      `Sent ${recipients.length} external email notifications for email ${emailId}`,
    );
  } catch (error) {
    console.error("Error sending external email notifications:", error);
  }
}

/**
 * Send emails to external recipients via Resend
 */
async function sendExternalEmails({
  externalRecipients,
  emailSubject,
  emailBody,
  senderName,
  senderEmail,
}: {
  externalRecipients: Array<{ email: string; name?: string }>;
  emailSubject: string;
  emailBody: string;
  senderName: string;
  senderEmail: string;
}) {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const emailPromises = externalRecipients.map((recipient) =>
      resend.emails.send({
        from: `${senderName} <email@cave.ng>`,
        to: recipient.email,
        replyTo: senderEmail,
        subject: emailSubject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f3f4f6; padding: 24px; border-radius: 8px 8px 0 0;">
              <h2 style="color: #1f2937; margin: 0;">Message from ${senderName}</h2>
            </div>
            <div style="background-color: white; padding: 24px; border: 1px solid #e5e7eb;">
              <div style="margin-bottom: 16px;">
                <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">From:</p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${senderName} (${senderEmail})</p>
              </div>
              <div style="margin-bottom: 16px;">
                <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">Subject:</p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${emailSubject}</p>
              </div>
              <div style="margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Message:</p>
                <div style="background-color: #f9fafb; padding: 12px; border-radius: 4px;">
                  <p style="margin: 0; color: #374151; white-space: pre-wrap;">${emailBody}</p>
                </div>
              </div>
            </div>
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                This email was sent via HJRBDA. Reply directly to ${senderEmail} to continue the conversation.
              </p>
            </div>
          </div>
        `,
        text: `Message from ${senderName} (${senderEmail})

Subject: ${emailSubject}

${emailBody}

---
This email was sent via HJRBDA. Reply directly to ${senderEmail} to continue the conversation.
        `.trim(),
      }),
    );

    await Promise.allSettled(emailPromises);
    console.log(`Sent ${externalRecipients.length} external emails via Resend`);
  } catch (error) {
    console.error("Error sending external emails:", error);
  }
}

const sendEmailSchema = z
  .object({
    recipientIds: z.array(z.number()).optional().default([]),
    externalRecipients: z
      .array(
        z.object({
          email: z.string().email(),
          name: z.string().optional(),
        }),
      )
      .optional()
      .default([]),
    subject: z.string().min(1, "Subject is required").max(500),
    body: z.string().min(1, "Body is required"),
    attachmentIds: z.array(z.number()).optional(),
  })
  .refine(
    (data) =>
      data.recipientIds.length > 0 || data.externalRecipients.length > 0,
    { message: "At least one recipient required" },
  );

const replyEmailSchema = z.object({
  parentEmailId: z.number(),
  recipientIds: z
    .array(z.number())
    .min(1, "At least one recipient is required"),
  subject: z.string().min(1, "Subject is required").max(500),
  body: z.string().min(1, "Body is required"),
  attachmentIds: z.array(z.number()).optional(),
});

const forwardEmailSchema = z.object({
  parentEmailId: z.number(),
  recipientIds: z
    .array(z.number())
    .min(1, "At least one recipient is required"),
  subject: z.string().min(1, "Subject is required").max(500),
  body: z.string().min(1, "Body is required"),
  attachmentIds: z.array(z.number()).optional(),
});

const searchEmailSchema = z.object({
  query: z.string().min(1),
  folder: z.enum(["inbox", "sent", "archive", "trash"]).optional(),
});

export async function sendEmail(
  data: z.infer<typeof sendEmailSchema>,
  create_notif = true,
) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return { success: false, data: null, error: "Log in to continue" };
    }

    const validated = sendEmailSchema.parse(data);

    const emailRecord = await db.transaction(async (tx) => {
      // Validate internal recipients if any
      if (validated.recipientIds.length > 0) {
        const recipients = await tx
          .select({ id: employees.id })
          .from(employees)
          .where(inArray(employees.id, validated.recipientIds));

        if (recipients.length !== validated.recipientIds.length) {
          return {
            success: false,
            data: null,
            error: "One or more recipients do not exist",
          };
        }
      }

      const [newEmail] = await tx
        .insert(email)
        .values({
          senderId: currentUser.id,
          subject: validated.subject,
          body: validated.body,
          type: "sent",
        })
        .returning();

      // Insert internal recipients
      if (validated.recipientIds.length > 0) {
        await tx.insert(emailRecipient).values(
          validated.recipientIds.map((recipientId) => ({
            emailId: newEmail.id,
            recipientId,
          })),
        );
      }

      // Insert external recipients
      if (validated.externalRecipients.length > 0) {
        await tx.insert(emailRecipient).values(
          validated.externalRecipients.map((recipient) => ({
            emailId: newEmail.id,
            recipientId: null,
            externalEmail: recipient.email,
            externalName: recipient.name || null,
          })),
        );
      }

      // Handle attachments if provided
      if (validated.attachmentIds && validated.attachmentIds.length > 0) {
        // Verify user has access to all documents
        const accessibleDocuments = await tx
          .select({ id: document.id })
          .from(document)
          .where(
            and(
              inArray(document.id, validated.attachmentIds),
              eq(document.status, "active"),
              or(
                eq(document.uploadedBy, currentUser.id),
                eq(document.public, true),
                and(
                  eq(document.departmental, true),
                  eq(document.department, currentUser.department),
                ),
              ),
            ),
          );

        if (accessibleDocuments.length !== validated.attachmentIds.length) {
          return {
            success: false,
            data: null,
            error: "You don't have access to one or more documents",
          };
        }

        // Attach documents to email
        await tx.insert(emailAttachment).values(
          validated.attachmentIds.map((documentId) => ({
            emailId: newEmail.id,
            documentId,
          })),
        );
      }

      return {
        success: true,
        data: newEmail,
        error: null,
      };
    });

    // Return error if transaction failed
    if (!emailRecord.success) {
      return emailRecord;
    }

    if (create_notif && emailRecord.data) {
      // Notify all recipients (not the sender)
      for (const recipientId of validated.recipientIds) {
        await createNotification({
          user_id: recipientId,
          title: "New message received",
          message: `${currentUser.name} sent you a message: "${validated.subject}"`,
          notification_type: "message",
          reference_id: emailRecord.data.id,
        });
      }

      // Send external email notifications (async, non-blocking)
      if (validated.recipientIds.length > 0) {
        sendExternalEmailNotifications({
          recipientIds: validated.recipientIds,
          emailId: emailRecord.data.id,
          emailSubject: validated.subject,
          emailBody: validated.body,
          emailType: "sent",
          senderName: currentUser.name,
          senderEmail: currentUser.email,
          attachmentCount: validated.attachmentIds?.length || 0,
        }).catch((error) => {
          console.error("External email notification failed:", error);
        });
      }

      // Send emails to external recipients via Resend (async, non-blocking)
      if (validated.externalRecipients.length > 0) {
        sendExternalEmails({
          externalRecipients: validated.externalRecipients,
          emailSubject: validated.subject,
          emailBody: validated.body,
          senderName: currentUser.name,
          senderEmail: currentUser.email,
        }).catch((error) => {
          console.error("External email send failed:", error);
        });
      }
    }

    return emailRecord;
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

export async function replyToEmail(data: z.infer<typeof replyEmailSchema>) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        data: null,
        error: "Log in to continue",
      };
    }

    const validated = replyEmailSchema.parse(data);

    const result = await db.transaction(async (tx) => {
      const [parentEmail] = await tx
        .select()
        .from(email)
        .where(eq(email.id, validated.parentEmailId))
        .limit(1);

      if (!parentEmail) {
        return {
          success: false,
          data: null,
          error: "Parent email not found",
        };
      }

      const recipients = await tx
        .select({ id: employees.id })
        .from(employees)
        .where(inArray(employees.id, validated.recipientIds));

      if (recipients.length !== validated.recipientIds.length) {
        return {
          success: false,
          data: null,
          error: "One or more recipients do not exist",
        };
      }

      const [newEmail] = await tx
        .insert(email)
        .values({
          senderId: currentUser.id,
          subject: validated.subject,
          body: validated.body,
          type: "reply",
          parentEmailId: validated.parentEmailId,
        })
        .returning();

      await tx.insert(emailRecipient).values(
        validated.recipientIds.map((recipientId) => ({
          emailId: newEmail.id,
          recipientId,
        })),
      );

      // Handle attachments if provided
      if (validated.attachmentIds && validated.attachmentIds.length > 0) {
        // Verify user has access to all documents
        const accessibleDocuments = await tx
          .select({ id: document.id })
          .from(document)
          .where(
            and(
              inArray(document.id, validated.attachmentIds),
              eq(document.status, "active"),
              or(
                eq(document.uploadedBy, currentUser.id),
                eq(document.public, true),
                and(
                  eq(document.departmental, true),
                  eq(document.department, currentUser.department),
                ),
              ),
            ),
          );

        if (accessibleDocuments.length !== validated.attachmentIds.length) {
          return {
            success: false,
            data: null,
            error: "You don't have access to one or more documents",
          };
        }

        // Attach documents to email
        await tx.insert(emailAttachment).values(
          validated.attachmentIds.map((documentId) => ({
            emailId: newEmail.id,
            documentId,
          })),
        );
      }

      return {
        success: true,
        error: null,
        data: newEmail,
      };
    });

    // Return error if transaction failed
    if (!result.success) {
      return result;
    }

    if (result.data) {
      // Send in-app notifications
      for (const recipientId of validated.recipientIds) {
        await createNotification({
          user_id: recipientId,
          title: "New reply received",
          message: `${currentUser.name} replied to: "${validated.subject}"`,
          notification_type: "message",
          reference_id: result.data.id,
        });
      }

      // Send external email notifications (async, non-blocking)
      sendExternalEmailNotifications({
        recipientIds: validated.recipientIds,
        emailId: result.data.id,
        emailSubject: validated.subject,
        emailBody: validated.body,
        emailType: "reply",
        senderName: currentUser.name,
        senderEmail: currentUser.email,
        attachmentCount: validated.attachmentIds?.length || 0,
      }).catch((error) => {
        console.error("External email notification failed:", error);
      });
    }

    return result;
  } catch (error) {
    return {
      success: false,
      data: null,
      error:
        error instanceof Error ? error.message : "Failed to reply to email",
    };
  }
}

export async function forwardEmail(data: z.infer<typeof forwardEmailSchema>) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Log in to continue",
        data: null,
      };
    }
    const validated = forwardEmailSchema.parse(data);

    const result = await db.transaction(async (tx) => {
      const [parentEmail] = await tx
        .select()
        .from(email)
        .where(eq(email.id, validated.parentEmailId))
        .limit(1);

      if (!parentEmail) {
        return {
          success: false,
          error: "Parent email not found",
          data: null,
        };
      }

      const recipients = await tx
        .select({ id: employees.id })
        .from(employees)
        .where(inArray(employees.id, validated.recipientIds));

      if (recipients.length !== validated.recipientIds.length) {
        return {
          success: false,
          error: "One or more recipients do not exist",
          data: null,
        };
      }

      const [newEmail] = await tx
        .insert(email)
        .values({
          senderId: currentUser.id,
          subject: validated.subject,
          body: validated.body,
          type: "forward",
          parentEmailId: validated.parentEmailId,
        })
        .returning();

      await tx.insert(emailRecipient).values(
        validated.recipientIds.map((recipientId) => ({
          emailId: newEmail.id,
          recipientId,
        })),
      );

      // Handle attachments if provided
      if (validated.attachmentIds && validated.attachmentIds.length > 0) {
        // Verify user has access to all documents
        const accessibleDocuments = await tx
          .select({ id: document.id })
          .from(document)
          .where(
            and(
              inArray(document.id, validated.attachmentIds),
              eq(document.status, "active"),
              or(
                eq(document.uploadedBy, currentUser.id),
                eq(document.public, true),
                and(
                  eq(document.departmental, true),
                  eq(document.department, currentUser.department),
                ),
              ),
            ),
          );

        if (accessibleDocuments.length !== validated.attachmentIds.length) {
          return {
            success: false,
            data: null,
            error: "You don't have access to one or more documents",
          };
        }

        // Attach documents to email
        await tx.insert(emailAttachment).values(
          validated.attachmentIds.map((documentId) => ({
            emailId: newEmail.id,
            documentId,
          })),
        );
      }

      return {
        success: true,
        error: null,
        data: newEmail,
      };
    });

    // Return error if transaction failed
    if (!result.success) {
      return result;
    }

    if (result.data) {
      // Send in-app notifications
      for (const recipientId of validated.recipientIds) {
        await createNotification({
          user_id: recipientId,
          title: "Message forwarded to you",
          message: `${currentUser.name} forwarded you a message: "${validated.subject}"`,
          notification_type: "message",
          reference_id: result.data.id,
        });
      }

      // Send external email notifications (async, non-blocking)
      sendExternalEmailNotifications({
        recipientIds: validated.recipientIds,
        emailId: result.data.id,
        emailSubject: validated.subject,
        emailBody: validated.body,
        emailType: "forward",
        senderName: currentUser.name,
        senderEmail: currentUser.email,
        attachmentCount: validated.attachmentIds?.length || 0,
      }).catch((error) => {
        console.error("External email notification failed:", error);
      });
    }

    return result;
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Failed to forward email",
    };
  }
}

export async function getInboxEmails(page = 1, limit = 20) {
  try {
    const currentUser = await getUser();
    if (!currentUser?.id) {
      return {
        success: false,
        error: "Log in to continue",
        data: null,
      };
    }
    const offset = (page - 1) * limit;

    return await db.transaction(async (tx) => {
      const emails = await tx
        .select({
          id: email.id,
          subject: email.subject,
          body: email.body,
          createdAt: email.createdAt,
          type: email.type,
          senderId: email.senderId,
          senderName: employees.name,
          senderEmail: employees.email,
          isRead: emailRecipient.isRead,
          readAt: emailRecipient.readAt,
        })
        .from(emailRecipient)
        .innerJoin(email, eq(emailRecipient.emailId, email.id))
        .innerJoin(employees, eq(email.senderId, employees.id))
        .where(
          and(
            eq(emailRecipient.recipientId, currentUser.id),
            eq(emailRecipient.isArchived, false),
            eq(emailRecipient.isDeleted, false),
          ),
        )
        .orderBy(desc(email.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(emailRecipient)
        .where(
          and(
            eq(emailRecipient.recipientId, currentUser.id),
            eq(emailRecipient.isArchived, false),
            eq(emailRecipient.isDeleted, false),
          ),
        );

      return {
        success: true,
        data: {
          emails,
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit),
          },
        },
        error: null,
      };
    });
  } catch (error) {
    return {
      success: false,
      data: null,
      error:
        error instanceof Error ? error.message : "Failed to get inbox emails",
    };
  }
}

export async function getArchivedEmails(page = 1, limit = 20) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Log in to continue",
        data: null,
      };
    }
    const offset = (page - 1) * limit;

    return await db.transaction(async (tx) => {
      const emails = await tx
        .select({
          id: email.id,
          subject: email.subject,
          body: email.body,
          createdAt: email.createdAt,
          type: email.type,
          senderId: email.senderId,
          senderName: employees.name,
          senderEmail: employees.email,
          isRead: emailRecipient.isRead,
          readAt: emailRecipient.readAt,
          archivedAt: emailRecipient.archivedAt,
        })
        .from(emailRecipient)
        .innerJoin(email, eq(emailRecipient.emailId, email.id))
        .innerJoin(employees, eq(email.senderId, employees.id))
        .where(
          and(
            eq(emailRecipient.recipientId, currentUser.id),
            eq(emailRecipient.isArchived, true),
            eq(emailRecipient.isDeleted, false),
          ),
        )
        .orderBy(desc(emailRecipient.archivedAt))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(emailRecipient)
        .where(
          and(
            eq(emailRecipient.recipientId, currentUser.id),
            eq(emailRecipient.isArchived, true),
            eq(emailRecipient.isDeleted, false),
          ),
        );

      return {
        success: true,
        data: {
          emails,
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit),
          },
        },
        error: null,
      };
    });
  } catch (error) {
    return {
      success: false,
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get archived emails",
    };
  }
}

export async function getSentEmails(page = 1, limit = 20) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Log in to continue",
        data: null,
      };
    }
    const offset = (page - 1) * limit;

    return await db.transaction(async (tx) => {
      const emails = await tx
        .select({
          id: email.id,
          subject: email.subject,
          body: email.body,
          createdAt: email.createdAt,
          type: email.type,
          hasBeenOpened: email.hasBeenOpened,
          recipients: sql<
            Array<{ id: number; name: string; email: string; isRead: boolean }>
          >`
	json_agg(
		json_build_object(
				'id', ${employees.id},
				'name', ${employees.name},
				'email', ${employees.email},
				'isRead', ${emailRecipient.isRead},
				'readAt', ${emailRecipient.readAt}
				)
		)
	`,
        })
        .from(email)
        .innerJoin(emailRecipient, eq(email.id, emailRecipient.emailId))
        .innerJoin(employees, eq(emailRecipient.recipientId, employees.id))
        .where(eq(email.senderId, currentUser.id))
        .groupBy(email.id)
        .orderBy(desc(email.createdAt))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(email)
        .where(eq(email.senderId, currentUser.id));

      return {
        success: true,
        data: {
          emails,
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit),
          },
        },
        error: null,
      };
    });
  } catch (error) {
    return {
      success: false,
      data: null,
      error:
        error instanceof Error ? error.message : "Failed to get sent emails",
    };
  }
}

// Get trash emails
export async function getTrashEmails(page = 1, limit = 20) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Log in to continue",
        data: null,
      };
    }

    const offset = (page - 1) * limit;

    return await db.transaction(async (tx) => {
      const emails = await tx
        .select({
          id: email.id,
          subject: email.subject,
          body: email.body,
          createdAt: email.createdAt,
          type: email.type,
          senderId: email.senderId,
          senderName: employees.name,
          senderEmail: employees.email,
          isRead: emailRecipient.isRead,
          deletedAt: emailRecipient.deletedAt,
        })
        .from(emailRecipient)
        .innerJoin(email, eq(emailRecipient.emailId, email.id))
        .innerJoin(employees, eq(email.senderId, employees.id))
        .where(
          and(
            eq(emailRecipient.recipientId, currentUser.id),
            eq(emailRecipient.isDeleted, true),
          ),
        )
        .orderBy(desc(emailRecipient.deletedAt))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(emailRecipient)
        .where(
          and(
            eq(emailRecipient.recipientId, currentUser.id),
            eq(emailRecipient.isDeleted, true),
          ),
        );

      return {
        success: true,
        data: {
          emails,
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit),
          },
        },
        error: null,
      };
    });
  } catch (error) {
    return {
      success: false,
      data: null,
      error:
        error instanceof Error ? error.message : "Failed to get trash emails",
    };
  }
}

export async function getEmailById(emailId: number) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Log in to continue",
        data: null,
      };
    }

    return await db.transaction(async (tx) => {
      const [emailData] = await tx
        .select({
          id: email.id,
          subject: email.subject,
          body: email.body,
          createdAt: email.createdAt,
          type: email.type,
          parentEmailId: email.parentEmailId,
          senderId: email.senderId,
          senderName: employees.name,
          senderEmail: employees.email,
          hasBeenOpened: email.hasBeenOpened,
        })
        .from(email)
        .innerJoin(employees, eq(email.senderId, employees.id))
        .where(eq(email.id, emailId))
        .limit(1);

      if (!emailData) {
        return {
          success: false,
          data: null,
          error: "Email not found",
        };
      }
      const [recipientRow] = await tx
        .select({ id: emailRecipient.recipientId })
        .from(emailRecipient)
        .where(
          and(
            eq(emailRecipient.emailId, emailId),
            eq(emailRecipient.recipientId, currentUser.id),
          ),
        )
        .limit(1);

      const isSender = emailData.senderId === currentUser.id;
      const isRecipient = !!recipientRow;
      if (!isSender && !isRecipient) {
        return { success: false, data: null, error: "Unauthorized" };
      }

      const recipients = await tx
        .select({
          id: employees.id,
          name: employees.name,
          email: employees.email,
          isRead: emailRecipient.isRead,
          readAt: emailRecipient.readAt,
        })
        .from(emailRecipient)
        .innerJoin(employees, eq(emailRecipient.recipientId, employees.id))
        .where(eq(emailRecipient.emailId, emailId));

      const isUserSender = emailData.senderId === currentUser.id;
      const isUserReceipient = recipients.some((r) => r.id === currentUser.id);

      if (!isUserSender && !isUserReceipient) {
        return {
          success: false,
          data: null,
          error: "Unauthorized",
        };
      }

      let recipientStatus = null;
      if (isRecipient) {
        const [status] = await tx
          .select({
            isRead: emailRecipient.isRead,
            isArchived: emailRecipient.isArchived,
            isDeleted: emailRecipient.isDeleted,
            readAt: emailRecipient.readAt,
          })
          .from(emailRecipient)
          .where(
            and(
              eq(emailRecipient.emailId, emailId),
              eq(emailRecipient.recipientId, currentUser.id),
            ),
          )
          .limit(1);
        recipientStatus = status;
      }

      return {
        success: true,
        error: null,
        data: {
          ...emailData,
          recipients,
          isSender,
          isRecipient,
          recipientStatus,
        },
      };
    });
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Failed to get email",
    };
  }
}

export async function markEmailAsRead(emailId: number) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Log in to continue",
        data: null,
      };
    }

    return await db.transaction(async (tx) => {
      const [recipient] = await tx
        .select()
        .from(emailRecipient)
        .where(
          and(
            eq(emailRecipient.emailId, emailId),
            eq(emailRecipient.recipientId, currentUser.id),
          ),
        )
        .limit(1);

      if (!recipient) {
        return {
          success: false,
          data: null,
          error: "Email not found",
        };
      }

      if (recipient.isRead) {
        return {
          success: true,
          data: recipient,
          error: null,
        };
      }

      const [updated] = await tx
        .update(emailRecipient)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(eq(emailRecipient.id, recipient.id))
        .returning();

      await tx
        .update(email)
        .set({
          hasBeenOpened: true,
        })
        .where(eq(email.id, emailId));

      return {
        success: true,
        data: updated,
        error: null,
      };
    });
  } catch (error) {
    return {
      success: false,
      data: null,
      error:
        error instanceof Error ? error.message : "Failed to mark email as read",
    };
  }
}

export async function archiveEmail(emailId: number) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Log in to continue",
        data: null,
      };
    }

    const [updated] = await db
      .update(emailRecipient)
      .set({
        isArchived: true,
        archivedAt: new Date(),
      })
      .where(
        and(
          eq(emailRecipient.emailId, emailId),
          eq(emailRecipient.recipientId, currentUser.id),
        ),
      )
      .returning();

    if (!updated) {
      return {
        success: false,
        error: "Email not found",
        data: null,
      };
    }

    return {
      success: true,
      data: updated,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Failed to archive email",
    };
  }
}

export async function unarchiveEmail(emailId: number) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Log in to continue",
        data: null,
      };
    }

    const [updated] = await db
      .update(emailRecipient)
      .set({
        isArchived: false,
        archivedAt: null,
      })
      .where(
        and(
          eq(emailRecipient.emailId, emailId),
          eq(emailRecipient.recipientId, currentUser.id),
        ),
      )
      .returning();

    if (!updated) {
      return {
        success: false,
        error: "Email not found",
        data: null,
      };
    }

    return {
      success: true,
      error: null,
      data: updated,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error:
        error instanceof Error ? error.message : "Failed to unarchive email",
    };
  }
}

export async function moveEmailToTrash(emailId: number) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Log in to continue",
        data: null,
      };
    }

    const [updated] = await db
      .update(emailRecipient)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
      })
      .where(
        and(
          eq(emailRecipient.emailId, emailId),
          eq(emailRecipient.recipientId, currentUser.id),
        ),
      )
      .returning();

    if (!updated) {
      return {
        success: false,
        error: "Email not found",
        data: null,
      };
    }

    return {
      success: true,
      data: updated,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to move email to trash",
    };
  }
}

export async function restoreEmailFromTrash(emailId: number) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Log in to continue",
        data: null,
      };
    }

    const [updated] = await db
      .update(emailRecipient)
      .set({
        isDeleted: false,
        deletedAt: null,
      })
      .where(
        and(
          eq(emailRecipient.emailId, emailId),
          eq(emailRecipient.recipientId, currentUser.id),
        ),
      )
      .returning();

    if (!updated) {
      return {
        success: false,
        error: "Email not found",
        data: null,
      };
    }

    return {
      success: true,
      data: updated,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to restore email from trash",
    };
  }
}

export async function deleteSentEmail(emailId: number) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Log in to continue",
        data: null,
      };
    }

    return await db.transaction(async (tx) => {
      const [emailData] = await tx
        .select({
          id: email.id,
          senderId: email.senderId,
          hasBeenOpened: email.hasBeenOpened,
        })
        .from(email)
        .where(eq(email.id, emailId))
        .limit(1);

      if (!emailData) {
        return {
          success: false,
          data: null,
          error: "Email not found",
        };
      }

      if (emailData.senderId !== currentUser.id) {
        return {
          success: false,
          data: null,
          error: "Unauthorized - you are not the sender of this email",
        };
      }

      if (emailData.hasBeenOpened) {
        return {
          success: false,
          data: null,
          error:
            "Cannot delete email - it has already been opened by one or more recipients",
        };
      }

      await tx.delete(email).where(eq(email.id, emailId));

      return {
        success: true,
        error: null,
        data: "Email deleted successfully",
      };
    });
  } catch (error) {
    return {
      success: false,
      data: error,
      error:
        error instanceof Error ? error.message : "Failed to delete sent email",
    };
  }
}

export async function permanentlyDeleteEmail(emailId: number) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Log in to continue",
        data: null,
      };
    }

    const deleted = await db
      .delete(emailRecipient)
      .where(
        and(
          eq(emailRecipient.emailId, emailId),
          eq(emailRecipient.recipientId, currentUser.id),
          eq(emailRecipient.isDeleted, true),
        ),
      )
      .returning();

    if (deleted.length === 0) {
      return {
        success: false,
        data: null,
        error: "Email not found in trash",
      };
    }

    return {
      success: true,
      error: null,
      data: "Email permanently deleted",
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to permanently delete email",
    };
  }
}

export async function searchEmails(data: z.infer<typeof searchEmailSchema>) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Log in to continue",
        data: null,
      };
    }

    return await db.transaction(async (tx) => {
      const validated = searchEmailSchema.parse(data);
      const searchTerm = `%${validated.query}%`;

      let results: any[] = [];

      if (!validated.folder || validated.folder === "inbox") {
        const inboxResults = await tx
          .select({
            id: email.id,
            subject: email.subject,
            body: email.body,
            createdAt: email.createdAt,
            type: email.type,
            senderId: email.senderId,
            senderName: employees.name,
            senderEmail: employees.email,
            isRead: emailRecipient.isRead,
            folder: sql<string>`'inbox'`,
          })
          .from(emailRecipient)
          .innerJoin(email, eq(emailRecipient.emailId, email.id))
          .innerJoin(employees, eq(email.senderId, employees.id))
          .where(
            and(
              eq(emailRecipient.recipientId, currentUser.id),
              eq(emailRecipient.isArchived, false),
              eq(emailRecipient.isDeleted, false),
              or(
                ilike(email.subject, searchTerm),
                ilike(email.body, searchTerm),
                ilike(employees.name, searchTerm),
                ilike(employees.email, searchTerm),
              ),
            ),
          )
          .orderBy(desc(email.createdAt));

        results = [...results, ...inboxResults];
      }

      if (!validated.folder || validated.folder === "archive") {
        const archiveResults = await tx
          .select({
            id: email.id,
            subject: email.subject,
            body: email.body,
            createdAt: email.createdAt,
            type: email.type,
            senderId: email.senderId,
            senderName: employees.name,
            senderEmail: employees.email,
            isRead: emailRecipient.isRead,
            folder: sql<string>`'archive'`,
          })
          .from(emailRecipient)
          .innerJoin(email, eq(emailRecipient.emailId, email.id))
          .innerJoin(employees, eq(email.senderId, employees.id))
          .where(
            and(
              eq(emailRecipient.recipientId, currentUser.id),
              eq(emailRecipient.isArchived, true),
              eq(emailRecipient.isDeleted, false),
              or(
                ilike(email.subject, searchTerm),
                ilike(email.body, searchTerm),
                ilike(employees.name, searchTerm),
                ilike(employees.email, searchTerm),
              ),
            ),
          )
          .orderBy(desc(email.createdAt));

        results = [...results, ...archiveResults];
      }

      if (!validated.folder || validated.folder === "sent") {
        const sentResults = await tx
          .select({
            id: email.id,
            subject: email.subject,
            body: email.body,
            createdAt: email.createdAt,
            type: email.type,
            senderId: email.senderId,
            senderName: sql<string>`${employees.name}`,
            senderEmail: sql<string>`${employees.email}`,
            isRead: sql<boolean>`false`,
            folder: sql<string>`'sent'`,
          })
          .from(email)
          .innerJoin(employees, eq(email.senderId, employees.id))
          .where(
            and(
              eq(email.senderId, currentUser.id),
              or(
                ilike(email.subject, searchTerm),
                ilike(email.body, searchTerm),
              ),
            ),
          )
          .orderBy(desc(email.createdAt));

        results = [...results, ...sentResults];
      }

      if (!validated.folder || validated.folder === "trash") {
        const trashResults = await tx
          .select({
            id: email.id,
            subject: email.subject,
            body: email.body,
            createdAt: email.createdAt,
            type: email.type,
            senderId: email.senderId,
            senderName: employees.name,
            senderEmail: employees.email,
            isRead: emailRecipient.isRead,
            folder: sql<string>`'trash'`,
          })
          .from(emailRecipient)
          .innerJoin(email, eq(emailRecipient.emailId, email.id))
          .innerJoin(employees, eq(email.senderId, employees.id))
          .where(
            and(
              eq(emailRecipient.recipientId, currentUser.id),
              eq(emailRecipient.isDeleted, true),
              or(
                ilike(email.subject, searchTerm),
                ilike(email.body, searchTerm),
                ilike(employees.name, searchTerm),
                ilike(employees.email, searchTerm),
              ),
            ),
          )
          .orderBy(desc(email.createdAt));

        results = [...results, ...trashResults];
      }

      return {
        success: true,
        data: results,
        error: null,
      };
    });
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Failed to search emails",
    };
  }
}

export async function getEmailStats() {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Log in to continue",
        data: null,
      };
    }

    return await db.transaction(async (tx) => {
      const [{ unreadCount }] = await tx
        .select({ unreadCount: sql<number>`count(*)::int` })
        .from(emailRecipient)
        .where(
          and(
            eq(emailRecipient.recipientId, currentUser.id),
            eq(emailRecipient.isRead, false),
            eq(emailRecipient.isArchived, false),
            eq(emailRecipient.isDeleted, false),
          ),
        );

      const [{ inboxCount }] = await tx
        .select({ inboxCount: sql<number>`count(*)::int` })
        .from(emailRecipient)
        .where(
          and(
            eq(emailRecipient.recipientId, currentUser.id),
            eq(emailRecipient.isArchived, false),
            eq(emailRecipient.isDeleted, false),
          ),
        );

      const [{ archivedCount }] = await tx
        .select({ archivedCount: sql<number>`count(*)::int` })
        .from(emailRecipient)
        .where(
          and(
            eq(emailRecipient.recipientId, currentUser.id),
            eq(emailRecipient.isArchived, true),
            eq(emailRecipient.isDeleted, false),
          ),
        );

      const [{ sentCount }] = await tx
        .select({ sentCount: sql<number>`count(*)::int` })
        .from(email)
        .where(eq(email.senderId, currentUser.id));

      const [{ trashCount }] = await tx
        .select({ trashCount: sql<number>`count(*)::int` })
        .from(emailRecipient)
        .where(
          and(
            eq(emailRecipient.recipientId, currentUser.id),
            eq(emailRecipient.isDeleted, true),
          ),
        );

      return {
        success: true,
        error: null,
        data: {
          unreadCount,
          inboxCount,
          archivedCount,
          sentCount,
          trashCount,
        },
      };
    });
  } catch (error) {
    return {
      success: false,
      data: null,
      error:
        error instanceof Error ? error.message : "Failed to get email stats",
    };
  }
}

// Email Attachment Functions

const attachDocumentSchema = z.object({
  emailId: z.number(),
  documentId: z.number(),
});

export async function attachDocumentToEmail(
  data: z.infer<typeof attachDocumentSchema>,
) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        data: null,
        error: "Log in to continue",
      };
    }

    const validated = attachDocumentSchema.parse(data);

    return await db.transaction(async (tx) => {
      // Check if email exists and user has access
      const emailRecord = await tx.query.email.findFirst({
        where: eq(email.id, validated.emailId),
        with: {
          sender: true,
          recipients: true,
        },
      });

      if (!emailRecord) {
        return {
          success: false,
          data: null,
          error: "Email not found",
        };
      }

      // Check if user is sender or recipient
      const isSender = emailRecord.senderId === currentUser.id;
      const isRecipient = emailRecord.recipients.some(
        (r) => r.recipientId === currentUser.id,
      );

      if (!isSender && !isRecipient) {
        return {
          success: false,
          data: null,
          error: "You don't have access to this email",
        };
      }

      // Check if document exists and user has access
      const documentRecord = await tx.query.document.findFirst({
        where: eq(document.id, validated.documentId),
      });

      if (!documentRecord) {
        return {
          success: false,
          data: null,
          error: "Document not found",
        };
      }

      // Check if user has access to the document
      const hasDocumentAccess =
        documentRecord.uploadedBy === currentUser.id ||
        documentRecord.public ||
        (documentRecord.departmental &&
          documentRecord.department === currentUser.department);

      if (!hasDocumentAccess) {
        return {
          success: false,
          data: null,
          error: "You don't have access to this document",
        };
      }

      // Check if document is already attached
      const existingAttachment = await tx.query.emailAttachment.findFirst({
        where: and(
          eq(emailAttachment.emailId, validated.emailId),
          eq(emailAttachment.documentId, validated.documentId),
        ),
      });

      if (existingAttachment) {
        return {
          success: false,
          data: null,
          error: "Document is already attached to this email",
        };
      }

      // Attach the document
      const [attachment] = await tx
        .insert(emailAttachment)
        .values({
          emailId: validated.emailId,
          documentId: validated.documentId,
        })
        .returning();

      return {
        success: true,
        data: attachment,
        error: null,
      };
    });
  } catch (error) {
    return {
      success: false,
      data: null,
      error:
        error instanceof Error ? error.message : "Failed to attach document",
    };
  }
}

export async function getEmailAttachments(emailId: number) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        data: null,
        error: "Log in to continue",
      };
    }

    return await db.transaction(async (tx) => {
      // Check if email exists and user has access
      const emailRecord = await tx.query.email.findFirst({
        where: eq(email.id, emailId),
        with: {
          sender: true,
          recipients: true,
        },
      });

      if (!emailRecord) {
        return {
          success: false,
          data: null,
          error: "Email not found",
        };
      }

      // Check if user is sender or recipient
      const isSender = emailRecord.senderId === currentUser.id;
      const isRecipient = emailRecord.recipients.some(
        (r) => r.recipientId === currentUser.id,
      );

      if (!isSender && !isRecipient) {
        return {
          success: false,
          data: null,
          error: "You don't have access to this email",
        };
      }

      // Get attachments with document details
      const attachments = await tx
        .select({
          id: emailAttachment.id,
          emailId: emailAttachment.emailId,
          documentId: emailAttachment.documentId,
          createdAt: emailAttachment.createdAt,
          documentTitle: document.title,
          documentDescription: document.description,
          documentFileName: document.originalFileName,
          documentMimeType: documentVersions.mimeType,
          documentFileSize: documentVersions.fileSize,
          documentFilePath: documentVersions.filePath,
          documentUploader: employees.name,
          documentUploaderEmail: employees.email,
        })
        .from(emailAttachment)
        .leftJoin(document, eq(emailAttachment.documentId, document.id))
        .leftJoin(
          documentVersions,
          eq(document.currentVersionId, documentVersions.id),
        )
        .leftJoin(employees, eq(document.uploadedBy, employees.id))
        .where(eq(emailAttachment.emailId, emailId))
        .orderBy(desc(emailAttachment.createdAt));

      return {
        success: true,
        data: attachments,
        error: null,
      };
    });
  } catch (error) {
    return {
      success: false,
      data: null,
      error:
        error instanceof Error ? error.message : "Failed to get attachments",
    };
  }
}

export async function removeAttachmentFromEmail(attachmentId: number) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        data: null,
        error: "Log in to continue",
      };
    }

    return await db.transaction(async (tx) => {
      // Get attachment with email details
      const attachment = await tx.query.emailAttachment.findFirst({
        where: eq(emailAttachment.id, attachmentId),
        with: {
          email: {
            with: {
              sender: true,
              recipients: true,
            },
          },
        },
      });

      if (!attachment) {
        return {
          success: false,
          data: null,
          error: "Attachment not found",
        };
      }

      // Check if user is sender or recipient
      const isSender = attachment.email.senderId === currentUser.id;
      const isRecipient = attachment.email.recipients.some(
        (r) => r.recipientId === currentUser.id,
      );

      if (!isSender && !isRecipient) {
        return {
          success: false,
          data: null,
          error: "You don't have access to this email",
        };
      }

      // Only sender can remove attachments
      if (!isSender) {
        return {
          success: false,
          data: null,
          error: "Only the sender can remove attachments",
        };
      }

      // Remove the attachment
      await tx
        .delete(emailAttachment)
        .where(eq(emailAttachment.id, attachmentId));

      return {
        success: true,
        data: null,
        error: null,
      };
    });
  } catch (error) {
    return {
      success: false,
      data: null,
      error:
        error instanceof Error ? error.message : "Failed to remove attachment",
    };
  }
}

export async function getAccessibleDocumentsForAttachment() {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        data: null,
        error: "Log in to continue",
      };
    }

    // Get documents that the user can attach (documents they have access to)
    const documents = await db
      .select({
        id: document.id,
        title: document.title,
        description: document.description,
        originalFileName: document.originalFileName,
        department: document.department,
        public: document.public,
        departmental: document.departmental,
        createdAt: document.createdAt,
        uploader: employees.name,
        uploaderEmail: employees.email,
        fileSize: documentVersions.fileSize,
        mimeType: documentVersions.mimeType,
      })
      .from(document)
      .leftJoin(employees, eq(document.uploadedBy, employees.id))
      .leftJoin(
        documentVersions,
        eq(document.currentVersionId, documentVersions.id),
      )
      .where(
        and(
          eq(document.status, "active"),
          or(
            eq(document.uploadedBy, currentUser.id),
            eq(document.public, true),
            and(
              eq(document.departmental, true),
              eq(document.department, currentUser.department),
            ),
          ),
        ),
      )
      .orderBy(desc(document.updatedAt))
      .limit(50); // Limit to recent documents for performance

    return {
      success: true,
      data: documents,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Failed to get documents",
    };
  }
}

export async function getAccessibleDocumentsForAttachmentPaginated(
  page = 1,
  limit = 20,
  searchQuery = "",
) {
  try {
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        data: null,
        error: "Log in to continue",
      };
    }

    const offset = (page - 1) * limit;

    return await db.transaction(async (tx) => {
      // Build the base WHERE clause for access control
      const baseWhere = and(
        eq(document.status, "active"),
        or(
          eq(document.uploadedBy, currentUser.id),
          eq(document.public, true),
          and(
            eq(document.departmental, true),
            eq(document.department, currentUser.department),
          ),
        ),
      );

      // Add search filter if provided
      const whereClause = searchQuery
        ? and(
            baseWhere,
            or(
              ilike(document.title, `%${searchQuery}%`),
              ilike(document.description, `%${searchQuery}%`),
              ilike(document.originalFileName, `%${searchQuery}%`),
            ),
          )
        : baseWhere;

      // Fetch documents
      const documents = await tx
        .select({
          id: document.id,
          title: document.title,
          description: document.description,
          originalFileName: document.originalFileName,
          department: document.department,
          public: document.public,
          departmental: document.departmental,
          createdAt: document.createdAt,
          uploader: employees.name,
          uploaderEmail: employees.email,
          fileSize: documentVersions.fileSize,
          mimeType: documentVersions.mimeType,
        })
        .from(document)
        .leftJoin(employees, eq(document.uploadedBy, employees.id))
        .leftJoin(
          documentVersions,
          eq(document.currentVersionId, documentVersions.id),
        )
        .where(whereClause)
        .orderBy(desc(document.updatedAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(document)
        .where(whereClause);

      return {
        success: true,
        data: {
          documents,
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit),
          },
        },
        error: null,
      };
    });
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Failed to get documents",
    };
  }
}
