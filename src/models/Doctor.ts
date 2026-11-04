import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { CONTENT_STATUSES } from "@/lib/constants";

// Replaces the unused TeamMember model: the clinic's team is its doctors, shown
// on the Home and About pages and offered in the booking forms. Permissions
// stay on the existing `team` resource (lib/permissions.ts).
const doctorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    qualifications: { type: String, trim: true },
    experienceYears: { type: Number, min: 0, max: 80 },
    bio: { type: String, trim: true },
    photo: { type: Schema.Types.ObjectId, ref: "Media" },
    socialLinks: {
      facebook: { type: String, trim: true },
      x: { type: String, trim: true },
      whatsapp: { type: String, trim: true },
    },
    displayOrder: { type: Number, default: 0 },
    status: { type: String, enum: CONTENT_STATUSES, required: true, default: "DRAFT" },
  },
  { timestamps: true }
);

doctorSchema.index({ status: 1, displayOrder: 1 });

export type DoctorDocument = InferSchemaType<typeof doctorSchema>;

export const Doctor: Model<DoctorDocument> = models.Doctor ?? model<DoctorDocument>("Doctor", doctorSchema);
