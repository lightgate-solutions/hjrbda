import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { and, eq, or } from "drizzle-orm";
import { getUser } from "@/actions/auth/dal";
import { documentFolders } from "@/db/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const folderId = Number.parseInt(id, 10);

  if (Number.isNaN(folderId)) {
    return NextResponse.json({ error: "Invalid folder ID" }, { status: 400 });
  }

  try {
    const folders = await db
      .select({
        id: documentFolders.id,
        name: documentFolders.name,
        updatedAt: documentFolders.updatedAt,
      })
      .from(documentFolders)
      .where(
        and(
          eq(documentFolders.parentId, folderId),
          eq(documentFolders.status, "active"),
          or(
            eq(documentFolders.createdBy, user.id),
            eq(documentFolders.public, true),
            and(
              eq(documentFolders.departmental, true),
              eq(documentFolders.department, user.department),
            ),
          ),
        ),
      );

    const headers = new Headers();
    headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );

    return NextResponse.json({ folders }, { status: 200, headers });
  } catch (err) {
    console.error("Error fetching subfolders:", err);
    return NextResponse.json(
      { error: "Couldn't fetch subfolders. Please try again." },
      { status: 500 },
    );
  }
}
