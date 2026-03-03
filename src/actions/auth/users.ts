"use server";

import { db } from "@/db";
import { account, session, user as authUser } from "@/db/schema/auth";
import { employees } from "@/db/schema/hr";
import { auth } from "@/lib/auth";
import {
  DrizzleQueryError,
  eq,
  ilike,
  and,
  sql,
  desc,
  asc,
  inArray,
} from "drizzle-orm";
import { headers } from "next/headers";

export interface UserWithDetails {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  banned: boolean;
  banReason?: string;
  banExpires?: Date | null;
  accounts: string[];
  lastSignIn: Date | null;
  createdAt: Date;
  avatarUrl: string;
  role?: string;
}

export interface GetUsersOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  role?: string;
  status?: string;
  email?: string;
  name?: string;
}

export async function getUsers(
  options: GetUsersOptions = {},
): Promise<{ users: UserWithDetails[]; total: number }> {
  type NewType = number | string | boolean;

  // Build query for Better Auth
  const query: Record<string, NewType> = {
    limit: options.limit ?? 10,
    offset: options.offset ?? 0,
  };

  // Sorting
  if (options.sortBy) query.sortBy = options.sortBy;
  if (options.sortDirection) query.sortDirection = options.sortDirection;

  // Filtering by role
  if (options.role) {
    query.filterField = "role";
    query.filterOperator = "eq";
    query.filterValue = options.role;
  }

  // Filtering by status (active/banned)
  if (options.status) {
    query.filterField = "banned";
    query.filterOperator = "eq";
    // biome-ignore lint/complexity/noUselessTernary: <>
    query.filterValue = options.status === "banned" ? true : false;
  }

  // Filtering by email
  if (options.email) {
    query.searchField = "email";
    query.searchOperator = "contains";
    query.searchValue = options.email;
  }

  // Filtering by name
  if (options.name) {
    query.searchField = "name";
    query.searchOperator = "contains";
    query.searchValue = options.name;
  }

  // Get users from Better Auth
  const result = await auth.api.listUsers({
    headers: await headers(),
    query,
  });

  if (!result.users) {
    return { users: [], total: 0 };
  }

  // Query separate tables to get accounts information
  const accountsQuery = await db.query.account.findMany({
    columns: {
      userId: true,
      providerId: true,
    },
  });

  // Query session information
  const sessionsQuery = await db.query.session.findMany({
    columns: {
      userId: true,
      createdAt: true,
    },
    orderBy: (session) => [session.createdAt],
  });

  // Group accounts by user ID
  const accountsByUser = accountsQuery.reduce(
    (acc, account) => {
      if (!acc[account.userId]) {
        acc[account.userId] = [];
      }
      acc[account.userId].push(account.providerId);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  // Get last sign in date by user ID
  const lastSignInByUser = sessionsQuery.reduce(
    (acc, session) => {
      if (!acc[session.userId] || session.createdAt > acc[session.userId]) {
        acc[session.userId] = session.createdAt;
      }
      return acc;
    },
    {} as Record<string, Date>,
  );

  // Transform the raw data into the format expected by the UsersTable component
  const users: UserWithDetails[] = result.users.map((user) => {
    const accounts = accountsByUser[user.id] || [];
    const banned = user.banned ?? false;
    const banReason = user.banReason || "";
    const banExpires = user.banExpires || null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      verified: user.emailVerified,
      role: user.role,
      banned,
      banReason,
      banExpires,
      accounts,
      lastSignIn: lastSignInByUser[user.id] || null,
      createdAt: user.createdAt,
      avatarUrl: user.image || "",
    };
  });

  return { users, total: result.total ?? users.length };
}

/** List users by querying auth tables directly (for HR; bypasses Better Auth admin-only listUsers). */
export async function listUsersFromDb(
  options: GetUsersOptions = {},
): Promise<{ users: UserWithDetails[]; total: number }> {
  const limit = options.limit ?? 10;
  const offset = options.offset ?? 0;
  const conditions = [];
  if (options.role) {
    conditions.push(eq(authUser.role, options.role));
  }
  if (options.status === "banned") {
    conditions.push(eq(authUser.banned, true));
  } else if (options.status === "active") {
    conditions.push(eq(authUser.banned, false));
  }
  if (options.email?.trim()) {
    conditions.push(ilike(authUser.email, `%${options.email.trim()}%`));
  }
  if (options.name?.trim()) {
    conditions.push(ilike(authUser.name, `%${options.name.trim()}%`));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const orderBy =
    options.sortBy === "createdAt"
      ? options.sortDirection === "desc"
        ? desc(authUser.createdAt)
        : asc(authUser.createdAt)
      : options.sortBy === "name"
        ? options.sortDirection === "desc"
          ? desc(authUser.name)
          : asc(authUser.name)
        : desc(authUser.createdAt);

  const [usersRows, countResult] = await Promise.all([
    db
      .select()
      .from(authUser)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    whereClause
      ? db
          .select({ value: sql<number>`count(*)::int` })
          .from(authUser)
          .where(whereClause)
      : db.select({ value: sql<number>`count(*)::int` }).from(authUser),
  ]);
  const total = Number(
    (countResult[0] as { value: number } | undefined)?.value ?? 0,
  );

  const userIds = usersRows.map((u) => u.id);
  if (userIds.length === 0) {
    return { users: [], total };
  }
  const [accountsRows, sessionsRows] = await Promise.all([
    db
      .select({ userId: account.userId, providerId: account.providerId })
      .from(account)
      .where(inArray(account.userId, userIds)),
    db
      .select({ userId: session.userId, createdAt: session.createdAt })
      .from(session)
      .where(inArray(session.userId, userIds))
      .orderBy(desc(session.createdAt)),
  ]);

  const accountsByUser: Record<string, string[]> = {};
  for (const row of accountsRows) {
    if (!accountsByUser[row.userId]) accountsByUser[row.userId] = [];
    accountsByUser[row.userId].push(row.providerId);
  }
  const lastSignInByUser: Record<string, Date> = {};
  for (const row of sessionsRows) {
    if (
      !lastSignInByUser[row.userId] ||
      row.createdAt > lastSignInByUser[row.userId]
    ) {
      lastSignInByUser[row.userId] = row.createdAt;
    }
  }

  const users: UserWithDetails[] = usersRows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    verified: u.emailVerified ?? false,
    role: u.role ?? undefined,
    banned: u.banned ?? false,
    banReason: u.banReason ?? undefined,
    banExpires: u.banExpires ?? null,
    accounts: accountsByUser[u.id] ?? [],
    lastSignIn: lastSignInByUser[u.id] ?? null,
    createdAt: u.createdAt,
    avatarUrl: u.image ?? "",
  }));

  return { users, total };
}

export async function getManagers() {
  try {
    const data = await db
      .select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(eq(employees.isManager, true));
    return {
      success: { reason: "Success" },
      error: null,
      data: data,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message },
      };
    }

    return {
      success: null,
      error: { reason: "Could not fetch managers. Try again!" },
      data: null,
    };
  }
}
