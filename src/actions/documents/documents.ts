// biome-ignore-all lint/style/noNonNullAssertion: <>

"use server";

import { db } from "@/db";
import { and, eq, inArray, ne, asc } from "drizzle-orm";
import { getUser } from "../auth/dal";
import {
  document,
  documentAccess,
  documentFolders,
  documentTags,
  documentVersions,
  documentComments,
  documentLogs,
  employees,
} from "@/db/schema";
import { DrizzleQueryError, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { upstashIndex } from "@/lib/upstash-client";
import { createNotification } from "../notification/notification";

export async function getActiveFolderDocuments(
  folderId: number,
  page = 1,
  pageSize = 20,
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

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

    return {
      success: {
        docs,
        count: docs.length,
        total,
        page,
        pageSize,
        totalPages,
        hasMore: page < totalPages,
      },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }

    return {
      error: {
        reason: "Couldn't fetch documents. Please try again.",
      },
      success: null,
    };
  }
}

export async function deleteDocumentAction(
  documentId: number,
  pathname: string,
) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");
  try {
    const result = await db.transaction(async (tx) => {
      const doc = await tx.query.document.findFirst({
        where: eq(document.id, documentId),
      });

      if (!doc) throw new Error("Document not found");
      if (doc.uploadedBy !== user.id && user.role !== "admin") {
        throw new Error("You don't have permission to delete this document");
      }

      const accessUsers = await tx
        .select({ userId: documentAccess.userId })
        .from(documentAccess)
        .where(eq(documentAccess.documentId, documentId));

      await Promise.all([
        tx
          .delete(documentAccess)
          .where(eq(documentAccess.documentId, documentId)),
        tx.delete(documentTags).where(eq(documentTags.documentId, documentId)),
        tx
          .delete(documentVersions)
          .where(eq(documentVersions.documentId, documentId)),
        upstashIndex.delete(doc.upstashId),
      ]);

      await tx.delete(document).where(eq(document.id, documentId));

      const recipients = accessUsers
        .map((row) => row.userId)
        .filter((id): id is number => !!id);
      if (doc.uploadedBy) recipients.push(doc.uploadedBy);

      return {
        docTitle: doc.title,
        docId: doc.id,
        recipients,
      };
    });

    revalidatePath(pathname);

    if (result) {
      const uniqueRecipients = new Set<number>(result.recipients);
      uniqueRecipients.delete(user.id);

      for (const recipientId of uniqueRecipients) {
        await createNotification({
          user_id: recipientId,
          title: "Document Deleted",
          message: `${user.name} removed "${result.docTitle}"`,
          notification_type: "message",
          reference_id: result.docId,
        });
      }
    }

    return {
      success: { reason: "Document deleted successfully" },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }

    return {
      error: {
        reason: "Couldn't delete document. Please try again.",
      },
      success: null,
    };
  }
}
export async function archiveDocumentAction(
  documentId: number,
  pathname: string,
) {
  try {
    const user = await getUser();
    if (!user) {
      return {
        success: null,
        error: { reason: "User not logged in" },
      };
    }

    const doc = await db.query.document.findFirst({
      where: eq(document.id, documentId),
    });

    if (!doc) {
      return {
        success: null,
        error: { reason: "Document not found" },
      };
    }
    if (doc.uploadedBy !== user.id && user.role !== "admin") {
      return {
        success: null,
        error: { reason: "You dont have permission to archive this document" },
      };
    }

    const accessRows = await db
      .select({ userId: documentAccess.userId })
      .from(documentAccess)
      .where(eq(documentAccess.documentId, documentId));

    await db
      .update(document)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(document.id, documentId));

    const recipients = accessRows
      .map((row) => row.userId)
      .filter((id): id is number => !!id);
    if (doc.uploadedBy) recipients.push(doc.uploadedBy);

    const uniqueRecipients = new Set<number>(recipients);
    uniqueRecipients.delete(user.id);

    for (const recipientId of uniqueRecipients) {
      await createNotification({
        user_id: recipientId,
        title: "Document Archived",
        message: `${user.name} archived "${doc.title}"`,
        notification_type: "message",
        reference_id: doc.id,
      });
    }

    revalidatePath(pathname);
    return {
      success: { reason: "Document archived successfully" },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }

    return {
      error: {
        reason: "Couldn't delete document. Please try again.",
      },
      success: null,
    };
  }
}

