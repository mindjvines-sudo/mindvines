import "server-only";

/** The caller's address as the hosting platform reports it, for rate limiting only. */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
