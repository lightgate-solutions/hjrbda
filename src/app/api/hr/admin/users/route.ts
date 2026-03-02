import { getUsers } from "@/actions/auth/users";
import { requireAdmin } from "@/actions/auth/dal";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin access (role=admin OR department=admin)
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    const sortBy = searchParams.get("sortBy") || undefined;
    let sortDirection = searchParams.get("sortDirection") || undefined;
    if (sortDirection !== "asc" && sortDirection !== "desc") {
      sortDirection = undefined;
    }
    const role = searchParams.get("role") || undefined;
    const status = searchParams.get("status") || undefined;
    const email = searchParams.get("email") || undefined;
    const name = searchParams.get("name") || undefined;

    // Pass all filters and sort to getUsers
    const { users, total } = await getUsers({
      limit,
      offset,
      sortBy,
      sortDirection,
      role,
      status,
      email,
      name,
    });

    return NextResponse.json({
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith("Unauthorized")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message.startsWith("Forbidden")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users", users: [], total: 0 },
      { status: 500 },
    );
  }
}
