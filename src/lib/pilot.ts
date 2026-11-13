/**
 * Pilot registration rules that need no database, so the admin, the public
 * pages, the server and the tests all agree. Prices are in rupees here (as the
 * admin types them); the checkout turns them into paise.
 */

export const PILOT_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type PilotStatus = (typeof PILOT_STATUSES)[number];

export const PILOT_DURATIONS = ["MONTHLY", "THREE_MONTHS", "SIX_MONTHS", "CUSTOM"] as const;
export type PilotDuration = (typeof PILOT_DURATIONS)[number];
export const PILOT_DURATION_LABELS: Record<PilotDuration, string> = {
  MONTHLY: "Monthly (1 month)",
  THREE_MONTHS: "3 months",
  SIX_MONTHS: "6 months",
  CUSTOM: "Custom",
};
const DURATION_MONTHS = { MONTHLY: 1, THREE_MONTHS: 3, SIX_MONTHS: 6 } as const;

export const PILOT_DISCOUNT_TYPES = ["PERCENTAGE", "FIXED"] as const;
export type PilotDiscountType = (typeof PILOT_DISCOUNT_TYPES)[number];

/** PUBLIC is listed for everyone; the others are reachable only with the plan's access code. */
export const PILOT_ELIGIBILITY_TYPES = ["PUBLIC", "ACCESS_CODE", "EMAIL_LIST"] as const;
export type PilotEligibility = (typeof PILOT_ELIGIBILITY_TYPES)[number];
export const PILOT_ELIGIBILITY_LABELS: Record<PilotEligibility, string> = {
  PUBLIC: "Public: listed for everyone",
  ACCESS_CODE: "Restricted: access code or link",
  EMAIL_LIST: "Restricted: access code and approved emails",
};

/** Slot reservations: held while a family pays, then given back. */
export const PILOT_RESERVATION_STATUSES = ["RESERVED", "CONFIRMED", "RELEASED", "CANCELLED", "REFUND_REQUIRED"] as const;
export type PilotReservationStatus = (typeof PILOT_RESERVATION_STATUSES)[number];
export const PILOT_RESERVATION_LABELS: Record<PilotReservationStatus, string> = {
  RESERVED: "Payment pending",
  CONFIRMED: "Confirmed",
  RELEASED: "Released",
  CANCELLED: "Cancelled",
  REFUND_REQUIRED: "Refund required",
};

/** How long a slot is held for a family that has opened the payment. */
export const PILOT_RESERVATION_MS = 30 * 60 * 1000;

export function durationMonths(type: PilotDuration, custom?: number | null): number {
  return type === "CUSTOM" ? Math.max(1, Math.round(custom ?? 1)) : DURATION_MONTHS[type];
}

const toPaise = (rupees: number) => Math.round(rupees * 100);

/** The price after the discount, in rupees with at most two decimals; never below zero. */
export function offerPrice(originalPrice: number, type: PilotDiscountType, value: number): number {
  const original = toPaise(originalPrice);
  const off = type === "PERCENTAGE" ? Math.round((original * value) / 100) : toPaise(value);
  return Math.max(0, original - off) / 100;
}

export function savingsPercent(original: number, offer: number): number {
  return original > 0 && offer < original ? Math.round(((original - offer) / original) * 100) : 0;
}

export type PilotAvailability = "OPEN" | "FULLY_BOOKED" | "NOT_STARTED" | "ENDED" | "INACTIVE";
export const PILOT_AVAILABILITY_LABELS: Record<PilotAvailability, string> = {
  OPEN: "Open",
  FULLY_BOOKED: "Fully booked",
  NOT_STARTED: "Not started",
  ENDED: "Ended",
  INACTIVE: "Inactive",
};

type Capacity = { status: PilotStatus; startDate: Date | string; endDate: Date | string; maxRegistrations: number; registrationCount: number; reservedCount?: number | null };

/** Slots neither taken nor held for a payment in progress. */
export function slotsLeft(plan: Pick<Capacity, "maxRegistrations" | "registrationCount" | "reservedCount">): number {
  return Math.max(0, plan.maxRegistrations - plan.registrationCount - (plan.reservedCount ?? 0));
}

/** Worked out from the plan and the clock every time, so "Fully booked" can never go stale (a refund reopens a slot). */
export function pilotAvailability(plan: Capacity, now = new Date()): PilotAvailability {
  if (plan.status !== "ACTIVE") return "INACTIVE";
  if (now < new Date(plan.startDate)) return "NOT_STARTED";
  if (now > new Date(plan.endDate)) return "ENDED";
  return slotsLeft(plan) === 0 ? "FULLY_BOOKED" : "OPEN";
}

/** Customer-facing wording for why a plan can't be joined. */
export const PILOT_UNAVAILABLE_MESSAGES: Record<Exclude<PilotAvailability, "OPEN">, string> = {
  FULLY_BOOKED: "This pilot plan is fully booked. Thank you for your interest.",
  NOT_STARTED: "Registration for this pilot plan has not opened yet.",
  ENDED: "Registration for this pilot plan has closed.",
  INACTIVE: "This pilot plan is not available.",
};

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function newAccessCode(random: (max: number) => number): string {
  let code = "";
  for (let i = 0; i < 8; i += 1) code += CODE_ALPHABET[random(CODE_ALPHABET.length)];
  return code;
}

/** Codes are typed by people: case and stray spaces never matter. */
export const normaliseAccessCode = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, "").toUpperCase();

export const normaliseEmail = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

/** The reservation expiry for a payment opened now. */
export const reservationExpiry = (now = new Date()) => new Date(now.getTime() + PILOT_RESERVATION_MS);
