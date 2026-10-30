"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";
import {
  LEGAL_STRUCTURES,
  PAN_DOC,
  STRUCTURE_INDEPENDENT_DOC_IDS,
  getRegistrationCertificateDoc,
  isValidMobile,
  mobileError,
  isValidEmail,
  aboutUsMissing,
  ABOUT_US_MIN,
  ABOUT_US_MAX,
  isValidPan,
  legalStructureLabel,
  normalizePan,
  type LegalStructure,
  type NGOFormState,
  type UploadedFile,
  getNgoStillNeededItems,
  fieldText,
} from "@/features/ngo-registration/ngoRegistrationModel";
import { LegalStructureCard } from "@/features/ngo-registration/components/LegalStructureCard";
import { DocUploadCard } from "@/features/ngo-registration/components/DocUploadCard";
import { IndianPhoneInput } from "@/features/ngo-registration/components/IndianPhoneInput";
import { controlClass } from "@/features/wizard-kit/WizardField";
import { cn } from "@/lib/utils";
import { CorrectionNote, type NgoCorrections } from "@/features/ngo-registration/components/CorrectionNote";
import { checkNgoPanLetters, type PanCheckResult } from "@/lib/api";

interface OrgDetailsProps {
  data: NGOFormState;
  onChange: (patch: Partial<NGOFormState>) => void;
  onBack: () => void;
  onContinue: () => void;
  /** Items a reviewer asked to fix, with their notes (shown next to each). */
  corrections?: NgoCorrections;
}

/** True when changing the structure would remove something the NGO already gave. */
function hasStructureSpecificItems(data: NGOFormState): boolean {
  const kept = new Set(STRUCTURE_INDEPENDENT_DOC_IDS);
  return !!data.authorizationLetter || Object.entries(data.documents).some(([id, file]) => !!file && !kept.has(id));
}

