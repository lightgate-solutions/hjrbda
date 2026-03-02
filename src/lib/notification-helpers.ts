import { db } from "@/db";
import { notification_preferences } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export type NotificationType = "in_app_message" | "task" | "general";

export interface NotificationForView {
  title: string;
  notificationType: string;
  referenceId?: number;
}

/**
 * Returns the URL to view the source of a notification (e.g. project page, email thread).
 * Used for the "View" button so the user can navigate to where the notification came from.
 */
export function getNotificationViewUrl(
  notification: NotificationForView,
): string | null {
  const { title, referenceId } = notification;
  if (referenceId == null) return null;

  // Project supervisor assignment → project detail (phases/milestones live there)
  if (
    title === "Assigned as Project Supervisor" ||
    title?.toLowerCase().includes("project supervisor")
  ) {
    return `/projects/${referenceId}`;
  }

  // New message / reply → open that email in inbox
  if (
    title === "New message received" ||
    title === "New reply received" ||
    title?.toLowerCase().includes("message") ||
    title?.toLowerCase().includes("reply")
  ) {
    return `/mail/inbox?id=${referenceId}`;
  }

  // News Article notifications use UUID (string) for article id; referenceId is number, so no view link for now
  return null;
}

/**
 * Check if a user should receive email notifications for a specific type
 * Implements hierarchical logic: parent OFF = all children OFF
 */
export async function shouldSendEmailNotification(
  userId: number,
  notificationType: NotificationType,
): Promise<boolean> {
  try {
    const [prefs] = await db
      .select()
      .from(notification_preferences)
      .where(eq(notification_preferences.user_id, userId))
      .limit(1);

    // If no preferences found, default to true (fail-safe)
    if (!prefs) return true;

    // Check parent toggle first (hierarchical control)
    if (!prefs.email_notifications) return false;

    // Parent is ON, check specific sub-option
    switch (notificationType) {
      case "in_app_message":
        return prefs.email_on_in_app_message !== false;
      case "task":
        return prefs.email_on_task_notification !== false;
      case "general":
        return prefs.email_on_general_notification !== false;
      default:
        return true; // Fail-safe for unknown types
    }
  } catch (error) {
    console.error("Error checking notification preferences:", error);
    return true; // Fail-safe: send notification on error
  }
}

/**
 * Batch check for multiple users (more efficient for bulk operations)
 */
export async function filterUsersByEmailPreference(
  userIds: number[],
  notificationType: NotificationType,
): Promise<number[]> {
  try {
    const prefs = await db
      .select({
        userId: notification_preferences.user_id,
        emailNotifications: notification_preferences.email_notifications,
        emailOnInAppMessage: notification_preferences.email_on_in_app_message,
        emailOnTaskNotification:
          notification_preferences.email_on_task_notification,
        emailOnGeneralNotification:
          notification_preferences.email_on_general_notification,
      })
      .from(notification_preferences)
      .where(inArray(notification_preferences.user_id, userIds));

    const prefsMap = new Map(prefs.map((p) => [p.userId, p]));

    return userIds.filter((userId) => {
      const pref = prefsMap.get(userId);

      // No preferences found, default to true
      if (!pref) return true;

      // Parent toggle OFF = no emails
      if (!pref.emailNotifications) return false;

      // Check specific sub-option
      switch (notificationType) {
        case "in_app_message":
          return pref.emailOnInAppMessage !== false;
        case "task":
          return pref.emailOnTaskNotification !== false;
        case "general":
          return pref.emailOnGeneralNotification !== false;
        default:
          return true;
      }
    });
  } catch (error) {
    console.error("Error filtering users by preferences:", error);
    return userIds; // Fail-safe: include all users on error
  }
}