export async function getDocumentComments(documentId: number) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  try {
    const result = await db.transaction(async (tx) => {
      const doc = await tx.query.document.findFirst({
        where: eq(document.id, documentId),
      });
      if (!doc) throw new Error("Document not found");

      const accessRows = await tx
        .select({
          userId: documentAccess.userId,
          department: documentAccess.department,
          accessLevel: documentAccess.accessLevel,
        })
        .from(documentAccess)
        .where(eq(documentAccess.documentId, documentId));

      const hasExplicitAccess = accessRows.some(
        (a) =>
          a.userId === user.id ||
          (a.department && a.department === user.department),
      );

      const canView =
        doc.public ||
        (doc.departmental && doc.department === user.department) ||
        doc.uploadedBy === user.id ||
        hasExplicitAccess;

      if (!canView) throw new Error("Access denied");

      const comments = await tx
        .select({
          id: documentComments.id,
          comment: documentComments.comment,
          createdAt: documentComments.createdAt,
          userId: documentComments.userId,
          userName: employees.name,
          userEmail: employees.email,
        })
        .from(documentComments)
        .leftJoin(employees, eq(documentComments.userId, employees.id))
        .where(eq(documentComments.documentId, documentId))
        .orderBy(sql`${documentComments.createdAt} DESC`);

      return comments;
    });

    return { success: result, error: null };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }

    if (err instanceof Error && err.message === "Access denied") {
      return {
        success: null,
        error: { reason: "Dont have permissions to view comments" },
      };
    }
    return {
      success: null,
      error: { reason: "Couldn't fetch comments. Please try again." },
    };
  }
}

export async function addDocumentComment(documentId: number, content: string) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  if (!content || content.trim().length === 0) {
    return { success: null, error: { reason: "Comment cannot be empty" } };
  }

  try {
    const result = await db.transaction(async (tx) => {
      const doc = await tx.query.document.findFirst({
        where: eq(document.id, documentId),
      });
      if (!doc) throw new Error("Document not found");

      const accessRows = await tx
        .select({
          userId: documentAccess.userId,
          department: documentAccess.department,
          accessLevel: documentAccess.accessLevel,
        })
        .from(documentAccess)
        .where(eq(documentAccess.documentId, documentId));

      const hasEditOrManage =
        accessRows.some(
          (a) =>
            (a.userId === user.id ||
              (a.department && a.department === user.department)) &&
            (a.accessLevel === "edit" || a.accessLevel === "manage"),
        ) || user.role === "admin";

      const canComment = doc.uploadedBy === user.id || hasEditOrManage;
      if (!canComment) throw new Error("Access denied");

      const [commentRow] = await tx
        .insert(documentComments)
        .values({
          documentId,
          userId: user.id,
          comment: content.trim(),
        })
        .returning();

      await tx.insert(documentLogs).values({
        userId: user.id,
        documentId,
        documentVersionId: doc.currentVersionId,
        action: "comment",
        details: "added a comment",
      });

      const explicitUsers = accessRows
        .map((row) => row.userId)
        .filter((id): id is number => !!id);

      return {
        commentRow,
        docTitle: doc.title,
        recipients: explicitUsers,
        uploaderId: doc.uploadedBy,
      };
    });

    const notificationRecipients = new Set<number>(result.recipients ?? []);
    if (result.uploaderId) notificationRecipients.add(result.uploaderId);
    notificationRecipients.delete(user.id);

    if (notificationRecipients.size > 0) {
      const preview =
        content.trim().length > 120
          ? `${content.trim().substring(0, 120)}...`
          : content.trim();

      for (const recipientId of notificationRecipients) {
        await createNotification({
          user_id: recipientId,
          title: "New Document Comment",
          message: `${user.name} commented on "${result.docTitle}" • ${preview}`,
          notification_type: "message",
          reference_id: documentId,
        });
      }
    }

    return { success: result.commentRow, error: null };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }

    if (err instanceof Error && err.message === "Access denied") {
      return {
        success: null,
        error: { reason: "Dont have permissions to comment" },
      };
    }
    return {
      success: null,
      error: { reason: "Couldn't add comment. Please try again." },
    };
  }
}

