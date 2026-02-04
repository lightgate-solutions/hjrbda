"use client";

import { useState } from "react";
import DocumentsViewWrapper from "@/components/documents/documents-view-wrapper";
import FoldersViewWrapper from "@/components/documents/folders/folders-view-wrapper";
import { DocumentSearch } from "@/components/documents/document-search";
import { ViewToggle } from "@/components/documents/view-toggle/view-toggle";
import type { getActiveFolderDocuments } from "@/actions/documents/documents";

type DocumentType = NonNullable<
  Awaited<ReturnType<typeof getActiveFolderDocuments>>["success"]
>["docs"][number];

interface FolderContentWrapperProps {
  subFolders: {
    id: number;
    name: string;
    path?: string;
    updatedAt: Date;
  }[];
  documents: DocumentType[];
  paging?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages?: number;
    hasMore?: boolean;
  };
  department: string;
}

export default function FolderContentWrapper({
  subFolders,
  documents,
  paging,
  department,
}: FolderContentWrapperProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSubFolders = subFolders.filter((folder) =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <DocumentSearch value={searchTerm} onChange={setSearchTerm} />
        <ViewToggle />
      </div>
      <FoldersViewWrapper
        folders={filteredSubFolders}
        department={department}
      />
      <DocumentsViewWrapper documents={filteredDocuments} paging={paging} />
    </div>
  );
}
