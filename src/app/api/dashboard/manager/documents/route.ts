import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { employees } from "@/db/schema/hr";
import { document } from "@/db/schema/documents";
import { documentVersions } from "@/db/schema/documents";
import { eq, and, desc, inArray, or, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    const authUserId = session?.user?.id;

    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get manager employee info
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
    if (!employee || !employee.isManager) {
      return NextResponse.json(
        { error: "Forbidden - Manager access required" },
        { status: 403 },
      );
    }

    // Get subordinates (team members)
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

    // Get recent documents uploaded by manager, team members, or in manager's department
    // Include manager's own documents, team member documents, and departmental documents
    const whereClause: SQL<unknown> =
      teamMemberIds.length > 0
        ? (or(
            eq(document.uploadedBy, employee.id), // Include manager's own documents
            inArray(document.uploadedBy, teamMemberIds), // Team member documents
            and(
              eq(document.departmental, true),
              eq(document.department, employee.department || ""),
            ), // Departmental documents
            eq(document.public, true), // Public documents
          ) ?? eq(document.uploadedBy, employee.id))
        : (or(
            eq(document.uploadedBy, employee.id), // Include manager's own documents
            and(
              eq(document.departmental, true),
              eq(document.department, employee.department || ""),
            ), // Departmental documents
            eq(document.public, true), // Public documents
          ) ?? eq(document.uploadedBy, employee.id));

    // First try with currentVersionId > 0, but if no results, try without it
    let recentDocs = await db
      .select({
        id: document.id,
        name: document.title,
        uploadedDate: document.createdAt, // Use createdAt for upload time
        size: documentVersions.fileSize,
        uploadedBy: employees.name,
        uploadedById: document.uploadedBy,
        currentVersionId: document.currentVersionId,
        status: document.status,
      })
      .from(document)
      .leftJoin(employees, eq(document.uploadedBy, employees.id))
      .leftJoin(
        documentVersions,
        eq(documentVersions.id, document.currentVersionId),
      )
      .where(and(eq(document.status, "active"), whereClause))
      .orderBy(desc(document.createdAt)) // Order by createdAt to show newest uploads first
      .limit(5); // Get top 5 most recent

    // Debug logging
    console.log(
      `[Manager Documents API] Manager ${employee.id} found ${recentDocs.length} documents`,
    );

    // If no documents found, try without version filter
    if (recentDocs.length === 0) {
      console.log(
        `[Manager Documents API] No documents with currentVersionId > 0, checking all documents...`,
      );
      recentDocs = await db
        .select({
          id: document.id,
          name: document.title,
          uploadedDate: document.createdAt,
          size: documentVersions.fileSize,
          uploadedBy: employees.name,
          uploadedById: document.uploadedBy,
          currentVersionId: document.currentVersionId,
          status: document.status,
        })
        .from(document)
        .leftJoin(employees, eq(document.uploadedBy, employees.id))
        .leftJoin(
          documentVersions,
          eq(documentVersions.id, document.currentVersionId),
        )
        .where(and(eq(document.status, "active"), whereClause))
        .orderBy(desc(document.createdAt))
        .limit(5);

      console.log(
        `[Manager Documents API] Found ${recentDocs.length} documents without version filter`,
      );
    }

    // Filter out documents without valid IDs or names
    // Accept documents even if currentVersionId is 0 (might be in transition or fallback query)
    const validDocs = recentDocs.filter((doc) => {
      const isValid = doc.id && doc.name;
      if (isValid && (!doc.currentVersionId || doc.currentVersionId === 0)) {
        console.log(
          `[Manager Documents API] Including document ${doc.id} with currentVersionId=0 (might be in transition)`,
        );
      }
      return isValid;
    });

    console.log(
      `[Manager Documents API] After filtering: ${validDocs.length} valid documents`,
    );

    const formattedDocs = validDocs.map((doc) => {
      const date = new Date(doc.uploadedDate || new Date());
      const size = doc.size ? parseFloat(String(doc.size)) : 0;
      let formattedSize = "0 MB";

      if (size >= 1) {
        formattedSize = `${size.toFixed(1)} MB`;
      } else if (size > 0) {
        formattedSize = `${(size * 1024).toFixed(0)} KB`;
      }

      return {
        id: doc.id,
        name: doc.name || "Untitled Document",
        uploadedBy: doc.uploadedBy || "Unknown",
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        size: formattedSize,
      };
    });

    return NextResponse.json(
      {
        documents: formattedDocs,
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
    console.error("Error fetching manager documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents", documents: [] },
      { status: 500 },
    );
  }
}
