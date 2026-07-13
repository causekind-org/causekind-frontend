"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";
import {
  getProfile,
  createItemRequestDraft,
  updateItemRequestDraft,
  submitItemRequestDraft,
  saveRequestVerificationDetails,
  uploadVerificationDocument,
  updateAadhaar,
  type UpdateRequestPayload,
  type RequestVerification,
  type VerificationDocumentType,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, ChevronRight, ChevronLeft, CheckCircle2, Circle, MapPin,
  Shield, Award, Lock, UploadCloud, X, FileCheck2, AlertTriangle,
} from "lucide-react";
import { useLocations } from "@/hooks/useLocations";
import { resolveLocationFromGPS } from "@/app/actions/locations";
import { SearchableSelect } from "@/components/profile/SearchableSelect";

// ── Constants ────────────────────────────────────────────────────────────────

// Kept symmetric with donor listing categories so a donor-listed item can always
// find a matching donee request category — see src/lib/categoryVisuals.ts.
const CATEGORIES = [
  "Medical aid", "Education", "Livelihood", "Relief", "Household",
  "Furniture", "Clothing", "Electronics", "Sports",
];
const URGENCIES = [
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];
const EMERGENCY_NATURES = ["FLOOD", "FIRE", "EARTHQUAKE", "ACCIDENT", "EVICTION", "OTHER"];
const HOUSING_TYPES = ["OWNED", "RENTED", "SHELTER", "TEMPORARY"];

type Tier = "TIER_1_BASIC" | "TIER_2_MODERATE" | "TIER_3_HIGH_VALUE" | "TIER_4_EMERGENCY";

// Mirrors backend TierService.mapCategoryToTier() — client-side preview only;
// the backend re-derives (and can be overridden by admin) at submit time.
function mapCategoryToTier(category: string, isEmergency: boolean): Tier {
  if (isEmergency) return "TIER_4_EMERGENCY";
  const map: Record<string, Tier> = {
    "clothing": "TIER_1_BASIC",
    "household": "TIER_1_BASIC",
    "sports": "TIER_1_BASIC",
    "electronics": "TIER_2_MODERATE",
    "furniture": "TIER_2_MODERATE",
    "education": "TIER_2_MODERATE",
    "medical aid": "TIER_3_HIGH_VALUE",
    "livelihood": "TIER_3_HIGH_VALUE",
    "relief": "TIER_3_HIGH_VALUE",
  };
  return map[category.toLowerCase()] ?? "TIER_2_MODERATE";
}

const TIER_LABELS: Record<Tier, string> = {
  TIER_1_BASIC: "Tier 1 — Basic Need",
  TIER_2_MODERATE: "Tier 2 — Moderate Need",
  TIER_3_HIGH_VALUE: "Tier 3 — High-Value Need",
  TIER_4_EMERGENCY: "Tier 4 — Emergency",
};

const TIER_TAT: Record<Tier, string> = {
  TIER_1_BASIC: "Reviewed within 24 hours",
  TIER_2_MODERATE: "Reviewed within 48 hours",
  TIER_3_HIGH_VALUE: "Reviewed within 72 hours",
  TIER_4_EMERGENCY: "Fast-tracked — reviewed within 4 hours",
};

// Mirrors backend TierService.requiredDocuments() — flat list, no "one-of" alternatives.
const REQUIRED_DOCS: Record<Tier, { type: VerificationDocumentType; label: string }[]> = {
  TIER_1_BASIC: [
    { type: "AADHAAR_FRONT", label: "Aadhaar Card — Front" },
    { type: "AADHAAR_BACK", label: "Aadhaar Card — Back" },
    { type: "SELFIE_WITH_ID", label: "Selfie holding your Aadhaar" },
  ],
  TIER_2_MODERATE: [
    { type: "AADHAAR_FRONT", label: "Aadhaar Card — Front" },
    { type: "AADHAAR_BACK", label: "Aadhaar Card — Back" },
    { type: "SELFIE_WITH_ID", label: "Selfie holding your Aadhaar" },
    { type: "PROOF_OF_NEED", label: "Proof of need (school/hospital/doctor letter)" },
    { type: "BPL_CARD", label: "BPL card or income certificate" },
  ],
  TIER_3_HIGH_VALUE: [
    { type: "AADHAAR_FRONT", label: "Aadhaar Card — Front" },
    { type: "AADHAAR_BACK", label: "Aadhaar Card — Back" },
    { type: "SELFIE_WITH_ID", label: "Selfie holding your Aadhaar" },
    { type: "PROOF_OF_NEED", label: "Primary proof of need (hospital discharge / prescription)" },
    { type: "BPL_CARD", label: "BPL card or income certificate" },
    { type: "REFERENCE_LETTER", label: "Third-party reference letter (NGO/Sarpanch/social worker)" },
    { type: "SITUATION_PHOTO", label: "Situation photo (home/patient/damage)" },
  ],
  TIER_4_EMERGENCY: [
    { type: "GOVT_ID_ANY", label: "Any government photo ID" },
    { type: "EMERGENCY_PROOF", label: "Emergency proof (FIR / news article / relief letter)" },
    { type: "SCENE_SELFIE", label: "Selfie at the affected location" },
  ],
};

