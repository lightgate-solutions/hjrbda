import { pgEnum } from "drizzle-orm/pg-core";

export const taskStatusEnum = pgEnum("task_status", [
  "Backlog",
  "Todo",
  "In Progress",
  "Review",
  "Completed",
  "Pending",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "Low",
  "Medium",
  "High",
  "Urgent",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "Accepted",
  "Rejected",
]);
