import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/settings/settings";
import { UserProfileCard } from "@/components/settings/user-profile-card";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { Settings } from "lucide-react";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
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
      </div>
    </div>
  );
}
