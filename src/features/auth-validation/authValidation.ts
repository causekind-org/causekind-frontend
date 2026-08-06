import { PHONE_LENGTHS } from "@/lib/phone";

/**
 * Pure validation rules for the auth forms.
 *
 * <p>Every rule is synchronous, side-effect free, and returns a **stable key**
 * rather than a sentence. Translation happens at the edge, in the component, so
 * these can be unit-reasoned about without a locale and so a rule can never
 * accidentally hardcode English into the form.
 *
 * <p>Rules mirror the backend DTOs exactly — see `RegisterRequest.java` and
 * `LoginRequest.java`. Anything stricter here would reject values the server
 * accepts; anything looser just moves the failure to a round-trip.
 */

export type FieldStatus = "pristine" | "neutral" | "invalid" | "valid";

export type RuleResult =
  | { ok: true; successKey?: string }
  | { ok: false; errorKey: string; params?: Record<string, string | number> };

const OK: RuleResult = { ok: true };
const fail = (errorKey: string, params?: Record<string, string | number>): RuleResult =>
  ({ ok: false, errorKey, params });

/** Deliberately permissive, matching Jakarta's @Email rather than RFC 5322. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** RegisterRequest: @Email @NotBlank @Size(max = 150). */
export function validateEmail(raw: string): RuleResult {
  const value = raw.trim();
  if (!value) return fail("emailRequired");
  if (!EMAIL_RE.test(value)) return fail("emailInvalid");
  if (value.length > 150) return fail("emailTooLong", { max: 150 });
  // Format only. This must never be read as "this account exists" — the form
  // does no availability lookup, by design.
  return { ok: true, successKey: "emailFormatValid" };
}

/**
 * LoginRequest: `@NotBlank` only.
 *
 * <p>The 8-character minimum belongs to registration. Applying it here would
 * lock out every account created under an older rule, and would leak the shape
 * of a stored password. There is also no success key: a non-empty password is
 * not a *correct* password, and only the server can say.
 */
export function validateLoginPassword(value: string): RuleResult {
  if (!value) return fail("passwordRequired");
  return OK;
}

/** RegisterRequest: @NotBlank @Size(min = 8). Nothing else — no strength rules. */
export function validateRegisterPassword(value: string): RuleResult {
  if (!value) return fail("passwordRequired");
  if (value.length < 8) return fail("passwordTooShort", { min: 8 });
  return { ok: true, successKey: "passwordValid" };
}

/**
 * RegisterRequest: @NotBlank @Size(min = 2, max = 100).
 *
 * <p>No word-count or alphabet rule: mononyms are real, and so are scripts with
 * no spaces. Length is counted on the trimmed value, which is what gets sent.
 */
export function validateFullName(raw: string): RuleResult {
  const value = raw.trim();
  if (!value) return fail("fullNameRequired");
  if (value.length < 2) return fail("fullNameTooShort", { min: 2 });
  if (value.length > 100) return fail("fullNameTooLong", { max: 100 });
  return { ok: true, successKey: "fullNameValid" };
}

/**
 * Phone, against the value that will actually be sent (`dialCode + national`).
 *
 * <p>Two tiers. Where `PHONE_LENGTHS` knows the country, the national part must
 * be exactly that long. Where it does not, the combined number is checked
 * against the backend's own rule — `^\+?(?=(?:\D*\d){10,15}\D*$)[0-9\s-]+$`,
 * i.e. 10-15 digits in total. The old four-digit floor accepted values the
 * server then rejected.
 */
export function validatePhone(national: string, dialCountry: string, dialCode: string): RuleResult {
  const digits = national.replace(/\D/g, "");
  if (!digits) return fail("phoneRequired");

  const expected = PHONE_LENGTHS[dialCountry];
  if (expected) {
    if (digits.length !== expected) return fail("phoneExactDigits", { count: expected });
    return { ok: true, successKey: "phoneFormatValid" };
  }

  const total = `${dialCode}${digits}`.replace(/\D/g, "").length;
  if (total < 10 || total > 15) return fail("phoneInvalid");
  return { ok: true, successKey: "phoneFormatValid" };
}

export function validateCountry(countryIso: string): RuleResult {
  if (!countryIso) return fail("countryRequired");
  return OK;
}

/** Only required when the chosen country actually publishes states. */
export function validateState(stateIso: string, hasStateOptions: boolean): RuleResult {
  if (!hasStateOptions) return OK;
  if (!stateIso) return fail("stateRequired");
  return OK;
}

/**
 * City is satisfied by either a picked option or trimmed free text — GPS and
 * datasets with no match both land in the free-text path.
 */
export function validateCity(cityValue: string, cityFreeText: string, useFreeText: boolean): RuleResult {
  const value = useFreeText ? cityFreeText.trim() : cityValue;
  if (!value) return fail("cityRequired");
  return OK;
}

/** Only DONOR and DONEE are registerable roles. */
export function validateRole(role: string): RuleResult {
  if (role !== "DONOR" && role !== "DONEE") return fail("roleRequired");
  return OK;
}

/**
 * Maps a server message onto a field.
 *
 * <p>Matching is on substrings the backend actually emits. Anything unmatched
 * returns `null` so the caller shows it as a form-level alert — pinning an
 * unrecognised message to a guessed field is worse than not pinning it at all,
 * because the user then "fixes" a field that was never the problem.
 */
export function mapServerErrorToField(message: string): { field: string; errorKey: string } | null {
  const m = message.toLowerCase();

  if (m.includes("email already") || m.includes("already registered") && m.includes("email")) {
    return { field: "email", errorKey: "emailAlreadyRegistered" };
  }
  if (m.includes("phone already") || m.includes("phone number already")) {
    return { field: "phone", errorKey: "phoneAlreadyRegistered" };
  }
  if (m.includes("already registered")) {
    // Ambiguous which identifier — email is the one this form initiates on.
    return { field: "email", errorKey: "emailAlreadyRegistered" };
  }
  if (m.includes("invalid email")) return { field: "email", errorKey: "emailInvalid" };
  if (m.includes("phone must be") || m.includes("invalid phone")) {
    return { field: "phone", errorKey: "phoneInvalid" };
  }
  if (m.includes("role")) return { field: "role", errorKey: "roleRequired" };
  if (m.includes("password must be at least")) {
    return { field: "password", errorKey: "passwordTooShort" };
  }
  if (m.includes("full name") || m.includes("fullname")) {
    return { field: "fullName", errorKey: "fullNameTooShort" };
  }
  return null;
}

/**
 * True when a login failure should be reported generically.
 *
 * <p>A 401 must not say which half was wrong, and must not confirm that an
 * account exists. Distinct operational states — locked, suspended, deactivated,
 * rate-limited — are authoritative and are passed through verbatim.
 */
export function isGenericCredentialFailure(message: string): boolean {
  const m = message.toLowerCase();
  const distinct = ["locked", "suspended", "deactivated", "disabled", "too many", "attempts", "network", "unavailable", "expired"];
  if (distinct.some(d => m.includes(d))) return false;
  return true;
}
