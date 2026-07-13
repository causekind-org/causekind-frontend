// ── Phone number digit counts by ISO country code ────────────────────────────
// Shared by the registration form and the donee request form so every phone
// field enforces the same per-country national-number length.
export const PHONE_LENGTHS: Record<string, number> = {
  // South Asia
  IN: 10, PK: 10, BD: 10, LK: 9, NP: 10, MV: 7, BT: 8, AF: 9,
  // East / SE Asia
  CN: 11, JP: 11, KR: 10, TW: 9, HK: 8, SG: 8, MY: 10,
  PH: 10, TH: 9, VN: 9, ID: 12, MM: 9, KH: 9, LA: 9, MN: 8,
  // Middle East
  AE: 9, SA: 9, QA: 8, KW: 8, BH: 8, OM: 8, JO: 9, LB: 8,
  IQ: 10, IR: 10, SY: 9, YE: 9, IL: 9,
  // Africa
  EG: 10, MA: 9, DZ: 9, TN: 8, LY: 9, NG: 10, ZA: 9,
  KE: 9, GH: 9, ET: 9, TZ: 9, UG: 9, ZM: 9, ZW: 9,
  // Europe
  DE: 11, FR: 9, IT: 10, ES: 9, NL: 9, BE: 9, PT: 9,
  CH: 9, AT: 10, SE: 9, NO: 8, DK: 8, FI: 10, PL: 9,
  RU: 10, UA: 9, GR: 10, TR: 10,
  // Americas
  US: 10, CA: 10, MX: 10, BR: 11, AR: 10, CO: 10, CL: 9, PE: 9, VE: 10,
  // Oceania
  AU: 9, NZ: 9,
  // UK
  GB: 10,
};

export function getDialCode(isoCode: string, dialCodes: { value: string; phonecode?: string }[]): string {
  const country = dialCodes.find((c) => c.value === isoCode);
  if (!country?.phonecode) return "";
  return `+${country.phonecode.replace(/^\+/, "")}`;
}