/** Step 1 — Organization Details */
export function OrgDetails({ data, onChange, onBack, onContinue, corrections }: OrgDetailsProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingStructure, setPendingStructure] = useState<LegalStructure | null>(null);
  const [panCheck, setPanCheck] = useState<PanCheckResult | null>(null);

  const certDoc = getRegistrationCertificateDoc(data.legalStructure);
  const pan = normalizePan(data.panNumber ?? "");

  // PAN letter checks (4th letter vs structure, 5th vs name): warnings only, never blocking.
  useEffect(() => {
    if (!isValidPan(pan) || !data.legalStructure) {
      setPanCheck(null);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      checkNgoPanLetters({ panNumber: pan, legalStructure: data.legalStructure, organizationName: data.organizationName })
        .then((result) => { if (active) setPanCheck(result); })
        .catch(() => { if (active) setPanCheck(null); });
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [pan, data.legalStructure, data.organizationName]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!fieldText(data.organizationName)) next.organizationName = "Organization name is required.";
    if (!data.legalStructure) next.legalStructure = "Please select a legal structure.";
    if (!isValidPan(pan)) next.panNumber = "Enter the 10-character PAN (5 letters, 4 digits, 1 letter).";
    if (!fieldText(data.registrationNumber)) next.registrationNumber = "Registration number is required.";
    if (!fieldText(data.registeredOfficeAddress)) next.registeredOfficeAddress = "Registered office address is required.";
    if (!isValidEmail(data.officialEmail ?? "")) next.officialEmail = "Enter a valid email address.";
    if (!isValidMobile(data.organizationPhone ?? "")) next.organizationPhone = mobileError(data.organizationPhone ?? "");
    if (aboutUsMissing(data)) next.aboutUs = `Write ${ABOUT_US_MIN} to ${ABOUT_US_MAX} characters about your NGO.`;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleContinue() {
    if (validate()) onContinue();
  }

  function selectStructure(structure: LegalStructure) {
    if (structure === data.legalStructure) return;
    if (data.legalStructure && hasStructureSpecificItems(data)) {
      setPendingStructure(structure);
      return;
    }
    applyStructure(structure);
  }

  /** Keeps the PAN card and the documents every structure gives; clears the rest. */
  function applyStructure(structure: LegalStructure) {
    const kept = new Set(STRUCTURE_INDEPENDENT_DOC_IDS);
    const documents: Record<string, UploadedFile | null> = {};
    for (const [id, file] of Object.entries(data.documents)) if (kept.has(id)) documents[id] = file;
    onChange({ legalStructure: structure, documents, authorizationLetter: null });
    setPendingStructure(null);
    if (errors.legalStructure) setErrors((p) => ({ ...p, legalStructure: "" }));
  }

  function setDoc(id: string, file: UploadedFile | null) {
    onChange({ documents: { ...data.documents, [id]: file } });
  }

  function field(key: string) {
    return (
      <>
        {errors[key] ? (
          <p className="mt-1 text-3xs font-semibold text-red-600 dark:text-red-400">{errors[key]}</p>
        ) : null}
        <CorrectionNote note={corrections?.[key]} field={key} />
      </>
    );
  }

  const label = "block text-sm font-semibold text-stone-700 dark:text-stone-300";
  const required = <span className="text-ngo-700 dark:text-ngo-300" aria-hidden>*</span>;
  const missing = getNgoStillNeededItems("org-details", data);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-2xs font-black uppercase tracking-widest text-ngo-700 dark:text-ngo-300">
          Step 1 of 6
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
          Organization Details
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Tell us about your registered organization.
        </p>
      </div>

      <div className="space-y-4">
        {/* 1. Organization Name */}
        <div className="space-y-1">
          <label htmlFor="ngo-org-name" className={label}>Organization Name {required}</label>
          <input
            id="ngo-org-name"
            type="text"
            autoComplete="organization"
            value={data.organizationName}
            aria-invalid={!!errors.organizationName}
            onChange={(e) => {
              onChange({ organizationName: e.target.value });
              if (errors.organizationName) setErrors((p) => ({ ...p, organizationName: "" }));
            }}
            className={cn(controlClass, errors.organizationName && "border-red-400 focus-visible:border-red-400 focus-visible:outline-red-400")}
          />
          {field("organizationName")}
        </div>

        {/* 2. Legal Structure */}
        <div className="space-y-2">
          <label className={label}>Legal Structure {required}</label>
          <div role="radiogroup" aria-label="Legal Structure" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {LEGAL_STRUCTURES.map((s) => (
              <LegalStructureCard
                key={s.id}
                structure={s}
                selected={data.legalStructure === s.id}
                onSelect={() => selectStructure(s.id as LegalStructure)}
              />
            ))}
          </div>
          {pendingStructure && (
            <div role="alertdialog" aria-label="Change legal structure"
              className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-bold">Change to {legalStructureLabel(pendingStructure)}?</p>
              <p className="mt-1">
                This removes the registration certificate, the {legalStructureLabel(data.legalStructure)} documents and the
                authorization document you uploaded. Your PAN card, bank proof and certificates stay.
              </p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => applyStructure(pendingStructure)}
                  className="rounded-lg bg-amber-700 px-3 py-1.5 font-bold text-white hover:bg-amber-800">
                  Change structure
                </button>
                <button type="button" onClick={() => setPendingStructure(null)}
                  className="rounded-lg border border-amber-400 px-3 py-1.5 font-bold">
                  Keep {legalStructureLabel(data.legalStructure)}
                </button>
              </div>
            </div>
          )}
          {field("legalStructure")}
        </div>

        {/* 3. PAN card */}
        <div className="space-y-1">
          <DocUploadCard
            docId={PAN_DOC.id}
            label={PAN_DOC.label}
            hint={PAN_DOC.hint}
            category="must-have"
            uploaded={data.documents[PAN_DOC.id] ?? null}
            onUpload={(file) => setDoc(PAN_DOC.id, file)}
            onRemove={() => setDoc(PAN_DOC.id, null)}
          />
          <CorrectionNote note={corrections?.[`documents.${PAN_DOC.id}`]} field={`documents.${PAN_DOC.id}`} />
        </div>

        {/* 4. PAN number */}
        <div className="space-y-1">
          <label htmlFor="ngo-pan" className={label}>PAN Number {required}</label>
          <input
            id="ngo-pan"
            type="text"
            autoComplete="off"
            maxLength={12}
            value={data.panNumber ?? ""}
            aria-invalid={!!errors.panNumber}
            onChange={(e) => {
              onChange({ panNumber: e.target.value.toUpperCase() });
              if (errors.panNumber) setErrors((p) => ({ ...p, panNumber: "" }));
            }}
            className={cn(controlClass, "font-mono uppercase", errors.panNumber && "border-red-400")}
          />
          {pan.length >= 10 && !isValidPan(pan) && !errors.panNumber && (
            <p className="mt-1 text-3xs font-semibold text-red-600 dark:text-red-400">
              A PAN is 5 letters, 4 digits and 1 letter.
            </p>
          )}
          {panCheck && panCheck.warnings.length > 0 && (
            <ul aria-label="PAN check" className="mt-1.5 space-y-1">
              {panCheck.warnings.map((w) => (
                <li key={w.code}
                  className={cn("flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-3xs font-semibold",
                    w.severity === "DANGER"
                      ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                      : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200")}>
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                  <span>{w.message}</span>
                </li>
              ))}
            </ul>
          )}
          {field("panNumber")}
        </div>

        {/* 5. Registration certificate (label by structure) */}
        <div className="space-y-1">
          {certDoc ? (
            <>
              <DocUploadCard
                key={certDoc.id}
                docId={certDoc.id}
                label={certDoc.label}
                category="must-have"
                uploaded={data.documents[certDoc.id] ?? null}
                onUpload={(file) => setDoc(certDoc.id, file)}
                onRemove={() => setDoc(certDoc.id, null)}
              />
              <CorrectionNote note={corrections?.[`documents.${certDoc.id}`]} field={`documents.${certDoc.id}`} />
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-stone-300 px-3.5 py-3 text-xs text-stone-500 dark:border-zinc-700">
              Registration certificate: choose your legal structure first.
            </p>
          )}
        </div>

        {/* 6. Registration Number */}
        <div className="space-y-1">
          <label htmlFor="ngo-reg-no" className={label}>Registration Number {required}</label>
          <input
            id="ngo-reg-no"
            type="text"
            value={data.registrationNumber}
            aria-invalid={!!errors.registrationNumber}
            onChange={(e) => {
              onChange({ registrationNumber: e.target.value });
              if (errors.registrationNumber) setErrors((p) => ({ ...p, registrationNumber: "" }));
            }}
            className={cn(controlClass, errors.registrationNumber && "border-red-400 focus-visible:border-red-400 focus-visible:outline-red-400")}
          />
          {field("registrationNumber")}
        </div>

        {/* 7. Year of Establishment */}
        <div className="space-y-1">
          <label htmlFor="ngo-year" className={label}>Year of Establishment {required}</label>
          <input
            id="ngo-year"
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={data.yearOfEstablishment}
            onChange={(e) => onChange({ yearOfEstablishment: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            className={controlClass}
          />
          {field("yearOfEstablishment")}
        </div>

        {/* 8. Registered Office Address */}
        <div className="space-y-1">
          <label htmlFor="ngo-address" className={label}>Registered Office Address {required}</label>
          <textarea
            id="ngo-address"
            rows={2}
            value={data.registeredOfficeAddress}
            aria-invalid={!!errors.registeredOfficeAddress}
            onChange={(e) => {
              onChange({ registeredOfficeAddress: e.target.value });
              if (errors.registeredOfficeAddress) setErrors((p) => ({ ...p, registeredOfficeAddress: "" }));
            }}
            className={cn(controlClass, "resize-none", errors.registeredOfficeAddress && "border-red-400 focus-visible:border-red-400 focus-visible:outline-red-400")}
          />
          {field("registeredOfficeAddress")}
        </div>

        {/* 9. Organization Email Address */}
        <div className="space-y-1">
          <label htmlFor="ngo-org-email" className={label}>Organization Email Address {required}</label>
          <input
            id="ngo-org-email"
            type="email"
            autoComplete="email"
            value={data.officialEmail ?? ""}
            aria-invalid={!!errors.officialEmail}
            onChange={(e) => {
              onChange({ officialEmail: e.target.value });
              if (errors.officialEmail) setErrors((p) => ({ ...p, officialEmail: "" }));
            }}
            className={cn(controlClass, errors.officialEmail && "border-red-400 focus-visible:border-red-400 focus-visible:outline-red-400")}
          />
          {field("officialEmail")}
        </div>

        {/* 10. Organization Phone Number */}
        <div className="space-y-1">
          <label htmlFor="ngo-org-phone" className={label}>Organization Phone Number {required}</label>
          <IndianPhoneInput
            id="ngo-org-phone"
            value={data.organizationPhone ?? ""}
            hasError={!!errors.organizationPhone}
            aria-invalid={!!errors.organizationPhone}
            onChange={(formattedVal) => {
              onChange({ organizationPhone: formattedVal });
              // Shown as the number is typed: a wrong first digit at once, a short number once it has 10 digits' worth.
              const digits = fieldText(formattedVal).replace(/\D/g, "").replace(/^91(?=\d{10})/, "");
              const instant = digits && !/^[6-9]/.test(digits) ? mobileError(formattedVal) : digits.length >= 10 ? mobileError(formattedVal) : "";
              setErrors((p) => ({ ...p, organizationPhone: instant }));
            }}
          />
          {field("organizationPhone")}
        </div>

        {/* 10. About us */}
        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="ngo-about-us" className={label}>About us {!data.aboutUsOptional && required}</label>
          <p id="ngo-about-us-hint" className="text-xs text-stone-500 dark:text-stone-400">
            What your NGO does, how you do it, your purpose and the causes you work for. Donors read this on your page.
          </p>
          <textarea
            id="ngo-about-us"
            rows={5}
            maxLength={ABOUT_US_MAX}
            value={data.aboutUs ?? ""}
            aria-invalid={!!errors.aboutUs}
            aria-describedby="ngo-about-us-hint ngo-about-us-count"
            onChange={(e) => {
              onChange({ aboutUs: e.target.value });
              if (errors.aboutUs) setErrors((p) => ({ ...p, aboutUs: "" }));
            }}
            className={cn(controlClass, "min-h-[120px] resize-y", errors.aboutUs && "border-red-400 focus-visible:border-red-400 focus-visible:outline-red-400")}
          />
          <p id="ngo-about-us-count" aria-live="polite" className={cn("text-right text-xs",
            (data.aboutUs ?? "").trim().length < ABOUT_US_MIN ? "text-stone-500 dark:text-stone-400" : "text-ngo-700 dark:text-ngo-300")}>
            {(data.aboutUs ?? "").trim().length} / {ABOUT_US_MAX}{(data.aboutUs ?? "").trim().length < ABOUT_US_MIN ? ` (at least ${ABOUT_US_MIN})` : ""}
          </p>
          {field("aboutUs")}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col items-end gap-2 pt-2">
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-zinc-700 bg-transparent px-4 py-2.5 text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700/40"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={missing.length > 0}
            className="flex items-center gap-1.5 rounded-xl bg-ngo-700 disabled:bg-stone-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed hover:bg-ngo-600 active:bg-ngo-800 px-5 py-2.5 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700/40"
          >
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {missing.length > 0 && (
          <p className="text-3xs text-stone-500 dark:text-stone-400 text-right pr-1">
            Still needed: {missing.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
