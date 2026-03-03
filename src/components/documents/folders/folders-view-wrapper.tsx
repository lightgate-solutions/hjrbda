"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import FoldersGrid from "./folders-grid";
import FoldersTable from "./folders-table";
import type { ViewType } from "../view-toggle/view-toggle";
import { Skeleton } from "@/components/ui/skeleton";

export default function FoldersViewWrapper({
  folders,
  department,
}: {
  folders: {
    id: number;
    name: string;
    path?: string;
    updatedAt: Date;
  }[];
  department: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const searchParams = useSearchParams();
  const view = (searchParams?.get("view") as ViewType) ?? "table";

  if (!mounted) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden p-6 space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (view === "card") {
    return <FoldersGrid folders={folders} department={department} />;
  }

  return <FoldersTable folders={folders} department={department} />;
}
