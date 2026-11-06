/**
 * A registration is saved as a DRAFT once page 1 is filled in, is
 * PAYMENT_PENDING once payment has started, and COMPLETED only when the
 * payment is verified on the server.
 */
export const REGISTRATION_STATUSES = ["DRAFT", "PAYMENT_PENDING", "COMPLETED"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

/** Unfinished registrations are deleted after this long. */
export const DRAFT_LIFETIME_DAYS = 30;

/** Unambiguous characters for references people read out on the phone. */
const REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** A short, readable registration reference such as "MV-7K3Q9P". */
export function newRegistrationReference(random: (max: number) => number) {
  let code = "";
  for (let i = 0; i < 6; i += 1) code += REFERENCE_ALPHABET[random(REFERENCE_ALPHABET.length)];
  return `MV-${code}`;
}
