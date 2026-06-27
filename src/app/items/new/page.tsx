"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";
import {
  createItemListingDraft,
  updateItemListingDraft,
  submitItemListing,
  type CreateListingPayload,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ImagePlus, X, MapPin, ChevronRight, ChevronLeft, CheckCircle2, Circle } from "lucide-react";
import Image from "next/image";
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

const NEEDS_WORKING_STATUS = ["Electronics", "Household", "Medical aid", "Sports"];
const NEEDS_DIMENSIONS     = ["Furniture", "Clothing", "Medical aid"];

const STEPS = [
  { id: 1, label: "Item Details" },
  { id: 2, label: "Photos" },
  { id: 3, label: "Location & Delivery" },
  { id: 4, label: "Declarations" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold text-stone-700 dark:text-stone-300">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-stone-400">{hint}</p>}
    </div>
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
  const [gpsLoading, setGpsLoading] = useState(false);

  // ── Form state ───────────────────────────────────────────────────────────

  // Step 1: Item details
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

  // Step 2: Photos
  const [photos, setPhotos]   = useState<string[]>([]);
  const photoInputRef         = useRef<HTMLInputElement>(null);

  // Step 3: Location & Delivery
  const [countryIso, setCountryIso]     = useState("IN");
  const [stateIso, setStateIso]         = useState("");
  const [cityValue, setCityValue]       = useState("");
  const [cityFreeText, setCityFreeText] = useState("");
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

  // Step 4: Declarations
  const [declarations, setDeclarations] = useState<boolean[]>(new Array(DECLARATIONS.length).fill(false));

  const { states: stateOptions, cities: cityOptions } = useLocations(countryIso, stateIso);
  const showCityFreeText = stateIso !== "" && cityOptions.length === 0;

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  // ── Create draft on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    createItemListingDraft()
      .then((d) => setDraftId(d.id))
      .catch(() => toast.error("Could not start draft. Please try again."));
  }, [user]);

  // ── Auto-save helper ──────────────────────────────────────────────────────
  const buildPayload = useCallback((): Partial<CreateListingPayload> => {
    const city = showCityFreeText
      ? [cityFreeText, stateIso, countryIso].filter(Boolean).join(", ")
      : [cityValue, stateIso, countryIso].filter(Boolean).join(", ");

    // Collect all photos: first photo → imageUrl, rest → imageUrls (pipe-separated)
    const allPhotos = photos;
    const imageUrl  = allPhotos[0] ?? null;
    const imageUrls = allPhotos.length > 1 ? allPhotos.slice(1).join("|") : undefined;

    return {
      title: title || undefined,
      category: category || undefined,
      subcategory: subcategory || undefined,
      quantity,
      condition: condition || undefined,
      brand: brand || undefined,
      model: model || undefined,
      approximateAge: approximateAge || undefined,
      workingStatus: workingStatus || undefined,
      knownDefects: noDefects ? "NONE" : (knownDefects || undefined),
      accessoriesIncluded: accessories || undefined,
      dimensions: dimensions || undefined,
      approximateWeight: weight || undefined,
      description: description || undefined,
      imageUrl,
      imageUrls,
      city: city || undefined,
      pincode: pincode || undefined,
      locality: locality || undefined,
      latitude,
      longitude,
      pickupAvailableYN: pickupYN,
      pickupDays: pickupDays.join(",") || undefined,
      pickupTimeSlots: pickupSlots.join(",") || undefined,
      donorDropOffAvailable: dropOffYN,
      maxTravelDistance: dropOffYN ? maxTravel : undefined,
      packagingAvailable: packaging || undefined,
      specialHandling: specialHandling.join("|") || undefined,
      preferredHandoverDate: handoverDate || undefined,
      maximumDeliveryRadius: deliveryRadius,
      policyVersion: "1.0",
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
    if (!draftId) return;
    setSaving(true);
    try { await updateItemListingDraft(draftId, buildPayload()); }
    catch { /* silent — draft save failures are non-critical */ }
    finally { setSaving(false); }
  }

  // ── Step validation ───────────────────────────────────────────────────────
  function validateStep(s: number): string | null {
    if (s === 1) {
      if (!category)     return "Category is required";
      if (!title.trim()) return "Item title is required";
      if (quantity < 1)  return "Quantity must be at least 1";
      if (!condition)    return "Condition is required";
      if (!approximateAge) return "Approximate age is required";
      if (!knownDefects.trim() && !noDefects) return "Please describe known defects or check 'No known defects'";
      if (!description || description.length < 30) return "Description must be at least 30 characters";
      if (NEEDS_WORKING_STATUS.includes(category) && !workingStatus) return "Working status is required for this category";
    }
    if (s === 2) {
      if (photos.length < 2) return "At least 2 photos are required";
    }
    if (s === 3) {
      const city = showCityFreeText ? cityFreeText : cityValue;
      if (!city) return "City is required";
      if (!pincode) return "PIN code is required";
    }
    if (s === 4) {
      if (!declarations.every(Boolean)) return "All declarations must be checked before submitting";
    }
    return null;
  }

  async function handleNext() {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    await saveDraft();
    setStep((s) => Math.min(s + 1, 4));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    const err = validateStep(4);
    if (err) { toast.error(err); return; }
    if (!draftId) { toast.error("Draft not ready. Please wait."); return; }
    setSubmitting(true);
    try {
      await updateItemListingDraft(draftId, { ...buildPayload(), declarationsAccepted: true });
      await submitItemListing(draftId);
      toast.success("Your item has been submitted for review!");
      router.push("/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`);
          const data = await res.json();
          const addr = data.address;
          if (addr) {
            const cc = addr.country_code?.toUpperCase();
            if (cc) {
              setCountryIso(cc);
              const { stateIso: sIso, cityValue: cVal } = await resolveLocationFromGPS(cc, addr.state, addr.city || addr.town || addr.village);
              if (sIso) { setStateIso(sIso); if (cVal) setCityValue(cVal); else setCityFreeText(addr.city || ""); }
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

  // ── Photo handling ────────────────────────────────────────────────────────
  function handlePhotoAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = 5 - photos.length;
    if (remaining <= 0) { toast.error("Maximum 5 photos allowed"); return; }
    files.slice(0, remaining).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (result) setPhotos((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Toggle helpers ────────────────────────────────────────────────────────
  function toggleDay(d: string) {
    setPickupDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  }
  function toggleSlot(s: string) {
    setPickupSlots((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }
  function toggleHandling(h: string) {
    setSpecialHandling((prev) => prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]);
  }
  function toggleDeclaration(i: number) {
    setDeclarations((prev) => prev.map((v, idx) => idx === i ? !v : v));
  }

  if (authLoading || !user) return null;

  // ── Progress indicator ───────────────────────────────────────────────────
  const ProgressBar = () => (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center flex-1 last:flex-none">
          <button
            type="button"
            onClick={() => step > s.id && setStep(s.id)}
            className="flex flex-col items-center gap-1 group"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
              ${step > s.id ? "bg-green-500 text-white" : step === s.id ? "bg-[#1e3a60] text-white ring-4 ring-[#1e3a60]/20" : "bg-stone-200 dark:bg-zinc-700 text-stone-400"}`}>
              {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
            </div>
            <span className={`text-[10px] font-semibold hidden sm:block ${step === s.id ? "text-[#1e3a60]" : "text-stone-400"}`}>
              {s.label}
            </span>
          </button>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 ${step > s.id ? "bg-green-400" : "bg-stone-200 dark:bg-zinc-700"}`} />
          )}
        </div>
      ))}
    </div>
  );

  // ── Step 1: Item Details ──────────────────────────────────────────────────
  const Step1 = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Category" required>
          <Select value={category} onValueChange={(v) => { setCategory(v); setSubcategory(""); }}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Subcategory" required>
          <Select value={subcategory} onValueChange={setSubcategory} disabled={!category}>
            <SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger>
            <SelectContent>{(SUBCATEGORIES[category] ?? []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Item Title" required hint="Describe the item clearly. Do not include phone numbers or addresses.">
        <Input placeholder="e.g. School Textbooks Grade 5–7, Set of 6" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Brand" hint="Recommended for electronics & appliances">
          <Input placeholder="e.g. Samsung, IKEA" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </Field>
        <Field label="Model">
          <Input placeholder="e.g. Galaxy A32" value={model} onChange={(e) => setModel(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Quantity" required>
          <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
        </Field>
        <Field label="Approximate Age" required>
          <Select value={approximateAge} onValueChange={setApproximateAge}>
            <SelectTrigger><SelectValue placeholder="Select age" /></SelectTrigger>
            <SelectContent>{AGE_RANGES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Condition" required>
          <Select value={condition} onValueChange={setCondition}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>

      {NEEDS_WORKING_STATUS.includes(category) && (
        <Field label="Working Status" required>
          <Select value={workingStatus} onValueChange={setWorkingStatus}>
            <SelectTrigger><SelectValue placeholder="Select working status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="WORKING">Working</SelectItem>
              <SelectItem value="PARTIALLY_WORKING">Partially Working</SelectItem>
              <SelectItem value="NOT_WORKING">Not Working</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="noDefects"
            checked={noDefects}
            onChange={(e) => { setNoDefects(e.target.checked); if (e.target.checked) setKnownDefects(""); }}
            className="rounded"
          />
          <label htmlFor="noDefects" className="text-sm font-semibold text-stone-700 dark:text-stone-300">No Known Defects</label>
        </div>
        {!noDefects && (
          <Field label="Known Defects" required hint="Be honest — this protects both you and the recipient.">
            <Textarea
              rows={2}
              placeholder="e.g. Minor scratch on right side, screen has hairline crack"
              value={knownDefects}
              onChange={(e) => setKnownDefects(e.target.value)}
            />
          </Field>
        )}
      </div>

      <Field label="Accessories Included" hint="List any cables, manuals, chargers, remotes, etc.">
        <Input placeholder="e.g. Original charger, remote control, manual" value={accessories} onChange={(e) => setAccessories(e.target.value)} />
      </Field>

      {NEEDS_DIMENSIONS.includes(category) && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Dimensions / Size" hint="e.g. 180×90×75 cm or XL">
            <Input placeholder="e.g. 120×60×75 cm" value={dimensions} onChange={(e) => setDimensions(e.target.value)} />
          </Field>
          <Field label="Approximate Weight">
            <Input placeholder="e.g. 25 kg" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </Field>
        </div>
      )}

      <Field label="Description" required hint={`${description.length}/2000 characters. Do not include contact details.`}>
        <Textarea
          rows={5}
          placeholder="Describe the item in detail — its condition, what it comes with, why you're donating it, and who it may be suitable for."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
        />
      </Field>
    </div>
  );

  // ── Step 2: Photos ────────────────────────────────────────────────────────
  const Step2 = () => (
    <div className="space-y-5">
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300 space-y-1">
        <p className="font-bold">Photo guidelines (minimum 2 required):</p>
        <ul className="list-disc ml-4 space-y-0.5 text-xs">
          <li>Front view of the item</li>
          <li>Full / side view</li>
          <li>Any visible defects or damage (if applicable)</li>
          <li>Do not include faces, personal documents, phone numbers or addresses in photos</li>
        </ul>
      </div>

      <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoAdd} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((p, i) => (
          <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border bg-stone-100 dark:bg-zinc-800">
            <Image src={p} alt={`Photo ${i + 1}`} fill className="object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
            <button
              type="button"
              onClick={() => removePhoto(i)}
              className="absolute top-2 right-2 rounded-full bg-red-500 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
            {i === 0 && <span className="absolute bottom-2 left-2 text-[10px] bg-[#1e3a60] text-white rounded px-1.5 py-0.5 font-bold">MAIN</span>}
          </div>
        ))}
        {photos.length < 5 && (
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-stone-300 dark:border-zinc-600 flex flex-col items-center justify-center gap-2 text-stone-400 hover:border-[#1e3a60] hover:text-[#1e3a60] transition-colors"
          >
            <ImagePlus className="w-6 h-6" />
            <span className="text-xs font-semibold">{photos.length === 0 ? "Add Photos" : "Add More"}</span>
            <span className="text-[10px]">{photos.length}/5</span>
          </button>
        )}
      </div>

      {photos.length < 2 && (
        <p className="text-sm text-amber-600 dark:text-amber-400 font-semibold">
          {photos.length === 0 ? "Please add at least 2 photos to continue." : "Please add 1 more photo (minimum 2 required)."}
        </p>
      )}
    </div>
  );

  // ── Step 3: Location & Delivery ───────────────────────────────────────────
  const Step3 = () => (
    <div className="space-y-5">
      {/* Location */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Item Location
          </Label>
          <button
            type="button"
            onClick={handleGPS}
            disabled={gpsLoading}
            className="text-xs font-bold text-[#b04a15] hover:underline disabled:opacity-50"
          >
            {gpsLoading ? "Detecting…" : "Use GPS 🎯"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="State / Province" required>
            <select
              value={stateIso}
              onChange={(e) => { setStateIso(e.target.value); setCityValue(""); setCityFreeText(""); }}
              className="w-full h-10 rounded-md border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm px-3"
            >
              <option value="">Select state</option>
              {stateOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="City" required>
            {showCityFreeText ? (
              <Input placeholder="Enter city" value={cityFreeText} onChange={(e) => setCityFreeText(e.target.value)} />
            ) : (
              <select
                value={cityValue}
                onChange={(e) => setCityValue(e.target.value)}
                disabled={!stateIso}
                className="w-full h-10 rounded-md border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm px-3 disabled:opacity-50"
              >
                <option value="">Select city</option>
                {cityOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            )}
          </Field>
          <Field label="Locality / Area" hint="Neighbourhood or area within city">
            <Input placeholder="e.g. Koregaon Park, Andheri West" value={locality} onChange={(e) => setLocality(e.target.value)} />
          </Field>
          <Field label="PIN Code" required>
            <Input placeholder="e.g. 411001" value={pincode} onChange={(e) => setPincode(e.target.value)} maxLength={10} />
          </Field>
        </div>
      </div>

      {/* Pickup availability */}
      <div className="space-y-3 border border-stone-200 dark:border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <input type="checkbox" id="pickupYN" checked={pickupYN} onChange={(e) => setPickupYN(e.target.checked)} className="rounded" />
          <label htmlFor="pickupYN" className="text-sm font-semibold text-stone-700 dark:text-stone-300">Pickup from my location is available</label>
        </div>
        {pickupYN && (
          <>
            <div>
              <p className="text-xs font-semibold text-stone-500 mb-2">Available Days</p>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => (
                  <button key={d} type="button" onClick={() => toggleDay(d)}
                    className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-all ${pickupDays.includes(d) ? "bg-[#1e3a60] text-white border-[#1e3a60]" : "border-stone-300 text-stone-500 hover:border-[#1e3a60]"}`}>
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-500 mb-2">Available Time Slots</p>
              <div className="flex flex-wrap gap-2">
                {TIME_SLOTS.map((s) => (
                  <button key={s} type="button" onClick={() => toggleSlot(s)}
                    className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-all ${pickupSlots.includes(s) ? "bg-[#1e3a60] text-white border-[#1e3a60]" : "border-stone-300 text-stone-500 hover:border-[#1e3a60]"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Drop-off */}
      <div className="space-y-3 border border-stone-200 dark:border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <input type="checkbox" id="dropOff" checked={dropOffYN} onChange={(e) => setDropOffYN(e.target.checked)} className="rounded" />
          <label htmlFor="dropOff" className="text-sm font-semibold text-stone-700 dark:text-stone-300">I can drop off the item</label>
        </div>
        {dropOffYN && (
          <Field label="Maximum travel distance (km)">
            <Input type="number" min={1} max={200} value={maxTravel} onChange={(e) => setMaxTravel(Number(e.target.value))} />
          </Field>
        )}
      </div>

      {/* Packaging */}
      <Field label="Packaging Available">
        <Select value={packaging} onValueChange={setPackaging}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="YES">Yes — I can pack it safely</SelectItem>
            <SelectItem value="NO">No — recipient needs to bring packaging</SelectItem>
            <SelectItem value="NOT_REQUIRED">Not required for this item</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {/* Special handling */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-stone-700 dark:text-stone-300">Special Handling Notes</Label>
        <div className="flex flex-wrap gap-2">
          {SPECIAL_HANDLING_OPTIONS.map((h) => (
            <button key={h} type="button" onClick={() => toggleHandling(h)}
              className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-all ${specialHandling.includes(h) ? "bg-amber-500 text-white border-amber-500" : "border-stone-300 text-stone-500 hover:border-amber-400"}`}>
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* Handover date */}
      <Field label="Earliest Preferred Handover Date">
        <Input type="date" value={handoverDate} onChange={(e) => setHandoverDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
      </Field>

      {/* Delivery radius */}
      <Field label="Maximum Delivery Radius (km)" hint="How far can this item travel to reach a recipient?">
        <Input type="number" min={1} value={deliveryRadius} onChange={(e) => setDeliveryRadius(Number(e.target.value))} />
      </Field>
    </div>
  );

  // ── Step 4: Declarations ──────────────────────────────────────────────────
  const Step4 = () => (
    <div className="space-y-5">
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">Mandatory Donor Declarations</p>
        <p className="text-xs text-amber-700 dark:text-amber-400">All declarations must be accepted before your listing can be submitted for review.</p>
      </div>

      <div className="space-y-3">
        {DECLARATIONS.map((d, i) => (
          <label
            key={i}
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${declarations[i] ? "border-green-400 bg-green-50 dark:bg-green-950/20 dark:border-green-700" : "border-stone-200 dark:border-zinc-700 hover:border-stone-300"}`}
          >
            <div className="mt-0.5 shrink-0">
              {declarations[i]
                ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                : <Circle className="w-5 h-5 text-stone-300" />}
            </div>
            <div>
              <input type="checkbox" className="sr-only" checked={declarations[i]} onChange={() => toggleDeclaration(i)} />
              <span className="text-sm text-stone-700 dark:text-stone-300">{d}</span>
            </div>
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setDeclarations(new Array(DECLARATIONS.length).fill(true))}
        className="text-xs font-bold text-[#1e3a60] hover:underline"
      >
        Accept all declarations
      </button>

      <div className="bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-xl p-4 text-xs text-stone-500 dark:text-stone-400 space-y-1">
        <p className="font-semibold text-stone-600 dark:text-stone-300">What happens after submission?</p>
        <p>1. Our team reviews your listing (usually within 24–48 hours)</p>
        <p>2. You will be notified when it is approved and eligible for matching</p>
        <p>3. When a recipient is found, we reconfirm availability with you first</p>
        <p>4. Both parties must consent before contact details are shared</p>
        <p>5. Handover is verified via OTP — then your donation certificate is issued</p>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row bg-[#faf8f5] dark:bg-zinc-950">
      {/* Left stripe */}
      <div className="hidden lg:flex lg:w-[30%] relative p-8 flex-col justify-between overflow-hidden bg-[#120c04] border-r border-stone-800 shrink-0">
        <div className="absolute -top-24 left-1/4 h-[300px] w-[300px] rounded-full bg-[#1e3a60]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 right-1/4 h-[300px] w-[300px] rounded-full bg-[#b04a15]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#f0b97a] bg-[#b04a15]/25 border border-[#b04a15]/40 rounded-full px-3 py-1 self-start inline-block">
            Verified Giving
          </span>
          <h2 className="text-white text-3xl font-extrabold leading-tight tracking-tight font-serif mt-4">
            List an Item
          </h2>
          <p className="text-stone-300 text-sm leading-relaxed">
            Offer items you no longer need. Verified recipients in your area will be matched carefully and privately.
          </p>

          <div className="space-y-3 pt-4">
            {[
              "Your identity is protected throughout",
              "Items are screened before matching",
              "Handover is verified — not self-declared",
              "You receive a Donation Certificate",
            ].map((point) => (
              <div key={point} className="flex items-start gap-2 text-stone-300 text-xs">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-[10px] font-bold text-white/30 uppercase tracking-widest">
          CauseKind India · 2026
        </div>
      </div>

      {/* Right panel: form */}
      <div className="flex-1 px-5 py-10 lg:px-12 overflow-y-auto">
        <div className="max-w-[620px] mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#b04a15]">Step {step} of {STEPS.length}</p>
              <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">{STEPS[step - 1].label}</h1>
            </div>
            {saving && <span className="text-xs text-stone-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>}
          </div>

          <ProgressBar />

          {/* Step content */}
          {step === 1 && <Step1 />}
          {step === 2 && <Step2 />}
          {step === 3 && <Step3 />}
          {step === 4 && <Step4 />}

          {/* Navigation */}
          <div className="flex gap-3 pt-2 pb-8">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={handleBack} className="rounded-xl px-5 font-semibold">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            {step < 4 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={saving}
                className="bg-[#1e3a60] hover:bg-[#162d4a] text-white rounded-xl px-6 font-bold ml-auto"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Next: {STEPS[step].label} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !declarations.every(Boolean)}
                className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-8 font-bold ml-auto disabled:opacity-50"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting…</> : "Submit Item for Review"}
              </Button>
            )}
          </div>

          <div className="flex justify-center pb-4">
            <Link href="/dashboard" className="text-xs text-stone-400 hover:text-stone-600">
              Save & Exit (continue later from Dashboard)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
