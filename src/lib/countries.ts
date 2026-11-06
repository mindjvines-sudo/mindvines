/**
 * Countries for the registration form: ISO 3166 code and international
 * dialling code. Names come from the browser or server's own `Intl` data, so
 * they read naturally and don't need maintaining here.
 */
const DATA =
  "AF93 AX358 AL355 DZ213 AS1684 AD376 AO244 AI1264 AG1268 AR54 AM374 AW297 AU61 AT43 AZ994 BS1242 BH973 BD880 BB1246 BY375 " +
  "BE32 BZ501 BJ229 BM1441 BT975 BO591 BQ599 BA387 BW267 BR55 IO246 VG1284 BN673 BG359 BF226 BI257 KH855 CM237 CA1 CV238 " +
  "KY1345 CF236 TD235 CL56 CN86 CX61 CC61 CO57 KM269 CG242 CD243 CK682 CR506 CI225 HR385 CU53 CW599 CY357 CZ420 DK45 DJ253 " +
  "DM1767 DO1809 EC593 EG20 SV503 GQ240 ER291 EE372 SZ268 ET251 FK500 FO298 FJ679 FI358 FR33 GF594 PF689 GA241 GM220 GE995 " +
  "DE49 GH233 GI350 GR30 GL299 GD1473 GP590 GU1671 GT502 GG44 GN224 GW245 GY592 HT509 HN504 HK852 HU36 IS354 IN91 ID62 IR98 " +
  "IQ964 IE353 IM44 IL972 IT39 JM1876 JP81 JE44 JO962 KZ7 KE254 KI686 XK383 KW965 KG996 LA856 LV371 LB961 LS266 LR231 LY218 " +
  "LI423 LT370 LU352 MO853 MG261 MW265 MY60 MV960 ML223 MT356 MH692 MQ596 MR222 MU230 YT262 MX52 FM691 MD373 MC377 MN976 " +
  "ME382 MS1664 MA212 MZ258 MM95 NA264 NR674 NP977 NL31 NC687 NZ64 NI505 NE227 NG234 NU683 NF672 KP850 MK389 MP1670 NO47 " +
  "OM968 PK92 PW680 PS970 PA507 PG675 PY595 PE51 PH63 PL48 PT351 PR1787 QA974 RE262 RO40 RU7 RW250 BL590 SH290 KN1869 LC1758 " +
  "MF590 PM508 VC1784 WS685 SM378 ST239 SA966 SN221 RS381 SC248 SL232 SG65 SX1721 SK421 SI386 SB677 SO252 ZA27 KR82 SS211 " +
  "ES34 LK94 SD249 SR597 SE46 CH41 SY963 TW886 TJ992 TZ255 TH66 TL670 TG228 TK690 TO676 TT1868 TN216 TR90 TM993 TC1649 TV688 " +
  "UG256 UA380 AE971 GB44 US1 UY598 UZ998 VU678 VA39 VE58 VN84 VI1340 WF681 EH212 YE967 ZM260 ZW263";

export type Country = { code: string; dial: string };

export const COUNTRIES: Country[] = DATA.split(" ").map((entry) => ({ code: entry.slice(0, 2), dial: entry.slice(2) }));

const BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]));

export const DEFAULT_COUNTRY = "IN";

export function findCountry(code: string | undefined | null) {
  return code ? BY_CODE.get(code.toUpperCase()) : undefined;
}

let displayNames: Intl.DisplayNames | null | undefined;

/** "IN" → "India". */
export function countryName(code: string) {
  if (displayNames === undefined) {
    try {
      displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      displayNames = null;
    }
  }
  return displayNames?.of(code) ?? code;
}

/** Every country, by name. */
export function countriesByName() {
  return COUNTRIES.map((country) => ({ ...country, name: countryName(country.code) })).sort((a, b) => a.name.localeCompare(b.name));
}

/** Postal code formats for the countries that have a fixed one; anywhere else takes 3–10 letters, digits, spaces or dashes. */
const POSTAL: Record<string, { pattern: RegExp; message: string }> = {
  IN: { pattern: /^\d{6}$/, message: "Enter a 6-digit PIN code" },
  US: { pattern: /^\d{5}(-\d{4})?$/, message: "Enter a 5-digit ZIP code" },
  GB: { pattern: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, message: "Enter a valid UK postcode" },
  CA: { pattern: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i, message: "Enter a valid postal code, like K1A 0B1" },
  AU: { pattern: /^\d{4}$/, message: "Enter a 4-digit postcode" },
  SG: { pattern: /^\d{6}$/, message: "Enter a 6-digit postal code" },
};

export function postalCodeProblem(countryCode: string, postalCode: string): string | null {
  const value = postalCode.trim();
  const rule = POSTAL[countryCode.toUpperCase()];
  if (rule) return rule.pattern.test(value) ? null : rule.message;
  return /^[A-Za-z0-9 -]{3,10}$/.test(value) ? null : "Enter a valid postal code";
}

/** Mobile numbers: India's are ten digits starting 6–9; elsewhere 4–14 digits, up to 15 with the country code. */
export function phoneProblem(countryCode: string, nationalNumber: string): string | null {
  const country = findCountry(countryCode);
  if (!country) return "Choose the country code";
  if (country.code === "IN") return /^[6-9]\d{9}$/.test(nationalNumber) ? null : "Enter a valid 10-digit mobile number";
  return /^\d{4,14}$/.test(nationalNumber) && country.dial.length + nationalNumber.length <= 15 ? null : "Enter a valid mobile number";
}

/** Digits only, without the country's own dialling code or a leading 0 typed in front. */
export function normalisePhone(countryCode: string, value: string) {
  const dial = findCountry(countryCode)?.dial ?? "";
  let digits = value.replace(/\D/g, "");
  if (dial && digits.startsWith(dial) && digits.length > dial.length + 6) digits = digits.slice(dial.length);
  return digits.replace(/^0+(?=\d{6})/, "");
}
