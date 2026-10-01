"use client";

import React, { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { useAuth } from "@/hooks/useAuth";
import { getMyNgoApplication, createNgoDrive } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, ArrowRight, UploadCloud, X, CheckCircle2, ShieldCheck, Layers, ChevronLeft, Shield } from "lucide-react";
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
import { LocalTestUploadButton } from "@/components/LocalTestUploadButton";

type NgoDriveStep = "drive-type" | "drive-details" | "beneficiaries-handover" | "review-declarations";

const NGO_DRIVE_STEPS: NgoDriveStep[] = ["drive-details", "beneficiaries-handover", "review-declarations"];
const STEP_LABELS: Record<NgoDriveStep, string> = {
  "drive-type": "Drive Type",
  "drive-details": "1 Drive details",
  "beneficiaries-handover": "2 Beneficiaries & handover",
  "review-declarations": "3 Review & declarations",
};
const STEP_INTROS: Record<NgoDriveStep, string> = {
  "drive-type": "Choose what to collect",
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
  const { isVerified, isPhotosDue, lockReason, photosDueRequestName, status: ngoStatus, canPostRequest } = useNgoStatus();

  const [ngoContactName, setNgoContactName] = useState("");
  const [ngoContactPhone, setNgoContactPhone] = useState("");
  
  const [step, setStep] = useState<NgoDriveStep>("drive-type");
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

  // Step 1
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [unit, setUnit] = useState<"PIECES" | "SETS" | "PAIRS" | "KG" | "BOXES" | "PACKETS">("PIECES");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<"NORMAL" | "HIGH" | "CRITICAL">("NORMAL");
  const [condition, setCondition] = useState<"NEW_ONLY" | "NEW_OR_GENTLY_USED">("NEW_ONLY");
  const [details, setDetails] = useState("");
  const [referencePhotoDataUrl, setReferencePhotoDataUrl] = useState("");

  // Step 2
  const [beneficiaryGroup, setBeneficiaryGroup] = useState("");
  const [beneficiaryCount, setBeneficiaryCount] = useState<number | "">("");
  const [neededBy, setNeededBy] = useState("");
  const [availableDays, setAvailableDays] = useState<("MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN")[]>([]);
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableTo, setAvailableTo] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Step 3 (Declarations)
  const [declAccurate, setDeclAccurate] = useState(false);
  const [declUsedOnly, setDeclUsedOnly] = useState(false);
  const [declProof, setDeclProof] = useState(false);
  const [declFaces, setDeclFaces] = useState(false);
  const [declNotDuplicate, setDeclNotDuplicate] = useState(false);
  const [declFalseInfo, setDeclFalseInfo] = useState(false);
  const [declContact, setDeclContact] = useState(false);

  // Load prefills
  useEffect(() => {
    if (!user) return;
    getMyNgoApplication().then(app => {
      if (app) {
        const appData = app as any;
        if (appData.representativeName) setNgoContactName(appData.representativeName);
        if (appData.mobileNumber) setNgoContactPhone(appData.mobileNumber);
      } else if (IS_NGO_DEMO_MODE) {
        try {
          const appObj = JSON.parse(localStorage.getItem(`ngo-application-${userIdentifier}`) || localStorage.getItem(`ngo-demo-application-${userIdentifier}`) || "{}");
          if (appObj.representativeName) setNgoContactName(appObj.representativeName);
          if (appObj.mobileNumber) setNgoContactPhone(appObj.mobileNumber);
        } catch {}
      }
    }).catch(() => {});
  }, [user, userIdentifier, IS_NGO_DEMO_MODE]);

  // Load draft
  const [draftLoaded, setDraftLoaded] = useState(false);
  useEffect(() => {
    if (!user || draftLoaded) return;
    try {
      const d = localStorage.getItem(DRAFT_KEY);
      if (d) {
        const p = JSON.parse(d);
        setTitle(p.title || "");
        setCategory(p.category || "");
        setItemName(p.itemName || "");
        setQuantity(p.quantity || "");
        setUnit(p.unit || "PIECES");
        setDescription(p.description || "");
        setUrgency(p.urgency || "NORMAL");
        setCondition(p.condition || "NEW_ONLY");
        setDetails(p.details || "");
        setReferencePhotoDataUrl(p.referencePhotoDataUrl || "");
        setBeneficiaryGroup(p.beneficiaryGroup || "");
        setBeneficiaryCount(p.beneficiaryCount || "");
        setNeededBy(p.neededBy || "");
        setAvailableDays(p.availableDays || []);
        setAvailableFrom(p.availableFrom || "");
        setAvailableTo(p.availableTo || "");
        setContactName(p.contactName || "");
        setContactPhone(p.contactPhone || "");
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
  }, [user, draftLoaded, DRAFT_KEY]);

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
        title, category, itemName, quantity, unit, description, urgency, condition, details, referencePhotoDataUrl,
        beneficiaryGroup, beneficiaryCount, neededBy, availableDays, availableFrom, availableTo, contactName, contactPhone,
        declarations: { accurate: declAccurate, usedOnlyForBeneficiaries: declUsedOnly, proofWithin48h: declProof, facesWithConsent: declFaces, notDuplicate: declNotDuplicate, falseInfoConsequences: declFalseInfo, contactConsent: declContact }
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(saveObj));
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, [draftLoaded, title, category, itemName, quantity, unit, description, urgency, condition, details, referencePhotoDataUrl, beneficiaryGroup, beneficiaryCount, neededBy, availableDays, availableFrom, availableTo, contactName, contactPhone, declAccurate, declUsedOnly, declProof, declFaces, declNotDuplicate, declFalseInfo, declContact, DRAFT_KEY]);

  useEffect(() => {
    if (draftLoaded) saveDraft();
  }, [draftLoaded, saveDraft]);

  useEffect(() => {
    if (!authLoading && user) {
      if (!canPostRequest) {
        if (lockReason) toast.error(lockReason);
        router.replace("/dashboard/ngo");
      }
    }
  }, [authLoading, user, canPostRequest, lockReason, router]);

  const goToStep = useCallback((next: NgoDriveStep, dir: number) => {
    setDirection(dir);
    setStep(next);
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    if (headingRef.current) headingRef.current.focus();
  }, [reduced]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageIfNeeded(file);
      const reader = new FileReader();
      reader.onload = () => {
        setReferencePhotoDataUrl(reader.result as string);
        toast.success("Photo attached");
      };
      reader.readAsDataURL(compressed);
    } catch (err: any) {
      toast.error(err.message || "Failed to attach photo");
    }
  }

  function validateStep(s: NgoDriveStep): boolean {
    const e: Record<string, string> = {};
    if (s === "drive-details") {
      if (!title.trim() || title.length < 10 || title.length > 80) e.title = "Title must be 10-80 characters";
      if (!category) e.category = "Category is required";
      if (!itemName.trim() || itemName.length < 2 || itemName.length > 60) e.itemName = "Item name must be 2-60 characters";
      if (quantity === "" || quantity < 1 || quantity > 10000) e.quantity = "Quantity must be 1-10000";
      if (!unit) e.unit = "Unit is required";
      if (!description.trim() || description.length < 30 || description.length > 1000) e.description = "Description must be 30-1000 characters";
      if (!condition) e.condition = "Condition is required";
    }
    if (s === "beneficiaries-handover") {
      if (!beneficiaryGroup) e.beneficiaryGroup = "Beneficiary group is required";
      if (beneficiaryCount === "" || beneficiaryCount < 1) e.beneficiaryCount = "Must be at least 1";
      if (!neededBy) e.neededBy = "Date is required";
      else {
        const d = new Date(neededBy);
        const minDate = new Date(); minDate.setDate(minDate.getDate() + 2);
        const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 90);
        if (d < minDate || d > maxDate) e.neededBy = "Date must be 3-90 days from today";
      }
      if (availableDays.length === 0) e.availableDays = "Select at least one day";
      if (!availableFrom || !availableTo) e.availableHours = "Select hours";
      else if (availableTo <= availableFrom) e.availableHours = "End time must be after start time";
      if (!contactName.trim()) e.contactName = "Contact name is required";
      if (!contactPhone.trim() || contactPhone.length < 10) e.contactPhone = "Valid phone is required";
    }
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
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
        title, category, itemName, quantity: Number(quantity), unit, condition,
        details: details || undefined,
        referencePhotoUrl: referencePhotoDataUrl || undefined,
        description, urgency,
        beneficiaryGroup, beneficiaryCount: Number(beneficiaryCount),
        neededBy, availableDays, availableFrom, availableTo,
        contactName, contactPhone,
        declarations: { accurate: declAccurate, usedOnlyForBeneficiaries: declUsedOnly, proofWithin48h: declProof, facesWithConsent: declFaces, notDuplicate: declNotDuplicate, falseInfoConsequences: declFalseInfo, contactConsent: declContact }
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
      } else {
        try {
          await createNgoDrive(payload);
        } catch (e: any) {
          if (e.status === 404 || e.status === 405 || e.status === 501) {
            toast.info("Drive submission is launching soon. Your drive is saved on this device — you won't lose it.", { duration: 5000 });
            return;
          }
          throw e;
        }
      }
      
      localStorage.removeItem(DRAFT_KEY);
      setSubmitted(true);
    } catch (e) {
      toast.error("Something went wrong. Your drive is saved — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = declAccurate && declUsedOnly && declProof && declFaces && declNotDuplicate && declFalseInfo && declContact;

  if (authLoading || !user || ngoStatus === "loading") return <FormSkeleton />;
  if (!canPostRequest) {
    return (
      <div className="min-h-screen bg-ngo-50 dark:bg-zinc-950 flex flex-col items-center pt-24 px-4 text-center">
        <div className="w-12 h-12 text-stone-300 dark:text-zinc-700 mb-4"><ShieldCheck className="w-full h-full" /></div>
        <h1 className="text-xl font-bold text-stone-900 dark:text-white mb-2">Drives unlock after verification</h1>
        <p className="text-stone-500 mb-6">You will be redirected to the dashboard.</p>
        <Link href="/dashboard/ngo" className="px-6 py-2.5 rounded-full bg-ngo-700 text-white font-bold hover:bg-ngo-600">
          Go to dashboard
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-ngo-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white mb-2 text-center">Drive submitted for review</h1>
        <p className="text-stone-500 dark:text-stone-400 text-center max-w-md mb-8">
          Our team will check it and notify you when it goes live.
        </p>
        <div className="flex gap-4">
          <Link href="/dashboard/ngo" className="px-6 py-2.5 rounded-lg border border-stone-200 font-bold text-stone-600 hover:bg-stone-50 transition-colors">
            Go to dashboard
          </Link>
          <button onClick={() => { setSubmitted(false); goToStep("drive-type", -1); }} className="px-6 py-2.5 rounded-lg bg-ngo-600 text-white font-bold hover:bg-ngo-700 transition-colors">
            Start another drive
          </button>
        </div>
      </div>
    );
  }

  if (step === "drive-type") {
    return (
      <div className="min-h-screen bg-[#faf8f5] dark:bg-zinc-950 flex flex-col pt-12 px-4" style={{ "--ck-role-accent": "var(--ck-color-ngo-600)", "--ck-role-hover": "var(--ck-color-ngo-700)" } as React.CSSProperties}>
        <div className="max-w-3xl mx-auto w-full">
          <Link href="/dashboard/ngo" className="inline-flex items-center gap-2 text-sm font-bold text-stone-500 hover:text-ngo-600 mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </Link>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-white mb-8" style={{ fontFamily: "var(--font-source-serif-4), var(--font-lora), serif" }}>What kind of drive?</h1>
          <div className="grid sm:grid-cols-2 gap-6">
            <button onClick={() => goToStep("drive-details", 1)} className="text-left bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 hover:border-ngo-500 rounded-2xl p-6 transition-all shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_-16px_rgba(28,25,23,0.25)] cursor-pointer group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Layers className="w-24 h-24 text-ngo-600" />
              </div>
              <div className="relative z-10">
                <h2 className="text-xl font-bold text-ngo-900 dark:text-ngo-100 mb-2">Items drive</h2>
                <p className="text-stone-500 text-sm leading-relaxed">Collect blankets, books, ration kits, and more. Donors near you pledge the items.</p>
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

  const step1 = (
    <div className="grid items-start gap-5 md:grid-cols-2">
      <div className="min-w-0 space-y-5">
        <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900 space-y-4" aria-labelledby="params-heading">
          <h3 id="params-heading" className="text-[11px] font-bold uppercase tracking-wide text-ngo-700 dark:text-ngo-300">1. Drive Parameters</h3>
          <WizardField label="Drive title" required error={fieldErrors.title} hint={`${title.length}/80`}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="title" maxLength={80} placeholder="e.g. Winter blankets for Kandivali Elder Shelter" value={title} onChange={e => setTitle(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border ${invalid ? "border-red-500" : ""}`} />
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
                <Input id={id} name="quantity" type="number" min={1} max={10000} placeholder="e.g. 40" value={quantity} onChange={e => setQuantity(e.target.value ? Number(e.target.value) : "")} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border h-11 ${invalid ? "border-red-500" : ""}`} />
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
        </section>
        
        <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900 space-y-4" aria-labelledby="story-heading">
          <h3 id="story-heading" className="text-[11px] font-bold uppercase tracking-wide text-ngo-700 dark:text-ngo-300">2. Drive Story</h3>
          <WizardField label="Why it's needed" required error={fieldErrors.description} hint={`${description.length}/1000 — who it's for, why now, and what it will change`}>
            {({ id, describedBy, invalid }) => (
              <Textarea id={id} name="description" rows={5} maxLength={1000} placeholder="e.g. As winter sets in, the elders in our shelter lack warm blankets..." value={description} onChange={e => setDescription(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border ${invalid ? "border-red-500" : ""}`} />
            )}
          </WizardField>
        </section>
      </div>
  
      <div className="min-w-0 space-y-5">
        <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900 space-y-4" aria-labelledby="urgency-heading">
          <h3 id="urgency-heading" className="text-[11px] font-bold uppercase tracking-wide text-ngo-700 dark:text-ngo-300">3. Urgency Classification</h3>
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
  
        <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900 space-y-4" aria-labelledby="item-req-heading">
          <h3 id="item-req-heading" className="text-[11px] font-bold uppercase tracking-wide text-ngo-700 dark:text-ngo-300">4. Item Requirements</h3>
          <WizardField label="Condition accepted" required error={fieldErrors.condition}>
            {({ id, describedBy, invalid }) => (
              <Select value={condition} onValueChange={setCondition as any}>
                <SelectTrigger id={id} data-field="condition" aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border h-11 ${invalid ? "border-red-500" : ""}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW_ONLY">New only</SelectItem>
                  <SelectItem value="NEW_OR_GENTLY_USED">New or gently used</SelectItem>
                </SelectContent>
              </Select>
            )}
          </WizardField>
  
          <WizardField label="Details (optional)" error={fieldErrors.details} hint={`${details.length}/200 — Size, age group, specs — anything donors should know.`}>
            {({ id, describedBy, invalid }) => (
              <Textarea id={id} name="details" rows={3} maxLength={200} value={details} onChange={e => setDetails(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border ${invalid ? "border-red-500" : ""}`} />
            )}
          </WizardField>
  
          <div>
            <label className="text-xs font-bold text-stone-700 dark:text-stone-200 block mb-1">Reference photo (optional)</label>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => document.getElementById('photo-upload')?.click()} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-700">
                <UploadCloud className="w-4 h-4" /> Upload Image
              </button>
              <input id="photo-upload" type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handlePhotoUpload} />
              <LocalTestUploadButton onFile={(f) => handlePhotoUpload({ target: { files: [f] } } as any)} accept="image" />
              {referencePhotoDataUrl && (
                <div className="relative w-12 h-12 rounded-lg border border-slate-200 overflow-hidden shrink-0">
                  <img src={referencePhotoDataUrl} alt="Reference" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setReferencePhotoDataUrl("")} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-1.5">Max 5 MB. JPG, PNG, WEBP.</p>
          </div>
        </section>
      </div>
    </div>
  );

  const step2 = (
    <div className="grid items-start gap-5 md:grid-cols-2">
      <div className="min-w-0 space-y-5">
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
  
          <WizardField label="Approximate number" required error={fieldErrors.beneficiaryCount} hint="Never include names — donors only see the group and the number.">
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="beneficiaryCount" type="number" min={1} placeholder="e.g. 50" value={beneficiaryCount} onChange={e => setBeneficiaryCount(e.target.value ? Number(e.target.value) : "")} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border h-11 ${invalid ? "border-red-500" : ""}`} />
            )}
          </WizardField>
        </section>
  
        <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900 space-y-4" aria-labelledby="timeline-heading">
          <h3 id="timeline-heading" className="text-[11px] font-bold uppercase tracking-wide text-ngo-700 dark:text-ngo-300">2. Timeline</h3>
          <WizardField label="Needed by" required error={fieldErrors.neededBy}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="neededBy" type="date" min={minDateStr} max={maxDateStr} value={neededBy} onChange={e => setNeededBy(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid} className={`w-full box-border h-11 ${invalid ? "border-red-500" : ""}`} />
            )}
          </WizardField>
        </section>
      </div>
  
      <div className="min-w-0 space-y-5">
        <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900 space-y-4" aria-labelledby="handover-heading">
          <h3 id="handover-heading" className="text-[11px] font-bold uppercase tracking-wide text-ngo-700 dark:text-ngo-300">3. Handover Availability</h3>
          <div className="p-3 bg-ngo-50 dark:bg-ngo-900/20 border border-ngo-100 dark:border-ngo-800 rounded-lg text-xs text-ngo-800 dark:text-ngo-200 leading-relaxed mb-4">
            Donors choose how to hand over: drop off at your registered address, or request a pickup. Your address and phone are shared only after a donor pledges.
          </div>
          
          <WizardField label="Available days" required error={fieldErrors.availableDays} hint="Days you can receive items or do pickups.">
            {({ id, describedBy }) => (
              <div id={id} data-field="availableDays" aria-describedby={describedBy} className="flex flex-wrap gap-2">
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
  
        <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900 space-y-4" aria-labelledby="contact-heading">
          <h3 id="contact-heading" className="text-[11px] font-bold uppercase tracking-wide text-ngo-700 dark:text-ngo-300">4. Contact Person</h3>
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
        </section>
      </div>
    </div>
  );

  const DECLARATIONS = [
    { id: "declAccurate", checked: declAccurate, setter: setDeclAccurate, text: "The information in this drive is true and accurate to the best of our knowledge." },
    { id: "declUsedOnly", checked: declUsedOnly, setter: setDeclUsedOnly, text: "Donated items will be used only for the beneficiaries described here, and will never be sold, rented, or exchanged for money." },
    { id: "declProof", checked: declProof, setter: setDeclProof, text: "We will upload handover photos within 48 hours of distributing the items, and understand we can't start a new drive until proof is uploaded." },
    { id: "declFaces", checked: declFaces, setter: setDeclFaces, text: "People's faces will appear in photos only with their consent (a guardian's consent for children)." },
    { id: "declNotDuplicate", checked: declNotDuplicate, setter: setDeclNotDuplicate, text: "This drive is not a duplicate of another active drive on CauseKind." },
    { id: "declFalseInfo", checked: declFalseInfo, setter: setDeclFalseInfo, text: "We understand that false information may lead to this drive being removed and our NGO's verification being suspended." },
    { id: "declContact", checked: declContact, setter: setDeclContact, text: "We consent to CauseKind contacting the listed contact person to verify this drive." },
  ];

  const step3 = (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="mb-4 text-sm font-bold text-stone-800 dark:text-stone-100">Drive summary</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between pb-2 border-b border-stone-100 dark:border-slate-800">
            <span className="text-stone-500">Title & Item</span>
            <span className="font-medium text-right max-w-[200px] sm:max-w-md truncate text-stone-900 dark:text-stone-100">{title} <br/><span className="text-stone-400 text-xs">{quantity} {UNITS.find(u => u.id === unit)?.label}</span></span>
          </div>
          <div className="flex justify-between pb-2 border-b border-stone-100 dark:border-slate-800">
            <span className="text-stone-500">Needed by</span>
            <span className="font-medium text-stone-900 dark:text-stone-100">{neededBy}</span>
          </div>
          <div className="flex justify-between pb-2 border-b border-stone-100 dark:border-slate-800">
            <span className="text-stone-500">Contact</span>
            <span className="font-medium text-right text-stone-900 dark:text-stone-100">{contactName}<br/><span className="text-stone-400 text-xs">{contactPhone}</span></span>
          </div>
        </div>
        <div className="mt-4 flex gap-4">
          <button onClick={() => goToStep("drive-details", -1)} className="text-xs font-bold text-ngo-600 dark:text-ngo-400 hover:underline">Edit Details</button>
          <button onClick={() => goToStep("beneficiaries-handover", -1)} className="text-xs font-bold text-ngo-600 dark:text-ngo-400 hover:underline">Edit Handover</button>
        </div>
      </section>
  
      <section className="space-y-4">
        <h3 className="text-sm font-bold text-stone-800 dark:text-stone-100">Final confirmation</h3>
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
           {!canSubmit && <p className="text-xs text-stone-500">Tick all declarations to submit.</p>}
        </div>
      </section>
    </div>
  );

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
                <p className="text-white/50 text-3xs">Your address & phone stay private until a pledge.</p>
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

                  {step === "drive-details" && step1}
                  {step === "beneficiaries-handover" && step2}
                  {step === "review-declarations" && step3}
                </div>
              </motion.section>
            </AnimatePresence>
          </StepCardStack>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        {step === "drive-details" ? (
          <div className="mx-auto w-full max-w-[1040px] px-4 sm:px-8 lg:px-10 pb-6 mt-auto">
            <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-5 dark:border-slate-800">
              <button type="button" onClick={() => void saveDraft()} disabled={saveStatus === "saving"} className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ngo-700 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {saveStatus === "saving" ? "Saving…" : "Save Draft"}
              </button>
              <button type="button" onClick={() => void handleNext()} disabled={submitting || saveStatus === "saving"} className="min-h-11 rounded-lg bg-ngo-700 px-5 text-xs font-bold text-white transition-colors hover:bg-ngo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ngo-700 disabled:opacity-50 disabled:cursor-not-allowed">Continue to Step 2 →</button>
            </div>
          </div>
        ) : step === "beneficiaries-handover" ? (
          <div className="mx-auto flex w-full max-w-[1040px] flex-wrap items-center justify-between gap-3 px-4 pb-6 sm:px-8 lg:px-10 mt-auto">
            <button type="button" onClick={handleBack} disabled={submitting || saveStatus === "saving"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ngo-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><ArrowLeft className="size-4" aria-hidden />Back to Step 1</button>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void handleNext()} disabled={submitting || saveStatus === "saving"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ngo-700 disabled:opacity-50 disabled:cursor-not-allowed bg-ngo-700 text-white hover:bg-ngo-800">{saveStatus === "saving" ? "Saving…" : "Save & Continue"}<ArrowRight className="size-4" aria-hidden /></button>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[1040px] flex-wrap items-center justify-between gap-3 px-4 pb-6 sm:px-8 lg:px-10 mt-auto">
             <button type="button" onClick={handleBack} disabled={submitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ngo-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><ArrowLeft className="size-4" aria-hidden />Back</button>
             <div className="flex flex-wrap gap-2">
               <button type="button" onClick={() => void handleSaveExit()} disabled={submitting || saveStatus === "saving"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ngo-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">Save & exit</button>
               <button type="button" onClick={() => void handleSubmit()} disabled={submitting || !canSubmit} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ngo-700 disabled:opacity-50 disabled:cursor-not-allowed bg-ngo-700 text-white hover:bg-ngo-800">{submitting ? "Submitting…" : "Submit for verification"}</button>
             </div>
          </div>
        )}
      </div>
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
