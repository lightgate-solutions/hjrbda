import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { getUser } from "@/actions/auth/dal";
import {
  document,
  documentAccess,
  documentFolders,
  documentVersions,
  employees,
} from "@/db/schema";
import { DrizzleQueryError } from "drizzle-orm";
import { enrichDocumentsWithTagsAndAccess } from "@/lib/documents-helpers";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "20");

  try {
    const offset = Math.max(0, (page - 1) * pageSize);

    const visibilityCondition = sql`(
      ${document.uploadedBy} = ${user.id}
      OR ${document.public} = true
      OR (${document.departmental} = true AND ${document.department} = ${user.department})
      OR EXISTS (
        SELECT 1 FROM ${documentAccess}
        WHERE ${documentAccess.documentId} = ${document.id}
          AND (
            ${documentAccess.userId} = ${user.id}
            OR (${documentAccess.department} IS NOT NULL AND ${documentAccess.department} = ${user.department})
          )
      )
    )`;

    const [{ total }] = await db
      .select({
        total: sql<number>`count(distinct ${document.id})`,
      })
      .from(document)
      .where(and(eq(document.status, "archived"), visibilityCondition));

    const rows = await db
      .select({
        id: document.id,
        title: document.title,
        description: document.description,
        public: document.public,
        departmental: document.departmental,
        department: document.department,
        status: document.status,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        currentVersion: document.currentVersion,
        uploader: employees.name,
        uploaderId: employees.id,
        uploaderEmail: employees.email,
        folderName: documentFolders.name,
        fileSize: documentVersions.fileSize,
        filePath: documentVersions.filePath,
        mimeType: documentVersions.mimeType,
        loggedUser: sql`${user.id}`,
      })
      .from(document)
      .leftJoin(employees, eq(document.uploadedBy, employees.id))
      .leftJoin(documentFolders, eq(document.folderId, documentFolders.id))
      .leftJoin(
        documentVersions,
        eq(documentVersions.id, document.currentVersionId),
      )
      .where(and(eq(document.status, "archived"), visibilityCondition))
      .orderBy(sql`${document.updatedAt} DESC`)
      .limit(pageSize)
      .offset(offset);

    // Enrich documents with tags and access rules (handles empty list)
    const enriched = await enrichDocumentsWithTagsAndAccess(rows);

    const totalPages = Math.max(1, Math.ceil((Number(total) || 0) / pageSize));

    const headers = new Headers();
    headers.set(
      "Cache-Control",
      "public, s-maxage=10, stale-while-revalidate=30",
    );

    return NextResponse.json(
      {
        docs: enriched,
        count: enriched.length,
        total: Number(total ?? 0),
        page,
        pageSize,
        totalPages,
        hasMore: page < totalPages,
      },
      { status: 200, headers },
    );
  } catch (err) {
    console.error("Error fetching archived documents:", err);

    if (err instanceof DrizzleQueryError) {
      return NextResponse.json(
        { error: err.cause?.message || "Database error occurred" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Couldn't fetch archived documents. Please try again." },
      { status: 500 },
    );
  }
}
