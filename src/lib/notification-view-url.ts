/**
 * Client-safe helpers for notification "View" URLs.
 * No server-only imports (db, etc.) so safe to use in client components.
 */

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

  if (
    title === "Assigned as Project Supervisor" ||
    title?.toLowerCase().includes("project supervisor")
  ) {
    return `/projects/${referenceId}`;
  }

  if (
    title === "New message received" ||
    title === "New reply received" ||
    title?.toLowerCase().includes("message") ||
    title?.toLowerCase().includes("reply")
  ) {
    return `/mail/inbox?id=${referenceId}`;
  }

  return null;
}
