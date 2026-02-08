"use server";

import { db } from "@/db";
import { contractors } from "@/db/schema";
import { asc, desc, eq, ilike, or } from "drizzle-orm";
import { requireAuth, requireAdmin, requireManager } from "@/actions/auth/dal";
import * as z from "zod";
import { revalidatePath } from "next/cache";

const contractorSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.email().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  specialization: z.string().max(255).nullable().optional(),
});

export type ContractorInput = z.infer<typeof contractorSchema>;

export async function listContractors(params: {
  page?: number;
  limit?: number;
  q?: string;
  sortBy?: "name" | "specialization" | "createdAt";
  sortDirection?: "asc" | "desc";
}) {
  await requireAuth();
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const offset = (page - 1) * limit;
  const q = params.q ?? "";
  const sortBy = params.sortBy ?? "name";
  const sortDirection = params.sortDirection === "asc" ? "asc" : "desc";

  const where = q
    ? or(
        ilike(contractors.name, `%${q}%`),
        ilike(contractors.specialization, `%${q}%`),
      )
    : undefined;

  const totalRows = await db
    .select({ id: contractors.id })
    .from(contractors)
    .where(where);
  const total = totalRows.length;

  const order =
    sortDirection === "asc"
      ? asc(contractors[sortBy])
      : desc(contractors[sortBy]);

  const rows = await db
    .select()
    .from(contractors)
    .where(where)
    .orderBy(order)
    .limit(limit)
    .offset(offset);

  return {
    contractors: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function createContractor(input: ContractorInput) {
  await requireAdmin();

  const parsed = contractorSchema.safeParse(input);
  if (!parsed.success) {
    return { contractor: null, error: { reason: "Invalid input" } };
  }

  try {
    const [row] = await db.insert(contractors).values(parsed.data).returning();

    revalidatePath("/projects/contractors");
    return { contractor: row, error: null };
  } catch (_err) {
    return {
      contractor: null,
      error: { reason: "Could not create contractor" },
    };
  }
}

export async function updateContractor(
  id: number,
  input: Partial<ContractorInput>,
) {
  await requireAdmin();
  try {
    const [row] = await db
      .update(contractors)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(contractors.id, id))
      .returning();

    revalidatePath("/projects/contractors");
    return { contractor: row, error: null };
  } catch (_err) {
    return {
      contractor: null,
      error: { reason: "Could not update contractor" },
    };
  }
}

export async function deleteContractor(id: number) {
  await requireManager();
  try {
    await db.delete(contractors).where(eq(contractors.id, id));
    revalidatePath("/projects/contractors");
    return { success: true, error: null };
  } catch (_err) {
    return { success: false, error: { reason: "Could not delete contractor" } };
  }
}

export async function getContractor(id: number) {
  await requireAuth();
  const [row] = await db
    .select()
    .from(contractors)
    .where(eq(contractors.id, id))
    .limit(1);
  return row;
}

export async function getAllContractors() {
  await requireAuth();
  return await db.select().from(contractors).orderBy(asc(contractors.name));
}
