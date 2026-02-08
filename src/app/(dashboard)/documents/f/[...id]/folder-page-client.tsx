/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */
"use client";

import { useActiveFolderDocuments, useSubFolders } from "@/hooks/documents";
import FolderContentWrapper from "@/components/documents/folder-content-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function FolderPageClient({
  folderId,
  department,
  page,
  pageSize,
}: {
  folderId: number;
  department: string;
  page: number;
  pageSize: number;
}) {
  const { data: subFolders = [], isLoading: foldersLoading } =
    useSubFolders(folderId);
  const {
    data: documentsData,
    isLoading: documentsLoading,
    error,
  } = useActiveFolderDocuments(folderId, page, pageSize);

  if (error) return null;

  const isLoading = foldersLoading || documentsLoading;

  return (
    <div className="space-y-6">
      {isLoading ? (
        <FolderPageSkeleton />
      ) : (
        <FolderContentWrapper
          subFolders={subFolders}
          documents={documentsData?.docs ?? []}
          paging={{
            page: documentsData?.page ?? 1,
            pageSize: documentsData?.pageSize ?? 20,
            total: documentsData?.total ?? 0,
            totalPages: documentsData?.totalPages ?? 1,
            hasMore: documentsData?.hasMore ?? false,
          }}
          department={department}
        />
      )}
    </div>
  );
}

function FolderPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}
