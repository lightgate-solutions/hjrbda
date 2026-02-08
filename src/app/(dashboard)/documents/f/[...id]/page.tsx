import { getUser } from "@/actions/auth/dal";
import FolderPageClient from "./folder-page-client";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string[] }>;
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const { id: foldersId } = await params;
  const sp = await searchParams;
  const user = await getUser();
  if (!user) return null;

  const currentFolderId = Number(foldersId.at(-1));
  const page = Number(sp.page) > 0 ? Number(sp.page) : 1;
  const pageSize = Number(sp.pageSize) > 0 ? Number(sp.pageSize) : 20;

  return (
    <FolderPageClient
      folderId={currentFolderId}
      department={user.department}
      page={page}
      pageSize={pageSize}
    />
  );
}
