import Link from "next/link";
import { getUser } from "@/actions/auth/dal";
import { db } from "@/db";
import { documentFolders } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { ArrowLeft, FolderOpen, Archive } from "lucide-react";
import { ViewToggle } from "@/components/documents/view-toggle/view-toggle";
import { Button } from "@/components/ui/button";
import ArchivedDocumentsSection from "@/components/documents/archived-documents-section";

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

  const isEmpty = archivedFolders.length === 0;

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
              Archive
            </h1>
            <p className="text-sm text-muted-foreground">
              Archived folders and documents you own or have access to
            </p>
          </div>
        </div>
        <ViewToggle />
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-muted p-5 mb-5">
            <Archive
              size={28}
              className="text-muted-foreground"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>
          <h2 className="text-lg font-medium text-foreground mb-1">
            Nothing archived
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            When you archive folders or documents, they will appear here
          </p>
        </div>
      ) : (
        <>
          {/* Archived Folders */}
          {(archivedFolders.length > 0 || fTotal > 0) && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen
                    size={14}
                    className="text-muted-foreground"
                    aria-hidden="true"
                  />
                  <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Archived Folders
                  </h2>
                  {fTotal > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({fStart}
                      {"\u2013"}
                      {fEnd} of {fTotal})
                    </span>
                  )}
                </div>
              </div>

              {archivedFolders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No archived folders
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                  {archivedFolders.map((folder) => (
                    <div
                      key={folder.id}
                      className="flex flex-col rounded-xl border border-border bg-card p-4 opacity-75"
                    >
                      <div className="rounded-lg bg-muted p-2.5 w-fit mb-3">
                        <FolderOpen
                          size={20}
                          className="text-muted-foreground"
                          aria-hidden="true"
                        />
                      </div>
                      <h3 className="text-sm font-medium text-foreground truncate capitalize">
                        {folder.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Archived {folder.updatedAt.toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {fTotal > fPageSize && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs text-muted-foreground">
                    Page {fPage} of {fTotalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      asChild
                      disabled={fPage <= 1}
                    >
                      <Link
                        href={`/documents/archive?${buildQuery({ nextFPage: fPage - 1 })}`}
                        aria-disabled={fPage <= 1}
                        className={
                          fPage <= 1 ? "pointer-events-none opacity-50" : ""
                        }
                      >
                        Previous
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      asChild
                      disabled={!fHasMore}
                    >
                      <Link
                        href={`/documents/archive?${buildQuery({ nextFPage: fPage + 1 })}`}
                        aria-disabled={!fHasMore}
                        className={
                          !fHasMore ? "pointer-events-none opacity-50" : ""
                        }
                      >
                        Next
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Archived Documents */}
          <ArchivedDocumentsSection page={dPage} pageSize={dPageSize} />
        </>
      )}
    </div>
  );
}
