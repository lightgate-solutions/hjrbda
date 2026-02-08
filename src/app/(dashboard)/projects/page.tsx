"use client";

import { ProjectsTable } from "@/components/projects/projects-table";
import { ProjectsCards } from "@/components/projects/projects-cards";
import { BackButton } from "@/components/ui/back-button";

export default function ProjectsPage() {
  return (
    <div className="p-2 space-y-4">
      <div className="flex items-center justify-between">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            View and manage all projects
          </p>
        </div>
      </div>
      <div className="mb-4">
        <ProjectsCards />
      </div>
      <ProjectsTable />
    </div>
  );
}
