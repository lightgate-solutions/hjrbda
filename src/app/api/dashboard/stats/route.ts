import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { employees } from "@/db/schema/hr";
import { document } from "@/db/schema/documents";
import { documentAccess } from "@/db/schema/documents";
import { projects } from "@/db/schema/projects";
import { emailRecipient } from "@/db/schema/mail";
import { notifications } from "@/db/schema/notifications";
import { eq, and, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    const authUserId = session?.user?.id;
    const role = session?.user?.role;

    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get employee info
    const employeeResult = await db
      .select({
        id: employees.id,
        isManager: employees.isManager,
        department: employees.department,
      })
      .from(employees)
      .where(eq(employees.authId, authUserId))
      .limit(1);

    const employee = employeeResult[0];
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    // Normalize role check like other endpoints
    const normalizedRole = role?.toLowerCase().trim() || "";
    const isAdmin = normalizedRole === "admin";

    // Document stats - simplified query
    let documentCount = 0;
    try {
      if (isAdmin) {
        // Admin sees all active documents
        const docResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(document)
          .where(eq(document.status, "active"));
        documentCount = Number(docResult[0]?.count ?? 0);
      } else {
        // Build visibility condition for non-admin users
        // Users can see documents they uploaded, public documents, departmental documents, or documents they have access to
        const visibilityCondition = sql`(
          ${document.uploadedBy} = ${employee.id}
          OR ${document.public} = true
          OR (${document.departmental} = true AND ${document.department} = ${employee.department ?? ""})
          OR EXISTS (
            SELECT 1 FROM ${documentAccess}
            WHERE ${documentAccess.documentId} = ${document.id}
              AND (
                ${documentAccess.userId} = ${employee.id}
                OR (${documentAccess.department} IS NOT NULL AND ${documentAccess.department} = ${employee.department ?? ""})
              )
          )
        )`;

        const docResult = await db
          .select({ count: sql<number>`count(distinct ${document.id})::int` })
          .from(document)
          .where(and(eq(document.status, "active"), visibilityCondition));
        documentCount = Number(docResult[0]?.count ?? 0);
      }
    } catch {
      documentCount = 0;
    }

    // Project stats
    let projectCount = 0;
    try {
      const projectResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(projects);
      projectCount = Number(projectResult[0]?.count ?? 0);
    } catch {
      projectCount = 0;
    }

    // Email stats
    let emailStats = { unread: 0, inbox: 0 };
    try {
      const [unreadResult, inboxResult] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(emailRecipient)
          .where(
            and(
              eq(emailRecipient.recipientId, employee.id),
              eq(emailRecipient.isRead, false),
              eq(emailRecipient.isArchived, false),
              eq(emailRecipient.isDeleted, false),
            ),
          ),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(emailRecipient)
          .where(
            and(
              eq(emailRecipient.recipientId, employee.id),
              eq(emailRecipient.isArchived, false),
              eq(emailRecipient.isDeleted, false),
            ),
          ),
      ]);

      emailStats = {
        unread: Number(unreadResult[0]?.count ?? 0),
        inbox: Number(inboxResult[0]?.count ?? 0),
      };
    } catch {
      // Keep default values
    }

    // Notification stats
    let notificationCount = 0;
    try {
      const notifResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.user_id, employee.id),
            eq(notifications.is_read, false),
          ),
        );
      notificationCount = Number(notifResult[0]?.count ?? 0);
    } catch {
      // Keep default values
    }

    return NextResponse.json(
      {
        documents: documentCount,
        projects: projectCount,
        emails: emailStats,
        notifications: notificationCount,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error: "Failed to fetch dashboard stats",
        documents: 0,
        projects: 0,
        emails: { unread: 0, inbox: 0 },
        notifications: 0,
      },
      { status: 500 },
    );
  }
}
