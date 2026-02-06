/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */
"use client";

import { Archive, FileText, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  archiveDocumentAction,
  deleteDocumentAction,
  type getActiveFolderDocuments,
} from "@/actions/documents/documents";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { DocumentSheet } from "./document-sheet";

type DocumentType = NonNullable<
  Awaited<ReturnType<typeof getActiveFolderDocuments>>["success"]
>["docs"][number];

function getFileTypeInfo(mimeType: string | null | undefined) {
  if (!mimeType) return { color: "text-muted-foreground", bgColor: "bg-muted" };
  if (mimeType.includes("pdf"))
    return { color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" };
  if (mimeType.includes("image"))
    return {
      color: "text-violet-600",
      bgColor: "bg-violet-50 dark:bg-violet-950/30",
    };
  if (
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType.includes("msword")
  )
    return {
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    };
  if (
    mimeType.includes("sheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("csv")
  )
    return {
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    };
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return {
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
    };
  return { color: "text-muted-foreground", bgColor: "bg-muted" };
}

export default function DocumentsGrid({
  documents,
  paging,
}: {
  documents: DocumentType[];
  paging?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages?: number;
    hasMore?: boolean;
  };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = paging?.page ?? Number(searchParams?.get("page") ?? 1);
  const pageSize =
    paging?.pageSize ?? Number(searchParams?.get("pageSize") ?? 20);
  const total = paging?.total;
  const totalPages =
    paging?.totalPages ??
    (total !== undefined
      ? Math.max(1, Math.ceil(total / pageSize))
      : undefined);
  const hasMore = paging?.hasMore ?? (totalPages ? page < totalPages : false);
  const start = total !== undefined ? (page - 1) * pageSize + 1 : undefined;
  const end =
    total !== undefined ? Math.min(page * pageSize, total) : undefined;

  function goToPage(p: number) {
    if (p < 1) return;
    if (totalPages && p > totalPages) return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", String(p));
    params.set("pageSize", String(pageSize));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText
          size={32}
          className="text-muted-foreground/50 mb-3"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">No documents found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        {documents.map((doc) => {
          const { color, bgColor } = getFileTypeInfo(doc.mimeType);

          return (
            <div
              key={doc.id}
              className="group relative flex flex-col rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-md"
            >
              {/* File Icon & Actions */}
              <div className="flex items-start justify-between mb-3">
                <div className={`rounded-lg p-2.5 ${bgColor}`}>
                  <FileText
                    size={20}
                    className={`${color} transition-transform duration-200 group-hover:scale-105`}
                    aria-hidden="true"
                  />
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <DocumentSheet
                    doc={doc}
                    pathname={pathname}
                    trigger={
                      <button
                        type="button"
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`View ${doc.title}`}
                      >
                        <FileText size={14} />
                      </button>
                    }
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Actions for ${doc.title}`}
                      >
                        <MoreVertical size={14} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem className="cursor-pointer" asChild>
                        <DocumentsActions
                          type="archive"
                          id={doc.id}
                          pathname={pathname}
                        />
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive cursor-pointer"
                        asChild
                      >
                        <DocumentsActions
                          type="delete"
                          id={doc.id}
                          pathname={pathname}
                        />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Document Info */}
              <div className="mt-auto space-y-2">
                <h3 className="text-sm font-medium text-foreground truncate">
                  {doc.title.charAt(0).toUpperCase() + doc.title.slice(1)}
                </h3>
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-normal px-1.5 py-0"
                  >
                    v{doc.currentVersion}
                  </Badge>
                  <Badge
                    variant={
                      doc.status === "active" ? "secondary" : "destructive"
                    }
                    className="text-[10px] capitalize px-1.5 py-0"
                  >
                    {doc.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {doc.uploader} · {doc.updatedAt.toLocaleDateString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {paging && total !== undefined && total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            {start !== undefined && end !== undefined
              ? `${start}\u2013${end} of ${total}`
              : null}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="h-8"
            >
              Previous
            </Button>
            {totalPages && (
              <span className="px-2 text-xs text-muted-foreground">
                {page} / {totalPages}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={!hasMore}
              className="h-8"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentsActions({
  id,
  pathname,
  type,
}: {
  id: number;
  pathname: string;
  type: "delete" | "archive";
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 px-2 py-1.5 text-sm cursor-pointer"
        >
          {type === "delete" ? (
            <Trash2 size={15} aria-hidden="true" />
          ) : (
            <Archive size={15} aria-hidden="true" />
          )}
          {type === "delete" ? "Delete" : "Archive"}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {type === "delete" ? "Delete document?" : "Archive document?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {type === "delete"
              ? "This will permanently delete the document and all its data. This action cannot be undone."
              : "This will archive the document and move it to the archive. You can restore it later."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              const action =
                type === "delete"
                  ? deleteDocumentAction
                  : archiveDocumentAction;
              const res = await action(id, pathname);
              if (res.error) {
                toast.error(res.error.reason);
              } else {
                toast.success(res.success.reason);
              }
            }}
            className={
              type === "delete"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {type === "delete" ? "Delete" : "Archive"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
