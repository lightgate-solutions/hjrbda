/** biome-ignore-all lint/style/noNonNullAssertion: <> */

"use server";

import { db } from "@/db";
import {
  newsArticles,
  newsComments,
  newsAttachments,
  employees,
} from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getUser, requireHROrAdmin } from "@/actions/auth/dal";
import { createNotification } from "@/actions/notification/notification";

export type NewsArticle = {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  authorId: number;
  authorName: string;
  status: "draft" | "published" | "archived";
  commentsEnabled: boolean;
  isPinned: boolean;
  viewCount: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  commentCount: number;
  attachments: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }[];
};

export type CreateNewsInput = {
  title: string;
  content: string;
  excerpt?: string;
  status: "draft" | "published";
  commentsEnabled: boolean;
  isPinned: boolean;
  attachments: {
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }[];
};

export type UpdateNewsInput = {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  status: "draft" | "published" | "archived";
  commentsEnabled: boolean;
  isPinned: boolean;
  attachments: {
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }[];
};

export async function createNewsArticle(data: CreateNewsInput) {
  const { employee } = await requireHROrAdmin();

  try {
    const [article] = await db
      .insert(newsArticles)
      .values({
        title: data.title,
        content: data.content,
        excerpt: data.excerpt || null,
        authorId: employee.id,
        status: data.status,
        commentsEnabled: data.commentsEnabled,
        isPinned: data.isPinned,
        publishedAt: data.status === "published" ? new Date() : null,
      })
      .returning();

    if (data.attachments.length > 0) {
      await db.insert(newsAttachments).values(
        data.attachments.map((att) => ({
          articleId: article.id,
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          fileSize: att.fileSize,
          mimeType: att.mimeType,
        })),
      );
    }

    if (data.status === "published") {
      const allEmployees = await db
        .select({ id: employees.id })
        .from(employees)
        .where(sql`${employees.id} != ${employee.id}`);

      for (const emp of allEmployees) {
        await createNotification({
          user_id: emp.id,
          title: "News Article",
          message: `${employee.name} published: "${article.title}"`,
          notification_type: "message",
          reference_id: undefined,
        });
      }
    }

    revalidatePath("/news");

    return {
      success: { reason: "News article created successfully" },
      error: null,
    };
  } catch (_err) {
    return {
      success: null,
      error: { reason: "Failed to create news article" },
    };
  }
}

