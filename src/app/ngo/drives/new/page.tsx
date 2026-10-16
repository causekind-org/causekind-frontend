"use client";

import React, { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { useAuth } from "@/hooks/useAuth";
import {
  getMyNgoApplication,
  createNgoDrive,
  updateNgoDrive,
  getNgoDriveDetail,
  uploadNgoDriveReferencePhoto,
  ApiError,
  type DrivePhotoItem,
  type PublicNgoDrive,
} from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, ArrowRight, UploadCloud, X, CheckCircle2, ShieldCheck, Layers, ChevronLeft, Shield, Eye } from "lucide-react";
import { compressImageIfNeeded } from "@/lib/imageCompression";
import { ALL_REQUEST_CATEGORIES as CATEGORIES } from "@/lib/categoryVisuals";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { WizardProgressBar, WizardProgressRail } from "@/features/wizard-kit/WizardProgress";
import { StepErrorSummary } from "@/features/wizard-kit/StepErrorSummary";
import { StepCardStack } from "@/features/wizard-kit/StepCardStack";
import { WizardField } from "@/features/wizard-kit/WizardField";
import { DraftSaveStatus } from "@/features/wizard-kit/DraftSaveStatus";
import { cardVariants } from "@/features/wizard-kit/wizardMotion";
import type { SaveStatus } from "@/features/wizard-kit/types";
import { useNgoStatus } from "@/components/ngo-landing/useNgoStatus";

import {
  WIZARD_DRIVE_CONDITIONS,
  wizardConditionHelper,
  normalizeLegacyCondition,
  driveConditionLabel,
  driveConditionRule,
  type DriveCondition,
} from "@/features/ngo-drives/driveConditions";
import { DriveDetailView } from "@/features/ngo-drives/components/DriveDetailView";
import { DriveLocationStep, RADIUS_PRESETS, radiusKm } from "@/features/ngo-drives/components/DriveLocationStep";
import type { LocationStepHandle } from "@/features/item-listing-wizard/steps/LocationStep";
import { useLocationPinHandlers, type LocationFields } from "@/hooks/useLocationPinHandlers";

/** Matches the backend's limit on drive details. */
const DETAILS_MAX = 500;

export const WORKING_ORDER_CATEGORIES = ["Electronics", "Household"] as const;
export const REQUIRE_CLEAN_CATEGORIES = ["Clothing", "Household", "Furniture"] as const;

export const HANDOVER_MODES = [
  { value: "DROP_OFF", label: "Drop-off only" },
  { value: "PICKUP", label: "Pickup only" },
  { value: "BOTH", label: "Both" },
] as const;

export function formatDateDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

type NgoDriveStep = "drive-type" | "drive-location" | "drive-details" | "beneficiaries-handover" | "review-declarations";

const NGO_DRIVE_STEPS: NgoDriveStep[] = ["drive-location", "drive-details", "beneficiaries-handover", "review-declarations"];
const STEP_LABELS: Record<NgoDriveStep, string> = {
  "drive-type": "Drive Type",
  "drive-location": "1 Where is this drive?",
  "drive-details": "2 Drive details",
  "beneficiaries-handover": "3 Beneficiaries & handover",
  "review-declarations": "4 Review & declarations",
};
const STEP_INTROS: Record<NgoDriveStep, string> = {
  "drive-type": "Choose what to collect",
  "drive-location": "Donors near this place will see that you can pick up their items.",
  "drive-details": "Tell givers exactly what you need.",
  "beneficiaries-handover": "Donors near you pledge the items.",
  "review-declarations": "Review and confirm.",
};

function ngoStepIndex(s: NgoDriveStep) { return NGO_DRIVE_STEPS.indexOf(s); }
function stepNumber(s: NgoDriveStep) { return ngoStepIndex(s) + 1; }

