import { relations } from "drizzle-orm";
import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { employees } from "./hr";
import { milestones, projects } from "./projects";

export const projectPhotoCategoryEnum = pgEnum("project_photo_category", [
  "progress",
  "completion",
  "inspection",
  "incident",
  "asset",
  "other",
]);

export const projectPhotos = pgTable(
  "project_photos",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    milestoneId: integer("milestone_id").references(() => milestones.id, {
      onDelete: "set null",
    }),
    uploadedBy: integer("uploaded_by")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    fileUrl: text("file_url").notNull(),
    fileKey: text("file_key").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size").notNull(),
    mimeType: text("mime_type").notNull(),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    accuracy: numeric("accuracy", { precision: 10, scale: 2 }),
    category: projectPhotoCategoryEnum("category").default("other"),
    note: text("note"),
    capturedAt: timestamp("captured_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("project_photos_project_idx").on(table.projectId),
    index("project_photos_milestone_idx").on(table.milestoneId),
    index("project_photos_uploaded_by_idx").on(table.uploadedBy),
    index("project_photos_category_idx").on(table.category),
    index("project_photos_captured_at_idx").on(table.capturedAt),
  ],
);

export const projectPhotoTags = pgTable(
  "project_photo_tags",
  {
    id: serial("id").primaryKey(),
    photoId: integer("photo_id")
      .notNull()
      .references(() => projectPhotos.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("project_photo_tags_photo_idx").on(table.photoId),
    index("project_photo_tags_tag_idx").on(table.tag),
  ],
);

export const projectPhotosRelations = relations(
  projectPhotos,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [projectPhotos.projectId],
      references: [projects.id],
    }),
    milestone: one(milestones, {
      fields: [projectPhotos.milestoneId],
      references: [milestones.id],
    }),
    uploader: one(employees, {
      fields: [projectPhotos.uploadedBy],
      references: [employees.id],
    }),
    tags: many(projectPhotoTags),
  }),
);

export const projectPhotoTagsRelations = relations(
  projectPhotoTags,
  ({ one }) => ({
    photo: one(projectPhotos, {
      fields: [projectPhotoTags.photoId],
      references: [projectPhotos.id],
    }),
  }),
);
