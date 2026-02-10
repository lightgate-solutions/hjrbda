/** biome-ignore-all lint/style/noNonNullAssertion: <> */
"use server";

import webpush from "web-push";
import { redisClient } from "@/lib/redisClient";

// Configure VAPID details
webpush.setVapidDetails(
  "mailto:hjrbda@cave.ng",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

const REDIS_KEY = "push:subscriptions";

export async function subscribeToPush(sub: Record<string, unknown>) {
  try {
    const subscription: WebPushSubscription = {
      endpoint: sub.endpoint as string,
      keys: {
        p256dh: (sub.keys as Record<string, string>).p256dh,
        auth: (sub.keys as Record<string, string>).auth,
      },
    };

    // Store subscription in Redis Hash
    await redisClient.hset(REDIS_KEY, {
      [subscription.endpoint]: JSON.stringify(subscription),
    });

    console.log("User subscribed to push notifications");
    return { success: true, message: "Subscribed to notifications" };
  } catch (error) {
    console.error("Error subscribing to push:", error);
    return { success: false, message: "Failed to subscribe" };
  }
}

export async function unsubscribeFromPush(sub: Record<string, unknown>) {
  try {
    const endpoint = sub.endpoint as string;

    // Remove subscription from Redis Hash
    await redisClient.hdel(REDIS_KEY, endpoint);

    console.log("User unsubscribed from push notifications");
    return { success: true, message: "Unsubscribed from notifications" };
  } catch (error) {
    console.error("Error unsubscribing from push:", error);
    return { success: false, message: "Failed to unsubscribe" };
  }
}

export async function sendNotificationToAll(notificationData: {
  title: string;
  body: string;
  url?: string;
  persistent?: boolean;
}) {
  try {
    // Get all subscriptions from Redis Hash
    const subscriptionsData =
      await redisClient.hgetall<Record<string, string>>(REDIS_KEY);

    if (!subscriptionsData || Object.keys(subscriptionsData).length === 0) {
      return { success: false, message: "No active subscriptions" };
    }

    const notification = {
      title: notificationData.title,
      body: notificationData.body,
      icon: "/web-app-manifest-192x192.png",
      url: notificationData.url || "/",
      persistent: notificationData.persistent || false,
    };

    // Parse subscriptions from JSON strings
    const subscriptions = Object.values(subscriptionsData).map(
      (sub) => JSON.parse(sub) as WebPushSubscription,
    );

    const promises = subscriptions.map((subscription) =>
      webpush
        .sendNotification(subscription, JSON.stringify(notification))
        .catch(async (error) => {
          console.error("Error sending notification:", error);
          // Remove failed subscription from Redis
          await redisClient.hdel(REDIS_KEY, subscription.endpoint);
        }),
    );

    await Promise.all(promises);
    console.log(`Notification sent to ${subscriptions.length} users`);
    return { success: true, message: "Notification sent" };
  } catch (error) {
    console.error("Error sending notification:", error);
    return { success: false, message: "Failed to send notification" };
  }
}
