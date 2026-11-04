import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { CONTENT_STATUSES } from "@/lib/constants";

const faqSchema = new Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true },
    category: { type: String, trim: true },
    order: { type: Number, default: 0 },
    status: { type: String, enum: CONTENT_STATUSES, required: true, default: "DRAFT" },
  },
  { timestamps: true }
);

faqSchema.index({ status: 1, order: 1 });

export type FAQDocument = InferSchemaType<typeof faqSchema>;

export const FAQ: Model<FAQDocument> = models.FAQ ?? model<FAQDocument>("FAQ", faqSchema);
