import Link from "next/link";
import { getUser } from "@/actions/auth/dal";
import { getMyArchivedDocuments } from "@/actions/documents/documents";
import DocumentsViewWrapper from "@/components/documents/documents-view-wrapper";
import { db } from "@/db";
import { documentFolders } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { Folder } from "lucide-react";
import { ViewToggle } from "@/components/documents/view-toggle/view-toggle";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const dPageParam = Array.isArray(sp?.dPage) ? sp?.dPage[0] : sp?.dPage;
  const dPageSizeParam = Array.isArray(sp?.dPageSize)
    ? sp?.dPageSize[0]
    : sp?.dPageSize;
  const dPage = Number(dPageParam) > 0 ? Number(dPageParam) : 1;
  const dPageSize = Number(dPageSizeParam) > 0 ? Number(dPageSizeParam) : 20;

  const fPageParam = Array.isArray(sp?.fPage) ? sp?.fPage[0] : sp?.fPage;
  const fPageSizeParam = Array.isArray(sp?.fPageSize)
    ? sp?.fPageSize[0]
    : sp?.fPageSize;
  const fPage = Number(fPageParam) > 0 ? Number(fPageParam) : 1;
  const fPageSize = Number(fPageSizeParam) > 0 ? Number(fPageSizeParam) : 12;

  const user = await getUser();
  if (!user) return null;

  const fOffset = Math.max(0, (fPage - 1) * fPageSize);

  const [{ total: foldersTotal }] = await db
    .select({
      total: sql<number>`count(*)`,
    })
    .from(documentFolders)
    .where(
      and(
        eq(documentFolders.status, "archived"),
        eq(documentFolders.createdBy, user.id),
      ),
    );

  const archivedFolders = await db
    .select({
      id: documentFolders.id,
      name: documentFolders.name,
      updatedAt: documentFolders.updatedAt,
    })
    .from(documentFolders)
    .where(
      and(
        eq(documentFolders.status, "archived"),
        eq(documentFolders.createdBy, user.id),
      ),
    )
    .orderBy(sql`${documentFolders.updatedAt} DESC`)
    .limit(fPageSize)
    .offset(fOffset);

  const fTotal = Number(foldersTotal ?? 0);
  const fTotalPages = Math.max(1, Math.ceil(fTotal / fPageSize));
  const fHasMore = fPage < fTotalPages;
  const fStart = fTotal > 0 ? (fPage - 1) * fPageSize + 1 : 0;
  const fEnd = fTotal > 0 ? Math.min(fPage * fPageSize, fTotal) : 0;

  const documents = await getMyArchivedDocuments(dPage, dPageSize);
  if (documents.error) return null;

  const buildQuery = ({
    nextFPage,
    nextDPage,
  }: {
    nextFPage?: number;
    nextDPage?: number;
  }) => {
    const params = new URLSearchParams();
    params.set("fPage", String(nextFPage ?? fPage));
    params.set("fPageSize", String(fPageSize));
    params.set("dPage", String(nextDPage ?? dPage));
    params.set("dPageSize", String(dPageSize));
    return params.toString();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold">Archive</h1>
            <p className="text-sm text-muted-foreground">
              View archived folders you created and archived documents you own
              or have access to.
            </p>
          </div>
        </div>
        <ViewToggle />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Archived Folders</h2>
          <div className="text-xs text-muted-foreground">
            {fTotal > 0
              ? `Showing ${fStart}-${fEnd} of ${fTotal}`
              : "No archived folders"}
          </div>
        </div>

        {archivedFolders.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No archived folders found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {archivedFolders.map((folder) => (
              <div
                key={folder.id}
                className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="h-24 flex items-center justify-center">
                  <Folder size={56} className="text-slate-600" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-foreground mb-1 truncate">
                    {folder.name.charAt(0).toUpperCase() + folder.name.slice(1)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Last Modified: {folder.updatedAt.toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {fTotal > 0 && (
          <div className="flex items-center justify-between">
            <Link
              className={`text-sm px-3 py-2 rounded border ${
                fPage <= 1
                  ? "pointer-events-none opacity-50"
                  : "hover:bg-accent"
              }`}
              href={`/documents/archive?${buildQuery({ nextFPage: fPage - 1 })}`}
              aria-disabled={fPage <= 1}
            >
              Previous
            </Link>
            <span className="text-xs text-muted-foreground">
              Page {fPage} of {fTotalPages}
            </span>
            <Link
              className={`text-sm px-3 py-2 rounded border ${
                !fHasMore ? "pointer-events-none opacity-50" : "hover:bg-accent"
              }`}
              href={`/documents/archive?${buildQuery({ nextFPage: fPage + 1 })}`}
              aria-disabled={!fHasMore}
            >
              Next
            </Link>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Archived Documents</h2>
          <div className="text-xs text-muted-foreground">
            {documents.success.total > 0
              ? `Showing ${(documents.success.page - 1) * documents.success.pageSize + 1}-${Math.min(
                  documents.success.page * documents.success.pageSize,
                  documents.success.total,
                )} of ${documents.success.total}`
              : "No archived documents"}
          </div>
        </div>

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
      </section>
    </div>
  );
}
