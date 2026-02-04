/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

import { upstashIndex } from "@/lib/upstash-client";
import { getUser } from "@/actions/auth/dal";
import { db } from "@/db";
import { document, documentAccess } from "@/db/schema";
import { eq, or, and, inArray, isNull } from "drizzle-orm";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const { query } = (await req.json()) as { query: string };

  const results = await upstashIndex.search({ query, limit: 100 });

  if (!results || results.length === 0) {
    return new Response(JSON.stringify([]));
  }

  // Extract document IDs from search results
  const documentIds = results
    .map((r: any) => Number(r.metadata?.documentId))
    .filter((id: number) => !Number.isNaN(id) && id > 0);

  if (documentIds.length === 0) {
    return new Response(JSON.stringify([]));
  }

  // Query database to check which documents exist and user has access to
  const accessibleDocs = await db
    .selectDistinct({ id: document.id })
    .from(document)
    .leftJoin(documentAccess, eq(documentAccess.documentId, document.id))
    .where(
      and(
        inArray(document.id, documentIds),
        eq(document.status, "active"),
        or(
          // Public documents
          eq(document.public, true),
          // User uploaded the document
          eq(document.uploadedBy, user.id),
          // Departmental documents in user's department
          and(
            eq(document.departmental, true),
            eq(document.department, user.department),
          ),
          // User has explicit access
          eq(documentAccess.userId, user.id),
          // User's department has access
          and(
            eq(documentAccess.department, user.department),
            isNull(documentAccess.userId),
          ),
        ),
      ),
    );

  const accessibleDocIds = new Set(accessibleDocs.map((d) => d.id.toString()));

  // Filter search results to only include accessible documents
  const filteredResults = results.filter((r: any) =>
    accessibleDocIds.has(r.metadata?.documentId),
  );

  return new Response(JSON.stringify(filteredResults));
}
