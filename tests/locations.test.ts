import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after, before } from "node:test";
import {
  NOT_SERVICEABLE_MESSAGE,
  decideServiceability,
  normalisePincode,
  parseImportCsv,
  parseIndiaPostResponse,
  titleCase,
} from "../src/lib/locations/pincode";
import type { PincodeInfo } from "../src/lib/locations/pincode";
import type { PincodeProvider } from "../src/lib/locations/provider";
import { ProviderUnavailableError } from "../src/lib/locations/provider";

/* ------------------------------------------------------------- pure rules */

test("only six-digit Indian pincodes are valid", () => {
  assert.equal(normalisePincode("560001"), "560001");
  assert.equal(normalisePincode(" 560 001 "), "560001");
  for (const bad of ["56001", "5600011", "056001", "abcdef", "56000a", "", null, undefined, 560001]) assert.equal(normalisePincode(bad), null, String(bad));
});

test("India Post data: several post offices under one pincode, names tidied, 'NA' ignored", () => {
  const info = parseIndiaPostResponse("560001", [
    {
      Status: "Success",
      PostOffice: [
        { Name: "Bangalore ", BranchType: "Head Post Office", DeliveryStatus: "Delivery", District: "Bangalore", Block: "Bangalore North", State: "Karnataka" },
        { Name: "Bangalore Bazaar", BranchType: "Sub Post Office", District: "Bangalore", Block: "Bangalore North", State: "Karnataka" },
        { Name: "BANGALORE", District: "Bangalore", Block: "NA", State: "Karnataka" },
      ],
    },
  ]);
  assert.ok(info);
  assert.equal(info.stateName, "Karnataka");
  assert.equal(info.districtName, "Bangalore");
  assert.equal(info.cityName, "Bangalore North");
  assert.deepEqual(info.postOffices.map((office) => office.name), ["Bangalore", "Bangalore Bazaar"]);
});

test("India Post 'no records' and junk are not pincodes", () => {
  assert.equal(parseIndiaPostResponse("999999", [{ Status: "Error", PostOffice: null }]), null);
  assert.equal(parseIndiaPostResponse("999999", [{ Status: "404", PostOffice: [] }]), null);
  assert.equal(parseIndiaPostResponse("999999", "nope"), null);
  assert.equal(parseIndiaPostResponse("999999", null), null);
});

test("title-casing only touches all-capitals names", () => {
  assert.equal(titleCase("NORTH WEST DELHI"), "North West Delhi");
  assert.equal(titleCase("H.A.L II Stage"), "H.A.L II Stage");
});

test("CSV import reports invalid and repeated pincodes, with or without a header", () => {
  const withHeader = parseImportCsv("Pincode,City,Remarks\n560001,Bengaluru,Pilot\n560001,Bengaluru,again\n12345,Nowhere,\nabc,x,\n400001,,\n");
  assert.deepEqual(withHeader.rows.map((row) => row.pincode), ["560001", "400001"]);
  assert.equal(withHeader.rows[0].cityName, "Bengaluru");
  assert.deepEqual(withHeader.issues.map((issue) => [issue.line, issue.reason]), [
    [3, "Repeated in this file"],
    [4, "Not a valid 6-digit pincode"],
    [5, "Not a valid 6-digit pincode"],
  ]);
  const bare = parseImportCsv("110001\n110002\n\n");
  assert.deepEqual(bare.rows.map((row) => row.pincode), ["110001", "110002"]);
  assert.equal(parseImportCsv("pincode\n" + Array.from({ length: 501 }, (_, i) => String(100000 + i)).join("\n")).tooMany, true);
});

test("serviceability: India, valid pincode, and a record that is switched on", () => {
  const on = { isServiceable: true };
  assert.deepEqual(decideServiceability({ countryCode: "IN", pincode: "560001" }, on), { ok: true });
  assert.deepEqual(decideServiceability({ countryCode: "in", pincode: "560001" }, on), { ok: true });
  assert.deepEqual(decideServiceability({ countryCode: "US", pincode: "560001" }, on), { ok: false, reason: "INVALID_COUNTRY" });
  assert.deepEqual(decideServiceability({ countryCode: "IN", pincode: "5600" }, on), { ok: false, reason: "INVALID_PINCODE" });
  assert.deepEqual(decideServiceability({ countryCode: "IN", pincode: "560001" }, null), { ok: false, reason: "NOT_FOUND" });
  assert.deepEqual(decideServiceability({ countryCode: "IN", pincode: "560001" }, { isServiceable: false }), { ok: false, reason: "INACTIVE" });
});

