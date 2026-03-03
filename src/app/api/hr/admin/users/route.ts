import { getUsers, listUsersFromDb } from "@/actions/auth/users";
import { getEmployeeByAuthId } from "@/actions/hr/employees";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    const authUserId = session?.user?.id;
    const userRole = session?.user?.role;

    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const normalizedRole = userRole?.toLowerCase().trim() || "";
    const isAdmin = normalizedRole === "admin";
    const employee = await getEmployeeByAuthId(authUserId);
    const department = (employee?.department ?? "").toLowerCase().trim();
    const isHr = normalizedRole === "hr" || department === "hr";

    if (!isAdmin && !isHr) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    const sortBy = searchParams.get("sortBy") || undefined;
    const sortDirectionParam = searchParams.get("sortDirection") ?? undefined;
    const sortDirection: "asc" | "desc" | undefined =
      sortDirectionParam === "asc" || sortDirectionParam === "desc"
        ? sortDirectionParam
        : undefined;
    const roleFilter = searchParams.get("role") || undefined;
    const status = searchParams.get("status") || undefined;
    const email = searchParams.get("email") || undefined;
    const name = searchParams.get("name") || undefined;

    // Pass all filters and sort to getUsers
    // Admin uses Better Auth listUsers; HR uses direct DB list
    const { users, total } = isHr
      ? await listUsersFromDb({
          limit,
          offset,
          sortBy,
          sortDirection,
          role: roleFilter,
          status,
          email,
          name,
        })
      : await getUsers({
          limit,
          offset,
          sortBy,
          sortDirection,
          role: roleFilter,
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
