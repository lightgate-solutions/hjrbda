import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { document } from "@/db/schema/documents";
import { documentVersions } from "@/db/schema/documents";
import { documentAccess } from "@/db/schema/documents";
import { employees } from "@/db/schema/hr";
import { eq, desc, and, or, inArray, sql, type SQL } from "drizzle-orm";
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

    // Normalize role like dashboard does
    const normalizedRole = role?.toLowerCase().trim() || "";

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

    // Build visibility condition based on user role
    let whereClause: SQL<unknown>;

    if (normalizedRole === "admin") {
      // Admin can see all active documents
      whereClause = eq(document.status, "active");
    } else if (employee.isManager || normalizedRole === "manager") {
      // Manager can see own documents, team member documents, departmental documents, and public documents
      const subordinates = await db
        .select({ id: employees.id })
        .from(employees)
        .where(
          and(
            eq(employees.managerId, employee.id),
            eq(employees.isManager, false),
          ),
        );

      const teamMemberIds = subordinates.map((s) => s.id);

      whereClause =
        teamMemberIds.length > 0
          ? (and(
              eq(document.status, "active"),
              or(
                eq(document.uploadedBy, employee.id),
                inArray(document.uploadedBy, teamMemberIds),
                and(
                  eq(document.departmental, true),
                  eq(document.department, employee.department || ""),
                ),
                eq(document.public, true),
              ) ?? eq(document.uploadedBy, employee.id),
            ) ?? eq(document.status, "active"))
          : (and(
              eq(document.status, "active"),
              or(
                eq(document.uploadedBy, employee.id),
                and(
                  eq(document.departmental, true),
                  eq(document.department, employee.department || ""),
                ),
                eq(document.public, true),
              ) ?? eq(document.uploadedBy, employee.id),
            ) ?? eq(document.status, "active"));
    } else {
      // Staff/User can see own documents, public documents, departmental documents, or documents with explicit access
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

      whereClause =
        and(eq(document.status, "active"), visibilityCondition) ??
        eq(document.status, "active");
    }

    // Get recent documents - join with versions to get file size
    // Select both title and name to ensure we have the document name
    const recentDocs = await db
      .select({
        id: document.id,
        title: document.title, // Keep original title field
        name: document.title, // Map title to name for component
        uploadedDate: document.createdAt,
        size: documentVersions.fileSize,
        uploadedBy: employees.name,
        status: document.status,
        currentVersionId: document.currentVersionId,
      })
      .from(document)
      .leftJoin(employees, eq(document.uploadedBy, employees.id))
      .leftJoin(
        documentVersions,
        eq(documentVersions.id, document.currentVersionId),
      )
      .where(whereClause)
      .orderBy(desc(document.createdAt))
      .limit(5);

    // Filter out documents without valid IDs or names
    // Include documents even if size is null (join might fail if version doesn't exist yet)
    const validDocs = recentDocs.filter((doc) => {
      // Check if document has valid ID and name (title)
      const hasValidId = doc.id && typeof doc.id === "number";
      const hasValidName = doc.name?.trim() || doc.title?.trim();
      return hasValidId && hasValidName;
    });

    // Format documents for display
    const formattedDocs = validDocs.map((doc) => {
      const date = new Date(doc.uploadedDate || new Date());
      const size = doc.size ? parseFloat(String(doc.size)) : 0;
      let formattedSize = "0 MB";

      if (size >= 1) {
        formattedSize = `${size.toFixed(1)} MB`;
      } else if (size > 0) {
        formattedSize = `${(size * 1024).toFixed(0)} KB`;
      }

      // Ensure we have a valid document name
      const documentName =
        doc.name?.trim() || doc.title?.trim() || "Untitled Document";

      return {
        id: doc.id,
        name: documentName,
        uploadedDate: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        size: formattedSize,
        uploadedBy: doc.uploadedBy || "Unknown",
      };
    });

    return NextResponse.json(
      {
        documents: formattedDocs,
        total: formattedDocs.length,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    console.error("[Recent Documents API] Unexpected error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        error: "Failed to fetch recent documents",
        message: errorMessage,
        documents: [],
      },
      { status: 500 },
    );
  }
}
