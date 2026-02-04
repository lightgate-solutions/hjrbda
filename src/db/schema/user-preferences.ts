import {
  pgTable,
  text,
  timestamp,
  serial,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";
import { employees } from "./hr";

export const themeEnum = pgEnum("theme", ["light", "dark", "system"]);

export const languageEnum = pgEnum("language", ["en", "fr", "es", "de"]);

export const dateFormatEnum = pgEnum("date_format", [
  "MM/DD/YYYY",
  "DD/MM/YYYY",
  "YYYY-MM-DD",
  "DD MMM YYYY",
]);

export const timezoneEnum = pgEnum("timezone", [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Dubai",
  "Africa/Lagos",
]);

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => employees.id, { onDelete: "cascade" })
    .notNull()
    .unique(),

  // Display preferences
  theme: themeEnum("theme").default("system").notNull(),
  language: languageEnum("language").default("en").notNull(),
  dateFormat: dateFormatEnum("date_format").default("MM/DD/YYYY").notNull(),
  timezone: timezoneEnum("timezone").default("UTC").notNull(),

  // Dashboard layout preferences
  sidebarCollapsed: text("sidebar_collapsed").default("false"), // Store as string to handle localStorage sync
  defaultView: text("default_view").default("dashboard"), // dashboard, documents, tasks, etc.
  itemsPerPage: text("items_per_page").default("10"),

  // Profile visibility
  profileVisibility: text("profile_visibility").default("private"), // public, private, team

  // Additional preferences
  emailDigest: text("email_digest").default("daily"), // never, daily, weekly
  compactMode: text("compact_mode").default("false"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
