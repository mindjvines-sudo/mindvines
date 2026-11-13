import "server-only";
import { NextResponse } from "next/server";
import { getAuthenticatedUser, type SafeUser } from "@/lib/dal";
import { can, type Action, type Resource } from "@/lib/permissions";

/** Signed-in, active, and allowed to do `action` on `resource`; otherwise the error response to return. */
export async function requireAccess(action: Action, resource: Resource): Promise<{ user: SafeUser } | { error: NextResponse }> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!can(user.role, action, resource)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}

/**
 * A JSON body from a request that really is JSON. Cross-site forms can't send
 * application/json without a preflight, so requiring it closes off CSRF on
 * these cookie-authenticated endpoints.
 */
export async function readJson(request: Request): Promise<unknown | undefined> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return undefined;
  return request.json().catch(() => undefined);
}

export const badRequest = (message = "Please check the details.", fields?: Record<string, string[] | undefined>) =>
  NextResponse.json({ error: message, ...(fields && { fields }) }, { status: 400 });
