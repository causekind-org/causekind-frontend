"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  LEGAL_STRUCTURES,
  type LegalStructure,
  type NGOFormState,
} from "@/features/ngo-registration/ngoRegistrationModel";
import { LegalStructureCard } from "@/features/ngo-registration/components/LegalStructureCard";
import { controlClass } from "@/features/wizard-kit/WizardField";
import { cn } from "@/lib/utils";

interface OrgDetailsProps {
  data: NGOFormState;
  onChange: (patch: Partial<NGOFormState>) => void;
  onBack: () => void;
  onContinue: () => void;
}

/** Step 1 — Organization Details */
export function OrgDetails({ data, onChange, onBack, onContinue }: OrgDetailsProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!data.organizationName.trim()) next.organizationName = "Organization name is required.";
    if (!data.legalStructure) next.legalStructure = "Please select a legal structure.";
    if (!data.registrationNumber.trim()) next.registrationNumber = "Registration number is required.";
    if (!data.registeredOfficeAddress.trim()) next.registeredOfficeAddress = "Registered office address is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleContinue() {
    if (validate()) onContinue();
  }

  function field(key: keyof typeof errors) {
    return errors[key] ? (
      <p className="mt-1 text-3xs font-semibold text-red-600 dark:text-red-400">{errors[key]}</p>
    ) : null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-2xs font-black uppercase tracking-widest text-[#b04a15]">
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
        {/* Organization Name */}
        <div className="space-y-1">
          <label htmlFor="ngo-org-name" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
            Organization Name <span className="text-[#b04a15]" aria-hidden>*</span>
          </label>
          <input
            id="ngo-org-name"
            type="text"
            autoComplete="organization"
            placeholder="e.g. Helping Hands Trust"
            value={data.organizationName}
            aria-invalid={!!errors.organizationName}
            onChange={(e) => {
              onChange({ organizationName: e.target.value });
              if (errors.organizationName) setErrors((p) => ({ ...p, organizationName: "" }));
            }}
            className={cn(
              controlClass,
              errors.organizationName && "border-red-400 focus-visible:border-red-400 focus-visible:outline-red-400"
            )}
          />
          {field("organizationName")}
        </div>

        {/* Legal Structure */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Legal Structure <span className="text-[#b04a15]" aria-hidden>*</span>
          </p>
          <div
            role="radiogroup"
            aria-label="Legal Structure"
            className="grid grid-cols-1 sm:grid-cols-3 gap-2"
          >
            {LEGAL_STRUCTURES.map((s) => (
              <LegalStructureCard
                key={s.id}
                structure={s}
                selected={data.legalStructure === s.id}
                onSelect={() => {
                  onChange({ legalStructure: s.id as LegalStructure, documents: {} });
                  if (errors.legalStructure) setErrors((p) => ({ ...p, legalStructure: "" }));
                }}
              />
            ))}
          </div>
          {field("legalStructure")}
        </div>

        {/* Registration Number */}
        <div className="space-y-1">
          <label htmlFor="ngo-reg-no" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
            Registration Number <span className="text-[#b04a15]" aria-hidden>*</span>
          </label>
          <input
            id="ngo-reg-no"
            type="text"
            placeholder="e.g. MH/TRU/2018/12345"
            value={data.registrationNumber}
            aria-invalid={!!errors.registrationNumber}
            onChange={(e) => {
              onChange({ registrationNumber: e.target.value });
              if (errors.registrationNumber) setErrors((p) => ({ ...p, registrationNumber: "" }));
            }}
            className={cn(
              controlClass,
              errors.registrationNumber && "border-red-400 focus-visible:border-red-400 focus-visible:outline-red-400"
            )}
          />
          {field("registrationNumber")}
        </div>

        {/* Registered Office Address */}
        <div className="space-y-1">
          <label htmlFor="ngo-address" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
            Registered Office Address <span className="text-[#b04a15]" aria-hidden>*</span>
          </label>
          <textarea
            id="ngo-address"
            rows={2}
            placeholder="Street, City, State, PIN"
            value={data.registeredOfficeAddress}
            aria-invalid={!!errors.registeredOfficeAddress}
            onChange={(e) => {
              onChange({ registeredOfficeAddress: e.target.value });
              if (errors.registeredOfficeAddress) setErrors((p) => ({ ...p, registeredOfficeAddress: "" }));
            }}
            className={cn(
              controlClass,
              "resize-none",
              errors.registeredOfficeAddress && "border-red-400 focus-visible:border-red-400 focus-visible:outline-red-400"
            )}
          />
          {field("registeredOfficeAddress")}
        </div>

        {/* Year of Establishment (optional) */}
        <div className="space-y-1">
          <label htmlFor="ngo-year" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
            Year of Establishment
          </label>
          <input
            id="ngo-year"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 2012"
            maxLength={4}
            value={data.yearOfEstablishment}
            onChange={(e) => onChange({ yearOfEstablishment: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            className={controlClass}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-zinc-700 bg-transparent px-4 py-2.5 text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]/40"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="flex items-center gap-1.5 rounded-xl bg-[#b04a15] hover:bg-[#963c0d] px-5 py-2.5 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]/40"
        >
          Continue
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
