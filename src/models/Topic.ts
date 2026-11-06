import { Schema, deleteModel, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * A topic children can choose when they register, in one category of one
 * quarterly version. Managed in Admin → Topic Management; switching `active`
 * off hides it from new registrations without touching earlier ones.
 */
const topicSchema = new Schema(
  {
    version: { type: Schema.Types.ObjectId, ref: "TopicVersion", required: true },
    category: { type: Schema.Types.ObjectId, ref: "TopicCategory", required: true },
    title: { type: String, required: true, trim: true },
    displayOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

topicSchema.index({ version: 1, category: 1, displayOrder: 1 });

export type TopicDocument = InferSchemaType<typeof topicSchema>;

// The dev server re-runs this file when the schema changes without restarting;
// drop the model built from the old schema so new fields are saved.
if (process.env.NODE_ENV !== "production" && models.Topic) deleteModel("Topic");

export const Topic: Model<TopicDocument> = models.Topic ?? model<TopicDocument>("Topic", topicSchema);