export async function updateNewsArticle(data: UpdateNewsInput) {
  const { employee } = await requireHROrAdmin();

  try {
    const [existing] = await db
      .select()
      .from(newsArticles)
      .where(eq(newsArticles.id, data.id))
      .limit(1);

    if (!existing) {
      return { success: null, error: { reason: "News article not found" } };
    }

    const wasPublished = existing.status === "published";
    const isNowPublished = data.status === "published";

    await db
      .update(newsArticles)
      .set({
        title: data.title,
        content: data.content,
        excerpt: data.excerpt || null,
        status: data.status,
        commentsEnabled: data.commentsEnabled,
        isPinned: data.isPinned,
        publishedAt:
          !wasPublished && isNowPublished ? new Date() : existing.publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(newsArticles.id, data.id));

    await db
      .delete(newsAttachments)
      .where(eq(newsAttachments.articleId, data.id));

    if (data.attachments.length > 0) {
      await db.insert(newsAttachments).values(
        data.attachments.map((att) => ({
          articleId: data.id,
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          fileSize: att.fileSize,
          mimeType: att.mimeType,
        })),
      );
    }

    if (!wasPublished && isNowPublished) {
      const allEmployees = await db
        .select({ id: employees.id })
        .from(employees)
        .where(sql`${employees.id} != ${employee.id}`);

      for (const emp of allEmployees) {
        await createNotification({
          user_id: emp.id,
          title: "News Article",
          message: `${employee.name} published: "${data.title}"`,
          notification_type: "message",
          reference_id: undefined,
        });
      }
    }

    revalidatePath("/news");
    revalidatePath(`/news/${data.id}`);

    return {
      success: { reason: "News article updated successfully" },
      error: null,
    };
  } catch (_err) {
    return {
      success: null,
      error: { reason: "Failed to update news article" },
    };
  }
}

export async function deleteNewsArticle(id: string) {
  await requireHROrAdmin();

  try {
    await db.delete(newsArticles).where(eq(newsArticles.id, id));

    revalidatePath("/news");

    return {
      success: { reason: "News article deleted successfully" },
      error: null,
    };
  } catch (_err) {
    return {
      success: null,
      error: { reason: "Failed to delete news article" },
    };
  }
}

export async function getPublishedNews() {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  const articles = await db
    .select({
      id: newsArticles.id,
      title: newsArticles.title,
      content: newsArticles.content,
      excerpt: newsArticles.excerpt,
      authorId: newsArticles.authorId,
      authorName: employees.name,
      status: newsArticles.status,
      commentsEnabled: newsArticles.commentsEnabled,
      isPinned: newsArticles.isPinned,
      viewCount: newsArticles.viewCount,
      publishedAt: newsArticles.publishedAt,
      createdAt: newsArticles.createdAt,
      updatedAt: newsArticles.updatedAt,
    })
    .from(newsArticles)
    .innerJoin(employees, eq(newsArticles.authorId, employees.id))
    .where(eq(newsArticles.status, "published"))
    .orderBy(desc(newsArticles.isPinned), desc(newsArticles.publishedAt));

  const articleIds = articles.map((a) => a.id);

  const [comments, attachments] = await Promise.all([
    articleIds.length > 0
      ? db
          .select({
            articleId: newsComments.articleId,
            count: sql<number>`count(*)::int`,
          })
          .from(newsComments)
          .where(sql`${newsComments.articleId} IN ${articleIds}`)
          .groupBy(newsComments.articleId)
      : [],
    articleIds.length > 0
      ? db
          .select()
          .from(newsAttachments)
          .where(sql`${newsAttachments.articleId} IN ${articleIds}`)
      : [],
  ]);

  const commentCountMap = new Map(comments.map((c) => [c.articleId, c.count]));
  const attachmentMap = new Map<string, (typeof attachments)[number][]>();
  for (const att of attachments) {
    if (!attachmentMap.has(att.articleId)) {
      attachmentMap.set(att.articleId, []);
    }
    attachmentMap.get(att.articleId)!.push(att);
  }

  return articles.map((article) => ({
    ...article,
    commentCount: commentCountMap.get(article.id) || 0,
    attachments: (attachmentMap.get(article.id) || []).map((a) => ({
      id: a.id,
      fileName: a.fileName,
      fileUrl: a.fileUrl,
      fileSize: a.fileSize,
      mimeType: a.mimeType,
    })),
  })) as NewsArticle[];
}

export async function getAllNews() {
  await requireHROrAdmin();

  const articles = await db
    .select({
      id: newsArticles.id,
      title: newsArticles.title,
      content: newsArticles.content,
      excerpt: newsArticles.excerpt,
      authorId: newsArticles.authorId,
      authorName: employees.name,
      status: newsArticles.status,
      commentsEnabled: newsArticles.commentsEnabled,
      isPinned: newsArticles.isPinned,
      viewCount: newsArticles.viewCount,
      publishedAt: newsArticles.publishedAt,
      createdAt: newsArticles.createdAt,
      updatedAt: newsArticles.updatedAt,
    })
    .from(newsArticles)
    .innerJoin(employees, eq(newsArticles.authorId, employees.id))
    .orderBy(desc(newsArticles.createdAt));

  const articleIds = articles.map((a) => a.id);

  const [comments, attachments] = await Promise.all([
    articleIds.length > 0
      ? db
          .select({
            articleId: newsComments.articleId,
            count: sql<number>`count(*)::int`,
          })
          .from(newsComments)
          .where(sql`${newsComments.articleId} IN ${articleIds}`)
          .groupBy(newsComments.articleId)
      : [],
    articleIds.length > 0
      ? db
          .select()
          .from(newsAttachments)
          .where(sql`${newsAttachments.articleId} IN ${articleIds}`)
      : [],
  ]);

  const commentCountMap = new Map(comments.map((c) => [c.articleId, c.count]));
  const attachmentMap = new Map<string, (typeof attachments)[number][]>();
  for (const att of attachments) {
    if (!attachmentMap.has(att.articleId)) {
      attachmentMap.set(att.articleId, []);
    }
    attachmentMap.get(att.articleId)!.push(att);
  }

  return articles.map((article) => ({
    ...article,
    commentCount: commentCountMap.get(article.id) || 0,
    attachments: (attachmentMap.get(article.id) || []).map((a) => ({
      id: a.id,
      fileName: a.fileName,
      fileUrl: a.fileUrl,
      fileSize: a.fileSize,
      mimeType: a.mimeType,
    })),
  })) as NewsArticle[];
}

export async function getNewsArticle(id: string) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  const [article] = await db
    .select({
      id: newsArticles.id,
      title: newsArticles.title,
      content: newsArticles.content,
      excerpt: newsArticles.excerpt,
      authorId: newsArticles.authorId,
      authorName: employees.name,
      status: newsArticles.status,
      commentsEnabled: newsArticles.commentsEnabled,
      isPinned: newsArticles.isPinned,
      viewCount: newsArticles.viewCount,
      publishedAt: newsArticles.publishedAt,
      createdAt: newsArticles.createdAt,
      updatedAt: newsArticles.updatedAt,
    })
    .from(newsArticles)
    .innerJoin(employees, eq(newsArticles.authorId, employees.id))
    .where(eq(newsArticles.id, id))
    .limit(1);

  if (!article) return null;

  const isHROrAdmin = user.role === "admin" || user.role === "hr";
  if (article.status !== "published" && !isHROrAdmin) {
    return null;
  }

  await db
    .update(newsArticles)
    .set({ viewCount: sql`${newsArticles.viewCount} + 1` })
    .where(eq(newsArticles.id, id));

  const [comments, attachments] = await Promise.all([
    db
      .select({
        articleId: newsComments.articleId,
        count: sql<number>`count(*)::int`,
      })
      .from(newsComments)
      .where(eq(newsComments.articleId, id))
      .groupBy(newsComments.articleId),
    db.select().from(newsAttachments).where(eq(newsAttachments.articleId, id)),
  ]);

  return {
    ...article,
    commentCount: comments[0]?.count || 0,
    attachments: attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      fileUrl: a.fileUrl,
      fileSize: a.fileSize,
      mimeType: a.mimeType,
    })),
  } as NewsArticle;
}

