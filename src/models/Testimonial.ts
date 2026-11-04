import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { CONTENT_STATUSES } from "@/lib/constants";

const testimonialSchema = new Schema(
  {
    authorName: { type: String, required: true, trim: true },
    authorRole: { type: String, trim: true },
    company: { type: String, trim: true },
    quote: { type: String, required: true },
    image: { type: Schema.Types.ObjectId, ref: "Media" },
    rating: { type: Number, min: 1, max: 5 },
    displayOrder: { type: Number, default: 0 },
    status: { type: String, enum: CONTENT_STATUSES, required: true, default: "DRAFT" },
  },
  { timestamps: true }
);

testimonialSchema.index({ status: 1, displayOrder: 1 });

export type TestimonialDocument = InferSchemaType<typeof testimonialSchema>;

export const Testimonial: Model<TestimonialDocument> =
  models.Testimonial ?? model<TestimonialDocument>("Testimonial", testimonialSchema);
