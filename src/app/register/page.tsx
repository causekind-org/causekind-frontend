"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { register, googleAuth, googleComplete } from "@/lib/api";
import { Eye, EyeOff, MapPin, Phone } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { useLocations } from "@/hooks/useLocations";
import { resolveLocationFromGPS } from "@/app/actions/locations";
import { SearchableSelect, type SelectOption } from "@/components/profile/SearchableSelect";
import { Reveal } from "@/components/Reveal";

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

function getDialCode(isoCode: string, dialCodes: any[]): string {
  const country = dialCodes.find((c) => c.value === isoCode);
  if (!country?.phonecode) return "";
  return `+${country.phonecode.replace(/^\+/, "")}`;
}

// ── Input component ──────────────────────────────────────────────────────────────
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
  const t = useTranslations("auth.register");
  const { setAuth, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isSocialFlow = searchParams.get("social") === "google";

  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "DONOR" });
  const [loading, setLoading] = useState(false);
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
  const [gpsLoading, setGpsLoading] = useState(false);
  const [panelAnimClass, setPanelAnimClass] = useState("");

  const { countries: countryOptions, states: stateOptions, cities: cityOptions, dialCodes: dialCodeOptions } = useLocations(countryIso, stateIso);

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
                } else if (cityName) {
                  setCityValue("");
                  setCityFreeText(cityName);
                }
              } else {
                setStateIso("");
                setCityValue("");
                if (cityName) setCityFreeText(cityName);
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
  const showCityFreeText = noStateOptions || noCityOptions;

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
          setAuth(res.token); // shim — cookie set by server
          toast.success("Welcome back!");
          router.push("/");
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

  // Read & clear the cross-page transition flag AFTER mount so animation fires with correct class
  useEffect(() => {
    const dir = sessionStorage.getItem("ck_auth_direction");
    setPanelAnimClass(dir === "login-to-register" ? "auth-panel-from-right" : "auth-panel-from-left");
    if (dir) sessionStorage.removeItem("ck_auth_direction");
  }, []);

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
                  } else if (cityName) {
                    setCityValue("");
                    setCityFreeText(cityName);
                  }
                } else {
                  setStateIso("");
                  setCityValue("");
                  if (cityName) setCityFreeText(cityName);
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
        router.replace("/login");
      }
    }
  }, [isSocialFlow, router]);

  if (user) return null;

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dialCode = getDialCode(dialCountry, dialCodeOptions);
    const fullPhone = dialCode && phoneNumber ? `${dialCode} ${phoneNumber}` : phoneNumber;
    const cityStr = buildCityString();

    setLoading(true);
    try {
      if (isSocialFlow && googleToken) {
        const res = await googleComplete(googleToken, fullPhone, cityStr, form.role);
        if (!res.needsCompletion) {
          sessionStorage.removeItem("ck_google_token");
          sessionStorage.removeItem("ck_google_profile");
          setAuth(res.token, rememberMe); // shim — cookie set by server
          toast.success("Account created! Welcome to CauseKind.");
          router.push("/");
        }
      } else {
        const res = await register({ ...form, phone: fullPhone, city: cityStr });
        setAuth(res.token, rememberMe); // shim — cookie set by server
        toast.success("Account created!");
        router.push("/");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100svh-4rem)] flex flex-col lg:flex-row bg-[#faf8f5] dark:bg-zinc-950">

      {/* ── LEFT: Brand/Image panel — slides in from direction of navigation ── */}
      <div className={`hidden lg:flex lg:w-[40%] relative p-8 flex-col justify-between overflow-hidden bg-[#120c04] border-r border-stone-850 shrink-0 ${panelAnimClass}`}>
        {/* Warmth glows */}
        <div className="absolute -top-24 left-1/4 h-[350px] w-[350px] rounded-full bg-[#b04a15]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 right-1/4 h-[350px] w-[350px] rounded-full bg-[#1e3a60]/15 blur-3xl pointer-events-none" />
        
        {/* Dot pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.05] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-2 mb-8">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#f0b97a] bg-[#b04a15]/25 border border-[#b04a15]/40 rounded-full px-3 py-1">
            Verified In-Kind
          </span>
        </div>

        <div className="relative z-10 space-y-6">
          <blockquote className="space-y-4">
            <p className="text-white text-3xl font-extrabold leading-tight tracking-tight font-serif">
              &ldquo;No one has ever become poor by giving.&rdquo;
            </p>
            <footer className="flex items-center gap-2">
              <span className="block h-px w-8 bg-[#e07b3a]" />
              <cite className="text-[#f0b97a] text-sm not-italic font-bold">Anne Frank</cite>
            </footer>
          </blockquote>
        </div>

        {/* Decorative graphic / background image */}
        <div className="absolute inset-0 opacity-[0.25] pointer-events-none mix-blend-luminosity">
          <Image
            src="/images/hero-4.webp"
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#120c04] via-transparent to-[#120c04]" />
        </div>

        <div className="relative z-10 text-[10px] font-bold text-white/30 uppercase tracking-widest">
          CauseKind India · 2026
        </div>
      </div>

      {/* ── RIGHT: Form panel ── */}
      <div className="flex flex-1 flex-col justify-between bg-white dark:bg-zinc-950 px-6 py-10 lg:px-16 overflow-y-auto relative overflow-hidden auth-form-appear">
        {/* Breathing warmth glows representing community light & hope */}
        <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-[#b04a15]/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 rounded-full bg-[#1e3a60]/5 blur-3xl pointer-events-none" />

        <div />

        <div className="w-full max-w-[440px] mx-auto space-y-6 relative z-10">
          {/* Heading */}
          <Reveal>
            <div className="space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#b04a15]">Create account</span>
              <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
                {isSocialFlow ? `${t("almostThereTitle")} 🎉` : `${t("joinTitle")} 🌱`}
              </h1>
              <p className="text-sm text-stone-505 dark:text-stone-400">
                {isSocialFlow ? t("googleLinkedSubtitle") : t("createSubtitle")}
              </p>
            </div>
          </Reveal>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Reveal delay={60}>
              {/* Role Selection Option */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
                  Register as
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => set("role", "DONOR")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      form.role === "DONOR"
                        ? "border-[#b04a15] bg-[#b04a15]/5 text-[#b04a15] ring-2 ring-[#b04a15]/20 font-bold"
                        : "border-stone-250 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 text-stone-600 dark:text-stone-400 hover:bg-stone-100/55"
                    }`}
                  >
                    <span className="text-sm font-bold">Donor 🎁</span>
                    <span className="text-[10px] opacity-85 mt-0.5 font-normal">I want to donate items</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => set("role", "DONEE")}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      form.role === "DONEE"
                        ? "border-[#b04a15] bg-[#b04a15]/5 text-[#b04a15] ring-2 ring-[#b04a15]/20 font-bold"
                        : "border-stone-250 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 text-stone-600 dark:text-stone-400 hover:bg-stone-100/55"
                    }`}
                  >
                    <span className="text-sm font-bold">Donee 🤝</span>
                    <span className="text-[10px] opacity-85 mt-0.5 font-normal">I need to request support</span>
                  </button>
                </div>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <Field
                id="fullName" label={t("fullName")} placeholder="Jane Doe"
                value={form.fullName} onChange={v => set("fullName", v)}
                readOnly={isSocialFlow && !!form.fullName}
                autoComplete="name"
              />
            </Reveal>

            <Reveal delay={140}>
              <Field
                id="email" label={t("email")} type="email" placeholder="you@example.com"
                value={form.email} onChange={v => set("email", v)}
                readOnly={isSocialFlow}
                hint={isSocialFlow ? t("googleLinkedHint") : undefined}
                autoComplete="email"
              />
            </Reveal>

            <Reveal delay={180}>
              {/* Phone with dial-code */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-stone-700 dark:text-stone-300">
                  <Phone className="w-3.5 h-3.5" /> {t("phone")}
                </label>
                <div className="flex gap-2">
                  <div className="w-[120px] shrink-0">
                    <SearchableSelect
                      options={dialCodeOptions}
                      value={dialCountry}
                      onChange={setDialCountry}
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
                    onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                    autoComplete="tel"
                    className="flex-1 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:border-[#b04a15] focus:ring-2 focus:ring-[#b04a15]/20 transition"
                  />
                </div>
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
                    <label className="text-xs text-stone-505 dark:text-stone-400">{t("country")}</label>
                    <SearchableSelect
                      options={countryOptions}
                      value={countryIso}
                      onChange={handleCountryChange}
                      placeholder={t("selectCountry")}
                      searchPlaceholder={t("searchCountry")}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-stone-505 dark:text-stone-400">{t("state")}</label>
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
                    <label className="text-xs text-stone-505 dark:text-stone-400">{t("city")}</label>
                    {showCityFreeText ? (
                      <input
                        id="city"
                        type="text"
                        placeholder={t("enterCity")}
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
                        placeholder={t("selectCity")}
                        disabledPlaceholder={t("selectStateFirst")}
                        disabled={!stateIso && !noStateOptions}
                        searchPlaceholder={t("searchCity")}
                      />
                    )}
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Password — only on non-social flow */}
            {!isSocialFlow && (
              <Reveal delay={260}>
                <div className="space-y-1.5">
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
                className="w-full rounded-xl bg-[#b04a15] hover:bg-[#963c0d] disabled:opacity-60 text-white font-semibold py-3.5 text-sm tracking-wide transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15] focus-visible:ring-offset-2 mt-2 animate-heartbeat"
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
                  onClick={() => triggerGoogle()}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3.5 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 disabled:opacity-50"
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
                    className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-stone-100 dark:border-zinc-800/60 bg-stone-50 dark:bg-zinc-900/60 px-4 py-3.5 text-sm font-medium text-stone-400 dark:text-stone-600 cursor-not-allowed opacity-70"
                  >
                    <FacebookIcon />
                    {t("facebook")}
                  </button>
                  <span className="absolute -top-2 -right-2 text-[9px] font-black uppercase tracking-widest text-white px-2 py-0.5 rounded-full bg-[#b04a15] border border-[#e07b3a]/40 shadow-sm pointer-events-none select-none">
                    Coming Soon
                  </span>
                </div>
              </Reveal>
            </div>
          )}

          {/* Cross-link */}
          <Reveal delay={420}>
            <p className="text-center text-sm text-stone-550 dark:text-stone-400">
              {t("haveAccount")}{" "}
              <a
                href="/login"
                onClick={(e) => {
                  e.preventDefault();
                  sessionStorage.setItem("ck_auth_direction", "register-to-login");
                  window.location.href = "/login";
                }}
                className="font-semibold text-[#b04a15] dark:text-[#e07b3a] hover:underline underline-offset-2 cursor-pointer"
              >
                {t("logIn")}
              </a>
            </p>
          </Reveal>
        </div>

        <p className="mt-8 text-center text-xs text-stone-400 dark:text-zinc-600">
          &copy; 2026 CauseKind
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