export async function deleteDocumentComment(commentId: number) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  try {
    await db.transaction(async (tx) => {
      const [commentRow] = await tx
        .select({
          id: documentComments.id,
          documentId: documentComments.documentId,
          userId: documentComments.userId,
        })
        .from(documentComments)
        .where(eq(documentComments.id, commentId))
        .limit(1);

      if (!commentRow) throw new Error("Comment not found");

      const doc = await tx.query.document.findFirst({
        where: eq(document.id, commentRow.documentId!),
      });
      if (!doc) throw new Error("Document not found");

      const accessRows = await tx
        .select({
          userId: documentAccess.userId,
          department: documentAccess.department,
          accessLevel: documentAccess.accessLevel,
        })
        .from(documentAccess)
        .where(eq(documentAccess.documentId, doc.id));

      const hasManageAccess = accessRows.some(
        (a) =>
          (a.userId === user.id ||
            (a.department && a.department === user.department)) &&
          a.accessLevel === "manage",
      );

      const isAuthor = commentRow.userId === user.id;
      const isDocOwner = doc.uploadedBy === user.id;

      if (!(isAuthor || isDocOwner || hasManageAccess)) {
        throw new Error("Access denied");
      }

      await tx
        .delete(documentComments)
        .where(eq(documentComments.id, commentId));

      await tx.insert(documentLogs).values({
        userId: user.id,
        documentId: doc.id,
        documentVersionId: doc.currentVersionId,
        action: "delete_comment",
        details: "deleted a comment",
      });
    });

    return { success: { reason: "Comment deleted successfully" }, error: null };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }
    if (err instanceof Error && err.message === "Access denied") {
      return {
        success: null,
        error: { reason: "Dont have permissions to delete comment" },
      };
    }
    return {
      success: null,
      error: { reason: "Couldn't delete comment. Please try again." },
    };
  }
}

export async function getDocumentVersions(documentId: number) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  try {
    const versions = await db.transaction(async (tx) => {
      const doc = await tx.query.document.findFirst({
        where: eq(document.id, documentId),
      });
      if (!doc) throw new Error("Document not found");

      const accessRows = await tx
        .select({
          userId: documentAccess.userId,
          department: documentAccess.department,
          accessLevel: documentAccess.accessLevel,
        })
        .from(documentAccess)
        .where(eq(documentAccess.documentId, documentId));

      const hasExplicitAccess = accessRows.some(
        (a) =>
          a.userId === user.id ||
          (a.department && a.department === user.department),
      );

      const canView =
        doc.public ||
        (doc.departmental && doc.department === user.department) ||
        doc.uploadedBy === user.id ||
        hasExplicitAccess;

      if (!canView) throw new Error("Access denied");

      const rows = await tx
        .select({
          id: documentVersions.id,
          versionNumber: documentVersions.versionNumber,
          filePath: documentVersions.filePath,
          fileSize: documentVersions.fileSize,
          mimeType: documentVersions.mimeType,
          createdAt: documentVersions.createdAt,
          uploadedBy: documentVersions.uploadedBy,
          uploadedByName: employees.name,
          uploadedByEmail: employees.email,
        })
        .from(documentVersions)
        .leftJoin(employees, eq(documentVersions.uploadedBy, employees.id))
        .where(eq(documentVersions.documentId, documentId))
        .orderBy(sql`${documentVersions.createdAt} DESC`);

      return rows;
    });

    return { success: versions, error: null };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }
    if (err instanceof Error && err.message === "Access denied") {
      return {
        success: null,
        error: { reason: "Dont have permissions to view versions" },
      };
    }
    return {
      success: null,
      error: { reason: "Couldn't fetch versions. Please try again." },
    };
  }
}

