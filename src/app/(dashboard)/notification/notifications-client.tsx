"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bell, Check, ExternalLink } from "lucide-react";
import dayjs from "dayjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface Notification {
  _id: Id<"notifications">;
  _creationTime: number;
  title: string;
  message: string;
  notificationType: string;
  referenceId?: number;
  isRead: boolean;
  createdBy: number;
  userId: number;
}

interface NotificationsClientProps {
  employeeId: number;
}

export default function NotificationsClient({
  employeeId,
}: NotificationsClientProps) {
  const notifications = useQuery(api.notifications.getUserNotifications, {
    userId: employeeId,
  });

  const markAsReadMutation = useMutation(api.notifications.markAsRead);
  const markAllAsReadMutation = useMutation(api.notifications.markAllAsRead);
  const deleteNotificationMutation = useMutation(
    api.notifications.deleteNotification,
  );
  const clearAllNotificationsMutation = useMutation(
    api.notifications.clearAllNotifications,
  );

  const handleMarkAsRead = async (id: Id<"notifications">) => {
    try {
      await markAsReadMutation({ id });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllAsReadMutation({ userId: employeeId });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await clearAllNotificationsMutation({ userId: employeeId });
    } catch (err) {
      console.error("Error clearing all notifications:", err);
    }
  };

  const clearNotification = async (id: Id<"notifications">) => {
    try {
      await deleteNotificationMutation({ id });
    } catch (err) {
      console.error("Error clearing notification:", err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read when clicked
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }

    // Navigate to reference if exists
    if (notification.referenceId) {
      // You can implement navigation logic here based on notification type
      console.log("Navigate to reference:", notification.referenceId);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div />
      </div>

      {notifications === undefined ? (
        <div className="flex justify-center items-center h-[70vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : notifications?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-3">
          <Bell className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <Button
              onClick={markAllAsRead}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Mark all as read
            </Button>
            <Button
              onClick={clearAllNotifications}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Clear All
            </Button>
          </div>
          {notifications?.map((n) => (
            <Card
              key={n._id}
              className={`transition-all relative ${n.isRead ? "opacity-70" : "border-primary"} hover:shadow-md cursor-pointer`}
              onClick={() => handleNotificationClick(n)}
            >
              <CardHeader className="flex flex-row justify-between items-center">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{n.title}</CardTitle>
                  {n.referenceId && (
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={n.isRead ? "secondary" : "default"}>
                    {n.notificationType}
                  </Badge>
                  {!n.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(n._id);
                      }}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Mark as read
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pb-10">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {n.message}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {dayjs(n._creationTime).format("MMM D, YYYY h:mm A")}
                </p>
              </CardContent>

              <div className="absolute bottom-3 right-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearNotification(n._id);
                  }}
                  className="h-7 px-3 text-xs text-red-500 border-red-300 hover:bg-red-50"
                >
                  Clear
                </Button>
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
