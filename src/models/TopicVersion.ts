import { Schema, deleteModel, model, models, type InferSchemaType, type Model } from "mongoose";
import { TOPIC_VERSION_STATUSES } from "@/lib/topics";

/** One quarter's set of topics. Exactly one is ACTIVE at a time (see lib/topics). */
const topicVersionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: TOPIC_VERSION_STATUSES, required: true, default: "DRAFT" },
    publishedAt: { type: Date },
    archivedAt: { type: Date },
  },
  { timestamps: true }
);

// Only one version can be live.
topicVersionSchema.index({ status: 1 }, { unique: true, partialFilterExpression: { status: "ACTIVE" } });

export type TopicVersionDocument = InferSchemaType<typeof topicVersionSchema>;

// The dev server re-runs this file when the schema changes without restarting;
// drop the model built from the old schema so new fields are saved.
if (process.env.NODE_ENV !== "production" && models.TopicVersion) deleteModel("TopicVersion");

export const TopicVersion: Model<TopicVersionDocument> =
  models.TopicVersion ?? model<TopicVersionDocument>("TopicVersion", topicVersionSchema);
