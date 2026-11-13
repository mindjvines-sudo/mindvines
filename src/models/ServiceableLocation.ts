import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * The master list of pincodes Mindvines registers children from. Normalised
 * geography (country → state → district → city → post offices) as India Post
 * has it; a lookup is saved here the first time, so registrations never wait
 * on an external service. Registrations keep their own copy of the address:
 * editing or switching off a pincode here never rewrites them.
 */
const serviceableLocationSchema = new Schema(
  {
    pincode: { type: String, required: true, unique: true, match: /^[1-9]\d{5}$/ },
    countryCode: { type: String, required: true, default: "IN" },
    countryName: { type: String, required: true, default: "India" },
    stateCode: { type: String, trim: true },
    stateName: { type: String, required: true, trim: true },
    districtCode: { type: String, trim: true },
    districtName: { type: String, required: true, trim: true },
    cityName: { type: String, required: true, trim: true },
    postOffices: [{ _id: false, name: { type: String, required: true }, branchType: String, deliveryStatus: String }],
    isServiceable: { type: Boolean, required: true, default: true },
    remarks: { type: String, trim: true, maxlength: 500 },
    source: { type: String, enum: ["india-post", "manual", "import", "backfill"], default: "india-post" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "serviceable_locations" }
);

serviceableLocationSchema.index({ stateName: 1, districtName: 1, cityName: 1 });
serviceableLocationSchema.index({ isServiceable: 1, pincode: 1 });
serviceableLocationSchema.index({ createdAt: -1 });

export type ServiceableLocationDocument = InferSchemaType<typeof serviceableLocationSchema>;

export const ServiceableLocation: Model<ServiceableLocationDocument> =
  models.ServiceableLocation ?? model<ServiceableLocationDocument>("ServiceableLocation", serviceableLocationSchema);
