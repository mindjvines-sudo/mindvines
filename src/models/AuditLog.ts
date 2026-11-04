import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { AUDIT_ACTIONS } from "@/lib/constants";

const auditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    entity: { type: String, required: true },
    entityId: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema>;

export const AuditLog: Model<AuditLogDocument> =
  models.AuditLog ?? model<AuditLogDocument>("AuditLog", auditLogSchema);
