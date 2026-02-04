import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  serial,
  pgEnum,
} from "drizzle-orm/pg-core";
import { employees } from "./hr";

export const notificationTypeEnum = pgEnum("notification_type", [
  "approval",
  "deadline",
  "message",
]);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: serial("user_id")
    .references(() => employees.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  notification_type: notificationTypeEnum("notification_type").notNull(),
  created_by: serial("created_by").references(() => employees.id, {
    onDelete: "set null",
  }),
  reference_id: serial("reference_id"), // Generic reference - can be task, project, document, etc.
  is_read: boolean("is_read").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
