"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { createItemRequest, getProfile } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImagePlus, Loader2, X, MapPin } from "lucide-react";
import Image from "next/image";
import { useLocations } from "@/hooks/useLocations";
import { resolveLocationFromGPS } from "@/app/actions/locations";
import { SearchableSelect, type SelectOption } from "@/components/profile/SearchableSelect";
import { useTranslations } from "next-intl";

const CATEGORIES = ["Medical aid", "Education", "Livelihood", "Relief", "Household"];

const empty = { title: "", category: "", quantity: 1, urgency: "NORMAL", city: "", pincode: "", description: "", imageUrl: "", pickupRadiusKm: 10 };

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

export default function NewRequestPage() {
  const t = useTranslations("requestNew");
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [radiusSel, setRadiusSel] = useState("10");
  const [customRadius, setCustomRadius] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsBlocked, setGpsBlocked] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  // Location cascades states
  const [countryIso, setCountryIso] = useState<string>("");
  const [stateIso, setStateIso] = useState<string>("");
  const [cityValue, setCityValue] = useState<string>("");
  const [cityFreeText, setCityFreeText] = useState<string>("");

  // Derived option lists
  const { countries: countryOptions, states: stateOptions, cities: cityOptions } = useLocations(countryIso, stateIso);

  // Fallback to free-text for city
  const noStateOptions = countryIso !== "" && stateOptions.length === 0;
  const noCityOptions = stateIso !== "" && cityOptions.length === 0;
  const showCityFreeText = noStateOptions || noCityOptions;

  // Urgency and radius options built from translations
  const URGENCIES = [
    { value: "NORMAL", label: t("urgencyNormal") },
    { value: "HIGH", label: t("urgencyHigh") },
    { value: "CRITICAL", label: t("urgencyCritical") },
  ];

  const PICKUP_RADII = [
    { value: "5",      label: t("radiusWithin5")  },
    { value: "10",     label: t("radiusWithin10") },
    { value: "15",     label: t("radiusWithin15") },
    { value: "20",     label: t("radiusWithin20") },
    { value: "25",     label: t("radiusWithin25") },
    { value: "50",     label: t("radiusWithin50") },
    { value: "custom", label: t("radiusCustom")   },
  ];

  useEffect(() => {
    if (!user) { router.push("/login"); return; }

    // Fetch profile to auto-fill location and verify role
    getProfile()
      .then((p) => {
        if (p.role !== "DONEE" && p.role !== "ADMIN") {
          toast.error("Access denied. Only Beneficiaries (Donees) can post needs.");
          router.push("/dashboard");
          return;
        }
        if (p.city) {
          const parts = p.city.split(",").map((s) => s.trim());
          if (parts.length === 3) {
            const [cCity, cState, cCountry] = parts;
            setCountryIso(cCountry || "IN");
            setStateIso(cState || "");
            if (cCity) {
              setCityValue(cCity);
            } else {
              setCityFreeText(cCity);
            }
          } else {
            setCountryIso("IN");
            setCityFreeText(p.city);
          }
        } else {
          setCountryIso("IN");
        }
      })
      .catch((err) => {
        console.error("Failed to load profile for location prefill:", err);
        setCountryIso("IN");
      });
  }, [user, router]);

  useEffect(() => {
    if (user) {
      handleGPSLocation(true);
    }
  }, [user]);

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

  function handleCityChange(val: string) {
    setCityValue(val);
    setCityFreeText("");
  }

  function handleGPSLocation(isAuto = false) {
    if (!navigator.geolocation) {
      toast.error("Your browser doesn't support GPS location");
      setGpsBlocked(true);
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGpsCoords({ lat, lng });
        setGpsBlocked(false);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`);
          if (!res.ok) throw new Error();
          const data = await res.json();
          const address = data.address;
          if (address) {
            const countryCode = address.country_code?.toUpperCase();
            const stateName = address.state;
            const cityName = address.city || address.town || address.village || address.suburb;
            
            if (countryCode) {
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
              if (!isAuto) toast.success("Location updated successfully!");
            }
          }
        } catch {
          if (!isAuto) toast.error("Failed to detect location details");
        } finally {
          setGpsLoading(false);
        }
      },
      () => {
        setGpsLoading(false);
        setGpsBlocked(true);
        toast.error("Location access denied. You must allow GPS access to post needs.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function buildCityString(): string {
    if (showCityFreeText) {
      return [cityFreeText, stateIso, countryIso].filter(Boolean).join(", ");
    }
    return [cityValue, stateIso, countryIso].filter(Boolean).join(", ");
  }

  function set(field: string, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set("imageUrl", ev.target?.result as string ?? "");
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cityStr = buildCityString();
    const finalRadius = radiusSel === "custom"
      ? (parseInt(customRadius) > 0 ? parseInt(customRadius) : null)
      : parseInt(radiusSel);

    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.category) errs.category = "Category is required";
    if (!cityStr) errs.city = "City is required";
    if (!form.description.trim()) errs.description = "Description is required";
    if (radiusSel === "custom" && !finalRadius) errs.radius = "Enter a valid custom radius";
    if (!gpsCoords) errs.gps = "GPS location access is required";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      toast.error("Please fix the highlighted fields");
      return;
    }
    const coords = gpsCoords;
    if (!coords) return;
    setFieldErrors({});
    setSubmitting(true);
    try {
      await createItemRequest({
        ...form,
        city: cityStr,
        quantity: Number(form.quantity),
        imageUrl: form.imageUrl || null,
        pickupRadiusKm: finalRadius ?? undefined,
        latitude: coords.lat,
        longitude: coords.lng
      });
      toast.success(t("toastSuccess"));
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toastError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  if (gpsBlocked) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#faf8f5] dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-stone-250 dark:border-zinc-800 shadow-xl">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center text-red-500">
            <MapPin className="w-8 h-8 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 dark:text-white">Location Access Required</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Causekind requires your GPS location to connect your request with nearby donors. Please enable location permissions in your browser to proceed.
            </p>
          </div>
          <Button 
            onClick={() => handleGPSLocation(false)} 
            disabled={gpsLoading}
            className="w-full bg-[#b04a15] hover:bg-[#963c0d] text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2"
          >
            {gpsLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Detecting...</> : "Retry Location Detection 🎯"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row bg-[#faf8f5] dark:bg-zinc-950">
      {/* ── LEFT PANEL: Asymmetric info stripe ── */}
      <div className="hidden lg:flex lg:w-[35%] relative p-8 flex-col justify-between overflow-hidden bg-[#120c04] border-r border-stone-850 shrink-0">
        {/* Warm glow circles */}
        <div className="absolute -top-24 left-1/4 h-[300px] w-[300px] rounded-full bg-[#1e3a60]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 right-1/4 h-[300px] w-[300px] rounded-full bg-[#b04a15]/15 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.04] pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#f0b97a] bg-[#b04a15]/25 border border-[#b04a15]/40 rounded-full px-3 py-1 self-start">
            Verified Support
          </span>
          <h2 className="text-white text-3xl font-extrabold leading-tight tracking-tight font-serif mt-4">
            Request Support 🌱
          </h2>
          <p className="text-stone-300 text-sm leading-relaxed font-medium">
            Describe the physical items you need (like textbooks, blankets, medical kits, or toys) and specify where they are needed. Verified nearby donors will match and deliver them to your location.
          </p>
        </div>

        <div className="relative z-10 text-[10px] font-bold text-white/30 uppercase tracking-widest">
          CauseKind India · 2026
        </div>
      </div>

      {/* ── RIGHT PANEL: Scrollable Form ── */}
      <div className="flex-1 px-6 py-10 lg:px-16 overflow-y-auto relative bg-white dark:bg-zinc-950">
        {/* Ambient glows */}
        <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-[#b04a15]/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 rounded-full bg-[#1e3a60]/5 blur-3xl pointer-events-none" />

        <div className="max-w-[540px] mx-auto space-y-6 relative z-10">
          <div className="space-y-1.5 mb-6">
            <span className="text-[11px] font-black uppercase tracking-widest text-[#b04a15]">In-Kind Support</span>
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
              {t("cardTitle")}
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {t("cardSubtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label={t("fieldItemName")} error={fieldErrors.title}>
              <Input placeholder={t("placeholderItemName")} value={form.title} onChange={(e) => set("title", e.target.value)} className={fieldErrors.title ? "border-red-500" : ""} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("fieldCategory")} error={fieldErrors.category}>
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger className={fieldErrors.category ? "border-red-500" : ""}><SelectValue placeholder={t("placeholderCategory")} /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label={t("fieldQuantity")}>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} required />
              </Field>
              <Field label={t("fieldUrgency")}>
                <Select value={form.urgency} onValueChange={(v) => set("urgency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{URGENCIES.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label={t("fieldPincode")}>
                <Input placeholder="411001" value={form.pincode} onChange={(e) => set("pincode", e.target.value)} />
              </Field>
              <div className="sm:col-span-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-stone-700 dark:text-stone-300">
                    <MapPin className="w-3.5 h-3.5" /> Location Selection
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGPSLocation(false)}
                    disabled={gpsLoading}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#b04a15] hover:underline uppercase disabled:opacity-50"
                  >
                    {gpsLoading ? "Detecting..." : "Use GPS 🎯"}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-stone-500 dark:text-stone-400">{t("fieldCountry")}</label>
                    <SearchableSelect
                      id="country"
                      options={countryOptions}
                      value={countryIso}
                      onChange={handleCountryChange}
                      placeholder={t("placeholderCountry")}
                      searchPlaceholder={t("searchCountry")}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-stone-500 dark:text-stone-400">{t("fieldState")}</label>
                    {noStateOptions ? (
                      <p className="text-xs text-stone-400 italic py-2">
                        {t("noStatesListed")}
                      </p>
                    ) : (
                      <SearchableSelect
                        id="state"
                        options={stateOptions}
                        value={stateIso}
                        onChange={handleStateChange}
                        placeholder={t("placeholderState")}
                        disabledPlaceholder={t("disabledPlaceholderState")}
                        disabled={!countryIso}
                        searchPlaceholder={t("searchState")}
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-stone-500 dark:text-stone-400">{t("fieldCity")}</label>
                    {showCityFreeText ? (
                      <Input
                        id="city"
                        placeholder={t("placeholderCityInput")}
                        value={cityFreeText}
                        onChange={(e) => setCityFreeText(e.target.value)}
                        className={fieldErrors.city ? "border-red-500" : ""}
                      />
                    ) : (
                      <SearchableSelect
                        id="city"
                        options={cityOptions}
                        value={cityValue}
                        onChange={handleCityChange}
                        placeholder={t("placeholderCity")}
                        disabledPlaceholder={t("disabledPlaceholderCity")}
                        disabled={!stateIso && !noStateOptions}
                        searchPlaceholder={t("searchCity")}
                      />
                    )}
                  </div>
                </div>
                {fieldErrors.city && <p className="text-xs text-red-500 font-medium">{fieldErrors.city}</p>}
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Field label={t("fieldPickupRadius")}>
                  <Select value={radiusSel} onValueChange={setRadiusSel}>
                    <SelectTrigger><SelectValue placeholder={t("placeholderPickupRadius")} /></SelectTrigger>
                    <SelectContent>
                      {PICKUP_RADII.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {radiusSel === "custom" && (
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        placeholder={t("placeholderCustomKm")}
                        value={customRadius}
                        onChange={(e) => setCustomRadius(e.target.value)}
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">{t("kmFromLocation")}</span>
                    </div>
                  )}
                </Field>
                <p className="text-[11px] text-stone-400">
                  {t("pickupRadiusHint")}
                </p>
              </div>
            </div>
            <Field label={t("fieldWhyNeeded")} error={fieldErrors.description}>
              <Textarea rows={4} placeholder={t("placeholderWhyNeeded")} value={form.description} onChange={(e) => set("description", e.target.value)} className={fieldErrors.description ? "border-red-500" : ""} />
            </Field>
            <Field label={t("fieldPhoto")}>
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              {form.imageUrl ? (
                <div className="group relative aspect-video w-full overflow-hidden rounded-xl border bg-muted">
                  <Image src={form.imageUrl} alt="preview" fill className="object-cover" />
                  <button type="button" onClick={() => set("imageUrl", "")} className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => photoRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <ImagePlus className="h-6 w-6" />
                  <span className="font-medium">{t("clickToAddPhoto")}</span>
                  <span className="text-xs">{t("photoHint")}</span>
                </button>
              )}
            </Field>
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={submitting} className="btn-3d bg-[#b04a15] hover:bg-[#963c0d] text-white rounded-xl px-6 py-2.5 font-bold">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("submitting")}</> : t("submitForReview")}
              </Button>
              <Link href="/dashboard">
                <Button type="button" variant="outline" className="btn-3d rounded-xl px-6 py-2.5 font-semibold text-stone-600">
                  {t("cancel")}
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
