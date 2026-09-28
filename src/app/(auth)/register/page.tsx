"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resolvePostAuthDestination } from "@/lib/postAuthDestination";
import { loginUrlFor } from "@/lib/safeRedirect";
import { Suspense } from "react";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { initiateRegistration, verifyRegistrationOtp, resendRegistrationOtp, registerNgo, googleAuth, googleComplete } from "@/lib/api";
import { Eye, EyeOff, MapPin, Package, HandHeart, Building2, Check, ArrowRight, ArrowLeft, type LucideIcon } from "lucide-react";
import { AnimatedEmailOtp } from "@/components/auth/AnimatedEmailOtp";
import { useGoogleLogin } from "@react-oauth/google";
import { useLocations } from "@/hooks/useLocations";
import { resolveLocationFromGPS } from "@/app/actions/locations";
import { SearchableSelect, type SelectOption } from "@/components/profile/SearchableSelect";
import { PHONE_LENGTHS, getDialCode } from "@/lib/phone";
import { cn } from "@/lib/utils";
import {
  mapServerErrorToField, validateCity, validateCountry, validateEmail, validateFullName,
  validatePhone, validateRegisterPassword, validateRole, validateState,
  validatePanNumber, validateOrganizationName,
  type FieldStatus,
} from "@/features/auth-validation/authValidation";
import { useTimedFieldValidation } from "@/features/auth-validation/useTimedFieldValidation";
import { ValidatedFieldFeedback } from "@/features/auth-validation/ValidatedFieldFeedback";
import { AuthFormAlert } from "@/features/auth-validation/AuthFormAlert";
import { useAuthOperation } from "@/features/auth-validation/useAuthOperation";
import { useReducedMotion } from "framer-motion";
import { FEATURES } from "@/lib/features";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive mt-1">{msg}</p>;
}

// ── Inline brand SVGs ──────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}



// ── helpers ───────────────────────────────────────────────────────────────────

function detectCountryCode(): string {
  if (typeof window === "undefined") return "IN";
  try {
    const lang = navigator.language || "";
    const parts = lang.split("-");
    if (parts.length >= 2) {
      const region = parts[parts.length - 1].toUpperCase();
      if (/^[A-Z]{2,3}$/.test(region)) return region;
    }
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? "";
    const lparts = locale.split("-");
    if (lparts.length >= 2) {
      const region = lparts[lparts.length - 1].toUpperCase();
      if (/^[A-Z]{2,3}$/.test(region)) return region;
    }
  } catch {
    // ignore
  }
  return "IN";
}

// ── Kindness-journey card pieces ─────────────────────────────────────────────
// Scoped to this card: nothing here restyles inputs or buttons elsewhere.

/** One row inside a SignupFieldGroup. Rows are separated by the group's dividers. */
const GROUP_ROW =
  "px-3 pt-2 pb-1.5 transition-colors first:rounded-t-[9px] last:rounded-b-[9px] " +
  "focus-within:bg-[#fbf3ea] dark:focus-within:bg-[#382c22]/60 " +
  "data-[invalid]:bg-red-50/70 dark:data-[invalid]:bg-red-950/20 data-[invalid]:shadow-[inset_3px_0_0_#dc2626]";
const ROW_LABEL = "block text-[11.5px] font-semibold text-stone-500 dark:text-stone-400";
/** 16px text so iOS Safari does not zoom on focus; ~44px row with the label. */
const ROW_INPUT =
  "block w-full min-w-0 min-h-10 bg-transparent border-0 p-0 text-base text-stone-900 dark:text-stone-100 " +
  "placeholder:text-[14px] placeholder:text-stone-400 dark:placeholder:text-zinc-500 focus:outline-none";
const PRIMARY_BUTTON =
  "inline-flex min-h-12 items-center justify-between gap-3 rounded-lg bg-[#b04a15] px-4 text-[14px] font-semibold text-white " +
  "hover:bg-[#963c0d] disabled:opacity-60 disabled:cursor-not-allowed transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900";

/**
 * A titled, bordered group of rows. Deliberately NOT overflow:hidden — the
 * SearchableSelect menus inside open absolutely and must not be clipped.
 */
function SignupFieldGroup({ legend, action, children }: { legend: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <div className="mb-1.5 flex min-h-9 items-center justify-between gap-2">
        <legend className="float-left text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
          {legend}
        </legend>
        {action}
      </div>
      <div className="clear-both rounded-[10px] border border-stone-200 dark:border-zinc-700/70 bg-white/70 dark:bg-zinc-900/40 divide-y divide-stone-200 dark:divide-zinc-700/70">
        {children}
      </div>
    </fieldset>
  );
}

