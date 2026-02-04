"use server";

import { auth } from "@/lib/auth";
import { APIError } from "better-auth/api";
import type { RegisterSchema } from "@/components/auth/register-form";
import { db } from "@/db";
import { employees, user as userDB } from "@/db/schema";

type ActionResult<T = unknown> = {
  success: { reason: string } | null;
  error: { reason: string } | null;
  data?: T;
};

export async function registerUser(
  formData: RegisterSchema,
): Promise<ActionResult> {
  const { email, password, name } = formData;

  try {
    const user = await db.transaction(async (tx) => {
      const { user } = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name,
          callbackURL: "/admin",
          rememberMe: true,
        },
      });

      await tx.insert(employees).values({
        name: name,
        email: email,
        role: "admin",
        department: "admin",
        authId: user.id,
      });

      await tx.update(userDB).set({ role: "admin" });

      return user;
    });

    return {
      success: {
        reason: "Registration successful! Login to continue.",
      },
      error: null,
      data: { user: { id: user.id, email: user.email } },
    };
  } catch (error) {
    if (error instanceof APIError) {
      switch (error.status) {
        case "UNPROCESSABLE_ENTITY":
          return { error: { reason: "User already exists." }, success: null };
        case "BAD_REQUEST":
          return { error: { reason: "Invalid email." }, success: null };
        default:
          return { error: { reason: "Something went wrong." }, success: null };
      }
    }

    return { error: { reason: "Something went wrong." }, success: null };
  }
}
