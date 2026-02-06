"use client";

import { useState } from "react";
import DocumentsViewWrapper from "@/components/documents/documents-view-wrapper";
import FoldersViewWrapper from "@/components/documents/folders/folders-view-wrapper";
import { DocumentSearch } from "@/components/documents/document-search";
import { ViewToggle } from "@/components/documents/view-toggle/view-toggle";
import { FileText, FolderOpen, Search } from "lucide-react";
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

  const hasContent =
    filteredSubFolders.length > 0 || filteredDocuments.length > 0;
  const noResults = searchTerm && !hasContent;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <DocumentSearch value={searchTerm} onChange={setSearchTerm} />
        <ViewToggle />
      </div>

      {noResults ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Search
              size={24}
              className="text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No results</p>
          <p className="text-sm text-muted-foreground">
            Nothing matches {"\u201c"}
            {searchTerm}
            {"\u201d"}
          </p>
        </div>
      ) : (
        <>
          {/* Subfolders */}
          {filteredSubFolders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FolderOpen
                  size={14}
                  className="text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Folders
                </h3>
                <span className="text-xs text-muted-foreground">
                  ({filteredSubFolders.length})
                </span>
              </div>
              <FoldersViewWrapper
                folders={filteredSubFolders}
                department={department}
              />
            </div>
          )}

          {/* Documents */}
          {(filteredDocuments.length > 0 || paging) && (
            <div className="space-y-3">
              {filteredSubFolders.length > 0 && (
                <div className="flex items-center gap-2">
                  <FileText
                    size={14}
                    className="text-muted-foreground"
                    aria-hidden="true"
                  />
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Documents
                  </h3>
                  {paging && (
                    <span className="text-xs text-muted-foreground">
                      ({paging.total})
                    </span>
                  )}
                </div>
              )}
              <DocumentsViewWrapper
                documents={filteredDocuments}
                paging={paging}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