export async function deleteDocumentVersion(
  versionId: number,
  pathname?: string,
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  try {
    await db.transaction(async (tx) => {
      const [version] = await tx
        .select({
          id: documentVersions.id,
          documentId: documentVersions.documentId,
          versionNumber: documentVersions.versionNumber,
        })
        .from(documentVersions)
        .where(eq(documentVersions.id, versionId))
        .limit(1);

      if (!version) throw new Error("Version not found");

      const doc = await tx.query.document.findFirst({
        where: eq(document.id, version.documentId),
      });
      if (!doc) throw new Error("Document not found");

      if (doc.currentVersionId === version.id) {
        throw new Error("Cannot delete the current version");
      }

      const accessRows = await tx
        .select({
          userId: documentAccess.userId,
          department: documentAccess.department,
          accessLevel: documentAccess.accessLevel,
        })
        .from(documentAccess)
        .where(eq(documentAccess.documentId, version.documentId));

      const hasManageAccess = accessRows.some(
        (a) =>
          (a.userId === user.id ||
            (a.department && a.department === user.department)) &&
          a.accessLevel === "manage",
      );

      const isDocOwner = doc.uploadedBy === user.id;
      if (!(isDocOwner || hasManageAccess)) {
        throw new Error("Access denied");
      }

      await tx
        .delete(documentVersions)
        .where(eq(documentVersions.id, versionId));

      await tx.insert(documentLogs).values({
        userId: user.id,
        documentId: version.documentId,
        documentVersionId: version.id,
        action: "delete_version",
        details: `deleted version v${version.versionNumber}`,
      });
    });

    if (pathname) revalidatePath(pathname);
    return { success: { reason: "Version deleted successfully" }, error: null };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }
    if (err instanceof Error && err.message === "Access denied") {
      return {
        success: null,
        error: { reason: "Dont have permissions to view versions" },
      };
    }
    return {
      success: null,
      error: { reason: "Couldn't delete version. Please try again." },
    };
  }
}

export async function getDocumentLogs(documentId: number) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  try {
    const logs = await db.transaction(async (tx) => {
      const doc = await tx.query.document.findFirst({
        where: eq(document.id, documentId),
      });
      if (!doc) throw new Error("Document not found");

      const accessRows = await tx
        .select({
          userId: documentAccess.userId,
          department: documentAccess.department,
          accessLevel: documentAccess.accessLevel,
        })
        .from(documentAccess)
        .where(eq(documentAccess.documentId, documentId));

      const isOwner = doc.uploadedBy === user.id;
      const hasManageAccess = accessRows.some(
        (a) =>
          (a.userId === user.id ||
            (a.department && a.department === user.department)) &&
          a.accessLevel === "manage",
      );

      const canView = isOwner || hasManageAccess;

      if (!canView) throw new Error("Access denied");

      const rows = await tx
        .select({
          id: documentLogs.id,
          action: documentLogs.action,
          details: documentLogs.details,
          createdAt: documentLogs.createdAt,
          userId: documentLogs.userId,
          userName: employees.name,
          userEmail: employees.email,
          documentVersionId: documentLogs.documentVersionId,
        })
        .from(documentLogs)
        .leftJoin(employees, eq(documentLogs.userId, employees.id))
        .where(eq(documentLogs.documentId, documentId))
        .orderBy(sql`${documentLogs.createdAt} DESC`);

      return rows;
    });

    return { success: logs, error: null };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }
    if (err instanceof Error && err.message === "Access denied") {
      return {
        success: null,
        error: { reason: "Dont have permissions to view logs" },
      };
    }
    return {
      success: null,
      error: { reason: "Couldn't fetch logs. Please try again." },
    };
  }
}

