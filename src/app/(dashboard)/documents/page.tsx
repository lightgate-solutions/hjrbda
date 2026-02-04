import { getUser } from "@/actions/auth/dal";
import { db } from "@/db";
import { documentFolders } from "@/db/schema";
import { DocumentsOverview } from "@/components/documents/documents-overview-page";
import { and, eq, or } from "drizzle-orm";

export default async function Page() {
  const user = await getUser();
  if (!user) return null;

  const foldersRaw = await db
    .select({
      id: documentFolders.id,
      name: documentFolders.name,
      parentId: documentFolders.parentId,
      updatedAt: documentFolders.updatedAt,
    })
    .from(documentFolders)
    .where(
      and(
        or(
          eq(documentFolders.createdBy, user.id),
          eq(documentFolders.public, true),
          and(
            eq(documentFolders.departmental, true),
            eq(documentFolders.department, user.department),
          ),
        ),
        eq(documentFolders.root, true),
        eq(documentFolders.status, "active"),
      ),
    );

  const byId = new Map(foldersRaw.map((f) => [f.id, f]));
  const getPath = (folder: {
    id: number;
    name: string;
    parentId: number | null;
  }) => {
    const parts: string[] = [];
    let current:
      | { id: number; name: string; parentId: number | null }
      | undefined = folder;
    const seen = new Set<number>();
    while (current) {
      if (seen.has(current.id)) break;
      seen.add(current.id);
      parts.push(current.name);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return parts.reverse().join("/");
  };

  const folders = foldersRaw.map((f) => ({
    id: f.id,
    name: f.name,
    path: getPath(f),
    updatedAt: f.updatedAt,
  }));
  return (
    <DocumentsOverview usersFolders={folders} department={user.department} />
  );
}
