"use server";

import { db } from "@/db";
import { organization } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAuth } from "./auth/dal";
import { z } from "zod";

const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  logoUrl: z.string().optional().nullable(),
  logoKey: z.string().optional().nullable(),
});

export async function getOrganization() {
  try {
    const [org] = await db.select().from(organization).limit(1);

    if (!org) {
      // Create default organization if none exists
      const [newOrg] = await db
        .insert(organization)
        .values({
          name: "",
          logoUrl: null,
          logoKey: null,
        })
        .returning();

      return {
        success: newOrg,
        error: null,
      };
    }

    return {
      success: org,
      error: null,
    };
  } catch (error) {
    console.error("Error fetching organization:", error);
    return {
      success: null,
      error: { reason: "Failed to fetch organization settings" },
    };
  }
}

export async function updateOrganization(
  input: z.infer<typeof organizationSchema>,
) {
  try {
    const authData = await requireAuth();

    // Check if user is admin (role OR department)
    const isAdmin =
      authData.role === "admin" ||
      authData.employee.department.toLowerCase() === "admin";

    if (!isAdmin) {
      return {
        success: null,
        error: { reason: "Forbidden: Admin access required" },
      };
    }

    const validation = organizationSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: null,
        error: { reason: validation.error.issues[0].message },
      };
    }

    const [existing] = await db.select().from(organization).limit(1);

    const [result] = existing
      ? await db
          .update(organization)
          .set({
            name: validation.data.name,
            logoUrl: validation.data.logoUrl ?? existing.logoUrl,
            logoKey: validation.data.logoKey ?? existing.logoKey,
            updatedAt: new Date(),
          })
          .where(eq(organization.id, existing.id))
          .returning()
      : await db
          .insert(organization)
          .values({
            name: validation.data.name,
            logoUrl: validation.data.logoUrl,
            logoKey: validation.data.logoKey,
          })
          .returning();

    revalidatePath("/organization");
    revalidatePath("/", "layout");

    return {
      success: result,
      error: null,
    };
  } catch (error) {
    console.error("Error updating organization:", error);
    return {
      success: null,
      error: { reason: "Failed to update organization settings" },
    };
  }
}

export async function uploadOrganizationLogo(logoUrl: string, logoKey: string) {
  try {
    const authData = await requireAuth();

    // Check if user is admin (role OR department)
    const isAdmin =
      authData.role === "admin" ||
      authData.employee.department.toLowerCase() === "admin";

    if (!isAdmin) {
      return {
        success: null,
        error: { reason: "Forbidden: Admin access required" },
      };
    }

    const [existing] = await db.select().from(organization).limit(1);

    const [result] = existing
      ? await db
          .update(organization)
          .set({
            logoUrl,
            logoKey,
            updatedAt: new Date(),
          })
          .where(eq(organization.id, existing.id))
          .returning()
      : await db
          .insert(organization)
          .values({
            name: "",
            logoUrl,
            logoKey,
          })
          .returning();

    revalidatePath("/organization");
    revalidatePath("/", "layout");

    return {
      success: result,
      error: null,
    };
  } catch (error) {
    console.error("Error uploading organization logo:", error);
    return {
      success: null,
      error: { reason: "Failed to upload organization logo" },
    };
  }
}
