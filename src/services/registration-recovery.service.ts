import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { SITE } from "@/lib/content";
import { deriveState } from "@/lib/subscription-status";
import { registrationRecoveryEmail } from "@/lib/email-templates";
import { Registration } from "@/models/Registration";
import { RegistrationRecovery } from "@/models/RegistrationRecovery";
import { RecoveryRateLimit } from "@/models/RecoveryRateLimit";
import { Subscription } from "@/models/Subscription";
import { sendEmail } from "@/services/email.service";
import { lookupRenewal } from "@/services/renewal.service";
import { recoveryRequestSchema, recoverySelectSchema, recoveryVerifySchema } from "@/validations/registration-recovery.schema";

const CODE_MS = 10 * 60 * 1000;
const ACCESS_MS = 30 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
export const RECOVERY_REQUEST_MESSAGE = "If registrations are linked to this email, we’ll send a verification code. Check your inbox and spam folder.";

export class RecoveryError extends Error {
  constructor(readonly code: "RATE_LIMITED" | "INVALID_CODE" | "ACCESS_EXPIRED" | "UNAVAILABLE", message: string) {
    super(message);
  }
}

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
function codeHash(challengeId: string, code: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new RecoveryError("UNAVAILABLE", "Registration recovery is temporarily unavailable. Please try again later.");
  return createHmac("sha256", secret).update(`registration-recovery:${challengeId}:${code}`).digest("hex");
}

function duplicateKey(error: unknown) {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

/** Atomic, shared limits; TTL cleanup does not determine whether a window has expired. */
export async function checkRecoveryRateLimit(key: string, limit: number, windowMs: number) {
  await connectToDatabase();
  const now = Date.now();
  const window = Math.floor(now / windowMs);
  const id = `${hash(key)}:${windowMs}:${window}`;
  const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 2) * windowMs) } };
  let bucket;
  try {
    bucket = await RecoveryRateLimit.findOneAndUpdate({ _id: id }, update, { upsert: true, new: true });
  } catch (error) {
    if (!duplicateKey(error)) throw error;
    bucket = await RecoveryRateLimit.findOneAndUpdate({ _id: id }, update, { new: true });
  }
  if (!bucket || bucket.count > limit) throw new RecoveryError("RATE_LIMITED", "Too many attempts. Please wait a while before trying again.");
}

