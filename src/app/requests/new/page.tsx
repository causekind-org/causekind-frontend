"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";
import {
  getProfile,
  getMyItemRequests,
  getMyVerificationDocuments,
  getMyRequestVerificationDetails,
  createItemRequestDraft,
  updateItemRequestDraft,
  submitItemRequestDraft,
  setDoneePhotoConsent,
  saveRequestVerificationDetails,
  uploadVerificationDocument,
  type DocUploadError,
  deleteVerificationDocument,
  analyzeResidenceProof,
  analyzeIdProof,
  type UpdateRequestPayload,
  type RequestVerification,
  type VerificationDocumentType,
  type VerificationDocument,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, ChevronLeft, CheckCircle2, Circle, MapPin,
  Shield, Award, Lock, UploadCloud, X, FileCheck2, AlertTriangle, Trash2,
  Camera, Upload, Info,
} from "lucide-react";
import { CameraCaptureDialog } from "@/components/CameraCaptureDialog";
import { useLocations } from "@/hooks/useLocations";
import { resolveLocationFromGPS } from "@/app/actions/locations";
import { SearchableSelect } from "@/components/profile/SearchableSelect";
import { PHONE_LENGTHS, getDialCode } from "@/lib/phone";
import { compressImageIfNeeded } from "@/lib/imageCompression";
import { ALL_REQUEST_CATEGORIES as CATEGORIES } from "@/lib/categoryVisuals";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  DONEE_REQUEST_STEPS, LAST_DONEE_STEP, STEP_INTROS, STEP_LABELS,
  doneeStepIndex, stepFromNumber, stepNumber,
  type DoneeRequestStep,
} from "@/features/donee-request-wizard/doneeRequestModel";
import { WizardProgressBar, WizardProgressRail, type StepAvailability } from "@/features/wizard-kit/WizardProgress";
import { WizardNavigation } from "@/features/wizard-kit/WizardNavigation";
import { DraftSaveStatus } from "@/features/wizard-kit/DraftSaveStatus";
import { StepErrorSummary } from "@/features/wizard-kit/StepErrorSummary";
import { StepCardStack } from "@/features/wizard-kit/StepCardStack";
import { WizardBorderGlow } from "@/features/wizard-kit/WizardBorderGlow";
import { WizardField } from "@/features/wizard-kit/WizardField";
import { cardVariants } from "@/features/wizard-kit/wizardMotion";
import type { SaveStatus } from "@/features/wizard-kit/types";

// ── Constants ────────────────────────────────────────────────────────────────
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
    { type: "RESIDENCE_PROOF", label: "Residence proof (any document showing your address)" },
    { type: "GOVT_ID_ANY", label: "Government ID proof (Aadhaar, PAN, Voter ID, or similar)" },
    { type: "SELFIE_WITH_ID", label: "A clear photo of yourself" },
  ],
  TIER_2_MODERATE: [
    { type: "RESIDENCE_PROOF", label: "Residence proof (any document showing your address)" },
    { type: "GOVT_ID_ANY", label: "Government ID proof (Aadhaar, PAN, Voter ID, or similar)" },
    { type: "SELFIE_WITH_ID", label: "A clear photo of yourself" },
    { type: "PROOF_OF_NEED", label: "Proof of need (school/hospital/doctor letter)" },
    { type: "BPL_CARD", label: "BPL card" },
  ],
  TIER_3_HIGH_VALUE: [
    { type: "RESIDENCE_PROOF", label: "Residence proof (any document showing your address)" },
    { type: "GOVT_ID_ANY", label: "Government ID proof (Aadhaar, PAN, Voter ID, or similar)" },
    { type: "SELFIE_WITH_ID", label: "A clear photo of yourself" },
    { type: "PROOF_OF_NEED", label: "Primary proof of need (hospital discharge / prescription)" },
    { type: "BPL_CARD", label: "BPL card" },
    { type: "REFERENCE_LETTER", label: "Third-party reference letter (NGO/Sarpanch/social worker)" },
    { type: "SITUATION_PHOTO", label: "Situation photo (home/patient/damage)" },
  ],
  TIER_4_EMERGENCY: [
    { type: "GOVT_ID_ANY", label: "Any government photo ID" },
    { type: "EMERGENCY_PROOF", label: "Emergency proof (FIR / news article / relief letter)" },
    { type: "SCENE_SELFIE", label: "Selfie at the affected location" },
  ],
};

// Only these actually block submission — everything else in REQUIRED_DOCS above
// is shown as a helpful (optional) upload but isn't mandatory. Tier 4 Emergency
// keeps all three of its docs mandatory (unchanged, separate concern).
const MANDATORY_DOC_TYPES: Record<Tier, VerificationDocumentType[]> = {
  TIER_1_BASIC: ["RESIDENCE_PROOF", "GOVT_ID_ANY", "SELFIE_WITH_ID"],
  TIER_2_MODERATE: ["RESIDENCE_PROOF", "GOVT_ID_ANY", "SELFIE_WITH_ID"],
  TIER_3_HIGH_VALUE: ["RESIDENCE_PROOF", "GOVT_ID_ANY", "SELFIE_WITH_ID"],
  TIER_4_EMERGENCY: ["GOVT_ID_ANY", "EMERGENCY_PROOF", "SCENE_SELFIE"],
};

// Doc types that get an immediate AI screening pass right after upload —
// residence proof and government ID are the two documents with a dedicated
// Claude-vision check (ResidenceProofVisionService / IdProofVisionService on
// the backend). Everything else is admin-reviewed only, same as before.
const AI_SCREENED_DOC_TYPES: VerificationDocumentType[] = ["RESIDENCE_PROOF", "GOVT_ID_ANY"];

// The donee photo is screened differently from the two above: the backend runs
// Rekognition DURING the upload request and refuses to store a photo that fails,
// so there is no separate analyze call and a stored photo is by definition an
// accepted one. That also means its verdict arrives as an upload ERROR (422 /
// 503) rather than as a follow-up response — see handleDocUpload.
const UPLOAD_SCREENED_DOC_TYPES: VerificationDocumentType[] = ["SELFIE_WITH_ID"];

// Doc types that offer an in-app camera action alongside the file picker. Kept
// separate from UPLOAD_SCREENED_DOC_TYPES on purpose: "screened during upload"
// and "worth photographing right now" are different properties that happen to
// coincide today. The camera is always an ADDITIONAL option, never a mode the
// donee is forced into — anyone without a camera, or who declines permission,
// must still be able to submit this mandatory document via Choose photo.
const CAMERA_CAPTURE_DOC_TYPES: VerificationDocumentType[] = ["SELFIE_WITH_ID"];

// Rekognition accepts JPEG and PNG only, so the picker must not offer PDFs (or
// HEIC) for the photo — rejecting them after a slow upload would be worse.
const PHOTO_ACCEPT = "image/jpeg,image/png";
const DEFAULT_ACCEPT = "image/*,.pdf";

type DocScreening = {
  status: "checking" | "valid" | "invalid" | "unavailable";
  reason: string | null;
  documentTypeGuess: string | null;
};

const DECLARATIONS = [
  "The information I have provided in this request is true and accurate to the best of my knowledge.",
  "I understand my residence proof and government ID are used only for admin verification and are never shown to donors or other users.",
  "I have not already received this same item from CauseKind within the last 60 days, and I have not submitted this same request elsewhere.",
  "I understand that providing false information may result in my request being rejected and my account being restricted.",
  "I consent to CauseKind contacting any reference or alternate contact I provide, to verify this request.",
  "I understand CauseKind may place this request on hold or ask for more information before approving it.",
];

// Step labels, intros and order now live in
// features/donee-request-wizard/doneeRequestModel.ts, keyed by semantic id, so
// the wizard-kit progress rail and this page read from one list.

