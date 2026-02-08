"use server";

import { db } from "@/db";
import {
  document,
  documentAccess,
  documentComments,
  documentFolders,
  documentLogs,
  documentSharedLinks,
  documentTags,
  documentVersions,
} from "@/db/schema";
import { and, DrizzleQueryError, eq, inArray, isNull, or } from "drizzle-orm";
import { getUser } from "../auth/dal";
import { revalidatePath } from "next/cache";

interface CreateFoldersProps {
  name: string;
  parentId?: number | null;
  parent?: string;
  public: boolean;
  departmental: boolean;
}

export async function createFolder(data: CreateFoldersProps, pathname: string) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  if (data.name.trim().toLowerCase() === "public") {
    return {
      error: {
        reason: "Couldn't create folder. Public folder already exists",
      },
      success: null,
    };
  }

  if (data.name.trim().toLowerCase() === user.department.toLowerCase()) {
    return {
      error: {
        reason: "Couldn't create folder. Name is the same as department folder",
      },
      success: null,
    };
  }

  try {
    return await db.transaction(async (tx) => {
      let parentIdToUse: number | null = null;
      if (typeof data.parentId === "number") {
        parentIdToUse = data.parentId;
      } else if (data.parent) {
        const parentRow = await tx
          .select({ id: documentFolders.id })
          .from(documentFolders)
          .where(
            and(
              eq(documentFolders.name, data.parent),
              eq(documentFolders.createdBy, user.id),
            ),
          )
          .limit(1);
        if (parentRow.length === 0) {
          return {
            error: { reason: "Selected parent folder not found" },
            success: null,
          };
        }
        parentIdToUse = parentRow[0].id;
      }
      const existing = await tx
        .select({ name: documentFolders.name })
        .from(documentFolders)
        .where(
          and(
            eq(documentFolders.name, data.name),
            eq(documentFolders.createdBy, user.id),
            parentIdToUse !== null
              ? eq(documentFolders.parentId, parentIdToUse)
              : isNull(documentFolders.parentId),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        return {
          error: {
            reason: "Folder name already exists",
          },
          success: null,
        };
      }

      await tx.insert(documentFolders).values({
        name: data.name.trim().toLowerCase(),
        parentId: parentIdToUse,
        public: data.public,
        root: parentIdToUse === null,
        departmental: data.departmental,
        department: user.department,
        createdBy: user.id,
      });

      revalidatePath(pathname);
      return {
        success: {
          reason: "Folder created successfully",
        },
        error: null,
      };
    });
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message },
      };
    }

    return {
      error: {
        reason: "Couldn't create folder. Check inputs and try again!",
      },
      success: null,
    };
  }
}

export async function getFoldersNames(ids: string[]) {
  if (!ids || ids.length === 0) return [];

  const numericIds = ids
    .map((id) => Number(id))
    .filter((id) => !Number.isNaN(id));

  const folders = await db
    .select({
      id: documentFolders.id,
      name: documentFolders.name,
    })
    .from(documentFolders)
    .where(inArray(documentFolders.id, numericIds));

  return numericIds.map((id) => folders.find((f) => f.id === id)?.name || null);
}

export async function getSubFolders(id: number) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  const folders = await db
    .select({
      id: documentFolders.id,
      name: documentFolders.name,
      updatedAt: documentFolders.updatedAt,
    })
    .from(documentFolders)
    .where(
      and(
        eq(documentFolders.parentId, id),
        eq(documentFolders.status, "active"),
        or(
          eq(documentFolders.createdBy, user.id),
          eq(documentFolders.public, true),
          and(
            eq(documentFolders.departmental, true),
            eq(documentFolders.department, user.department),
          ),
        ),
      ),
    );

  return folders;
}