/** No registration lookup or SMTP work runs before the generic response is returned. */
export async function requestRegistrationRecovery(emailInput: string, ip: string) {
  const { email } = recoveryRequestSchema.parse({ email: emailInput });
  if (!process.env.SMTP_HOST?.trim() || !process.env.EMAIL_FROM?.trim()) {
    throw new RecoveryError("UNAVAILABLE", "Registration recovery is temporarily unavailable. Please try again later.");
  }
  const now = new Date();
  const challengeId = randomBytes(24).toString("base64url");
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const digest = codeHash(challengeId, code);
  await checkRecoveryRateLimit(`recovery-request:ip:${ip}`, 20, HOUR_MS);
  await checkRecoveryRateLimit(`recovery-request:email:${email}`, 5, HOUR_MS);
  const id = hash(email);
  try {
    await RegistrationRecovery.findOneAndUpdate(
      { _id: id, $or: [{ lastRequestedAt: { $lte: new Date(now.getTime() - COOLDOWN_MS) } }, { lastRequestedAt: { $exists: false } }] },
      {
        $set: { email, challengeId, codeHash: digest, expiresAt: new Date(now.getTime() + CODE_MS), lastRequestedAt: now, attempts: 0, deleteAfter: new Date(now.getTime() + ACCESS_MS) },
        $unset: { deliveredAt: "", usedAt: "", accessTokenHash: "", accessExpiresAt: "" },
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    // The existing email document failed the cooldown condition, so an upsert hits its unique _id.
    if (duplicateKey(error)) throw new RecoveryError("RATE_LIMITED", "Please wait 60 seconds before requesting another code.");
    throw error;
  }

  return {
    challengeId,
    message: RECOVERY_REQUEST_MESSAGE,
    resendAfter: COOLDOWN_MS / 1000,
    // Called using Next's after(), so existence and delivery timing do not disclose registrations.
    async deliver() {
      try {
        const registered = await Registration.exists({ "parent.email": email, status: "COMPLETED" });
        if (!registered || !(await RegistrationRecovery.exists({ _id: id, challengeId, expiresAt: { $gt: new Date() } }))) return;
        const result = await sendEmail({
          to: email,
          ...registrationRecoveryEmail({ site: { name: SITE.name, url: SITE.url }, code, expiresInMinutes: CODE_MS / 60_000 }),
        });
        if (result.ok) await RegistrationRecovery.updateOne({ _id: id, challengeId }, { $set: { deliveredAt: new Date() } });
      } catch {
        console.error("[email] registration recovery delivery failed");
      }
    },
  };
}

function invalidCode(): never {
  throw new RecoveryError("INVALID_CODE", "This code is invalid or expired. Check it or request a new code.");
}

export async function verifyRegistrationRecovery(input: { challengeId: string; code: string }) {
  const { challengeId, code } = recoveryVerifySchema.parse(input);
  await connectToDatabase();
  const now = new Date();
  // Reserve each attempt atomically, including parallel requests across server instances.
  const challenge = await RegistrationRecovery.findOneAndUpdate(
    { challengeId, expiresAt: { $gt: now }, deliveredAt: { $exists: true }, usedAt: null, attempts: { $lt: MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { new: true }
  ).select("+codeHash").lean();
  if (!challenge) invalidCode();
  const expected = Buffer.from(challenge.codeHash, "hex");
  const actual = Buffer.from(codeHash(challengeId, code), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) invalidCode();
  const accessToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ACCESS_MS);
  const claimed = await RegistrationRecovery.findOneAndUpdate(
    { _id: challenge._id, challengeId, codeHash: challenge.codeHash, usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date(), accessTokenHash: hash(accessToken), accessExpiresAt: expiresAt, deleteAfter: expiresAt } },
    { new: true }
  ).lean();
  if (!claimed) invalidCode();
  return { accessToken, registrations: await listRecoveredRegistrations(claimed.email), email: claimed.email };
}

async function listRecoveredRegistrations(email: string) {
  const registrations = await Registration.find({ "parent.email": email, status: "COMPLETED" })
    .select("reference child.name programmeName").sort({ createdAt: -1 }).lean();
  const subscriptions = await Subscription.find({ registrationId: { $in: registrations.map((item) => item._id) }, status: { $ne: "PENDING_PAYMENT" } })
    .select("registrationId status startDate expiryDate planSnapshot").sort({ createdAt: -1 }).lean();
  const now = new Date();
  return registrations.map((registration) => {
    const purchases = subscriptions.filter((item) => item.registrationId?.equals(registration._id));
    const live = purchases.filter((item) => item.status === "ACTIVE" && item.expiryDate && item.expiryDate > now);
    const running = live.filter((item) => !item.startDate || item.startDate <= now).sort((a, b) => b.expiryDate!.getTime() - a.expiryDate!.getTime())[0];
    const upcoming = live.filter((item) => item.startDate && item.startDate > now).sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime())[0];
    const current = running ?? upcoming ?? purchases[0];
    return {
      registrationId: registration._id.toString(), reference: registration.reference, childName: registration.child?.name ?? "",
      programme: current?.planSnapshot?.programme ?? registration.programmeName ?? "",
      planName: current?.planSnapshot?.name ?? "",
      state: current ? deriveState(current, now) : null,
      startDate: current?.startDate?.toISOString() ?? null,
      expiryDate: current?.expiryDate?.toISOString() ?? null,
    };
  });
}

export type RecoveredRegistration = Awaited<ReturnType<typeof listRecoveredRegistrations>>[number];

export async function selectRecoveredRegistration(input: { challengeId: string; accessToken: string; registrationId: string }) {
  const { challengeId, accessToken, registrationId } = recoverySelectSchema.parse(input);
  await connectToDatabase();
  const session = await RegistrationRecovery.findOne({ challengeId, accessTokenHash: hash(accessToken), accessExpiresAt: { $gt: new Date() }, usedAt: { $exists: true } }).lean();
  if (!session) throw new RecoveryError("ACCESS_EXPIRED", "Your verification has expired. Please verify your email again.");
  const registration = await Registration.findOne({ _id: registrationId, "parent.email": session.email, status: "COMPLETED" }).select("reference").lean();
  if (!registration) throw new RecoveryError("ACCESS_EXPIRED", "We couldn't access this registration. Please verify your email again.");
  return lookupRenewal(registration.reference, session.email);
}
