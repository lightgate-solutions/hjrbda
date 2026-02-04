import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  notifications: defineTable({
    userId: v.number(),
    title: v.string(),
    message: v.string(),
    notificationType: v.union(
      v.literal("approval"),
      v.literal("deadline"),
      v.literal("message"),
    ),
    createdBy: v.number(),
    referenceId: v.optional(v.number()),
    isRead: v.boolean(),
  }),
});