export async function deleteFolder(folderId: number, pathname: string) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  try {
    return await db.transaction(async (tx) => {
      if (user.role !== "admin") {
        const folder = await tx
          .select()
          .from(documentFolders)
          .where(
            and(
              eq(documentFolders.id, folderId),
              eq(documentFolders.createdBy, user.id),
            ),
          )
          .limit(1);

        if (folder.length === 0) {
          return {
            error: { reason: "User doesn't have the proper permissions" },
            success: null,
          };
        }
      }

      async function getAllSubfolderIds(
        currentFolderId: number,
        depth = 0,
      ): Promise<number[]> {
        const maxDepth = 50;
        if (depth >= maxDepth) {
          throw new Error(
            `Maximum folder nesting depth of ${maxDepth} exceeded. Cannot process folder with deeply nested structure.`,
          );
        }

        const subFolders = await tx
          .select({ id: documentFolders.id })
          .from(documentFolders)
          .where(eq(documentFolders.parentId, currentFolderId));

        const subIds = subFolders.map((f) => f.id);
        for (const subId of subIds) {
          const nested = await getAllSubfolderIds(subId, depth + 1);
          subIds.push(...nested);
        }
        return subIds;
      }

      const allFolderIds = [
        folderId,
        ...(await getAllSubfolderIds(folderId, 0)),
      ];

      const docs = await tx
        .select({ id: document.id })
        .from(document)
        .where(inArray(document.folderId, allFolderIds));

      const docIds = docs.map((d) => d.id);

      if (docIds.length > 0) {
        await tx
          .delete(documentVersions)
          .where(inArray(documentVersions.documentId, docIds));
        await tx
          .delete(documentTags)
          .where(inArray(documentTags.documentId, docIds));
        await tx
          .delete(documentAccess)
          .where(inArray(documentAccess.documentId, docIds));
        await tx
          .delete(documentLogs)
          .where(inArray(documentLogs.documentId, docIds));
        await tx
          .delete(documentSharedLinks)
          .where(inArray(documentSharedLinks.documentId, docIds));
        await tx
          .delete(documentComments)
          .where(inArray(documentComments.documentId, docIds));

        await tx.delete(document).where(inArray(document.id, docIds));
      }

      await tx
        .delete(documentFolders)
        .where(inArray(documentFolders.id, allFolderIds));

      revalidatePath(pathname);
      return {
        success: { reason: "Folder and related data deleted successfully" },
        error: null,
      };
    });
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }

    return {
      error: { reason: "Couldn't delete folder. Check inputs and try again!" },
      success: null,
    };
  }
}

export async function archiveFolder(folderId: number, pathname: string) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  try {
    return await db.transaction(async (tx) => {
      if (user.role !== "admin") {
        const folder = await tx
          .select()
          .from(documentFolders)
          .where(
            and(
              eq(documentFolders.id, folderId),
              eq(documentFolders.createdBy, user.id),
            ),
          )
          .limit(1);

        if (folder.length === 0) {
          return {
            error: { reason: "User doesn't have the proper permissions" },
            success: null,
          };
        }
      }

      async function getAllSubfolderIds(
        currentFolderId: number,
        depth = 0,
      ): Promise<number[]> {
        const maxDepth = 50;
        if (depth >= maxDepth) {
          throw new Error(
            `Maximum folder nesting depth of ${maxDepth} exceeded. Cannot process folder with deeply nested structure.`,
          );
        }

        const subFolders = await tx
          .select({ id: documentFolders.id })
          .from(documentFolders)
          .where(eq(documentFolders.parentId, currentFolderId));

        const subIds = subFolders.map((f) => f.id);
        for (const subId of subIds) {
          const nested = await getAllSubfolderIds(subId, depth + 1);
          subIds.push(...nested);
        }
        return subIds;
      }

      const allFolderIds = [
        folderId,
        ...(await getAllSubfolderIds(folderId, 0)),
      ];

      const docs = await tx
        .select({ id: document.id })
        .from(document)
        .where(inArray(document.folderId, allFolderIds));

      const docIds = docs.map((d) => d.id);

      if (docIds.length > 0) {
        await tx
          .update(document)
          .set({ status: "archived", updatedAt: new Date() })
          .where(inArray(document.id, docIds));
      }

      await tx
        .update(documentFolders)
        .set({ status: "archived", updatedAt: new Date() })
        .where(inArray(documentFolders.id, allFolderIds));

      revalidatePath(pathname);
      return {
        success: {
          reason: "Folder and all related content archived successfully",
        },
        error: null,
      };
    });
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message || "Database error occurred" },
      };
    }

    return {
      error: { reason: "Couldn't archive folder. Check inputs and try again!" },
      success: null,
    };
  }
}
