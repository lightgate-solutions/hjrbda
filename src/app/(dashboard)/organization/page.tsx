import { getOrganization } from "@/actions/organization";
import OrganizationSettingsForm from "@/components/organization/organization-settings-form";

export default async function OrganizationPage() {
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
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Organization Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your organization's information and branding
        </p>
      </div>

      <OrganizationSettingsForm organization={organization} />
    </div>
  );
}
