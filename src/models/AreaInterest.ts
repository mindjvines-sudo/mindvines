import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Demand outside the serviceable list. `AreaSearch` counts how often each
 * unserviceable pincode is searched on the public site (one row per pincode);
 * `AreaLead` is a parent who asked to be told when Mindvines reaches their area.
 */
const areaSearchSchema = new Schema(
  {
    pincode: { type: String, required: true, unique: true, match: /^[1-9]\d{5}$/ },
    searches: { type: Number, required: true, default: 1 },
    lastSearchedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true, collection: "area_searches" }
);
areaSearchSchema.index({ searches: -1 });

const areaLeadSchema = new Schema(
  {
    pincode: { type: String, required: true, match: /^[1-9]\d{5}$/, index: true },
    name: { type: String, trim: true, maxlength: 80 },
    email: { type: String, trim: true, lowercase: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 20 },
  },
  { timestamps: true, collection: "area_leads" }
);
areaLeadSchema.index({ createdAt: -1 });

export type AreaSearchDocument = InferSchemaType<typeof areaSearchSchema>;
export type AreaLeadDocument = InferSchemaType<typeof areaLeadSchema>;

export const AreaSearch: Model<AreaSearchDocument> = models.AreaSearch ?? model<AreaSearchDocument>("AreaSearch", areaSearchSchema);
export const AreaLead: Model<AreaLeadDocument> = models.AreaLead ?? model<AreaLeadDocument>("AreaLead", areaLeadSchema);