/** Two labelled steps. The current one carries aria-current="step". */
function SignupStepIndicator({ step, onGoToStep1, labels }: {
  step: 1 | 2; onGoToStep1?: () => void;
  labels: { list: string; part: string; details: string; completed: string };
}) {
  const item = (n: 1 | 2, label: string) => {
    const current = step === n;
    const done = step > n;
    const body = (
      <>
        <span
          className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] font-bold ${
            current || done ? "border-[#b04a15] bg-[#b04a15] text-white" : "border-stone-300 dark:border-zinc-600 text-stone-500"
          }`}
          aria-hidden="true"
        >
          {done ? <Check className="h-3 w-3" /> : n}
        </span>
        <span>{label}</span>
        {done && <span className="sr-only"> ({labels.completed})</span>}
      </>
    );
    return (
      <li
        aria-current={current ? "step" : undefined}
        className={`flex items-center gap-1.5 whitespace-nowrap text-[12px] ${current ? "font-semibold text-[#b04a15] dark:text-[#e07b3a]" : "text-stone-500 dark:text-stone-400"}`}
      >
        {done && onGoToStep1 ? (
          <button type="button" onClick={onGoToStep1} className="-my-3 inline-flex min-h-11 items-center gap-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]">
            {body}
          </button>
        ) : body}
      </li>
    );
  };
  return (
    <ol className="flex items-center gap-2.5" aria-label={labels.list}>
      {item(1, labels.part)}
      <li aria-hidden="true" className={`h-px min-w-4 flex-1 ${step === 2 ? "bg-[#b04a15]/60" : "bg-stone-200 dark:bg-zinc-700"}`} />
      {item(2, labels.details)}
    </ol>
  );
}

/**
 * A role as a native radio inside a full-card label: the whole card is the hit
 * area, arrow keys move between roles, and the check + border + inset bar mean
 * selection is never shown by colour alone.
 */
function SignupRoleChoice({ value, checked, onSelect, title, label, Icon, disabled = false }: {
  value: string; checked: boolean; onSelect: () => void; title: string; label: string; Icon: LucideIcon; disabled?: boolean;
}) {
  return (
    <label
      className={`relative flex min-h-[74px] cursor-pointer items-center has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 gap-3 rounded-[10px] border px-3.5 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#b04a15] has-[:focus-visible]:ring-offset-2 dark:has-[:focus-visible]:ring-offset-zinc-900 ${
        checked
          ? "border-[#b04a15] bg-[#fbf3ea] dark:bg-[#382c22] shadow-[inset_3px_0_0_#b04a15]"
          : "border-stone-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900/40 hover:border-stone-300 dark:hover:border-zinc-600"
      }`}
    >
      <input type="radio" name="role" value={value} checked={checked} onChange={onSelect} disabled={disabled} className="sr-only" />
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#b04a15]/10 text-[#b04a15] dark:text-[#e07b3a]" aria-hidden="true">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold leading-snug text-stone-900 dark:text-stone-100">{title}</span>
        <span className="mt-0.5 block text-[12px] text-stone-500 dark:text-stone-400">{label}</span>
      </span>
      <span
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${checked ? "border-[#b04a15] bg-[#b04a15] text-white" : "border-stone-300 dark:border-zinc-600"}`}
        aria-hidden="true"
      >
        {checked && <Check className="h-3 w-3" />}
      </span>
    </label>
  );
}

// ── Input component ──────────────────────────────────────────────────────────────
/**
 * Text field with timed validation feedback, rendered as one row of a
 * SignupFieldGroup.
 *
 * <p>`status` drives the row tint, `aria-invalid` and the message slot
 * together, so colour is never the only signal. The input is never remounted
 * when status changes — that would drop focus and the caret mid-correction.
 */