/* ------------------------------------------- database-backed scenarios
 * These run against a throwaway mongod started on a free port in a temp
 * directory, never the project's database. Skipped when mongod isn't installed. */

let mongod: ChildProcess | undefined;
let dataDir = "";
let ready = false;

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });

before(async () => {
  try {
    dataDir = mkdtempSync(path.join(tmpdir(), "mindvines-locations-"));
    const port = await freePort();
    mongod = spawn("mongod", ["--dbpath", dataDir, "--port", String(port), "--bind_ip", "127.0.0.1", "--quiet"], { stdio: "ignore" });
    mongod.on("error", () => {});
    process.env.MONGODB_URI = `mongodb://127.0.0.1:${port}/mindvines_locations_test`;
    process.env.SESSION_SECRET ??= "test-secret-test-secret-test-secret-123";
    const { default: mongoose } = await import("mongoose");
    for (let attempt = 0; attempt < 40 && !ready; attempt += 1) {
      try {
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 500 });
        ready = true;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  } catch {
    ready = false;
  }
});

after(async () => {
  const { default: mongoose } = await import("mongoose");
  await mongoose.disconnect().catch(() => {});
  if (mongod && mongod.exitCode === null) {
    const exited = new Promise((resolve) => mongod!.once("exit", resolve));
    mongod.kill("SIGTERM");
    await exited; // let it finish writing before its folder is removed
  }
  if (dataDir) rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

const db = (name: string, fn: () => Promise<void>) =>
  test(name, async (context) => {
    if (!ready) return context.skip("mongod is not available");
    await fn();
  });

const fakeProvider = (known: Record<string, PincodeInfo | "down">): PincodeProvider => ({
  name: "fake",
  async lookup(pincode) {
    const found = known[pincode];
    if (found === "down") throw new ProviderUnavailableError();
    return found ?? null;
  },
});

const BENGALURU: PincodeInfo = {
  pincode: "560001", stateName: "Karnataka", districtName: "Bangalore", cityName: "Bengaluru",
  postOffices: [{ name: "Bangalore", branchType: "Head Post Office" }, { name: "Bangalore Bazaar" }, { name: "CMM Court" }],
};
const MUMBAI: PincodeInfo = { pincode: "400001", stateName: "Maharashtra", districtName: "Mumbai", cityName: "Mumbai", postOffices: [{ name: "Mumbai GPO" }] };

async function modules() {
  const [location, registration, models, checkout] = await Promise.all([
    import("../src/services/location.service"),
    import("../src/services/registration.service"),
    import("../src/models/Registration"),
    import("../src/services/checkout.service"),
  ]);
  const { ServiceableLocation } = await import("../src/models/ServiceableLocation");
  const { SubscriptionPlan } = await import("../src/models/SubscriptionPlan");
  return { location, registration, Registration: models.Registration, ServiceableLocation, SubscriptionPlan, checkout };
}

const details = (overrides: Record<string, unknown> = {}) => ({
  childName: "Asha", childDob: "2017-06-01", school: "Greenwood High", parentName: "Priya Rao", countryCode: "IN",
  addressLine1: "12 MG Road", addressLine2: "", city: "Somewhere Else", postalCode: "560001", postOffice: "",
  phoneCountry: "IN", phone: "9876543210", email: "priya@example.com", acceptTerms: true, allowFeature: false, whatsappUpdates: false,
  ...overrides,
});

async function plan() {
  const { SubscriptionPlan } = await modules();
  return SubscriptionPlan.create({ name: "Test plan", description: "d", ageGroup: "6-8", price: 1000, durationMonths: 3, journalCount: 3, status: "PUBLISHED" });
}

async function clean() {
  const { location, Registration, ServiceableLocation, SubscriptionPlan } = await modules();
  void location;
  await Promise.all([Registration.deleteMany({}), ServiceableLocation.deleteMany({}), SubscriptionPlan.deleteMany({})]);
}

db("1. an admin adds a valid pincode; geography comes from the provider's data and is normalised", async () => {
  await clean();
  const { location, ServiceableLocation } = await modules();
  const found = await location.lookupPincodeForAdmin("560 001", fakeProvider({ "560001": BENGALURU }));
  assert.equal(found.existing, null);
  assert.equal(found.info?.cityName, "Bengaluru");
  const created = await location.createLocation({ ...BENGALURU, isServiceable: true }, undefined);
  const saved = await ServiceableLocation.findById(created._id).lean();
  assert.equal(saved?.pincode, "560001");
  assert.equal(saved?.stateCode, "KA");
  assert.equal(saved?.countryCode, "IN");
  assert.equal(saved?.postOffices.length, 3);
  await assert.rejects(() => location.lookupPincodeForAdmin("999999", fakeProvider({})), { code: "NOT_FOUND" });
  await assert.rejects(() => location.lookupPincodeForAdmin("12345", fakeProvider({})), { code: "INVALID_PINCODE" });
  await assert.rejects(() => location.lookupPincodeForAdmin("560002", fakeProvider({ "560002": "down" })), { code: "LOOKUP_FAILED" });
});

db("2. an existing pincode is a duplicate, even when added at the same moment", async () => {
  await clean();
  const { location, ServiceableLocation } = await modules();
  await location.createLocation({ ...BENGALURU, isServiceable: true });
  await assert.rejects(() => location.createLocation({ ...BENGALURU, isServiceable: true }), { code: "DUPLICATE" });
  const lookedUp = await location.lookupPincodeForAdmin("560001", fakeProvider({ "560001": BENGALURU }));
  assert.ok(lookedUp.existing);

  const races = await Promise.allSettled(Array.from({ length: 6 }, () => location.createLocation({ ...MUMBAI, isServiceable: true })));
  assert.equal(races.filter((race) => race.status === "fulfilled").length, 1);
  assert.equal(await ServiceableLocation.countDocuments({ pincode: "400001" }), 1);
});

db("3. a parent entering an approved pincode gets its state, district, city and post offices", async () => {
  await clean();
  const { location } = await modules();
  await location.createLocation({ ...BENGALURU, isServiceable: true });
  const verified = await location.verifyServiceable({ countryCode: "IN", pincode: "560001" });
  assert.equal(verified.stateName, "Karnataka");
  assert.equal(verified.districtName, "Bangalore");
  assert.equal(verified.cityName, "Bengaluru");
  assert.deepEqual(verified.postOffices, ["Bangalore", "Bangalore Bazaar", "CMM Court"]);
});

db("4/5. inactive, unlisted, malformed and non-Indian pincodes are refused with the friendly message", async () => {
  await clean();
  const { location } = await modules();
  const created = await location.createLocation({ ...BENGALURU, isServiceable: true });
  await location.setLocationStatus(created._id.toString(), false, "000000000000000000000000".replace(/0/g, "a"));
  for (const [country, pincode, reason] of [["IN", "560001", "INACTIVE"], ["IN", "700001", "NOT_FOUND"], ["IN", "5600", "INVALID_PINCODE"], ["US", "560001", "INVALID_COUNTRY"]] as const) {
    await assert.rejects(() => location.verifyServiceable({ countryCode: country, pincode }), (error: unknown) => {
      assert.ok(error instanceof location.NotServiceableError);
      assert.equal(error.reason, reason);
      assert.equal(error.message, reason === "INVALID_PINCODE" ? "Enter a valid 6-digit PIN code." : NOT_SERVICEABLE_MESSAGE);
      return true;
    });
  }
});

db("6. a direct API request cannot bypass the check, or choose its own city", async () => {
  await clean();
  const { location, Registration } = await modules();
  const route = await import("../src/app/api/registrations/route");
  const publicRoute = await import("../src/app/api/locations/pincode/[pincode]/route");
  const created = await location.createLocation({ ...BENGALURU, isServiceable: false });
  const savedPlan = await plan();
  const post = (body: unknown) =>
    route.POST(new Request("http://test/api/registrations", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "9.9.9.9" }, body: JSON.stringify(body) }));

  // switched off: refused, nothing saved
  let response = await post({ planId: savedPlan._id.toString(), details: details() });
  assert.equal(response.status, 403);
  assert.equal(((await response.json()) as { code: string }).code, "NOT_SERVICEABLE");
  assert.equal(await Registration.countDocuments(), 0);

  // not in the list at all, and abroad
  assert.equal((await post({ planId: savedPlan._id.toString(), details: details({ postalCode: "700001" }) })).status, 403);
  assert.equal((await post({ planId: savedPlan._id.toString(), details: details({ countryCode: "US", postalCode: "10001" }) })).status, 403);

  // switched on: accepted, and the address is the master list's, not the request's
  await location.setLocationStatus(created._id.toString(), true, "aaaaaaaaaaaaaaaaaaaaaaaa");
  response = await post({ planId: savedPlan._id.toString(), details: details({ city: "Atlantis", postOffice: "Bangalore Bazaar" }) });
  assert.equal(response.status, 200);
  const saved = await Registration.findOne({}).lean();
  assert.equal(saved?.address?.city, "Bengaluru");
  assert.equal(saved?.address?.state, "Karnataka");
  assert.equal(saved?.address?.district, "Bangalore");
  assert.equal(saved?.address?.postOffice, "Bangalore Bazaar");
  assert.ok(saved?.address?.locationVerifiedAt);

  // a post office that isn't the pincode's is refused
  response = await post({ planId: savedPlan._id.toString(), details: details({ postOffice: "Elsewhere PO" }) });
  assert.equal(response.status, 400);

  // the public lookup tells nothing about switched-off pincodes
  await location.setLocationStatus(created._id.toString(), false, "aaaaaaaaaaaaaaaaaaaaaaaa");
  const lookup = await publicRoute.GET(new Request("http://test/api/locations/pincode/560001", { headers: { "x-forwarded-for": "9.9.9.8" } }), { params: Promise.resolve({ pincode: "560001" }) });
  const body = (await lookup.json()) as Record<string, unknown>;
  assert.equal(body.serviceable, false);
  assert.deepEqual(Object.keys(body).sort(), ["error", "serviceable"]);
});