// Fix & Resubmit: guess which wizard step the rejection reason points at, so the
// donee lands directly on what needs fixing instead of walking through prefilled
// steps. Keyword heuristic over the admin's free-text reason (incl. AI drafts,
// which quote the failed checklist items). Order matters: document terms first
// ("situation photos", "reference letter" are documents), then people/story
// terms (step 2), else the need details themselves (step 1).
function stepForRejection(reason: string): number {
  const r = reason.toLowerCase();
  if (/residence|selfie|photo|document|upload|bpl|proof|letter|blurry|unclear|unreadable|id card/.test(r)) return 3;
  if (/contact|referr|doctor|hospital|story|income|household|family|dependent|alternate|situation|age|housing/.test(r)) return 2;
  return 1;
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
// The local `Field` lived here. It rendered a <Label> with no `htmlFor`, gave
// the control no `id`, and set neither `aria-describedby` nor `aria-invalid` —
// so none of this form's labels were associated with their controls and no
// error was announced. Replaced throughout by
// features/wizard-kit/WizardField.tsx, which is the same component the listing
// and offer wizards use.

// ── Document upload slot ─────────────────────────────────────────────────────
function DocSlot({
  label, required, doc, uploading, screening, uploadScreened = false, complete,
  allowCamera = false, accept = "image/*,.pdf", onUpload, onRemove,
}: {
  label: string; required: boolean; doc: VerificationDocument | undefined;
  uploading: boolean; screening?: DocScreening; uploadScreened?: boolean;
  complete: boolean; allowCamera?: boolean; accept?: string;
  onUpload: (file: File) => void; onRemove: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const invalid = screening?.status === "invalid";
  const unavailable = screening?.status === "unavailable";
  const checking = screening?.status === "checking";
  // `complete` is the single source of truth for the green state — it comes from
  // the same isDocComplete() the required-counter uses, so the slot can never
  // look finished while the counter disagrees.
  const uploaded = complete && !checking;
  // A photo that exists but hasn't passed screening: only reachable on a draft
  // saved before the photo check existed, where aiVerified is null. Silently
  // showing it as done would strand the donee at a submit-time server rejection.
  const needsRescreen = uploadScreened && !!doc && !complete && !invalid && !unavailable && !checking;

  // `unavailable` is deliberately NOT amber. It means "we could not run the
  // check", not "this document is wrong" — the file still counts toward
  // submission and an admin reviews it either way. Sharing amber and a warning
  // triangle with `needsRescreen` made a working upload read as rejected, which
  // is exactly how it was reported. `needsRescreen` keeps amber because that one
  // genuinely does require the donee to act.
  const borderClass = invalid
    ? "border-red-400 bg-red-50 dark:bg-red-950/20 dark:border-red-700"
    : needsRescreen
      ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700"
      : unavailable
        ? "border-slate-300 bg-slate-50 dark:bg-slate-950/30 dark:border-slate-700"
      : uploaded
        ? "border-green-400 bg-green-50 dark:bg-green-950/20 dark:border-green-700"
        : required
          ? "border-[var(--ck-role-accent)]/30 bg-[var(--ck-role-accent)]/[0.03] dark:border-[var(--ck-role-accent)]/40"
          : "border-stone-200 dark:border-zinc-700";

  // Shared by both action buttons so the pair always reads as one state.
  const actionBorderClass = invalid
    ? "border-red-400 text-red-600 hover:bg-red-100 dark:hover:bg-red-950/30"
    : needsRescreen
      ? "border-amber-400 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/30"
      : unavailable
        ? "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900/40"
        : "border-[var(--ck-role-accent)]/40 text-[var(--ck-role-accent)] hover:bg-[var(--ck-role-accent)]/5";

  // "Take photo" only on a genuinely empty slot; anything the donee needs to
  // redo — a rejection, an unscreened legacy photo, or an accepted one they want
  // to change — reads as "Retake photo".
  const cameraActionLabel = doc || invalid || needsRescreen ? "Retake photo" : "Take photo";
  // The picker is the escape hatch when the camera path is what's failing, so it
  // keeps a plain, always-available label and is never gated by screening state.
  const pickerActionLabel = allowCamera
    ? "Choose photo"
    : invalid || needsRescreen ? "Re-upload"
      : unavailable ? "Try again"
        : uploaded ? "Replace" : "Upload";

  return (
    <div className={`flex items-center gap-3 rounded-xl sm:rounded-2xl border-2 p-3.5 transition-all ${borderClass}`}>
      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center
        ${invalid ? "bg-red-100 dark:bg-red-900/40" : needsRescreen ? "bg-amber-100 dark:bg-amber-900/40" : unavailable ? "bg-slate-100 dark:bg-slate-900/50" : uploaded ? "bg-green-100 dark:bg-green-900/40" : required ? "bg-[var(--ck-role-accent)]/10" : "bg-stone-100 dark:bg-zinc-800"}`}>
        {checking
          ? <Loader2 className="w-4 h-4 text-stone-400 animate-spin" />
          : invalid
            ? <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            : needsRescreen
              ? <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              // Info, not a warning triangle: nothing is wrong with the file.
              : unavailable
                ? <Info className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                : uploaded
                  ? <FileCheck2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  : <UploadCloud className={`w-4 h-4 ${required ? "text-[var(--ck-role-accent)]" : "text-stone-400"}`} />}
      </div>

      <div className="min-w-0 flex-1">
        <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
          {label}
          {required
            ? <span className="text-[var(--ck-role-accent)] ml-0.5">*</span>
            : <span className="ml-1.5 text-3xs font-bold uppercase tracking-wide text-stone-400">(optional)</span>}
        </span>
        {checking ? (
          <p className="text-xs text-stone-400 mt-0.5">
            {uploadScreened ? "Checking face visibility and photo safety…" : "Checking with AI…"}
          </p>
        ) : invalid ? (
          <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-0.5">
            {screening?.reason ?? "This doesn't look valid"}
            {uploadScreened ? "" : " — please re-upload."}
          </p>
        ) : unavailable ? (
          // Previously gated on `uploadScreened`, which is only true for the
          // selfie — so residence and ID proofs matched no branch at all and
          // fell through to the plain "Uploaded <date>" line below, leaving a
          // flagged-looking slot with no explanation. This now covers every
          // document type and shows what the server actually said.
          <>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold mt-0.5">
              Couldn&apos;t check this automatically — an admin will review it.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {screening?.reason ?? "You can try again, or leave it — it won't block your request."}
            </p>
          </>
        ) : needsRescreen ? (
          <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
            This photo was uploaded before we started checking photos. Please re-upload it so we can check it.
          </p>
        ) : uploaded && doc ? (
          <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
            Uploaded {new Date(doc.uploadedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
            {screening?.status === "valid" && (
              uploadScreened
                ? " · Photo accepted"
                : screening.documentTypeGuess ? ` · AI verified — ${screening.documentTypeGuess}` : " · AI verified"
            )}
          </p>
        ) : null}
      </div>

      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
      {allowCamera && (
        <CameraCaptureDialog
          open={cameraOpen}
          onOpenChange={setCameraOpen}
          onCapture={onUpload}
          onChoosePhoto={() => ref.current?.click()}
        />
      )}
      <div className={`shrink-0 flex gap-1.5 ${allowCamera ? "flex-col sm:flex-row sm:items-center" : "items-center"}`}>
        {uploaded && doc && (
          <button type="button" onClick={onRemove} aria-label={`Remove ${label}`}
            className={`p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors
              ${allowCamera ? "self-end sm:self-auto" : ""}`}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        {allowCamera && (
          <button type="button" onClick={() => setCameraOpen(true)} disabled={uploading}
            aria-label={`${cameraActionLabel} for ${label}`}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg border disabled:opacity-50 transition-colors
              whitespace-nowrap inline-flex items-center justify-center gap-1.5 ${actionBorderClass}`}>
            <Camera className="w-3.5 h-3.5" />
            {cameraActionLabel}
          </button>
        )}
        <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
          aria-label={`${pickerActionLabel} for ${label}`}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg border disabled:opacity-50 transition-colors
            whitespace-nowrap ${allowCamera ? "inline-flex items-center justify-center gap-1.5" : ""} ${actionBorderClass}`}>
          {/* With two buttons there's no way to tell which one started the
              upload, so a spinner on either would be a guess. Both go disabled
              and the row's "Checking face visibility and photo safety…" line
              carries the progress instead. */}
          {uploading && !allowCamera
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <>{allowCamera && <Upload className="w-3.5 h-3.5" />}{pickerActionLabel}</>}
        </button>
      </div>
    </div>
  );
}

export default function NewRequestPage() {
  // useSearchParams (for ?draftId= resume) requires a Suspense boundary in App Router
  return (
    <Suspense fallback={null}>
      <NewRequestForm />
    </Suspense>
  );
}

function NewRequestForm() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeDraftId = searchParams.get("draftId");

  const [step, setStep] = useState<DoneeRequestStep>("need-details");
  // +1 forward, -1 back. Drives the card's travel direction so going Back reads
  // as reversing rather than as another forward push.
  const [direction, setDirection] = useState(1);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  // Distinct from `saving`: that is "a request is in flight", this is what the
  // donee is told. It has to survive past the request so "Saved" can linger.
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savingExit, setSavingExit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const reduced = !!useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);

  /** Move to a step and remember which way we travelled, for the transition. */
  const goToStep = useCallback((next: DoneeRequestStep, dir: number) => {
    setDirection(dir);
    setStep(next);
    setFieldErrors({});
  }, []);

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
  const { countries: countryOptions, states: stateOptions, cities: cityOptions, dialCodes: dialCodeOptions } = useLocations(countryIso, stateIso);
  const noStateOptions = countryIso !== "" && stateOptions.length === 0;
  const noCityOptions = stateIso !== "" && cityOptions.length === 0;
  const showCityFreeText = noStateOptions || noCityOptions || forceFreeTextCity;

  const tier = mapCategoryToTier(category, isEmergency);

  // Step 2 — household & situation (RequestVerification form)
  const [verification, setVerification] = useState<Partial<RequestVerification>>({});
  function setV<K extends keyof RequestVerification>(key: K, value: RequestVerification[K]) {
    setVerification((v) => ({ ...v, [key]: value }));
  }

  // Reference contact — dial-code select + per-country digit limit, plus a
  // self-reference guard against the donee's own saved phone (the backend
  // flags SELF_REFERENCE on exact match with donee.phone, so we store the
  // same `+<dialcode><digits>` format registration uses).
  const [userPhone, setUserPhone] = useState("");
  const [refDialCountry, setRefDialCountry] = useState("IN");
  const [refPhone, setRefPhone] = useState("");
  const refMaxLength = PHONE_LENGTHS[refDialCountry] ?? 15;
  const refDialCode = getDialCode(refDialCountry, dialCodeOptions);

  const digitsOnly = (s: string) => s.replace(/\D/g, "");
  const isSelfReference =
    refPhone.length >= 7 && userPhone !== "" &&
    (digitsOnly(userPhone) === digitsOnly(refDialCode + refPhone) ||
      digitsOnly(userPhone).endsWith(refPhone));
  const refComplete = refPhone.length === (PHONE_LENGTHS[refDialCountry] ?? -1);
  const refLiveError = isSelfReference
    ? "Reference number cannot be your own phone number — give an independent reference"
    : "";

  // Keep verification.referrerContact in sync in full international format
  useEffect(() => {
    setVerification((v) => ({ ...v, referrerContact: refPhone ? `${refDialCode}${refPhone}` : "" }));
  }, [refPhone, refDialCode]);

  // Default the reference dial country to the GPS-detected country (until the user types)
  useEffect(() => {
    if (countryIso && refPhone === "") setRefDialCountry(countryIso);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryIso]);

  // Step 3 — verification documents
  const [uploadedDocs, setUploadedDocs] = useState<Map<VerificationDocumentType, VerificationDocument>>(new Map());
  const [uploadingDoc, setUploadingDoc] = useState<VerificationDocumentType | null>(null);
  const [docScreening, setDocScreening] = useState<Map<VerificationDocumentType, DocScreening>>(new Map());

  // Step 4
  const [declarations, setDeclarations] = useState<boolean[]>(new Array(DECLARATIONS.length).fill(false));
  // Opt-in, defaults off — see the consent control on step 4.
  const [photoConsent, setPhotoConsent] = useState(false);

  // Fix & Resubmit: the old rejection reason, shown as guidance while editing
  const [rejectionNote, setRejectionNote] = useState<string | null>(null);

  // Resume an existing draft (?draftId=N) — used by "Fix & Resubmit" on rejected
  // requests, which reopens them as drafts. Prefills need details and marks the
  // still-attached documents as uploaded so the donee only redoes what's needed.
  useEffect(() => {
    if (!resumeDraftId || !user) return;
    const idNum = Number(resumeDraftId);
    if (!Number.isFinite(idNum)) return;
    getMyItemRequests()
      .then((list) => {
        const r = list.find((x) => x.id === idNum);
        if (!r || r.status !== "DRAFT") return;
        setDraftId(idNum);
        if (r.title && r.title !== "Draft") setTitle(r.title);
        if (r.category) setCategory(r.category);
        if (r.quantity) setQuantity(r.quantity);
        if (r.urgency) setUrgency(r.urgency);
        if (r.description) setDescription(r.description);
        if (r.pincode) setPincode(r.pincode);
        setIsEmergency(r.isEmergency);
        if (r.emergencyNature) setEmergencyNature(r.emergencyNature);
        if (r.rejectionReason) {
          setRejectionNote(r.rejectionReason);
          // Jump straight to the step the rejection points at — everything else
          // is prefilled and already saved server-side; Back still works.
          setStep(stepFromNumber(stepForRejection(r.rejectionReason)));
        }
        getMyVerificationDocuments(idNum)
          .then((docs) => {
            setUploadedDocs(new Map(docs.map((d) => [d.docType, d])));
            // Restore any persisted AI screening verdict (e.g. Fix & Resubmit reopening
            // a previously-uploaded, already-screened document) without re-calling the AI.
            setDocScreening((prev) => {
              const next = new Map(prev);
              docs.forEach((d) => {
                if (d.aiVerified === null) return;
                next.set(d.docType, {
                  status: d.aiVerified ? "valid" : "invalid",
                  reason: d.aiReason, documentTypeGuess: d.aiDocumentTypeGuess,
                });
              });
              return next;
            });
          })
          .catch(() => {});
        // Prefill step 2 (household & situation) with the previously saved answers
        getMyRequestVerificationDetails(idNum)
          .then((v) => {
            if (!v) return;
            const filled = Object.fromEntries(
              Object.entries(v).filter(([, value]) => value !== null && value !== undefined)
            ) as Partial<RequestVerification>;
            setVerification((prev) => ({ ...prev, ...filled }));
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, [resumeDraftId, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    getProfile()
      .then((p) => {
        if (p.role !== "DONEE" && p.role !== "ADMIN") {
          toast.error("Access denied. Only Beneficiaries (Donees) can post needs.");
          router.push("/dashboard");
        }
        setUserPhone(p.phone ?? "");
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
              // Nominatim reports smaller places under town/village/suburb, not city
              // (e.g. Virar is a town) — use the same fallback chain everywhere.
              const cityName = addr.city || addr.town || addr.village || addr.suburb || "";
              const { stateIso: sIso, cityValue: cVal } = await resolveLocationFromGPS(cc, addr.state, cityName);
              if (sIso) {
                setStateIso(sIso);
                if (cVal) { setCityValue(cVal); setCityFreeText(""); setForceFreeTextCity(false); }
                else { setCityValue(""); setCityFreeText(cityName); setForceFreeTextCity(true); }
              } else if (cityName) {
                setStateIso("");
                setCityValue("");
                setCityFreeText(cityName);
                setForceFreeTextCity(true);
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
    if (s === 2 && tier === "TIER_3_HIGH_VALUE" && refPhone.length > 0) {
      if (PHONE_LENGTHS[refDialCountry] && refPhone.length !== PHONE_LENGTHS[refDialCountry])
        e.referrerContact = `Reference number must be exactly ${PHONE_LENGTHS[refDialCountry]} digits for ${refDialCode || refDialCountry}`;
      else if (isSelfReference)
        e.referrerContact = "Reference number cannot be your own phone number — give an independent reference";
    }
    if (s === 3) {
      const missing = MANDATORY_DOC_TYPES[tier].filter((t) => !isDocComplete(t));
      if (missing.length > 0) {
        // Call out an unscreened photo specifically — "1 document still missing"
        // is baffling when the donee can plainly see a photo sitting there.
        const photoPending = missing.includes("SELFIE_WITH_ID") && uploadedDocs.has("SELFIE_WITH_ID");
        e.documents = photoPending && missing.length === 1
          ? "Your photo hasn't passed our photo check yet — please re-upload a clear photo of yourself"
          : `${missing.length} required document(s) still missing`;
      }
    }
    if (s === 4) {
      if (!declarations.every(Boolean)) e.declarations = "All declarations must be accepted";
    }
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleNext() {
    if (!validateStep(stepNumber(step))) { toast.error("Please fix the highlighted fields"); return; }
    setSaving(true);
    setSaveStatus("saving");
    try {
      const id = await ensureDraft();
      if (step === "need-details") {
        await updateItemRequestDraft(id, buildPayload());
      }
      if (step === "household-situation") {
        await saveRequestVerificationDetails(id, verification);
      }
      setSaveStatus("saved");
      const i = doneeStepIndex(step);
      goToStep(DONEE_REQUEST_STEPS[Math.min(i + 1, DONEE_REQUEST_STEPS.length - 1)], 1);
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    } catch (e) {
      setSaveStatus("error");
      toast.error(e instanceof Error ? e.message : "Could not save — please try again");
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    const i = doneeStepIndex(step);
    goToStep(DONEE_REQUEST_STEPS[Math.max(i - 1, 0)], -1);
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  /**
   * Save & exit. Persists whatever the current step owns before leaving, so
   * "continue later from Dashboard" is a promise the flow actually keeps —
   * previously this was a bare Link and anything typed on the open step was
   * silently lost.
   *
   * <p>Deliberately does not validate: exiting is not submitting, and refusing
   * to save a half-filled step is exactly the wrong response to "I'll finish
   * this later".
   */
  async function handleSaveExit() {
    setSavingExit(true);
    setSaveStatus("saving");
    try {
      const id = await ensureDraft();
      if (step === "need-details") await updateItemRequestDraft(id, buildPayload());
      if (step === "household-situation") await saveRequestVerificationDetails(id, verification);
      setSaveStatus("saved");
      router.push("/dashboard");
    } catch (e) {
      setSaveStatus("error");
      toast.error(e instanceof Error ? e.message : "Could not save your draft — please try again");
    } finally {
      setSavingExit(false);
    }
  }

  /** Retry for the save chip — re-runs the current step's save, nothing else. */
  async function retrySave() {
    setSaveStatus("saving");
    try {
      const id = await ensureDraft();
      if (step === "need-details") await updateItemRequestDraft(id, buildPayload());
      if (step === "household-situation") await saveRequestVerificationDetails(id, verification);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }

  /**
   * Whether a document counts toward the "required to submit" tally.
   *
   * For most types, uploaded == done. The donee photo additionally has to have
   * PASSED screening: a rejected or not-yet-checked photo must never advance the
   * counter, or the donee would be told they're finished and then be blocked at
   * submit by the server-side gate in ItemRequestService.enforceMandatoryDocuments.
   */
  function isDocComplete(docType: VerificationDocumentType): boolean {
    const doc = uploadedDocs.get(docType);
    if (!doc) return false;
    if (!UPLOAD_SCREENED_DOC_TYPES.includes(docType)) return true;
    // On a resumed draft there is no in-memory screening state, so fall back to
    // the persisted verdict — only a genuinely accepted photo restores as done.
    const screening = docScreening.get(docType);
    if (screening) return screening.status === "valid";
    return doc.aiVerified === true;
  }

  async function handleDocUpload(docType: VerificationDocumentType, file: File) {
    if (!draftId) return;
    const uploadScreened = UPLOAD_SCREENED_DOC_TYPES.includes(docType);
    setUploadingDoc(docType);
    // For the donee photo the screening happens inside this same request, so show
    // the screening state up front rather than a generic "uploading".
    if (uploadScreened) {
      setDocScreening((prev) => new Map(prev).set(docType, { status: "checking", reason: null, documentTypeGuess: null }));
    }
    try {
      // Gallery photos off a phone routinely exceed the server's 10MB per-file
      // limit. Shrink first so screening sees the same bytes that get stored.
      const toUpload = await compressImageIfNeeded(file);
      const doc = await uploadVerificationDocument(draftId, docType, toUpload);
      setUploadedDocs((prev) => new Map(prev).set(docType, doc));
      if (uploadScreened) {
        // A stored photo has already passed screening server-side — the backend
        // refuses to persist a failing one, so there is nothing left to check.
        setDocScreening((prev) => new Map(prev).set(docType, { status: "valid", reason: null, documentTypeGuess: null }));
        toast.success("Photo accepted");
      } else {
        toast.success("Document uploaded");
        if (AI_SCREENED_DOC_TYPES.includes(docType)) screenDocument(docType, doc.url, doc.id);
      }
    } catch (e) {
      const err = e as DocUploadError;
      if (err.code === "FILE_TOO_LARGE") {
        // Too big is not a screening verdict, so drop the "checking" state
        // instead of leaving a spinner up or implying the photo was rejected.
        if (uploadScreened) {
          setDocScreening((prev) => { const next = new Map(prev); next.delete(docType); return next; });
        }
        toast.error(err.message);
      } else if (uploadScreened) {
        // An outage must never read as "your photo is bad". Note the existing
        // uploadedDocs entry is deliberately left alone: a failed replacement
        // keeps whatever previously accepted photo the donee already had.
        setDocScreening((prev) => new Map(prev).set(docType, {
          status: err.retryable ? "unavailable" : "invalid",
          reason: err.retryable ? null : (err.message || null),
          documentTypeGuess: null,
        }));
        toast.error(err.retryable
          ? "We couldn't check your photo just now — please try again in a moment"
          : "Photo not accepted — see the note below");
      } else {
        toast.error("Upload failed — please try again");
      }
    } finally {
      setUploadingDoc(null);
    }
  }

  async function handleDocRemove(docType: VerificationDocumentType) {
    const doc = uploadedDocs.get(docType);
    if (!draftId || !doc) return;
    try {
      await deleteVerificationDocument(draftId, doc.id);
      setUploadedDocs((prev) => { const next = new Map(prev); next.delete(docType); return next; });
      setDocScreening((prev) => { const next = new Map(prev); next.delete(docType); return next; });
      toast.success("Document removed");
    } catch {
      toast.error("Couldn't remove document — please try again");
    }
  }

  // Fires the moment upload finishes, so the donee finds out right away if a
  // document doesn't look right instead of waiting for admin review days later.
  // Non-blocking by design (see IdProofVisionService/ResidenceProofVisionService
  // doc comments) — an "invalid" verdict is a strong, immediate warning to
  // re-upload, but a human admin always makes the final call.
  async function screenDocument(docType: VerificationDocumentType, documentUrl: string, documentId: number) {
    setDocScreening((prev) => new Map(prev).set(docType, { status: "checking", reason: null, documentTypeGuess: null }));
    try {
      if (docType === "RESIDENCE_PROOF") {
        const r = await analyzeResidenceProof(documentUrl, documentId);
        applyScreeningResult(docType, r.aiAvailable, r.looksLikeResidenceProof, r.reason, r.documentTypeGuess);
      } else if (docType === "GOVT_ID_ANY") {
        const r = await analyzeIdProof(documentUrl, documentId);
        applyScreeningResult(docType, r.aiAvailable, r.looksLikeValidIdProof, r.reason, r.documentTypeGuess);
      }
    } catch (e) {
      // Keep the message. Writing `null` here meant a transport failure, a 500
      // and an unreachable backend were all indistinguishable to the donee —
      // and with the reason line now rendered, this is the text they read.
      setDocScreening((prev) => new Map(prev).set(docType, {
        status: "unavailable",
        reason: e instanceof Error && e.message ? e.message : null,
        documentTypeGuess: null,
      }));
    }
  }

  function applyScreeningResult(
    docType: VerificationDocumentType, aiAvailable: boolean, looksValid: boolean | null,
    reason: string | null, documentTypeGuess: string | null
  ) {
    const status: DocScreening["status"] =
      !aiAvailable || looksValid === null ? "unavailable" : looksValid ? "valid" : "invalid";
    setDocScreening((prev) => new Map(prev).set(docType, { status, reason, documentTypeGuess }));
    if (status === "invalid") {
      toast.error(`This doesn't look valid — ${reason ?? "please check and re-upload"}`);
    }
  }

  async function handleSubmit() {
    if (!validateStep(4)) { toast.error("Please fix the highlighted fields"); return; }
    if (!draftId) return;
    setSubmitting(true);
    try {
      // Record consent before submitting. A failure here must not block the
      // request — the safe default is "not consented", which is also what the
      // backend already holds, so the request simply goes through without the
      // photo being shared rather than failing outright.
      try {
        await setDoneePhotoConsent(draftId, photoConsent);
      } catch {
        if (photoConsent) toast.error("Couldn't save your photo-sharing choice — your photo stays private for now");
      }
      await submitItemRequestDraft(draftId);
      // Latches the nav button into its confirmed state for the moment before
      // the route changes, so the last thing seen is success rather than a
      // spinner blinking out.
      setSubmitted(true);
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
      <div className="min-h-[calc(100vh-4rem)] bg-[#faf8f5] dark:bg-zinc-950 flex items-center justify-center p-3 sm:p-4">
        <div className="max-w-md w-full text-center space-y-4 sm:space-y-6 bg-white dark:bg-zinc-900 p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-stone-250 dark:border-zinc-800 shadow-xl">
          <div className="mx-auto w-12 sm:w-16 h-12 sm:h-16 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center text-red-500">
            <MapPin className="w-8 h-8 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-stone-900 dark:text-white">Location Access Required</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              CauseKind requires your GPS location to connect your request with nearby donors. Please enable location permissions in your browser to proceed.
            </p>
          </div>
          <button onClick={() => handleGPSLocation(false)} disabled={gpsLoading}
            className="w-full bg-[var(--ck-role-accent)] hover:bg-[var(--ck-role-hover)] text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 transition-colors">
            {gpsLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Detecting...</> : "Retry Location Detection"}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1: Need Details ─────────────────────────────────────────────────
  const step1 = (
    <div className="space-y-4 sm:space-y-6">
      <WizardField label="What do you need?" required error={fieldErrors.title}>
        {({ id, describedBy, invalid }) => (
          <Input id={id} name="title" aria-describedby={describedBy} aria-invalid={invalid}
            placeholder="e.g. Wheelchair for elderly family member" value={title} onChange={(e) => setTitle(e.target.value)}
            className={invalid ? "border-[var(--ck-role-accent)]" : ""} />
        )}
      </WizardField>

      <div className="grid grid-cols-2 gap-4 sm:gap-5">
        <WizardField label="Category" required error={fieldErrors.category}>
          {({ id, describedBy, invalid }) => (
            <Select value={category} onValueChange={setCategory}>
              {/* data-field on the trigger, not the Root: the trigger is the
                  focusable node, and Radix's Root renders nothing focusable. */}
              <SelectTrigger id={id} data-field="category" aria-describedby={describedBy} aria-invalid={invalid}
                className={`h-11 ${invalid ? "border-[var(--ck-role-accent)]" : ""}`}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </WizardField>
        <WizardField label="Quantity" required error={fieldErrors.quantity}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} name="quantity" type="number" min={1} aria-describedby={describedBy} aria-invalid={invalid}
              value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="h-11" />
          )}
        </WizardField>
      </div>

      {/* Urgency is a button group, not a labelled control — a fieldset/legend
          is the correct pairing, and WizardField's htmlFor would point at
          nothing. */}
      <fieldset className="space-y-1">
        <legend className="text-xs font-bold text-stone-700 dark:text-stone-200">Urgency</legend>
        <div className="flex gap-2">
          {URGENCIES.map((u) => (
            <button key={u.value} type="button" onClick={() => setUrgency(u.value)}
              aria-pressed={urgency === u.value}
              className={`px-4 py-2 rounded-full border text-xs font-bold transition-all ${urgency === u.value ? "bg-[var(--ck-role-accent)] text-white border-[var(--ck-role-accent)]" : "border-stone-300 text-stone-500 hover:border-[var(--ck-role-accent)]"}`}>
              {u.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Live tier preview */}
      {category && (
        <div className="rounded-xl sm:rounded-2xl bg-[#1e3a60]/8 border border-[#1e3a60]/20 p-3 sm:p-4 flex items-start gap-3">
          <Shield className="w-4 h-4 text-[#1e3a60] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-black text-[#1e3a60]">{TIER_LABELS[tier]}</p>
            <p className="text-xs text-stone-500 mt-0.5">{TIER_TAT[tier]} — you'll upload {REQUIRED_DOCS[tier].length} verification document(s) in a later step.</p>
          </div>
        </div>
      )}

      <WizardField label="Describe your need" required error={fieldErrors.description}
        hint={`${description.length}/2000 — be specific: who it's for, why, and any relevant context`}>
        {({ id, describedBy, invalid }) => (
          <Textarea id={id} name="description" rows={5} aria-describedby={describedBy} aria-invalid={invalid}
            placeholder="e.g. My father is 68 and cannot walk unassisted after a stroke last month. A wheelchair would let him move around the house safely."
            value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000}
            className={invalid ? "border-[var(--ck-role-accent)]" : ""} />
        )}
      </WizardField>

      {/* Emergency toggle */}
      <div className="rounded-xl sm:rounded-2xl border border-stone-200 dark:border-zinc-700 p-3.5 sm:p-5 space-y-3 sm:space-y-4">
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
          <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1">
            <WizardField label="Nature of emergency" required error={fieldErrors.emergencyNature}>
              {({ id, describedBy, invalid }) => (
                <Select value={emergencyNature} onValueChange={setEmergencyNature}>
                  <SelectTrigger id={id} data-field="emergencyNature" aria-describedby={describedBy} aria-invalid={invalid} className="h-11">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>{EMERGENCY_NATURES.map((n) => <SelectItem key={n} value={n}>{n.charAt(0) + n.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </WizardField>
            <WizardField label="Date of incident">
              {({ id, describedBy }) => (
                <Input id={id} name="incidentDate" type="date" aria-describedby={describedBy}
                  value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]} className="h-11" />
              )}
            </WizardField>
          </div>
        )}
      </div>

      {/* Location */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[var(--ck-role-accent)]" /> Location
          </p>
          {/* `data-field="gps"` is the summary link's target. There is no input
              to focus for this error — GPS is a button plus derived state — so
              the button itself is the only sensible landing point. */}
          <button type="button" data-field="gps" onClick={() => handleGPSLocation(false)} disabled={gpsLoading}
            aria-describedby={fieldErrors.gps ? "gps-error" : undefined}
            aria-invalid={!!fieldErrors.gps}
            className="text-xs font-bold text-[var(--ck-role-accent)] hover:underline disabled:opacity-50 flex items-center gap-1">
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
            {/* Both branches carry data-field="city": which one renders depends
                on whether the country has a city list, and the summary link has
                to work either way. */}
            {showCityFreeText ? (
              <Input placeholder="Enter city" data-field="city" value={cityFreeText}
                aria-describedby={fieldErrors.city ? "city-error" : undefined}
                aria-invalid={!!fieldErrors.city}
                onChange={(e) => setCityFreeText(e.target.value)}
                className={fieldErrors.city ? "border-[var(--ck-role-accent)]" : ""} />
            ) : (
              // SearchableSelect takes a fixed prop list with no rest spread, so
              // `data-field` cannot go on it. `tabIndex={-1}` makes the wrapper
              // programmatically focusable — focus() and scrollIntoView both
              // work, and it stays out of the Tab order.
              <div data-field="city" tabIndex={-1} className="outline-none">
                <SearchableSelect id="city" options={cityOptions} value={cityValue} onChange={setCityValue}
                  placeholder="Select city" disabled={!stateIso && !noStateOptions} searchPlaceholder="Search…" />
              </div>
            )}
          </div>
        </div>
        {fieldErrors.city && <p id="city-error" role="alert" className="text-xs text-[var(--ck-role-accent)] font-semibold">{fieldErrors.city}</p>}
        {/* The GPS error had no display at all — validateStep could set it and
            the donee would only see "Please fix the highlighted fields" with
            nothing highlighted. */}
        {fieldErrors.gps && <p id="gps-error" role="alert" className="text-xs text-[var(--ck-role-accent)] font-semibold">{fieldErrors.gps}</p>}
        <WizardField label="PIN Code">
          {({ id, describedBy }) => (
            <Input id={id} name="pincode" aria-describedby={describedBy} placeholder="e.g. 411001"
              value={pincode} onChange={(e) => setPincode(e.target.value)} maxLength={10} className="h-11 w-40" />
          )}
        </WizardField>
      </div>
    </div>
  );

  // ── Step 2: Household & Situation (tier-driven) ──────────────────────────
  const step2 = (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-xl sm:rounded-2xl bg-[var(--ck-role-highlight)]/15 border border-[var(--ck-role-highlight)]/40 p-3 sm:p-4">
        <p className="text-sm font-black text-[var(--ck-role-accent)]">{TIER_LABELS[tier]}</p>
        <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">These questions help our admin team verify and prioritize your request fairly.</p>
      </div>

      {tier === "TIER_4_EMERGENCY" ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            <WizardField label="People affected">
              {({ id, describedBy }) => (
                <Input id={id} aria-describedby={describedBy} type="number" min={1} value={verification.peopleAffected ?? ""} onChange={(e) => setV("peopleAffected", Number(e.target.value))} className="h-11" />
              )}
            </WizardField>
          </div>
          <WizardField label="What was lost or damaged" hint="Be specific: house, belongings, documents, etc.">
            {({ id, describedBy }) => (
              <Textarea id={id} aria-describedby={describedBy} rows={3} value={verification.lostDamagedDescription ?? ""} onChange={(e) => setV("lostDamagedDescription", e.target.value)} />
            )}
          </WizardField>
          <WizardField label="Priority items needed" hint="An ordered list — most urgent first">
            {({ id, describedBy }) => (
              <Textarea id={id} aria-describedby={describedBy} rows={3} value={verification.priorityItems ?? ""} onChange={(e) => setV("priorityItems", e.target.value)} />
            )}
          </WizardField>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            <WizardField label="How many people live in your home?" hint="Count everyone — yourself, children, parents, grandparents">
              {({ id, describedBy }) => (
                <Input id={id} aria-describedby={describedBy} type="number" min={1} value={verification.householdSize ?? ""} onChange={(e) => {
                const n = Number(e.target.value);
                setV("householdSize", n);
                // "Family size" (below, Tier 3 only) asks the exact same thing — kept in
                // sync automatically instead of asking the donee the same question twice.
                setV("familySize", n);
                // "Number of earners" (Tier 3) is derived from this minus dependents below
                // rather than asked separately — see the dependents onChange too.
                setV("numberOfEarners", Math.max(0, n - (verification.dependents ?? 0)));
              }} className="h-11" />
              )}
            </WizardField>
            <WizardField label="How many of them cannot earn?" hint="Children, elderly, or sick members who depend on the family. Write 0 if none">
              {({ id, describedBy }) => (
                <Input id={id} aria-describedby={describedBy} type="number" min={0} value={verification.dependents ?? ""} onChange={(e) => {
                const d = Number(e.target.value);
                setV("dependents", d);
                setV("numberOfEarners", Math.max(0, (verification.householdSize ?? 0) - d));
              }} className="h-11" />
              )}
            </WizardField>
          </div>

          {(tier === "TIER_2_MODERATE" || tier === "TIER_3_HIGH_VALUE") && (
            <>
              <div className="grid grid-cols-2 gap-4 sm:gap-5">
                <WizardField label="Your age">
                  {({ id, describedBy }) => (
                    <Input id={id} aria-describedby={describedBy} type="number" min={1} value={verification.age ?? ""} onChange={(e) => setV("age", Number(e.target.value))} className="h-11" />
                  )}
                </WizardField>
                <WizardField label="Housing type">
                  {({ id, describedBy }) => (
                    <Select value={verification.housingType ?? ""} onValueChange={(v) => setV("housingType", v as RequestVerification["housingType"])}>
                      <SelectTrigger id={id} aria-describedby={describedBy} className="h-11"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{HOUSING_TYPES.map((h) => <SelectItem key={h} value={h}>{h.charAt(0) + h.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </WizardField>
              </div>
              <WizardField label="Who is this item for, and their condition?" hint="e.g. 'for my father, cannot stand properly due to a knee injury' or 'for my 10-year-old daughter studying in Class 5'">
                {({ id, describedBy }) => (
                  <Textarea id={id} aria-describedby={describedBy} rows={2} value={verification.beneficiaryDetails ?? ""} onChange={(e) => setV("beneficiaryDetails", e.target.value)} />
                )}
              </WizardField>
              <WizardField label="Why can't you buy this yourself?">
                {({ id, describedBy }) => (
                  <Textarea id={id} aria-describedby={describedBy} rows={3} value={verification.reasonCannotBuy ?? ""} onChange={(e) => setV("reasonCannotBuy", e.target.value)} />
                )}
              </WizardField>
              <div className="grid grid-cols-2 gap-4 sm:gap-5">
                <WizardField label="Supporting institution" hint="School, hospital, NGO, or doctor whose document you're submitting">
                  {({ id, describedBy }) => (
                    <Input id={id} aria-describedby={describedBy} value={verification.supportingInstitution ?? ""} onChange={(e) => setV("supportingInstitution", e.target.value)} className="h-11" />
                  )}
                </WizardField>
                <WizardField label="Approx. monthly household income (₹)">
                  {({ id, describedBy }) => (
                    <Input id={id} aria-describedby={describedBy} type="number" min={0} value={verification.monthlyIncome ?? ""} onChange={(e) => setV("monthlyIncome", Number(e.target.value))} className="h-11" />
                  )}
                </WizardField>
              </div>
            </>
          )}

          {tier === "TIER_3_HIGH_VALUE" && (
            <>
              {/* "Family size" removed — same question as "How many people live in your
                  home?" above, kept in sync automatically there. "Number of earners" also
                  removed — derived from household size minus dependents above, rather than
                  asked separately (donees could otherwise enter numbers that don't add up).
                  "Medical condition / disability" folded into "Who is this item for?" above
                  — donees were repeating the same detail across both fields. */}
              <WizardField label="Income source" hint="e.g. 'daily labour — ₹300/day'">
                {({ id, describedBy }) => (
                  <Input id={id} aria-describedby={describedBy} value={verification.incomeSource ?? ""} onChange={(e) => setV("incomeSource", e.target.value)} className="h-11" />
                )}
              </WizardField>
              <div className="grid grid-cols-2 gap-4 sm:gap-5">
                <WizardField label="Reference person name" hint="Doctor / NGO worker / social worker who wrote your reference letter">
                  {({ id, describedBy }) => (
                    <Input id={id} aria-describedby={describedBy} value={verification.referrerName ?? ""} onChange={(e) => setV("referrerName", e.target.value)} className="h-11" />
                  )}
                </WizardField>
                <WizardField
                  label="Reference contact number"
                  error={fieldErrors.referrerContact || refLiveError}
                  hint={refComplete && !isSelfReference ? undefined : `${PHONE_LENGTHS[refDialCountry] ?? "Up to 15"} digits for ${refDialCode || refDialCountry}`}
                >
                  {({ id, describedBy, invalid }) => (
                  // Two controls under one label: the dial-code picker and the
                  // number. `id` and `data-field` go on the number input — that
                  // is what the label names and what the error is about.
                  <div className="flex gap-2">
                    <div className="w-[104px] shrink-0">
                      <SearchableSelect
                        options={dialCodeOptions}
                        value={refDialCountry}
                        onChange={(iso) => {
                          setRefDialCountry(iso);
                          const max = PHONE_LENGTHS[iso] ?? 15;
                          setRefPhone((p) => p.slice(0, max));
                        }}
                        placeholder="+–"
                        searchPlaceholder="Search country"
                        renderSelectedLabel={(opt) => getDialCode(opt.value, dialCodeOptions)}
                      />
                    </div>
                    <div className="relative flex-1">
                      <Input
                        id={id}
                        data-field="referrerContact"
                        aria-describedby={describedBy}
                        aria-invalid={invalid}
                        type="tel"
                        inputMode="numeric"
                        value={refPhone}
                        maxLength={refMaxLength}
                        onChange={(e) => setRefPhone(digitsOnly(e.target.value).slice(0, refMaxLength))}
                        className={`h-11 pr-9 ${refLiveError ? "border-red-500 focus-visible:ring-red-500/30" : ""}`}
                      />
                      {refComplete && !isSelfReference && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 pointer-events-none" />
                      )}
                    </div>
                  </div>
                  )}
                </WizardField>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:gap-5">
                <WizardField label="Alternate contact name" hint="A family member we can call to verify your story">
                  {({ id, describedBy }) => (
                    <Input id={id} aria-describedby={describedBy} value={verification.altContactName ?? ""} onChange={(e) => setV("altContactName", e.target.value)} className="h-11" />
                  )}
                </WizardField>
                <WizardField label="Alternate contact phone">
                  {({ id, describedBy }) => (
                    <Input id={id} aria-describedby={describedBy} value={verification.altContactPhone ?? ""} onChange={(e) => setV("altContactPhone", e.target.value)} className="h-11" />
                  )}
                </WizardField>
              </div>
              <WizardField label="Your detailed story" hint="What happened, when, and why this specific item is your priority need">
                {({ id, describedBy }) => (
                  <Textarea id={id} aria-describedby={describedBy} rows={4} value={verification.detailedStory ?? ""} onChange={(e) => setV("detailedStory", e.target.value)} />
                )}
              </WizardField>
              <WizardField label="Google Maps location pin" hint="Optional — paste a Google Maps link if you can share one">
                {({ id, describedBy }) => (
                  <Input id={id} aria-describedby={describedBy} value={verification.mapsPin ?? ""} onChange={(e) => setV("mapsPin", e.target.value)} className="h-11" />
                )}
              </WizardField>
            </>
          )}
        </>
      )}
    </div>
  );

  // ── Step 3: Verification Documents ────────────────────────────────────────
  const mandatoryTypes = MANDATORY_DOC_TYPES[tier];
  const requiredDocList = REQUIRED_DOCS[tier].filter((d) => mandatoryTypes.includes(d.type));
  const optionalDocList = REQUIRED_DOCS[tier].filter((d) => !mandatoryTypes.includes(d.type));
  const requiredDoneCount = requiredDocList.filter((d) => isDocComplete(d.type)).length;
  const optionalDoneCount = optionalDocList.filter((d) => uploadedDocs.has(d.type)).length;

  function renderDocSlot(d: { type: VerificationDocumentType; label: string }, required: boolean) {
    return (
      <div key={d.type} className="space-y-2">
        <DocSlot
          label={d.label}
          required={required}
          doc={uploadedDocs.get(d.type)}
          uploading={uploadingDoc === d.type}
          screening={docScreening.get(d.type)}
          uploadScreened={UPLOAD_SCREENED_DOC_TYPES.includes(d.type)}
          complete={isDocComplete(d.type)}
          allowCamera={CAMERA_CAPTURE_DOC_TYPES.includes(d.type)}
          accept={UPLOAD_SCREENED_DOC_TYPES.includes(d.type) ? PHOTO_ACCEPT : DEFAULT_ACCEPT}
          onUpload={(f) => handleDocUpload(d.type, f)}
          onRemove={() => handleDocRemove(d.type)}
        />
        {d.type === "RESIDENCE_PROOF" && !uploadedDocs.has(d.type) && (
          <p className="text-xs text-stone-400 pl-1">
            Anything works as long as it shows your residential address — a utility bill, rental agreement, ration card, voter ID, or bank statement are all fine.
          </p>
        )}
        {d.type === "SELFIE_WITH_ID" && !uploadedDocs.has(d.type) && (
          <p className="text-xs text-stone-400 pl-1">
            A simple photo of your face — no need to hold anything up. Take it somewhere well-lit and make sure
            your face isn&apos;t covered. JPG or PNG, up to 5 MB. We check it automatically as soon as you upload.
          </p>
        )}
        {d.type === "GOVT_ID_ANY" && !uploadedDocs.has(d.type) && (
          <p className="text-xs text-stone-400 pl-1">
            Any one government photo ID works — Aadhaar card, PAN card, Voter ID, driving licence, or passport.
            We check it automatically as soon as you upload.
          </p>
        )}
      </div>
    );
  }

  const step3 = (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-xl sm:rounded-2xl bg-[#1e3a60]/8 border border-[#1e3a60]/20 p-3 sm:p-4 flex items-start gap-3">
        <Lock className="w-4 h-4 text-[#1e3a60] mt-0.5 shrink-0" />
        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
          Your residence and government ID proofs remain visible only to CauseKind admins. Your checked profile photo
          may be shown to signed-in donors viewing your approved request — only if you choose to allow it on the next step.
        </p>
      </div>

      {/* `documents` is a list of upload slots, not one control, so the summary
          link targets the section. tabIndex={-1} makes it a valid focus() target
          without adding a Tab stop; the first upload button is then one Tab
          away. */}
      <div className="space-y-3" data-field="documents" tabIndex={-1}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-black text-stone-500 uppercase tracking-widest">Required to submit</p>
          <span className={`text-xs font-bold ${requiredDoneCount === requiredDocList.length ? "text-green-600" : "text-[var(--ck-role-accent)]"}`}>
            {requiredDoneCount} of {requiredDocList.length}
          </span>
        </div>
        {requiredDocList.map((d) => renderDocSlot(d, true))}
        {fieldErrors.documents && <p role="alert" className="text-xs text-[var(--ck-role-accent)] font-semibold">{fieldErrors.documents}</p>}
      </div>

      {optionalDocList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-stone-500 uppercase tracking-widest">Strengthens your case</p>
            <span className="text-xs font-bold text-stone-400">{optionalDoneCount} of {optionalDocList.length}</span>
          </div>
          <p className="text-xs text-stone-400 -mt-1">Optional, but each one helps our team verify and approve your request faster.</p>
          {optionalDocList.map((d) => renderDocSlot(d, false))}
        </div>
      )}
    </div>
  );

  // ── Step 4: Declarations ──────────────────────────────────────────────────
  /**
   * Which steps may be jumped to from the progress rail.
   *
   * <p>Only backwards. Forward jumps would skip the per-step save in
   * `handleNext` — the draft PATCH after step one, the verification PATCH after
   * step two — so the donee could reach Declarations with nothing persisted and
   * submit a request the server has never seen the details of.
   */
  const availability = DONEE_REQUEST_STEPS.reduce((acc, s) => {
    const i = doneeStepIndex(s);
    const current = doneeStepIndex(step);
    acc[s] = { complete: i < current, canNavigate: i < current };
    return acc;
  }, {} as Record<DoneeRequestStep, StepAvailability>);

  const isLast = step === LAST_DONEE_STEP;

  /** Focus a field named by the error summary. Ids are set by the step bodies. */
  /**
   * Focus the control an error summary entry names.
   *
   * <p>Matches the selector the other two wizards use
   * (`DonationOfferWizard.tsx:284`) rather than `getElementById`: WizardField
   * generates its ids with `useId`, so they are opaque and cannot be guessed
   * from an error key. `data-field` is the stable handle, and it must equal the
   * key `validateStep` sets — a mismatch fails silently, because a summary link
   * that finds nothing simply does nothing.
   */
  function focusField(field: string) {
    const el = document.querySelector<HTMLElement>(`[name="${field}"], [data-field="${field}"]`);
    if (!el) return;
    el.focus();
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  }

  const step4 = (
    <div className="space-y-4 sm:space-y-6">
      {/* Same reasoning as the documents section: the error is about the group,
          so the group is the focus target. */}
      <div className="space-y-2.5" data-field="declarations" tabIndex={-1}>
        {DECLARATIONS.map((d, i) => (
          <label key={i} onClick={() => setDeclarations((prev) => prev.map((v, idx) => idx === i ? !v : v))}
            className={`flex items-start gap-3 p-3.5 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all duration-200
              ${declarations[i] ? "border-green-400 bg-green-50 dark:bg-green-950/20 dark:border-green-700" : "border-stone-200 dark:border-zinc-700 hover:border-stone-300"}`}>
            <div className="mt-0.5 shrink-0">
              {declarations[i] ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-stone-300" />}
            </div>
            <span className="text-sm text-stone-700 dark:text-stone-300 select-none">{d}</span>
          </label>
        ))}
      </div>
      <button type="button" onClick={() => setDeclarations(new Array(DECLARATIONS.length).fill(true))}
        className="text-xs font-black text-[#1e3a60] hover:text-[var(--ck-role-accent)] underline underline-offset-2 transition-colors">
        Accept all declarations at once →
      </button>
      {fieldErrors.declarations && <p role="alert" className="text-sm text-[var(--ck-role-accent)] font-bold">{fieldErrors.declarations}</p>}

      {/* Photo consent — deliberately NOT part of DECLARATIONS above. Those are
          all required to submit; a consent you cannot decline isn't consent. This
          is opt-in, defaults off, never blocks submission, and is revocable. */}
      <label
        onClick={() => setPhotoConsent((v) => !v)}
        className={`flex items-start gap-3 p-3.5 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all duration-200
          ${photoConsent ? "border-[#1e3a60]/40 bg-[#1e3a60]/[0.04] dark:border-blue-700 dark:bg-blue-950/20" : "border-stone-200 dark:border-zinc-700 hover:border-stone-300"}`}>
        <div className="mt-0.5 shrink-0">
          {photoConsent ? <CheckCircle2 className="w-5 h-5 text-[#1e3a60] dark:text-blue-400" /> : <Circle className="w-5 h-5 text-stone-300" />}
        </div>
        <div className="select-none">
          <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Show my photo to donors <span className="ml-1.5 text-3xs font-bold uppercase tracking-wide text-stone-400">(optional)</span>
          </span>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
            Signed-in donors viewing your approved request will see the profile photo you uploaded. Your residence and
            government ID proofs are never shown. You can change this at any time, and your request is treated exactly
            the same either way.
          </p>
        </div>
      </label>

      <div className="rounded-xl sm:rounded-2xl bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 p-3 sm:p-4 space-y-2">
        <p className="text-xs font-black text-stone-600 dark:text-stone-300 uppercase tracking-widest">What happens next</p>
        {[
          `Our team verifies your request (${TIER_TAT[tier].toLowerCase()})`,
          "We first search for a matching donor in our private inventory — quietly, before publishing anything",
          "If a match exists, we ask that donor to confirm availability before you're told anything",
          "If no private match exists, your (already verified) request is published so donors can offer to help",
          "Handover is verified via OTP — then your donation certificate is issued",
        ].map((s, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-stone-500">
            <span className="font-black text-[var(--ck-role-accent)] shrink-0">{i + 1}.</span>
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

        <div className="relative z-10 flex flex-col h-full p-5 sm:p-8 xl:p-10">
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 text-3xs font-black uppercase tracking-widest text-[var(--ck-role-highlight)] bg-[var(--ck-role-accent)]/25 border border-[var(--ck-role-accent)]/40 rounded-full px-3.5 py-1.5">
              <Shield className="w-3 h-3" /> Verified Support
            </span>
          </div>
          <div className="mb-10">
            <h1 className="text-white text-2xl sm:text-4xl xl:text-5xl font-black leading-none tracking-tight mb-3" style={{ fontFamily: "serif" }}>
              Request<br />
              <span style={{ background: "linear-gradient(90deg, var(--ck-role-secondary), var(--ck-role-highlight))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Support</span>
            </h1>
            <p className="text-stone-400 text-sm leading-relaxed">
              Tell us what you need. We verify your request privately, then look for a matching donor before anyone else ever hears about it.
            </p>
          </div>

          {/* Desktop progress rail — the shared wizard-kit one, so this flow's
              rail behaves identically to the listing and offer wizards
              (completed-node pop, jump-back affordance, nav landmark). */}
          <div className="mb-10">
            <WizardProgressRail
              current={step}
              steps={DONEE_REQUEST_STEPS}
              labels={STEP_LABELS}
              availability={availability}
              onJump={s => goToStep(s, -1)}
              navLabel="Request progress"
            />
          </div>

          <div className="space-y-2.5 mt-auto">
            {[
              { icon: Shield, title: "Privacy First", desc: "Your need stays private unless it must go public" },
              { icon: Lock, title: "Documents Secured", desc: "Admin-only, never shown to other users" },
              { icon: Award, title: "Donation Certificate", desc: "Official record once fulfilled" },
            ].map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="flex items-center gap-3 px-3.5 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(176,74,21,0.18)", border: "1px solid rgba(176,74,21,0.25)" }}>
                    <Icon className="w-4 h-4 text-[var(--ck-role-secondary)]" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-bold leading-tight">{b.title}</p>
                    <p className="text-white/35 text-3xs">{b.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 min-w-0 relative flex flex-col">
        {/* Compact mobile progress. Sticky, and never rendered next to the
            desktop rail — both components carry their own breakpoint. */}
        <div className="sticky top-0 z-30 border-b border-stone-200 bg-[#faf8f5] dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
          <div className="flex items-center justify-between px-4 pt-2">
            <button
              type="button"
              onClick={() => void handleSaveExit()}
              className="flex min-h-[44px] items-center gap-1 text-sm font-medium text-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /> Save &amp; exit
            </button>
            <DraftSaveStatus status={saveStatus} onRetry={() => void retrySave()} />
          </div>
          <WizardProgressBar
            current={step}
            steps={DONEE_REQUEST_STEPS}
            labels={STEP_LABELS}
            availability={availability}
            onJump={s => goToStep(s, -1)}
            navLabel="Request progress"
          />
        </div>

        <div className="relative z-10 w-full max-w-[860px] mx-auto px-4 sm:px-10 lg:px-16 py-6 sm:py-10 lg:py-14">

          <div className="mb-4 hidden items-center justify-between lg:flex">
            <p className="text-2xs font-bold uppercase tracking-wider text-stone-400">
              Step {stepNumber(step)} of {DONEE_REQUEST_STEPS.length}
            </p>
            <DraftSaveStatus status={saveStatus} onRetry={() => void retrySave()} />
          </div>

          {rejectionNote && (
            <div className="mb-6 rounded-xl sm:rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3 sm:p-4 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">You&apos;re fixing a rejected request</p>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed whitespace-pre-line">{rejectionNote}</p>
                <p className="text-2xs text-stone-400 mt-1.5">We&apos;ve brought you to the step that needs attention — everything else is already filled. Use Back to review other steps, then resubmit.</p>
              </div>
            </div>
          )}

          {/* Completed steps pile up behind the active card. Ghosts are
              siblings of the card, never ancestors — a transformed ancestor
              would break the sticky progress header above and shrink every
              input below the 44px touch target. */}
          <StepCardStack depth={doneeStepIndex(step)}>
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.section
                key={step}
                custom={direction}
                variants={cardVariants(reduced)}
                initial="enter" animate="center" exit="exit"
                className="ck-wizard-step-card rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_-16px_rgba(28,25,23,0.25)] sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
              >
                {/* Inside the keyed section on purpose: it must enter, travel
                    and exit with the card. Outside AnimatePresence it would sit
                    still while the card moved, and would disturb mode="wait"
                    exit sequencing. */}
                <WizardBorderGlow />

                <div className="ck-wizard-step-card-content">
                  <h2
                    ref={headingRef} tabIndex={-1}
                    className="text-lg font-bold text-stone-900 outline-none sm:text-xl dark:text-stone-100"
                    style={{ fontFamily: "var(--font-source-serif-4), serif" }}
                  >
                    {STEP_LABELS[step]}
                  </h2>
                  <p className="mb-3 mt-0.5 text-xs text-stone-500 dark:text-stone-400">{STEP_INTROS[step]}</p>

                  <div className="mb-3 empty:hidden">
                    <StepErrorSummary
                      errors={Object.fromEntries(Object.entries(fieldErrors).filter(([, v]) => v))}
                      onFocusField={focusField}
                    />
                  </div>

                  {step === "need-details" && step1}
                  {step === "household-situation" && step2}
                  {step === "verification-documents" && step3}
                  {step === "declarations" && step4}
                </div>
              </motion.section>
            </AnimatePresence>
          </StepCardStack>

        </div>

        {/* Sticky actions. `variant="bar"` because this route hides the global
            mobile dock, so the strip is this wizard's alone — same as the
            listing flow. Save & exit is a real handler now, not the bare Link
            it replaces: that Link navigated away without persisting anything
            typed on the open step. */}
        <WizardNavigation
          canGoBack={doneeStepIndex(step) > 0}
          onBack={handleBack}
          onContinue={() => void (isLast ? handleSubmit() : handleNext())}
          onSaveExit={() => void handleSaveExit()}
          continueLabel={isLast ? "Submit for verification" : "Continue"}
          isLast={isLast}
          submitting={submitting}
          submitted={submitted}
          savingExit={savingExit}
          variant="bar"
        />
      </div>
    </div>
  );
}
