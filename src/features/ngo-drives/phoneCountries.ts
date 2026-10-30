/**
 * Country codes for a drive's contact phone. India stays the default and is
 * stored as before (10 digits); other countries are stored as +<code><number>.
 */
export const PHONE_COUNTRIES = [
  { code: "+91", label: "India (+91)", pattern: /^[6-9]\d{9}$/, hint: "10 digits, starting with 6 to 9" },
  { code: "+977", label: "Nepal (+977)", pattern: /^9\d{9}$/, hint: "10 digits, starting with 9" },
  { code: "+880", label: "Bangladesh (+880)", pattern: /^1\d{9}$/, hint: "10 digits, starting with 1" },
  { code: "+94", label: "Sri Lanka (+94)", pattern: /^7\d{8}$/, hint: "9 digits, starting with 7" },
  { code: "+971", label: "UAE (+971)", pattern: /^5\d{8}$/, hint: "9 digits, starting with 5" },
  { code: "+44", label: "United Kingdom (+44)", pattern: /^7\d{9}$/, hint: "10 digits, starting with 7" },
  { code: "+1", label: "USA / Canada (+1)", pattern: /^[2-9]\d{9}$/, hint: "10 digits" },
] as const;

export type PhoneCountryCode = (typeof PHONE_COUNTRIES)[number]["code"];

export function phoneCountry(code: string) {
  return PHONE_COUNTRIES.find(c => c.code === code) ?? PHONE_COUNTRIES[0];
}

/** An error message, or null when the number is valid for the country. */
export function phoneError(code: string, digits: string): string | null {
  const c = phoneCountry(code);
  return c.pattern.test(digits) ? null : `Enter a valid number for ${c.label}: ${c.hint}.`;
}

/** What the API stores: 10 digits for India (as before), +<code><number> otherwise. */
export function toStoredPhone(code: string, digits: string): string {
  return code === "+91" ? digits : `${code}${digits}`;
}

/** Back from the stored value to { code, digits }. */
export function fromStoredPhone(stored: string | null | undefined): { code: string; digits: string } {
  const v = (stored ?? "").trim();
  if (!v.startsWith("+")) return { code: "+91", digits: v.replace(/\D/g, "") };
  const match = [...PHONE_COUNTRIES].sort((a, b) => b.code.length - a.code.length).find(c => v.startsWith(c.code));
  return match ? { code: match.code, digits: v.slice(match.code.length).replace(/\D/g, "") } : { code: "+91", digits: v.replace(/\D/g, "") };
}