export async function updateDocumentPublic(
  documentId: number,
  isPublic: boolean,
  pathname?: string,
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  try {
    await db.transaction(async (tx) => {
      const doc = await tx.query.document.findFirst({
        where: eq(document.id, documentId),
      });
      if (!doc) throw new Error("Document not found");

      const accessRows = await tx
        .select({
          userId: documentAccess.userId,
          department: documentAccess.department,
          accessLevel: documentAccess.accessLevel,
        })
        .from(documentAccess)
        .where(eq(documentAccess.documentId, documentId));

      const isOwner = doc.uploadedBy === user.id;
      const hasManageAccess =
        accessRows.some(
          (a) =>
            (a.userId === user.id ||
              (a.department && a.department === user.department)) &&
            a.accessLevel === "manage",
        ) || user.department === "admin";

      if (!(isOwner || hasManageAccess)) {
        throw new Error("Access denied");
      }

      await tx
        .update(document)
        .set({ public: isPublic, updatedAt: new Date() })
        .where(eq(document.id, documentId));

      await tx.insert(documentLogs).values({
        userId: user.id,
        documentId,
        documentVersionId: doc.currentVersionId,
        action: "update_public",
        details: `set public=${isPublic ? "true" : "false"}`,
      });
    });

    if (pathname) revalidatePath(pathname);
    return { success: { reason: "Updated public setting" }, error: null };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }
    if (err instanceof Error && err.message === "Access denied") {
      return { success: null, error: { reason: "Dont have permissions" } };
    }
    return {
      success: null,
      error: { reason: "Couldn't update public setting. Please try again." },
    };
  }
}

export async function updateDepartmentAccess(
  documentId: number,
  departmental: boolean,
  accessLevel?: "view" | "edit" | "manage",
  pathname?: string,
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  try {
    await db.transaction(async (tx) => {
      const doc = await tx.query.document.findFirst({
        where: eq(document.id, documentId),
      });
      if (!doc) throw new Error("Document not found");

      const accessRows = await tx
        .select({
          userId: documentAccess.userId,
          department: documentAccess.department,
          accessLevel: documentAccess.accessLevel,
        })
        .from(documentAccess)
        .where(eq(documentAccess.documentId, documentId));

      const isOwner = doc.uploadedBy === user.id;
      const hasManageAccess =
        accessRows.some(
          (a) =>
            (a.userId === user.id ||
              (a.department && a.department === user.department)) &&
            a.accessLevel === "manage",
        ) || user.department === "admin";

      if (!(isOwner || hasManageAccess)) {
        throw new Error("Access denied");
      }

      if (!departmental) {
        // Turn off departmental and remove department-level rule
        await tx
          .update(document)
          .set({ departmental: false, updatedAt: new Date() })
          .where(eq(document.id, documentId));

        await tx
          .delete(documentAccess)
          .where(
            and(
              eq(documentAccess.documentId, documentId),
              eq(documentAccess.department, doc.department),
              sql`${documentAccess.userId} IS NULL`,
            ),
          );

        await tx.insert(documentLogs).values({
          userId: user.id,
          documentId,
          documentVersionId: doc.currentVersionId,
          action: "update_departmental_access",
          details: "disabled departmental access",
        });
        return;
      }

      const level = accessLevel ?? "view";

      await tx
        .update(document)
        .set({ departmental: true, updatedAt: new Date() })
        .where(eq(document.id, documentId));

      const existing = await tx
        .select({ id: documentAccess.id })
        .from(documentAccess)
        .where(
          and(
            eq(documentAccess.documentId, documentId),
            eq(documentAccess.department, doc.department),
            sql`${documentAccess.userId} IS NULL`,
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        await tx
          .update(documentAccess)
          .set({ accessLevel: level, updatedAt: new Date() })
          .where(eq(documentAccess.id, existing[0].id));
      } else {
        await tx.insert(documentAccess).values({
          accessLevel: level,
          documentId,
          userId: null,
          department: doc.department,
          grantedBy: user.id,
        });
      }

      await tx.insert(documentLogs).values({
        userId: user.id,
        documentId,
        documentVersionId: doc.currentVersionId,
        action: "update_departmental_access",
        details: `enabled departmental (${doc.department}) level=${level}`,
      });
    });

    if (pathname) revalidatePath(pathname);
    return { success: { reason: "Updated departmental access" }, error: null };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }
    if (err instanceof Error && err.message === "Access denied") {
      return {
        success: null,
        error: { reason: "Dont have permissions to update access" },
      };
    }
    return {
      success: null,
      error: {
        reason: "Couldn't update departmental access. Please try again.",
      },
    };
  }
}

