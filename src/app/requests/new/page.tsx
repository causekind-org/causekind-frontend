"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
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
import { Country, State, City } from "country-state-city";
import { SearchableSelect, type SelectOption } from "@/components/profile/SearchableSelect";
import { useTranslations } from "next-intl";

const CATEGORIES = ["Medical aid", "Education", "Livelihood", "Relief", "Household"];

const empty = { title: "", category: "", quantity: 1, urgency: "NORMAL", city: "", pincode: "", description: "", imageUrl: "", pickupRadiusKm: 10 };

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function NewRequestPage() {
  const t = useTranslations("requestNew");
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [radiusSel, setRadiusSel] = useState("10");
  const [customRadius, setCustomRadius] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  // Location cascades states
  const [countryIso, setCountryIso] = useState<string>("");
  const [stateIso, setStateIso] = useState<string>("");
  const [cityValue, setCityValue] = useState<string>("");
  const [cityFreeText, setCityFreeText] = useState<string>("");

  // Derived option lists
  const countryOptions = buildCountryOptions();
  const stateOptions = countryIso ? buildStateOptions(countryIso) : [];
  const cityOptions = countryIso && stateIso ? buildCityOptions(countryIso, stateIso) : [];

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

    // Fetch profile to auto-fill location
    getProfile()
      .then((p) => {
        if (p.city) {
          const parts = p.city.split(",").map((s) => s.trim());
          if (parts.length === 3) {
            const [cCity, cState, cCountry] = parts;
            setCountryIso(cCountry || "IN");
            setStateIso(cState || "");
            const states = State.getStatesOfCountry(cCountry);
            const cities = City.getCitiesOfState(cCountry, cState);
            if (cities.some((c) => c.name === cCity)) {
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

  function handleCityChange(val: string) {
    setCityValue(val);
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
              const states = State.getStatesOfCountry(countryCode);
              const matchedState = states.find(
                (s) => s.name.toLowerCase() === stateName?.toLowerCase() ||
                       s.name.toLowerCase().includes(stateName?.toLowerCase() || "")
              );
              if (matchedState) {
                setStateIso(matchedState.isoCode);
                const cities = City.getCitiesOfState(countryCode, matchedState.isoCode);
                const matchedCity = cities.find(
                  (c) => c.name.toLowerCase() === cityName?.toLowerCase()
                );
                if (matchedCity) {
                  setCityValue(matchedCity.name);
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
    const finalRadius = radiusSel === "custom"
      ? (parseInt(customRadius) > 0 ? parseInt(customRadius) : null)
      : parseInt(radiusSel);
    if (radiusSel === "custom" && !finalRadius) {
      toast.error(t("toastInvalidRadius"));
      return;
    }
    setSubmitting(true);
    try {
      await createItemRequest({ ...form, city: cityStr, quantity: Number(form.quantity), imageUrl: form.imageUrl || null, pickupRadiusKm: finalRadius ?? undefined });
      toast.success(t("toastSuccess"));
      router.push("/donee/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toastError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{t("cardTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("cardSubtitle")}
          </p>
        </CardHeader>
        <CardContent>
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
              <Field label={t("fieldUrgency")}>
                <Select value={form.urgency} onValueChange={(v) => set("urgency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{URGENCIES.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label={t("fieldPincode")}>
                <Input placeholder="411001" value={form.pincode} onChange={(e) => set("pincode", e.target.value)} />
              </Field>
              <Field label={t("fieldCountry")}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-stone-700 dark:text-stone-300">
                    <MapPin className="w-3.5 h-3.5" /> Use Current Location
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
                <SearchableSelect
                  id="country"
                  options={countryOptions}
                  value={countryIso}
                  onChange={handleCountryChange}
                  placeholder={t("placeholderCountry")}
                  searchPlaceholder={t("searchCountry")}
                />
              </Field>
              <Field label={t("fieldState")}>
                {noStateOptions ? (
                  <p className="text-xs text-stone-400 italic py-3 bg-stone-50/50 rounded-xl border border-stone-200 px-3">
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
              </Field>
              <Field label={t("fieldCity")}>
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
              </Field>
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
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              {t("pickupRadiusHint")}
            </p>
            <Field label={t("fieldWhyNeeded")}>
              <Textarea rows={4} placeholder={t("placeholderWhyNeeded")} value={form.description} onChange={(e) => set("description", e.target.value)} />
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
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("submitting")}</> : t("submitForReview")}
              </Button>
              <Link href="/donee/dashboard"><Button type="button" variant="outline">{t("cancel")}</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
