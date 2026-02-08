import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { getUser } from "@/actions/auth/dal";
import { document, documentAccess, employees } from "@/db/schema";
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
    const rows = await db.transaction(async (tx) => {
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

      const isOwner = doc.uploadedBy === user.id;
      const hasManageAccess = accessRows.some(
        (a) =>
          (a.userId === user.id ||
            (a.department && a.department === user.department)) &&
          a.accessLevel === "manage",
      );
      if (!(isOwner || hasManageAccess)) {
        throw new Error("Access denied");
      }

      const shares = await tx
        .select({
          userId: documentAccess.userId,
          accessLevel: documentAccess.accessLevel,
          createdAt: documentAccess.createdAt,
          name: employees.name,
          email: employees.email,
        })
        .from(documentAccess)
        .leftJoin(employees, eq(documentAccess.userId, employees.id))
        .where(
          and(
            eq(documentAccess.documentId, documentId),
            sql`${documentAccess.userId} IS NOT NULL`,
          ),
        )
        .orderBy(sql`${employees.name} ASC`);

      return shares;
    });

    const headers = new Headers();
    headers.set(
      "Cache-Control",
      "public, s-maxage=15, stale-while-revalidate=30",
    );

    return NextResponse.json({ shares: rows }, { status: 200, headers });
  } catch (err) {
    console.error("Error fetching document shares:", err);

    if (err instanceof DrizzleQueryError) {
      return NextResponse.json(
        { error: err.cause?.message || "Database error occurred" },
        { status: 500 },
      );
    }

    if (err instanceof Error && err.message === "Access denied") {
      return NextResponse.json(
        { error: "Dont have permissions" },
        { status: 403 },
      );
    }

    if (err instanceof Error && err.message === "Document not found") {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Couldn't fetch shares. Please try again." },
      { status: 500 },
    );
  }
}
