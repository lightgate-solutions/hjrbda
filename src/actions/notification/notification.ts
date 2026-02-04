"use server";

import { getUser } from "../auth/dal";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";

type CreateNotificationInput = {
  user_id: number;
  title: string;
  message: string;
  notification_type: "approval" | "deadline" | "message";
  reference_id?: number;
  is_read?: boolean;
};

export async function createNotification({
  user_id,
  title,
  message,
  notification_type,
  reference_id = 0,
  is_read = false,
}: CreateNotificationInput) {
  try {
    const currentUser = await getUser();

    if (!currentUser) {
      return {
        success: false,
        data: null,
        error: "Log in to continue",
      };
    }

    await fetchMutation(api.notifications.createNotification, {
      created_by: currentUser.id,
      title,
      reference_id,
      user_id,
      message,
      notification_type,
      is_read,
    });

    return {
      success: true,
      data: title,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create notification",
    };
  }
}

export async function getUserNotifications() {
  const currentUser = await getUser();
  if (!currentUser) {
    return {
      success: false,
      data: [],
      error: "Log in to continue",
    };
  }

  const userId = currentUser.id;

  const userNotifications = await fetchQuery(
    api.notifications.getUserNotifications,
    { userId },
  );

  return { success: true, data: userNotifications, error: null };
}