db("7. deactivating a pincode never touches registered children, and payment is re-checked", async () => {
  await clean();
  const { location, registration, Registration, ServiceableLocation } = await modules();
  const created = await location.createLocation({ ...BENGALURU, isServiceable: true });
  const savedPlan = await plan();

  // A child who finished registering, and one part-way through.
  const done = await registration.saveRegistrationDetails({ planId: savedPlan._id.toString(), details: await parse(details()) });
  await Registration.updateOne({ _id: done.registrationId }, { $set: { status: "COMPLETED" }, $unset: { expiresAt: "" } });
  const draft = await registration.saveRegistrationDetails({ planId: savedPlan._id.toString(), details: await parse(details({ childName: "Ravi", email: "r@example.com" })) });

  const before = await Registration.findById(done.registrationId).lean();
  await location.setLocationStatus(created._id.toString(), false, "aaaaaaaaaaaaaaaaaaaaaaaa");
  assert.deepEqual(await Registration.findById(done.registrationId).lean(), before, "a registered child is unchanged");
  assert.equal((await location.listLocations({})).items[0].registered, 1);

  // The unfinished one is stopped when it reaches payment.
  await assert.rejects(() => registration.loadRegistrationForPayment(draft.registrationId, draft.token), (error: unknown) => error instanceof location.NotServiceableError);

  // A pincode with registrations can't be deleted; an unused one can.
  await assert.rejects(() => location.deleteLocation(created._id.toString()), { code: "IN_USE" });
  const unused = await location.createLocation({ ...MUMBAI, isServiceable: true });
  await location.deleteLocation(unused._id.toString());
  assert.equal(await ServiceableLocation.countDocuments({ pincode: "400001" }), 0);
});

