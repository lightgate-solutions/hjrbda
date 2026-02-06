/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */
"use client";

import { Archive, FolderOpen, MoreVertical, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname } from "next/navigation";
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
import { archiveFolder, deleteFolder } from "@/actions/documents/folders";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function FoldersTable({
  folders,
  department,
}: {
  folders: {
    id: number;
    name: string;
    path?: string;
    updatedAt: Date;
  }[];
  department: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border">
            <TableHead className="w-10 pl-4" />
            <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Name
            </TableHead>
            <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Modified
            </TableHead>
            <TableHead className="text-right pr-4 w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* All Documents Row */}
          <TableRow
            className="cursor-pointer transition-colors hover:bg-muted/40"
            onClick={() => router.push("/documents/all")}
          >
            <TableCell className="pl-4">
              <div className="rounded-md bg-primary/8 p-1.5 w-fit">
                <FolderOpen
                  size={16}
                  className="text-primary"
                  aria-hidden="true"
                />
              </div>
            </TableCell>
            <TableCell>
              <Link
                href="/documents/all"
                className="text-sm font-medium text-foreground hover:underline"
                aria-label="Open All Documents"
              >
                All Documents
              </Link>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">--</TableCell>
            <TableCell className="text-right pr-4" />
          </TableRow>

          {/* User Folders */}
          {folders.map((folder, idx) => {
            const folderUrl =
              pathname === "/documents"
                ? `${pathname}/f/${folder.id}`
                : `${pathname}/${folder.id}`;
            const displayName = folder.path ?? folder.name;
            const isProtected =
              folder.name === department || folder.name === "personal";

            return (
              <TableRow
                key={idx}
                className="cursor-pointer transition-colors hover:bg-muted/40"
                onClick={() => router.push(folderUrl)}
              >
                <TableCell className="pl-4">
                  <div className="rounded-md bg-primary/8 p-1.5 w-fit">
                    <FolderOpen
                      size={16}
                      className="text-primary"
                      aria-hidden="true"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Link
                    href={folderUrl}
                    className="text-sm font-medium text-foreground hover:underline capitalize"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Open ${displayName} folder`}
                  >
                    {displayName}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {folder.updatedAt.toLocaleDateString()}
                </TableCell>
                <TableCell
                  className="text-right pr-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Actions for ${displayName}`}
                      >
                        <MoreVertical size={15} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        disabled={isProtected}
                        className="cursor-pointer"
                        asChild
                      >
                        <FoldersAction
                          type="archive"
                          id={folder.id}
                          pathname={pathname}
                        />
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={isProtected}
                        className="text-destructive focus:text-destructive cursor-pointer"
                        asChild
                      >
                        <FoldersAction
                          type="delete"
                          id={folder.id}
                          pathname={pathname}
                        />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function FoldersAction({
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
        {type === "delete" ? (
          <button
            type="button"
            className="flex w-full items-center gap-2 px-2 py-1.5 text-sm cursor-pointer"
          >
            <Trash2 size={15} aria-hidden="true" />
            Delete
          </button>
        ) : (
          <button
            type="button"
            className="flex w-full items-center gap-2 px-2 py-1.5 text-sm cursor-pointer"
          >
            <Archive size={15} aria-hidden="true" />
            Archive
          </button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {type === "delete" ? "Delete folder?" : "Archive folder?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {type === "delete"
              ? "This will permanently delete the folder and all its contents. This action cannot be undone."
              : "This will archive the folder and move all its content to the archive. You can restore it later."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {type === "delete" ? (
            <AlertDialogAction
              onClick={async () => {
                const res = await deleteFolder(id, pathname);
                if (res.error) {
                  toast.error(res.error.reason);
                } else {
                  toast.success(res.success.reason);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              onClick={async () => {
                const res = await archiveFolder(id, pathname);
                if (res.error) {
                  toast.error(res.error.reason);
                } else {
                  toast.success(res.success.reason);
                }
              }}
            >
              Archive
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
