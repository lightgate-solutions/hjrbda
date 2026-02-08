import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { getUser } from "@/actions/auth/dal";
import { document, documentAccess } from "@/db/schema";
import { DrizzleQueryError } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const documentId = Number.parseInt(id, 10);

  if (Number.isNaN(documentId)) {
    return NextResponse.json({ error: "Invalid document ID" }, { status: 400 });
  }

  try {
    const result = await db.transaction(async (tx) => {
      const doc = await tx.query.document.findFirst({
        where: eq(document.id, documentId),
      });
      if (!doc) throw new Error("Document not found");

      if (doc.uploadedBy === user.id) {
        return {
          level: "manage" as const,
          isOwner: true,
          isAdminDepartment: user.department === "admin",
        };
      }

      const rules = await tx
        .select({
          accessLevel: documentAccess.accessLevel,
          userId: documentAccess.userId,
          department: documentAccess.department,
        })
        .from(documentAccess)
        .where(eq(documentAccess.documentId, documentId));

      const rank = (lvl: string) =>
        lvl === "manage" ? 3 : lvl === "edit" ? 2 : lvl === "view" ? 1 : 0;

      let best: "none" | "view" | "edit" | "manage" = "none";

      for (const r of rules) {
        const applies =
          r.userId === user.id ||
          (r.department && r.department === user.department);
        if (!applies) continue;
        if (rank(r.accessLevel) > rank(best)) {
          best = r.accessLevel as typeof best;
        }
      }

      if (best === "none") {
        if (
          doc.public ||
          (doc.departmental && doc.department === user.department)
        ) {
          best = "view";
        }
      }

      return {
        level: best,
        isOwner: false,
        isAdminDepartment: user.department === "admin",
      };
    });

    const headers = new Headers();
    headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60",
    );

    return NextResponse.json(result, { status: 200, headers });
  } catch (err) {
    console.error("Error fetching document access:", err);

    if (err instanceof DrizzleQueryError) {
      return NextResponse.json(
        { error: err.cause?.message || "Database error occurred" },
        { status: 500 },
      );
    }

    if (err instanceof Error && err.message === "Document not found") {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Couldn't resolve access. Please try again." },
      { status: 500 },
    );
  }
}
