import "server-only";
import { isValidObjectId } from "mongoose";

type Filter = Record<string, unknown>;
import { connectToDatabase } from "@/lib/mongodb";
import { getPagination, totalPages } from "@/lib/utils";
import {
  NOT_SERVICEABLE_MESSAGE,
  SERVICEABLE_COUNTRY,
  decideServiceability,
  normalisePincode,
  stateCodeFor,
  titleCase,
  type ImportIssue,
  type ImportRow,
  type PincodeInfo,
  type PostOffice,
} from "@/lib/locations/pincode";
import { getPincodeProvider, ProviderUnavailableError, type PincodeProvider } from "@/lib/locations/provider";
import { Registration } from "@/models/Registration";
import { ServiceableLocation } from "@/models/ServiceableLocation";

export class LocationError extends Error {
  constructor(
    readonly code: "INVALID_PINCODE" | "NOT_FOUND" | "DUPLICATE" | "LOOKUP_FAILED" | "UNAVAILABLE" | "IN_USE" | "INVALID",
    message: string
  ) {
    super(message);
  }
}

/** The registration form's answer when a pincode can't be used. The message is always the same friendly one. */
export class NotServiceableError extends Error {
  constructor(readonly reason: "INVALID_COUNTRY" | "INVALID_PINCODE" | "NOT_FOUND" | "INACTIVE") {
    super(reason === "INVALID_PINCODE" ? "Enter a valid 6-digit PIN code." : NOT_SERVICEABLE_MESSAGE);
  }
}

const isDuplicateKey = (error: unknown) => typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ---------------------------------------------------------------- public side */

export type VerifiedLocation = {
  id: string;
  pincode: string;
  countryCode: string;
  stateName: string;
  districtName: string;
  cityName: string;
  postOffices: string[];
};

/**
 * The single server-side check used by the lookup endpoint, when a draft is
 * saved, and again when payment starts. Reads the master list only: it never
 * calls the postal provider.
 */
export async function verifyServiceable(input: { countryCode: string; pincode: unknown }): Promise<VerifiedLocation> {
  const pincode = normalisePincode(input.pincode);
  await connectToDatabase();
  const record = pincode ? await ServiceableLocation.findOne({ pincode }).lean() : null;
  const decision = decideServiceability({ countryCode: input.countryCode, pincode }, record);
  if (!decision.ok || !record) throw new NotServiceableError(decision.ok ? "NOT_FOUND" : decision.reason);
  return {
    id: record._id.toString(),
    pincode: record.pincode,
    countryCode: record.countryCode,
    stateName: record.stateName,
    districtName: record.districtName,
    cityName: record.cityName,
    postOffices: record.postOffices.map((office) => office.name),
  };
}

/**
 * Verifies a registration's address and returns the fields to store: the
 * geography comes from the master list, never from what the browser sent.
 * A post office, if given, must be one of the pincode's.
 */
export async function verifiedAddressFields(input: { countryCode: string; pincode: string; postOffice?: string | null }) {
  const location = await verifyServiceable({ countryCode: input.countryCode, pincode: input.pincode });
  const chosen = input.postOffice?.trim();
  const postOffice = chosen ? location.postOffices.find((name) => name.toLowerCase() === chosen.toLowerCase()) : undefined;
  if (chosen && !postOffice) throw new LocationError("INVALID", "Choose a post office from the list.");
  return {
    location,
    fields: {
      countryCode: location.countryCode,
      country: SERVICEABLE_COUNTRY.name,
      state: location.stateName,
      district: location.districtName,
      city: location.cityName,
      postalCode: location.pincode,
      postOffice: postOffice ?? (location.postOffices.length === 1 ? location.postOffices[0] : undefined),
      location: location.id,
      locationVerifiedAt: new Date(),
    },
  };
}

/* ----------------------------------------------------------------- admin side */

