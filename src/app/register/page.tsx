"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { register, googleAuth, googleComplete } from "@/lib/api";
import { Eye, EyeOff, MapPin, Phone } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { Country, State, City } from "country-state-city";
import { SearchableSelect, type SelectOption } from "@/components/profile/SearchableSelect";

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

function buildCountryOptions(): SelectOption[] {
  return Country.getAllCountries().map((c) => ({
    value: c.isoCode,
    label: c.name,
  }));
}

function buildStateOptions(countryIso: string): SelectOption[] {
  return State.getStatesOfCountry(countryIso).map((s) => ({
    value: s.isoCode,
    label: s.name,
  }));
}

function buildCityOptions(countryIso: string, stateIso: string): SelectOption[] {
  return City.getCitiesOfState(countryIso, stateIso).map((c) => ({
    value: c.name,
    label: c.name,
  }));
}

function buildDialCodeOptions(): SelectOption[] {
  return Country.getAllCountries()
    .filter((c) => c.phonecode)
    .map((c) => ({
      value: c.isoCode,
      label: `${c.name} (+${c.phonecode.replace(/^\+/, "")})`,
      prefix: c.flag ?? "",
    }));
}

function getDialCode(isoCode: string): string {
  const country = Country.getAllCountries().find((c) => c.isoCode === isoCode);
  if (!country?.phonecode) return "";
  return `+${country.phonecode.replace(/^\+/, "")}`;
}

