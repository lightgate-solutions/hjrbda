"use client";

import { useAllAccessibleDocuments } from "@/hooks/documents";
import DocumentsViewWrapper from "@/components/documents/documents-view-wrapper";
import { ViewToggle } from "@/components/documents/view-toggle/view-toggle";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/components/query-error";
import { ErrorBoundary } from "@/components/error-boundary";

export default function Page() {
  const searchParams = useSearchParams();
  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("pageSize");
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1;
  const pageSize = Number(pageSizeParam) > 0 ? Number(pageSizeParam) : 20;

  const {
    data: documentsData,
    isLoading,
    error,
    refetch,
  } = useAllAccessibleDocuments(page, pageSize);

  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pt-2">
          <div className="flex items-center gap-3">
            <Link
              href="/documents"
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Back to documents"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                All Documents
              </h1>
              <p className="text-sm text-muted-foreground">
                All documents you own or have access to
              </p>
            </div>
          </div>
          <ViewToggle />
        </div>

        {/* Documents */}
        {isLoading ? (
          <AllDocumentsSkeleton />
        ) : error ? (
          <QueryError
            error={error as Error}
            onRetry={() => refetch()}
            title="Failed to load documents"
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
      </div>
    </ErrorBoundary>
  );
}

function AllDocumentsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full" />
      ))}
    </div>
  );
}
