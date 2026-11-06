import { Schema, deleteModel, model, models, type InferSchemaType, type Model } from "mongoose";
import { SUBSCRIPTION_AGE_GROUPS } from "@/lib/subscriptions";

/**
 * What a child takes part in, such as "Writing & Sketching" for ages 9–12.
 * Each subscription plan belongs to one programme (a programme has a plan per
 * duration), and the programme's topic categories are the lists its families
 * pick favourites from.
 */
const programmeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    ageGroup: { type: String, enum: SUBSCRIPTION_AGE_GROUPS, required: true },
    description: { type: String, trim: true, default: "" },
    categories: [{ type: Schema.Types.ObjectId, ref: "TopicCategory" }],
    displayOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

programmeSchema.index({ ageGroup: 1, displayOrder: 1 });

export type ProgrammeDocument = InferSchemaType<typeof programmeSchema>;

// The dev server re-runs this file when the schema changes without restarting;
// drop the model built from the old schema so new fields are saved.
if (process.env.NODE_ENV !== "production" && models.Programme) deleteModel("Programme");

export const Programme: Model<ProgrammeDocument> = models.Programme ?? model<ProgrammeDocument>("Programme", programmeSchema);