export async function searchEmployeesForShare(query: string, limit = 8) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  try {
    const q = query.trim();
    if (!q) return { success: [], error: null };

    const results = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        department: employees.department,
      })
      .from(employees)
      .where(
        sql`(${employees.name} ILIKE ${`%${q}%`} OR ${employees.email} ILIKE ${`%${q}%`}) AND ${employees.id} <> ${user.id}`,
      )
      .limit(limit);

    return { success: results, error: null };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }
    return {
      success: null,
      error: { reason: "Couldn't search employees. Please try again." },
    };
  }
}

export async function getAllEmployeesForShare() {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  try {
    const results = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        department: employees.department,
      })
      .from(employees)
      .where(ne(employees.id, user.id))
      .orderBy(asc(employees.name));

    return { success: results, error: null };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }
    return {
      success: null,
      error: { reason: "Couldn't fetch employees. Please try again." },
    };
  }
}

export async function getDocumentShares(documentId: number) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  try {
    const rows = await db.transaction(async (tx) => {
      const doc = await tx.query.document.findFirst({
        where: eq(document.id, documentId),
      });
      if (!doc) throw new Error("Document not found");

      const accessRows = await tx
        .select({
          userId: documentAccess.userId,
          department: documentAccess.department,
          accessLevel: documentAccess.accessLevel,
        })
        .from(documentAccess)
        .where(eq(documentAccess.documentId, documentId));

      const isOwner = doc.uploadedBy === user.id;
      const hasManageAccess = accessRows.some(
        (a) =>
          (a.userId === user.id ||
            (a.department && a.department === user.department)) &&
          a.accessLevel === "manage",
      );
      if (!(isOwner || hasManageAccess)) {
        throw new Error("Access denied");
      }

      const shares = await tx
        .select({
          userId: documentAccess.userId,
          accessLevel: documentAccess.accessLevel,
          createdAt: documentAccess.createdAt,
          name: employees.name,
          email: employees.email,
        })
        .from(documentAccess)
        .leftJoin(employees, eq(documentAccess.userId, employees.id))
        .where(
          and(
            eq(documentAccess.documentId, documentId),
            sql`${documentAccess.userId} IS NOT NULL`,
          ),
        )
        .orderBy(sql`${employees.name} ASC`);

      return shares;
    });

    return { success: rows, error: null };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }
    if (err instanceof Error && err.message === "Access denied") {
      return { success: null, error: { reason: "Dont have permissions" } };
    }
    return {
      success: null,
      error: { reason: "Couldn't fetch shares. Please try again." },
    };
  }
}

