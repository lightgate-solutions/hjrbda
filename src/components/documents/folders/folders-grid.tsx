/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */
"use client";

import { Archive, FolderOpen, LogIn, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
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

export default function FoldersGrid({
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
      {/* All Documents Folder */}
      <Link
        href="/documents/all"
        className="group relative flex flex-col rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open All Documents folder"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="rounded-lg bg-primary/8 p-2.5 transition-colors group-hover:bg-primary/12">
            <FolderOpen
              size={22}
              className="text-primary transition-transform duration-200 group-hover:scale-105"
              aria-hidden="true"
            />
          </div>
        </div>
        <div className="mt-auto">
          <h3 className="font-medium text-sm text-foreground mb-0.5 truncate">
            All Documents
          </h3>
          <p className="text-xs text-muted-foreground">View all files</p>
        </div>
      </Link>

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
          <div
            key={idx}
            className="group relative flex flex-col rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-md"
          >
            <div className="flex items-start justify-between mb-3">
              <Link
                href={folderUrl}
                className="rounded-lg bg-primary/8 p-2.5 transition-colors group-hover:bg-primary/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Open ${displayName} folder`}
              >
                <FolderOpen
                  size={22}
                  className="text-primary transition-transform duration-200 group-hover:scale-105"
                  aria-hidden="true"
                />
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-md p-1 text-muted-foreground opacity-0 transition-all duration-150 hover:bg-muted hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Actions for ${displayName}`}
                  >
                    <MoreVertical size={16} />
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
            </div>

            <Link
              href={folderUrl}
              className="mt-auto block focus-visible:outline-none"
            >
              <h3 className="font-medium text-sm text-foreground mb-0.5 truncate capitalize">
                {displayName}
              </h3>
              <p className="text-xs text-muted-foreground">
                {folder.updatedAt.toLocaleDateString()}
              </p>
            </Link>
          </div>
        );
      })}
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
