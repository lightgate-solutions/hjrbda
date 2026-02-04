import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  serial,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { employees } from "./hr";
import { document } from "./documents";

export const email = pgTable(
  "email",
  {
    id: serial("id").primaryKey(),
    senderId: integer("sender_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    parentEmailId: integer("parent_email_id"),
    type: text("type").notNull().default("sent"),
    hasBeenOpened: boolean("has_been_opened").default(false).notNull(),
  },
  (table) => [
    index("email_sender_id_idx").on(table.senderId),
    index("email_created_at_idx").on(table.createdAt),
    index("email_parent_email_id_idx").on(table.parentEmailId),
  ],
);

export const emailRecipient = pgTable(
  "email_recipient",
  {
    id: serial("id").primaryKey(),
    emailId: integer("email_id")
      .notNull()
      .references(() => email.id, { onDelete: "cascade" }),
    recipientId: integer("recipient_id").references(() => employees.id, {
      onDelete: "cascade",
    }),
    externalEmail: text("external_email"),
    externalName: text("external_name"),
    isRead: boolean("is_read").default(false).notNull(),
    isArchived: boolean("is_archived").default(false).notNull(),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    readAt: timestamp("read_at"),
    archivedAt: timestamp("archived_at"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("email_recipient_email_id_idx").on(table.emailId),
    index("email_recipient_recipient_id_idx").on(table.recipientId),
    index("email_recipient_external_email_idx").on(table.externalEmail),
    index("email_recipient_is_read_idx").on(table.isRead),
    index("email_recipient_is_archived_idx").on(table.isArchived),
    index("email_recipient_is_deleted_idx").on(table.isDeleted),
  ],
);

// Relations
export const emailRelations = relations(email, ({ one, many }) => ({
  sender: one(employees, {
    fields: [email.senderId],
    references: [employees.id],
  }),
  recipients: many(emailRecipient),
  attachments: many(emailAttachment),
  parentEmail: one(email, {
    fields: [email.parentEmailId],
    references: [email.id],
  }),
}));

export const emailAttachment = pgTable(
  "email_attachment",
  {
    id: serial("id").primaryKey(),
    emailId: integer("email_id")
      .notNull()
      .references(() => email.id, { onDelete: "cascade" }),
    documentId: integer("document_id")
      .notNull()
      .references(() => document.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("email_attachment_email_id_idx").on(table.emailId),
    index("email_attachment_document_id_idx").on(table.documentId),
  ],
);

export const emailRecipientRelations = relations(emailRecipient, ({ one }) => ({
  email: one(email, {
    fields: [emailRecipient.emailId],
    references: [email.id],
  }),
  recipient: one(employees, {
    fields: [emailRecipient.recipientId],
    references: [employees.id],
  }),
}));

export const emailAttachmentRelations = relations(
  emailAttachment,
  ({ one }) => ({
    email: one(email, {
      fields: [emailAttachment.emailId],
      references: [email.id],
    }),
    document: one(document, {
      fields: [emailAttachment.documentId],
      references: [document.id],
    }),
  }),
);
