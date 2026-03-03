"use client";

import { Dialog } from "@/components/ui/dialog";
import UploadDocumentButton from "./upload-document-button";
import CreateFolderButton from "./folders/create-folder-button";

export function DocumentActionsClient({
  usersFolders,
  department,
}: {
  usersFolders: { id: number; name: string; path?: string; updatedAt: Date }[];
  department: string;
}) {
  const folderList = usersFolders.map((f) => ({
    name: f.name,
    path: f.path,
  }));

  return (
    <div className="flex items-center gap-2">
      <Dialog>
        <UploadDocumentButton
          usersFolders={folderList}
          department={department}
        />
      </Dialog>
      <Dialog>
        <CreateFolderButton
          usersFolders={usersFolders}
          department={department}
        />
      </Dialog>
    </div>
  );
}
