import { getUser } from "@/actions/auth/dal";
import FoldersActions from "@/components/documents/folders/folders-actions";
import { db } from "@/db";
import { documentFolders } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { getFoldersNames } from "@/actions/documents/folders";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string[] }>;
}) {
  const { id: foldersId } = await params;
  const user = await getUser();
  if (!user) return null;

  const currentFolderId = Number(foldersId.at(-1));

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
        eq(documentFolders.createdBy, user.id),
        eq(documentFolders.status, "active"),
        or(
          eq(documentFolders.id, currentFolderId),
          eq(documentFolders.parentId, currentFolderId),
        ),
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

  const foldersNames = await getFoldersNames(foldersId);

  const links = foldersId.map((_id, index) => {
    const href = `/documents/f/${foldersId.slice(0, index + 1).join("/")}`;
    return {
      href,
      label: foldersNames[index],
    };
  });

  return (
    <section className="flex w-full flex-col gap-6">
      <div className="w-full flex justify-between pt-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            All Documents
          </h1>
          <p className="text-muted-foreground">
            Review and manage all folders across the organization
          </p>
        </div>

        <FoldersActions usersFolders={folders} department={user.department} />
      </div>

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/documents">Main</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          {links.map((link, index) => (
            <BreadcrumbItem key={link.href}>
              {index < links.length - 1 ? (
                <>
                  <BreadcrumbLink asChild>
                    <Link href={link.href}>{link.label}</Link>
                  </BreadcrumbLink>
                  <BreadcrumbSeparator />
                </>
              ) : (
                <BreadcrumbPage>{link.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div>{children}</div>
    </section>
  );
}
