"use server";

import { auth } from "@/lib/auth";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import * as z from "zod";

type ActionResult<T = unknown> = {
  success: { reason: string } | null;
  error: { reason: string } | null;
  data?: T;
};

const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function loginUser(
  input: z.infer<typeof loginSchema>,
): Promise<ActionResult<{ user: { id: string; email: string } }>> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error: { reason: "Invalid input" },
      success: null,
    };
  }

  const { email, password } = parsed.data;

  try {
    await auth.api.signInEmail({ body: { email, password, rememberMe: true } });

    return {
      success: { reason: "Login successful" },
      error: null,
      data: undefined,
    };
  } catch (err) {
    if (err instanceof APIError) {
      return {
        error: { reason: err.message },
        success: null,
      };
    }

    return {
      error: { reason: "Email or password incorrect. Try again!" },
      success: null,
    };
  }
}

export async function SignOut() {
  await auth.api.signOut({
    headers: await headers(),
  });
  redirect("/auth/login");
}
