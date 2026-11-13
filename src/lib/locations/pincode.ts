/**
 * Pure location rules: no database, no network. Shared by the services, the
 * API routes and the tests, so the same rule is applied everywhere.
 */

export const NOT_SERVICEABLE_MESSAGE =
  "Sorry! Registrations are currently available only in selected locations. Your location is not serviceable at the moment.";

export const SERVICEABLE_COUNTRY = { code: "IN", name: "India" } as const;

/** An Indian PIN code: six digits, never starting with 0. */
export const PINCODE_PATTERN = /^[1-9]\d{5}$/;

/** Trims and strips inner spaces ("560 001" → "560001"). Returns null when it isn't a valid Indian PIN code. */
export function normalisePincode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const compact = value.replace(/\s+/g, "");
  return PINCODE_PATTERN.test(compact) ? compact : null;
}

export type PostOffice = {
  name: string;
  /** e.g. "Head Post Office", "Sub Post Office", "Branch Post Office". */
  branchType?: string;
  deliveryStatus?: string;
};

/** What a postal lookup provider knows about one pincode. */
export type PincodeInfo = {
  pincode: string;
  stateName: string;
  districtName: string;
  cityName: string;
  postOffices: PostOffice[];
};

/** Title-cases an all-capitals name ("NORTH WEST DELHI" → "North West Delhi"); names already in mixed case are only tidied. */
export function titleCase(value: string): string {
  const tidy = value.trim().replace(/\s+/g, " ");
  if (tidy !== tidy.toUpperCase()) return tidy;
  return tidy.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_match, lead: string, letter: string) => lead + letter.toUpperCase());
}

/** A stable lookup key for names, so "Tamil Nadu" and "TAMIL NADU " are one state. */
export const nameKey = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

/** ISO 3166-2:IN subdivision codes, by lower-case state / UT name (India Post spellings included). */
const STATE_CODES: Record<string, string> = {
  "andaman and nicobar islands": "AN", "andhra pradesh": "AP", "arunachal pradesh": "AR", assam: "AS", bihar: "BR",
  chandigarh: "CH", chhattisgarh: "CG", "dadra and nagar haveli and daman and diu": "DH", "dadra & nagar haveli": "DH",
  "daman & diu": "DH", delhi: "DL", goa: "GA", gujarat: "GJ", haryana: "HR", "himachal pradesh": "HP",
  "jammu and kashmir": "JK", "jammu & kashmir": "JK", jharkhand: "JH", karnataka: "KA", kerala: "KL", ladakh: "LA",
  lakshadweep: "LD", "madhya pradesh": "MP", maharashtra: "MH", manipur: "MN", meghalaya: "ML", mizoram: "MZ",
  nagaland: "NL", odisha: "OD", orissa: "OD", puducherry: "PY", punjab: "PB", rajasthan: "RJ", sikkim: "SK",
  "tamil nadu": "TN", telangana: "TG", tripura: "TR", "uttar pradesh": "UP", uttarakhand: "UT", "west bengal": "WB",
};

export function stateCodeFor(stateName: string): string | undefined {
  return STATE_CODES[nameKey(stateName)] ?? STATE_CODES[nameKey(stateName.replace(/&/g, "and"))];
}

/**
 * Parses the response of the India Post lookup (api.postalpincode.in):
 * `[{ Status: "Success", PostOffice: [{ Name, District, State, Block, ... }] }]`.
 * Returns null for "no records" and anything unrecognisable.
 */
