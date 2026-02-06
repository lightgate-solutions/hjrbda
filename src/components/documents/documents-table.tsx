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
  archiveDocumentAction,
  deleteDocumentAction,
  type getActiveFolderDocuments,
} from "@/actions/documents/documents";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
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

const TOTAL_COLUMNS = 7;

export default function DocumentsTable({
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
  const [openSheetDocId, setOpenSheetDocId] = useState<number | null>(null);

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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="w-10 pl-4" />
              <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Title
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                Uploaded By
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                Modified
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                Version
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                Status
              </TableHead>
              <TableHead className="text-right pr-4 w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={TOTAL_COLUMNS}
                  className="text-center text-muted-foreground py-16"
                >
                  <FileText
                    size={32}
                    className="mx-auto text-muted-foreground/50 mb-3"
                    aria-hidden="true"
                  />
                  <p className="text-sm">No documents found</p>
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => {
                const { color, bgColor } = getFileTypeInfo(doc.mimeType);
                return (
                  <TableRow
                    key={doc.id}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => setOpenSheetDocId(doc.id)}
                  >
                    <TableCell className="pl-4">
                      <div className={`rounded-md p-1.5 w-fit ${bgColor}`}>
                        <FileText
                          size={16}
                          className={color}
                          aria-hidden="true"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {doc.title.charAt(0).toUpperCase() + doc.title.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {doc.uploader}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {doc.updatedAt.toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-normal px-1.5 py-0"
                      >
                        v{doc.currentVersion}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant={
                          doc.status === "active" ? "secondary" : "destructive"
                        }
                        className="text-[10px] capitalize px-1.5 py-0"
                      >
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="text-right pr-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <DocumentSheet
                          doc={doc}
                          pathname={pathname}
                          open={openSheetDocId === doc.id}
                          onOpenChange={(open) =>
                            setOpenSheetDocId(open ? doc.id : null)
                          }
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label={`Actions for ${doc.title}`}
                            >
                              <MoreVertical size={15} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              className="cursor-pointer"
                              asChild
                            >
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
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
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