// ── Input component (reduces repetition) ──────────────────────────────────────
function Field({
  id, label, type = "text", placeholder, value, onChange, required = true,
  readOnly = false, hint, autoComplete,
}: {
  id: string; label: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; required?: boolean;
  readOnly?: boolean; hint?: string; autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
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
        onChange={e => onChange(e.target.value)}
        className={`w-full rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-[#b04a15] focus:ring-2 focus:ring-[#b04a15]/20 transition ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
      />
      {hint && <p className="text-xs text-stone-400">{hint}</p>}
    </div>
  );
}

// ── Main content ───────────────────────────────────────────────────────────────
function RegisterContent() {
  const { setAuth, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isSocialFlow = searchParams.get("social") === "google";

  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Phone
  const [dialCountry, setDialCountry] = useState("IN");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Location
  const [countryIso, setCountryIso] = useState("");
  const [stateIso, setStateIso] = useState("");
  const [cityValue, setCityValue] = useState("");
  const [cityFreeText, setCityFreeText] = useState("");

  const dialCodeOptions = buildDialCodeOptions();
  const countryOptions = buildCountryOptions();
  const stateOptions = countryIso ? buildStateOptions(countryIso) : [];
  const cityOptions = countryIso && stateIso ? buildCityOptions(countryIso, stateIso) : [];

  const noStateOptions = countryIso !== "" && stateOptions.length === 0;
  const noCityOptions = stateIso !== "" && cityOptions.length === 0;
  const showCityFreeText = noStateOptions || noCityOptions;

  function triggerGoogle() {
    const btn = googleBtnRef.current?.querySelector<HTMLElement>('div[role="button"], button');
    btn?.click();
  }

  function handleCountryChange(iso: string) {
    setCountryIso(iso);
    setStateIso("");
    setCityValue("");
    setCityFreeText("");
  }

  function handleStateChange(iso: string) {
    setStateIso(iso);
    setCityValue("");
    setCityFreeText("");
  }

  function buildCityString(): string {
    if (showCityFreeText) {
      return [cityFreeText, stateIso, countryIso].filter(Boolean).join(", ");
    }
    return [cityValue, stateIso, countryIso].filter(Boolean).join(", ");
  }

  useEffect(() => { if (user) router.replace("/"); }, [user, router]);

  // Detect country from IP on mount
  useEffect(() => {
    detectCountryFromIP().then((code) => {
      setDialCountry(code);
      setCountryIso(code);
    });
  }, []);

  // Pre-fill from Google if coming from Google OAuth flow
  useEffect(() => {
    if (isSocialFlow) {
      const token = sessionStorage.getItem("ck_google_token");
      const profile = sessionStorage.getItem("ck_google_profile");
      if (token && profile) {
        const { email, fullName } = JSON.parse(profile);
        setGoogleIdToken(token);
        setForm(f => ({ ...f, email: email ?? "", fullName: fullName ?? "" }));
      } else {
        router.replace("/login");
      }
    }
  }, [isSocialFlow, router]);

  if (user) return null;

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dialCode = getDialCode(dialCountry);
    const fullPhone = dialCode && phoneNumber ? `${dialCode} ${phoneNumber}` : phoneNumber;
    const cityStr = buildCityString();

    setLoading(true);
    try {
      if (isSocialFlow && googleIdToken) {
        const res = await googleComplete(googleIdToken, fullPhone, cityStr);
        if (!res.needsCompletion) {
          sessionStorage.removeItem("ck_google_token");
          sessionStorage.removeItem("ck_google_profile");
          setAuth(res.token);
          toast.success("Account created! Welcome to CauseKind.");
          router.push("/");
        }
      } else {
        const { token } = await register({ ...form, phone: fullPhone, city: cityStr });
        setAuth(token);
        toast.success("Account created!");
        router.push("/");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse: { credential?: string }) {
    if (!credentialResponse.credential) return;
    setGoogleLoading(true);
    try {
      const res = await googleAuth(credentialResponse.credential);
      if (res.needsCompletion) {
        sessionStorage.setItem("ck_google_token", credentialResponse.credential);
        sessionStorage.setItem("ck_google_profile", JSON.stringify({ email: res.email, fullName: res.fullName }));
        router.push("/register?social=google");
      } else {
        setAuth(res.token);
        toast.success("Welcome back!");
        router.push("/");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100svh-4rem)] flex">

      {/* ── LEFT: Form panel ───────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-between bg-white dark:bg-zinc-950 px-6 py-8 sm:py-10 lg:max-w-[520px] lg:px-12 overflow-y-auto">

        <div />

        <div className="w-full max-w-[440px] mx-auto space-y-6">

          {/* Heading */}
          <div className="space-y-1.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
              {isSocialFlow ? "Almost there 🎉" : "Join CauseKind 🌱"}
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {isSocialFlow
                ? "Your Google account is linked. Just add your phone and location to finish."
                : "Create your account and start making a difference today."}
            </p>
          </div>

          {/* Hidden Google SSO — triggered programmatically by the styled button below */}
          {!isSocialFlow && (
            <div ref={googleBtnRef} aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error("Google sign-up failed")}
                width="300"
              />
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Full name */}
            <Field
              id="fullName" label="Full name" placeholder="Jane Doe"
              value={form.fullName} onChange={v => set("fullName", v)}
              readOnly={isSocialFlow && !!form.fullName}
              autoComplete="name"
            />

            {/* Email */}
            <Field
              id="email" label="Email address" type="email" placeholder="you@example.com"
              value={form.email} onChange={v => set("email", v)}
              readOnly={isSocialFlow}
              hint={isSocialFlow ? "Linked from your Google account" : undefined}
              autoComplete="email"
            />

            {/* Phone with dial-code */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-semibold text-stone-700 dark:text-stone-300">
                <Phone className="w-3.5 h-3.5" /> Phone number
              </label>
              <div className="flex gap-2">
                <div className="w-[120px] shrink-0">
                  <SearchableSelect
                    options={dialCodeOptions}
                    value={dialCountry}
                    onChange={setDialCountry}
                    placeholder="+–"
                    searchPlaceholder="Search country…"
                    renderSelectedLabel={(opt) => getDialCode(opt.value)}
                  />
                </div>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="Phone number"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                  autoComplete="tel"
                  className="flex-1 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:border-[#b04a15] focus:ring-2 focus:ring-[#b04a15]/20 transition"
                />
              </div>
            </div>

            {/* Location: Country → State → City */}
            <div className="space-y-3">
              <label className="flex items-center gap-1.5 text-sm font-semibold text-stone-700 dark:text-stone-300">
                <MapPin className="w-3.5 h-3.5" /> Location
              </label>

              {/* Country */}
              <div className="space-y-1">
                <label className="text-xs text-stone-500 dark:text-stone-400">Country</label>
                <SearchableSelect
                  options={countryOptions}
                  value={countryIso}
                  onChange={handleCountryChange}
                  placeholder="Select country"
                  searchPlaceholder="Search country…"
                />
              </div>

              {/* State */}
              <div className="space-y-1">
                <label className="text-xs text-stone-500 dark:text-stone-400">State / Province</label>
                {noStateOptions ? (
                  <p className="text-xs text-stone-400 italic py-1">No states listed — enter city below.</p>
                ) : (
                  <SearchableSelect
                    options={stateOptions}
                    value={stateIso}
                    onChange={handleStateChange}
                    placeholder="Select state"
                    disabledPlaceholder="Select country first"
                    disabled={!countryIso}
                    searchPlaceholder="Search state…"
                  />
                )}
              </div>

              {/* City */}
              <div className="space-y-1">
                <label className="text-xs text-stone-500 dark:text-stone-400">City</label>
                {showCityFreeText ? (
                  <input
                    id="city"
                    type="text"
                    placeholder="Enter your city"
                    value={cityFreeText}
                    onChange={e => setCityFreeText(e.target.value)}
                    autoComplete="address-level2"
                    className="w-full rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:border-[#b04a15] focus:ring-2 focus:ring-[#b04a15]/20 transition"
                  />
                ) : (
                  <SearchableSelect
                    options={cityOptions}
                    value={cityValue}
                    onChange={setCityValue}
                    placeholder="Select city"
                    disabledPlaceholder="Select state first"
                    disabled={!stateIso && !noStateOptions}
                    searchPlaceholder="Search city…"
                  />
                )}
              </div>
            </div>

            {/* Password — only on non-social flow */}
            {!isSocialFlow && (
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => set("password", e.target.value)}
                    className="w-full rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 px-4 py-3 pr-11 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-[#b04a15] focus:ring-2 focus:ring-[#b04a15]/20 transition"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#b04a15] hover:bg-[#963c0d] disabled:opacity-60 text-white font-semibold py-3 text-sm tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15] focus-visible:ring-offset-2 mt-2"
            >
              {loading
                ? "Creating account…"
                : isSocialFlow
                  ? "Complete registration"
                  : "Create account"}
            </button>
          </form>

          {/* Social buttons — only on non-social flow */}
          {!isSocialFlow && (
            <div className="space-y-3">
              <button
                type="button"
                disabled={googleLoading}
                onClick={triggerGoogle}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:opacity-50"
              >
                <GoogleIcon />
                {googleLoading ? "Signing in…" : "Continue with Google"}
              </button>
              <button
                type="button"
                onClick={() => toast.info("Social sign-in coming soon")}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
              >
                <FacebookIcon />
                Continue with Facebook
              </button>
            </div>
          )}

          {/* Cross-link */}
          <p className="text-center text-sm text-stone-500 dark:text-stone-400">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#b04a15] dark:text-[#e07b3a] hover:underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-stone-400 dark:text-zinc-600">
          &copy; 2026 CauseKind
        </p>
      </div>

      {/* ── RIGHT: Image panel (hidden on mobile) ──────────────────────────── */}
      <div className="hidden lg:flex flex-1 relative p-6">
        <div className="relative w-full h-full rounded-3xl overflow-hidden">
          <Image
            src="/images/hero-4.jpg"
            alt="Community members supporting each other"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />
          <div className="absolute bottom-0 left-0 right-0 p-10">
            <blockquote className="space-y-3">
              <p className="text-white text-2xl font-bold leading-snug" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                &ldquo;No one has ever become poor by giving.&rdquo;
              </p>
              <footer className="flex items-center gap-2">
                <span className="block h-px w-8 bg-white/50" />
                <cite className="text-white/70 text-sm not-italic font-medium">Anne Frank</cite>
              </footer>
            </blockquote>
          </div>
        </div>
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
