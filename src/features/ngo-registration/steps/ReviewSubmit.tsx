"use client";

import { useState } from "react";
import { ArrowLeft, Check, CheckCircle2, FileCheck, FileText, Image as ImageIcon, Loader2, Pencil, ShieldCheck, UserCheck } from "lucide-react";
import {
  getDocsForStructure,
  legalStructureLabel,
  type NGOFormState,
  type NGOStep,
} from "@/features/ngo-registration/ngoRegistrationModel";

interface ReviewSubmitProps {
  data: NGOFormState;
  onChange: (patch: Partial<NGOFormState>) => void;
  onBack: () => void;
  onEditStep: (step: NGOStep) => void;
  onSubmit: () => void;
  /** True while the /submit API call is in-flight. Disables button and shows spinner. */
  isSubmitting?: boolean;
  /** Error message from the /submit API call, shown inline above the navigation. */
  submitError?: string | null;
}

export function ReviewSubmit({ data, onChange, onBack, onEditStep, onSubmit, isSubmitting = false, submitError = null }: ReviewSubmitProps) {
  const [error, setError] = useState<string | null>(null);

  const docs = getDocsForStructure(data.legalStructure);
  const uploadedDocs = docs.filter((d) => !!data.documents[d.id]);
  const activityPhotosCount = data.activityPhotos.filter(Boolean).length;

  function handleSubmit() {
    if (!data.confirmationChecked) {
      setError("Please check the declaration box before submitting.");
      return;
    }
    setError(null);
    onSubmit();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-2xs font-black uppercase tracking-widest text-[#b04a15]">
          Step 5 of 6
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
          Review & Submit
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Please review your information carefully before proceeding to email verification.
        </p>
      </div>

      <div className="space-y-4">
        {/* Section 1: Organization Details */}
        <section className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between gap-2 border-b border-stone-200/60 dark:border-zinc-800/80 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#b04a15]/10 text-[#b04a15] text-xs">
                1
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Organization Details
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onEditStep("org-details")}
              className="inline-flex items-center gap-1 text-2xs font-bold text-[#b04a15] hover:underline underline-offset-2"
              aria-label="Edit organization details"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <dt className="text-stone-400 text-3xs uppercase font-semibold">Organization Name</dt>
              <dd className="font-bold text-stone-800 dark:text-stone-200 mt-0.5">
                {data.organizationName || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-400 text-3xs uppercase font-semibold">Legal Structure</dt>
              <dd className="font-bold text-stone-800 dark:text-stone-200 mt-0.5">
                {legalStructureLabel(data.legalStructure) || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-400 text-3xs uppercase font-semibold">Registration Number</dt>
              <dd className="font-bold font-mono text-stone-800 dark:text-stone-200 mt-0.5">
                {data.registrationNumber || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-400 text-3xs uppercase font-semibold">Year of Establishment</dt>
              <dd className="font-bold text-stone-800 dark:text-stone-200 mt-0.5">
                {data.yearOfEstablishment || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-stone-400 text-3xs uppercase font-semibold">Registered Office Address</dt>
              <dd className="font-medium text-stone-700 dark:text-stone-300 mt-0.5">
                {data.registeredOfficeAddress || "—"}
              </dd>
            </div>
          </dl>
        </section>

        {/* Section 2: Legal Documents */}
        <section className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between gap-2 border-b border-stone-200/60 dark:border-zinc-800/80 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#b04a15]/10 text-[#b04a15] text-xs">
                2
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Legal Documents
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onEditStep("legal-documents")}
              className="inline-flex items-center gap-1 text-2xs font-bold text-[#b04a15] hover:underline underline-offset-2"
              aria-label="Edit legal documents"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>

          <div className="space-y-2">
            {uploadedDocs.length === 0 ? (
              <p className="text-xs text-stone-400 italic">No documents uploaded</p>
            ) : (
              <ul className="space-y-1.5">
                {uploadedDocs.map((doc) => {
                  const file = data.documents[doc.id];
                  return (
                    <li
                      key={doc.id}
                      className="flex items-center justify-between text-xs rounded-lg bg-white dark:bg-zinc-800/60 px-3 py-2 border border-stone-100 dark:border-zinc-800"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                          {doc.label}
                        </span>
                      </div>
                      <span className="shrink-0 text-3xs font-medium text-stone-500 dark:text-stone-400 ml-2">
                        {file?.demo ? "Demo Upload" : file?.name}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Section 3: Authorized Representative */}
        <section className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between gap-2 border-b border-stone-200/60 dark:border-zinc-800/80 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#b04a15]/10 text-[#b04a15] text-xs">
                3
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Authorized Representative
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onEditStep("authorized-rep")}
              className="inline-flex items-center gap-1 text-2xs font-bold text-[#b04a15] hover:underline underline-offset-2"
              aria-label="Edit authorized representative"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <dt className="text-stone-400 text-3xs uppercase font-semibold">Representative Name</dt>
              <dd className="font-bold text-stone-800 dark:text-stone-200 mt-0.5">
                {data.representativeName || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-400 text-3xs uppercase font-semibold">Designation</dt>
              <dd className="font-bold text-stone-800 dark:text-stone-200 mt-0.5">
                {data.designation || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-400 text-3xs uppercase font-semibold">Mobile Number</dt>
              <dd className="font-bold font-mono text-stone-800 dark:text-stone-200 mt-0.5">
                {data.mobileNumber || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-400 text-3xs uppercase font-semibold">Official Email</dt>
              <dd className="font-bold text-stone-800 dark:text-stone-200 mt-0.5 truncate">
                {data.officialEmail || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-stone-400 text-3xs uppercase font-semibold">Authorization Letter</dt>
              <dd className="font-medium text-stone-700 dark:text-stone-300 mt-0.5 flex items-center gap-1.5">
                {data.authorizationLetter ? (
                  <>
                    <FileCheck className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    <span>{data.authorizationLetter.demo ? "Demo Letter attached" : data.authorizationLetter.name}</span>
                  </>
                ) : (
                  <span className="text-stone-400 italic">Not attached</span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        {/* Section 4: Organization Photos */}
        <section className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between gap-2 border-b border-stone-200/60 dark:border-zinc-800/80 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#b04a15]/10 text-[#b04a15] text-xs">
                4
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Organization Photos
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onEditStep("org-photos")}
              className="inline-flex items-center gap-1 text-2xs font-bold text-[#b04a15] hover:underline underline-offset-2"
              aria-label="Edit photos"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-white dark:bg-zinc-800/60 p-2.5 border border-stone-100 dark:border-zinc-800">
              <p className="text-3xs uppercase text-stone-400 font-semibold">Logo</p>
              <p className="font-bold text-stone-800 dark:text-stone-200 truncate mt-1">
                {data.logo ? (data.logo.demo ? "Logo Provided (demo)" : data.logo.name) : "None"}
              </p>
            </div>
            <div className="rounded-lg bg-white dark:bg-zinc-800/60 p-2.5 border border-stone-100 dark:border-zinc-800">
              <p className="text-3xs uppercase text-stone-400 font-semibold">Office Photo</p>
              <p className="font-bold text-stone-800 dark:text-stone-200 truncate mt-1">
                {data.officePhoto ? (data.officePhoto.demo ? "Photo Provided (demo)" : data.officePhoto.name) : "None"}
              </p>
            </div>
            <div className="rounded-lg bg-white dark:bg-zinc-800/60 p-2.5 border border-stone-100 dark:border-zinc-800">
              <p className="text-3xs uppercase text-stone-400 font-semibold">Activity Photos</p>
              <p className="font-bold text-stone-800 dark:text-stone-200 mt-1">
                {activityPhotosCount > 0 ? `${activityPhotosCount} photo${activityPhotosCount > 1 ? "s" : ""}` : "None"}
              </p>
            </div>
          </div>
        </section>

        {/* Confirmation Checkbox */}
        <div className="rounded-xl border border-[#b04a15]/20 bg-[#b04a15]/[0.03] dark:bg-[#b04a15]/10 p-4 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="ngo-confirmation-check"
              checked={data.confirmationChecked}
              onChange={(e) => {
                onChange({ confirmationChecked: e.target.checked });
                if (error) setError(null);
              }}
              className="mt-1 h-4 w-4 rounded border-stone-300 accent-[#b04a15] cursor-pointer"
            />
            <span className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed select-none">
              I hereby declare that all information and documents submitted are true, authentic, and accurate. I confirm that I am duly authorized by the organization to register and manage this CauseKind NGO account.
            </span>
          </label>
          {error && (
            <p className="text-2xs font-semibold text-red-600 dark:text-red-400 pl-7">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Submit API error (shown if the backend call failed) */}
      {submitError && (
        <div className="rounded-xl border border-red-300 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20 px-4 py-3">
          <p className="text-xs font-semibold text-red-700 dark:text-red-400">
            {submitError}
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-zinc-700 bg-transparent px-4 py-2.5 text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!data.confirmationChecked || isSubmitting}
          className="flex items-center gap-2 rounded-xl bg-[#b04a15] hover:bg-[#963c0d] disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 text-sm font-bold text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]/40 shadow-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Submit Application
            </>
          )}
        </button>
      </div>
    </div>
  );
}
