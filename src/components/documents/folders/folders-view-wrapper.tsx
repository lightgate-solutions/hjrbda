"use client";

import { useSearchParams } from "next/navigation";
import FoldersGrid from "./folders-grid";
import FoldersTable from "./folders-table";
import type { ViewType } from "../view-toggle/view-toggle";

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
  const searchParams = useSearchParams();
  const view = (searchParams?.get("view") as ViewType) ?? "table";

  if (view === "card") {
    return <FoldersGrid folders={folders} department={department} />;
  }

  return <FoldersTable folders={folders} department={department} />;
}
