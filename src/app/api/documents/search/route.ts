/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

import { getUser } from "@/actions/auth/dal";
import { db } from "@/db";
import { document, documentAccess, documentTags } from "@/db/schema";
import { and, eq, ilike, isNull, or } from "drizzle-orm";

const CACHE_CONTROL = "no-store, must-revalidate";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const url = new URL(req.url);
  const rawQuery = (url.searchParams.get("q") || "").trim();

  if (!rawQuery) {
    return new Response(JSON.stringify([]), {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  }

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
    return new Response(JSON.stringify([]), {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  }

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

  const results = Array.from(byId.values()).map((doc) => ({
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

  return new Response(JSON.stringify(results), {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