export async function addDocumentShare(
  documentId: number,
  email: string,
  accessLevel: "view" | "edit" | "manage",
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  try {
    const result = await db.transaction(async (tx) => {
      const doc = await tx.query.document.findFirst({
        where: eq(document.id, documentId),
      });
      if (!doc) throw new Error("Document not found");

      const accessRows = await tx
        .select({
          userId: documentAccess.userId,
          department: documentAccess.department,
          accessLevel: documentAccess.accessLevel,
        })
        .from(documentAccess)
        .where(eq(documentAccess.documentId, documentId));

      const isOwner = doc.uploadedBy === user.id;
      const hasManageAccess = accessRows.some(
        (a) =>
          (a.userId === user.id ||
            (a.department && a.department === user.department)) &&
          a.accessLevel === "manage",
      );
      if (!(isOwner || hasManageAccess)) {
        throw new Error("Access denied");
      }

      const [target] = await tx
        .select({ id: employees.id, email: employees.email })
        .from(employees)
        .where(eq(employees.email, email.toLowerCase()))
        .limit(1);

      if (!target) {
        return {
          notFound: true as const,
          email,
        };
      }

      const [existing] = await tx
        .select({
          id: documentAccess.id,
          accessLevel: documentAccess.accessLevel,
        })
        .from(documentAccess)
        .where(
          and(
            eq(documentAccess.documentId, documentId),
            eq(documentAccess.userId, target.id),
          ),
        )
        .limit(1);

      if (existing) {
        await tx
          .update(documentAccess)
          .set({ accessLevel, updatedAt: new Date() })
          .where(eq(documentAccess.id, existing.id));
      } else {
        await tx.insert(documentAccess).values({
          accessLevel,
          documentId,
          userId: target.id,
          department: null,
          grantedBy: user.id,
        });
      }

      await tx.insert(documentLogs).values({
        userId: user.id,
        documentId,
        action: "share",
        details: `granted ${accessLevel} to ${target.email}`,
        documentVersionId: doc.currentVersionId,
      });

      return {
        notFound: false as const,
        userId: target.id,
        email: target.email,
        documentName: doc.title,
      };
    });

    if (result.notFound) {
      return {
        success: null,
        error: { reason: `No employee found with email ${result.email}` },
      };
    }

    // Notify the user that a document was shared with them
    await createNotification({
      user_id: result.userId,
      title: "Document Shared With You",
      message: `${user.name} shared "${result.documentName}" with ${accessLevel} access`,
      notification_type: "message",
      reference_id: documentId,
    });

    return {
      success: {
        reason: "Share updated",
        userId: result.userId,
        email: result.email,
      },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }
    if (err instanceof Error && err.message === "Access denied") {
      return {
        success: null,
        error: { reason: "Dont have permissions to manage shares" },
      };
    }
    return {
      success: null,
      error: { reason: "Couldn't add share. Please try again." },
    };
  }
}

export async function removeDocumentShare(
  documentId: number,
  targetUserId: number,
) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  try {
    const result = await db.transaction(async (tx) => {
      const doc = await tx.query.document.findFirst({
        where: eq(document.id, documentId),
      });
      if (!doc) throw new Error("Document not found");

      const accessRows = await tx
        .select({
          userId: documentAccess.userId,
          department: documentAccess.department,
          accessLevel: documentAccess.accessLevel,
        })
        .from(documentAccess)
        .where(eq(documentAccess.documentId, documentId));

      const isOwner = doc.uploadedBy === user.id;
      const hasManageAccess = accessRows.some(
        (a) =>
          (a.userId === user.id ||
            (a.department && a.department === user.department)) &&
          a.accessLevel === "manage",
      );
      if (!(isOwner || hasManageAccess)) {
        throw new Error("Access denied");
      }

      if (targetUserId === doc.uploadedBy) {
        throw new Error("Cannot revoke uploader's access");
      }

      await tx
        .delete(documentAccess)
        .where(
          and(
            eq(documentAccess.documentId, documentId),
            eq(documentAccess.userId, targetUserId),
          ),
        );

      await tx.insert(documentLogs).values({
        userId: user.id,
        documentId,
        action: "revoke_share",
        details: `revoked access from user ${targetUserId}`,
        documentVersionId: doc.currentVersionId,
      });

      return { documentName: doc.title };
    });

    // Notify the user that their access was revoked
    await createNotification({
      user_id: targetUserId,
      title: "Document Access Revoked",
      message: `Your access to "${result.documentName}" has been revoked`,
      notification_type: "message",
      reference_id: documentId,
    });

    return { success: { reason: "Share removed" }, error: null };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }
    if (err instanceof Error && err.message === "Access denied") {
      return {
        success: null,
        error: { reason: "Dont have permissions to manage shares" },
      };
    }
    return {
      success: null,
      error: {
        reason:
          err instanceof Error
            ? err.message
            : "Couldn't remove share. Please try again.",
      },
    };
  }
}

