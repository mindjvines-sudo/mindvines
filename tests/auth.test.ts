import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { reportAuthFailure } from "../src/lib/auth-errors";
import { AuditLog } from "../src/models/AuditLog";
import { logAuthenticationEvent } from "../src/services/audit.service";

test("authentication diagnostics do not disclose raw database errors or credentials", (context) => {
  const logger = context.mock.method(console, "error", () => {});
  const error = Object.assign(new Error("mongodb://private-user:private-password@private-host"), {
    name: "MongoServerError", code: 18,
  });
  reportAuthFailure("database", error);
  const output = JSON.stringify(logger.mock.calls[0].arguments);
  assert.ok(output.includes("MongoServerError"));
  assert.ok(output.includes("18"));
  assert.ok(!output.includes("private-password"));
  assert.ok(!output.includes("private-host"));
});

test("an unavailable audit collection does not fail authentication events", async (context) => {
  const cache = global.__mongooseCache!;
  const previousConnection = cache.conn;
  cache.conn = mongoose;
  const logger = context.mock.method(console, "error", () => {});
  context.mock.method(AuditLog, "create", async () => {
    throw new Error("Private database failure");
  });
  try {
    for (const action of ["LOGIN", "LOGIN_FAILED", "LOGOUT"] as const) {
      await assert.doesNotReject(logAuthenticationEvent({ action, entity: "User" }));
    }
    assert.equal(logger.mock.callCount(), 3);
    assert.ok(!JSON.stringify(logger.mock.calls).includes("Private database failure"));
  } finally {
    cache.conn = previousConnection;
  }
});
