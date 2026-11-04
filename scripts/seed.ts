import path from "node:path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(path.resolve(process.cwd()));

// Talks to Mongoose/bcrypt directly rather than importing src/lib/mongodb.ts
// or src/services/auth.service.ts: those files import "server-only", which
// throws unconditionally outside Next's own bundler (it relies on webpack
// aliasing to no-op it in server components) — a plain tsx/node script trips
// that guard immediately.
async function main() {
  const { User } = await import("../src/models/User");

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set. Add it to your .env.local file.");
  }

  const name = process.env.SEED_ADMIN_NAME ?? "Super Admin";
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@fysit.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  await mongoose.connect(mongoUri);

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    process.exit(0);
  }

  await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: "SUPER_ADMIN",
    isActive: true,
  });

  console.log(`Seeded SUPER_ADMIN user: ${email} / ${password}`);
  console.log("Change this password after first login.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
