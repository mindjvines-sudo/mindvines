import { z } from "zod";
import { normalisePincode } from "@/lib/locations/pincode";

const name = (label: string) => z.string().trim().min(2, `Enter the ${label}`).max(80, `The ${label} is too long`);

const postOffice = z.object({
  name: z.string().trim().min(1).max(100),
  branchType: z.string().trim().max(60).optional(),
  deliveryStatus: z.string().trim().max(40).optional(),
});

export const pincodeSchema = z
  .string()
  .transform((value, context) => {
    const pincode = normalisePincode(value);
    if (!pincode) context.addIssue({ code: "custom", message: "Enter a valid 6-digit pincode" });
    return pincode ?? "";
  });

const geography = {
  stateName: name("state"),
  districtName: name("district"),
  cityName: name("city or town"),
  postOffices: z.array(postOffice).max(200).default([]),
  isServiceable: z.boolean().default(true),
  remarks: z.string().trim().max(500).optional(),
};

/** Adding a pincode: geography may be left out, and is then looked up from India Post. */
export const createLocationSchema = z.object({
  pincode: pincodeSchema,
  country: z.literal("IN").default("IN"),
  stateName: geography.stateName.optional(),
  districtName: geography.districtName.optional(),
  cityName: geography.cityName.optional(),
  postOffices: geography.postOffices.optional(),
  isServiceable: geography.isServiceable,
  remarks: geography.remarks,
});

/** Editing: the pincode itself never changes. */
export const updateLocationSchema = z.object(geography);

export const statusSchema = z.object({ isServiceable: z.boolean() });

export const importSchema = z.object({ csv: z.string().min(1).max(200_000) });

/** Public registration check. */
export const validateLocationSchema = z.object({ countryCode: z.string().trim().length(2).default("IN"), pincode: z.string().max(20) });
