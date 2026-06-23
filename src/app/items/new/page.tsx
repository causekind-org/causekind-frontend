"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createItemListing, getProfile } from "@/lib/api";
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

const CATEGORIES = ["Education", "Clothing", "Furniture", "Electronics", "Household", "Sports", "Medical aid"];
const CONDITIONS = ["Like new", "Good", "Fair"];

const empty = {
  title: "",
  category: "",
  quantity: 1,
  condition: "",
  city: "",
  pincode: "",
  description: "",
  imageUrl: "",
  maximumDeliveryRadius: 25,
  transportPayerPreference: "TO_BE_DISCUSSED"
};



function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function NewItemPage() {
  const t = useTranslations("itemNew");
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
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

  useEffect(() => {
    if (!user) { router.push("/login"); return; }

    // Fetch profile to auto-fill location and verify role
    getProfile()
      .then((p) => {
        if (p.role !== "DONOR" && p.role !== "ADMIN") {
          toast.error("Access denied. Only Donors can list items.");
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
    if (!cityStr) {
      toast.error(t("toastCityRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await createItemListing({ ...form, city: cityStr, quantity: Number(form.quantity), imageUrl: form.imageUrl || null });
      toast.success(t("toastSuccess"));
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toastError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

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
            Verified Giving
          </span>
          <h2 className="text-white text-3xl font-extrabold leading-tight tracking-tight font-serif mt-4">
            List an Item 🎁
          </h2>
          <p className="text-stone-300 text-sm leading-relaxed font-medium">
            Offer physical items you no longer use (like textbooks, clothes, electronics, or household goods). Nearby beneficiaries in need will be matched to receive them directly.
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
            <span className="text-[11px] font-black uppercase tracking-widest text-[#b04a15]">Donate Items</span>
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
              {t("cardTitle")}
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {t("cardSubtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label={t("fieldItemName")}>
              <Input placeholder={t("placeholderItemName")} value={form.title} onChange={(e) => set("title", e.target.value)} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("fieldCategory")}>
                <Select value={form.category} onValueChange={(v) => set("category", v)} required>
                  <SelectTrigger><SelectValue placeholder={t("placeholderCategory")} /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label={t("fieldQuantity")}>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} required />
              </Field>
              <Field label={t("fieldCondition")}>
                <Select value={form.condition} onValueChange={(v) => set("condition", v)} required>
                  <SelectTrigger><SelectValue placeholder={t("placeholderCondition")} /></SelectTrigger>
                  <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
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
                    onClick={handleGPSLocation}
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
                        required
                      />
                    ) : (
                      <SearchableSelect
                        id="city"
                        options={cityOptions}
                        value={cityValue}
                        onChange={setCityValue}
                        placeholder={t("placeholderCity")}
                        disabledPlaceholder={t("disabledPlaceholderCity")}
                        disabled={!stateIso && !noStateOptions}
                        searchPlaceholder={t("searchCity")}
                      />
                    )}
                  </div>
                </div>
              </div>
              <Field label="Maximum Delivery Radius (km)">
                <Input
                  type="number"
                  min={1}
                  value={form.maximumDeliveryRadius}
                  onChange={(e) => set("maximumDeliveryRadius", Number(e.target.value))}
                  required
                />
              </Field>
              <Field label="Transport Payer Preference">
                <Select
                  value={form.transportPayerPreference}
                  onValueChange={(v) => set("transportPayerPreference", v)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select transport preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DONOR_PAYS">Donor Pays (I will pay shipping)</SelectItem>
                    <SelectItem value="DONEE_PAYS">Donee Pays (Beneficiary collects or pays shipping)</SelectItem>
                    <SelectItem value="SHARED">Shared (Split transport cost)</SelectItem>
                    <SelectItem value="SPONSORED">Sponsored (Request platform sponsorship)</SelectItem>
                    <SelectItem value="TO_BE_DISCUSSED">To be discussed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label={t("fieldDescription")}>
              <Textarea rows={4} placeholder={t("placeholderDescription")} value={form.description} onChange={(e) => set("description", e.target.value)} />
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
