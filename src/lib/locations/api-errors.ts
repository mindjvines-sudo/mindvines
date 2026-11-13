import "server-only";
import { NextResponse } from "next/server";
import { LocationError } from "@/services/location.service";

const STATUS: Record<LocationError["code"], number> = {
  INVALID_PINCODE: 400, INVALID: 400, NOT_FOUND: 404, DUPLICATE: 409, IN_USE: 409, LOOKUP_FAILED: 502, UNAVAILABLE: 503,
};

/** Turns a LocationError into its JSON response; anything else is a 500 that leaks nothing. */
export function locationErrorResponse(error: unknown) {
  if (error instanceof LocationError) return NextResponse.json({ error: error.message, code: error.code }, { status: STATUS[error.code] });
  console.error("Location request failed", error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