const BENEFICIARY_GROUPS = [
  "Children", "Students", "Elderly", "Women", "Families", "Patients", "People with disabilities", "Animals", "Community", "Other"
];
const DROP_OFF_DAYS = [
  { id: "MON", label: "Mon" },
  { id: "TUE", label: "Tue" },
  { id: "WED", label: "Wed" },
  { id: "THU", label: "Thu" },
  { id: "FRI", label: "Fri" },
  { id: "SAT", label: "Sat" },
  { id: "SUN", label: "Sun" },
] as const;
const UNITS = [
  { id: "PIECES", label: "Pieces" },
  { id: "SETS", label: "Sets" },
  { id: "PAIRS", label: "Pairs" },
  { id: "KG", label: "Kg" },
  { id: "BOXES", label: "Boxes" },
  { id: "PACKETS", label: "Packets" },
] as const;
const URGENCIES = [
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

function NewNgoDriveForm() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // "Edit & resubmit" from /ngo/drives/[id]: same form, pre-filled, saved with PUT.
  const editParam = searchParams?.get("edit");
  const editId = editParam && /^\d+$/.test(editParam) ? Number(editParam) : null;
  const [editLoadError, setEditLoadError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [changemakerUploading, setChangemakerUploading] = useState(false);
  const { isVerified, isPhotosDue, lockReason, photosDueRequestName, isLoading: statusLoading, error: statusError, refresh: refreshStatus, canStartDrive, driveLockReason } = useNgoStatus();

  // The last status that finished loading without an error.
  const [settled, setSettled] = useState<{ isVerified: boolean; isPhotosDue: boolean; canStartDrive: boolean } | null>(null);
  useEffect(() => {
    if (!statusLoading && !statusError) setSettled({ isVerified, isPhotosDue, canStartDrive });
  }, [statusLoading, statusError, isVerified, isPhotosDue, canStartDrive]);

  const [ngoContactName, setNgoContactName] = useState("");
  const [ngoContactPhone, setNgoContactPhone] = useState("");
  const [registeredOfficeAddress, setRegisteredOfficeAddress] = useState("");
  const [ngoApp, setNgoApp] = useState<any>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // ?type=items comes from the "Start a Drive" popup, which already chose the type.
  const [step, setStep] = useState<NgoDriveStep>(searchParams?.get("type") === "items" ? "drive-location" : "drive-type");
  const [direction, setDirection] = useState(1);
  const reduced = !!useReducedMotion();

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);

  const IS_NGO_DEMO_MODE = process.env.NEXT_PUBLIC_NGO_DEMO_MODE === "true";
  const userIdentifier = user?.id ?? user?.userId ?? (user?.email ? user.email.toLowerCase().replace(/[^a-z0-9]/g, "_") : "anonymous");
  const DRAFT_KEY = `ngo-drive-draft-${userIdentifier}`;
  const DEMO_DRIVES_KEY = `ngo-demo-drives-${userIdentifier}`;

  // Step 1: Drive parameters
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [category, setCategory] = useState("");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [unit, setUnit] = useState<"PIECES" | "SETS" | "PAIRS" | "KG" | "BOXES" | "PACKETS">("PIECES");
  const [photos, setPhotos] = useState<DrivePhotoItem[]>([]);

  // Step 1: Urgency & item requirements
  const [urgency, setUrgency] = useState<"NORMAL" | "HIGH" | "CRITICAL">("NORMAL");
  const [condition, setCondition] = useState<DriveCondition>("NEW_ONLY");
  const [mustBeWorking, setMustBeWorking] = useState(false);
  const [requireClean, setRequireClean] = useState(false);

  // Step 1: Drive story & details
  const [details, setDetails] = useState("");
  const [whoFor, setWhoFor] = useState("");
  const [whyNow, setWhyNow] = useState("");
  const [whatChanges, setWhatChanges] = useState("");
  const [legacyDescription, setLegacyDescription] = useState("");

  // Step 1: Drive location
  const [locationArea, setLocationArea] = useState("");
  const [locationCity, setLocationCity] = useState("");
  // Step 1: where the drive is (shared location step) and how far the NGO picks up from.
  const [driveLoc, setDriveLoc] = useState<LocationFields>({ countryIso: "IN", stateIso: "", city: "", locality: "", pincode: "" });
  const driveLocRef = useRef<LocationFields>(driveLoc);
  const [radiusChoice, setRadiusChoice] = useState("10");
  const [customRadius, setCustomRadius] = useState("");
  const locationStepRef = useRef<LocationStepHandle>(null);
  const [locationBusy, setLocationBusy] = useState(false);
  const commitDriveLoc = useCallback((next: LocationFields) => {
    driveLocRef.current = next;
    setDriveLoc(next);
    // The drive's area and city are the location step's locality and city.
    setLocationArea(next.locality);
    setLocationCity(next.city);
  }, []);
  const clearDrivePinError = useCallback(() => {
    setFieldErrors(e => (e.latitude || e.longitude ? { ...e, latitude: "", longitude: "" } : e));
  }, []);
  const { lookup: driveLookup, handlePin: handleDrivePin, handleGeocodeTyped: handleDriveGeocodeTyped } = useLocationPinHandlers({
    modelRef: driveLocRef, commit: commitDriveLoc, clearPinError: clearDrivePinError, profileCenter: null,
  });
  const setDriveLocField = useCallback(<K extends keyof LocationFields>(key: K, value: LocationFields[K]) => {
    commitDriveLoc({ ...driveLocRef.current, [key]: value });
  }, [commitDriveLoc]);
  /** Restores a saved location (draft or drive being edited). */
  const restoreDriveLoc = useCallback((d: Record<string, unknown>) => {
    commitDriveLoc({
      countryIso: (d.locationCountry as string) || "IN",
      stateIso: (d.locationState as string) || "",
      city: (d.locationCity as string) || "",
      locality: (d.locationArea as string) || "",
      pincode: (d.locationPincode as string) || "",
      latitude: typeof d.locationLatitude === "number" ? d.locationLatitude : undefined,
      longitude: typeof d.locationLongitude === "number" ? d.locationLongitude : undefined,
    });
    const r = typeof d.pickupRadiusKm === "number" ? d.pickupRadiusKm : null;
    if (r != null) {
      if ((RADIUS_PRESETS as readonly number[]).includes(r)) { setRadiusChoice(String(r)); setCustomRadius(""); }
      else { setRadiusChoice("custom"); setCustomRadius(String(r)); }
    }
  }, [commitDriveLoc]);

  // Step 2: Beneficiaries
  const [beneficiaryGroup, setBeneficiaryGroup] = useState("");
  const [beneficiaryCount, setBeneficiaryCount] = useState<number | "">("");
  const [beneficiaryDescription, setBeneficiaryDescription] = useState("");

  // Step 2: Timeline & Handover
  const [neededBy, setNeededBy] = useState("");
  const [availableDays, setAvailableDays] = useState<("MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN")[]>([]);
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableTo, setAvailableTo] = useState("");
  const [handoverMode, setHandoverMode] = useState<"DROP_OFF" | "PICKUP" | "BOTH">("BOTH");

  // Step 2: Who is behind the drive (changemaker)
  const [changemakerName, setChangemakerName] = useState("");
  const [changemakerRole, setChangemakerRole] = useState("");
  const [changemakerPhotoUrl, setChangemakerPhotoUrl] = useState("");
  const [changemakerPhotoKey, setChangemakerPhotoKey] = useState("");
  const [changemakerWhy, setChangemakerWhy] = useState("");

  // Step 2: Contact person
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [altContact, setAltContact] = useState("");
  const [pastWorkUrl, setPastWorkUrl] = useState("");

  // Step 3 (Declarations)
  const [declAccurate, setDeclAccurate] = useState(false);
  const [declUsedOnly, setDeclUsedOnly] = useState(false);
  const [declProof, setDeclProof] = useState(false);
  const [declFaces, setDeclFaces] = useState(false);
  const [declNotDuplicate, setDeclNotDuplicate] = useState(false);
  const [declFalseInfo, setDeclFalseInfo] = useState(false);
  const [declContact, setDeclContact] = useState(false);

  // Load prefills from NGO application
  useEffect(() => {
    if (!user) return;
    getMyNgoApplication().then(app => {
      if (app) {
        setNgoApp(app);
        const appData = app as any;
        if (appData.representativeName) setNgoContactName(appData.representativeName);
        const contactPhone = appData.organizationPhone || appData.mobileNumber || user?.phone;
        if (contactPhone) setNgoContactPhone(contactPhone);
        if (appData.registeredOfficeAddress) setRegisteredOfficeAddress(appData.registeredOfficeAddress);
        if (appData.city || appData.area) commitDriveLoc({
          ...driveLocRef.current,
          city: driveLocRef.current.city || appData.city || "",
          locality: driveLocRef.current.locality || appData.area || "",
        });
      } else if (IS_NGO_DEMO_MODE) {
        try {
          const appObj = JSON.parse(localStorage.getItem(`ngo-application-${userIdentifier}`) || localStorage.getItem(`ngo-demo-application-${userIdentifier}`) || "{}");
          setNgoApp(appObj);
          if (appObj.representativeName) setNgoContactName(appObj.representativeName);
          const demoPhone = appObj.organizationPhone || appObj.mobileNumber || user?.phone;
          if (demoPhone) setNgoContactPhone(demoPhone);
          if (appObj.registeredOfficeAddress) setRegisteredOfficeAddress(appObj.registeredOfficeAddress);
          if (appObj.city || appObj.area) commitDriveLoc({
            ...driveLocRef.current,
            city: driveLocRef.current.city || appObj.city || "",
            locality: driveLocRef.current.locality || appObj.area || "",
          });
        } catch {}
      }
    }).catch(() => {});
  }, [user, userIdentifier, IS_NGO_DEMO_MODE]);

  // Load draft or edit drive
  const [draftLoaded, setDraftLoaded] = useState(false);
  useEffect(() => {
    if (!user || draftLoaded || editId === null) return;
    let active = true;
    getNgoDriveDetail(editId).then(d => {
      if (!active) return;
      if (d.status !== "CHANGES_REQUESTED" && d.status !== "PENDING_REVIEW") {
        setEditLoadError("Only drives under review or with changes requested can be edited.");
        return;
      }
      setTitle(d.title || "");
      setTagline(d.tagline || "");
      setCategory(d.category || "");
      setItemName(d.itemName || "");
      setQuantity(d.quantityNeeded || "");
      setUnit((d.unit as typeof unit) || "PIECES");
      setUrgency((d.urgency as typeof urgency) || "NORMAL");
      setCondition(normalizeLegacyCondition(d.itemCondition));
      setMustBeWorking(Boolean(d.mustBeWorking));
      setRequireClean(Boolean(d.requireClean));
      setDetails(d.details || "");

      // Photos migration
      if (Array.isArray(d.photos) && d.photos.length > 0) {
        setPhotos(d.photos.map(p => ({ url: p.url, storageKey: p.storageKey, sortOrder: p.sortOrder })));
      } else if (d.referencePhotoUrl && !d.referencePhotoUrl.startsWith("data:")) {
        setPhotos([{ url: d.referencePhotoUrl, storageKey: d.referencePhotoKey || undefined }]);
      } else {
        setPhotos([]);
      }

      // Story answers & legacy description
      setWhoFor(d.whoFor || "");
      setWhyNow(d.whyNow || "");
      setWhatChanges(d.whatChanges || "");
      if (!d.whoFor && !d.whyNow && !d.whatChanges && d.description) {
        setLegacyDescription(d.description);
      }

      // Location
      restoreDriveLoc(d as unknown as Record<string, unknown>);

      // Beneficiaries
      setBeneficiaryGroup(d.beneficiaryGroup || "");
      setBeneficiaryCount(d.beneficiaryCount || "");
      setBeneficiaryDescription(d.beneficiaryDescription || "");

      // Handover
      setNeededBy(d.neededBy || "");
      setAvailableDays(((d.availableDays || "").split(",").filter(Boolean)) as typeof availableDays);
      setAvailableFrom((d.availableFrom || "").slice(0, 5));
      setAvailableTo((d.availableTo || "").slice(0, 5));
      setHandoverMode(d.handoverMode === "DROP_OFF" || d.handoverMode === "PICKUP" || d.handoverMode === "BOTH" ? d.handoverMode : "BOTH");

      // Changemaker
      setChangemakerName(d.changemakerName || "");
      setChangemakerRole(d.changemakerRole || "");
      setChangemakerPhotoUrl(d.changemakerPhotoUrl && !d.changemakerPhotoUrl.startsWith("data:") ? d.changemakerPhotoUrl : "");
      setChangemakerPhotoKey(d.changemakerPhotoKey || "");
      setChangemakerWhy(d.changemakerWhy || "");

      // Contact
      setContactName(d.contactName || "");
      setContactPhone(d.contactPhone || "");
      setAltContact(d.altContact || "");
      setPastWorkUrl(d.pastWorkUrl || "");

      // A drive that already has its location opens at the details; older drives add it first.
      setStep(d.locationLatitude != null && d.pickupRadiusKm != null ? "drive-details" : "drive-location");
      setDraftLoaded(true);
    }).catch(() => { if (active) setEditLoadError("We couldn't load this drive. Please try again."); });
    return () => { active = false; };
  }, [user, draftLoaded, editId]);

  useEffect(() => {
    if (!user || draftLoaded || editId !== null) return;
    try {
      const d = localStorage.getItem(DRAFT_KEY);
      if (d) {
        const p = JSON.parse(d);
        setTitle(p.title || "");
        setTagline(p.tagline || "");
        setCategory(p.category || "");
        setItemName(p.itemName || "");
        setQuantity(p.quantity || "");
        setUnit(p.unit || "PIECES");
        setUrgency(p.urgency || "NORMAL");
        setCondition(normalizeLegacyCondition(p.condition));
        setMustBeWorking(Boolean(p.mustBeWorking));
        setRequireClean(Boolean(p.requireClean));
        setDetails(p.details || "");

        // Photos draft migration
        if (Array.isArray(p.photos) && p.photos.length > 0) {
          setPhotos(p.photos);
        } else if (typeof p.referencePhotoUrl === "string" && p.referencePhotoUrl && !p.referencePhotoUrl.startsWith("data:")) {
          setPhotos([{ url: p.referencePhotoUrl }]);
        } else {
          setPhotos([]);
        }

        // Story answers & legacy description
        setWhoFor(p.whoFor || "");
        setWhyNow(p.whyNow || "");
        setWhatChanges(p.whatChanges || "");
        if (!p.whoFor && !p.whyNow && !p.whatChanges && p.description) {
          setLegacyDescription(p.description);
        }

        // Location
        restoreDriveLoc(p as unknown as Record<string, unknown>);

        // Beneficiaries
        setBeneficiaryGroup(p.beneficiaryGroup || "");
        setBeneficiaryCount(p.beneficiaryCount || "");
        setBeneficiaryDescription(p.beneficiaryDescription || "");

        // Handover
        setNeededBy(p.neededBy || "");
        setAvailableDays(p.availableDays || []);
        setAvailableFrom(p.availableFrom || "");
        setAvailableTo(p.availableTo || "");
        setHandoverMode(p.handoverMode === "DROP_OFF" || p.handoverMode === "PICKUP" || p.handoverMode === "BOTH" ? p.handoverMode : "BOTH");

        // Changemaker
        setChangemakerName(p.changemakerName || "");
        setChangemakerRole(p.changemakerRole || "");
        setChangemakerPhotoUrl(typeof p.changemakerPhotoUrl === "string" && !p.changemakerPhotoUrl.startsWith("data:") ? p.changemakerPhotoUrl : "");
        setChangemakerPhotoKey(p.changemakerPhotoKey || "");
        setChangemakerWhy(p.changemakerWhy || "");

        // Contact
        setContactName(p.contactName || "");
        setContactPhone(p.contactPhone || "");
        setAltContact(p.altContact || "");
        setPastWorkUrl(p.pastWorkUrl || "");

        // Declarations
        if (p.declarations) {
          setDeclAccurate(p.declarations.accurate || false);
          setDeclUsedOnly(p.declarations.usedOnlyForBeneficiaries || false);
          setDeclProof(p.declarations.proofWithin48h || false);
          setDeclFaces(p.declarations.facesWithConsent || false);
          setDeclNotDuplicate(p.declarations.notDuplicate || false);
          setDeclFalseInfo(p.declarations.falseInfoConsequences || false);
          setDeclContact(p.declarations.contactConsent || false);
        }
      }
    } catch {}
    setDraftLoaded(true);
  }, [user, draftLoaded, DRAFT_KEY, editId]);

  // Set default contacts when prefills load and draft is empty
  useEffect(() => {
    if (draftLoaded) {
      if (!contactName && ngoContactName) setContactName(ngoContactName);
      if (!contactPhone && ngoContactPhone) setContactPhone(ngoContactPhone);
    }
  }, [ngoContactName, ngoContactPhone, contactName, contactPhone, draftLoaded]);

  const saveDraft = useCallback(async () => {
    if (!draftLoaded) return;
    setSaveStatus("saving");
    try {
      const saveObj = {
        title, tagline, category, itemName, quantity, unit, urgency, condition, mustBeWorking, requireClean, details,
        photos, whoFor, whyNow, whatChanges, legacyDescription, locationArea, locationCity,
        locationCountry: driveLoc.countryIso, locationState: driveLoc.stateIso, locationPincode: driveLoc.pincode,
        locationLatitude: driveLoc.latitude, locationLongitude: driveLoc.longitude,
        pickupRadiusKm: radiusKm(radiusChoice, customRadius),
        beneficiaryGroup, beneficiaryCount, beneficiaryDescription,
        neededBy, availableDays, availableFrom, availableTo, handoverMode,
        changemakerName, changemakerRole, changemakerPhotoUrl, changemakerPhotoKey, changemakerWhy,
        contactName, contactPhone, altContact, pastWorkUrl,
        declarations: { accurate: declAccurate, usedOnlyForBeneficiaries: declUsedOnly, proofWithin48h: declProof, facesWithConsent: declFaces, notDuplicate: declNotDuplicate, falseInfoConsequences: declFalseInfo, contactConsent: declContact }
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(saveObj));
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, [
    draftLoaded, title, tagline, category, itemName, quantity, unit, urgency, condition, mustBeWorking, requireClean, details,
    photos, whoFor, whyNow, whatChanges, legacyDescription, locationArea, locationCity, driveLoc, radiusChoice, customRadius,
    beneficiaryGroup, beneficiaryCount, beneficiaryDescription,
    neededBy, availableDays, availableFrom, availableTo, handoverMode,
    changemakerName, changemakerRole, changemakerPhotoUrl, changemakerPhotoKey, changemakerWhy,
    contactName, contactPhone, altContact, pastWorkUrl,
    declAccurate, declUsedOnly, declProof, declFaces, declNotDuplicate, declFalseInfo, declContact, DRAFT_KEY
  ]);

  useEffect(() => {
    if (draftLoaded && editId === null) saveDraft();
  }, [draftLoaded, saveDraft, editId]);

  useEffect(() => {
    if (authLoading || user) return;
    const next = editId !== null ? `/ngo/drives/new?edit=${editId}` : "/ngo/drives/new";
    console.warn("[NGO REDIRECT] reason: not logged in");
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [authLoading, user, editId, router]);

  // Redirect only when the NGO is confirmed not verified.
  useEffect(() => {
    if (authLoading || !user || !settled || settled.isVerified) return;
    console.warn("[NGO REDIRECT] reason: NGO is not verified");
    if (lockReason) toast.error(lockReason);
    router.replace("/dashboard/ngo");
  }, [authLoading, user, settled, lockReason, router]);

  const goToStep = useCallback((next: NgoDriveStep, dir: number) => {
    setDirection(dir);
    setStep(next);
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    if (headingRef.current) headingRef.current.focus();
  }, [reduced]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (photos.length + files.length > 5) {
      toast.error("You can upload a maximum of 5 photos.");
      e.target.value = "";
      return;
    }
    setPhotoUploading(true);
    try {
      const uploadedItems: DrivePhotoItem[] = [];
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 5 MB.`);
          continue;
        }
        const compressed = await compressImageIfNeeded(file);
        const url = await uploadNgoDriveReferencePhoto(compressed);
        uploadedItems.push({ url });
      }
      if (uploadedItems.length > 0) {
        setPhotos(prev => [...prev, ...uploadedItems]);
        toast.success(`Photo${uploadedItems.length > 1 ? "s" : ""} uploaded`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to attach photo");
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  }

  function handleRemovePhoto(index: number) {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }

  function handleMakeCover(index: number) {
    if (index <= 0 || index >= photos.length) return;
    setPhotos(prev => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      return [item, ...copy];
    });
  }

  async function handleChangemakerPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo is larger than 5 MB.");
      e.target.value = "";
      return;
    }
    setChangemakerUploading(true);
    try {
      const compressed = await compressImageIfNeeded(file);
      const url = await uploadNgoDriveReferencePhoto(compressed);
      setChangemakerPhotoUrl(url);
      setChangemakerPhotoKey("");
      toast.success("Photo uploaded");
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload photo");
    } finally {
      setChangemakerUploading(false);
      e.target.value = "";
    }
  }

  function validateStep(s: NgoDriveStep): boolean {
    const e: Record<string, string> = {};
    if (s === "drive-location") {
      if (!driveLoc.countryIso) e.countryIso = "Choose the country";
      if (!driveLoc.stateIso) e.stateIso = "Choose the state";
      if (!driveLoc.city.trim() || driveLoc.city.length > 100) e.city = "Enter the city";
      if (driveLoc.locality.length > 100) e.locality = "Locality cannot exceed 100 characters";
      if (!/^[1-9][0-9]{5}$/.test(driveLoc.pincode.trim())) e.pincode = "Enter a 6-digit PIN code";
      if (driveLoc.latitude == null || driveLoc.longitude == null) e.latitude = "Drop the pin on the map";
      if (radiusKm(radiusChoice, customRadius) == null) e.pickupRadiusKm = "Choose a distance from 1 to 500 km";
    }
    if (s === "drive-details") {
      if (!title.trim() || title.length < 10 || title.length > 80) e.title = "Title must be 10-80 characters";
      if (tagline.trim() && tagline.length > 100) e.tagline = "Tagline cannot exceed 100 characters";
      if (!category) e.category = "Category is required";
      if (!itemName.trim() || itemName.length < 2 || itemName.length > 60) e.itemName = "Item name must be 2-60 characters";
      if (quantity === "" || quantity < 2 || quantity > 10000) e.quantity = "Drives collect in bulk: ask for 2 to 10000";
      if (!unit) e.unit = "Unit is required";
      if (photos.length === 0) e.photos = "Upload at least 1 photo (up to 5)";
      if (!condition) e.condition = "Condition is required";
      if (!details.trim()) e.details = "Add the details donors need";
      else if (details.length > DETAILS_MAX) e.details = `Details cannot exceed ${DETAILS_MAX} characters`;
      if (!whoFor.trim() || whoFor.length < 10 || whoFor.length > 300) e.whoFor = "Who is this for must be 10-300 characters";
      if (!whyNow.trim() || whyNow.length < 10 || whyNow.length > 300) e.whyNow = "Why now must be 10-300 characters";
      if (!whatChanges.trim() || whatChanges.length < 10 || whatChanges.length > 300) e.whatChanges = "What will change must be 10-300 characters";
    }
    if (s === "beneficiaries-handover") {
      if (!beneficiaryGroup) e.beneficiaryGroup = "Beneficiary group is required";
      if (beneficiaryCount === "" || beneficiaryCount < 1) e.beneficiaryCount = "Enter how many people will benefit (at least 1)";
      if (!beneficiaryDescription.trim() || beneficiaryDescription.length > 120) e.beneficiaryDescription = "About the beneficiaries must be 1-120 characters";
      if (!neededBy) e.neededBy = "Date is required";
      else {
        const d = new Date(neededBy);
        const minDate = new Date(); minDate.setDate(minDate.getDate() + 2);
        const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 90);
        if (d < minDate || d > maxDate) e.neededBy = "Date must be 3-90 days from today";
      }
      if (!handoverMode) e.handoverMode = "Select a handover mode";
      if (availableDays.length === 0) e.availableDays = "Select at least one day";
      if (!availableFrom) e.availableFrom = "Select a start time";
      if (!availableTo) e.availableTo = "Select an end time";
      else if (availableFrom && availableTo <= availableFrom) e.availableTo = "End time must be after start time";
      if (!changemakerName.trim() || changemakerName.length > 100) e.changemakerName = "Name is required (up to 100 characters)";
      if (!changemakerRole.trim() || changemakerRole.length > 100) e.changemakerRole = "Role is required (up to 100 characters)";
      if (!changemakerPhotoUrl) e.changemakerPhoto = "Photo of the person leading this drive is required";
      if (!changemakerWhy.trim() || changemakerWhy.length < 30 || changemakerWhy.length > 300) e.changemakerWhy = "Why you do this work must be 30-300 characters (2 to 3 lines)";
      if (!contactName.trim()) e.contactName = "Contact name is required";
      if (!contactPhone.trim() || contactPhone.length < 10) e.contactPhone = "Valid phone is required";
      if (altContact.trim()) {
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(altContact.trim());
        const isPhone = /^\d{10}$/.test(altContact.trim());
        if (!isEmail && !isPhone) e.altContact = "Alternate contact must be a valid email or 10-digit phone";
      }
      if (pastWorkUrl.trim()) {
        if (!/^https?:\/\/.+/i.test(pastWorkUrl.trim())) e.pastWorkUrl = "Past work link must be a valid http or https URL";
      }
    }
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleNext() {
    if (step === "drive-location" && locationStepRef.current && !(await locationStepRef.current.flush())) return;
    if (!validateStep(step)) { toast.error("Please fix the highlighted fields"); return; }
    const i = ngoStepIndex(step);
    if (i < NGO_DRIVE_STEPS.length - 1) goToStep(NGO_DRIVE_STEPS[i + 1], 1);
  }

  function handleBack() {
    const i = ngoStepIndex(step);
    if (i > 0) goToStep(NGO_DRIVE_STEPS[i - 1], -1);
    else goToStep("drive-type", -1);
  }

  async function handleSaveExit() {
    await saveDraft();
    toast.success("Draft saved");
    router.push("/dashboard/ngo");
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const payload = {
        driveType: "ITEMS" as const,
        title: title.trim(),
        tagline: tagline.trim() || undefined,
        category,
        itemName: itemName.trim(),
        quantity: Number(quantity),
        unit,
        condition,
        mustBeWorking,
        requireClean,
        details: details.trim(),
        photos: photos.map((p, idx) => ({ url: p.url, storageKey: p.storageKey, sortOrder: idx })),
        referencePhotoUrl: photos[0]?.url || undefined,
        whoFor: whoFor.trim(),
        whyNow: whyNow.trim(),
        whatChanges: whatChanges.trim(),
        locationArea: driveLoc.locality.trim(),
        locationCity: driveLoc.city.trim(),
        locationCountry: driveLoc.countryIso,
        locationState: driveLoc.stateIso,
        locationPincode: driveLoc.pincode.trim(),
        locationLatitude: driveLoc.latitude,
        locationLongitude: driveLoc.longitude,
        pickupRadiusKm: radiusKm(radiusChoice, customRadius),
        urgency,
        beneficiaryGroup,
        beneficiaryCount: Number(beneficiaryCount),
        beneficiaryDescription: beneficiaryDescription.trim(),
        neededBy,
        availableDays,
        availableFrom,
        availableTo,
        handoverMode,
        changemakerName: changemakerName.trim(),
        changemakerRole: changemakerRole.trim(),
        changemakerPhotoUrl: changemakerPhotoUrl || undefined,
        changemakerPhotoKey: changemakerPhotoKey || undefined,
        changemakerWhy: changemakerWhy.trim(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        altContact: altContact.trim() || undefined,
        pastWorkUrl: pastWorkUrl.trim() || undefined,
        declarationsVersion: "v2",
        declarations: {
          accurate: declAccurate,
          usedOnlyForBeneficiaries: declUsedOnly,
          proofWithin48h: declProof,
          facesWithConsent: declFaces,
          notDuplicate: declNotDuplicate,
          falseInfoConsequences: declFalseInfo,
          contactConsent: declContact,
        },
      };

      if (IS_NGO_DEMO_MODE) {
        const newDrive = {
          id: Date.now(),
          ...payload,
          status: "PENDING_VERIFICATION",
          createdAt: new Date().toISOString(),
          userId: user?.id,
          itemsPledged: 0,
        };
        const existing = JSON.parse(localStorage.getItem(DEMO_DRIVES_KEY) || "[]");
        localStorage.setItem(DEMO_DRIVES_KEY, JSON.stringify([newDrive, ...existing]));
      } else if (editId !== null) {
        await updateNgoDrive(editId, payload);
      } else {
        await createNgoDrive(payload);
      }
      
      if (editId === null) localStorage.removeItem(DRAFT_KEY);
      setSubmitted(true);
    } catch (e) {
      const body = e instanceof ApiError ? (e.data as { fieldErrors?: { field?: string; message?: string }[] } | undefined) : undefined;
      const errors = (body?.fieldErrors ?? []).filter(f => f?.message);
      if (errors.length > 0) {
        const byField: Record<string, string> = {};
        errors.forEach(f => { if (f.field && f.field !== "drive") byField[f.field] = f.message!; });
        setFieldErrors(byField);
        toast.error(errors.map(f => f.message).join(" · "));
      } else {
        toast.error(e instanceof Error && e.message ? e.message : "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const allDeclarationsChecked = declAccurate && declUsedOnly && declProof && declFaces && declNotDuplicate && declFalseInfo && declContact;

  function toggleAllDeclarations(checked: boolean) {
    setDeclAccurate(checked);
    setDeclUsedOnly(checked);
    setDeclProof(checked);
    setDeclFaces(checked);
    setDeclNotDuplicate(checked);
    setDeclFalseInfo(checked);
    setDeclContact(checked);
  }

  if (authLoading || !user) return <FormSkeleton />;
  if (editLoadError) {
    return (
      <div role="alert" className="min-h-screen bg-ngo-50 dark:bg-zinc-950 flex flex-col items-center pt-24 px-4 text-center">
        <h1 className="text-xl font-bold text-stone-900 dark:text-white mb-2">This drive can&apos;t be edited</h1>
        <p className="text-stone-500 mb-6">{editLoadError}</p>
        <Link href="/dashboard/ngo" className="px-6 py-2.5 rounded-full bg-ngo-700 text-white font-bold hover:bg-ngo-600">Go to dashboard</Link>
      </div>
    );
  }
  if (!settled) {
    if (statusError && !statusLoading) {
      return (
        <div role="alert" className="min-h-screen bg-ngo-50 dark:bg-zinc-950 flex flex-col items-center pt-24 px-4 text-center">
          <h1 className="text-xl font-bold text-stone-900 dark:text-white mb-2">We couldn&apos;t check your NGO status</h1>
          <p className="text-stone-500 mb-6">{statusError}</p>
          <button type="button" onClick={() => void refreshStatus()} className="px-6 py-2.5 rounded-full bg-ngo-700 text-white font-bold hover:bg-ngo-600">
            Try again
          </button>
        </div>
      );
    }
    return <FormSkeleton />;
  }

  if (settled.isVerified && !settled.canStartDrive && editId === null && !submitted) {
    return (
      <div className="min-h-screen bg-ngo-50 dark:bg-zinc-950 flex flex-col items-center pt-24 px-4 text-center">
        <div className="w-12 h-12 text-stone-300 dark:text-zinc-700 mb-4"><ShieldCheck className="w-full h-full" /></div>
        <h1 className="text-xl font-bold text-stone-900 dark:text-white mb-2">One drive at a time</h1>
        <p className="text-stone-500 mb-6 max-w-md">{driveLockReason}</p>
        <Link href="/dashboard/ngo" className="px-6 py-2.5 rounded-full bg-ngo-700 text-white font-bold hover:bg-ngo-600">
          Go to dashboard
        </Link>
      </div>
    );
  }

  if (settled.isVerified && settled.isPhotosDue && editId === null) {
    return (
      <div className="min-h-screen bg-ngo-50 dark:bg-zinc-950 flex flex-col items-center pt-24 px-4 text-center">
        <div className="w-12 h-12 text-stone-300 dark:text-zinc-700 mb-4"><ShieldCheck className="w-full h-full" /></div>
        <h1 className="text-xl font-bold text-stone-900 dark:text-white mb-2">Handover photos due</h1>
        <p className="text-stone-500 mb-6">Upload the handover photos for {photosDueRequestName || "your recent handover"} before starting another drive.</p>
        <Link href="/ngo/handovers" className="px-6 py-2.5 rounded-full bg-ngo-700 text-white font-bold hover:bg-ngo-600">
          Go to Handovers &amp; Photos
        </Link>
        <Link href="/dashboard/ngo" className="mt-3 text-sm font-bold text-ngo-700 hover:underline">
          Go to dashboard
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#faf8f5] dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-ngo-100 dark:bg-ngo-900/30 text-ngo-700 dark:text-ngo-300 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">Drive submitted!</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mb-6 leading-relaxed">
            Our team is reviewing your drive to ensure all details and safeguards are met. It usually goes live within 2 to 4 hours.
          </p>
          <div className="space-y-3">
            <Link href="/dashboard/ngo" className="block w-full py-3 px-4 rounded-xl bg-ngo-700 hover:bg-ngo-800 text-white font-bold text-sm transition-colors">
              Go to NGO Dashboard
            </Link>
            <button type="button" onClick={() => { setSubmitted(false); setStep("drive-details"); }} className="block w-full py-3 px-4 rounded-xl border border-stone-200 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-700 dark:text-stone-300 font-semibold text-sm transition-colors">
              Start another drive
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "drive-type") {
    return (
      <div className="min-h-screen bg-[#faf8f5] dark:bg-zinc-950 flex flex-col justify-center items-center p-4">
        <div className="max-w-xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-stone-900 dark:text-stone-100 mb-2" style={{ fontFamily: "serif" }}>What kind of drive?</h1>
            <p className="text-stone-500 text-sm">Choose the category of drive you want to organize.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <button onClick={() => goToStep("drive-location", 1)} className="text-left bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 hover:border-ngo-600 dark:hover:border-ngo-500 rounded-2xl p-6 transition-all hover:shadow-md group">
              <div className="w-10 h-10 rounded-xl bg-ngo-50 dark:bg-ngo-900/30 text-ngo-700 dark:text-ngo-300 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">Item drive</h2>
              <p className="text-stone-500 text-sm leading-relaxed">Collect tangible items like blankets, books, food, clothes, or stationery.</p>
              <div className="mt-4 flex items-center text-xs font-bold text-ngo-700 dark:text-ngo-400">
                Start an item drive <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </button>
            <button disabled aria-disabled className="text-left bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-2xl p-6 opacity-60 relative">
              <div className="absolute top-4 right-4 bg-stone-200 dark:bg-zinc-800 text-stone-600 dark:text-stone-400 text-2xs font-black uppercase tracking-wider px-2 py-1 rounded-md">Coming soon</div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">Money drive</h2>
              <p className="text-stone-500 text-sm leading-relaxed">Raise funds for what you need.</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const availability = NGO_DRIVE_STEPS.reduce((acc, s) => {
    const i = ngoStepIndex(s);
    const current = ngoStepIndex(step as NgoDriveStep);
    acc[s] = { complete: i < current, canNavigate: i < current };
    return acc;
  }, {} as Record<NgoDriveStep, { complete: boolean; canNavigate: boolean }>);

  function focusField(field: string) {
    const el = document.querySelector<HTMLElement>(`[name="${field}"], [data-field="${field}"]`);
    if (!el) return;
    el.focus();
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  }

  const today = new Date();
  const minDateStr = new Date(today.getTime() + 2 * 86400000).toISOString().split("T")[0];
  const maxDateStr = new Date(today.getTime() + 90 * 86400000).toISOString().split("T")[0];

  const showWorkingOrderOption = WORKING_ORDER_CATEGORIES.includes(category as any);
  const showRequireCleanOption = REQUIRE_CLEAN_CATEGORIES.includes(category as any);

  const step1 = (
    <div className="grid items-start gap-5 md:grid-cols-2">
      {/* Left Column */}
      <div className="min-w-0 space-y-5">
        {/* 1. Drive Parameters */}
        <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900 space-y-4" aria-labelledby="params-heading">
          <h3 id="params-heading" className="text-[11px] font-bold uppercase tracking-wide text-ngo-700 dark:text-ngo-300">1. Drive Parameters</h3>
          
          <WizardField label="Drive title" required error={fieldErrors.title} hint={`${title.length}/80`}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="title" maxLength={80} placeholder="e.g. Winter blankets for Kandivali Elder Shelter" value={title} onChange={e => setTitle(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border ${invalid ? "border-red-500" : ""}`} />
            )}
          </WizardField>

          <WizardField label="Short tagline" error={fieldErrors.tagline} hint={`${tagline.length}/100`}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="tagline" maxLength={100} placeholder="e.g. 50 students are sitting in class without a pen" value={tagline} onChange={e => setTagline(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border ${invalid ? "border-red-500" : ""}`} />
            )}
          </WizardField>
          
          <WizardField label="Category" required error={fieldErrors.category}>
            {({ id, describedBy, invalid }) => (
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id={id} data-field="category" aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border h-11 ${invalid ? "border-red-500" : ""}`}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </WizardField>
  
          <WizardField label="Item name" required error={fieldErrors.itemName}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="itemName" maxLength={60} placeholder="e.g. Blankets" value={itemName} onChange={e => setItemName(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border ${invalid ? "border-red-500" : ""}`} />
            )}
          </WizardField>
  
          <div className="grid grid-cols-2 gap-4">
            <WizardField label="Quantity" required error={fieldErrors.quantity}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} name="quantity" type="number" min={2} max={10000} placeholder="e.g. 40" value={quantity} onChange={e => setQuantity(e.target.value ? Number(e.target.value) : "")} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border h-11 ${invalid ? "border-red-500" : ""}`} />
              )}
            </WizardField>
            <WizardField label="Unit" required error={fieldErrors.unit}>
              {({ id, describedBy, invalid }) => (
                <Select value={unit} onValueChange={setUnit as any}>
                  <SelectTrigger id={id} data-field="unit" aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border h-11 ${invalid ? "border-red-500" : ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </WizardField>
          </div>

          {/* Photos (1 to 5 images) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-200 block">
              Photos<span className="text-red-500">*</span> <span className="text-stone-400 font-normal">({photos.length}/5)</span>
            </label>
            <p className="text-xs text-stone-500">Show the need, not identifiable faces of children without consent.</p>
            {fieldErrors.photos && <p className="text-xs text-red-500">{fieldErrors.photos}</p>}
            
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {photos.map((photo, idx) => (
                <div key={photo.url + idx} className="relative w-20 h-20 rounded-lg border border-slate-200 dark:border-zinc-700 overflow-hidden shrink-0 group">
                  <img src={photo.url} alt={`Drive photo ${idx + 1}`} className="w-full h-full object-cover" />
                  {idx === 0 ? (
                    <span className="absolute top-1 left-1 bg-ngo-700 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shadow">
                      Cover
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleMakeCover(idx)}
                      className="absolute bottom-1 left-1 right-1 bg-black/75 hover:bg-black text-white text-[9px] font-bold py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity text-center"
                    >
                      Make cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    aria-label={`Remove photo ${idx + 1}`}
                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {photos.length < 5 && (
                <button
                  type="button"
                  onClick={() => document.getElementById("photos-upload")?.click()}
                  disabled={photoUploading}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-ngo-600 dark:hover:border-ngo-400 flex flex-col items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
                >
                  <UploadCloud className="w-5 h-5 mb-1" />
                  {photoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add photo"}
                </button>
              )}
              <input
                id="photos-upload"
                type="file"
                multiple
                accept="image/jpeg, image/png, image/webp"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <p className="text-2xs text-stone-400">1 to 5 images. Max 5 MB each. JPG, PNG, WEBP.</p>
          </div>
        </section>

        {/* 4. Drive Story */}
        <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900 space-y-4" aria-labelledby="story-heading">
          <h3 id="story-heading" className="text-[11px] font-bold uppercase tracking-wide text-ngo-700 dark:text-ngo-300">4. Drive Story</h3>
          
          <WizardField label="Details" required error={fieldErrors.details} hint={`Include sizes, condition, colours, brands or anything else donors should know. ${details.length}/${DETAILS_MAX}`}>
            {({ id, describedBy, invalid }) => (
              <Textarea id={id} name="details" rows={3} maxLength={DETAILS_MAX} value={details} onChange={e => setDetails(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border ${invalid ? "border-red-500" : ""}`} />
            )}
          </WizardField>

          {legacyDescription && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <p className="font-semibold mb-1">Previous description (rewrite into the three sections below):</p>
              <p className="whitespace-pre-wrap">{legacyDescription}</p>
            </div>
          )}

          <WizardField label="Who is this for?" required error={fieldErrors.whoFor} hint={`Who will receive these items and what is their current situation? ${whoFor.length}/300`}>
            {({ id, describedBy, invalid }) => (
              <Textarea id={id} name="whoFor" rows={3} maxLength={300} placeholder="e.g. 50 children residing in our rural learning center..." value={whoFor} onChange={e => setWhoFor(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border ${invalid ? "border-red-500" : ""}`} />
            )}
          </WizardField>

          <WizardField label="Why now?" required error={fieldErrors.whyNow} hint={`What makes this need urgent or timely right now? ${whyNow.length}/300`}>
            {({ id, describedBy, invalid }) => (
              <Textarea id={id} name="whyNow" rows={3} maxLength={300} placeholder="e.g. The monsoon season has started and leaky roofs damaged the previous stock..." value={whyNow} onChange={e => setWhyNow(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border ${invalid ? "border-red-500" : ""}`} />
            )}
          </WizardField>

          <WizardField label="What will change after donors give?" required error={fieldErrors.whatChanges} hint={`How will these items directly improve their lives? ${whatChanges.length}/300`}>
            {({ id, describedBy, invalid }) => (
              <Textarea id={id} name="whatChanges" rows={3} maxLength={300} placeholder="e.g. Students will attend school daily without falling sick..." value={whatChanges} onChange={e => setWhatChanges(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border ${invalid ? "border-red-500" : ""}`} />
            )}
          </WizardField>
        </section>

        {/* 5. Drive Location */}
        <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900 space-y-4" aria-labelledby="location-heading">
          <h3 id="location-heading" className="text-[11px] font-bold uppercase tracking-wide text-ngo-700 dark:text-ngo-300">5. Drive address for donors</h3>
          
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/40 text-xs">
            <span className="font-semibold text-stone-700 dark:text-stone-300 block mb-0.5">Registered office address</span>
            <p className="text-stone-600 dark:text-stone-400">{registeredOfficeAddress || "Registered address on file"}</p>
            <p className="text-2xs text-stone-500 mt-1.5">Your registered address will be shown to donors on the drive page so they can visit you.</p>
          </div>
        </section>
      </div>
  
      {/* Right Column */}
      <div className="min-w-0 space-y-5">
        {/* 2. Urgency Classification */}
        <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900 space-y-4" aria-labelledby="urgency-heading">
          <h3 id="urgency-heading" className="text-[11px] font-bold uppercase tracking-wide text-ngo-700 dark:text-ngo-300">2. Urgency Classification</h3>
          <fieldset className="space-y-1">
            <legend className="text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">Urgency Level</legend>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {URGENCIES.map(u => (
                <button key={u.value} type="button" onClick={() => setUrgency(u.value as any)}
                  aria-pressed={urgency === u.value}
                  className={`min-h-10 flex-1 rounded-md px-2 py-2 text-xs font-semibold transition-colors ${urgency === u.value ? "bg-white text-ngo-900 shadow-sm dark:bg-slate-700 dark:text-ngo-200" : "text-slate-500 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-700"}`}>
                  {u.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-500 mt-2">Use High or Critical only when the need is time-sensitive.</p>
          </fieldset>
        </section>
  
        {/* 3. Item Requirements */}
        <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900 space-y-4" aria-labelledby="item-req-heading">
          <h3 id="item-req-heading" className="text-[11px] font-bold uppercase tracking-wide text-ngo-700 dark:text-ngo-300">3. Item Requirements</h3>
          
          <WizardField label="Condition accepted" required error={fieldErrors.condition} hint={wizardConditionHelper(condition) ?? undefined}>
            {({ id, describedBy, invalid }) => (
              <Select value={condition} onValueChange={setCondition as any}>
                <SelectTrigger id={id} data-field="condition" aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border h-11 ${invalid ? "border-red-500" : ""}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WIZARD_DRIVE_CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </WizardField>

          {showWorkingOrderOption && (
            <label className="flex items-center gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={mustBeWorking}
                onChange={e => setMustBeWorking(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-ngo-600 focus:ring-ngo-500"
              />
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Items must be in working order
              </span>
            </label>
          )}

          {showRequireCleanOption && (
            <label className="flex items-center gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={requireClean}
                onChange={e => setRequireClean(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-ngo-600 focus:ring-ngo-500"
              />
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Items must be washed and clean
              </span>
            </label>
          )}
        </section>
      </div>
    </div>
  );

  const step2 = (
    <div className="grid items-start gap-5 md:grid-cols-2">
      {/* Left Column */}
      <div className="min-w-0 space-y-5">
        {/* 1. Who Benefits */}
        <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900 space-y-4" aria-labelledby="who-heading">
          <h3 id="who-heading" className="text-[11px] font-bold uppercase tracking-wide text-ngo-700 dark:text-ngo-300">1. Who Benefits</h3>
          
          <WizardField label="Group" required error={fieldErrors.beneficiaryGroup}>
            {({ id, describedBy, invalid }) => (
              <Select value={beneficiaryGroup} onValueChange={setBeneficiaryGroup}>
                <SelectTrigger id={id} data-field="beneficiaryGroup" aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border h-11 ${invalid ? "border-red-500" : ""}`}>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {BENEFICIARY_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </WizardField>
  
          <WizardField label="How many people will benefit?" required error={fieldErrors.beneficiaryCount} hint="People or families helped, not the number of items.">
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="beneficiaryCount" type="number" min={1} value={beneficiaryCount} onChange={e => setBeneficiaryCount(e.target.value ? Number(e.target.value) : "")} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border h-11 ${invalid ? "border-red-500" : ""}`} />
            )}
          </WizardField>

          <WizardField label="About the beneficiaries" required error={fieldErrors.beneficiaryDescription} hint={`${beneficiaryDescription.length}/120`}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="beneficiaryDescription" maxLength={120} placeholder="e.g. Class 5 students at a municipal school" value={beneficiaryDescription} onChange={e => setBeneficiaryDescription(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border h-11 ${invalid ? "border-red-500" : ""}`} />
            )}
          </WizardField>
        </section>
  
        {/* 2. Timeline */}
        <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900 space-y-4" aria-labelledby="timeline-heading">
          <h3 id="timeline-heading" className="text-[11px] font-bold uppercase tracking-wide text-ngo-700 dark:text-ngo-300">2. Timeline</h3>
          <WizardField label="Needed by" required error={fieldErrors.neededBy}>
            {({ id, describedBy, invalid }) => (
              <div>
                <Input id={id} name="neededBy" type="date" min={minDateStr} max={maxDateStr} value={neededBy} onChange={e => setNeededBy(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border h-11 ${invalid ? "border-red-500" : ""}`} />
                {neededBy && (
                  <p className="text-xs text-stone-500 mt-1">Needed by: {formatDateDDMMYYYY(neededBy)}</p>
                )}
              </div>
            )}
          </WizardField>
        </section>

        {/* 4. Who is behind the drive */}
        <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900 space-y-4" aria-labelledby="changemaker-heading">
          <h3 id="changemaker-heading" className="text-[11px] font-bold uppercase tracking-wide text-ngo-700 dark:text-ngo-300">4. Who is Behind the Drive</h3>

          <div className="grid grid-cols-2 gap-4">
            <WizardField label="Name" required error={fieldErrors.changemakerName} hint={`${changemakerName.length}/100`}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} name="changemakerName" maxLength={100} placeholder="e.g. Priya Nair" value={changemakerName} onChange={e => setChangemakerName(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border h-11 ${invalid ? "border-red-500" : ""}`} />
              )}
            </WizardField>
            <WizardField label="Role" required error={fieldErrors.changemakerRole} hint={`${changemakerRole.length}/100`}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} name="changemakerRole" maxLength={100} placeholder="e.g. Program Coordinator" value={changemakerRole} onChange={e => setChangemakerRole(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border h-11 ${invalid ? "border-red-500" : ""}`} />
              )}
            </WizardField>
          </div>

          <div>
            <label className="text-xs font-bold text-stone-700 dark:text-stone-200 block mb-1">
              Photo<span className="text-red-500">*</span>
            </label>
            {fieldErrors.changemakerPhoto && <p className="text-xs text-red-500 mb-1">{fieldErrors.changemakerPhoto}</p>}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => document.getElementById("changemaker-photo-upload")?.click()}
                disabled={changemakerUploading}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-zinc-700 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <UploadCloud className="w-4 h-4" />
                {changemakerUploading ? "Uploading…" : "Upload Photo"}
              </button>
              <input
                id="changemaker-photo-upload"
                type="file"
                accept="image/jpeg, image/png, image/webp"
                className="hidden"
                onChange={handleChangemakerPhotoUpload}
              />
              {changemakerPhotoUrl && (
                <div className="relative w-12 h-12 rounded-lg border border-slate-200 dark:border-zinc-700 overflow-hidden shrink-0">
                  <img src={changemakerPhotoUrl} alt="Changemaker" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setChangemakerPhotoUrl(""); setChangemakerPhotoKey(""); }}
                    className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-2xs text-stone-500 mt-1.5">Max 5 MB. JPG, PNG, WEBP.</p>
          </div>

          <WizardField label="Why you do this work" required error={fieldErrors.changemakerWhy} hint={`2 to 3 lines (${changemakerWhy.length}/300)`}>
            {({ id, describedBy, invalid }) => (
              <Textarea id={id} name="changemakerWhy" rows={3} maxLength={300} placeholder="e.g. Having grown up in this community, ensuring every child has school supplies has been my personal calling for 6 years." value={changemakerWhy} onChange={e => setChangemakerWhy(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border ${invalid ? "border-red-500" : ""}`} />
            )}
          </WizardField>
        </section>
      </div>
  
      {/* Right Column */}
      <div className="min-w-0 space-y-5">
        {/* 3. Handover Availability */}
        <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900 space-y-4" aria-labelledby="handover-heading">
          <h3 id="handover-heading" className="text-[11px] font-bold uppercase tracking-wide text-ngo-700 dark:text-ngo-300">3. Handover Availability</h3>
          <div className="p-3 bg-ngo-50 dark:bg-ngo-900/20 border border-ngo-100 dark:border-ngo-800 rounded-lg text-xs text-ngo-800 dark:text-ngo-200 leading-relaxed mb-4">
            Your address is shown on the drive page. Your phone number is shared only after a donor pledges.
          </div>

          <fieldset className="space-y-1">
            <legend className="text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">Handover mode*</legend>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {HANDOVER_MODES.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setHandoverMode(m.value)}
                  aria-pressed={handoverMode === m.value}
                  className={`min-h-10 flex-1 rounded-md px-2 py-2 text-xs font-semibold transition-colors ${handoverMode === m.value ? "bg-white text-ngo-900 shadow-sm dark:bg-slate-700 dark:text-ngo-200" : "text-slate-500 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-700"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {fieldErrors.handoverMode && <p className="text-xs text-red-500 mt-1">{fieldErrors.handoverMode}</p>}
          </fieldset>
          
          <WizardField label="Available days" required error={fieldErrors.availableDays} hint="Days you can receive items or do pickups.">
            {({ id, describedBy }) => (
              <div id={id} data-field="availableDays" aria-describedby={describedBy} className="flex flex-wrap gap-2">
                {(() => {
                  const allSelected = DROP_OFF_DAYS.every(d => availableDays.includes(d.id));
                  return (
                    <button type="button" aria-pressed={allSelected}
                      onClick={() => setAvailableDays(allSelected ? [] : DROP_OFF_DAYS.map(d => d.id))}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${allSelected ? 'bg-ngo-700 border-ngo-700 text-white' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
                      All
                    </button>
                  );
                })()}
                {DROP_OFF_DAYS.map(day => {
                  const active = availableDays.includes(day.id);
                  return (
                    <button key={day.id} type="button" onClick={() => setAvailableDays(prev => active ? prev.filter(d => d !== day.id) : [...prev, day.id])} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${active ? 'bg-ngo-700 border-ngo-700 text-white' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
                      {day.label}
                    </button>
                  );
                })}
              </div>
            )}
          </WizardField>
          
          <div className="grid grid-cols-2 gap-4">
            <WizardField label="From (time)" required error={fieldErrors.availableFrom}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} name="availableFrom" type="time" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border h-11 ${invalid ? "border-red-500" : ""}`} />
              )}
            </WizardField>
            <WizardField label="To (time)" required error={fieldErrors.availableTo}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} name="availableTo" type="time" value={availableTo} onChange={e => setAvailableTo(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border h-11 ${invalid ? "border-red-500" : ""}`} />
              )}
            </WizardField>
          </div>
        </section>
  
        {/* 5. Contact Person */}
        <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900 space-y-4" aria-labelledby="contact-heading">
          <h3 id="contact-heading" className="text-[11px] font-bold uppercase tracking-wide text-ngo-700 dark:text-ngo-300">5. Contact Person</h3>
          
          <WizardField label="Contact name" required error={fieldErrors.contactName}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="contactName" placeholder="e.g. Rahul Sharma" value={contactName} onChange={e => setContactName(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border h-11 ${invalid ? "border-red-500" : ""}`} />
            )}
          </WizardField>
          
          <WizardField label="Contact phone" required error={fieldErrors.contactPhone}>
            {({ id, describedBy, invalid }) => (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-medium text-sm">+91</span>
                <Input id={id} name="contactPhone" type="tel" maxLength={10} placeholder="Mobile number" value={contactPhone} onChange={e => setContactPhone(e.target.value.replace(/\D/g, ""))} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border pl-11 h-11 ${invalid ? "border-red-500" : ""}`} />
              </div>
            )}
          </WizardField>

          <WizardField label="Alternate contact (phone or email)" error={fieldErrors.altContact} hint="Optional: phone or email">
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="altContact" placeholder="e.g. alternate@ngo.org or 9876543210" value={altContact} onChange={e => setAltContact(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border h-11 ${invalid ? "border-red-500" : ""}`} />
            )}
          </WizardField>

          <WizardField label="Past work link" error={fieldErrors.pastWorkUrl} hint="Optional: Website, Instagram page or earlier drive photos">
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="pastWorkUrl" type="url" placeholder="https://instagram.com/our_ngo or https://ourngo.org" value={pastWorkUrl} onChange={e => setPastWorkUrl(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border h-11 ${invalid ? "border-red-500" : ""}`} />
            )}
          </WizardField>
        </section>
      </div>
    </div>
  );

  const DECLARATIONS = [
    { id: "declAccurate", checked: declAccurate, setter: setDeclAccurate, text: "The information in this drive is true and accurate to the best of our knowledge." },
    { id: "declUsedOnly", checked: declUsedOnly, setter: setDeclUsedOnly, text: "Donated items will be used only for the beneficiaries described here, and will never be sold, rented, or exchanged for money." },
    { id: "declProof", checked: declProof, setter: setDeclProof, text: "We will upload handover photos within 48 hours of distributing the items, and understand we can't start a new drive until this one is completed and its photos are approved." },
    { id: "declFaces", checked: declFaces, setter: setDeclFaces, text: "People's faces, including the person leading this drive, will appear in photos only with their consent (a guardian's consent for children)." },
    { id: "declNotDuplicate", checked: declNotDuplicate, setter: setDeclNotDuplicate, text: "This drive is not a duplicate of another active drive on CauseKind." },
    { id: "declFalseInfo", checked: declFalseInfo, setter: setDeclFalseInfo, text: "We understand that false information may lead to this drive being removed and our NGO's verification being suspended." },
    { id: "declContact", checked: declContact, setter: setDeclContact, text: "We consent to CauseKind contacting the listed contact person to verify this drive." },
  ];

  const step3 = (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="mb-4 text-sm font-bold text-stone-800 dark:text-stone-100">Drive summary</h3>
        
        {/* Photos thumbnails strip */}
        {photos.length > 0 && (
          <div className="mb-4 pb-4 border-b border-stone-100 dark:border-slate-800">
            <span className="text-xs text-stone-500 block mb-2">Photos ({photos.length})</span>
            <div className="flex gap-2 flex-wrap">
              {photos.map((p, idx) => (
                <div key={p.url + idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700">
                  <img src={p.url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute bottom-0 inset-x-0 bg-ngo-700 text-white text-[8px] font-bold text-center py-0.5">
                      Cover
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3 text-sm">
          <div className="flex justify-between pb-2 border-b border-stone-100 dark:border-slate-800">
            <span className="text-stone-500">Title & Item</span>
            <span className="font-medium text-right max-w-[200px] sm:max-w-md truncate text-stone-900 dark:text-stone-100">
              {title}
              {tagline && <span className="block text-xs font-normal text-stone-500 italic mt-0.5">{tagline}</span>}
              <span className="text-stone-400 text-xs block">{quantity} {UNITS.find(u => u.id === unit)?.label}</span>
            </span>
          </div>

          <div className="flex justify-between pb-2 border-b border-stone-100 dark:border-slate-800">
            <span className="text-stone-500">Condition accepted</span>
            <span className="font-medium text-right max-w-[200px] sm:max-w-md text-stone-900 dark:text-stone-100">
              {driveConditionLabel(condition)}
              {mustBeWorking && <span className="block text-2xs text-amber-600 dark:text-amber-400">Must be in working order</span>}
              {requireClean && <span className="block text-2xs text-sky-600 dark:text-sky-400">Items must be washed and clean</span>}
            </span>
          </div>

          <div className="flex justify-between pb-2 border-b border-stone-100 dark:border-slate-800">
            <span className="text-stone-500">Drive location</span>
            <span className="font-medium text-right max-w-[200px] sm:max-w-md text-stone-900 dark:text-stone-100">
              {locationArea}, {locationCity}
            </span>
          </div>

          <div className="pb-2 border-b border-stone-100 dark:border-slate-800 space-y-1.5">
            <span className="text-stone-500 block">Drive story</span>
            <div className="text-xs space-y-1 pl-2 border-l-2 border-ngo-600/40 text-stone-700 dark:text-stone-300">
              <p><strong className="text-stone-900 dark:text-stone-100">Who for:</strong> {whoFor}</p>
              <p><strong className="text-stone-900 dark:text-stone-100">Why now:</strong> {whyNow}</p>
              <p><strong className="text-stone-900 dark:text-stone-100">What changes:</strong> {whatChanges}</p>
            </div>
          </div>

          <div className="flex justify-between pb-2 border-b border-stone-100 dark:border-slate-800">
            <span className="text-stone-500">People who will benefit</span>
            <span className="font-medium text-right max-w-[240px] text-stone-900 dark:text-stone-100">
              {beneficiaryCount} {beneficiaryGroup}
              {beneficiaryDescription && <span className="block text-xs font-normal text-stone-500">{beneficiaryDescription}</span>}
            </span>
          </div>

          <div className="flex justify-between pb-2 border-b border-stone-100 dark:border-slate-800">
            <span className="text-stone-500">Needed by</span>
            <span className="font-medium text-stone-900 dark:text-stone-100">{formatDateDDMMYYYY(neededBy)}</span>
          </div>

          <div className="flex justify-between pb-2 border-b border-stone-100 dark:border-slate-800">
            <span className="text-stone-500">Handover mode</span>
            <span className="font-medium text-right text-stone-900 dark:text-stone-100">
              {HANDOVER_MODES.find(m => m.value === handoverMode)?.label || handoverMode}
            </span>
          </div>

          <div className="pb-2 border-b border-stone-100 dark:border-slate-800">
            <span className="text-stone-500 block mb-1">Who is behind the drive</span>
            <div className="flex items-center gap-3">
              {changemakerPhotoUrl && (
                <img src={changemakerPhotoUrl} alt={changemakerName} className="w-10 h-10 rounded-full object-cover border border-stone-200" />
              )}
              <div>
                <p className="font-semibold text-stone-900 dark:text-stone-100">{changemakerName} <span className="text-xs font-normal text-stone-500">({changemakerRole})</span></p>
                <p className="text-xs text-stone-600 dark:text-stone-400 italic">&ldquo;{changemakerWhy}&rdquo;</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between pb-2 border-b border-stone-100 dark:border-slate-800">
            <span className="text-stone-500">Contact</span>
            <span className="font-medium text-right text-stone-900 dark:text-stone-100">
              {contactName}<br />
              <span className="text-stone-400 text-xs">{contactPhone}</span>
              {altContact && <span className="block text-stone-400 text-xs">Alt: {altContact}</span>}
            </span>
          </div>
        </div>

        <div className="mt-4 flex gap-4">
          <button onClick={() => goToStep("drive-details", -1)} className="text-xs font-bold text-ngo-600 dark:text-ngo-400 hover:underline">Edit Details</button>
          <button onClick={() => goToStep("beneficiaries-handover", -1)} className="text-xs font-bold text-ngo-600 dark:text-ngo-400 hover:underline">Edit Handover</button>
        </div>
      </section>
  
      <section className="space-y-4">
        <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100">Final confirmation</h3>

        {/* Master Tick All Checkbox */}
        <label className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${allDeclarationsChecked ? 'border-ngo-500 bg-ngo-50 dark:bg-ngo-900/20' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'}`}>
          <div className={`mt-0.5 flex w-5 h-5 shrink-0 items-center justify-center rounded-full border ${allDeclarationsChecked ? 'border-ngo-600 bg-ngo-600' : 'border-stone-300 bg-white dark:border-slate-600 dark:bg-slate-800'}`}>
            {allDeclarationsChecked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
          </div>
          <span className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-relaxed">Tick all declarations</span>
          <input type="checkbox" className="sr-only" checked={allDeclarationsChecked} onChange={e => toggleAllDeclarations(e.target.checked)} />
        </label>

        {DECLARATIONS.map(d => (
          <label key={d.id} className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${d.checked ? 'border-ngo-500 bg-ngo-50 dark:bg-ngo-900/20' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'}`}>
            <div className={`mt-0.5 flex w-5 h-5 shrink-0 items-center justify-center rounded-full border ${d.checked ? 'border-ngo-600 bg-ngo-600' : 'border-stone-300 bg-white dark:border-slate-600 dark:bg-slate-800'}`}>
              {d.checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </div>
            <span className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{d.text}</span>
            <input type="checkbox" className="sr-only" checked={d.checked} onChange={() => d.setter(!d.checked)} />
          </label>
        ))}
        <div className="text-center pt-2">
           {!allDeclarationsChecked && <p className="text-xs text-stone-500">Tick all declarations to submit.</p>}
        </div>
      </section>
    </div>
  );

  const previewDrive: PublicNgoDrive = {
    id: editId ?? 0,
    title: title || "Untitled Drive",
    tagline: tagline || null,
    category: category || "Other",
    itemName: itemName || "Items",
    quantityNeeded: typeof quantity === "number" ? quantity : 0,
    unit: unit || "PIECES",
    condition: condition,
    conditionRule: driveConditionRule(condition),
    details: details || "",
    referencePhotoUrl: photos[0]?.url || null,
    photoUrls: photos.map((p) => p.url).filter(Boolean),
    description: [whoFor, whyNow, whatChanges].filter(Boolean).join("\n\n") || legacyDescription || "",
    whoFor: whoFor || null,
    whyNow: whyNow || null,
    whatChanges: whatChanges || null,
    mustBeWorking: mustBeWorking,
    requireClean: requireClean,
    locationArea: locationArea || null,
    locationCity: locationCity || null,
    urgency: urgency,
    beneficiaryGroup: beneficiaryGroup || "",
    beneficiaryCount: typeof beneficiaryCount === "number" ? beneficiaryCount : 0,
    beneficiaryDescription: beneficiaryDescription || null,
    neededBy: neededBy || new Date().toISOString().split("T")[0],
    availableDays: availableDays,
    availableFrom: availableFrom || "",
    availableTo: availableTo || "",
    handoverMode: handoverMode,
    changemakerName: changemakerName || null,
    changemakerRole: changemakerRole || null,
    changemakerPhotoUrl: changemakerPhotoUrl || null,
    changemakerWhy: changemakerWhy || null,
    pastWorkUrl: pastWorkUrl || null,
    quantityPledged: 0,
    quantityReceived: 0,
    stillNeeded: typeof quantity === "number" ? quantity : 0,
    status: "LIVE",
    ngoOrganizationName: ngoApp?.organizationName || "Verified NGO",
    ngoCity: ngoApp?.city || locationCity || "",
    verified: Boolean(isVerified || settled?.isVerified),
    ngo: {
      organizationName: ngoApp?.organizationName || "Verified NGO",
      city: ngoApp?.city || locationCity || null,
      legalStructure: ngoApp?.legalStructure || null,
      registrationNumber: ngoApp?.registrationNumber || null,
      yearOfEstablishment: ngoApp?.yearOfEstablishment || null,
      registeredOfficeAddress: registeredOfficeAddress || ngoApp?.registeredOfficeAddress || null,
      verifiedAt: ngoApp?.verifiedAt || null,
      website: ngoApp?.website || null,
      trackRecord: null,
    },
    driveType: "ITEMS",
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#faf8f5] dark:bg-zinc-950" style={{ "--ck-role-accent": "var(--color-ngo-600)", "--ck-role-hover": "var(--color-ngo-700)", "--ck-role-secondary": "var(--color-ngo-300)", "--ck-role-highlight": "white" } as React.CSSProperties}>
      
      {/* ── LEFT SIDEBAR ── */}
      <aside className="hidden lg:flex lg:w-[280px] xl:w-[300px] shrink-0 flex-col relative overflow-hidden bg-ngo-950"
             style={{ background: "linear-gradient(160deg, #022c22 0%, #064e3b 50%, #022c22 100%)" }}>
        
        <div className="absolute top-16 left-8 w-56 h-56 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.22) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div className="absolute bottom-24 right-4 w-48 h-48 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(52,211,153,0.30) 0%, transparent 70%)", filter: "blur(36px)" }} />

        <div className="relative z-10 flex flex-col h-full p-5 sm:p-8 xl:p-10">
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 text-3xs font-black uppercase tracking-widest text-[var(--ck-role-highlight)] bg-[var(--ck-role-accent)]/25 border border-[var(--ck-role-accent)]/40 rounded-full px-3.5 py-1.5">
              <ShieldCheck className="w-3 h-3" /> VERIFIED NGO
            </span>
          </div>
          <div className="mb-10">
            <h1 className="text-white text-2xl sm:text-4xl xl:text-5xl font-black leading-none tracking-tight mb-3" style={{ fontFamily: "serif" }}>
              Start a<br />
              <span style={{ color: "var(--ck-color-ngo-300)" }}>Drive</span>
            </h1>
            <p className="text-ngo-100/70 text-sm leading-relaxed">
              Tell givers exactly what you need. Donors near you pledge the items, and every handover ends with proof.
            </p>
          </div>

          <div className="mb-10">
            <WizardProgressRail
              current={step as NgoDriveStep}
              steps={NGO_DRIVE_STEPS}
              labels={STEP_LABELS}
              availability={availability}
              onJump={s => goToStep(s as NgoDriveStep, -1)}
              navLabel="Drive progress"
            />
          </div>

          <div className="space-y-2.5 mt-auto">
            <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-white/10 bg-white/5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-ngo-500/30 bg-ngo-500/20">
                <Shield className="w-4 h-4 text-[var(--ck-role-secondary)]" />
              </div>
              <div>
                <p className="text-white text-xs font-bold leading-tight">Privacy first</p>
                <p className="text-white/50 text-3xs">Your address is shown on the drive page. Your phone number is shared only after a donor pledges.</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 min-w-0 relative flex flex-col">
        {/* Mobile progress */}
        <div className="sticky top-0 z-30 border-b border-stone-200 bg-[#faf8f5] dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
          <div className="flex items-center justify-between px-4 pt-2">
            <button onClick={() => void handleSaveExit()} className="flex min-h-[44px] items-center gap-1 text-sm font-medium text-stone-500 focus-visible:outline-2 focus-visible:outline-ngo-600">
              <ChevronLeft className="h-4 w-4" /> Save &amp; exit
            </button>
            <DraftSaveStatus status={saveStatus} onRetry={() => void saveDraft()} />
          </div>
          <WizardProgressBar current={step as NgoDriveStep} steps={NGO_DRIVE_STEPS} labels={STEP_LABELS} availability={availability} onJump={s => goToStep(s as NgoDriveStep, -1)} navLabel="Drive progress" />
        </div>

        <div className="relative z-10 w-full mx-auto max-w-[1040px] px-4 sm:px-8 lg:px-10 py-6 sm:py-8 lg:py-10">
          <div className="mb-4 hidden items-center justify-between lg:flex">
            <p className="text-2xs font-bold uppercase tracking-wider text-stone-400">
              Step {stepNumber(step)} of {NGO_DRIVE_STEPS.length}
            </p>
            <DraftSaveStatus status={saveStatus} onRetry={() => void saveDraft()} />
          </div>

          <StepCardStack depth={ngoStepIndex(step as NgoDriveStep)}>
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.section key={step} custom={direction} variants={cardVariants(reduced)} initial="enter" animate="center" exit="exit" className="ck-wizard-step-card rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_-16px_rgba(28,25,23,0.25)] sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="ck-wizard-step-card-content outline-none" tabIndex={-1}>
                  <h2 ref={headingRef} className="text-lg font-bold text-stone-900 sm:text-xl dark:text-stone-100" style={{ fontFamily: "var(--font-source-serif-4), serif" }}>
                    {STEP_LABELS[step as NgoDriveStep]}
                  </h2>
                  <p className="mb-6 mt-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{STEP_INTROS[step as NgoDriveStep]}</p>
                  
                  <div className="mb-3 empty:hidden">
                    <StepErrorSummary errors={Object.fromEntries(Object.entries(fieldErrors).filter(([, v]) => v))} onFocusField={focusField} />
                  </div>

                  {step === "drive-location" && (
                    <DriveLocationStep
                      model={driveLoc} errors={fieldErrors} lookup={driveLookup} profileCenter={null}
                      onChange={setDriveLocField} onPin={handleDrivePin} onGeocodeTyped={handleDriveGeocodeTyped}
                      controlRef={locationStepRef} onBusyChange={setLocationBusy}
                      radiusChoice={radiusChoice} customRadius={customRadius}
                      onRadiusChoice={setRadiusChoice} onCustomRadius={setCustomRadius}
                      registeredOfficeAddress={registeredOfficeAddress}
                    />
                  )}
                  {step === "drive-details" && step1}
                  {step === "beneficiaries-handover" && step2}
                  {step === "review-declarations" && step3}
                </div>
              </motion.section>
            </AnimatePresence>
          </StepCardStack>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        {step === "drive-location" || step === "drive-details" ? (
          <div className="mx-auto w-full max-w-[1040px] px-4 sm:px-8 lg:px-10 pb-6 mt-auto">
            <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-5 dark:border-slate-800">
              {step === "drive-details" && (
                <button type="button" onClick={handleBack} disabled={submitting} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ngo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><ArrowLeft className="size-4" aria-hidden />Back to Step 1</button>
              )}
              <button type="button" onClick={() => void saveDraft()} disabled={saveStatus === "saving"} className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ngo-700 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {saveStatus === "saving" ? "Saving…" : "Save Draft"}
              </button>
              <button type="button" onClick={() => void handleNext()} disabled={submitting || saveStatus === "saving"} className="min-h-11 rounded-lg bg-ngo-700 px-5 text-xs font-bold text-white transition-colors hover:bg-ngo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ngo-700 disabled:opacity-50 disabled:cursor-not-allowed">Continue to Step {step === "drive-location" ? 2 : 3} →</button>
            </div>
          </div>
        ) : step === "beneficiaries-handover" ? (
          <div className="mx-auto flex w-full max-w-[1040px] flex-wrap items-center justify-between gap-3 px-4 pb-6 sm:px-8 lg:px-10 mt-auto">
            <button type="button" onClick={handleBack} disabled={submitting || saveStatus === "saving"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ngo-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><ArrowLeft className="size-4" aria-hidden />Back to Step 2</button>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void handleNext()} disabled={submitting || saveStatus === "saving"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ngo-700 disabled:opacity-50 disabled:cursor-not-allowed bg-ngo-700 text-white hover:bg-ngo-800">{saveStatus === "saving" ? "Saving…" : "Save & Continue"}<ArrowRight className="size-4" aria-hidden /></button>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[1040px] flex-wrap items-center justify-between gap-3 px-4 pb-6 sm:px-8 lg:px-10 mt-auto">
             <button type="button" onClick={handleBack} disabled={submitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ngo-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><ArrowLeft className="size-4" aria-hidden />Back</button>
             <div className="flex flex-wrap gap-2">
               <button type="button" onClick={() => setShowPreviewModal(true)} disabled={submitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ngo-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                 <Eye className="size-4" aria-hidden />
                 Preview donor page
               </button>
               <button type="button" onClick={() => void handleSaveExit()} disabled={submitting || saveStatus === "saving"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ngo-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">Save & exit</button>
               <button type="button" onClick={() => void handleSubmit()} disabled={submitting || !allDeclarationsChecked} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ngo-700 disabled:opacity-50 disabled:cursor-not-allowed bg-ngo-700 text-white hover:bg-ngo-800">{submitting ? "Submitting…" : "Submit for verification"}</button>
             </div>
          </div>
        )}
      </div>

      {/* ── Preview Donor Page Modal ── */}
      {showPreviewModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Donor page preview"
          className="fixed inset-0 z-50 flex flex-col bg-stone-50 dark:bg-zinc-950 overflow-y-auto"
        >
          <div className="sticky top-0 z-50 flex items-center justify-between border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95 sm:px-6">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <Eye className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                  Donor Page Preview
                </p>
                <p className="text-3xs text-stone-500 dark:text-stone-400">
                  How this drive will look to donors once published
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPreviewModal(false)}
              className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-xs font-bold text-stone-700 shadow-sm hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-ngo-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-stone-200 dark:hover:bg-zinc-700"
            >
              <X className="size-4" aria-hidden="true" />
              Close preview
            </button>
          </div>
          <div className="flex-1">
            <DriveDetailView drive={previewDrive} mode="preview" />
          </div>
        </div>
      )}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="min-h-screen bg-ngo-50 dark:bg-zinc-950 flex flex-col pt-12 px-4 animate-pulse">
      <div className="max-w-3xl mx-auto w-full">
        <div className="h-6 bg-stone-200 dark:bg-zinc-800 rounded w-32 mb-8" />
        <div className="h-10 bg-stone-200 dark:bg-zinc-800 rounded w-64 mb-8" />
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl h-40 border-2 border-stone-100 dark:border-zinc-800" />
          <div className="bg-white dark:bg-zinc-900 rounded-2xl h-40 border-2 border-stone-100 dark:border-zinc-800" />
        </div>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen bg-ngo-50 dark:bg-zinc-950 flex flex-col items-center pt-24 px-4 text-center">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mb-4">
          <X className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-stone-900 dark:text-white mb-2">Something went wrong</h1>
        <p className="text-stone-500 mb-6">We couldn't load the form. Please try again.</p>
        <Link href="/dashboard/ngo" className="px-6 py-2.5 rounded-full bg-ngo-700 text-white font-bold hover:bg-ngo-600">
          Go to dashboard
        </Link>
      </div>
    );
    return this.props.children;
  }
}

export default function NgoRequestCreationPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<FormSkeleton />}>
        <NewNgoDriveForm />
      </Suspense>
    </ErrorBoundary>
  );
}
