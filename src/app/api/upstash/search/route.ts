/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

import { upstashIndex } from "@/lib/upstash-client";
import { getUser } from "@/actions/auth/dal";
import { db } from "@/db";
import { document, documentAccess, documentTags } from "@/db/schema/documents";
import { and, eq, ilike, inArray, isNull, or } from "drizzle-orm";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = (await req.json()) as { query: string | null | undefined };
  const rawQuery = typeof body.query === "string" ? body.query.trim() : "";

  if (!rawQuery) {
    return new Response(JSON.stringify([]));
  }

  // Try Upstash first, but fall back to direct DB search on error
  let results: any[] | null = null;
  try {
    const upstashResults = await upstashIndex.search({
      query: rawQuery,
      limit: 100,
    });
    if (Array.isArray(upstashResults) && upstashResults.length > 0) {
      results = upstashResults;
    }
  } catch (error) {
    console.error("Upstash search failed, falling back to DB search:", error);
  }

  // If Upstash returned usable results, filter them by access and return
  if (results && results.length > 0) {
    const documentIds = results
      .map((r: any) => Number(r.metadata?.documentId))
      .filter((id: number) => !Number.isNaN(id) && id > 0);

    if (documentIds.length === 0) {
      return new Response(JSON.stringify([]));
    }

    const accessibleDocs = await db
      .selectDistinct({ id: document.id })
      .from(document)
      .leftJoin(documentAccess, eq(documentAccess.documentId, document.id))
      .where(
        and(
          inArray(document.id, documentIds),
          eq(document.status, "active"),
          or(
            eq(document.public, true),
            eq(document.uploadedBy, user.id),
            and(
              eq(document.departmental, true),
              eq(document.department, user.department),
            ),
            eq(documentAccess.userId, user.id),
            and(
              eq(documentAccess.department, user.department),
              isNull(documentAccess.userId),
            ),
          ),
        ),
      );

    const accessibleDocIds = new Set(
      accessibleDocs.map((d) => d.id.toString()),
    );

    const filteredResults = results.filter((r: any) =>
      accessibleDocIds.has(r.metadata?.documentId),
    );

    return new Response(JSON.stringify(filteredResults));
  }

  // Fallback: DB search by title, description, and tags with the same access rules
  const like = `%${rawQuery}%`;

  const rows = await db
    .select({
      id: document.id,
      title: document.title,
      description: document.description,
      department: document.department,
      tag: documentTags.tag,
    })
    .from(document)
    .leftJoin(documentAccess, eq(documentAccess.documentId, document.id))
    .leftJoin(documentTags, eq(documentTags.documentId, document.id))
    .where(
      and(
        eq(document.status, "active"),
        or(
          ilike(document.title, like),
          ilike(document.description, like),
          ilike(documentTags.tag, like),
        ),
        or(
          eq(document.public, true),
          eq(document.uploadedBy, user.id),
          and(
            eq(document.departmental, true),
            eq(document.department, user.department),
          ),
          eq(documentAccess.userId, user.id),
          and(
            eq(documentAccess.department, user.department),
            isNull(documentAccess.userId),
          ),
        ),
      ),
    );

  if (!rows.length) {
    return new Response(JSON.stringify([]));
  }

  // Group tags per document and shape like Upstash search results
  const byId = new Map<
    number,
    {
      id: number;
      title: string;
      description: string | null;
      department: string;
      tags: Set<string>;
    }
  >();

  for (const row of rows) {
    let entry = byId.get(row.id);
    if (!entry) {
      entry = {
        id: row.id,
        title: row.title,
        description: row.description,
        department: row.department,
        tags: new Set<string>(),
      };
      byId.set(row.id, entry);
    }

    if (row.tag) {
      entry.tags.add(row.tag);
    }
  }

  const fallbackResults = Array.from(byId.values()).map((doc) => ({
    id: String(doc.id),
    content: {
      title: doc.title,
      description: doc.description ?? "",
      tags: Array.from(doc.tags).map((name) => ({ name })),
    },
    metadata: {
      department: doc.department,
      documentId: String(doc.id),
    },
  }));

  return new Response(JSON.stringify(fallbackResults));
}
