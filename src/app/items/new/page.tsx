"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";
import {
  createItemListingDraft,
  updateItemListingDraft,
  submitItemListing,
  uploadListingImage,
  type CreateListingPayload,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Loader2, ImagePlus, X, MapPin, ChevronRight, ChevronLeft, CheckCircle2, Circle, Shield, Award, Package, Lock, Info, Ban, ListChecks } from "lucide-react";
import { useLocations } from "@/hooks/useLocations";
import { resolveLocationFromGPS } from "@/app/actions/locations";

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ["Education", "Clothing", "Furniture", "Electronics", "Household", "Sports", "Medical aid"];

const SUBCATEGORIES: Record<string, string[]> = {
  Education:    ["Books", "Stationery", "School Bags", "Educational Toys", "Uniforms", "Other"],
  Clothing:     ["Men's", "Women's", "Children's", "Baby & Infant", "Footwear", "Accessories"],
  Furniture:    ["Chairs", "Tables", "Beds", "Sofas", "Wardrobes", "Storage", "Other"],
  Electronics:  ["Phones", "Laptops", "Tablets", "TVs", "Kitchen Appliances", "Accessories", "Other"],
  Household:    ["Cookware", "Utensils", "Bedding", "Curtains", "Cleaning Equipment", "Other"],
  Sports:       ["Fitness Equipment", "Outdoor Sports", "Indoor Sports", "Cycling", "Other"],
  "Medical aid":["Wheelchair", "Crutches / Walker", "Hospital Bed", "Medical Device", "Mobility Aid", "Other"],
};

const CONDITIONS = ["Unused", "Like New", "Good", "Fair", "Needs Minor Repair", "Not Working"];
const AGE_RANGES  = ["Less than 1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years", "Unknown"];
const DAYS        = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIME_SLOTS  = ["Morning (9am–12pm)", "Afternoon (12pm–3pm)", "Evening (3pm–6pm)", "Night (6pm–9pm)"];
const SPECIAL_HANDLING_OPTIONS = [
  "Stairs (no lift)", "Requires dismantling", "Fragile", "Two-person lift", "Vehicle required", "Heavy (>25 kg)",
];

const DECLARATIONS = [
  "I own this item or am authorized to donate it.",
  "The description and photographs are accurate.",
  "I have disclosed all known defects.",
  "The item does not contain prohibited or illegal material.",
  "I will not request money from the recipient.",
  "I understand that CauseKind may reject, pause or remove the listing.",
  "I will update CauseKind if the item becomes unavailable or its condition changes.",
  "I consent to screening, matching and processing for the donation journey.",
];

const NEEDS_WORKING_STATUS = ["Electronics", "Household", "Medical aid", "Sports", "Tools & Equipment"];
const NEEDS_DIMENSIONS     = ["Furniture", "Clothing", "Medical aid", "Tools & Equipment"];

const STEPS = [
  { id: 1, label: "Item Details",        sub: "What are you giving?" },
  { id: 2, label: "Photos",              sub: "Show what you have" },
  { id: 3, label: "Location & Delivery", sub: "Where & when?" },
  { id: 4, label: "Declarations",        sub: "Final confirmation" },
];

const TRUST_BADGES = [
  { icon: Shield,  title: "Identity Protected",     desc: "Your info stays private" },
  { icon: Package, title: "AI + Human Screening",   desc: "Every item verified" },
  { icon: Lock,    title: "OTP-Verified Handover",  desc: "Safe, confirmed delivery" },
  { icon: Award,   title: "Donation Certificate",   desc: "Official record issued" },
];

const LISTING_GUIDELINES = [
  { icon: CheckCircle2, title: "Accepted Categories", body: CATEGORIES.join(", ") },
  { icon: Ban,          title: "Not Accepted",        body: "Food, medicines, used undergarments, weapons, hazardous items, adult content, cash" },
  { icon: Shield,       title: "Your Privacy",        body: "Your name, phone and address are never shared before admin approval. Masked channels only." },
  { icon: ListChecks,   title: "After Submission",    body: "AI screening → human review → matching → donor reconfirmation → OTP handover → Certificate." },
];

// ── Particles type ────────────────────────────────────────────────────────────
interface Particle { id: number; x: number; y: number; angle: number; speed: number; color: string; }

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, required, hint, error, children }: { label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-bold text-stone-700 dark:text-stone-200">
        {label}{required && <span className="text-[#b04a15] ml-0.5">*</span>}
      </Label>
      {children}
      {error
        ? <p className="text-xs text-[#b04a15] font-semibold">{error}</p>
        : hint && <p className="text-xs text-stone-400">{hint}</p>}
    </div>
  );
}