db("8. one pincode, several post offices: one is chosen, or the only one is used", async () => {
  await clean();
  const { location } = await modules();
  await location.createLocation({ ...BENGALURU, isServiceable: true });
  await location.createLocation({ ...MUMBAI, isServiceable: true });
  const several = await location.verifiedAddressFields({ countryCode: "IN", pincode: "560001", postOffice: "cmm court" });
  assert.equal(several.fields.postOffice, "CMM Court");
  assert.equal((await location.verifiedAddressFields({ countryCode: "IN", pincode: "560001" })).fields.postOffice, undefined);
  assert.equal((await location.verifiedAddressFields({ countryCode: "IN", pincode: "400001" })).fields.postOffice, "Mumbai GPO");
  await assert.rejects(() => location.verifiedAddressFields({ countryCode: "IN", pincode: "560001", postOffice: "Nope" }), { code: "INVALID" });
});

db("9. CSV import adds the good rows and reports duplicates and invalid pincodes", async () => {
  await clean();
  const { location, ServiceableLocation } = await modules();
  await location.createLocation({ ...BENGALURU, isServiceable: true });
  const parsed = parseImportCsv("pincode\n560001\n400001\n400001\nabc\n999999\n110001\n");
  const provider = fakeProvider({ "560001": BENGALURU, "400001": MUMBAI, "110001": "down" });
  const result = await location.importLocations(parsed.rows, undefined, provider);
  assert.deepEqual(result.created.map((row) => row.pincode), ["400001"]);
  assert.deepEqual(result.skipped.map((row) => row.pincode), ["560001"]);
  assert.deepEqual(result.failed.map((row) => [row.pincode, row.reason]), [["999999", "Not a pincode India Post knows"], ["110001", "Postal lookup unavailable; try this row again"]]);
  assert.deepEqual(parsed.issues.map((issue) => issue.reason), ["Repeated in this file", "Not a valid 6-digit pincode"]);
  assert.equal(await ServiceableLocation.countDocuments(), 2);
});

