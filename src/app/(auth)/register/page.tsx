"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resolvePostAuthDestination } from "@/lib/postAuthDestination";
import { loginUrlFor } from "@/lib/safeRedirect";
import { Suspense } from "react";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { initiateRegistration, verifyRegistrationOtp, resendRegistrationOtp, googleAuth, googleComplete } from "@/lib/api";
import { Eye, EyeOff, MapPin, Phone } from "lucide-react";
import { AnimatedEmailOtp } from "@/components/auth/AnimatedEmailOtp";
import { useGoogleLogin } from "@react-oauth/google";
import { useLocations } from "@/hooks/useLocations";
import { resolveLocationFromGPS } from "@/app/actions/locations";
import { SearchableSelect, type SelectOption } from "@/components/profile/SearchableSelect";
import { PHONE_LENGTHS, getDialCode } from "@/lib/phone";
import { Reveal } from "@/components/Reveal";
import {
  mapServerErrorToField, validateCity, validateCountry, validateEmail, validateFullName,
  validatePhone, validateRegisterPassword, validateRole, validateState,
  type FieldStatus,
} from "@/features/auth-validation/authValidation";
import { useTimedFieldValidation } from "@/features/auth-validation/useTimedFieldValidation";
import { ValidatedFieldFeedback, fieldStateClass } from "@/features/auth-validation/ValidatedFieldFeedback";
import { AuthFormAlert } from "@/features/auth-validation/AuthFormAlert";
import { useReducedMotion } from "framer-motion";

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

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" fill="#1877F2"/>
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

