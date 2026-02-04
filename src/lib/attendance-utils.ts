/**
 * Utility functions for attendance sign-in pop-up
 */

export interface AttendanceSettings {
  signInStartTime: string;
  signInEndTime: string;
  signOutStartTime: string;
  signOutEndTime: string;
  // Legacy support for old format
  signInStartHour?: number;
  signInEndHour?: number;
  signOutStartHour?: number;
  signOutEndHour?: number;
}

/**
 * Check if current time is within the sign-in window
 */
export function isWithinSignInWindow(settings: AttendanceSettings): boolean {
  const now = new Date();

  // Convert legacy format if needed
  const startTime =
    settings.signInStartTime ||
    `${settings.signInStartHour?.toString().padStart(2, "0")}:00` ||
    "06:00";
  const endTime =
    settings.signInEndTime ||
    `${settings.signInEndHour?.toString().padStart(2, "0")}:00` ||
    "09:00";

  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Get localStorage key for pop-up dismissal (per day)
 */
export function getPopupDismissalKey(): string {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
  return `attendance-popup-dismissed-${today}`;
}

/**
 * Get localStorage key for snooze timestamp
 */
export function getSnoozeKey(): string {
  return "attendance-popup-snooze-until";
}

/**
 * Check if pop-up was dismissed for today
 */
export function isPopupDismissedToday(): boolean {
  if (typeof window === "undefined") return false;
  const key = getPopupDismissalKey();
  return localStorage.getItem(key) === "true";
}

/**
 * Mark pop-up as dismissed for today
 */
export function dismissPopupForToday(): void {
  if (typeof window === "undefined") return;
  const key = getPopupDismissalKey();
  localStorage.setItem(key, "true");
}

/**
 * Check if pop-up is currently snoozed
 */
export function isPopupSnoozed(): boolean {
  if (typeof window === "undefined") return false;
  const key = getSnoozeKey();
  const snoozeUntil = localStorage.getItem(key);

  if (!snoozeUntil) return false;

  const snoozeTimestamp = Number.parseInt(snoozeUntil, 10);
  const now = Date.now();

  // If snooze time has passed, clear it
  if (now > snoozeTimestamp) {
    localStorage.removeItem(key);
    return false;
  }

  return true;
}

/**
 * Set snooze for 30 minutes
 */
export function snoozePopup(): void {
  if (typeof window === "undefined") return;
  const key = getSnoozeKey();
  const snoozeUntil = Date.now() + 30 * 60 * 1000; // 30 minutes from now
  localStorage.setItem(key, snoozeUntil.toString());
}

/**
 * Get remaining snooze time in minutes
 */
export function getSnoozeRemainingMinutes(): number {
  if (typeof window === "undefined") return 0;
  const key = getSnoozeKey();
  const snoozeUntil = localStorage.getItem(key);

  if (!snoozeUntil) return 0;

  const snoozeTimestamp = Number.parseInt(snoozeUntil, 10);
  const now = Date.now();
  const remaining = snoozeTimestamp - now;

  if (remaining <= 0) return 0;

  return Math.ceil(remaining / (60 * 1000)); // Convert to minutes
}

/**
 * Determine if pop-up should be shown
 * @param hasSignedInToday - Whether user has already signed in today
 */
export function shouldShowPopup(hasSignedInToday: boolean): boolean {
  // Don't show if already signed in
  if (hasSignedInToday) return false;

  // Don't show if dismissed for today
  if (isPopupDismissedToday()) return false;

  // Don't show if snoozed
  if (isPopupSnoozed()) return false;

  return true;
}

/**
 * Format time window message
 */
export function getTimeWindowMessage(settings: AttendanceSettings): string {
  const now = new Date();

  // Convert legacy format if needed
  const startTime =
    settings.signInStartTime ||
    `${settings.signInStartHour?.toString().padStart(2, "0")}:00` ||
    "06:00";
  const endTime =
    settings.signInEndTime ||
    `${settings.signInEndHour?.toString().padStart(2, "0")}:00` ||
    "09:00";

  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  if (currentMinutes < startMinutes) {
    return `Sign-in opens at ${startTime}`;
  }

  if (currentMinutes > endMinutes) {
    return `Sign-in window closed (${startTime} - ${endTime})`;
  }

  return "Sign-in available now";
}
