import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import { decryptSession, readSessionCookie } from "@/lib/session";
import { User } from "@/models/User";
import type { Role } from "@/lib/constants";

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

/**
 * Verifies the session cookie and redirects to /admin/login if it's missing
 * or invalid. Wrapped in React's cache() so it only runs once per render pass
 * even when called from multiple layouts/pages/components.
 */
export const verifySession = cache(async (): Promise<{ userId: string; role: Role }> => {
  const cookie = await readSessionCookie();
  const session = await decryptSession(cookie);

  if (!session?.userId) {
    redirect("/admin/login");
  }

  return { userId: session.userId, role: session.role };
});

// Secure check backed by the database — use this wherever the caller needs
// up-to-date role/active-status data rather than trusting the cookie alone.
export const getCurrentUser = cache(async (): Promise<SafeUser> => {
  const session = await verifySession();
  await connectToDatabase();

  const user = await User.findById(session.userId).lean();
  if (!user || !user.isActive) {
    redirect("/admin/login");
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role as Role,
  };
});
