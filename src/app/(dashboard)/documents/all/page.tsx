import { getUser } from "@/actions/auth/dal";
import { getAllAccessibleDocuments } from "@/actions/documents/documents";
import DocumentsViewWrapper from "@/components/documents/documents-view-wrapper";
import { ViewToggle } from "@/components/documents/view-toggle/view-toggle";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pageParam = Array.isArray(sp?.page) ? sp?.page[0] : sp?.page;
  const pageSizeParam = Array.isArray(sp?.pageSize)
    ? sp?.pageSize[0]
    : sp?.pageSize;
  const page = Number(pageParam) > 0 ? Number(pageParam) : 1;
  const pageSize = Number(pageSizeParam) > 0 ? Number(pageSizeParam) : 20;

  const user = await getUser();
  if (!user) return null;

  const documents = await getAllAccessibleDocuments(page, pageSize);
  if (documents.error) return null;

  return (
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
      <DocumentsViewWrapper
        documents={documents.success.docs}
        paging={{
          page: documents.success.page,
          pageSize: documents.success.pageSize,
          total: documents.success.total,
          totalPages: documents.success.totalPages,
          hasMore: documents.success.hasMore,
        }}
      />
    </div>
  );
}
