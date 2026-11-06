import { Schema, deleteModel, model, models, type InferSchemaType, type Model } from "mongoose";
import { TOPIC_PICKS } from "@/lib/topics";

/**
 * A list of topics children choose from, such as "Writing topics". Programmes
 * say which categories their families pick from; the heading and description
 * are what parents read above the list.
 */
const topicCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    heading: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    selectionLimit: { type: Number, required: true, min: 1, max: 50, default: TOPIC_PICKS },
    displayOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

topicCategorySchema.index({ displayOrder: 1 });

export type TopicCategoryDocument = InferSchemaType<typeof topicCategorySchema>;

// The dev server re-runs this file when the schema changes without restarting;
// drop the model built from the old schema so new fields are saved.
if (process.env.NODE_ENV !== "production" && models.TopicCategory) deleteModel("TopicCategory");

export const TopicCategory: Model<TopicCategoryDocument> =
  models.TopicCategory ?? model<TopicCategoryDocument>("TopicCategory", topicCategorySchema);
