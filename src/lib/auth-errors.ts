import "server-only";

/** Keep credentials, connection strings, and raw database errors out of logs. */
export function reportAuthFailure(stage: "database" | "session" | "audit", error: unknown) {
  const name = error instanceof Error ? error.name : "UnknownError";
  const code = error && typeof error === "object" && "code" in error
    && (typeof error.code === "number" || typeof error.code === "string") ? error.code : undefined;
  console.error("[admin-auth] Request failed", { stage, name, code });
}
