"use client";

import { useState } from "react";
import { Dialog } from "../ui/dialog";
import CreateFolderButton from "./folders/create-folder-button";
import FoldersViewWrapper from "./folders/folders-view-wrapper";
import UploadDocumentButton from "./upload-document-button";
import { ViewToggle } from "./view-toggle/view-toggle";
import { DocumentSearch } from "./document-search";
import Link from "next/link";
import { Archive, FileText, Search } from "lucide-react";

export function DocumentsOverview({
  usersFolders,
  department,
}: {
  usersFolders: { id: number; name: string; path?: string; updatedAt: Date }[];
  department: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredFolders = usersFolders.filter((folder) =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex w-full flex-col gap-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Documents
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage folders and documents across your organization
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Dialog>
              <UploadDocumentButton
                usersFolders={usersFolders}
                department={department}
              />
            </Dialog>

            <Dialog>
              <CreateFolderButton
                usersFolders={usersFolders}
                department={department}
              />
            </Dialog>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <DocumentSearch
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Filter folders..."
            />
          </div>

          <div className="flex items-center gap-2">
            <nav
              className="flex items-center gap-1 mr-2"
              aria-label="Quick navigation"
            >
              <Link
                href="/documents/search"
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                aria-label="Search documents"
              >
                <Search size={15} aria-hidden="true" />
                <span className="hidden md:inline">Search</span>
              </Link>
              <Link
                href="/documents/all"
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                aria-label="View all documents"
              >
                <FileText size={15} aria-hidden="true" />
                <span className="hidden md:inline">All Docs</span>
              </Link>
              <Link
                href="/documents/archive"
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                aria-label="View archived documents"
              >
                <Archive size={15} aria-hidden="true" />
                <span className="hidden md:inline">Archive</span>
              </Link>
            </nav>
            <div className="h-5 w-px bg-border" aria-hidden="true" />
            <ViewToggle />
          </div>
        </div>
      </div>

      {/* Folders Content */}
      <div>
        {filteredFolders.length === 0 && searchTerm ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Search
                size={24}
                className="text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              No folders found
            </p>
            <p className="text-sm text-muted-foreground">
              No folders match {"\u201c"}
              {searchTerm}
              {"\u201d"}
            </p>
          </div>
        ) : (
          <FoldersViewWrapper
            folders={filteredFolders}
            department={department}
          />
        )}
      </div>
    </div>
  );
}