async function detectCountryFromIP(): Promise<string> {
  try {
    const res = await fetch("https://ipwho.is/?output=json&fields=country_code", {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error("non-200");
    const data = await res.json();
    if (typeof data.country_code === "string" && /^[A-Z]{2}$/.test(data.country_code)) {
      return data.country_code;
    }
  } catch {
    // ignore
  }
  return detectCountryCode();
}

// ── Input component ──────────────────────────────────────────────────────────────
/**
 * Text field with timed validation feedback.
 *
 * <p>`status` drives border, `aria-invalid` and the message slot together, so
 * colour is never the only signal. The input is never remounted when status
 * changes — that would drop focus and the caret mid-correction.
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
  const described = field && (status === "invalid" || status === "valid") ? `${id}-feedback` : undefined;

  return (
    <div className="space-y-1 sm:space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
        {label}
      </label>
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
        className={`w-full rounded-xl border px-3.5 py-2.5 sm:px-4 sm:py-3 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 transition bg-stone-50 dark:bg-zinc-900
          ${fieldStateClass(status)}
          ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
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
        <p className="text-xs text-stone-400">{hint}</p>
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
    return raw === "DONEE" || raw === "DONOR" ? raw : "DONOR";
  })();

  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: initialRole });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Email OTP verification step — shown after a successful /register/initiate,
  // not used on the Google OAuth flow (Google already verifies the email).
  const [step, setStep] = useState<"form" | "otp">("form");
  const [pendingEmail, setPendingEmail] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  const [dialCountry, setDialCountry] = useState("IN");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [countryIso, setCountryIso] = useState("");
  const [stateIso, setStateIso] = useState("");
  const [cityValue, setCityValue] = useState("");
  const [cityFreeText, setCityFreeText] = useState("");
  const [forceFreeTextCity, setForceFreeTextCity] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const reducedMotion = !!useReducedMotion();
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
      setGoogleLoading(true);
      try {
        const res = await googleAuth(tokenResponse.access_token);
        if (res.needsCompletion) {
          sessionStorage.setItem("ck_google_token", tokenResponse.access_token);
          sessionStorage.setItem("ck_google_profile", JSON.stringify({ email: res.email, fullName: res.fullName }));
          router.push("/register?social=google");
        } else {
          setUser({ email: res.email, role: res.role });
          toast.success("Welcome back!");
          goAfterAuth(res.role, router.push);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Google sign-up failed");
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => toast.error("Google sign-up failed"),
  });

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

  useEffect(() => { if (user) goAfterAuth(user.role, router.replace); }, [user, router]);

  useEffect(() => {
    if (navigator.geolocation) {
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
                return;
              }
            }
          } catch {
            // fallback to IP
          }
          detectCountryFromIP().then((code) => {
            setDialCountry(code);
            setCountryIso(code);
          });
        },
        () => {
          detectCountryFromIP().then((code) => {
            setDialCountry(code);
            setCountryIso(code);
          });
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    } else {
      detectCountryFromIP().then((code) => {
        setDialCountry(code);
        setCountryIso(code);
      });
    }
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
    fullName: () => validateFullName(form.fullName),
    email: () => validateEmail(form.email),
    phone: () => validatePhone(phoneNumber, dialCountry, getDialCode(dialCountry, dialCodeOptions)),
    country: () => validateCountry(countryIso),
    state: () => validateState(stateIso, stateOptions.length > 0),
    city: () => validateCity(cityValue, cityFreeText, showCityFreeText),
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

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

    setLoading(true);
    try {
      if (isSocialFlow && googleToken) {
        const res = await googleComplete(googleToken, fullPhone, cityStr, form.role);
        if (!res.needsCompletion) {
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
    } finally {
      setLoading(false);
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

  return (
    <div className="w-full max-w-[460px] mx-auto space-y-4 sm:space-y-6 relative z-10 bg-white/85 dark:bg-zinc-900/75 backdrop-blur-sm border border-white/60 dark:border-zinc-700/30 rounded-2xl sm:rounded-3xl px-5 py-6 sm:px-8 sm:py-10 shadow-xl">
          {/* Heading */}
          <Reveal>
            <div className="space-y-1 sm:space-y-1.5">
              <span className="text-2xs font-black uppercase tracking-widest text-[#b04a15]">Create account</span>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
                {isSocialFlow ? `${t("almostThereTitle")} 🎉` : `${t("joinTitle")} 🌱`}
              </h1>
              {/* was stone-505 — not a real Tailwind shade, so no colour was emitted. */}
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {isSocialFlow ? t("googleLinkedSubtitle") : t("createSubtitle")}
              </p>
            </div>
          </Reveal>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4" noValidate>
            {/* Server errors that belong to no single field. Values are kept. */}
            <AuthFormAlert message={formError} />
            <Reveal delay={60}>
              {/* Role Selection Option */}
              <div className="space-y-1 sm:space-y-1.5">
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
                  Register as
                </label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => set("role", "DONOR")}
                    className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl border text-center transition-all ${
                      form.role === "DONOR"
                        ? "border-[#b04a15] bg-[#b04a15]/5 text-[#b04a15] ring-2 ring-[#b04a15]/20 font-bold"
                        : "border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 text-stone-600 dark:text-stone-400 hover:bg-stone-100/55"
                    }`}
                  >
                    <span className="text-sm font-bold">Donor 🎁</span>
                    <span className="text-3xs opacity-85 mt-0.5 font-normal">I want to donate items</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => set("role", "DONEE")}
                    className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl border text-center transition-all ${
                      form.role === "DONEE"
                        ? "border-[#b04a15] bg-[#b04a15]/5 text-[#b04a15] ring-2 ring-[#b04a15]/20 font-bold"
                        : "border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 text-stone-600 dark:text-stone-400 hover:bg-stone-100/55"
                    }`}
                  >
                    <span className="text-sm font-bold">Donee 🤝</span>
                    <span className="text-3xs opacity-85 mt-0.5 font-normal">I need to request support</span>
                  </button>
                </div>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="space-y-1">
                <Field
                  id="fullName" label={t("fullName")} placeholder="Jane Doe"
                  value={form.fullName}
                  onChange={val => { set("fullName", val); setFormError(null); v.onChange("fullName", () => validateFullName(val)); }}
                  onBlur={() => v.onBlur("fullName", validators.fullName)}
                  onCompositionStart={() => v.onCompositionStart("fullName")}
                  onCompositionEnd={() => v.onCompositionEnd("fullName", validators.fullName)}
                  readOnly={isSocialFlow && !!form.fullName}
                  autoComplete="name"
                  field={isSocialFlow && form.fullName ? undefined : v.get("fullName")}
                />
              </div>
            </Reveal>

            <Reveal delay={140}>
              <div className="space-y-1">
                {/* Google-linked email is read-only and shows the neutral linked
                    hint rather than a green tick — it was never validated here. */}
                <Field
                  id="email" label={t("email")} type="email" placeholder="you@example.com"
                  value={form.email}
                  onChange={val => { set("email", val); setFormError(null); v.onChange("email", () => validateEmail(val)); }}
                  onBlur={() => v.onBlur("email", validators.email)}
                  readOnly={isSocialFlow}
                  hint={isSocialFlow ? t("googleLinkedHint") : undefined}
                  autoComplete="email"
                  field={isSocialFlow ? undefined : v.get("email")}
                />
              </div>
            </Reveal>

            <Reveal delay={180}>
              {/* Phone with dial-code */}
              <div className="space-y-1 sm:space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-stone-700 dark:text-stone-300">
                  <Phone className="w-3.5 h-3.5" /> {t("phone")}
                </label>
                {/* min-w-0 on the input is what stops this row overflowing the
                    card: a flex item defaults to min-width:auto, and an <input>
                    has an implicit size=20, so flex-1 could grow it but never
                    shrink it below ~210px — which overran the 318px content box
                    sitting next to the dial select. */}
                <div className="flex gap-2">
                  <div className="w-[96px] sm:w-[120px] shrink-0">
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
                    className={`flex-1 min-w-0 rounded-xl border px-3.5 py-2.5 sm:px-4 sm:py-3 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 transition bg-stone-50 dark:bg-zinc-900 ${fieldStateClass(v.get("phone").status)}`}
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
            </Reveal>

            <Reveal delay={220}>
              {/* Location: Country → State → City */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-stone-700 dark:text-stone-300">
                    <MapPin className="w-3.5 h-3.5" /> {t("location")}
                  </label>
                  <button
                    type="button"
                    onClick={handleGPSLocation}
                    disabled={gpsLoading}
                    className="relative flex items-center gap-2 text-xs font-black text-[#b04a15] uppercase tracking-wide px-3 py-1.5 rounded-full border border-[#b04a15]/30 hover:bg-[#b04a15]/5 transition-colors disabled:opacity-50"
                  >
                    {/* Radar rings — visible only when active (not loading) */}
                    {!gpsLoading && (
                      <>
                        <span className="absolute inset-0 rounded-full border border-[#b04a15]/40 gps-radar-ring" />
                        <span className="absolute inset-0 rounded-full border border-[#b04a15]/25 gps-radar-ring-2" />
                      </>
                    )}
                    {/* Spinning ring while loading */}
                    {gpsLoading && (
                      <span className="absolute inset-0 rounded-full border-2 border-[#b04a15]/20 border-t-[#b04a15] animate-spin" />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                      </svg>
                      {gpsLoading ? "Detecting..." : "Use GPS"}
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-stone-500 dark:text-stone-400">{t("country")}</label>
                    <SearchableSelect
                      options={countryOptions}
                      value={countryIso}
                      onChange={handleCountryChange}
                      placeholder={t("selectCountry")}
                      searchPlaceholder={t("searchCountry")}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-stone-500 dark:text-stone-400">{t("state")}</label>
                    {noStateOptions ? (
                      <p className="text-xs text-stone-400 italic py-1.5">{t("noStatesListed")}</p>
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

                  <div className="space-y-1">
                    <label className="text-xs text-stone-500 dark:text-stone-400">{t("city")}</label>
                    {showCityFreeText ? (
                      <input
                        id="city"
                        type="text"
                        placeholder={t("enterCity")}
                        value={cityFreeText}
                        onChange={e => {
                          setCityFreeText(e.target.value);
                          v.onChange("city", () => validateCity("", e.target.value, true));
                          setFormError(null);
                        }}
                        onBlur={() => v.onBlur("city", validators.city)}
                        autoComplete="address-level2"
                        className="w-full rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 px-3.5 py-2.5 sm:px-4 sm:py-3 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:border-[#b04a15] focus:ring-2 focus:ring-[#b04a15]/20 transition"
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
                </div>

                {/* One shared verdict for the location group, so the user sees a
                    single "what's missing" rather than three competing messages.
                    Suppressed while city options are still loading, and while GPS
                    is running, so neither can produce a premature error. */}
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
            </Reveal>

            {/* Password — only on non-social flow */}
            {!isSocialFlow && (
              <Reveal delay={260}>
                <div className="space-y-1 sm:space-y-1.5">
                  <label htmlFor="password" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
                    {t("password")}
                  </label>
                  <div className="relative">
                    <input
                       id="password"
                       type={showPassword ? "text" : "password"}
                       autoComplete="new-password"
                       required
                       placeholder="••••••••"
                       value={form.password}
                       aria-invalid={v.get("password").status === "invalid" || undefined}
                       aria-describedby="password-feedback"
                       onChange={e => {
                         set("password", e.target.value);
                         setFormError(null);
                         // Stays neutral through characters 1-7 on the first pass;
                         // only goes live once it has already errored once.
                         v.onChange("password", () => validateRegisterPassword(e.target.value));
                       }}
                       onBlur={() => v.onBlur("password", () => validateRegisterPassword(form.password))}
                       className={`w-full rounded-xl border px-3.5 py-2.5 sm:px-4 sm:py-3 pr-11 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 transition bg-stone-50 dark:bg-zinc-900 ${fieldStateClass(v.get("password").status)}`}
                     />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      // `prev`, not `v` — `v` is the validation controller in this
                      // scope and shadowing it here is a trap for the next edit.
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Feedback sits BELOW the input, never inside it — an icon in
                      the field would collide with the show/hide button. */}
                  <ValidatedFieldFeedback
                    id="password-feedback"
                    status={v.get("password").status}
                    errorKey={v.get("password").errorKey}
                    successKey={v.get("password").successKey}
                    params={v.get("password").params}
                    serverText={v.get("password").serverErrorText}
                  />
                  {v.get("password").status !== "invalid" && v.get("password").status !== "valid" && (
                    <p className="text-xs text-stone-400">{tv("passwordHint")}</p>
                  )}
                </div>
              </Reveal>
            )}

            <Reveal delay={285}>
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 accent-[#b04a15] cursor-pointer"
                />
                <span className="text-sm text-stone-600 dark:text-stone-400 group-hover:text-stone-800 dark:group-hover:text-stone-200 transition-colors">
                  Remember me
                </span>
                <span className="ml-auto text-xs text-stone-400 dark:text-stone-500">
                  {rememberMe ? "Stay logged in" : "Log out on close"}
                </span>
              </label>
            </Reveal>

            <Reveal delay={300}>
              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#b04a15] hover:bg-[#963c0d] disabled:opacity-60 text-white font-semibold py-3 sm:py-3.5 text-sm tracking-wide transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15] focus-visible:ring-offset-2 mt-2 animate-heartbeat"
              >
                {loading
                  ? t("creating")
                  : isSocialFlow
                    ? t("complete")
                    : t("submit")}
              </button>
            </Reveal>
          </form>

          {/* Social buttons — only on non-social flow */}
          {!isSocialFlow && (
            <div className="space-y-3">
              <Reveal delay={340}>
                <button
                  type="button"
                  disabled={googleLoading}
                  onClick={() => {
                    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
                      toast.error("Google Sign-In is not configured.");
                      return;
                    }
                    triggerGoogle();
                  }}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-3 sm:px-4 sm:py-3.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:opacity-50"
                >
                  <GoogleIcon />
                  {googleLoading ? t("creating") : t("google")}
                </button>
              </Reveal>
              <Reveal delay={380}>
                <div className="relative">
                  <button
                    type="button"
                    disabled
                    className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-stone-100 dark:border-zinc-800/60 bg-stone-50 dark:bg-zinc-900/60 px-3.5 py-3 sm:px-4 sm:py-3.5 text-sm font-medium text-stone-400 dark:text-stone-600 cursor-not-allowed opacity-70"
                  >
                    <FacebookIcon />
                    {t("facebook")}
                  </button>
                  <span className="absolute -top-2 -right-2 text-4xs font-black uppercase tracking-widest text-white px-2 py-0.5 rounded-full bg-[#b04a15] border border-[#e07b3a]/40 shadow-sm pointer-events-none select-none">
                    Coming Soon
                  </span>
                </div>
              </Reveal>
            </div>
          )}

          {/* Cross-link */}
          <Reveal delay={420}>
            <p className="text-center text-sm text-stone-500 dark:text-stone-400">
              {t("haveAccount")}{" "}
              <a
                href="/login"
                onClick={(e) => { e.preventDefault(); router.push("/login"); }}
                className="font-semibold text-[#b04a15] dark:text-[#e07b3a] hover:underline underline-offset-2 cursor-pointer"
              >
                {t("logIn")}
              </a>
            </p>
          </Reveal>
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
