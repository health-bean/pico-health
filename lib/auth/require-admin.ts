import { getSessionFromCookies } from "@/lib/auth/session";

/** For admin route handlers: the session, or the status to return. */
export async function requireAdmin() {
  const session = await getSessionFromCookies();
  if (!session.userId) return { error: "Unauthorized", status: 401 } as const;
  if (!session.isAdmin) return { error: "Forbidden", status: 403 } as const;
  return { session } as const;
}
