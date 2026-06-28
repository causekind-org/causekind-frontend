"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { createItemListing, getProfile, uploadListingImage } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImagePlus, Loader2, X, MapPin, ShieldCheck, Info } from "lucide-react";
import Image from "next/image";
import { useLocations } from "@/hooks/useLocations";
import { resolveLocationFromGPS } from "@/app/actions/locations";
import { SearchableSelect, type SelectOption } from "@/components/profile/SearchableSelect";
import { useTranslations } from "next-intl";
import { getRandomDemoListing } from "@/data/demoListings";

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
  maximumDeliveryRadius: 10,
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
  const [imageUploading, setImageUploading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const guidelinesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!guidelinesOpen) return;
    function onOutside(e: MouseEvent) {
      if (guidelinesRef.current && !guidelinesRef.current.contains(e.target as Node))
        setGuidelinesOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [guidelinesOpen]);
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

  // Track which fields are currently holding demo-filled values
  const [demoFields, setDemoFields] = useState<Set<string>>(new Set());

  function clearDemoField(field: string, clearFn: () => void) {
    if (!demoFields.has(field)) return;
    clearFn();
    setDemoFields(prev => { const n = new Set(prev); n.delete(field); return n; });
  }

  function onCountryOpen() {
    if (!demoFields.has("country")) return;
    setCountryIso(""); setStateIso(""); setCityValue(""); setCityFreeText("");
    setDemoFields(prev => { const n = new Set(prev); n.delete("country"); n.delete("state"); n.delete("city"); return n; });
  }
  function onStateOpen() {
    if (!demoFields.has("state")) return;
    setStateIso(""); setCityValue(""); setCityFreeText("");
    setDemoFields(prev => { const n = new Set(prev); n.delete("state"); n.delete("city"); return n; });
  }
  function onCityOpen() {
    if (!demoFields.has("city")) return;
    setCityValue(""); setCityFreeText("");
    setDemoFields(prev => { const n = new Set(prev); n.delete("city"); return n; });
  }

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
          // No city in profile — auto-try GPS
          setCountryIso("IN");
          if (typeof navigator !== "undefined" && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                try {
                  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=en`);
                  if (!res.ok) return;
                  const data = await res.json();
                  const addr = data.address;
                  if (!addr) return;
                  const cc = addr.country_code?.toUpperCase();
                  if (!cc) return;
                  setCountryIso(cc);
                  const { stateIso: rs, cityValue: rc } = await resolveLocationFromGPS(cc, addr.state, addr.city || addr.town || addr.village || addr.suburb);
                  if (rs) { setStateIso(rs); rc ? setCityValue(rc) : setCityFreeText(addr.city || addr.town || ""); }
                  if (addr.postcode) setForm(f => ({ ...f, pincode: addr.postcode }));
                  toast.success("Location auto-detected via GPS");
                } catch { /* silent */ }
              },
              () => { /* user denied — stay on IN */ },
              { enableHighAccuracy: false, timeout: 8000 }
            );
          }
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

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImageUploading(true);
    // Show local preview immediately while uploading
    const reader = new FileReader();
    reader.onload = (ev) => set("imageUrl", ev.target?.result as string ?? "");
    reader.readAsDataURL(file);
    try {
      const s3Url = await uploadListingImage(file);
      set("imageUrl", s3Url); // replace data URL with real S3 URL
    } catch {
      toast.error("Image upload failed — please try again");
      set("imageUrl", "");
    } finally {
      setImageUploading(false);
    }
  }

  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.title.trim())                          newErrors.title       = "Required";
    if (!form.category)                              newErrors.category    = "Required";
    if (!form.quantity || Number(form.quantity) < 1) newErrors.quantity    = "Min 1";
    if (!form.condition)                             newErrors.condition   = "Required";
    if (!form.pincode.trim())                        newErrors.pincode     = "Required";
    if (form.description.trim().length < 50)         newErrors.description = `${50 - form.description.trim().length} more chars needed`;
    if (!form.imageUrl)                              newErrors.imageUrl    = "Required";
    const cityStr = buildCityString();
    if (!cityStr)                                    newErrors.city        = "Required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const first = Object.keys(newErrors)[0];
      document.getElementById(`field-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error("Please fill all required fields");
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await createItemListing({ ...form, city: cityStr!, quantity: Number(form.quantity), imageUrl: form.imageUrl || null });
      toast.success("Item submitted! It's under review — check the notification bell for updates.");
      window.dispatchEvent(new CustomEvent("ck-listing-submitted"));
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toastError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <>
      <style>{`
        @keyframes ck-page-slide-in {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @keyframes ck-content-reveal {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ck-pop-in {
          from { opacity: 0; transform: translateY(-10px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        body { overflow-x: hidden; }
      `}</style>

    <div
      className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row bg-[#faf8f5] dark:bg-zinc-950"
      style={{ animation: "ck-page-slide-in 0.72s cubic-bezier(0.16,1,0.3,1) both" }}
    >
      {/* ── LEFT PANEL: Photo + story ── */}
      <div className="hidden lg:flex lg:w-[40%] relative flex-col justify-end overflow-hidden shrink-0">
        {/* Background photo — swap src for a "giving hand" photo if you have one */}
        <Image
          src="/images/hero-1.webp"
          alt="Give what you don't need"
          fill
          className="object-cover object-center"
          priority
          sizes="40vw"
        />
        {/* Layered dark overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/20 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent pointer-events-none" />

        {/* Content sits at bottom */}
        <div className="relative z-10 p-10 pb-8 flex flex-col gap-5">
          {/* Badge */}
          <div className="flex items-center gap-2 self-start bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-3.5 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f0b97a] animate-pulse shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f0b97a]">
              Verified Giving
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-white text-4xl xl:text-[2.8rem] font-black leading-[1.08] tracking-tight">
            Give what you{" "}
            <span className="text-[#f0b97a]">don&apos;t need.</span>
          </h2>

          {/* Description */}
          <p className="text-white/60 text-sm leading-relaxed max-w-[300px]">
            Your unused textbooks, electronics, or clothes could be the exact thing someone nearby is looking for. Join the kindness loop.
          </p>

          {/* Feature bullets */}
          <div className="flex flex-col gap-3.5 mt-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-[#f0b97a]" />
              </div>
              <div>
                <p className="text-white text-[13px] font-bold leading-tight">Local Matching</p>
                <p className="text-white/40 text-[11px] mt-0.5">We match you within 10km radius.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-[#f0b97a]" />
              </div>
              <div>
                <p className="text-white text-[13px] font-bold leading-tight">Safe & Anonymous</p>
                <p className="text-white/40 text-[11px] mt-0.5">Contact details shared only after approval.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 px-10 pb-6">
          <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">CauseKind India · 2026</p>
        </div>
      </div>

      {/* ── RIGHT PANEL: Scrollable Form ── */}
      <div className="flex-1 px-6 py-10 lg:px-16 overflow-y-auto relative bg-white dark:bg-zinc-950">
        {/* Ambient glows */}
        <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-[#b04a15]/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 rounded-full bg-[#1e3a60]/5 blur-3xl pointer-events-none" />

        <div
          className="max-w-[540px] mx-auto space-y-6 relative z-10"
          style={{ animation: "ck-content-reveal 0.72s cubic-bezier(0.22,1,0.36,1) both", animationDelay: "0.62s" }}
        >
          {/* ── Page header ── */}
          <div className="mb-7">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b04a15]">Step 1 of 2</span>
              <button
                type="button"
                onClick={() => {
                  const demo = getRandomDemoListing();
                  setForm((f) => ({
                    ...f,
                    title: demo.title,
                    category: demo.category,
                    quantity: demo.quantity,
                    condition: demo.condition,
                    pincode: demo.pincode,
                    description: demo.description,
                    maximumDeliveryRadius: demo.maximumDeliveryRadius,
                    transportPayerPreference: demo.transportPayerPreference,
                  }));
                  setCountryIso(demo.countryIso);
                  setStateIso(demo.stateIso);
                  setCityValue(demo.cityValue);
                  setCityFreeText("");
                  setDemoFields(new Set(["title","category","quantity","condition","pincode","description","maximumDeliveryRadius","transportPayerPreference","country","state","city"]));
                  toast.success("Demo data filled! Edit before submitting.");
                }}
                className="text-[11px] font-bold text-[#b04a15] border border-[#b04a15]/40 bg-[#b04a15]/5 hover:bg-[#b04a15]/10 rounded-full px-3 py-1 transition-colors"
              >
                ✦ Try Demo
              </button>
            </div>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
                Listing Details
              </h1>
              <div ref={guidelinesRef} className="relative">
                <button
                  type="button"
                  onClick={() => setGuidelinesOpen(v => !v)}
                  className={`flex items-center gap-1.5 text-[11px] font-semibold transition-colors ${guidelinesOpen ? "text-[#b04a15]" : "text-stone-400 hover:text-[#b04a15] dark:hover:text-orange-400"}`}
                >
                  <Info className="w-3.5 h-3.5" /> Listing Guidelines
                </button>

                {/* ── Connected popover ── */}
                {guidelinesOpen && (
                  <div
                    className="absolute right-0 top-full mt-3 z-50 w-80"
                    style={{ animation: "ck-pop-in 0.28s cubic-bezier(0.16,1,0.3,1) both" }}
                  >
                    {/* Notch arrow */}
                    <div className="absolute -top-[6px] right-4 w-3 h-3 rotate-45 bg-white dark:bg-zinc-900 border-l border-t border-stone-200 dark:border-zinc-700 rounded-sm" />

                    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 shadow-xl overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-zinc-800 bg-[#fdf8f4] dark:bg-zinc-950">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-[#b04a15]/15 flex items-center justify-center">
                            <Info className="w-3 h-3 text-[#b04a15]" />
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-stone-700 dark:text-stone-200">Listing Guidelines</span>
                        </div>
                        <button onClick={() => setGuidelinesOpen(false)} className="text-stone-400 hover:text-stone-600 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Allowed */}
                      <div className="px-4 pt-3.5 pb-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400 mb-2">✓ You can list</p>
                        <ul className="space-y-1.5">
                          {["Clothes, shoes & accessories","Books, stationery & educational items","Electronics in working condition","Household items, furniture, bedding","Toys, sports & medical equipment (non-consumable)"].map(i => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-stone-600 dark:text-stone-300 leading-snug">
                              <span className="mt-1 w-1 h-1 rounded-full bg-emerald-400 shrink-0" />{i}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mx-4 h-px bg-stone-100 dark:bg-zinc-800 my-2" />

                      {/* Prohibited */}
                      <div className="px-4 pb-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-red-500 mb-2">✕ Not allowed</p>
                        <ul className="space-y-1.5">
                          {["Expired food, medicine or consumables","Broken, unsafe or non-functional items","Weapons or hazardous materials","Counterfeit / pirated goods"].map(i => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-stone-600 dark:text-stone-300 leading-snug">
                              <span className="mt-1 w-1 h-1 rounded-full bg-red-400 shrink-0" />{i}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mx-4 h-px bg-stone-100 dark:bg-zinc-800 my-2" />

                      {/* Tips */}
                      <div className="px-4 pb-3.5">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#b04a15] mb-2">★ Tips for faster matching</p>
                        <ul className="space-y-1.5">
                          {["Add a photo — listings with photos match 3× faster","Be specific in the title, not just 'book' or 'shirt'","Accurate pincode = faster local match"].map(i => (
                            <li key={i} className="flex items-start gap-2 text-[11px] text-stone-600 dark:text-stone-300 leading-snug">
                              <span className="mt-1 w-1 h-1 rounded-full bg-[#b04a15] shrink-0" />{i}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Footer note */}
                      <div className="px-4 py-3 bg-[#fdf3ec] dark:bg-[#2a1508] border-t border-[#b04a15]/15">
                        <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-relaxed">
                          All listings are reviewed by admins before going live.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Big title field */}
            <div className="space-y-1.5" id="field-title">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b04a15]">What are you donating?</label>
                {errors.title && <span className="text-[11px] text-red-500 font-bold">{errors.title}</span>}
              </div>
              <Input
                placeholder={t("placeholderItemName")}
                value={form.title}
                onChange={(e) => { set("title", e.target.value); setErrors(p => ({ ...p, title: "" })); }}
                onFocus={() => clearDemoField("title", () => set("title", ""))}
                required
                className={`h-14 text-lg font-medium placeholder:text-stone-300 dark:placeholder:text-stone-600 focus:border-[#b04a15]/50 focus:ring-[#b04a15]/20 ${errors.title ? "border-red-400" : "border-stone-200 dark:border-stone-800"}`}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("fieldCategory")}>
                <Select value={form.category} onValueChange={(v) => set("category", v)} onOpenChange={(o) => { if (o) clearDemoField("category", () => set("category", "")); }} required>
                  <SelectTrigger><SelectValue placeholder={t("placeholderCategory")} /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label={t("fieldQuantity")}>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} onFocus={() => clearDemoField("quantity", () => set("quantity", ""))} required />
              </Field>
              <Field label={t("fieldCondition")}>
                <Select value={form.condition} onValueChange={(v) => set("condition", v)} onOpenChange={(o) => { if (o) clearDemoField("condition", () => set("condition", "")); }} required>
                  <SelectTrigger><SelectValue placeholder={t("placeholderCondition")} /></SelectTrigger>
                  <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label={t("fieldPincode")}>
                <Input placeholder="411001" value={form.pincode} onChange={(e) => set("pincode", e.target.value)} onFocus={() => clearDemoField("pincode", () => set("pincode", ""))} required />
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
                      onOpen={onCountryOpen}
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
                        onOpen={onStateOpen}
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
                        onOpen={onCityOpen}
                        placeholder={t("placeholderCity")}
                        disabledPlaceholder={t("disabledPlaceholderCity")}
                        disabled={!stateIso && !noStateOptions}
                        searchPlaceholder={t("searchCity")}
                      />
                    )}
                  </div>
                </div>
              </div>
              {/* Delivery radius slider */}
              {(() => {
                const STOPS = [10, 20, 50, 100];
                const idx = STOPS.indexOf(Number(form.maximumDeliveryRadius));
                const activeIdx = idx === -1 ? 0 : idx;
                const pct = (activeIdx / (STOPS.length - 1)) * 100;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-stone-700 dark:text-stone-300">Maximum Delivery Radius</label>
                      <span className="text-sm font-black text-[#b04a15]">{STOPS[activeIdx]} km</span>
                    </div>
                    <div className="relative pt-1 pb-5">
                      <input
                        type="range"
                        min={0}
                        max={3}
                        step={1}
                        value={activeIdx}
                        onChange={e => {
                          clearDemoField("maximumDeliveryRadius", () => set("maximumDeliveryRadius", ""));
                          set("maximumDeliveryRadius", STOPS[Number(e.target.value)]);
                        }}
                        className="w-full h-1.5 appearance-none rounded-full cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #b04a15 ${pct}%, #e5e7eb ${pct}%)`,
                        }}
                      />
                      {/* Tick labels */}
                      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-0.5">
                        {STOPS.map((s, i) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => set("maximumDeliveryRadius", s)}
                            className={`text-[10px] font-bold transition-colors ${i === activeIdx ? "text-[#b04a15]" : "text-stone-400 hover:text-stone-600"}`}
                          >
                            {s}km
                          </button>
                        ))}
                      </div>
                    </div>
                    <style>{`
                      input[type=range]::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        width: 18px; height: 18px;
                        border-radius: 50%;
                        background: #b04a15;
                        border: 2.5px solid white;
                        box-shadow: 0 1px 6px rgba(176,74,21,0.4);
                        cursor: pointer;
                      }
                      input[type=range]::-moz-range-thumb {
                        width: 18px; height: 18px;
                        border-radius: 50%;
                        background: #b04a15;
                        border: 2.5px solid white;
                        box-shadow: 0 1px 6px rgba(176,74,21,0.4);
                        cursor: pointer;
                      }
                    `}</style>
                  </div>
                );
              })()}
              <Field label="Transport Payer Preference">
                <Select
                  value={form.transportPayerPreference}
                  onValueChange={(v) => set("transportPayerPreference", v)}
                  onOpenChange={(o) => { if (o) clearDemoField("transportPayerPreference", () => set("transportPayerPreference", "")); }}
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
            <div className="space-y-1.5" id="field-description">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-stone-700 dark:text-stone-300">{t("fieldDescription")} <span className="text-red-400">*</span></label>
                <span className={`text-[11px] font-bold tabular-nums ${form.description.length >= 50 ? "text-emerald-500" : "text-stone-400"}`}>
                  {form.description.length}/50 min
                </span>
              </div>
              <Textarea
                rows={4}
                placeholder={t("placeholderDescription")}
                value={form.description}
                onChange={(e) => { set("description", e.target.value); setErrors(p => ({ ...p, description: "" })); }}
                onFocus={() => clearDemoField("description", () => set("description", ""))}
                className={errors.description || (form.description.length > 0 && form.description.length < 50) ? "border-amber-300 focus:border-amber-400" : ""}
              />
              {form.description.length > 0 && form.description.length < 50 && (
                <p className="text-[11px] text-amber-500 font-medium">{50 - form.description.length} more characters needed</p>
              )}
            </div>
            <div className="space-y-1.5" id="field-imageUrl">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-stone-700 dark:text-stone-300">Photo <span className="text-red-400">*</span></label>
                {errors.imageUrl && !form.imageUrl && <span className="text-[11px] text-red-500 font-bold">Required — please upload a photo</span>}
                {imageUploading && <span className="text-[11px] text-[#b04a15] font-bold flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</span>}
                {!imageUploading && form.imageUrl && <span className="text-[11px] text-emerald-500 font-bold">✓ Photo uploaded</span>}
              </div>
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
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={submitting || imageUploading}
                className="flex-1 h-12 bg-[#b04a15] hover:bg-[#963c0d] text-white rounded-xl font-black uppercase tracking-widest text-sm shadow-lg shadow-[#b04a15]/30 transition-all active:scale-[0.98]"
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t("submitting")}</>
                  : <span className="flex items-center gap-2">Post Item <span className="text-base">→</span></span>
                }
              </Button>
              <Link href="/dashboard">
                <Button type="button" variant="outline" className="h-12 rounded-xl px-6 font-semibold text-stone-600 border-stone-200 hover:bg-stone-50">
                  {t("cancel")}
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>

    </>
  );
}