function Field({
  id, label, type = "text", placeholder, value, onChange, required = true,
  readOnly = false, hint, autoComplete, field, onBlur, onCompositionStart, onCompositionEnd,
}: {
  id: string; label: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; required?: boolean;
  readOnly?: boolean; hint?: string; autoComplete?: string;
  field?: { status: FieldStatus; errorKey: string | null; successKey: string | null; params?: Record<string, string | number>; serverErrorText: string | null };
  onBlur?: () => void;
  onCompositionStart?: () => void;
  onCompositionEnd?: () => void;
}) {
  const status: FieldStatus = field?.status ?? "pristine";
  const described = field && (status === "invalid" || status === "valid") ? `${id}-feedback` : hint ? `${id}-hint` : undefined;

  return (
    <div className={GROUP_ROW} data-invalid={status === "invalid" || undefined}>
      <label htmlFor={id} className={ROW_LABEL}>{label}</label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        required={required}
        readOnly={readOnly}
        placeholder={placeholder}
        value={value}
        aria-invalid={status === "invalid" || undefined}
        aria-describedby={described}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
        className={`${ROW_INPUT} mt-0.5 ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
      />
      {field ? (
        <ValidatedFieldFeedback
          id={`${id}-feedback`}
          status={status}
          errorKey={field.errorKey}
          successKey={field.successKey}
          params={field.params}
          serverText={field.serverErrorText}
        />
      ) : null}
      {status !== "invalid" && status !== "valid" && hint && (
        <p id={`${id}-hint`} className="pb-1 text-xs text-stone-400">{hint}</p>
      )}
    </div>
  );
}

// ── Main content ───────────────────────────────────────────────────────────────
function RegisterContent() {
  const t = useTranslations("auth.register");
  const tv = useTranslations("auth.validation");
  const { setUser, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isSocialFlow = searchParams.get("social") === "google";

  // Where to return once the account exists. A guest who clicked "offer help",
  // was sent to login and chose "create account" arrives here with the request
  // still encoded in `?next=` — this page previously ignored it and hard-routed
  // everyone to "/", which silently ended the journey one step from the finish.
  //
  // Validation happens inside `resolvePostAuthDestination`; the raw value is
  // only ever passed through, never routed to.
  const rawNext = searchParams.get("next");
  const goAfterAuth = (role: string | null, navigate: (p: string) => void) => {
    const { path, notice } = resolvePostAuthDestination(rawNext, role);
    if (notice) toast.error(notice);
    navigate(path);
  };

  // `?role=DONOR|DONEE` preselects the role picker — used by the landing page's
  // two audience CTAs so someone who clicked "Join as a donee" does not have to
  // state that a second time.
  //
  // Only the two self-registerable roles are honoured. The backend refuses
  // ADMIN / SUPER_ADMIN / NGO_PARTNER self-registration anyway
  // (parseRegistrationRole), but accepting them here would render a form that
  // visibly promises something the submit will reject.
  //
  // Seeded through useState's initialiser rather than an effect so the correct
  // choice is highlighted on first paint, with no flicker from DONOR to DONEE —
  // and so a user who changes it is never overwritten by a later re-render.
  const initialRole = (() => {
    const raw = searchParams.get("role")?.toUpperCase();
    if (FEATURES.ngoRegistration && raw === "NGO") return "NGO";
    return raw === "DONEE" || raw === "DONOR" ? raw : "DONOR";
  })();

  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: initialRole });
  const [errors, setErrors] = useState<Record<string, string>>({});
  // One lock for registration submit, Google sign-up and social completion —
  // they must never overlap (see useAuthOperation). `loading` is the
  // registration-submit case, kept as a name for the button label below.
  const auth = useAuthOperation();
  const googleOpId = useRef(0);
  const loading = auth.op === "registering";

  // Fallback: if NGO registration is disabled, ensure form role is never NGO
  useEffect(() => {
    if (!FEATURES.ngoRegistration && form.role === "NGO") {
      setForm((f) => ({ ...f, role: "DONOR" }));
    }
  }, [form.role]);

  // Email OTP verification step — shown after a successful /register/initiate,
  // not used on the Google OAuth flow (Google already verifies the email).
  const [step, setStep] = useState<"form" | "otp">("form");
  const [pendingEmail, setPendingEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  const [dialCountry, setDialCountry] = useState("IN");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [ngoPan, setNgoPan] = useState("");
  const [ngoWebsite, setNgoWebsite] = useState("");

  const [countryIso, setCountryIso] = useState("");
  const [stateIso, setStateIso] = useState("");
  const [cityValue, setCityValue] = useState("");
  const [cityFreeText, setCityFreeText] = useState("");
  const [forceFreeTextCity, setForceFreeTextCity] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Card step: 1 = choose a role, 2 = details. Distinct from `step`, which
  // switches the whole card to the email-OTP screen after submit.
  const [cardStep, setCardStep] = useState<1 | 2>(1);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const movedByUser = useRef(false);
  const reducedMotion = !!useReducedMotion();

  // Focus the new step's heading only after a deliberate Continue/Back — never
  // on first load (no surprise keyboard), and the heading is not an input.
  useEffect(() => {
    if (!movedByUser.current) return;
    movedByUser.current = false;
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView?.({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }, [cardStep, reducedMotion]);
  const v = useTimedFieldValidation();

  const { countries: countryOptions, states: stateOptions, cities: cityOptions, dialCodes: dialCodeOptions } = useLocations(countryIso, stateIso);

  const maxPhoneLength = PHONE_LENGTHS[dialCountry] ?? 15;

  function handleGPSLocation() {
    if (!navigator.geolocation) {
      toast.error("Your browser doesn't support GPS location");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`);
          if (!res.ok) throw new Error();
          const data = await res.json();
          const address = data.address;
          if (address) {
            const countryCode = address.country_code?.toUpperCase();
            const stateName = address.state;
            const cityName = address.city || address.town || address.village || address.suburb;
            if (countryCode) {
              setDialCountry(countryCode);
              setCountryIso(countryCode);
              const { stateIso: resolvedState, cityValue: resolvedCity } = await resolveLocationFromGPS(countryCode, stateName, cityName);
              
              if (resolvedState) {
                setStateIso(resolvedState);
                if (resolvedCity) {
                  setCityValue(resolvedCity);
                  setCityFreeText("");
                  setForceFreeTextCity(false);
                } else if (cityName) {
                  setCityValue("");
                  setCityFreeText(cityName);
                  setForceFreeTextCity(true);
                }
              } else {
                setStateIso("");
                setCityValue("");
                if (cityName) { setCityFreeText(cityName); setForceFreeTextCity(true); }
              }
              toast.success("Location updated successfully!");
            }
          }
        } catch {
          toast.error("Failed to detect location details");
        } finally {
          setGpsLoading(false);
        }
      },
      () => {
        setGpsLoading(false);
        toast.error("Location access denied or unavailable");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const noStateOptions = countryIso !== "" && stateOptions.length === 0;
  const noCityOptions = stateIso !== "" && cityOptions.length === 0;
  const showCityFreeText = noStateOptions || noCityOptions || forceFreeTextCity;

  const triggerGoogle = useGoogleLogin({
    scope: "openid email profile",
    onSuccess: async (tokenResponse) => {
      const id = googleOpId.current;
      // A popup that resolves after its attempt was cancelled/replaced is ignored.
      if (!auth.isCurrent(id)) return;
      try {
        const res = await googleAuth(tokenResponse.access_token);
        // Locked from here to navigation: both branches leave this screen.
        if (!auth.succeed(id)) return;
        if (res.needsCompletion) {
          sessionStorage.setItem("ck_google_token", tokenResponse.access_token);
          sessionStorage.setItem("ck_google_profile", JSON.stringify({ email: res.email, fullName: res.fullName }));
          // Carry the chosen role and the original destination into the
          // completion screen. `next` used to be dropped here, so a guest who
          // signed up with Google from "offer help" landed on the homepage.
          // It is passed through raw and validated only in goAfterAuth.
          const completion = new URLSearchParams({ social: "google", role: form.role });
          if (rawNext) completion.set("next", rawNext);
          router.push(`/register?${completion.toString()}`);
        } else {
          setUser({ email: res.email, role: res.role });
          toast.success(t("welcomeBackToast"));
          goAfterAuth(res.role, router.push);
        }
      } catch (err) {
        auth.release(id);
        toast.error(err instanceof Error ? err.message : t("googleFailed"));
      }
    },
    onError: () => {
      auth.release(googleOpId.current);
      toast.error(t("googleFailed"));
    },
    // Popup closed / blocked. Closing is a normal choice, not an error, so it
    // only unlocks the card; a blocked popup says what to do about it.
    onNonOAuthError: (err) => {
      auth.release(googleOpId.current);
      if (err.type === "popup_failed_to_open") toast.error(t("googlePopupBlocked"));
      else if (err.type !== "popup_closed") toast.error(t("googleFailed"));
    },
  });

  function startGoogle() {
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      toast.error("Google Sign-In is not configured.");
      return;
    }
    const id = auth.begin("google");
    if (id === null) return;
    googleOpId.current = id;
    try {
      triggerGoogle();
    } catch {
      auth.release(id);
      toast.error(t("googleFailed"));
    }
  }

  function handleCountryChange(iso: string) {
    setCountryIso(iso);
    setStateIso("");
    setCityValue("");
    setCityFreeText("");
    setForceFreeTextCity(false);
    // The dependents were just emptied, so their old verdicts are stale — a
    // green tick left on a now-blank city is worse than no feedback at all.
    v.onChange("country", () => validateCountry(iso));
    v.onChange("state", () => validateState("", false));
    v.onChange("city", () => validateCity("", "", false));
    setFormError(null);
  }

  function handleStateChange(iso: string) {
    setStateIso(iso);
    setCityValue("");
    setCityFreeText("");
    setForceFreeTextCity(false);
    v.onChange("state", () => validateState(iso, stateOptions.length > 0));
    v.onChange("city", () => validateCity("", "", false));
    setFormError(null);
  }

  function buildCityString(): string {
    if (showCityFreeText) {
      return [cityFreeText, stateIso, countryIso].filter(Boolean).join(", ");
    }
    return [cityValue, stateIso, countryIso].filter(Boolean).join(", ");
  }

  // Already signed in: go on. Skipped when this page itself just signed the
  // user in — that path has already navigated, and a second one would compete.
  useEffect(() => {
    if (user && !auth.isAuthenticated()) goAfterAuth(user.role, router.replace);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, rawNext]);

  // Country suggestion only; device location is requested by the GPS button.
  useEffect(() => {
    const country = detectCountryCode();
    setDialCountry(country);
    setCountryIso(country);
  }, []);

  useEffect(() => {
    if (isSocialFlow) {
      const token = sessionStorage.getItem("ck_google_token");
      const profile = sessionStorage.getItem("ck_google_profile");
      if (token && profile) {
        const { email, fullName } = JSON.parse(profile);
        setGoogleToken(token);
        setForm(f => ({ ...f, email: email ?? "", fullName: fullName ?? "" }));
      } else {
        // The social handshake is gone (reload, or a direct hit on the URL).
        // Start over at login, but keep the destination so the journey can
        // still finish where it was headed.
        router.replace(loginUrlFor(rawNext ?? "/"));
      }
    }
  }, [isSocialFlow, router, rawNext]);

  if (user) return null;

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: "" }));
  }

  /**
   * Every rule the form enforces, rebuilt each render from current values.
   * Google completion drops password entirely — that account has none, and
   * validating a field the user cannot fill would deadlock the form.
   */
  const validators = {
    role: () => validateRole(form.role),
    fullName: () => (form.role === "NGO" ? validateOrganizationName(form.fullName) : validateFullName(form.fullName)),
    email: () => validateEmail(form.email),
    phone: () => validatePhone(phoneNumber, dialCountry, getDialCode(dialCountry, dialCodeOptions)),
    country: () => validateCountry(countryIso),
    state: () => validateState(stateIso, stateOptions.length > 0),
    city: () => validateCity(cityValue, cityFreeText, showCityFreeText),
    ...(form.role === "NGO" ? { panNumber: () => validatePanNumber(ngoPan) } : {}),
    ...(isSocialFlow ? {} : { password: () => validateRegisterPassword(form.password) }),
  };

  // Country/state/city are validated individually but reported as one group.
  const countryF = v.get("country");
  const stateF = v.get("state");
  const cityF = v.get("city");
  const locationParts = [countryF, stateF, cityF];
  const locationStatus: FieldStatus =
    locationParts.some(f => f.status === "invalid") ? "invalid"
    : locationParts.every(f => f.status === "valid") ? "valid"
    : locationParts.some(f => f.status !== "pristine") ? "neutral"
    : "pristine";
  const locationErrorKey = countryF.errorKey ?? stateF.errorKey ?? cityF.errorKey;

  /** Re-runs the group, but only once it has already produced an error. */
  function revalidateLocation() {
    setFormError(null);
    v.onChange("country", validators.country);
    v.onChange("state", validators.state);
    v.onChange("city", validators.city);
  }

  function goToCardStep(next: 1 | 2) {
    // No step (and so no role) change while Google or a submit is in flight.
    if (next === cardStep || auth.busy) return;
    movedByUser.current = true;
    setCardStep(next);
  }

  /**
   * Step 1 only needs a valid role (it always has one — DONOR by default —
   * but the rule still gates the move). Step 2 is the original submit.
   */
  function handleCardSubmit(e: React.FormEvent) {
    if (cardStep === 1) {
      e.preventDefault();
      if (auth.busy || !validateRole(form.role).ok) return;
      goToCardStep(2);
      return;
    }
    void handleSubmit(e);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (auth.busy) return;

    const firstInvalid = v.validateAll(validators);
    if (firstInvalid) {
      const el = document.getElementById(firstInvalid);
      el?.focus();
      el?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
      return;
    }
    setFormError(null);

    const dialCode = getDialCode(dialCountry, dialCodeOptions);
    const fullPhone = dialCode && phoneNumber ? `${dialCode}${phoneNumber}` : phoneNumber;
    const cityStr = buildCityString();

    // The real guard: synchronous, so Enter + click cannot both get through.
    const id = auth.begin("registering");
    if (id === null) return;
    try {
      if (form.role === "NGO") {
        const res = await registerNgo({
          organizationName: form.fullName.trim(),
          officialEmail: form.email.trim(),
          phoneNumber: fullPhone,
          panNumber: ngoPan.trim().toUpperCase(),
          country: countryIso,
          state: stateIso,
          city: cityStr,
          password: form.password,
          website: ngoWebsite.trim() || undefined,
        });
        if (!auth.succeed(id)) return;
        setUser({ id: res.userId, userId: res.userId, email: res.email, role: res.role });
        toast.success("NGO account created! Welcome to CauseKind.");
        router.replace("/");
      } else if (isSocialFlow && googleToken) {
        const res = await googleComplete(googleToken, fullPhone, cityStr, form.role);
        if (res.needsCompletion) {
          auth.release(id);
        } else {
          if (!auth.succeed(id)) return;
          sessionStorage.removeItem("ck_google_token");
          sessionStorage.removeItem("ck_google_profile");
          setUser({ email: res.email, role: res.role });
          toast.success("Account created! Welcome to CauseKind.");
          goAfterAuth(res.role, router.push);
        }
      } else {
        await initiateRegistration({ ...form, phone: fullPhone, city: cityStr });
        setPendingEmail(form.email);
        // Value, error, cooldown and animation state are all owned by
        // AnimatedEmailOtp, which mounts fresh here.
        setStep("otp");
        toast.success("We've emailed you a verification code.");
        // Not signed in yet: the OTP screen owns verification. Unlock so
        // "Edit details" returns to a usable form.
        auth.release(id);
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Registration failed";
      // Known identifiers get pinned to their field so the fix is obvious;
      // anything unrecognised goes to the form-level alert rather than being
      // attached to a guessed field. Entered values are never discarded.
      const mapped = mapServerErrorToField(raw);
      if (mapped) {
        v.setServerError(mapped.field, mapped.errorKey, raw);
        const el = document.getElementById(mapped.field);
        el?.focus();
        el?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
      } else {
        setFormError(raw);
      }
      auth.release(id);
    }
  }

  /**
   * The API call only. It must NOT authenticate.
   *
   * <p>`setUser` triggers the redirect effect above (`if (user) router.replace("/")`)
   * plus the `if (user) return null` guard, which would unmount the OTP screen the
   * instant the response landed — the success animation would never be seen.
   * AnimatedEmailOtp holds the result, plays the animation, then calls
   * `onVerified` below.
   */
  async function verifyOtpRequest(code: string) {
    return verifyRegistrationOtp(pendingEmail, code);
  }

  /** Runs after the success animation. The only place auth + navigation happen. */
  function completeRegistration(res: { email: string; role: string }) {
    auth.lockAuthenticated();
    setUser({ email: res.email, role: res.role });
    toast.success("Account created!");
    // The end of the email/OTP path — and the one that matters most for the
    // guest journey, since a new donor reaches the offer wizard through here.
    goAfterAuth(res.role, router.replace);
  }

  async function handleResendOtp() {
    // Errors surface as a toast and are rethrown so the OTP component knows the
    // resend failed and leaves its state (and cooldown) untouched.
    try {
      await resendRegistrationOtp(pendingEmail);
      toast.success("We've sent a new code.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't resend the code");
      throw err;
    }
  }

  if (step === "otp" && !isSocialFlow) {
    return (
      <AnimatedEmailOtp
        email={pendingEmail}
        verify={verifyOtpRequest}
        onVerified={completeRegistration}
        onResend={handleResendOtp}
        onEditDetails={() => setStep("form")}
        labels={{
          eyebrow: t("verifyEmailLabel"),
          title: t("verifyEmailTitle"),
          subtitle: t("verifyEmailSubtitle"),
          spamFolderHint: t("spamFolderHint"),
          verify: t("verifyButton"),
          verifying: t("verifying"),
          verified: "Email verified successfully",
          resend: t("resendCode"),
          resending: t("resending"),
          editDetails: t("editDetails"),
        }}
      />
    );
  }

  const roleHint =
    form.role === "NGO"
      ? t("roleHintNgo")
      : form.role === "DONEE"
        ? t("roleHintDonee")
        : t("roleHintDonor");

  const headerSubtitle =
    cardStep === 1
      ? t("step1Subtitle")
      : form.role === "NGO"
        ? t("roleHintNgo")
        : isSocialFlow
          ? t("googleLinkedSubtitle")
          : t("step2Subtitle");

  // Sign-in keeps the destination: a guest sent here from "offer help" who
  // already has an account must still land on that offer after logging in.
  const loginHref = rawNext ? loginUrlFor(rawNext) : "/login";

  return (
    <div
      className="w-full mx-auto relative z-10 bg-white/85 dark:bg-zinc-900/75 backdrop-blur-sm border border-white/60 dark:border-zinc-700/30 rounded-2xl sm:rounded-3xl shadow-xl transition-all duration-300 max-w-[460px]"
    >
      {/* ── Terracotta header. Rounded to sit inside the card's own corners
          (card radius minus its 1px border) — the card is not overflow:hidden,
          because the searchable selects below open absolutely and would clip. */}
      <header className="rounded-t-[15px] sm:rounded-t-[23px] bg-[#aa461e] dark:bg-[#71381f] px-5 pt-5 pb-6 sm:px-8 sm:pt-7 sm:pb-7 text-[#fff5eb]">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#f6d6bf]">
          {form.role === "NGO" ? t("eyebrowNgo") : t("eyebrow")}
        </p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-3 scroll-mt-28 text-[29px] sm:text-[31px] font-extrabold leading-[1.08] tracking-[-0.03em] outline-none focus-visible:ring-2 focus-visible:ring-[#ffcf9f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#aa461e] rounded-sm"
        >
          {cardStep === 1 ? t("step1Title") : t("step2Title")}
          <br />
          <em className="font-serif font-normal italic text-[#ffcf9f] tracking-[-0.02em]">
            {cardStep === 1 ? t("step1TitleAccent") : t("step2TitleAccent")}
          </em>
        </h1>
        <p className="mt-2.5 text-[13px] leading-relaxed text-[#f6d6bf]">{headerSubtitle}</p>
      </header>

      <div className="px-5 pt-5 pb-6 sm:px-8 sm:pt-6 sm:pb-8">
        <SignupStepIndicator
          step={cardStep}
          labels={{ list: t("stepsLabel"), part: t("stepYourPart"), details: t("stepYourDetails"), completed: t("stepCompleted") }} onGoToStep1={cardStep === 2 && !auth.busy ? () => goToCardStep(1) : undefined} />

        {/* One form for both steps, so Enter works and nothing is duplicated.
            Step-2 inputs unmount on Back, but every value lives in state above
            and is restored on Continue. */}
        <form onSubmit={handleCardSubmit} className="mt-5" noValidate>
          {cardStep === 1 ? (
            <>
              <fieldset>
                <legend className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500 dark:text-stone-400">
                  {t("rolesLegend")}
                </legend>
                <div className="grid gap-2">
                  <SignupRoleChoice
                    value="DONOR" checked={form.role === "DONOR"} onSelect={() => set("role", "DONOR")} disabled={auth.busy}
                    title={t("roleDonorTitle")} label={t("roleDonorLabel")} Icon={Package}
                  />
                  <SignupRoleChoice
                    value="DONEE" checked={form.role === "DONEE"} onSelect={() => set("role", "DONEE")} disabled={auth.busy}
                    title={t("roleDoneeTitle")} label={t("roleDoneeLabel")} Icon={HandHeart}
                  />
                  {FEATURES.ngoRegistration && (
                    <SignupRoleChoice
                      value="NGO" checked={form.role === "NGO"} onSelect={() => set("role", "NGO")} disabled={auth.busy}
                      title={t("roleNgoTitle")} label={t("roleNgoLabel")} Icon={Building2}
                    />
                  )}
                </div>
              </fieldset>
              <p className="mt-2.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{roleHint}</p>

              <button type="submit" disabled={auth.busy} className={PRIMARY_BUTTON + " mt-5 w-full"}>
                <span>{t("continueToDetails")}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          ) : (
            <div className="space-y-4">
              {/* Chosen role, with a way back to change it. */}
              <div className="flex items-center justify-between gap-3 rounded-[10px] border border-stone-200 dark:border-zinc-700/60 bg-[#fbf3ea] dark:bg-[#382c22] px-3 py-2">
                <p className="min-w-0 text-[13px] text-stone-700 dark:text-stone-200">
                  <span className="text-stone-500 dark:text-stone-400">{t("joiningAs")} </span>
                  <strong className="font-semibold">
                    {form.role === "NGO" ? t("joiningAsNgo") : form.role === "DONEE" ? t("joiningAsDonee") : t("joiningAsDonor")}
                  </strong>
                </p>
                <button
                  type="button"
                  onClick={() => goToCardStep(1)}
                  disabled={auth.busy}
                  className="min-h-11 shrink-0 rounded-md px-2 text-[13px] font-semibold text-[#b04a15] dark:text-[#e07b3a] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15] disabled:opacity-50"
                >
                  {t("changeRole")}<span className="sr-only"> {t("changeRoleSr")}</span>
                </button>
              </div>

              {/* Server errors that belong to no single field. Values are kept. */}
              <AuthFormAlert message={formError} />

              <SignupFieldGroup legend={t("groupDetails")}>
                <Field
                  id="fullName"
                  label={form.role === "NGO" ? "Organization Name *" : t("fullName")}
                  placeholder={form.role === "NGO" ? "Helping Hearts Foundation" : "Jane Doe"}
                  value={form.fullName}
                  onChange={val => {
                    set("fullName", val);
                    setFormError(null);
                    v.onChange("fullName", () => (form.role === "NGO" ? validateOrganizationName(val) : validateFullName(val)));
                  }}
                  onBlur={() => v.onBlur("fullName", validators.fullName)}
                  onCompositionStart={() => v.onCompositionStart("fullName")}
                  onCompositionEnd={() => v.onCompositionEnd("fullName", validators.fullName)}
                  readOnly={isSocialFlow && !!form.fullName}
                  autoComplete={form.role === "NGO" ? "organization" : "name"}
                  field={isSocialFlow && form.fullName ? undefined : v.get("fullName")}
                />
                {/* Google-linked email is read-only and shows the neutral linked
                    hint rather than a green tick — it was never validated here. */}
                <Field
                  id="email"
                  label={form.role === "NGO" ? "Official Email Address *" : t("email")}
                  type="email"
                  placeholder={form.role === "NGO" ? "contact@helpinghearts.org" : "you@example.com"}
                  value={form.email}
                  onChange={val => { set("email", val); setFormError(null); v.onChange("email", () => validateEmail(val)); }}
                  onBlur={() => v.onBlur("email", validators.email)}
                  readOnly={isSocialFlow}
                  hint={isSocialFlow ? t("googleLinkedHint") : undefined}
                  autoComplete="email"
                  field={isSocialFlow ? undefined : v.get("email")}
                />

                {/* Phone with dial-code */}
                <div className={GROUP_ROW} data-invalid={v.get("phone").status === "invalid" || undefined}>
                  <label htmlFor="phone" className={ROW_LABEL}>{t("phone")}</label>
                  {/* min-w-0 on the input is what stops this row overflowing the
                      card: a flex item defaults to min-width:auto, and an <input>
                      has an implicit size=20, so flex-1 could grow it but never
                      shrink it below ~210px. */}
                  <div className="mt-1 flex items-center gap-2">
                    <div className="w-[92px] sm:w-[110px] shrink-0">
                      <SearchableSelect
                        options={dialCodeOptions}
                        value={dialCountry}
                        // Changing dial country changes the expected digit count,
                        // so any existing phone verdict must be recomputed.
                        onChange={(iso) => {
                          setDialCountry(iso);
                          v.onChange("phone", () => validatePhone(phoneNumber, iso, getDialCode(iso, dialCodeOptions)));
                        }}
                        placeholder="+–"
                        searchPlaceholder={t("searchCountry")}
                        renderSelectedLabel={(opt) => getDialCode(opt.value, dialCodeOptions)}
                      />
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      placeholder={t("phone")}
                      value={phoneNumber}
                      maxLength={maxPhoneLength}
                      aria-invalid={v.get("phone").status === "invalid" || undefined}
                      aria-describedby={v.get("phone").status !== "pristine" && v.get("phone").status !== "neutral" ? "phone-feedback" : undefined}
                      onChange={e => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, maxPhoneLength);
                        setPhoneNumber(digits);
                        setFormError(null);
                        v.onChange("phone", () => validatePhone(digits, dialCountry, getDialCode(dialCountry, dialCodeOptions)));
                      }}
                      onBlur={() => v.onBlur("phone", validators.phone)}
                      autoComplete="tel"
                      className={ROW_INPUT + " flex-1"}
                    />
                  </div>
                  <ValidatedFieldFeedback
                    id="phone-feedback"
                    status={v.get("phone").status}
                    errorKey={v.get("phone").errorKey}
                    successKey={v.get("phone").successKey}
                    params={v.get("phone").params}
                    serverText={v.get("phone").serverErrorText}
                  />
                </div>

                {/* PAN Number — required for NGO role */}
                {form.role === "NGO" && (
                  <Field
                    id="panNumber"
                    label="PAN Number *"
                    placeholder="AABCT1234C"
                    value={ngoPan}
                    onChange={val => {
                      const upper = val.toUpperCase().slice(0, 10);
                      setNgoPan(upper);
                      setFormError(null);
                      v.onChange("panNumber", () => validatePanNumber(upper));
                    }}
                    onBlur={() => v.onBlur("panNumber", () => validatePanNumber(ngoPan))}
                    autoComplete="off"
                    field={v.get("panNumber")}
                  />
                )}

                {/* Organization Website / Social Link — optional for NGO role */}
                {form.role === "NGO" && (
                  <div className={GROUP_ROW}>
                    <label htmlFor="website" className={ROW_LABEL}>
                      Organization Website / Social Link <span className="font-normal">(Optional)</span>
                    </label>
                    <input
                      id="website"
                      type="url"
                      placeholder="https://www.helpinghearts.org"
                      value={ngoWebsite}
                      onChange={e => setNgoWebsite(e.target.value)}
                      className={ROW_INPUT}
                    />
                  </div>
                )}
              </SignupFieldGroup>

              {/* Location: Country → State → City. GPS only on this button. */}
              <SignupFieldGroup
                legend={t("location")}
                action={
                  <button
                    type="button"
                    onClick={handleGPSLocation}
                    disabled={gpsLoading}
                    aria-busy={gpsLoading || undefined}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#b04a15]/30 px-3 text-[11px] font-bold uppercase tracking-wide text-[#b04a15] dark:text-[#e07b3a] hover:bg-[#b04a15]/5 transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]"
                  >
                    {gpsLoading
                      ? <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" aria-hidden="true" />
                      : <MapPin className="h-3 w-3" aria-hidden="true" />}
                    {gpsLoading ? t("gpsDetecting") : t("useGps")}
                  </button>
                }
              >
                <div className={GROUP_ROW}>
                  <span className={ROW_LABEL}>{t("country")}</span>
                  <div className="mt-1">
                    <SearchableSelect
                      options={countryOptions}
                      value={countryIso}
                      onChange={handleCountryChange}
                      placeholder={t("selectCountry")}
                      searchPlaceholder={t("searchCountry")}
                    />
                  </div>
                </div>
                <div className={GROUP_ROW}>
                  <span className={ROW_LABEL}>{t("state")}</span>
                  <div className="mt-1">
                    {noStateOptions ? (
                      <p className="py-2 text-xs italic text-stone-400">{t("noStatesListed")}</p>
                    ) : (
                      <SearchableSelect
                        options={stateOptions}
                        value={stateIso}
                        onChange={handleStateChange}
                        placeholder={t("selectState")}
                        disabledPlaceholder={t("selectCountryFirst")}
                        disabled={!countryIso}
                        searchPlaceholder={t("searchState")}
                      />
                    )}
                  </div>
                </div>
                <div className={GROUP_ROW}>
                  {showCityFreeText
                    ? <label htmlFor="city" className={ROW_LABEL}>{t("city")}</label>
                    : <span className={ROW_LABEL}>{t("city")}</span>}
                  <div className="mt-1">
                    {showCityFreeText ? (
                      <input
                        id="city"
                        type="text"
                        placeholder={t("enterCity")}
                        value={cityFreeText}
                        aria-describedby={locationStatus === "invalid" ? "location-feedback" : undefined}
                        onChange={e => {
                          setCityFreeText(e.target.value);
                          v.onChange("city", () => validateCity("", e.target.value, true));
                          setFormError(null);
                        }}
                        onBlur={() => v.onBlur("city", validators.city)}
                        autoComplete="address-level2"
                        className={ROW_INPUT}
                      />
                    ) : (
                      <SearchableSelect
                        options={cityOptions}
                        value={cityValue}
                        onChange={(val) => { setCityValue(val); v.onChange("city", () => validateCity(val, "", false)); setFormError(null); }}
                        placeholder={t("selectCity")}
                        disabledPlaceholder={t("selectStateFirst")}
                        disabled={!stateIso && !noStateOptions}
                        searchPlaceholder={t("searchCity")}
                      />
                    )}
                  </div>
                  {/* One shared verdict for the location group, so the user sees a
                      single "what's missing" rather than three competing messages.
                      Suppressed while GPS is running so it cannot produce a
                      premature error. */}
                  {!gpsLoading && (
                    <ValidatedFieldFeedback
                      id="location-feedback"
                      status={locationStatus}
                      errorKey={locationErrorKey}
                      successKey={locationStatus === "valid" ? "locationValid" : null}
                      serverText={null}
                    />
                  )}
                </div>
              </SignupFieldGroup>

              {/* Password — only on non-social flow (a Google account has none). */}
              {!isSocialFlow && (
                <SignupFieldGroup legend={t("groupSecurity")}>
                  <div className={GROUP_ROW} data-invalid={v.get("password").status === "invalid" || undefined}>
                    <label htmlFor="password" className={ROW_LABEL}>{t("password")}</label>
                    <div className="mt-1 flex items-center gap-1">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        placeholder="••••••••"
                        value={form.password}
                        aria-invalid={v.get("password").status === "invalid" || undefined}
                        aria-describedby="password-feedback password-hint"
                        onChange={e => {
                          set("password", e.target.value);
                          setFormError(null);
                          // Stays neutral through characters 1-7 on the first pass;
                          // only goes live once it has already errored once.
                          v.onChange("password", () => validateRegisterPassword(e.target.value));
                        }}
                        onBlur={() => v.onBlur("password", () => validateRegisterPassword(form.password))}
                        className={ROW_INPUT + " flex-1"}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                        aria-pressed={showPassword}
                        // `prev`, not `v` — `v` is the validation controller in this
                        // scope and shadowing it here is a trap for the next edit.
                        onClick={() => setShowPassword(prev => !prev)}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                      </button>
                    </div>
                    {/* Feedback sits BELOW the input, never inside it. */}
                    <ValidatedFieldFeedback
                      id="password-feedback"
                      status={v.get("password").status}
                      errorKey={v.get("password").errorKey}
                      successKey={v.get("password").successKey}
                      params={v.get("password").params}
                      serverText={v.get("password").serverErrorText}
                    />
                    {v.get("password").status !== "invalid" && v.get("password").status !== "valid" && (
                      <p id="password-hint" className="pb-1 text-xs text-stone-400">{tv("passwordHint")}</p>
                    )}
                  </div>
                </SignupFieldGroup>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => goToCardStep(1)}
                  disabled={auth.busy}
                  className="inline-flex min-h-12 items-center gap-1 rounded-lg border border-stone-200 dark:border-zinc-700 px-3.5 text-[13px] font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("back")}
                </button>
                <button type="submit" disabled={auth.busy} aria-busy={loading || undefined} className={PRIMARY_BUTTON + " flex-1"}>
                  <span>
                    {loading
                      ? (form.role === "NGO" ? "Creating account..." : t("creating"))
                      : isSocialFlow
                        ? t("complete")
                        : (form.role === "NGO" ? "Create NGO account" : t("submit"))}
                  </span>
                  {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Social sign-up — step 1 only, not inside the Google completion flow,
            and not for NGOs (unchanged rules). Facebook is omitted: it was a
            permanently disabled "coming soon" button with no implementation. */}
        {cardStep === 1 && !isSocialFlow && form.role !== "NGO" && (
          <div className="mt-5 space-y-2.5">
            <div className="flex items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400" aria-hidden="true">
              <span className="h-px flex-1 bg-stone-200 dark:bg-zinc-700" />
              {t("orJoinWith")}
              <span className="h-px flex-1 bg-stone-200 dark:bg-zinc-700" />
            </div>
            {/* Locked from the moment the popup is requested, not only once
                Google answers, so repeated clicks cannot open repeated attempts. */}
            <button
              type="button"
              disabled={auth.busy}
              aria-busy={auth.op === "google" || undefined}
              onClick={startGoogle}
              className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 text-[13px] font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:opacity-50"
            >
              <GoogleIcon />
              {auth.op === "google" ? t("googleOpening") : t("google")}
            </button>
          </div>
        )}

        {/* Cross-link — carries `next` through, so the journey survives. */}
        <p className="mt-4 text-center text-[13px] text-stone-500 dark:text-stone-400">
          {t("loginPrompt")}{" "}
          <Link
            href={loginHref}
            className="inline-flex min-h-11 items-center font-semibold text-[#b04a15] dark:text-[#e07b3a] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15] rounded-sm"
          >
            {t("logIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  );
}