// ── Chip button ───────────────────────────────────────────────────────────────
function Chip({ label, active, onClick, color = "terra" }: { label: string; active: boolean; onClick: () => void; color?: "terra" | "ink" | "gold" }) {
  const colors = {
    terra: active ? "bg-[#b04a15] text-white border-[#b04a15] shadow-[0_4px_14px_rgba(176,74,21,0.35)]" : "border-stone-300 text-stone-500 hover:border-[#b04a15] hover:text-[#b04a15]",
    ink:   active ? "bg-[#1e3a60] text-white border-[#1e3a60] shadow-[0_4px_14px_rgba(30,58,96,0.35)]" : "border-stone-300 text-stone-500 hover:border-[#1e3a60] hover:text-[#1e3a60]",
    gold:  active ? "bg-[#e07b3a] text-white border-[#e07b3a] shadow-[0_4px_14px_rgba(224,123,58,0.35)]" : "border-stone-300 text-stone-500 hover:border-[#e07b3a] hover:text-[#e07b3a]",
  };
  return (
    <button type="button" onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full border font-bold text-xs transition-all duration-200 select-none ${colors[color]} ${active ? "scale-[1.04]" : "hover:scale-[1.02]"}`}>
      {label}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function NewItemPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [step, setStep]         = useState(1);
  const [draftId, setDraftId]   = useState<number | null>(null);
  const [saving, setSaving]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animDir, setAnimDir]   = useState<"forward" | "back">("forward");
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mousePos, setMousePos] = useState({ x: -999, y: -999 });
  const containerRef            = useRef<HTMLDivElement>(null);

  // ── Form state ───────────────────────────────────────────────────────────

  // Step 1
  const [category, setCategory]             = useState("");
  const [subcategory, setSubcategory]       = useState("");
  const [title, setTitle]                   = useState("");
  const [brand, setBrand]                   = useState("");
  const [model, setModel]                   = useState("");
  const [quantity, setQuantity]             = useState(1);
  const [approximateAge, setApproximateAge] = useState("");
  const [condition, setCondition]           = useState("");
  const [workingStatus, setWorkingStatus]   = useState("");
  const [noDefects, setNoDefects]           = useState(false);
  const [knownDefects, setKnownDefects]     = useState("");
  const [accessories, setAccessories]       = useState("");
  const [dimensions, setDimensions]         = useState("");
  const [weight, setWeight]                 = useState("");
  const [description, setDescription]       = useState("");

  // Step 2
  const [photos, setPhotos]         = useState<string[]>([]);
  const [photoBlobs, setPhotoBlobs] = useState<string[]>([]);
  const photoInputRef               = useRef<HTMLInputElement>(null);

  // Step 3
  const [countryIso, setCountryIso]     = useState("IN");
  const [stateIso, setStateIso]         = useState("");
  const [cityValue, setCityValue]       = useState("");
  const [cityFreeText, setCityFreeText] = useState("");
  const [forceFreeTextCity, setForceFreeTextCity] = useState(false);
  const [pincode, setPincode]           = useState("");
  const [locality, setLocality]         = useState("");
  const [latitude, setLatitude]         = useState<number | undefined>();
  const [longitude, setLongitude]       = useState<number | undefined>();
  const [pickupYN, setPickupYN]         = useState(true);
  const [pickupDays, setPickupDays]     = useState<string[]>([]);
  const [pickupSlots, setPickupSlots]   = useState<string[]>([]);
  const [dropOffYN, setDropOffYN]       = useState(false);
  const [maxTravel, setMaxTravel]       = useState<number>(10);
  const [packaging, setPackaging]       = useState("");
  const [specialHandling, setSpecialHandling] = useState<string[]>([]);
  const [handoverDate, setHandoverDate] = useState("");
  const [deliveryRadius, setDeliveryRadius] = useState(25);

  // Step 4
  const [declarations, setDeclarations] = useState<boolean[]>(new Array(DECLARATIONS.length).fill(false));

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  function ie(key: string) {
    return fieldErrors[key] ? "border-[#b04a15] focus-visible:ring-[#b04a15]/30" : "";
  }

  const { states: stateOptions, cities: cityOptions } = useLocations(countryIso, stateIso);
  // forceFreeTextCity covers GPS finding a real city that just isn't in the dataset's
  // list for this state — the plain "zero cities listed" check alone misses that case.
  const showCityFreeText = (stateIso !== "" && cityOptions.length === 0) || forceFreeTextCity;

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  // ── Magnetic cursor ───────────────────────────────────────────────────────
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  // ── Particle burst ────────────────────────────────────────────────────────
  function spawnParticles() {
    const colors = ["#b04a15", "#e07b3a", "#f0b97a", "#1e3a60", "#ffffff"];
    const burst: Particle[] = Array.from({ length: 28 }, (_, i) => ({
      id: Date.now() + i,
      x: 0, y: 0,
      angle: (Math.PI * 2 * i) / 28,
      speed: 1.5 + Math.random() * 2.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles(burst);
    setTimeout(() => setParticles([]), 1100);
  }

  // ── Auto-save ─────────────────────────────────────────────────────────────
  const buildPayload = useCallback((): Partial<CreateListingPayload> => {
    const city = showCityFreeText
      ? [cityFreeText, stateIso, countryIso].filter(Boolean).join(", ")
      : [cityValue, stateIso, countryIso].filter(Boolean).join(", ");
    const imageUrl  = photos[0] ?? null;
    const imageUrls = photos.length > 1 ? photos.slice(1).join("|") : undefined;
    return {
      title: title || undefined, category: category || undefined, subcategory: subcategory || undefined,
      quantity, condition: condition || undefined, brand: brand || undefined, model: model || undefined,
      approximateAge: approximateAge || undefined, workingStatus: workingStatus || undefined,
      knownDefects: noDefects ? "NONE" : (knownDefects || undefined),
      accessoriesIncluded: accessories || undefined, dimensions: dimensions || undefined,
      approximateWeight: weight || undefined, description: description || undefined,
      imageUrl, imageUrls, city: city || undefined, pincode: pincode || undefined,
      locality: locality || undefined, latitude, longitude,
      pickupAvailableYN: pickupYN, pickupDays: pickupDays.join(",") || undefined,
      pickupTimeSlots: pickupSlots.join(",") || undefined, donorDropOffAvailable: dropOffYN,
      maxTravelDistance: dropOffYN ? maxTravel : undefined, packagingAvailable: packaging || undefined,
      specialHandling: specialHandling.join("|") || undefined, preferredHandoverDate: handoverDate || undefined,
      maximumDeliveryRadius: deliveryRadius, policyVersion: "1.0",
      declarationsAccepted: declarations.every(Boolean),
    };
  }, [
    title, category, subcategory, quantity, condition, brand, model,
    approximateAge, workingStatus, noDefects, knownDefects, accessories,
    dimensions, weight, description, photos, cityFreeText, cityValue,
    stateIso, countryIso, pincode, locality, latitude, longitude,
    pickupYN, pickupDays, pickupSlots, dropOffYN, maxTravel, packaging,
    specialHandling, handoverDate, deliveryRadius, declarations, showCityFreeText,
  ]);

  async function saveDraft() {
    setSaving(true);
    try {
      let id = draftId;
      if (!id) { const d = await createItemListingDraft(); setDraftId(d.id); id = d.id; }
      await updateItemListingDraft(id, buildPayload());
    } catch { /* silent */ }
    finally { setSaving(false); }
  }

  // ── Validation ────────────────────────────────────────────────────────────
  function validateStep(s: number): boolean {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!category) e.category = "Category is required";
      if (!title.trim()) e.title = "Item title is required";
      if (quantity < 1) e.quantity = "Quantity must be at least 1";
      if (!condition) e.condition = "Condition is required";
      if (!approximateAge) e.approximateAge = "Approximate age is required";
      if (!knownDefects.trim() && !noDefects) e.knownDefects = "Describe known defects or tick 'No Known Defects'";
      if (!description || description.length < 30) e.description = `Must be at least 30 characters (currently ${description.length})`;
      if (NEEDS_WORKING_STATUS.includes(category) && !workingStatus) e.workingStatus = "Working status is required";
    }
    if (s === 2) { if (photos.length < 2) e.photos = "At least 2 photos are required"; }
    if (s === 3) {
      const city = showCityFreeText ? cityFreeText : cityValue;
      if (!city) e.city = "City is required";
      if (!pincode) e.pincode = "PIN code is required";
    }
    if (s === 4) { if (!declarations.every(Boolean)) e.declarations = "All declarations must be accepted"; }
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleNext() {
    if (!validateStep(step)) { toast.error("Please fix the highlighted fields"); return; }
    await saveDraft();
    spawnParticles();
    setAnimDir("forward");
    setIsAnimating(true);
    setTimeout(() => { setStep((s) => Math.min(s + 1, 4)); setIsAnimating(false); window.scrollTo({ top: 0, behavior: "smooth" }); }, 380);
  }

  function handleBack() {
    setFieldErrors({});
    setAnimDir("back");
    setIsAnimating(true);
    setTimeout(() => { setStep((s) => Math.max(s - 1, 1)); setIsAnimating(false); window.scrollTo({ top: 0, behavior: "smooth" }); }, 280);
  }

  async function handleSubmit() {
    if (!validateStep(4)) { toast.error("Please fix the highlighted fields"); return; }
    setSubmitting(true);
    try {
      let id = draftId;
      if (!id) {
        const d = await createItemListingDraft();
        setDraftId(d.id);
        id = d.id;
      }
      await updateItemListingDraft(id, { ...buildPayload(), declarationsAccepted: true });
      await submitItemListing(id);
      spawnParticles();
      toast.success("Your item has been submitted for review!");
      router.push("/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed. Please try again.");
    } finally { setSubmitting(false); }
  }

  // ── GPS ───────────────────────────────────────────────────────────────────
  async function handleGPS() {
    if (!navigator.geolocation) { toast.error("GPS not supported"); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          setLatitude(lat); setLongitude(lng);
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`);
          const data = await res.json();
          const addr = data.address;
          if (addr) {
            const cc = addr.country_code?.toUpperCase();
            if (cc) {
              setCountryIso(cc);
              const { stateIso: sIso, cityValue: cVal } = await resolveLocationFromGPS(cc, addr.state, addr.city || addr.town || addr.village);
              if (sIso) {
                setStateIso(sIso);
                if (cVal) { setCityValue(cVal); setCityFreeText(""); setForceFreeTextCity(false); }
                else { setCityValue(""); setCityFreeText(addr.city || ""); setForceFreeTextCity(true); }
              }
              if (addr.suburb || addr.neighbourhood) setLocality(addr.suburb || addr.neighbourhood);
              if (addr.postcode) setPincode(addr.postcode.replace(/\s/g, ""));
            }
          }
          toast.success("Location detected");
        } catch { toast.error("Could not resolve location details"); }
        finally { setGpsLoading(false); }
      },
      () => { setGpsLoading(false); toast.error("Location access denied"); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // ── Photos ────────────────────────────────────────────────────────────────
  async function handlePhotoAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = 5 - photos.length;
    if (remaining <= 0) { toast.error("Maximum 5 photos allowed"); return; }
    e.target.value = "";
    const selected = files.slice(0, remaining);
    if (!selected.length) return;
    setImageUploading(true);
    let blobUrls: string[] = [];
    try {
      blobUrls = selected.map((f) => URL.createObjectURL(f));
      const urls = await Promise.all(selected.map((f) => uploadListingImage(f)));
      setPhotos((prev) => [...prev, ...urls].slice(0, 5));
      setPhotoBlobs((prev) => [...prev, ...blobUrls].slice(0, 5));
      toast.success(selected.length === 1 ? "Photo uploaded" : `${selected.length} photos uploaded`);
    } catch {
      blobUrls.forEach((u) => URL.revokeObjectURL(u));
      toast.error("Image upload failed. Please try again.");
    }
    finally { setImageUploading(false); }
  }

  function removePhoto(idx: number) {
    const blob = photoBlobs[idx];
    if (blob) URL.revokeObjectURL(blob);
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    setPhotoBlobs((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Toggles ───────────────────────────────────────────────────────────────
  const toggle = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, val: T) =>
    setter((prev) => prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]);

  if (authLoading || !user) return null;

  // ── Step 1 ────────────────────────────────────────────────────────────────
  const step1 = (
    <div className="space-y-6">
      {/* Listing guidelines — click-to-open popover, stays open until dismissed */}
      <div className="flex justify-end -mt-2 -mb-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#b04a15]/30 text-xs font-bold text-[#b04a15] hover:bg-[#b04a15]/5 transition-colors"
            >
              <Info className="w-3.5 h-3.5" /> Listing Guidelines
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[90vw] sm:w-[520px] p-5">
            <div className="grid sm:grid-cols-2 gap-4">
              {LISTING_GUIDELINES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[#b04a15]">
                    <Icon className="w-3.5 h-3.5" />
                    <p className="text-[11px] font-black uppercase tracking-wider">{title}</p>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Category + Subcategory */}
      <div className="grid grid-cols-2 gap-5">
        <Field label="Category" required error={fieldErrors.category}>
          <Select value={category} onValueChange={(v) => { setCategory(v); setSubcategory(""); }}>
            <SelectTrigger className={`h-11 ${ie("category")} focus:ring-[#b04a15]/25 focus:border-[#b04a15]`}><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Subcategory" required>
          <Select value={subcategory} onValueChange={setSubcategory} disabled={!category}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Select subcategory" /></SelectTrigger>
            <SelectContent>{(SUBCATEGORIES[category] ?? []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>

      {/* Category chips */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Quick Select</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} active={category === c} onClick={() => { setCategory(c); setSubcategory(""); }} color="terra" />
          ))}
        </div>
      </div>

      <Field label="Item Title" required hint={`${title.length}/120 — no phone numbers or addresses`} error={fieldErrors.title}>
        <Input placeholder="e.g. School Textbooks Grade 5–7, Set of 6" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
          className={`h-11 ${ie("title")} focus-visible:border-[#b04a15] focus-visible:ring-[#b04a15]/20`} />
      </Field>

      <div className="grid grid-cols-2 gap-5">
        <Field label="Brand" hint="Recommended for electronics">
          <Input placeholder="e.g. Samsung, IKEA" value={brand} onChange={(e) => setBrand(e.target.value)} className="h-11 focus-visible:border-[#b04a15] focus-visible:ring-[#b04a15]/20" />
        </Field>
        <Field label="Model">
          <Input placeholder="e.g. Galaxy A32" value={model} onChange={(e) => setModel(e.target.value)} className="h-11 focus-visible:border-[#b04a15] focus-visible:ring-[#b04a15]/20" />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <Field label="Quantity" required error={fieldErrors.quantity}>
          <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className={`h-11 ${ie("quantity")}`} />
        </Field>
        <Field label="Approximate Age" required error={fieldErrors.approximateAge}>
          <Select value={approximateAge} onValueChange={setApproximateAge}>
            <SelectTrigger className={`h-11 ${ie("approximateAge")}`}><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{AGE_RANGES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Condition" required error={fieldErrors.condition}>
          <Select value={condition} onValueChange={setCondition}>
            <SelectTrigger className={`h-11 ${ie("condition")}`}><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>

      {/* Condition chips */}
      <div className="flex flex-wrap gap-2">
        {CONDITIONS.map((c) => (
          <Chip key={c} label={c} active={condition === c} onClick={() => setCondition(c)} color="ink" />
        ))}
      </div>

      {NEEDS_WORKING_STATUS.includes(category) && (
        <Field label="Working Status" required error={fieldErrors.workingStatus}>
          <div className="flex gap-3">
            {["WORKING", "PARTIALLY_WORKING", "NOT_WORKING"].map((ws) => (
              <Chip key={ws} label={ws.replace("_", " ")} active={workingStatus === ws} onClick={() => setWorkingStatus(ws)}
                color={ws === "WORKING" ? "ink" : ws === "PARTIALLY_WORKING" ? "gold" : "terra"} />
            ))}
          </div>
        </Field>
      )}

      <div className="space-y-2">
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <div
            onClick={() => { setNoDefects(!noDefects); if (!noDefects) setKnownDefects(""); }}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer
              ${noDefects ? "bg-[#b04a15] border-[#b04a15]" : "border-stone-300 group-hover:border-[#b04a15]"}`}>
            {noDefects && <CheckCircle2 className="w-3 h-3 text-white" />}
          </div>
          <span className="text-sm font-bold text-stone-700 dark:text-stone-200">No Known Defects</span>
        </label>
        {!noDefects && (
          <Field label="Known Defects" required hint="Be honest — this protects both you and the recipient." error={fieldErrors.knownDefects}>
            <Textarea rows={2} placeholder="e.g. Minor scratch on right side, screen has hairline crack"
              value={knownDefects} onChange={(e) => setKnownDefects(e.target.value)}
              className={`${ie("knownDefects")} focus-visible:border-[#b04a15] focus-visible:ring-[#b04a15]/20`} />
          </Field>
        )}
      </div>

      <Field label="Accessories Included" hint="List cables, manuals, chargers, remotes, etc.">
        <Input placeholder="e.g. Original charger, remote control, manual" value={accessories} onChange={(e) => setAccessories(e.target.value)} className="h-11 focus-visible:border-[#b04a15] focus-visible:ring-[#b04a15]/20" />
      </Field>

      {NEEDS_DIMENSIONS.includes(category) && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Dimensions / Size" hint="e.g. 180×90×75 cm or XL">
            <Input placeholder="e.g. 120×60×75 cm" value={dimensions} onChange={(e) => setDimensions(e.target.value)} className="h-11" />
          </Field>
          <Field label="Approximate Weight">
            <Input placeholder="e.g. 25 kg" value={weight} onChange={(e) => setWeight(e.target.value)} className="h-11" />
          </Field>
        </div>
      )}

      <Field label="Description" required hint={`${description.length}/2000 — no contact details`} error={fieldErrors.description}>
        <Textarea rows={5} placeholder="Describe the item in detail — condition, what it comes with, why you're donating it, who it may suit."
          value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000}
          className={`${ie("description")} focus-visible:border-[#b04a15] focus-visible:ring-[#b04a15]/20`} />
      </Field>
    </div>
  );

  // ── Step 2 ────────────────────────────────────────────────────────────────
  const step2 = (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[#1e3a60]/8 border border-[#1e3a60]/20 p-4">
        <p className="text-xs font-black text-[#1e3a60] uppercase tracking-widest mb-2">Photo Guidelines — Minimum 2 Required</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-stone-500">
          {["Front view of the item", "Full or side view", "Visible defects or damage", "No faces, documents, phone numbers"].map((g) => (
            <div key={g} className="flex items-start gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#e07b3a] mt-1 shrink-0" />
              <span>{g}</span>
            </div>
          ))}
        </div>
      </div>

      <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoAdd} />

      <div className="grid grid-cols-3 gap-3">
        {photos.map((p, i) => (
          <div key={i} className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-stone-200 bg-stone-100 dark:bg-zinc-800 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoBlobs[i] ?? p} alt={`Photo ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />
            <button type="button" onClick={() => removePhoto(i)}
              className="absolute top-2 right-2 rounded-full bg-[#b04a15] p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
              <X className="w-3 h-3" />
            </button>
            {i === 0 && (
              <span className="absolute bottom-2 left-2 text-[9px] bg-[#1e3a60] text-white rounded-full px-2 py-0.5 font-black tracking-wider">MAIN</span>
            )}
          </div>
        ))}
        {photos.length < 5 && (
          <button type="button" onClick={() => photoInputRef.current?.click()} disabled={imageUploading}
            className="aspect-square rounded-2xl border-2 border-dashed border-stone-300 dark:border-zinc-600 flex flex-col items-center justify-center gap-2 text-stone-400
              hover:border-[#b04a15] hover:text-[#b04a15] transition-all hover:bg-[#b04a15]/4 group">
            {imageUploading ? <Loader2 className="w-7 h-7 animate-spin" /> : <ImagePlus className="w-7 h-7 group-hover:scale-110 transition-transform" />}
            <span className="text-xs font-bold">{imageUploading ? "Uploading…" : photos.length === 0 ? "Add Photos" : "Add More"}</span>
            <span className="text-[10px] font-semibold text-stone-300">{photos.length}/5</span>
          </button>
        )}
      </div>

      {fieldErrors.photos && <p className="text-sm text-[#b04a15] font-bold">{fieldErrors.photos}</p>}
      {!fieldErrors.photos && photos.length < 2 && (
        <div className="flex items-center gap-2 text-sm text-amber-600 font-semibold">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          {photos.length === 0 ? "Please add at least 2 photos to continue." : "Add 1 more photo (minimum 2 required)."}
        </div>
      )}
    </div>
  );

  // ── Step 3 ────────────────────────────────────────────────────────────────
  const step3 = (
    <div className="space-y-6">
      {/* Location */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#b04a15]" /> Item Location
          </p>
          <button type="button" onClick={handleGPS} disabled={gpsLoading}
            className="text-xs font-bold text-[#b04a15] hover:underline disabled:opacity-50 flex items-center gap-1">
            {gpsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "📍"} {gpsLoading ? "Detecting…" : "Use GPS"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="State / Province" required>
            <select value={stateIso} onChange={(e) => { setStateIso(e.target.value); setCityValue(""); setCityFreeText(""); setForceFreeTextCity(false); }}
              className="w-full h-11 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-[#b04a15]/20 focus:border-[#b04a15] transition-all">
              <option value="">Select state</option>
              {stateOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="City" required error={fieldErrors.city}>
            {showCityFreeText ? (
              <Input placeholder="Enter city" value={cityFreeText} onChange={(e) => setCityFreeText(e.target.value)} className={`h-11 ${ie("city")}`} />
            ) : (
              <select value={cityValue} onChange={(e) => setCityValue(e.target.value)} disabled={!stateIso}
                className={`w-full h-11 rounded-lg border text-sm px-3 disabled:opacity-50 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#b04a15]/20 focus:border-[#b04a15] transition-all
                  ${fieldErrors.city ? "border-[#b04a15]" : "border-stone-200 dark:border-zinc-700"}`}>
                <option value="">Select city</option>
                {cityOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            )}
          </Field>
          <Field label="Locality / Area" hint="Neighbourhood or area">
            <Input placeholder="e.g. Koregaon Park, Andheri West" value={locality} onChange={(e) => setLocality(e.target.value)} className="h-11 focus-visible:border-[#b04a15] focus-visible:ring-[#b04a15]/20" />
          </Field>
          <Field label="PIN Code" required error={fieldErrors.pincode}>
            <Input placeholder="e.g. 411001" value={pincode} onChange={(e) => setPincode(e.target.value)} maxLength={10} className={`h-11 ${ie("pincode")}`} />
          </Field>
        </div>
      </div>

      {/* Pickup */}
      <div className="rounded-2xl border border-stone-200 dark:border-zinc-700 p-5 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => setPickupYN(!pickupYN)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer
              ${pickupYN ? "bg-[#1e3a60] border-[#1e3a60]" : "border-stone-300 hover:border-[#1e3a60]"}`}>
            {pickupYN && <CheckCircle2 className="w-3 h-3 text-white" />}
          </div>
          <span className="text-sm font-bold text-stone-700 dark:text-stone-200">Pickup from my location is available</span>
        </label>
        {pickupYN && (
          <div className="space-y-4 pt-1">
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2.5">Available Days</p>
              <div className="flex flex-wrap gap-2">
                <Chip label="Any Day" active={pickupDays.includes("ANY")} onClick={() => { if (pickupDays.includes("ANY")) { setPickupDays([]); } else { setPickupDays(["ANY"]); } }} color="ink" />
                {DAYS.map((d) => <Chip key={d} label={d.slice(0, 3)} active={pickupDays.includes(d) && !pickupDays.includes("ANY")} onClick={() => { if (pickupDays.includes("ANY")) { setPickupDays([d]); } else { toggle(setPickupDays, d); } }} color="ink" />)}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2.5">Time Slots</p>
              <div className="flex flex-wrap gap-2">
                <Chip label="Anytime" active={pickupSlots.includes("ANYTIME")} onClick={() => { if (pickupSlots.includes("ANYTIME")) { setPickupSlots([]); } else { setPickupSlots(["ANYTIME"]); } }} color="ink" />
                {TIME_SLOTS.map((s) => <Chip key={s} label={s} active={pickupSlots.includes(s) && !pickupSlots.includes("ANYTIME")} onClick={() => { if (pickupSlots.includes("ANYTIME")) { setPickupSlots([s]); } else { toggle(setPickupSlots, s); } }} color="ink" />)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Drop-off */}
      <div className="rounded-2xl border border-stone-200 dark:border-zinc-700 p-5 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => setDropOffYN(!dropOffYN)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer
              ${dropOffYN ? "bg-[#e07b3a] border-[#e07b3a]" : "border-stone-300 hover:border-[#e07b3a]"}`}>
            {dropOffYN && <CheckCircle2 className="w-3 h-3 text-white" />}
          </div>
          <span className="text-sm font-bold text-stone-700 dark:text-stone-200">I can drop off the item</span>
        </label>
        {dropOffYN && (
          <Field label="Maximum travel distance (km)">
            <Input type="number" min={1} max={200} value={maxTravel} onChange={(e) => setMaxTravel(Number(e.target.value))} className="h-11 w-40" />
          </Field>
        )}
      </div>

      {/* Packaging */}
      <Field label="Packaging Available">
        <Select value={packaging} onValueChange={setPackaging}>
          <SelectTrigger className="h-11"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="YES">Yes — I can pack it safely</SelectItem>
            <SelectItem value="NO">No — recipient needs to bring packaging</SelectItem>
            <SelectItem value="NOT_REQUIRED">Not required for this item</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {/* Special handling */}
      <div className="space-y-2">
        <Label className="text-sm font-bold text-stone-700 dark:text-stone-200">Special Handling Notes</Label>
        <div className="flex flex-wrap gap-2">
          {SPECIAL_HANDLING_OPTIONS.map((h) => <Chip key={h} label={h} active={specialHandling.includes(h)} onClick={() => toggle(setSpecialHandling, h)} color="gold" />)}
        </div>
      </div>

      {/* Handover */}
      <div className="rounded-2xl border border-stone-200 dark:border-zinc-700 p-5 space-y-4">
        <p className="text-xs font-black text-stone-500 uppercase tracking-widest">Preferred Handover</p>
        <Field label="Earliest Available Date">
          <Input type="date" value={handoverDate} onChange={(e) => setHandoverDate(e.target.value)} min={new Date().toISOString().split("T")[0]} className="h-11 w-48" />
        </Field>
      </div>

      <Field label="Maximum Delivery Radius (km)" hint="How far can this item travel to reach a recipient?">
        <Input type="number" min={1} value={deliveryRadius} onChange={(e) => setDeliveryRadius(Number(e.target.value))} className="h-11 w-40" />
      </Field>
    </div>
  );

  // ── Step 4 ────────────────────────────────────────────────────────────────
  const step4 = (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[#f0b97a]/15 border border-[#f0b97a]/40 p-4">
        <p className="text-sm font-black text-[#b04a15] mb-1">Mandatory Donor Declarations</p>
        <p className="text-xs text-stone-600 dark:text-stone-400">All 8 declarations must be accepted before your listing can be submitted.</p>
      </div>

      <div className="space-y-2.5">
        {DECLARATIONS.map((d, i) => (
          <label key={i} onClick={() => setDeclarations((prev) => prev.map((v, idx) => idx === i ? !v : v))}
            className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-200
              ${declarations[i]
                ? "border-green-400 bg-green-50 dark:bg-green-950/20 dark:border-green-700 shadow-[0_0_0_1px_rgba(74,222,128,0.2)]"
                : "border-stone-200 dark:border-zinc-700 hover:border-stone-300 hover:bg-white/50"}`}>
            <div className="mt-0.5 shrink-0 transition-transform duration-200" style={{ transform: declarations[i] ? "scale(1.1)" : "scale(1)" }}>
              {declarations[i]
                ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                : <Circle className="w-5 h-5 text-stone-300" />}
            </div>
            <span className="text-sm text-stone-700 dark:text-stone-300 select-none">{d}</span>
          </label>
        ))}
      </div>

      <button type="button" onClick={() => setDeclarations(new Array(DECLARATIONS.length).fill(true))}
        className="text-xs font-black text-[#1e3a60] hover:text-[#b04a15] underline underline-offset-2 transition-colors">
        Accept all declarations at once →
      </button>

      {fieldErrors.declarations && <p className="text-sm text-[#b04a15] font-bold">{fieldErrors.declarations}</p>}

      <div className="rounded-2xl bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 p-4 space-y-2">
        <p className="text-xs font-black text-stone-600 dark:text-stone-300 uppercase tracking-widest">What happens next</p>
        {[
          "Our team reviews your listing (usually 24–48 hours)",
          "You're notified when approved and eligible for matching",
          "When a recipient is found, we reconfirm availability with you first",
          "Both parties consent before any contact details are shared",
          "Handover is verified via OTP — then your certificate is issued",
        ].map((s, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-stone-500">
            <span className="font-black text-[#b04a15] shrink-0">{i + 1}.</span>
            <span>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="min-h-screen flex flex-col lg:flex-row bg-[#faf8f5] dark:bg-zinc-950 relative overflow-hidden">

      {/* ── Magnetic cursor glow ── */}
      <div className="pointer-events-none fixed z-0"
        style={{ left: mousePos.x, top: mousePos.y, width: 380, height: 380,
          transform: "translate(-50%,-50%)",
          background: "radial-gradient(circle, rgba(176,74,21,0.09) 0%, transparent 70%)",
          transition: "left 0.12s ease, top 0.12s ease" }} />

      {/* ── Particle burst ── */}
      {particles.map((p, i) => (
        <div key={p.id} className="ck-particle pointer-events-none fixed z-50 w-2.5 h-2.5 rounded-full"
          style={{
            left: "50%", top: "40%",
            backgroundColor: p.color,
            "--px": `${Math.cos(p.angle) * 120 * p.speed}px`,
            "--py": `${Math.sin(p.angle) * 90 * p.speed}px`,
            animationDelay: `${i * 14}ms`,
          } as React.CSSProperties} />
      ))}

      {/* ════════════════════════════════
          LEFT SIDEBAR
      ════════════════════════════════ */}
      <aside className="hidden lg:flex lg:w-[280px] xl:w-[300px] shrink-0 flex-col relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0e0904 0%, #1a0f07 50%, #0c1621 100%)" }}>

        {/* Floating orbs */}
        <div className="ck-orb-a absolute top-16 left-8 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(176,74,21,0.22) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div className="ck-orb-b absolute bottom-24 right-4 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(30,58,96,0.30) 0%, transparent 70%)", filter: "blur(36px)" }} />
        <div className="ck-orb-a absolute top-1/2 left-1/3 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(240,185,122,0.10) 0%, transparent 70%)", filter: "blur(28px)", animationDelay: "3s" }} />

        <div className="relative z-10 flex flex-col h-full p-8 xl:p-10">
          {/* Badge */}
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#f0b97a] bg-[#b04a15]/25 border border-[#b04a15]/40 rounded-full px-3.5 py-1.5">
              <Shield className="w-3 h-3" /> Verified Giving
            </span>
          </div>

          {/* Title */}
          <div className="mb-10">
            <h1 className="text-white text-4xl xl:text-5xl font-black leading-none tracking-tight mb-3"
              style={{ fontFamily: "serif" }}>
              List an<br />
              <span style={{ background: "linear-gradient(90deg, #e07b3a, #f0b97a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Item</span>
            </h1>
            <p className="text-stone-400 text-sm leading-relaxed">
              Offer items you no longer need. Verified recipients will be matched carefully and privately.
            </p>
          </div>

          {/* Step rail */}
          <div className="space-y-1 mb-10">
            {STEPS.map((s, i) => {
              const done   = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id}>
                  <button type="button" onClick={() => done && setStep(s.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group text-left
                      ${active ? "bg-white/8 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]" : "hover:bg-white/4"}`}>
                    {/* Step circle */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 transition-all duration-300
                      ${done   ? "bg-green-500/20 text-green-400 shadow-[0_0_14px_rgba(74,222,128,0.25)]"
                              : active ? "text-white shadow-[0_0_20px_rgba(176,74,21,0.6)]" : "bg-white/6 text-white/30"}`}
                      style={active ? { background: "linear-gradient(135deg, #b04a15, #e07b3a)" } : {}}>
                      {done ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                    </div>
                    <div className={`transition-all duration-300 ${active ? "opacity-100" : done ? "opacity-60" : "opacity-30"}`}>
                      <p className="text-white text-sm font-bold leading-tight">{s.label}</p>
                      <p className="text-white/40 text-[11px]">{s.sub}</p>
                    </div>
                    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#e07b3a]" style={{ boxShadow: "0 0 6px #e07b3a" }} />}
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className="ml-7.5 pl-3.5 h-4 flex items-center">
                      <div className={`w-px h-full transition-all duration-500 ${done ? "bg-green-500/40" : "bg-white/8"}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Trust badges */}
          <div className="space-y-2.5 mt-auto">
            {TRUST_BADGES.map((b, i) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="ck-badge-enter flex items-center gap-3 px-3.5 py-3 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    backdropFilter: "blur(12px)",
                    animationDelay: `${i * 80}ms`,
                  }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "rgba(176,74,21,0.18)", border: "1px solid rgba(176,74,21,0.25)" }}>
                    <Icon className="w-4 h-4 text-[#e07b3a]" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-bold leading-tight">{b.title}</p>
                    <p className="text-white/35 text-[10px]">{b.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-[9px] font-black uppercase tracking-[0.2em] text-white/15">CauseKind India · 2026</p>
        </div>
      </aside>

      {/* ════════════════════════════════
          RIGHT PANEL
      ════════════════════════════════ */}
      <div className="flex-1 min-w-0 relative overflow-y-auto">

        {/* Giant watermark step number */}
        <div className="ck-numfloat pointer-events-none select-none absolute right-0 top-0 text-[22vw] lg:text-[18vw] font-black leading-none z-0"
          style={{ color: "rgba(176,74,21,0.045)", lineHeight: 1, right: "-2vw", top: "-1vw" }}>
          {step}
        </div>

        <div className="relative z-10 max-w-[860px] mx-auto px-6 sm:px-10 lg:px-16 py-10 lg:py-14">

          {/* ── Mobile step indicator ── */}
          <div className="lg:hidden mb-6">
            <div className="flex items-center gap-0">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 transition-all
                    ${step > s.id ? "bg-green-500 text-white" : step === s.id ? "text-white shadow-[0_0_12px_rgba(176,74,21,0.5)]" : "bg-stone-200 text-stone-400"}`}
                    style={step === s.id ? { background: "linear-gradient(135deg,#b04a15,#e07b3a)" } : {}}>
                    {step > s.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.id}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 transition-all duration-500 ${step > s.id ? "bg-green-400" : "bg-stone-200 dark:bg-zinc-700"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Header ── */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#b04a15] mb-1">
                Step {step} of {STEPS.length}
              </p>
              <h2 className="text-3xl xl:text-4xl font-black tracking-tight text-stone-900 dark:text-stone-50 leading-none">
                {STEPS[step - 1].label}
              </h2>
              <p className="text-stone-400 text-sm mt-1">{STEPS[step - 1].sub}</p>
            </div>
            {saving && (
              <span className="text-xs text-stone-400 flex items-center gap-1.5 mt-1">
                <Loader2 className="w-3 h-3 animate-spin text-[#b04a15]" /> Saving…
              </span>
            )}
          </div>

          {/* ── Progress rail ── */}
          <div className="relative mb-8 h-1.5 rounded-full bg-stone-200 dark:bg-zinc-800 overflow-hidden">
            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${((step - 1) / (STEPS.length - 1)) * 100}%`,
                background: "linear-gradient(90deg, #b04a15, #e07b3a, #f0b97a)",
                boxShadow: "0 0 12px rgba(224,123,58,0.5)",
              }} />
          </div>

          {/* ── Step content panel ── */}
          <div
            className={`rounded-3xl p-8 sm:p-10 mb-6 ${isAnimating ? "ck-step-exit" : animDir === "forward" ? "ck-step-enter-fwd" : "ck-step-enter-back"}`}
            style={{
              background: "rgba(255,255,255,0.75)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.5)",
              boxShadow: "0 20px 60px -12px rgba(176,74,21,0.10), 0 4px 20px -4px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)",
            }}>
            {step === 1 && step1}
            {step === 2 && step2}
            {step === 3 && step3}
            {step === 4 && step4}
          </div>

          {/* ── Navigation ── */}
          <div className="flex items-center gap-3 pb-6">
            {step > 1 && (
              <button type="button" onClick={handleBack}
                className="flex items-center gap-1.5 px-5 py-3 rounded-2xl border-2 border-stone-200 dark:border-zinc-700 font-bold text-sm text-stone-600 dark:text-stone-300
                  hover:border-stone-400 hover:bg-white/80 transition-all active:scale-[0.97]">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}

            <div className="flex-1" />

            {step < 4 ? (
              <button type="button" onClick={handleNext} disabled={saving}
                className="flex items-center gap-2 px-7 py-3 rounded-2xl font-black text-sm text-white transition-all active:scale-[0.97] disabled:opacity-60 shadow-[0_6px_24px_rgba(176,74,21,0.35)] hover:shadow-[0_8px_32px_rgba(176,74,21,0.50)] hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, #b04a15 0%, #e07b3a 100%)" }}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Next: {STEPS[step].label} <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={submitting || !declarations.every(Boolean)}
                className="flex items-center gap-2 px-7 py-3 rounded-2xl font-black text-sm text-white transition-all active:scale-[0.97] disabled:opacity-50 shadow-[0_6px_24px_rgba(22,163,74,0.35)] hover:shadow-[0_8px_32px_rgba(22,163,74,0.50)] hover:-translate-y-0.5"
                style={{ background: submitting || !declarations.every(Boolean) ? undefined : "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)" }}>
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <>Submit for Review <ChevronRight className="w-4 h-4" /></>}
              </button>
            )}
          </div>

          <div className="text-center pb-8">
            <Link href="/dashboard" className="text-xs text-stone-400 hover:text-[#b04a15] transition-colors font-semibold underline underline-offset-2">
              Save & exit — continue later from Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
