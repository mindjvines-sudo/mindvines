import path from "node:path";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(path.resolve(process.cwd()));

/**
 * One-off rollout step for pincode-based registration. Registration only
 * accepts pincodes in the serviceable-locations list, so on a site that
 * already has customers, run this first: every Indian pincode that has a
 * completed registration is added (looked up from India Post) as ACTIVE, and
 * the areas you already serve stay open. Safe to run again: existing
 * pincodes are skipped. Nothing in any registration is changed.
 *
 *   npm run setup:locations              add them
 *   npm run setup:locations -- --dry-run just list what would be added
 */
async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const { connectToDatabase } = await import("../src/lib/mongodb");
  const { Registration } = await import("../src/models/Registration");
  const { importLocations } = await import("../src/services/location.service");
  const { normalisePincode } = await import("../src/lib/locations/pincode");

  await connectToDatabase();
  const raw: string[] = await Registration.distinct("address.postalCode", { status: "COMPLETED", "address.countryCode": "IN" });
  const rows = raw.flatMap((value, index) => {
    const pincode = normalisePincode(value);
    return pincode ? [{ line: index + 1, pincode }] : [];
  });
  console.log(`${rows.length} Indian pincodes with registrations (${raw.length - rows.length} unusable values ignored).`);
  if (dryRun) return console.log(rows.map((row) => row.pincode).join(", "));

  const result = await importLocations(rows, undefined, undefined, "backfill");
  console.log(`Added ${result.created.length}; already listed ${result.skipped.length}; not added ${result.failed.length}.`);
  for (const issue of result.failed) console.log(`  ${issue.pincode}: ${issue.reason}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