export function parseIndiaPostResponse(pincode: string, body: unknown): PincodeInfo | null {
  const first = Array.isArray(body) ? body[0] : null;
  if (!first || typeof first !== "object") return null;
  const { Status, PostOffice } = first as { Status?: string; PostOffice?: unknown };
  if (Status !== "Success" || !Array.isArray(PostOffice) || PostOffice.length === 0) return null;

  const offices = PostOffice.filter((office): office is Record<string, unknown> => typeof office === "object" && office !== null);
  const text = (value: unknown) => (typeof value === "string" && value.trim() && value.trim().toUpperCase() !== "NA" ? value.trim() : "");

  // A pincode can straddle districts only on bad data; take the most common one.
  const tally = (pick: (office: Record<string, unknown>) => string) => {
    const counts = new Map<string, number>();
    for (const office of offices) {
      const value = pick(office);
      if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  };
  const state = tally((office) => text(office.State));
  const district = tally((office) => text(office.District));
  if (!state || !district) return null;
  // India Post has no "city": the block (taluk / town) is the closest, then the district.
  const city = tally((office) => text(office.Block)) || district;

  const seen = new Set<string>();
  const postOffices: PostOffice[] = [];
  for (const office of offices) {
    const name = text(office.Name);
    if (!name || seen.has(nameKey(name))) continue;
    seen.add(nameKey(name));
    postOffices.push({
      name: titleCase(name),
      ...(text(office.BranchType) && { branchType: text(office.BranchType) }),
      ...(text(office.DeliveryStatus) && { deliveryStatus: text(office.DeliveryStatus) }),
    });
  }
  return { pincode, stateName: titleCase(state), districtName: titleCase(district), cityName: titleCase(city), postOffices };
}

export type ImportRow = { line: number; pincode: string; stateName?: string; districtName?: string; cityName?: string; remarks?: string };
export type ImportIssue = { line: number; pincode: string; reason: string };

/** Splits one CSV record, honouring "quoted, values" and "" escapes. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') { current += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else current += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { cells.push(current); current = ""; }
    else current += char;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

const HEADER_ALIASES: Record<string, keyof Omit<ImportRow, "line">> = {
  pincode: "pincode", pin: "pincode", pincodes: "pincode", postalcode: "pincode", zip: "pincode",
  state: "stateName", statename: "stateName",
  district: "districtName", districtname: "districtName",
  city: "cityName", cityname: "cityName", town: "cityName", citytown: "cityName",
  remarks: "remarks", remark: "remarks", notes: "remarks",
};

export const MAX_IMPORT_ROWS = 500;

/**
 * Reads an import file: a header row with a `pincode` column (state, district,
 * city and remarks are optional), or a plain list of pincodes with no header.
 * Invalid and repeated pincodes are reported, not silently dropped.
 */
export function parseImportCsv(text: string): { rows: ImportRow[]; issues: ImportIssue[]; tooMany: boolean } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const rows: ImportRow[] = [];
  const issues: ImportIssue[] = [];
  const seen = new Set<string>();

  let columns: (keyof Omit<ImportRow, "line"> | undefined)[] | null = null;
  let counted = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (!raw.trim()) continue;
    const cells = splitCsvLine(raw);

    if (columns === null) {
      const mapped = cells.map((cell) => HEADER_ALIASES[cell.toLowerCase().replace(/[^a-z]/g, "")]);
      if (mapped.includes("pincode")) { columns = mapped; continue; }
      columns = ["pincode"]; // headerless: the first column is the pincode
    }

    counted += 1;
    if (counted > MAX_IMPORT_ROWS) return { rows, issues, tooMany: true };
    const record: Partial<Record<keyof Omit<ImportRow, "line">, string>> = {};
    columns.forEach((column, i) => { if (column && cells[i]) record[column] = cells[i]; });
    const line = index + 1;
    const pincode = normalisePincode(record.pincode ?? "");
    if (!pincode) { issues.push({ line, pincode: record.pincode ?? "", reason: "Not a valid 6-digit pincode" }); continue; }
    if (seen.has(pincode)) { issues.push({ line, pincode, reason: "Repeated in this file" }); continue; }
    seen.add(pincode);
    rows.push({ line, pincode, stateName: record.stateName, districtName: record.districtName, cityName: record.cityName, remarks: record.remarks?.slice(0, 500) });
  }
  return { rows, issues, tooMany: false };
}

export type Serviceability =
  | { ok: true }
  | { ok: false; reason: "INVALID_COUNTRY" | "INVALID_PINCODE" | "NOT_FOUND" | "INACTIVE" };

/** The one rule: India, a valid pincode, and a master record that is switched on. */
export function decideServiceability(input: { countryCode: string; pincode: unknown }, record: { isServiceable: boolean } | null): Serviceability {
  if (input.countryCode.toUpperCase() !== SERVICEABLE_COUNTRY.code) return { ok: false, reason: "INVALID_COUNTRY" };
  if (!normalisePincode(input.pincode)) return { ok: false, reason: "INVALID_PINCODE" };
  if (!record) return { ok: false, reason: "NOT_FOUND" };
  return record.isServiceable ? { ok: true } : { ok: false, reason: "INACTIVE" };
}
