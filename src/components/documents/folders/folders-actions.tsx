import { Dialog } from "@/components/ui/dialog";
import UploadDocumentButton from "../upload-document-button";
import CreateFolderButton from "./create-folder-button";

export default async function FoldersActions({
  usersFolders,
  department,
}: {
  usersFolders: { id: number; name: string; path?: string; updatedAt: Date }[];
  department: string;
}) {
  return (
    <div className="space-y-2">
      <Dialog>
        <UploadDocumentButton
          usersFolders={usersFolders}
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
