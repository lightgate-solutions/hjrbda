import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ExportCenter } from "@/components/logs/export-center";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Export Center | Logs",
  description: "Export system data in PDF or CSV format",
};

export default async function LogsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth/login");
  }

  const userRole = session.user.role?.toLowerCase().trim();
  if (userRole !== "admin") {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Data Export Center
        </h1>
        <p className="text-muted-foreground">
          Export system data for audit, reporting, and analysis purposes.
        </p>
      </div>
      <ExportCenter />
    </div>
  );
}
