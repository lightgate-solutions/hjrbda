/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

import { db } from "@/db";
import { documentTags, documentAccess, employees } from "@/db/schema";
import { inArray, eq } from "drizzle-orm";

interface DocumentWithRelations {
  id: number;
  [key: string]: any;
}

interface EnrichedDocument extends DocumentWithRelations {
  tags: string[];
  accessRules: {
    accessLevel: string;
    userId: number | null;
    name: string | null;
    email: string | null;
    department: string | null;
  }[];
}

/**
 * Enriches documents with tags and access rules
 * Returns empty arrays if no documents are provided
 */
export async function enrichDocumentsWithTagsAndAccess(
  documents: DocumentWithRelations[],
): Promise<EnrichedDocument[]> {
  // Early return for empty documents list
  if (documents.length === 0) {
    return [];
  }

  const docIds = documents.map((d) => d.id);

  // Fetch tags and access rules in parallel
  const [tags, accessRules] = await Promise.all([
    db
      .select({
        documentId: documentTags.documentId,
        tag: documentTags.tag,
      })
      .from(documentTags)
      .where(inArray(documentTags.documentId, docIds)),

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
      .where(inArray(documentAccess.documentId, docIds))
      .leftJoin(employees, eq(documentAccess.userId, employees.id)),
  ]);

  // Enrich documents with tags and access rules
  return documents.map((doc) => ({
    ...doc,
    tags: tags.filter((t) => t.documentId === doc.id).map((t) => t.tag),
    accessRules: accessRules
      .filter((a) => a.documentId === doc.id)
      .map((a) => ({
        accessLevel: a.accessLevel,
        userId: a.userId,
        name: a.name,
        email: a.email,
        department: a.department,
      })),
  }));
}
