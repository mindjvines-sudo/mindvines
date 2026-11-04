import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const mediaSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true },
    secureUrl: { type: String, required: true },
    filename: { type: String, required: true },
    resourceType: { type: String, required: true },
    format: { type: String },
    width: { type: Number },
    height: { type: Number },
    bytes: { type: Number, required: true },
    altText: { type: String, trim: true },
    caption: { type: String, trim: true },
    folder: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export type MediaDocument = InferSchemaType<typeof mediaSchema>;

export const Media: Model<MediaDocument> = models.Media ?? model<MediaDocument>("Media", mediaSchema);
