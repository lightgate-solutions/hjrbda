import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  serial,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";
import { employees } from "./hr";

export const newsStatusEnum = pgEnum("news_status", [
  "draft",
  "published",
  "archived",
]);

export const newsArticles = pgTable("news_articles", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  authorId: serial("author_id")
    .references(() => employees.id, { onDelete: "cascade" })
    .notNull(),
  status: newsStatusEnum("status").default("draft").notNull(),
  commentsEnabled: boolean("comments_enabled").default(true).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const newsComments = pgTable("news_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  articleId: uuid("article_id")
    .references(() => newsArticles.id, { onDelete: "cascade" })
    .notNull(),
  userId: serial("user_id")
    .references(() => employees.id, { onDelete: "cascade" })
    .notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const newsAttachments = pgTable("news_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  articleId: uuid("article_id")
    .references(() => newsArticles.id, { onDelete: "cascade" })
    .notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
