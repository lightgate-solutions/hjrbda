import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { document, employees } from "@/db/schema";
import { documentVersions } from "@/db/schema/documents";
import { desc, eq, and } from "drizzle-orm";
import { getUser } from "@/actions/auth/dal";

export async function GET(_request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch recent documents with uploader info and file size from documentVersions
    const recentDocs = await db
      .select({
        id: document.id,
        name: document.title,
        uploadedDate: document.createdAt,
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
      .where(
        and(
          eq(document.status, "active"),
          // Include documents even if currentVersionId is 0 (might be in transition)
          // The join will just return null for size, which we'll handle
        ),
      )
      .orderBy(desc(document.createdAt))
      .limit(5);

    // Filter out documents without valid IDs or names
    const validDocs = recentDocs.filter((doc) => {
      return doc.id && doc.name && doc.name.trim();
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

      return {
        id: doc.id,
        name: doc.name || "Untitled Document",
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
    console.error("[API /recent] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch recent documents",
        message: error instanceof Error ? error.message : "Unknown error",
        documents: [],
      },
      { status: 500 },
    );
  }
}
