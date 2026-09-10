"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { documentScreeningCopy } from "@/features/wizard-kit/documentScreeningCopy";
import { RequestGuidance } from "@/components/requests/RequestGuidance";
import { toast } from "@/lib/toast";
import {
  getProfile, getDoneeNeedProfile, type DoneeNeedProfile,
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
  Camera, Upload, Info, House, Wallet, UsersRound, FileText, ArrowLeft, ArrowRight, Download,
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

/**
 * Tiers that can complete without an admin ever seeing the request.
 *
 * <p>Mirrors AUTO_APPROVE_ELIGIBLE_TIERS in NeedAssessmentService by hand, like
 * mapCategoryToTier above it — the same hand-mirrored pair this file already
 * carries, and the same warning applies: change both together or the donee is
 * told the wrong thing about their own request.
 *
 * <p>Only used to choose which sentence the guidance shows, so drift is
 * misleading rather than dangerous.
 */
const AUTO_APPROVAL_TIERS: Tier[] = ["TIER_1_BASIC", "TIER_2_MODERATE"];

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
  /**
   * The model's own sentence. Diagnostics only — never rendered. See
   * documentScreeningCopy for why the provider's prose does not reach a donee.
   */
  reason: string | null;
  /** Stable server code, and the only thing the messages below are built from. */
  code: string | null;
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
            {screening?.code ? documentScreeningCopy(screening.code) : (screening?.reason ?? "This doesn't look valid — please re-upload.")}
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
              {screening?.code
                ? documentScreeningCopy(screening.code)
                : "You can try again, or leave it — it won't block your request."}
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

const REUSABLE_PROFILE_DOCS: VerificationDocumentType[] = ["GOVT_ID_ANY","RESIDENCE_PROOF","SELFIE_WITH_ID","RATION_CARD","VOTER_ID","BPL_CARD","INCOME_CERT","BANK_PASSBOOK"];

function NewRequestForm() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeDraftId = searchParams.get("draftId");
  const [needProfile,setNeedProfile] = useState<DoneeNeedProfile | null>(null);
  const [profileError,setProfileError] = useState("");
  const profileLink = "/profile/need-details?next=" + encodeURIComponent("/requests/new" + (resumeDraftId && /^\d+$/.test(resumeDraftId) ? "?draftId=" + resumeDraftId : ""));
  useEffect(() => { if (!user) return; let active = true; getDoneeNeedProfile().then(p => {if(active)setNeedProfile(p);}).catch(e => {if(active)setProfileError(e instanceof Error && e.message && e.message !== "Failed to fetch" ? e.message : "We could not reach CauseKind to check your profile. Please check your connection and try again.");}); return () => {active=false;}; }, [user]);

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
          setStep(stepForRejection(r.rejectionReason) === 1 ? "need-details" : "household-situation");
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
                  reason: d.aiReason,
                  // Derived, because rows stored before codes existed have none.
                  // Mirrors DocumentScreeningCodes.forOutcome on the server.
                  code: d.aiVerified
                    ? "DOC_LOOKS_VALID"
                    : (d.aiDocumentTypeGuess ? "DOC_WRONG_TYPE" : "DOC_NOT_RECOGNISED"),
                  documentTypeGuess: d.aiDocumentTypeGuess,
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
    if (user && needProfile?.complete) handleGPSLocation(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, needProfile?.complete]);

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
    if (!needProfile?.complete) throw new Error("Complete your Donee profile before starting a request");
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
    if (s === 2 && verification.requestingForSomeoneElse && !verification.beneficiaryDetails?.trim()) e.beneficiaryDetails = "Describe the person you are requesting for";
    if (s === 2) {
      const missing = MANDATORY_DOC_TYPES[tier].filter((t) => !REUSABLE_PROFILE_DOCS.includes(t) && !isDocComplete(t));
      if (missing.length > 0) {
        // Call out an unscreened photo specifically — "1 document still missing"
        // is baffling when the donee can plainly see a photo sitting there.
        const photoPending = missing.includes("SELFIE_WITH_ID") && uploadedDocs.has("SELFIE_WITH_ID");
        e.documents = photoPending && missing.length === 1
          ? "Your photo hasn't passed our photo check yet — please re-upload a clear photo of yourself"
          : `${missing.length} required document(s) still missing`;
      }
    }
    if (s === 3) {
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
      setDocScreening((prev) => new Map(prev).set(docType, { status: "checking", reason: null, code: null, documentTypeGuess: null }));
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
        setDocScreening((prev) => new Map(prev).set(docType, { status: "valid", reason: null, code: "DOC_LOOKS_VALID", documentTypeGuess: null }));
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
          // No code on the non-retryable branch on purpose: this is our own
          // upload error ("file too large" and friends), which is specific and
          // worth showing. Only model-authored prose needs replacing.
          code: err.retryable ? "DOC_SCREENING_UNAVAILABLE" : null,
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
    setDocScreening((prev) => new Map(prev).set(docType, { status: "checking", reason: null, code: null, documentTypeGuess: null }));
    try {
      if (docType === "RESIDENCE_PROOF") {
        const r = await analyzeResidenceProof(documentUrl, documentId);
        applyScreeningResult(docType, r.aiAvailable, r.looksLikeResidenceProof, r.documentTypeGuess, r.code);
      } else if (docType === "GOVT_ID_ANY") {
        const r = await analyzeIdProof(documentUrl, documentId);
        applyScreeningResult(docType, r.aiAvailable, r.looksLikeValidIdProof, r.documentTypeGuess, r.code);
      }
    } catch (e) {
      // Keep the message. Writing `null` here meant a transport failure, a 500
      // and an unreachable backend were all indistinguishable to the donee —
      // and with the reason line now rendered, this is the text they read.
      setDocScreening((prev) => new Map(prev).set(docType, {
        status: "unavailable",
        // Kept for diagnostics; no longer what the donee reads.
        reason: e instanceof Error && e.message ? e.message : null,
        code: "DOC_SCREENING_UNAVAILABLE",
        documentTypeGuess: null,
      }));
    }
  }

  /**
   * Record a screening verdict.
   *
   * <p>No `reason` parameter: the server no longer sends the model's sentence,
   * and `DocScreening.reason` is now reserved for OUR own upload errors, which
   * are specific and worth showing. Mixing the two is what let provider prose
   * reach a donee in the first place.
   */
  function applyScreeningResult(
    docType: VerificationDocumentType, aiAvailable: boolean, looksValid: boolean | null,
    documentTypeGuess: string | null, code: string | null
  ) {
    const status: DocScreening["status"] =
      !aiAvailable || looksValid === null ? "unavailable" : looksValid ? "valid" : "invalid";
    setDocScreening((prev) => new Map(prev).set(docType, { status, reason: null, code, documentTypeGuess }));
    if (status === "invalid") {
      // The toast said the same thing as the inline line and then appended the
      // model's sentence, so a donee could be shown two different descriptions
      // of one document. Both now come from the same code.
      toast.error(documentScreeningCopy(code));
    }
  }

  async function handleSubmit() {
    if (!validateStep(3)) { toast.error("Please fix the highlighted fields"); return; }
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

  if (!needProfile?.complete) return <div className="mx-auto max-w-xl px-5 py-16"><h1 className="text-2xl font-bold text-[#1e3a60] dark:text-blue-200">{profileError ? "Could not check your profile" : !needProfile ? "Checking your profile…" : "Complete your profile first"}</h1><p className="mt-3 text-sm text-slate-500">{profileError || "Save your household details and identity documents once in your profile. You can then request items without entering them again."}</p>{needProfile && <Link href={profileLink} className="mt-6 inline-flex rounded-lg bg-[#1e3a60] px-5 py-3 text-sm font-bold text-white">Complete profile →</Link>}{profileError && <button onClick={() => window.location.reload()} className="mt-5 underline">Retry</button>}</div>;

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
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-100 bg-[#eef4fc] p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-800/60">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#1e3a60] dark:text-blue-200">
          <span className="size-2.5 rounded-full bg-[#1e3a60] dark:bg-blue-200" aria-hidden /> Before you start
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
          Your household information and identity documents are saved in your profile. New requests use a copy of those details.{" "}
          Documents remain private to our admin team.
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          You can save and come back — nothing is submitted until you finish.
        </p>
      </div>
      <div className="grid items-start gap-5 md:grid-cols-2">
        <div className="min-w-0 space-y-5">
          <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900 space-y-4" aria-labelledby="request-parameters-heading">
            <h3 id="request-parameters-heading" className="mb-4 text-[11px] font-bold uppercase tracking-wide text-[#1e3a60] dark:text-blue-200">1. Request Parameters</h3>
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
          </section>
          <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900" aria-labelledby="impact-story-heading">
            <h3 id="impact-story-heading" className="mb-4 text-[11px] font-bold uppercase tracking-wide text-[#1e3a60] dark:text-blue-200">2. Impact Story</h3>
            <WizardField label="Describe your need" required error={fieldErrors.description}
        hint={`${description.length}/2000 — be specific: who it's for, why, and any relevant context`}>
        {({ id, describedBy, invalid }) => (
          <Textarea id={id} name="description" rows={7} aria-describedby={describedBy} aria-invalid={invalid}
            placeholder="e.g. My father is 68 and cannot walk unassisted after a stroke last month. A wheelchair would let him move around the house safely."
              value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000}
              className={`placeholder:text-xs ${invalid ? "border-[var(--ck-role-accent)]" : ""}`} />
        )}
      </WizardField>
          </section>
        </div>
        <div className="min-w-0 space-y-5">
          <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900 space-y-4" aria-labelledby="urgency-heading">
            <h3 id="urgency-heading" className="mb-4 text-[11px] font-bold uppercase tracking-wide text-[#1e3a60] dark:text-blue-200">3. Urgency Classification</h3>
            <fieldset className="space-y-1">
        <legend className="text-xs font-bold text-stone-700 dark:text-stone-200">Urgency Level</legend>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {URGENCIES.map((u) => (
            <button key={u.value} type="button" onClick={() => setUrgency(u.value)}
              aria-pressed={urgency === u.value}
              className={`min-h-10 flex-1 rounded-md px-2 py-2 text-xs font-semibold transition-colors ${urgency === u.value ? "bg-white text-[#1e3a60] shadow-sm dark:bg-slate-700 dark:text-blue-200" : "text-slate-500 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-700"}`}>
              {u.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Live tier preview */}
      {category && (
        <div className="rounded-xl sm:rounded-2xl bg-[#1e3a60]/8 border border-[#1e3a60]/20 p-3 sm:p-4 flex items-start gap-3">
          <Shield className="w-4 h-4 text-[#1e3a60] dark:text-blue-200 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold text-[#1e3a60] dark:text-blue-200">{TIER_LABELS[tier]}</p>
            <p className="text-xs text-stone-500 mt-0.5">{TIER_TAT[tier]} — your saved profile documents are included automatically. Any evidence specific to this need comes next.</p>
          </div>
        </div>
      )}
            <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 space-y-3 dark:border-red-900 dark:bg-red-950/20">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={isEmergency} onChange={(e) => setIsEmergency(e.target.checked)} className="size-4 shrink-0 accent-red-600" />
          <span className="text-xs font-medium text-red-700 dark:text-red-300 flex items-center gap-1.5">
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
          </section>
          <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900" aria-label="Location details">
            <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[var(--ck-role-accent)]" /> 4. Location Details
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
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="country" className="text-xs text-stone-500 dark:text-stone-400">Country</label>
            <SearchableSelect id="country" options={countryOptions} value={countryIso}
              onChange={(iso) => { setCountryIso(iso); setStateIso(""); setCityValue(""); setCityFreeText(""); setForceFreeTextCity(false); }}
              placeholder="Select country" searchPlaceholder="Search…" />
          </div>
          <div className="space-y-1">
            <label htmlFor="state" className="text-xs text-stone-500 dark:text-stone-400">State</label>
            {noStateOptions ? <p className="text-xs text-stone-400 italic py-2">No states listed</p> : (
              <SearchableSelect id="state" options={stateOptions} value={stateIso}
                onChange={(iso) => { setStateIso(iso); setCityValue(""); setCityFreeText(""); setForceFreeTextCity(false); }}
                placeholder="Select state" disabled={!countryIso} searchPlaceholder="Search…" />
            )}
          </div>
          <div className="space-y-1">
            <label htmlFor="city" className="text-xs text-stone-500 dark:text-stone-400">City</label>
            {/* Both branches carry data-field="city": which one renders depends
                on whether the country has a city list, and the summary link has
                to work either way. */}
            {showCityFreeText ? (
              <Input id="city" placeholder="Enter city" data-field="city" value={cityFreeText}
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
        <WizardField label="PIN Code">
          {({ id, describedBy }) => (
            <Input id={id} name="pincode" aria-describedby={describedBy} placeholder="e.g. 411001"
              value={pincode} onChange={(e) => setPincode(e.target.value)} maxLength={10} className="h-11 w-full" />
          )}
        </WizardField>
        </div>
        {fieldErrors.city && <p id="city-error" role="alert" className="text-xs text-[var(--ck-role-accent)] font-semibold">{fieldErrors.city}</p>}
        {/* The GPS error had no display at all — validateStep could set it and
            the donee would only see "Please fix the highlighted fields" with
            nothing highlighted. */}
        {fieldErrors.gps && <p id="gps-error" role="alert" className="text-xs text-[var(--ck-role-accent)] font-semibold">{fieldErrors.gps}</p>}

      </div>
          </section>
        </div>
      </div>
    </div>
  );

  const isDetailsLayout = step === "need-details" || step === "household-situation";

  const step2 = (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-[#1e3a60] dark:border-slate-700 dark:bg-slate-900 dark:text-blue-200">Your household details and identity documents are ready in your profile. <button type="button" className="font-bold underline" onClick={async () => { try { const id = await ensureDraft(); await saveRequestVerificationDetails(id, verification); router.push(`/profile/need-details?next=${encodeURIComponent(`/requests/new?draftId=${id}`)}`); } catch { toast.error("Could not save your request. Please try again."); } }}>Review profile</button></div>
      <fieldset className="space-y-3"><legend className="text-sm font-bold">Who is this request for?</legend><div className="flex flex-wrap gap-4">{[{value:false,label:"Myself"},{value:true,label:"Someone else"}].map(o => <label key={o.label} className="flex items-center gap-2 text-sm"><input type="radio" name="beneficiary" checked={Boolean(verification.requestingForSomeoneElse) === o.value} onChange={() => setVerification(v => ({...v, requestingForSomeoneElse:o.value, beneficiaryDetails:"",reasonCannotBuy:"",detailedStory:""}))} />{o.label}</label>)}</div></fieldset>
      {verification.requestingForSomeoneElse && <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <WizardField label="Who is this item for, and what is their situation?" required error={fieldErrors.beneficiaryDetails}>{({id,describedBy,invalid}) => <Textarea id={id} name="beneficiaryDetails" aria-describedby={describedBy} aria-invalid={invalid} value={verification.beneficiaryDetails || ""} maxLength={500} onChange={e => setV("beneficiaryDetails",e.target.value)} />}</WizardField>
        <WizardField label="Why can they not buy this item?">{({id}) => <Textarea id={id} value={verification.reasonCannotBuy || ""} maxLength={10000} onChange={e => setV("reasonCannotBuy",e.target.value)} />}</WizardField>
        <WizardField label="Additional details about this person's need">{({id}) => <Textarea id={id} value={verification.detailedStory || ""} maxLength={10000} onChange={e => setV("detailedStory",e.target.value)} />}</WizardField>
      </div>}
      {isEmergency && <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900"><h3 className="font-bold">This emergency</h3><WizardField label="People affected">{({id}) => <Input id={id} type="number" min={1} value={verification.peopleAffected ?? ""} onChange={e => setV("peopleAffected",Number(e.target.value))} />}</WizardField><WizardField label="What was lost or damaged?">{({id}) => <Textarea id={id} value={verification.lostDamagedDescription || ""} onChange={e => setV("lostDamagedDescription",e.target.value)} />}</WizardField><WizardField label="Priority items needed">{({id}) => <Textarea id={id} value={verification.priorityItems || ""} onChange={e => setV("priorityItems",e.target.value)} />}</WizardField></div>}
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
  const step3 = (
    <section className="mt-5 space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="font-bold">Supporting evidence for this request</h3>
      <p className="text-sm text-slate-500">Your identity documents will be included from your profile. Add evidence specific to this need below.</p>
      {REQUIRED_DOCS[tier].filter(d => !REUSABLE_PROFILE_DOCS.includes(d.type)).map(d => (
        <DocSlot key={d.type} label={d.label} required={MANDATORY_DOC_TYPES[tier].includes(d.type)} doc={uploadedDocs.get(d.type)} uploading={uploadingDoc === d.type} screening={docScreening.get(d.type)} complete={isDocComplete(d.type)} onUpload={file => void handleDocUpload(d.type, file)} onRemove={() => void handleDocRemove(d.type)} />
      ))}
      {REQUIRED_DOCS[tier].every(d => REUSABLE_PROFILE_DOCS.includes(d.type)) && <p className="text-sm">No additional documents are required for this need.</p>}
    </section>
  );

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
      <div className={`flex-1 min-w-0 relative flex flex-col ${isDetailsLayout ? "bg-[#f8fafc] dark:bg-slate-950" : ""}`}>
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

        <div className={`relative z-10 w-full mx-auto ${isDetailsLayout ? "max-w-[1040px] px-4 sm:px-8 lg:px-10 py-6 sm:py-8 lg:py-10" : "max-w-[860px] px-4 sm:px-10 lg:px-16 py-6 sm:py-10 lg:py-14"}`}>

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
          <StepCardStack depth={isDetailsLayout ? 0 : doneeStepIndex(step)}>
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.section
                key={step}
                custom={direction}
                variants={cardVariants(reduced)}
                initial="enter" animate="center" exit="exit"
                className={isDetailsLayout ? "relative" : "ck-wizard-step-card rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_-16px_rgba(28,25,23,0.25)] sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"}
              >
                {/* Inside the keyed section on purpose: it must enter, travel
                    and exit with the card. Outside AnimatePresence it would sit
                    still while the card moved, and would disturb mode="wait"
                    exit sequencing. */}
                {!isDetailsLayout && <WizardBorderGlow />}

                <div className="ck-wizard-step-card-content">
                  <h2
                    ref={headingRef} tabIndex={-1}
                    className="text-lg font-bold text-stone-900 outline-none sm:text-xl dark:text-stone-100"
                    style={step === "household-situation" ? undefined : { fontFamily: "var(--font-source-serif-4), serif" }}
                  >
                    {step === "household-situation" ? "Request context & evidence" : STEP_LABELS[step]}
                    {step === "household-situation" && <span className="ml-3 inline-flex rounded-full border border-blue-100 bg-blue-50 px-2 py-1 align-middle text-[10px] font-semibold text-[#1e3a60] dark:border-slate-700 dark:bg-slate-800 dark:text-blue-200">{TIER_LABELS[tier]}</span>}
                  </h2>
                  <p className="mb-6 mt-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{step === "household-situation" ? "Step 2 of 3 · Only details about this request" : STEP_INTROS[step]}</p>

                  <div className="mb-3 empty:hidden">
                    <StepErrorSummary
                      errors={Object.fromEntries(Object.entries(fieldErrors).filter(([, v]) => v))}
                      onFocusField={focusField}
                    />
                  </div>

                  {step === "need-details" && step1}
                  {step === "household-situation" && <div className="space-y-6">{step2}{step3}</div>}

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
        {step === "need-details" ? (
          <div className="mx-auto w-full max-w-[1040px] px-4 sm:px-8 lg:px-10 pb-6">
            <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-5 dark:border-slate-800">
              <button type="button" onClick={() => void retrySave()} disabled={saveStatus === "saving"} className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d5a96] disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {saveStatus === "saving" ? "Saving…" : "Save Draft"}
              </button>
              <button type="button" onClick={() => void handleNext()} disabled={submitting || saveStatus === "saving"} className="min-h-11 rounded-lg bg-[#1e3a60] px-5 text-xs font-bold text-white transition-colors hover:bg-[#2d5a96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d5a96] disabled:opacity-50">{saving ? "Saving…" : "Continue to Step 2 →"}</button>
            </div>
          </div>
        ) : step === "household-situation" ? (
          <div className="mx-auto flex w-full max-w-[1040px] flex-wrap items-center justify-between gap-3 px-4 pb-6 sm:px-8 lg:px-10">
            <button type="button" onClick={handleBack} disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d5a96] disabled:opacity-50 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><ArrowLeft className="size-4" aria-hidden />Back to Step 1</button>
            <div className="flex flex-wrap gap-2">

              <button type="button" onClick={() => void handleNext()} disabled={saving || saveStatus === "saving"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d5a96] disabled:opacity-50 bg-[#1e3a60] text-white hover:bg-[#2d5a96]">{saving ? "Saving…" : "Save & Continue"}<ArrowRight className="size-4" aria-hidden /></button>
            </div>
          </div>
        ) : <WizardNavigation
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
        />}
      </div>
    </div>
  );
}
