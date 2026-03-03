import { usernameClient, adminClient } from "better-auth/client/plugins";
import { defaultAc, defaultRoles } from "better-auth/plugins/admin/access";
import { createAuthClient } from "better-auth/react";

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

export const authClient = createAuthClient({
  plugins: [
    usernameClient(),
    adminClient({
      // biome-ignore lint/suspicious/noExplicitAny: better-auth defaultAc incompatible with client AccessControl type
      ac: defaultAc as any,
      roles: {
        admin: defaultRoles.admin,
        user: defaultRoles.user,
        hr: hrRole,
      },
    }),
  ],
});
