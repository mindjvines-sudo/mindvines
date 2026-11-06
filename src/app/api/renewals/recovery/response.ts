import { NextResponse } from "next/server";
import { RecoveryError } from "@/services/registration-recovery.service";
import { RenewalError } from "@/services/renewal.service";

export function recoveryJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, private" } });
}

export function recoveryFailure(error: unknown) {
  if (error instanceof RecoveryError) {
    const status = error.code === "RATE_LIMITED" ? 429 : error.code === "UNAVAILABLE" ? 503 : 400;
    return recoveryJson({ error: error.message, code: error.code }, status);
  }
  if (error instanceof RenewalError) return recoveryJson({ error: error.message, code: error.code }, 409);
  console.error("Registration recovery request failed");
  return recoveryJson({ error: "We couldn't complete this request. Please try again later." }, 500);
}
