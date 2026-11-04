import "server-only";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import type { Role } from "@/lib/constants";

export type AuthenticatedUser = { id: string; name: string; email: string; role: Role };

/**
 * Verifies credentials against the database. Always returns a generic
 * failure (never reveals whether the email exists) to avoid user enumeration.
 */
export async function authenticate(email: string, password: string): Promise<AuthenticatedUser | null> {
  await connectToDatabase();

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+passwordHash");
  if (!user || !user.isActive) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  user.lastLoginAt = new Date();
  await user.save();

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role as Role,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