db("10. registrations made before this feature still load, count and renew", async () => {
  await clean();
  const { location, Registration } = await modules();
  // An older registration: no state, district, post office or verification.
  const legacy = await Registration.create({
    reference: "MV-LEGACY", status: "COMPLETED", tokenHash: "x", plan: "aaaaaaaaaaaaaaaaaaaaaaaa",
    child: { name: "Old", dob: "2016-01-01", school: "School" },
    parent: { name: "P", email: "p@example.com", phoneCountry: "IN", phoneDial: "91", phone: "9876543210" },
    address: { countryCode: "IN", country: "India", line1: "1 Street", city: "Bangalore", postalCode: "560001" },
  });
  const loaded = await Registration.findById(legacy._id).lean();
  assert.equal(loaded?.address?.city, "Bangalore");
  assert.equal(loaded?.address?.state, undefined);

  // Not in the list (yet): the page still works and counts nothing; once listed, it is counted with its geography.
  assert.equal((await location.locationSummary()).registrationsFromListed, 0);
  await location.createLocation({ ...BENGALURU, isServiceable: false });
  assert.equal((await location.locationSummary()).registrationsFromListed, 1);
  assert.deepEqual(await location.registrationDistribution("state"), [{ label: "Karnataka", value: 1 }]);
  assert.deepEqual(await location.registrationDistribution("pincode"), [{ label: "560001", value: 1 }]);
  // Renewals never go through the location check: nothing in the renewal path imports it.
  const renewal = await import("node:fs").then((fs) => fs.readFileSync(path.join(process.cwd(), "src/services/renewal.service.ts"), "utf8"));
  assert.ok(!/verifyServiceable|location\.service/.test(renewal));
});

async function parse(input: Record<string, unknown>) {
  const { registrationDetailsSchema } = await import("../src/validations/registration.schema");
  return registrationDetailsSchema.parse(input);
}

db("admin access: only the Super Admin can manage locations", async () => {
  const { can } = await import("../src/lib/permissions");
  for (const action of ["create", "read", "update", "delete"] as const) {
    assert.equal(can("SUPER_ADMIN", action, "locations"), true);
    assert.equal(can("ADMIN", action, "locations"), false);
    assert.equal(can("EDITOR", action, "locations"), false);
  }
});
