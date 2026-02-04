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
import { Button } from "@/components/ui/button";
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
  trigger,
}: {
  id: number;
  pathname: string;
  type: "delete" | "archive";
  trigger?: React.ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger ??
          (type === "delete" ? (
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
          ))}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          {type === "delete" ? (
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              document and remove all its data from our servers.
            </AlertDialogDescription>
          ) : (
            <AlertDialogDescription>
              This action cannot be undone. This will archive the document and
              move it to the archive page.
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {type === "delete" ? (
            <AlertDialogAction
              onClick={async () => {
                const res = await deleteDocumentAction(id, pathname);
                if (res.error) {
                  toast.error(res.error.reason);
                } else {
                  toast.success(res.success.reason);
                }
              }}
            >
              Continue
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              onClick={async () => {
                const res = await archiveDocumentAction(id, pathname);
                if (res.error) {
                  toast.error(res.error.reason);
                } else {
                  toast.success(res.success.reason);
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
