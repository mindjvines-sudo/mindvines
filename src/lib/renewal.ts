import { addMonths } from "@/lib/subscription-status";

/** Registration references are typed by people: accept "mv-5kwhqd", "MV 5KWHQD" or just "5KWHQD". */
export function normaliseReference(value: string) {
  const code = value.trim().toUpperCase().replace(/^MV[\s-]*/, "").replace(/[^A-Z0-9]/g, "");
  return code ? `MV-${code}` : "";
}

/**
 * Whether what a parent typed proves the registration is theirs: the email it
 * was made with, or the mobile number (with or without the country code).
 */
export function contactMatches(input: string, registered: { email: string; phone: string; phoneDial: string }) {
  const value = input.trim().toLowerCase();
  if (!value) return false;
  if (value.includes("@")) return value === registered.email.trim().toLowerCase();
  const digits = value.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length < 6) return false;
  return digits === registered.phone || digits === `${registered.phoneDial}${registered.phone}`;
}

/** A renewal starts when the current subscription ends, or today if it has already ended. */
export function renewalPeriod(currentExpiry: Date | null | undefined, durationMonths: number, now = new Date()) {
  const start = currentExpiry && currentExpiry > now ? currentExpiry : now;
  return { start, end: addMonths(start, durationMonths) };
}