export type LocationInput = {
  pincode: string;
  stateName: string;
  districtName: string;
  cityName: string;
  postOffices: PostOffice[];
  isServiceable: boolean;
  remarks?: string;
  source?: "india-post" | "manual" | "import" | "backfill";
};

const geography = (info: Pick<PincodeInfo, "stateName" | "districtName" | "cityName">) => ({
  stateName: titleCase(info.stateName),
  stateCode: stateCodeFor(info.stateName),
  districtName: titleCase(info.districtName),
  cityName: titleCase(info.cityName),
});

/** Looks a pincode up for the Add form: the saved record if there is one, otherwise the provider's data. */
export async function lookupPincodeForAdmin(raw: unknown, provider: PincodeProvider = getPincodeProvider()) {
  const pincode = normalisePincode(raw);
  if (!pincode) throw new LocationError("INVALID_PINCODE", "Enter a valid 6-digit pincode.");
  await connectToDatabase();
  const existing = await ServiceableLocation.findOne({ pincode }).select("_id isServiceable").lean();
  if (existing) return { pincode, existing: { id: existing._id.toString(), isServiceable: existing.isServiceable }, info: null };
  try {
    const info = await provider.lookup(pincode);
    if (!info) throw new LocationError("NOT_FOUND", "No such pincode exists in India Post's records.");
    return { pincode, existing: null, info };
  } catch (error) {
    if (error instanceof ProviderUnavailableError) throw new LocationError("LOOKUP_FAILED", "The postal lookup service isn't responding. Try again in a moment.");
    throw error;
  }
}

export async function createLocation(input: LocationInput, userId?: string) {
  await connectToDatabase();
  try {
    const created = await ServiceableLocation.create({
      pincode: input.pincode,
      countryCode: SERVICEABLE_COUNTRY.code,
      countryName: SERVICEABLE_COUNTRY.name,
      ...geography(input),
      postOffices: input.postOffices,
      isServiceable: input.isServiceable,
      remarks: input.remarks || undefined,
      source: input.source ?? "india-post",
      createdBy: userId,
      updatedBy: userId,
    });
    return created;
  } catch (error) {
    if (isDuplicateKey(error)) throw new LocationError("DUPLICATE", `Pincode ${input.pincode} is already in the list.`);
    throw error;
  }
}

export async function updateLocation(id: string, input: Omit<LocationInput, "pincode">, userId: string) {
  if (!isValidObjectId(id)) throw new LocationError("NOT_FOUND", "Location not found.");
  await connectToDatabase();
  const updated = await ServiceableLocation.findByIdAndUpdate(
    id,
    {
      $set: {
        ...geography(input),
        postOffices: input.postOffices,
        isServiceable: input.isServiceable,
        remarks: input.remarks || undefined,
        updatedBy: userId,
      },
    },
    { returnDocument: "after" }
  ).lean();
  if (!updated) throw new LocationError("NOT_FOUND", "Location not found.");
  return updated;
}

export async function setLocationStatus(id: string, isServiceable: boolean, userId: string) {
  if (!isValidObjectId(id)) throw new LocationError("NOT_FOUND", "Location not found.");
  await connectToDatabase();
  const updated = await ServiceableLocation.findByIdAndUpdate(id, { $set: { isServiceable, updatedBy: userId } }, { returnDocument: "after" }).lean();
  if (!updated) throw new LocationError("NOT_FOUND", "Location not found.");
  return updated;
}

