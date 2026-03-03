import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema/auth";
import { admin, username } from "better-auth/plugins";
import { defaultAc, defaultRoles } from "better-auth/plugins/admin/access";
import { nextCookies } from "better-auth/next-js";
import { sendPasswordResetEmail } from "./emails";

const hrRole = defaultAc.newRole({
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "delete",
    "set-password",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
});

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.user,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ user, url });
    },
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds
    },
    expiresIn: 60 * 60 * 24 * 30, // 7 days
    updateAge: 60 * 60 * 24,
  },
  plugins: [
    nextCookies(),
    admin({
      // biome-ignore lint/suspicious/noExplicitAny: better-auth defaultAc incompatible with admin AccessControl type
      ac: defaultAc as any,
      roles: {
        admin: defaultRoles.admin,
        user: defaultRoles.user,
        hr: hrRole,
      },
      adminRoles: ["admin", "hr"],
    }),
    username(),
  ],
});