const DECLARATIONS = [
  "The information I have provided in this request is true and accurate to the best of my knowledge.",
  "I understand my Aadhaar number and uploaded documents are used only for admin verification and will never be shown to donors or other users.",
  "I have not already received this same item from CauseKind within the last 60 days, and I have not submitted this same request elsewhere.",
  "I understand that providing false information may result in my request being rejected and my account being restricted.",
  "I consent to CauseKind contacting any reference or alternate contact I provide, to verify this request.",
  "I understand CauseKind may place this request on hold or ask for more information before approving it.",
];

const STEPS = [
  { id: 1, label: "Need Details", sub: "What do you need, and why?" },
  { id: 2, label: "Household & Situation", sub: "Help us understand your situation" },
  { id: 3, label: "Verification Documents", sub: "Required for admin verification" },
  { id: 4, label: "Declarations", sub: "Final confirmation" },
];

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

// ── Document upload slot ─────────────────────────────────────────────────────
function DocSlot({
  label, uploaded, uploading, onUpload,
}: { label: string; uploaded: boolean; uploading: boolean; onUpload: (file: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border-2 p-3.5 transition-all
      ${uploaded ? "border-green-400 bg-green-50 dark:bg-green-950/20 dark:border-green-700" : "border-stone-200 dark:border-zinc-700"}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        {uploaded ? <FileCheck2 className="w-4 h-4 text-green-500 shrink-0" /> : <UploadCloud className="w-4 h-4 text-stone-400 shrink-0" />}
        <span className="text-sm font-semibold text-stone-700 dark:text-stone-200 truncate">{label}</span>
      </div>
      <input ref={ref} type="file" accept="image/*,.pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
      <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
        className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg border border-[#b04a15]/40 text-[#b04a15] hover:bg-[#b04a15]/5 disabled:opacity-50 transition-colors">
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : uploaded ? "Replace" : "Upload"}
      </button>
    </div>
  );
}

export default function NewRequestPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Step 1 — need details
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [urgency, setUrgency] = useState("NORMAL");
  const [description, setDescription] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
  const [emergencyNature, setEmergencyNature] = useState("");
  const [incidentDate, setIncidentDate] = useState("");

  // Location (GPS mandatory, same pattern as before)
  const [countryIso, setCountryIso] = useState("");
  const [stateIso, setStateIso] = useState("");
  const [cityValue, setCityValue] = useState("");
  const [cityFreeText, setCityFreeText] = useState("");
  const [forceFreeTextCity, setForceFreeTextCity] = useState(false);
  const [pincode, setPincode] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsBlocked, setGpsBlocked] = useState(false);
  const { countries: countryOptions, states: stateOptions, cities: cityOptions } = useLocations(countryIso, stateIso);
  const noStateOptions = countryIso !== "" && stateOptions.length === 0;
  const noCityOptions = stateIso !== "" && cityOptions.length === 0;
  const showCityFreeText = noStateOptions || noCityOptions || forceFreeTextCity;

  const tier = mapCategoryToTier(category, isEmergency);

  // Step 2 — household & situation (RequestVerification form)
  const [verification, setVerification] = useState<Partial<RequestVerification>>({});
  function setV<K extends keyof RequestVerification>(key: K, value: RequestVerification[K]) {
    setVerification((v) => ({ ...v, [key]: value }));
  }

  // Step 3 — Aadhaar + documents
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarSaved, setAadhaarSaved] = useState(false);
  const [savingAadhaar, setSavingAadhaar] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<Set<VerificationDocumentType>>(new Set());
  const [uploadingDoc, setUploadingDoc] = useState<VerificationDocumentType | null>(null);

  // Step 4
  const [declarations, setDeclarations] = useState<boolean[]>(new Array(DECLARATIONS.length).fill(false));

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    getProfile()
      .then((p) => {
        if (p.role !== "DONEE" && p.role !== "ADMIN") {
          toast.error("Access denied. Only Beneficiaries (Donees) can post needs.");
          router.push("/dashboard");
        }
      })
      .catch(() => {});
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) handleGPSLocation(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function handleGPSLocation(isAuto = false) {
    if (!navigator.geolocation) { toast.error("Your browser doesn't support GPS location"); setGpsBlocked(true); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        setGpsCoords({ lat, lng });
        setGpsBlocked(false);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`);
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
              if (addr.postcode) setPincode(addr.postcode.replace(/\s/g, ""));
            }
          }
          if (!isAuto) toast.success("Location updated");
        } catch { if (!isAuto) toast.error("Could not resolve location details"); }
        finally { setGpsLoading(false); }
      },
      () => { setGpsLoading(false); setGpsBlocked(true); toast.error("Location access denied. GPS is required to post a request."); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function buildCityString(): string {
    const c = showCityFreeText ? cityFreeText : cityValue;
    return [c, stateIso, countryIso].filter(Boolean).join(", ");
  }

  const buildPayload = useCallback((): Partial<UpdateRequestPayload> => ({
    title: title || undefined,
    category: category || undefined,
    quantity,
    urgency,
    city: buildCityString() || undefined,
    pincode: pincode || undefined,
    description: description || undefined,
    latitude: gpsCoords?.lat,
    longitude: gpsCoords?.lng,
    isEmergency,
    emergencyNature: isEmergency ? emergencyNature || undefined : undefined,
    incidentDate: isEmergency ? incidentDate || undefined : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [title, category, quantity, urgency, pincode, description, gpsCoords, isEmergency, emergencyNature, incidentDate, cityValue, cityFreeText, stateIso, countryIso, showCityFreeText]);

  async function ensureDraft(): Promise<number> {
    if (draftId) return draftId;
    const d = await createItemRequestDraft();
    setDraftId(d.id);
    return d.id;
  }

  function validateStep(s: number): boolean {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!title.trim()) e.title = "Title is required";
      if (!category) e.category = "Category is required";
      if (quantity < 1) e.quantity = "Quantity must be at least 1";
      if (!description || description.length < 30) e.description = `Describe your need in at least 30 characters (currently ${description.length})`;
      const city = showCityFreeText ? cityFreeText : cityValue;
      if (!city) e.city = "City is required";
      if (!gpsCoords) e.gps = "GPS location is required";
      if (isEmergency && !emergencyNature) e.emergencyNature = "Select the nature of the emergency";
    }
    if (s === 3) {
      // Tier 4 (Emergency) doesn't collect Aadhaar at all — the field isn't even
      // rendered for it (relaxed ID requirements), so don't block on it here.
      if (tier !== "TIER_4_EMERGENCY" && !aadhaarSaved) e.aadhaar = "Aadhaar number must be saved before continuing";
      const missing = REQUIRED_DOCS[tier].filter((d) => !uploadedDocs.has(d.type));
      if (missing.length > 0) e.documents = `${missing.length} required document(s) still missing`;
    }
    if (s === 4) {
      if (!declarations.every(Boolean)) e.declarations = "All declarations must be accepted";
    }
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleNext() {
    if (!validateStep(step)) { toast.error("Please fix the highlighted fields"); return; }
    setSaving(true);
    try {
      const id = await ensureDraft();
      if (step === 1) {
        await updateItemRequestDraft(id, buildPayload());
      }
      if (step === 2) {
        await saveRequestVerificationDetails(id, verification);
      }
      setStep((s) => Math.min(s + 1, STEPS.length));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save — please try again");
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    setFieldErrors({});
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveAadhaar() {
    if (!/^\d{12}$/.test(aadhaarNumber)) { toast.error("Aadhaar number must be exactly 12 digits"); return; }
    setSavingAadhaar(true);
    try {
      await updateAadhaar(aadhaarNumber);
      setAadhaarSaved(true);
      toast.success("Aadhaar number saved securely");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save Aadhaar number");
    } finally {
      setSavingAadhaar(false);
    }
  }

  async function handleDocUpload(docType: VerificationDocumentType, file: File) {
    if (!draftId) return;
    setUploadingDoc(docType);
    try {
      await uploadVerificationDocument(draftId, docType, file);
      setUploadedDocs((prev) => new Set(prev).add(docType));
      toast.success("Document uploaded");
    } catch {
      toast.error("Upload failed — please try again");
    } finally {
      setUploadingDoc(null);
    }
  }

  async function handleSubmit() {
    if (!validateStep(4)) { toast.error("Please fix the highlighted fields"); return; }
    if (!draftId) return;
    setSubmitting(true);
    try {
      await submitItemRequestDraft(draftId);
      toast.success("Your request has been submitted for verification!");
      router.push("/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user) return null;

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
              CauseKind requires your GPS location to connect your request with nearby donors. Please enable location permissions in your browser to proceed.
            </p>
          </div>
          <button onClick={() => handleGPSLocation(false)} disabled={gpsLoading}
            className="w-full bg-[#b04a15] hover:bg-[#963c0d] text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 transition-colors">
            {gpsLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Detecting...</> : "Retry Location Detection"}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1: Need Details ─────────────────────────────────────────────────
  const step1 = (
    <div className="space-y-6">
      <Field label="What do you need?" required error={fieldErrors.title}>
        <Input placeholder="e.g. Wheelchair for elderly family member" value={title} onChange={(e) => setTitle(e.target.value)}
          className={fieldErrors.title ? "border-[#b04a15]" : ""} />
      </Field>

      <div className="grid grid-cols-2 gap-5">
        <Field label="Category" required error={fieldErrors.category}>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className={`h-11 ${fieldErrors.category ? "border-[#b04a15]" : ""}`}><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Quantity" required error={fieldErrors.quantity}>
          <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="h-11" />
        </Field>
      </div>

      <Field label="Urgency">
        <div className="flex gap-2">
          {URGENCIES.map((u) => (
            <button key={u.value} type="button" onClick={() => setUrgency(u.value)}
              className={`px-4 py-2 rounded-full border text-xs font-bold transition-all ${urgency === u.value ? "bg-[#b04a15] text-white border-[#b04a15]" : "border-stone-300 text-stone-500 hover:border-[#b04a15]"}`}>
              {u.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Live tier preview */}
      {category && (
        <div className="rounded-2xl bg-[#1e3a60]/8 border border-[#1e3a60]/20 p-4 flex items-start gap-3">
          <Shield className="w-4 h-4 text-[#1e3a60] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-black text-[#1e3a60]">{TIER_LABELS[tier]}</p>
            <p className="text-xs text-stone-500 mt-0.5">{TIER_TAT[tier]} — you'll upload {REQUIRED_DOCS[tier].length} verification document(s) in a later step.</p>
          </div>
        </div>
      )}

      <Field label="Describe your need" required hint={`${description.length}/2000 — be specific: who it's for, why, and any relevant context`} error={fieldErrors.description}>
        <Textarea rows={5} placeholder="e.g. My father is 68 and cannot walk unassisted after a stroke last month. A wheelchair would let him move around the house safely."
          value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000}
          className={fieldErrors.description ? "border-[#b04a15]" : ""} />
      </Field>

      {/* Emergency toggle */}
      <div className="rounded-2xl border border-stone-200 dark:border-zinc-700 p-5 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => setIsEmergency(!isEmergency)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${isEmergency ? "bg-red-600 border-red-600" : "border-stone-300 hover:border-red-500"}`}>
            {isEmergency && <CheckCircle2 className="w-3 h-3 text-white" />}
          </div>
          <span className="text-sm font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-500" /> This is an emergency (flood, fire, accident, displacement)
          </span>
        </label>
        {isEmergency && (
          <div className="grid grid-cols-2 gap-4 pt-1">
            <Field label="Nature of emergency" required error={fieldErrors.emergencyNature}>
              <Select value={emergencyNature} onValueChange={setEmergencyNature}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{EMERGENCY_NATURES.map((n) => <SelectItem key={n} value={n}>{n.charAt(0) + n.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Date of incident">
              <Input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} max={new Date().toISOString().split("T")[0]} className="h-11" />
            </Field>
          </div>
        )}
      </div>

      {/* Location */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#b04a15]" /> Location
          </p>
          <button type="button" onClick={() => handleGPSLocation(false)} disabled={gpsLoading}
            className="text-xs font-bold text-[#b04a15] hover:underline disabled:opacity-50 flex items-center gap-1">
            {gpsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "📍"} {gpsLoading ? "Detecting…" : "Use GPS"}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-stone-500 dark:text-stone-400">Country</label>
            <SearchableSelect id="country" options={countryOptions} value={countryIso}
              onChange={(iso) => { setCountryIso(iso); setStateIso(""); setCityValue(""); setCityFreeText(""); setForceFreeTextCity(false); }}
              placeholder="Select country" searchPlaceholder="Search…" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-stone-500 dark:text-stone-400">State</label>
            {noStateOptions ? <p className="text-xs text-stone-400 italic py-2">No states listed</p> : (
              <SearchableSelect id="state" options={stateOptions} value={stateIso}
                onChange={(iso) => { setStateIso(iso); setCityValue(""); setCityFreeText(""); setForceFreeTextCity(false); }}
                placeholder="Select state" disabled={!countryIso} searchPlaceholder="Search…" />
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-stone-500 dark:text-stone-400">City</label>
            {showCityFreeText ? (
              <Input placeholder="Enter city" value={cityFreeText} onChange={(e) => setCityFreeText(e.target.value)} className={fieldErrors.city ? "border-[#b04a15]" : ""} />
            ) : (
              <SearchableSelect id="city" options={cityOptions} value={cityValue} onChange={setCityValue}
                placeholder="Select city" disabled={!stateIso && !noStateOptions} searchPlaceholder="Search…" />
            )}
          </div>
        </div>
        {fieldErrors.city && <p className="text-xs text-[#b04a15] font-semibold">{fieldErrors.city}</p>}
        <Field label="PIN Code">
          <Input placeholder="e.g. 411001" value={pincode} onChange={(e) => setPincode(e.target.value)} maxLength={10} className="h-11 w-40" />
        </Field>
      </div>
    </div>
  );

  // ── Step 2: Household & Situation (tier-driven) ──────────────────────────
  const step2 = (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[#f0b97a]/15 border border-[#f0b97a]/40 p-4">
        <p className="text-sm font-black text-[#b04a15]">{TIER_LABELS[tier]}</p>
        <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">These questions help our admin team verify and prioritize your request fairly.</p>
      </div>

      {tier === "TIER_4_EMERGENCY" ? (
        <>
          <div className="grid grid-cols-2 gap-5">
            <Field label="People affected">
              <Input type="number" min={1} value={verification.peopleAffected ?? ""} onChange={(e) => setV("peopleAffected", Number(e.target.value))} className="h-11" />
            </Field>
          </div>
          <Field label="What was lost or damaged" hint="Be specific: house, belongings, documents, etc.">
            <Textarea rows={3} value={verification.lostDamagedDescription ?? ""} onChange={(e) => setV("lostDamagedDescription", e.target.value)} />
          </Field>
          <Field label="Priority items needed" hint="An ordered list — most urgent first">
            <Textarea rows={3} value={verification.priorityItems ?? ""} onChange={(e) => setV("priorityItems", e.target.value)} />
          </Field>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-5">
            <Field label="Household size">
              <Input type="number" min={1} value={verification.householdSize ?? ""} onChange={(e) => setV("householdSize", Number(e.target.value))} className="h-11" />
            </Field>
            <Field label="Number of dependents">
              <Input type="number" min={0} value={verification.dependents ?? ""} onChange={(e) => setV("dependents", Number(e.target.value))} className="h-11" />
            </Field>
          </div>

          {(tier === "TIER_2_MODERATE" || tier === "TIER_3_HIGH_VALUE") && (
            <>
              <div className="grid grid-cols-2 gap-5">
                <Field label="Your age">
                  <Input type="number" min={1} value={verification.age ?? ""} onChange={(e) => setV("age", Number(e.target.value))} className="h-11" />
                </Field>
                <Field label="Housing type">
                  <Select value={verification.housingType ?? ""} onValueChange={(v) => setV("housingType", v as RequestVerification["housingType"])}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{HOUSING_TYPES.map((h) => <SelectItem key={h} value={h}>{h.charAt(0) + h.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Who is this item for?" hint="e.g. 'for my 10-year-old daughter studying in Class 5'">
                <Input value={verification.beneficiaryDetails ?? ""} onChange={(e) => setV("beneficiaryDetails", e.target.value)} className="h-11" />
              </Field>
              <Field label="Why can't you buy this yourself?">
                <Textarea rows={3} value={verification.reasonCannotBuy ?? ""} onChange={(e) => setV("reasonCannotBuy", e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-5">
                <Field label="Supporting institution" hint="School, hospital, NGO, or doctor whose document you're submitting">
                  <Input value={verification.supportingInstitution ?? ""} onChange={(e) => setV("supportingInstitution", e.target.value)} className="h-11" />
                </Field>
                <Field label="Approx. monthly household income (₹)">
                  <Input type="number" min={0} value={verification.monthlyIncome ?? ""} onChange={(e) => setV("monthlyIncome", Number(e.target.value))} className="h-11" />
                </Field>
              </div>
            </>
          )}

          {tier === "TIER_3_HIGH_VALUE" && (
            <>
              <div className="grid grid-cols-2 gap-5">
                <Field label="Family size">
                  <Input type="number" min={1} value={verification.familySize ?? ""} onChange={(e) => setV("familySize", Number(e.target.value))} className="h-11" />
                </Field>
                <Field label="Number of earners">
                  <Input type="number" min={0} value={verification.numberOfEarners ?? ""} onChange={(e) => setV("numberOfEarners", Number(e.target.value))} className="h-11" />
                </Field>
              </div>
              <Field label="Income source" hint="e.g. 'daily labour — ₹300/day'">
                <Input value={verification.incomeSource ?? ""} onChange={(e) => setV("incomeSource", e.target.value)} className="h-11" />
              </Field>
              <Field label="Medical condition / disability" hint="Describe the diagnosed condition that necessitates this item, if applicable">
                <Textarea rows={2} value={verification.medicalCondition ?? ""} onChange={(e) => setV("medicalCondition", e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-5">
                <Field label="Reference person name" hint="Doctor / NGO worker / social worker who wrote your reference letter">
                  <Input value={verification.referrerName ?? ""} onChange={(e) => setV("referrerName", e.target.value)} className="h-11" />
                </Field>
                <Field label="Reference contact number">
                  <Input value={verification.referrerContact ?? ""} onChange={(e) => setV("referrerContact", e.target.value)} className="h-11" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <Field label="Alternate contact name" hint="A family member we can call to verify your story">
                  <Input value={verification.altContactName ?? ""} onChange={(e) => setV("altContactName", e.target.value)} className="h-11" />
                </Field>
                <Field label="Alternate contact phone">
                  <Input value={verification.altContactPhone ?? ""} onChange={(e) => setV("altContactPhone", e.target.value)} className="h-11" />
                </Field>
              </div>
              <Field label="Your detailed story" hint="What happened, when, and why this specific item is your priority need">
                <Textarea rows={4} value={verification.detailedStory ?? ""} onChange={(e) => setV("detailedStory", e.target.value)} />
              </Field>
              <Field label="Google Maps location pin" hint="Optional — paste a Google Maps link if you can share one">
                <Input value={verification.mapsPin ?? ""} onChange={(e) => setV("mapsPin", e.target.value)} className="h-11" />
              </Field>
            </>
          )}
        </>
      )}
    </div>
  );

  // ── Step 3: Verification Documents ────────────────────────────────────────
  const step3 = (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[#1e3a60]/8 border border-[#1e3a60]/20 p-4 flex items-start gap-3">
        <Lock className="w-4 h-4 text-[#1e3a60] mt-0.5 shrink-0" />
        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
          Your Aadhaar number and documents are encrypted and visible only to CauseKind admins for verification — never to donors or other users.
        </p>
      </div>

      {tier !== "TIER_4_EMERGENCY" && (
        <Field label="Aadhaar Number" required error={fieldErrors.aadhaar} hint="12 digits, no spaces">
          <div className="flex gap-2">
            <Input value={aadhaarNumber} onChange={(e) => { setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12)); setAadhaarSaved(false); }}
              placeholder="123456789012" maxLength={12} className="h-11 flex-1" disabled={aadhaarSaved} />
            <button type="button" onClick={handleSaveAadhaar} disabled={savingAadhaar || aadhaarSaved || aadhaarNumber.length !== 12}
              className="h-11 px-4 rounded-lg border border-[#b04a15]/40 text-[#b04a15] text-sm font-bold hover:bg-[#b04a15]/5 disabled:opacity-50 transition-colors shrink-0">
              {savingAadhaar ? <Loader2 className="w-4 h-4 animate-spin" /> : aadhaarSaved ? <CheckCircle2 className="w-4 h-4" /> : "Save"}
            </button>
          </div>
        </Field>
      )}

      <div className="space-y-3">
        <p className="text-xs font-black text-stone-500 uppercase tracking-widest">Required Documents</p>
        {REQUIRED_DOCS[tier].map((d) => (
          <DocSlot key={d.type} label={d.label} uploaded={uploadedDocs.has(d.type)}
            uploading={uploadingDoc === d.type} onUpload={(f) => handleDocUpload(d.type, f)} />
        ))}
        {fieldErrors.documents && <p className="text-xs text-[#b04a15] font-semibold">{fieldErrors.documents}</p>}
      </div>
    </div>
  );

  // ── Step 4: Declarations ──────────────────────────────────────────────────
  const step4 = (
    <div className="space-y-6">
      <div className="space-y-2.5">
        {DECLARATIONS.map((d, i) => (
          <label key={i} onClick={() => setDeclarations((prev) => prev.map((v, idx) => idx === i ? !v : v))}
            className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-200
              ${declarations[i] ? "border-green-400 bg-green-50 dark:bg-green-950/20 dark:border-green-700" : "border-stone-200 dark:border-zinc-700 hover:border-stone-300"}`}>
            <div className="mt-0.5 shrink-0">
              {declarations[i] ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-stone-300" />}
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
          `Our team verifies your request (${TIER_TAT[tier].toLowerCase()})`,
          "We first search for a matching donor in our private inventory — quietly, before publishing anything",
          "If a match exists, we ask that donor to confirm availability before you're told anything",
          "If no private match exists, your (already verified) request is published so donors can offer to help",
          "Handover is verified via OTP — then your donation certificate is issued",
        ].map((s, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-stone-500">
            <span className="font-black text-[#b04a15] shrink-0">{i + 1}.</span>
            <span>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#faf8f5] dark:bg-zinc-950">
      {/* ── LEFT SIDEBAR ── */}
      <aside className="hidden lg:flex lg:w-[280px] xl:w-[300px] shrink-0 flex-col relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0e0904 0%, #1a0f07 50%, #0c1621 100%)" }}>
        <div className="absolute top-16 left-8 w-56 h-56 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(176,74,21,0.22) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div className="absolute bottom-24 right-4 w-48 h-48 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(30,58,96,0.30) 0%, transparent 70%)", filter: "blur(36px)" }} />

        <div className="relative z-10 flex flex-col h-full p-8 xl:p-10">
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#f0b97a] bg-[#b04a15]/25 border border-[#b04a15]/40 rounded-full px-3.5 py-1.5">
              <Shield className="w-3 h-3" /> Verified Support
            </span>
          </div>
          <div className="mb-10">
            <h1 className="text-white text-4xl xl:text-5xl font-black leading-none tracking-tight mb-3" style={{ fontFamily: "serif" }}>
              Request<br />
              <span style={{ background: "linear-gradient(90deg, #e07b3a, #f0b97a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Support</span>
            </h1>
            <p className="text-stone-400 text-sm leading-relaxed">
              Tell us what you need. We verify your request privately, then look for a matching donor before anyone else ever hears about it.
            </p>
          </div>

          <div className="space-y-1 mb-10">
            {STEPS.map((s, i) => {
              const done = step > s.id, active = step === s.id;
              return (
                <div key={s.id}>
                  <button type="button" onClick={() => done && setStep(s.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 text-left ${active ? "bg-white/8" : "hover:bg-white/4"}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 transition-all duration-300
                      ${done ? "bg-green-500/20 text-green-400" : active ? "text-white shadow-[0_0_20px_rgba(176,74,21,0.6)]" : "bg-white/6 text-white/30"}`}
                      style={active ? { background: "linear-gradient(135deg, #b04a15, #e07b3a)" } : {}}>
                      {done ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                    </div>
                    <div className={`transition-all duration-300 ${active ? "opacity-100" : done ? "opacity-60" : "opacity-30"}`}>
                      <p className="text-white text-sm font-bold leading-tight">{s.label}</p>
                      <p className="text-white/40 text-[11px]">{s.sub}</p>
                    </div>
                  </button>
                  {i < STEPS.length - 1 && <div className="ml-7.5 pl-3.5 h-4 flex items-center"><div className={`w-px h-full ${done ? "bg-green-500/40" : "bg-white/8"}`} /></div>}
                </div>
              );
            })}
          </div>

          <div className="space-y-2.5 mt-auto">
            {[
              { icon: Shield, title: "Privacy First", desc: "Your need stays private unless it must go public" },
              { icon: Lock, title: "Aadhaar Encrypted", desc: "Admin-only, never shown to other users" },
              { icon: Award, title: "Donation Certificate", desc: "Official record once fulfilled" },
            ].map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="flex items-center gap-3 px-3.5 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(176,74,21,0.18)", border: "1px solid rgba(176,74,21,0.25)" }}>
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
        </div>
      </aside>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 min-w-0 relative overflow-y-auto">
        <div className="relative z-10 max-w-[860px] mx-auto px-6 sm:px-10 lg:px-16 py-10 lg:py-14">

          {/* Mobile step indicator */}
          <div className="lg:hidden mb-6">
            <div className="flex items-center gap-0">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${step > s.id ? "bg-green-500 text-white" : step === s.id ? "text-white" : "bg-stone-200 text-stone-400"}`}
                    style={step === s.id ? { background: "linear-gradient(135deg,#b04a15,#e07b3a)" } : {}}>
                    {step > s.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.id}
                  </div>
                  {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${step > s.id ? "bg-green-400" : "bg-stone-200 dark:bg-zinc-700"}`} />}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#b04a15] mb-1">Step {step} of {STEPS.length}</p>
              <h2 className="text-3xl xl:text-4xl font-black tracking-tight text-stone-900 dark:text-stone-50 leading-none">{STEPS[step - 1].label}</h2>
              <p className="text-stone-400 text-sm mt-1">{STEPS[step - 1].sub}</p>
            </div>
            {saving && <span className="text-xs text-stone-400 flex items-center gap-1.5 mt-1"><Loader2 className="w-3 h-3 animate-spin text-[#b04a15]" /> Saving…</span>}
          </div>

          <div className="relative mb-8 h-1.5 rounded-full bg-stone-200 dark:bg-zinc-800 overflow-hidden">
            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%`, background: "linear-gradient(90deg, #b04a15, #e07b3a, #f0b97a)" }} />
          </div>

          <div className="rounded-3xl p-8 sm:p-10 mb-6" style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 20px 60px -12px rgba(176,74,21,0.10)" }}>
            {step === 1 && step1}
            {step === 2 && step2}
            {step === 3 && step3}
            {step === 4 && step4}
          </div>

          <div className="flex items-center gap-3 pb-6">
            {step > 1 && (
              <button type="button" onClick={handleBack}
                className="flex items-center gap-1.5 px-5 py-3 rounded-2xl border-2 border-stone-200 dark:border-zinc-700 font-bold text-sm text-stone-600 dark:text-stone-300 hover:border-stone-400 transition-all active:scale-[0.97]">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            <div className="flex-1" />
            {step < STEPS.length ? (
              <button type="button" onClick={handleNext} disabled={saving}
                className="flex items-center gap-2 px-7 py-3 rounded-2xl font-black text-sm text-white transition-all active:scale-[0.97] disabled:opacity-60 shadow-[0_6px_24px_rgba(176,74,21,0.35)]"
                style={{ background: "linear-gradient(135deg, #b04a15 0%, #e07b3a 100%)" }}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Next: {STEPS[step].label} <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={submitting || !declarations.every(Boolean)}
                className="flex items-center gap-2 px-7 py-3 rounded-2xl font-black text-sm text-white transition-all active:scale-[0.97] disabled:opacity-50 shadow-[0_6px_24px_rgba(22,163,74,0.35)]"
                style={{ background: submitting || !declarations.every(Boolean) ? undefined : "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)" }}>
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <>Submit for Verification <ChevronRight className="w-4 h-4" /></>}
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