/** Registered (completed) children per pincode. Draft and unpaid registrations aren't counted. */
async function registeredCounts(pincodes: string[]) {
  if (pincodes.length === 0) return new Map<string, number>();
  const rows = await Registration.aggregate<{ _id: string; n: number }>([
    { $match: { status: "COMPLETED", "address.postalCode": { $in: pincodes } } },
    { $group: { _id: "$address.postalCode", n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id, row.n]));
}

/** Deleting is only safe for a pincode nobody has registered from (or started to). */
export async function deleteLocation(id: string) {
  if (!isValidObjectId(id)) throw new LocationError("NOT_FOUND", "Location not found.");
  await connectToDatabase();
  const location = await ServiceableLocation.findById(id).lean();
  if (!location) throw new LocationError("NOT_FOUND", "Location not found.");
  const used = await Registration.exists({ "address.postalCode": location.pincode });
  if (used) throw new LocationError("IN_USE", "Children have registered from this pincode, so it can't be deleted. Deactivate it instead.");
  await ServiceableLocation.deleteOne({ _id: id });
  return location;
}

export type LocationFilters = { search?: string; state?: string; district?: string; status?: "active" | "inactive"; page?: string | number };

export function parseLocationFilters(params: Record<string, string | undefined>): LocationFilters {
  return {
    search: params.search?.trim().slice(0, 60) || undefined,
    state: params.state?.trim().slice(0, 80) || undefined,
    district: params.district?.trim().slice(0, 80) || undefined,
    status: params.status === "active" || params.status === "inactive" ? params.status : undefined,
    page: params.page,
  };
}

function buildFilter(filters: LocationFilters): Filter {
  const and: Filter[] = [];
  if (filters.search) {
    const pattern = { $regex: escapeRegex(filters.search), $options: "i" };
    and.push({ $or: [{ pincode: { $regex: `^${escapeRegex(filters.search)}` } }, { cityName: pattern }, { districtName: pattern }, { stateName: pattern }] });
  }
  if (filters.state) and.push({ stateName: filters.state });
  if (filters.district) and.push({ districtName: filters.district });
  if (filters.status) and.push({ isServiceable: filters.status === "active" });
  return and.length ? { $and: and } : {};
}

export async function listLocations(filters: LocationFilters) {
  await connectToDatabase();
  const { page, limit, skip } = getPagination(filters);
  const filter = buildFilter(filters);
  const [items, total] = await Promise.all([
    ServiceableLocation.find(filter).sort({ pincode: 1 }).skip(skip).limit(limit).lean(),
    ServiceableLocation.countDocuments(filter),
  ]);
  const counts = await registeredCounts(items.map((item) => item.pincode));
  return { items: items.map((item) => ({ ...item, registered: counts.get(item.pincode) ?? 0 })), page, limit, total, pages: totalPages(total, limit) };
}

export async function listLocationsForExport(filters: LocationFilters) {
  await connectToDatabase();
  const items = await ServiceableLocation.find(buildFilter(filters)).sort({ pincode: 1 }).limit(20000).lean();
  const counts = await registeredCounts(items.map((item) => item.pincode));
  return items.map((item) => ({ ...item, registered: counts.get(item.pincode) ?? 0 }));
}

export async function getLocation(id: string) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  const location = await ServiceableLocation.findById(id).lean();
  if (!location) return null;
  const counts = await registeredCounts([location.pincode]);
  return { ...location, registered: counts.get(location.pincode) ?? 0 };
}

export async function listLocationFilterOptions() {
  await connectToDatabase();
  const [states, districts] = await Promise.all([
    ServiceableLocation.distinct("stateName") as Promise<string[]>,
    ServiceableLocation.distinct("districtName") as Promise<string[]>,
  ]);
  return { states: states.sort(), districts: districts.sort() };
}

export type ImportResult = {
  created: { line: number; pincode: string }[];
  skipped: ImportIssue[];
  failed: ImportIssue[];
};

/**
 * Adds many pincodes. A row's own state/district/city are used when the file
 * has them; otherwise (and for post offices) the provider fills them in.
 * Existing pincodes are skipped, bad ones reported; nothing is overwritten.
 */
