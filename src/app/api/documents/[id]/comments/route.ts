import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { eq, sql } from "drizzle-orm";
import { getUser } from "@/actions/auth/dal";
import {
  document,
  documentAccess,
  documentComments,
  employees,
} from "@/db/schema";
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

      const accessRows = await tx
        .select({
          userId: documentAccess.userId,
          department: documentAccess.department,
          accessLevel: documentAccess.accessLevel,
        })
        .from(documentAccess)
        .where(eq(documentAccess.documentId, documentId));

      const hasExplicitAccess = accessRows.some(
        (a) =>
          a.userId === user.id ||
          (a.department && a.department === user.department),
      );

      const canView =
        doc.public ||
        (doc.departmental && doc.department === user.department) ||
        doc.uploadedBy === user.id ||
        hasExplicitAccess;

      if (!canView) throw new Error("Access denied");

      const comments = await tx
        .select({
          id: documentComments.id,
          comment: documentComments.comment,
          createdAt: documentComments.createdAt,
          userId: documentComments.userId,
          userName: employees.name,
          userEmail: employees.email,
        })
        .from(documentComments)
        .leftJoin(employees, eq(documentComments.userId, employees.id))
        .where(eq(documentComments.documentId, documentId))
        .orderBy(sql`${documentComments.createdAt} DESC`);

      return comments;
    });

    const headers = new Headers();
    headers.set(
      "Cache-Control",
      "public, s-maxage=5, stale-while-revalidate=15",
    );

    return NextResponse.json({ comments: result }, { status: 200, headers });
  } catch (err) {
    console.error("Error fetching document comments:", err);

    if (err instanceof DrizzleQueryError) {
      return NextResponse.json(
        { error: err.cause?.message || "Database error occurred" },
        { status: 500 },
      );
    }

    if (err instanceof Error && err.message === "Access denied") {
      return NextResponse.json(
        { error: "Dont have permissions to view comments" },
        { status: 403 },
      );
    }

    if (err instanceof Error && err.message === "Document not found") {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Couldn't fetch comments. Please try again." },
      { status: 500 },
    );
  }
}
