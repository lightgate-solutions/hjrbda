import { pgTable, uuid, boolean, serial } from "drizzle-orm/pg-core";
import { employees } from "./hr";

export const notification_preferences = pgTable("notification_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: serial("user_id")
    .references(() => employees.id)
    .notNull(),

  // Master toggles
  email_notifications: boolean("email_notifications").default(true).notNull(),
  in_app_notifications: boolean("in_app_notifications").default(true).notNull(),

  // Email sub-options (hierarchical - only active when email_notifications is true)
  email_on_in_app_message: boolean("email_on_in_app_message")
    .default(true)
    .notNull(),
  email_on_task_notification: boolean("email_on_task_notification")
    .default(false)
    .notNull(),
  email_on_general_notification: boolean("email_on_general_notification")
    .default(false)
    .notNull(),

  // Legacy (keep for backward compatibility)
  //   push_notifications: boolean("push_notifications").default(true).notNull(),
  notify_on_message: boolean("notify_on_message").default(true).notNull(),
});
