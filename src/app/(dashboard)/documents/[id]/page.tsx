import { getUser } from "@/actions/auth/dal";
import { getMyDocumentAccess } from "@/actions/documents/documents";
import SingleDocumentPage from "@/components/documents/single-document-page";
import { db } from "@/db";
import {
  document,
  documentAccess,
  documentFolders,
  documentTags,
  documentVersions,
  employees,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const documentId = Number(id);

  const user = await getUser();
  if (!user) {
    return (
      <div className="h-screen flex justify-center items-center">
        please sign in to continue
      </div>
    );
  }

  const accessLevel = await getMyDocumentAccess(documentId);
  if (accessLevel.error) return null;

  if (accessLevel.success.level === "none") {
    return (
      <div className="h-screen flex justify-center items-center">
        User doesnt have permission to view this document
      </div>
    );
  }

  const doc = await db
    .select({
      id: document.id,
      title: document.title,
      description: document.description,
      public: document.public,
      departmental: document.departmental,
      department: document.department,
      status: document.status,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      currentVersion: document.currentVersion,
      uploader: employees.name,
      uploaderId: employees.id,
      uploaderEmail: employees.email,
      folderName: documentFolders.name,
      fileSize: documentVersions.fileSize,
      filePath: documentVersions.filePath,
      mimeType: documentVersions.mimeType,
      loggedUser: sql`${user.id}`,
    })
    .from(document)
    .leftJoin(employees, eq(document.uploadedBy, employees.id))
    .leftJoin(documentFolders, eq(document.folderId, documentFolders.id))
    .leftJoin(
      documentVersions,
      eq(documentVersions.id, document.currentVersionId),
    )
    .where(and(eq(document.status, "active"), eq(document.id, documentId)))
    .limit(1);

  const baseDoc = doc[0];
  if (!baseDoc) return <div>Document not found</div>;

  const [tags, accessRules] = await Promise.all([
    db
      .select({
        documentId: documentTags.documentId,
        tag: documentTags.tag,
      })
      .from(documentTags)
      .where(eq(documentTags.documentId, documentId)),

    db
      .select({
        documentId: documentAccess.documentId,
        accessLevel: documentAccess.accessLevel,
        userId: documentAccess.userId,
        name: employees.name,
        email: employees.email,
        department: documentAccess.department,
      })
      .from(documentAccess)
      .where(eq(documentAccess.documentId, documentId))
      .leftJoin(employees, eq(documentAccess.userId, employees.id)),
  ]);

  const enrichedDocs = {
    ...baseDoc,
    tags: tags.filter((t) => t.documentId === documentId).map((t) => t.tag),
    accessRules: accessRules
      .filter((a) => a.documentId === documentId)
      .map((a) => ({
        accessLevel: a.accessLevel,
        userId: a.userId,
        name: a.name,
        email: a.email,
        department: a.department,
      })),
  };

  return (
    <div>
      <SingleDocumentPage doc={enrichedDocs} />
    </div>
  );
}
