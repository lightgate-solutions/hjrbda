"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormSuccess, FormError } from "@/components/ui/form-messages";

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState({
    email_notifications: true,
    in_app_notifications: true,
    email_on_in_app_message: true,
    email_on_task_notification: true,
    email_on_general_notification: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formState, setFormState] = useState<{
    success?: string;
    error?: string;
  }>({});

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const res = await axios.get("/api/notification-preferences", {
          withCredentials: true,
        });
        if (res.data?.success && res.data?.data) {
          setPrefs(res.data.data);
        }
      } catch (error) {
        console.error("Error loading preferences", error);
      } finally {
        setLoading(false);
      }
    };
    loadPrefs();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setFormState({});
    try {
      const response = await axios.post(
        "/api/notification-preferences",
        prefs,
        { withCredentials: true },
      );

      if (response.data.success) {
        setFormState({
          success: "Preferences saved successfully",
        });
      } else {
        setFormState({
          error: response.data?.message || "Failed to save preferences.",
        });
      }
    } catch (error) {
      console.error("Error saving preferences", error);
      setFormState({
        error: "Network error: unable to save preferences.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading preferences...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Manage how you receive notifications from the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormSuccess message={formState.success || ""} />
          <FormError message={formState.error || ""} />

          {/* Email Notifications - Parent */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label
                  htmlFor="email-notifications"
                  className="text-base font-semibold"
                >
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={prefs.email_notifications}
                onCheckedChange={(checked) =>
                  setPrefs({ ...prefs, email_notifications: checked })
                }
              />
            </div>

            {/* Email Sub-Options - Children (indented) */}
            <div className="ml-6 space-y-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
              <div
                className={`flex items-center justify-between transition-opacity ${
                  prefs.email_notifications ? "opacity-100" : "opacity-50"
                }`}
              >
                <div className="space-y-0.5">
                  <Label
                    htmlFor="email-in-app-message"
                    className="text-sm font-medium"
                  >
                    In-App Messages
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Email notifications when you receive in-app mails
                  </p>
                </div>
                <Switch
                  id="email-in-app-message"
                  checked={prefs.email_on_in_app_message}
                  disabled={!prefs.email_notifications}
                  onCheckedChange={(checked) =>
                    setPrefs({ ...prefs, email_on_in_app_message: checked })
                  }
                />
              </div>

              <div
                className={`flex items-center justify-between transition-opacity ${
                  prefs.email_notifications ? "opacity-100" : "opacity-50"
                }`}
              >
                <div className="space-y-0.5">
                  <Label
                    htmlFor="email-task-notification"
                    className="text-sm font-medium"
                  >
                    Task Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Email notifications for task assignments, deadlines, and
                    approvals
                  </p>
                </div>
                <Switch
                  id="email-task-notification"
                  checked={prefs.email_on_task_notification}
                  disabled={!prefs.email_notifications}
                  onCheckedChange={(checked) =>
                    setPrefs({ ...prefs, email_on_task_notification: checked })
                  }
                />
              </div>

              <div
                className={`flex items-center justify-between transition-opacity ${
                  prefs.email_notifications ? "opacity-100" : "opacity-50"
                }`}
              >
                <div className="space-y-0.5">
                  <Label
                    htmlFor="email-general-notification"
                    className="text-sm font-medium"
                  >
                    General System Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Email notifications for system events and updates
                  </p>
                </div>
                <Switch
                  id="email-general-notification"
                  checked={prefs.email_on_general_notification}
                  disabled={!prefs.email_notifications}
                  onCheckedChange={(checked) =>
                    setPrefs({
                      ...prefs,
                      email_on_general_notification: checked,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* In-App Notifications - Separate */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="in-app-notifications"
                className="text-base font-semibold"
              >
                In-App Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Show notifications in the application
              </p>
            </div>
            <Switch
              id="in-app-notifications"
              checked={prefs.in_app_notifications}
              onCheckedChange={(checked) =>
                setPrefs({ ...prefs, in_app_notifications: checked })
              }
            />
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
