"use server";
import "server-only";
import { db } from "@/db";
import { userPreferences } from "@/db/schema/user-preferences";
import { getUser } from "@/actions/auth/dal";
import { eq } from "drizzle-orm";

type Timezone =
  | "UTC"
  | "America/New_York"
  | "America/Chicago"
  | "America/Denver"
  | "America/Los_Angeles"
  | "Europe/London"
  | "Europe/Paris"
  | "Asia/Tokyo"
  | "Asia/Dubai"
  | "Africa/Lagos";

export interface UserPreferencesData {
  theme?: "light" | "dark" | "system";
  language?: "en" | "fr" | "es" | "de";
  dateFormat?: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD" | "DD MMM YYYY";
  timezone?: Timezone;
  sidebarCollapsed?: string;
  defaultView?: string;
  itemsPerPage?: string;
  profileVisibility?: "public" | "private" | "team";
  emailDigest?: "never" | "daily" | "weekly";
  compactMode?: string;
}

export async function getUserPreferences() {
  try {
    const user = await getUser();
    if (!user) {
      return null;
    }

    const preferences = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, user.id))
      .limit(1);

    return preferences[0] || null;
  } catch {
    // If table doesn't exist or any other error, return null
    // This allows the app to continue working even if preferences table hasn't been created yet
    return null;
  }
}

export async function updateUserPreferences(
  data: Partial<UserPreferencesData>,
) {
  const user = await getUser();
  if (!user) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    const existingPrefs = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, user.id))
      .limit(1);

    // Validate and filter data to match schema types
    const validTimezone: Timezone[] = [
      "UTC",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "Europe/London",
      "Europe/Paris",
      "Asia/Tokyo",
      "Asia/Dubai",
      "Africa/Lagos",
    ];

    const validatedData: Partial<{
      theme: "light" | "dark" | "system";
      language: "en" | "fr" | "es" | "de";
      dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD" | "DD MMM YYYY";
      timezone: Timezone;
      sidebarCollapsed: string;
      defaultView: string;
      itemsPerPage: string;
      profileVisibility: string;
      emailDigest: string;
      compactMode: string;
    }> = {};

    if (data.theme) validatedData.theme = data.theme;
    if (data.language) validatedData.language = data.language;
    if (data.dateFormat) validatedData.dateFormat = data.dateFormat;
    if (data.timezone && validTimezone.includes(data.timezone as Timezone)) {
      validatedData.timezone = data.timezone as Timezone;
    }
    if (data.sidebarCollapsed !== undefined)
      validatedData.sidebarCollapsed = data.sidebarCollapsed;
    if (data.defaultView !== undefined)
      validatedData.defaultView = data.defaultView;
    if (data.itemsPerPage !== undefined)
      validatedData.itemsPerPage = data.itemsPerPage;
    if (data.profileVisibility !== undefined)
      validatedData.profileVisibility = data.profileVisibility;
    if (data.emailDigest !== undefined)
      validatedData.emailDigest = data.emailDigest;
    if (data.compactMode !== undefined)
      validatedData.compactMode = data.compactMode;

    if (existingPrefs.length > 0) {
      await db
        .update(userPreferences)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, user.id));
    } else {
      await db.insert(userPreferences).values({
        userId: user.id,
        ...validatedData,
      });
    }

    return {
      success: true,
      message: "Preferences updated successfully",
    };
  } catch {
    return {
      success: false,
      error: "Failed to update preferences",
    };
  }
}
