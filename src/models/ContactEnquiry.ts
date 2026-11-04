import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { ENQUIRY_STATUSES } from "@/lib/constants";

const contactEnquirySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    subject: { type: String, trim: true },
    childAge: { type: String, trim: true },
    message: { type: String, default: "" },
    status: { type: String, enum: ENQUIRY_STATUSES, required: true, default: "NEW" },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

contactEnquirySchema.index({ status: 1, createdAt: -1 });

export type ContactEnquiryDocument = InferSchemaType<typeof contactEnquirySchema>;

export const ContactEnquiry: Model<ContactEnquiryDocument> =
  models.ContactEnquiry ?? model<ContactEnquiryDocument>("ContactEnquiry", contactEnquirySchema);