export async function getNewsComments(articleId: string) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  const comments = await db
    .select({
      id: newsComments.id,
      content: newsComments.content,
      userId: newsComments.userId,
      userName: employees.name,
      createdAt: newsComments.createdAt,
    })
    .from(newsComments)
    .innerJoin(employees, eq(newsComments.userId, employees.id))
    .where(eq(newsComments.articleId, articleId))
    .orderBy(desc(newsComments.createdAt));

  return comments;
}

export async function addNewsComment(articleId: string, content: string) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  const [article] = await db
    .select()
    .from(newsArticles)
    .where(
      and(
        eq(newsArticles.id, articleId),
        eq(newsArticles.commentsEnabled, true),
        eq(newsArticles.status, "published"),
      ),
    )
    .limit(1);

  if (!article) {
    return {
      success: null,
      error: { reason: "Article not found or comments disabled" },
    };
  }

  try {
    await db.insert(newsComments).values({
      articleId,
      userId: user.id,
      content,
    });

    revalidatePath(`/news/${articleId}`);

    return { success: { reason: "Comment added successfully" }, error: null };
  } catch (_err) {
    return { success: null, error: { reason: "Failed to add comment" } };
  }
}

export async function deleteNewsComment(commentId: string) {
  const user = await getUser();
  if (!user) throw new Error("User not logged in");

  const [comment] = await db
    .select()
    .from(newsComments)
    .where(eq(newsComments.id, commentId))
    .limit(1);

  if (!comment) {
    return { success: null, error: { reason: "Comment not found" } };
  }

  const isHROrAdmin = user.role === "admin" || user.role === "hr";
  if (comment.userId !== user.id && !isHROrAdmin) {
    return {
      success: null,
      error: { reason: "Not authorized to delete this comment" },
    };
  }

  try {
    await db.delete(newsComments).where(eq(newsComments.id, commentId));

    revalidatePath(`/news/${comment.articleId}`);

    return { success: { reason: "Comment deleted successfully" }, error: null };
  } catch (_err) {
    return { success: null, error: { reason: "Failed to delete comment" } };
  }
}
