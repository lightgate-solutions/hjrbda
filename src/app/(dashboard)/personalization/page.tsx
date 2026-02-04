import { getUser } from "@/actions/auth/dal";
import { getUserPreferences } from "@/actions/user-preferences/preferences";
import { PersonalizationDashboard } from "@/components/dashboard/personalization-dashboard";

type UserPreferences = {
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
};

export default async function PersonalizationPage() {
  const user = await getUser();

  if (!user) {
    return null;
  }

  // Gracefully handle if preferences table doesn't exist
  let preferences: UserPreferences | null = null;
  try {
    const rawPreferences = await getUserPreferences();
    // Convert null values to undefined to match component's expected type
    if (rawPreferences) {
      const validProfileVisibility = ["public", "private", "team"].includes(
        rawPreferences.profileVisibility || "",
      )
        ? (rawPreferences.profileVisibility as "public" | "private" | "team")
        : undefined;

      const validEmailDigest = ["never", "daily", "weekly"].includes(
        rawPreferences.emailDigest || "",
      )
        ? (rawPreferences.emailDigest as "never" | "daily" | "weekly")
        : undefined;

      preferences = {
        id: rawPreferences.id,
        userId: rawPreferences.userId,
        theme: rawPreferences.theme ?? undefined,
        language: rawPreferences.language ?? undefined,
        dateFormat: rawPreferences.dateFormat ?? undefined,
        timezone: rawPreferences.timezone ?? undefined,
        sidebarCollapsed: rawPreferences.sidebarCollapsed ?? undefined,
        defaultView: rawPreferences.defaultView ?? undefined,
        itemsPerPage: rawPreferences.itemsPerPage ?? undefined,
        profileVisibility: validProfileVisibility,
        emailDigest: validEmailDigest,
        compactMode: rawPreferences.compactMode ?? undefined,
      } as UserPreferences;
    }
  } catch {
    // Continue with null preferences - component will handle defaults
  }

  return (
    <PersonalizationDashboard user={user} initialPreferences={preferences} />
  );
}
