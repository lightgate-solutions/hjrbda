"use client";

import { useArchivedDocuments } from "@/hooks/documents";
import DocumentsViewWrapper from "./documents-view-wrapper";
import { FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/query-error";

interface ArchivedDocumentsSectionProps {
  page: number;
  pageSize: number;
}

export default function ArchivedDocumentsSection({
  page,
  pageSize,
}: ArchivedDocumentsSectionProps) {
  const {
    data: documentsData,
    isLoading,
    error,
    refetch,
  } = useArchivedDocuments(page, pageSize);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText
          size={14}
          className="text-muted-foreground"
          aria-hidden="true"
        />
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Archived Documents
        </h2>
        {documentsData && documentsData.total > 0 && (
          <span className="text-xs text-muted-foreground">
            ({documentsData.total})
          </span>
        )}
      </div>

      {isLoading ? (
        <ArchivedDocumentsSkeleton />
      ) : error ? (
        <QueryError
          error={error as Error}
          onRetry={() => refetch()}
          title="Failed to load archived documents"
        />
      ) : (
        <DocumentsViewWrapper
          documents={documentsData?.docs ?? []}
          paging={{
            page: documentsData?.page ?? 1,
            pageSize: documentsData?.pageSize ?? 20,
            total: documentsData?.total ?? 0,
            totalPages: documentsData?.totalPages ?? 1,
            hasMore: documentsData?.hasMore ?? false,
          }}
        />
      )}
    </section>
  );
}

function ArchivedDocumentsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full" />
      ))}
    </div>
  );
}
