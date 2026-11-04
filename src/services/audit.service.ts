import "server-only";
import { connectToDatabase } from "@/lib/mongodb";
import { AuditLog } from "@/models/AuditLog";
import type { AuditAction } from "@/lib/constants";

export async function listRecentAuditLogs(limit = 10) {
  await connectToDatabase();
  return AuditLog.find().sort({ createdAt: -1 }).limit(limit).populate("userId", "name email").lean();
}

export async function logAction(params: {
  userId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await connectToDatabase();
  await AuditLog.create({
    userId: params.userId,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    metadata: params.metadata,
  });
}
