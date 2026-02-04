import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { employees } from "@/db/schema/hr";
import { document } from "@/db/schema/documents";
import { documentVersions } from "@/db/schema/documents";
import { documentAccess } from "@/db/schema/documents";
import { eq, and, desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    const authUserId = session?.user?.id;

    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get employee info
    const employeeResult = await db
      .select({
        id: employees.id,
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

    // Build visibility condition for documents
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

    // Get recent documents accessible to this employee
    // Include documents uploaded by the user, public documents, departmental documents, or documents with access
    // Only include documents with valid currentVersionId (set during upload transaction)
    const recentDocs = await db
      .select({
        id: document.id,
        name: document.title,
        uploadedDate: document.createdAt, // Use createdAt for upload time
        size: documentVersions.fileSize,
        uploadedBy: employees.name,
        currentVersionId: document.currentVersionId,
        status: document.status,
      })
      .from(document)
      .leftJoin(employees, eq(document.uploadedBy, employees.id))
      .leftJoin(
        documentVersions,
        eq(documentVersions.id, document.currentVersionId),
      )
      .where(and(eq(document.status, "active"), visibilityCondition))
      .orderBy(desc(document.createdAt)) // Order by createdAt to show newest uploads first
      .limit(5); // Get top 5 most recent

    // Debug logging
    console.log(
      `[Staff Documents API] Employee ${employee.id} found ${recentDocs.length} accessible documents`,
    );

    // Filter out documents without valid IDs or names
    // Accept documents even if currentVersionId is 0 (might be in transition or fallback query)
    const validDocs = recentDocs.filter((doc) => {
      const isValid = doc.id && doc.name;
      if (isValid && (!doc.currentVersionId || doc.currentVersionId === 0)) {
        console.log(
          `[Staff Documents API] Including document ${doc.id} with currentVersionId=0 (might be in transition)`,
        );
      }
      return isValid;
    });

    console.log(
      `[Staff Documents API] After filtering: ${validDocs.length} valid documents`,
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
        uploadedDate: date.toLocaleDateString("en-US", {
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
    console.error("Error fetching recent documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent documents", documents: [] },
      { status: 500 },
    );
  }
}
