import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/settings/settings";
import { UserProfileCard } from "@/components/settings/user-profile-card";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { Settings } from "lucide-react";
import { getOrganization } from "@/actions/organization";
import OrganizationSettingsForm from "@/components/organization/organization-settings-form";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { success: organization, error } = await getOrganization();

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error.reason}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        <UserProfileCard user={user} />
        <ChangePasswordForm />
        <OrganizationSettingsForm organization={organization} />
      </div>
    </div>
  );
}