export async function importLocations(
  rows: ImportRow[],
  userId?: string,
  provider: PincodeProvider = getPincodeProvider(),
  source: "import" | "backfill" = "import"
): Promise<ImportResult> {
  await connectToDatabase();
  const result: ImportResult = { created: [], skipped: [], failed: [] };
  const existing = new Set((await ServiceableLocation.find({ pincode: { $in: rows.map((row) => row.pincode) } }).select("pincode").lean()).map((doc) => doc.pincode));

  const queue = rows.filter((row) => {
    if (!existing.has(row.pincode)) return true;
    result.skipped.push({ line: row.line, pincode: row.pincode, reason: "Already in the list" });
    return false;
  });

  async function handle(row: ImportRow) {
    try {
      const info = await provider.lookup(row.pincode);
      if (!info) return void result.failed.push({ line: row.line, pincode: row.pincode, reason: "Not a pincode India Post knows" });
      await createLocation(
        {
          pincode: row.pincode,
          stateName: info.stateName,
          districtName: info.districtName,
          cityName: row.cityName || info.cityName,
          postOffices: info.postOffices,
          isServiceable: true,
          remarks: row.remarks,
          source,
        },
        userId
      );
      result.created.push({ line: row.line, pincode: row.pincode });
    } catch (error) {
      if (error instanceof LocationError && error.code === "DUPLICATE") result.skipped.push({ line: row.line, pincode: row.pincode, reason: "Already in the list" });
      else if (error instanceof ProviderUnavailableError) result.failed.push({ line: row.line, pincode: row.pincode, reason: "Postal lookup unavailable; try this row again" });
      else result.failed.push({ line: row.line, pincode: row.pincode, reason: "Could not be saved" });
    }
  }

  // A few at a time: gentle on the provider, quick enough for a few hundred rows.
  const CONCURRENCY = 5;
  for (let i = 0; i < queue.length; i += CONCURRENCY) await Promise.all(queue.slice(i, i + CONCURRENCY).map(handle));
  const byLine = (a: { line: number }, b: { line: number }) => a.line - b.line;
  result.created.sort(byLine); result.skipped.sort(byLine); result.failed.sort(byLine);
  return result;
}

/* ------------------------------------------------------------------ analytics */

export async function locationSummary() {
  await connectToDatabase();
  const [total, active, inServiceable] = await Promise.all([
    ServiceableLocation.countDocuments(),
    ServiceableLocation.countDocuments({ isServiceable: true }),
    Registration.aggregate<{ n: number }>([
      { $match: { status: "COMPLETED" } },
      { $lookup: { from: "serviceable_locations", localField: "address.postalCode", foreignField: "pincode", as: "loc" } },
      { $match: { "loc.0": { $exists: true } } },
      { $count: "n" },
    ]),
  ]);
  return { total, active, inactive: total - active, registrationsFromListed: inServiceable[0]?.n ?? 0 };
}

export type DistributionLevel = "state" | "district" | "city" | "pincode";

/**
 * Completed registrations by state, district, city or pincode. Older
 * registrations have no state or district of their own, so these come from
 * the master list through their pincode when it is there.
 */
export async function registrationDistribution(level: DistributionLevel, limit = 10) {
  await connectToDatabase();
  const keyExpression = {
    state: { $ifNull: ["$address.state", { $arrayElemAt: ["$loc.stateName", 0] }] },
    district: { $ifNull: ["$address.district", { $arrayElemAt: ["$loc.districtName", 0] }] },
    city: { $ifNull: ["$address.city", { $arrayElemAt: ["$loc.cityName", 0] }] },
    pincode: "$address.postalCode",
  }[level];
  const rows = await Registration.aggregate<{ _id: string | null; n: number }>([
    { $match: { status: "COMPLETED" } },
    { $lookup: { from: "serviceable_locations", localField: "address.postalCode", foreignField: "pincode", as: "loc" } },
    { $group: { _id: keyExpression, n: { $sum: 1 } } },
    { $match: { _id: { $nin: [null, ""] } } },
    { $sort: { n: -1, _id: 1 } },
    { $limit: limit },
  ]);
  return rows.map((row) => ({ label: String(row._id), value: row.n }));
}
