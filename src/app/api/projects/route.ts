/** biome-ignore-all lint/suspicious/noExplicitAny: <> */

import { db } from "@/db";
import { projects, projectMembers } from "@/db/schema";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  sql,
  exists,
} from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/actions/auth/dal";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin =
      user.role.toLowerCase() === "admin" ||
      user.department.toLowerCase() === "admin";

    const searchParams = request.nextUrl.searchParams;
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    const q = searchParams.get("q") || "";
    const status = searchParams.get("status") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDirection =
      searchParams.get("sortDirection") === "asc" ? "asc" : "desc";

    let where: any;
    if (q) {
      where = or(
        ilike(projects.name, `%${q}%`),
        ilike(projects.code, `%${q}%`),
        ilike(projects.location, `%${q}%`),
      );
    }

    if (!isAdmin) {
      const accessFilter = or(
        eq(projects.creatorId, user.id),
        eq(projects.supervisorId, user.id),
        exists(
          db
            .select()
            .from(projectMembers)
            .where(
              and(
                eq(projectMembers.projectId, projects.id),
                eq(projectMembers.employeeId, user.id),
              ),
            ),
        ),
      );
      where = where ? and(where, accessFilter) : accessFilter;
    }

    if (status) {
      where = where
        ? and(
            where,
            eq(
              projects.status,
              status as "pending" | "in-progress" | "completed",
            ),
          )
        : eq(
            projects.status,
            status as "pending" | "in-progress" | "completed",
          );
    }
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      where = where
        ? and(where, gte(projects.createdAt, fromDate))
        : gte(projects.createdAt, fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      where = where
        ? and(where, lte(projects.createdAt, toDate))
        : lte(projects.createdAt, toDate);
    }

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(where);
    const total = Number(totalResult[0].count);

    // Map sortBy to actual column names
    const columnMap: Record<string, any> = {
      id: projects.id,
      name: projects.name,
      code: projects.code,
      description: projects.description,
      location: projects.location,
      status: projects.status,
      budgetPlanned: projects.budgetPlanned,
      budgetActual: projects.budgetActual,
      supervisorId: projects.supervisorId,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    };

    const orderColumn = columnMap[sortBy] || projects.createdAt;
    const order =
      sortDirection === "asc" ? asc(orderColumn) : desc(orderColumn);

    const rows = await db.query.projects.findMany({
      where,
      orderBy: [order],
      limit,
      offset,
      with: {
        supervisor: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          with: {
            employee: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      projects: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      location,
      supervisorId,
      budgetPlanned,
      budgetActual,
      status,
    } = body ?? {};

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Generate code like 1BM, 2BM, ... based on max existing id
    const [agg] = await db
      .select({ maxId: sql<number>`max(${projects.id})` })
      .from(projects);
    const nextId = (agg?.maxId ?? 0) + 1;
    const generatedCode = `${nextId}BM`;

    const [created] = await db
      .insert(projects)
      .values({
        name,
        code: generatedCode,
        description,
        location,
        supervisorId: supervisorId ?? null,
        creatorId: user.id,
        budgetPlanned: Number(budgetPlanned) || 0,
        budgetActual: Number(budgetActual) || 0,
        status: status || "pending",
      })
      .returning();

    return NextResponse.json({ project: created }, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }
}
