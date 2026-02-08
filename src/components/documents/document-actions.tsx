"use client";

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
import { Trash2, Archive } from "lucide-react";
import { toast } from "sonner";
import {
  deleteDocumentAction,
  archiveDocumentAction,
} from "@/actions/documents/documents";

export function DocumentsActions({
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
