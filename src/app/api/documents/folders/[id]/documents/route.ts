import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getUser } from "@/actions/auth/dal";
import {
  document,
  documentTags,
  documentAccess,
  documentFolders,
  documentVersions,
  employees,
} from "@/db/schema";
import { DrizzleQueryError } from "drizzle-orm";
import { enrichDocumentsWithTagsAndAccess } from "@/lib/documents-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const folderId = Number.parseInt(id, 10);

  if (Number.isNaN(folderId)) {
    return NextResponse.json({ error: "Invalid folder ID" }, { status: 400 });
  }

  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "20");

  try {
    const { docs, total } = await db.transaction(async (tx) => {
      const folder = await tx
        .select({
          id: documentFolders.id,
          name: documentFolders.name,
          createdBy: documentFolders.createdBy,
          public: documentFolders.public,
          departmental: documentFolders.departmental,
          department: documentFolders.department,
        })
        .from(documentFolders)
        .where(eq(documentFolders.id, folderId))
        .limit(1);

      if (folder.length === 0) throw new Error("Folder not found");

      const currentFolder = folder[0];
      const isOwner = currentFolder.createdBy === user.id;
      const isDepartmental =
        currentFolder.departmental &&
        currentFolder.department === user.department;
      const isPublic = currentFolder.public;

      if (!isOwner && !isDepartmental && !isPublic) {
        throw new Error("Access denied to this folder");
      }

      const offset = Math.max(0, (page - 1) * pageSize);

      const visibilityCondition = isOwner
        ? sql`TRUE`
        : sql`(
            ${document.public} = true
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

      const [{ total }] = await tx
        .select({
          total: sql<number>`count(distinct ${document.id})`,
        })
        .from(document)
        .where(
          and(
            eq(document.folderId, folderId),
            eq(document.status, "active"),
            visibilityCondition,
          ),
        );

      const documents = await tx
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
        .where(
          and(
            eq(document.folderId, folderId),
            eq(document.status, "active"),
            visibilityCondition,
          ),
        )
        .orderBy(sql`${document.updatedAt} DESC`)
        .limit(pageSize)
        .offset(offset);

      // Enrich documents with tags and access rules (handles empty list)
      // Note: We're using the tx (transaction) context, but the helper uses db
      // For transaction safety, we need to inline the logic here
      if (documents.length === 0) {
        return { docs: [], total: Number(total ?? 0) };
      }

      const docIds = documents.map((d) => d.id);

      const [tags, accessRules] = await Promise.all([
        tx
          .select({
            documentId: documentTags.documentId,
            tag: documentTags.tag,
          })
          .from(documentTags)
          .where(inArray(documentTags.documentId, docIds)),

        tx
          .select({
            documentId: documentAccess.documentId,
            accessLevel: documentAccess.accessLevel,
            userId: documentAccess.userId,
            name: employees.name,
            email: employees.email,
            department: documentAccess.department,
          })
          .from(documentAccess)
          .where(inArray(documentAccess.documentId, docIds))
          .leftJoin(employees, eq(documentAccess.userId, employees.id)),
      ]);

      const enrichedDocs = documents.map((doc) => ({
        ...doc,
        tags: tags.filter((t) => t.documentId === doc.id).map((t) => t.tag),
        accessRules: accessRules
          .filter((a) => a.documentId === doc.id)
          .map((a) => ({
            accessLevel: a.accessLevel,
            userId: a.userId,
            name: a.name,
            email: a.email,
            department: a.department,
          })),
      }));

      return { docs: enrichedDocs, total: Number(total ?? 0) };
    });

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const headers = new Headers();
    headers.set(
      "Cache-Control",
      "public, s-maxage=10, stale-while-revalidate=30",
    );

    return NextResponse.json(
      {
        docs,
        count: docs.length,
        total,
        page,
        pageSize,
        totalPages,
        hasMore: page < totalPages,
      },
      { status: 200, headers },
    );
  } catch (err) {
    console.error("Error fetching folder documents:", err);

    if (err instanceof DrizzleQueryError) {
      return NextResponse.json(
        { error: err.cause?.message || "Database error occurred" },
        { status: 500 },
      );
    }

    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Couldn't fetch documents. Please try again." },
      { status: 500 },
    );
  }
}
