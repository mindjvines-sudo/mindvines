import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * An immutable copy of a page's content taken each time it is published (or
 * scheduled). Restoring never rewrites one: it copies the snapshot back into
 * the page's draft, to be reviewed and published like any other edit.
 */
const pageVersionSchema = new Schema(
  {
    page: { type: Schema.Types.ObjectId, ref: "Page", required: true },
    versionNumber: { type: Number, required: true },
    // The validated, sanitised content exactly as it went live.
    snapshot: { type: Schema.Types.Mixed, required: true },
    kind: { type: String, enum: ["PUBLISHED", "SCHEDULED", "RESTORE_POINT"], default: "PUBLISHED" },
    note: { type: String, trim: true, maxlength: 200 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

pageVersionSchema.index({ page: 1, versionNumber: -1 }, { unique: true });

export type PageVersionDocument = InferSchemaType<typeof pageVersionSchema>;

export const PageVersion: Model<PageVersionDocument> = models.PageVersion ?? model<PageVersionDocument>("PageVersion", pageVersionSchema);