export async function getMyDocumentAccess(documentId: number) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  try {
    const result = await db.transaction(async (tx) => {
      const doc = await tx.query.document.findFirst({
        where: eq(document.id, documentId),
      });
      if (!doc) throw new Error("Document not found");

      if (doc.uploadedBy === user.id) {
        return {
          level: "manage" as const,
          isOwner: true,
          isAdminDepartment: user.department === "admin",
        };
      }

      const rules = await tx
        .select({
          accessLevel: documentAccess.accessLevel,
          userId: documentAccess.userId,
          department: documentAccess.department,
        })
        .from(documentAccess)
        .where(eq(documentAccess.documentId, documentId));

      const rank = (lvl: string) =>
        lvl === "manage" ? 3 : lvl === "edit" ? 2 : lvl === "view" ? 1 : 0;

      let best: "none" | "view" | "edit" | "manage" = "none";

      for (const r of rules) {
        const applies =
          r.userId === user.id ||
          (r.department && r.department === user.department);
        if (!applies) continue;
        if (rank(r.accessLevel) > rank(best)) {
          best = r.accessLevel as typeof best;
        }
      }

      if (best === "none") {
        if (
          doc.public ||
          (doc.departmental && doc.department === user.department)
        ) {
          best = "view";
        }
      }

      return {
        level: best,
        isOwner: false,
        isAdminDepartment: user.department === "admin",
      };
    });

    return { success: result, error: null };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }
    return {
      success: null,
      error: { reason: "Couldn't resolve access. Please try again." },
    };
  }
}

/**
 * Get all documents I own or have access to (public, departmental, or explicit share),
 * across all folders. Flat list, paginated.
 */
export async function getAllAccessibleDocuments(page = 1, pageSize = 20) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

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
      .where(and(eq(document.status, "active"), visibilityCondition));

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
      .where(and(eq(document.status, "active"), visibilityCondition))
      .orderBy(sql`${document.updatedAt} DESC`)
      .limit(pageSize)
      .offset(offset);

    const docIds = rows.map((d) => d.id);
    let tags: { documentId: number | null; tag: string }[] = [];
    let accessRules: {
      documentId: number;
      accessLevel: string;
      userId: number | null;
      name: string | null;
      email: string | null;
      department: string | null;
    }[] = [];

    if (docIds.length > 0) {
      [tags, accessRules] = await Promise.all([
        db
          .select({
            documentId: documentTags.documentId,
            tag: documentTags.tag,
          })
          .from(documentTags)
          .where(inArray(documentTags.documentId, docIds)),
        db
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
    }

    const enriched = rows.map((doc) => ({
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

    const totalPages = Math.max(1, Math.ceil((Number(total) || 0) / pageSize));

    return {
      success: {
        docs: enriched,
        count: enriched.length,
        total: Number(total ?? 0),
        page,
        pageSize,
        totalPages,
        hasMore: page < totalPages,
      },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }
    return {
      success: null,
      error: { reason: "Couldn't fetch documents. Please try again." },
    };
  }
}

export async function getMyArchivedDocuments(page = 1, pageSize = 20) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

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

    const docIds = rows.map((d) => d.id);
    let tags: { documentId: number | null; tag: string }[] = [];
    let accessRules: {
      documentId: number;
      accessLevel: string;
      userId: number | null;
      name: string | null;
      email: string | null;
      department: string | null;
    }[] = [];

    if (docIds.length > 0) {
      [tags, accessRules] = await Promise.all([
        db
          .select({
            documentId: documentTags.documentId,
            tag: documentTags.tag,
          })
          .from(documentTags)
          .where(inArray(documentTags.documentId, docIds)),
        db
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
    }

    const enriched = rows.map((doc) => ({
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

    const totalPages = Math.max(1, Math.ceil((Number(total) || 0) / pageSize));

    return {
      success: {
        docs: enriched,
        count: enriched.length,
        total: Number(total ?? 0),
        page,
        pageSize,
        totalPages,
        hasMore: page < totalPages,
      },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }
    return {
      success: null,
      error: { reason: "Couldn't fetch archived documents. Please try again." },
    };
  }
}
