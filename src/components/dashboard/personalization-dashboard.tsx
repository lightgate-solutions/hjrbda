"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useTheme } from "next-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSuccess, FormError } from "@/components/ui/form-messages";
import { User, Palette, Layout, Bell, Save } from "lucide-react";
import type { User as EmployeeUser } from "@/types/user";

interface UserPreferences {
  id?: number;
  userId?: number;
  theme?: "light" | "dark" | "system";
  language?: "en" | "fr" | "es" | "de";
  dateFormat?: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD" | "DD MMM YYYY";
  timezone?: string;
  sidebarCollapsed?: string;
  defaultView?: string;
  itemsPerPage?: string;
  profileVisibility?: "public" | "private" | "team";
  emailDigest?: "never" | "daily" | "weekly";
  compactMode?: string;
}

interface PersonalizationDashboardProps {
  user: EmployeeUser;
  initialPreferences: UserPreferences | null;
}

export function PersonalizationDashboard({
  user,
  initialPreferences,
}: PersonalizationDashboardProps) {
  const { setTheme: setNextTheme } = useTheme();

  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: initialPreferences?.theme || "system",
    language: initialPreferences?.language || "en",
    dateFormat: initialPreferences?.dateFormat || "MM/DD/YYYY",
    timezone: initialPreferences?.timezone || "UTC",
    sidebarCollapsed: initialPreferences?.sidebarCollapsed || "false",
    defaultView: initialPreferences?.defaultView || "dashboard",
    itemsPerPage: initialPreferences?.itemsPerPage || "10",
    profileVisibility: initialPreferences?.profileVisibility || "private",
    emailDigest: initialPreferences?.emailDigest || "daily",
    compactMode: initialPreferences?.compactMode || "false",
  });

  const [profile, setProfile] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || "",
  });

  const [formState, setFormState] = useState<{
    success?: string;
    error?: string;
  }>({});

  const [loading, setLoading] = useState(false);

  // Sync theme changes with next-themes
  useEffect(() => {
    if (preferences.theme) {
      setNextTheme(preferences.theme);
    }
  }, [preferences.theme, setNextTheme]);

  const handleSavePreferences = async () => {
    setLoading(true);
    setFormState({});

    try {
      const response = await axios.post("/api/user-preferences", preferences, {
        withCredentials: true,
      });

      if (response.data.success) {
        setFormState({
          success: "Preferences saved successfully",
        });
        // Sync theme immediately after saving
        if (preferences.theme) {
          setNextTheme(preferences.theme);
        }
      } else {
        setFormState({
          error: response.data?.message || "Failed to save preferences",
        });
      }
    } catch {
      setFormState({
        error: "Network error: unable to save preferences",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Personalization</h1>
        <p className="text-muted-foreground">
          Customize your dashboard experience and preferences
        </p>
      </div>

      <FormSuccess message={formState.success || ""} />
      <FormError message={formState.error || ""} />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="size-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="display" className="flex items-center gap-2">
            <Palette className="size-4" />
            Display
          </TabsTrigger>
          <TabsTrigger value="layout" className="flex items-center gap-2">
            <Layout className="size-4" />
            Layout
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2"
          >
            <Bell className="size-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and profile settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProfile({ ...profile, name: e.target.value })
                  }
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Contact your administrator to change your name
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProfile({ ...profile, email: e.target.value })
                  }
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Contact your administrator to change your email
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProfile({ ...profile, phone: e.target.value })
                  }
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profileVisibility">Profile Visibility</Label>
                <Select
                  value={preferences.profileVisibility}
                  onValueChange={(value: "public" | "private" | "team") =>
                    setPreferences({ ...preferences, profileVisibility: value })
                  }
                >
                  <SelectTrigger id="profileVisibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="team">Team Only</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Control who can see your profile information
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="display" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Display & Theme</CardTitle>
              <CardDescription>
                Customize the appearance and regional settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={preferences.theme}
                  onValueChange={(value: "light" | "dark" | "system") =>
                    setPreferences({ ...preferences, theme: value })
                  }
                >
                  <SelectTrigger id="theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose your preferred color theme
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={preferences.language}
                  onValueChange={(value: "en" | "fr" | "es" | "de") =>
                    setPreferences({ ...preferences, language: value })
                  }
                >
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select
                  value={preferences.dateFormat}
                  onValueChange={(
                    value:
                      | "MM/DD/YYYY"
                      | "DD/MM/YYYY"
                      | "YYYY-MM-DD"
                      | "DD MMM YYYY",
                  ) => setPreferences({ ...preferences, dateFormat: value })}
                >
                  <SelectTrigger id="dateFormat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    <SelectItem value="DD MMM YYYY">DD MMM YYYY</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={preferences.timezone}
                  onValueChange={(value: string) =>
                    setPreferences({ ...preferences, timezone: value })
                  }
                >
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">
                      Eastern Time (ET)
                    </SelectItem>
                    <SelectItem value="America/Chicago">
                      Central Time (CT)
                    </SelectItem>
                    <SelectItem value="America/Denver">
                      Mountain Time (MT)
                    </SelectItem>
                    <SelectItem value="America/Los_Angeles">
                      Pacific Time (PT)
                    </SelectItem>
                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                    <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                    <SelectItem value="Africa/Lagos">Lagos (WAT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="compactMode">Compact Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Use a more compact layout with less spacing
                  </p>
                </div>
                <Switch
                  id="compactMode"
                  checked={preferences.compactMode === "true"}
                  onCheckedChange={(checked: boolean) =>
                    setPreferences({
                      ...preferences,
                      compactMode: checked ? "true" : "false",
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Layout</CardTitle>
              <CardDescription>
                Customize your dashboard layout and default views
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultView">Default View</Label>
                <Select
                  value={preferences.defaultView}
                  onValueChange={(value: string) =>
                    setPreferences({ ...preferences, defaultView: value })
                  }
                >
                  <SelectTrigger id="defaultView">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dashboard">Dashboard</SelectItem>
                    <SelectItem value="documents">Documents</SelectItem>
                    <SelectItem value="tasks">Tasks</SelectItem>
                    <SelectItem value="projects">Projects</SelectItem>
                    <SelectItem value="mail">Mail</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose the default page when you log in
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemsPerPage">Items Per Page</Label>
                <Select
                  value={preferences.itemsPerPage}
                  onValueChange={(value: string) =>
                    setPreferences({ ...preferences, itemsPerPage: value })
                  }
                >
                  <SelectTrigger id="itemsPerPage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Number of items to show per page in tables and lists
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sidebarCollapsed">
                    Sidebar Collapsed by Default
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Start with the sidebar collapsed
                  </p>
                </div>
                <Switch
                  id="sidebarCollapsed"
                  checked={preferences.sidebarCollapsed === "true"}
                  onCheckedChange={(checked: boolean) =>
                    setPreferences({
                      ...preferences,
                      sidebarCollapsed: checked ? "true" : "false",
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Manage how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emailDigest">Email Digest</Label>
                <Select
                  value={preferences.emailDigest}
                  onValueChange={(value: "never" | "daily" | "weekly") =>
                    setPreferences({ ...preferences, emailDigest: value })
                  }
                >
                  <SelectTrigger id="emailDigest">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose how often you want to receive email digests
                </p>
              </div>

              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  For more detailed notification settings, visit the{" "}
                  <a
                    href="/notification-preferences"
                    className="text-primary underline hover:no-underline"
                  >
                    Notification Preferences
                  </a>{" "}
                  page.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4">
        <Button
          onClick={handleSavePreferences}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Save className="size-4" />
          {loading ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}
