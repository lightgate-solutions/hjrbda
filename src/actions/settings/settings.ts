"use server";

import { auth } from "@/lib/auth";
import { DrizzleQueryError } from "drizzle-orm";
import { headers } from "next/headers";

export async function getCurrentUser() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
      return null;
    }

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      createdAt: session.user.createdAt,
    };
  } catch (_error) {
    return null;
  }
}
export async function changePassword(currentP: string, newP: string) {
  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        newPassword: newP,
        currentPassword: currentP,
      },
    });

    return {
      success: { reason: "Passwords changed successfully" },
      error: null,
    };
  } catch (err) {
    if (err instanceof DrizzleQueryError) {
      return {
        success: null,
        error: { reason: err.cause?.message },
      };
    }

    return {
      error: {
        reason: "Current password incorrect. Try again!",
      },
      success: null,
    };
  }
}
