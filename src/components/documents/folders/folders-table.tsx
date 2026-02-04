/** biome-ignore-all lint/suspicious/noArrayIndexKey: <> */
"use client";

import { Archive, Folder, LogIn, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Last Modified</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            className="hover:bg-muted/50 cursor-pointer"
            onClick={() => router.push("/documents/all")}
          >
            <TableCell>
              <Folder size={24} className="text-slate-600" />
            </TableCell>
            <TableCell className="font-medium">All Documents</TableCell>
            <TableCell className="text-muted-foreground">This week</TableCell>
            <TableCell
              className="text-right"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/documents/all">
                    <LogIn size={16} className="mr-1" />
                    Enter
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="px-2">
                      <MoreVertical size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled>
                      <Archive size={16} className="mr-2" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled className="text-red-600">
                      <Trash2 size={16} className="mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
          {folders.map((folder, idx) => {
            const folderUrl =
              pathname === "/documents"
                ? `${pathname}/f/${folder.id}`
                : `${pathname}/${folder.id}`;

            return (
              <TableRow
                key={idx}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(folderUrl)}
              >
                <TableCell>
                  <Folder size={24} className="text-slate-600" />
                </TableCell>
                <TableCell className="font-medium">
                  {(folder.path ?? folder.name).charAt(0).toUpperCase() +
                    (folder.path ?? folder.name).slice(1).toUpperCase()}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {folder.updatedAt.toLocaleDateString()}
                </TableCell>
                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={folderUrl}>
                        <LogIn size={16} className="mr-1" />
                        Enter
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="px-2">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="space-y-1">
                        <DropdownMenuItem
                          disabled={
                            folder.name === department ||
                            folder.name === "personal"
                          }
                          className="hover:cursor-pointer"
                          asChild
                        >
                          <FoldersAction
                            type="archive"
                            id={folder.id}
                            pathname={pathname}
                          />
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={
                            folder.name === department ||
                            folder.name === "personal"
                          }
                          className="text-red-600 hover:cursor-pointer"
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
          <Button
            className="flex w-full gap-3 hover:cursor-pointer"
            variant="secondary"
          >
            <Trash2 className="mr-2" size={16} />
            Delete
          </Button>
        ) : (
          <Button
            variant="outline"
            className="flex w-full gap-3 hover:cursor-pointer"
          >
            <Archive className="mr-2" size={16} />
            Archive
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          {type === "delete" ? (
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              folder and remove all its data from our servers.
            </AlertDialogDescription>
          ) : (
            <AlertDialogDescription>
              This action cannot be undone. This will archive the folder and
              move all its content to the archive page.
            </AlertDialogDescription>
          )}
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
                  toast.error(res.success.reason);
                }
              }}
            >
              Continue
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              onClick={async () => {
                const res = await archiveFolder(id, pathname);
                if (res.error) {
                  toast.error(res.error.reason);
                } else {
                  toast.error(res.success.reason);
                }
              }}
            >
              Continue
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
