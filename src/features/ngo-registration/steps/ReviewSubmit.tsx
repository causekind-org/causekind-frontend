"use client";

import { useMemo, useState } from "react";
import { FilePreviewDialog, type PreviewFile } from "@/components/FilePreviewDialog";
import { getNgoFileLink } from "@/lib/api";
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, FileCheck, FileText, Image as ImageIcon, Loader2, Pencil, ShieldCheck, UserCheck } from "lucide-react";
import {
  PAN_DOC,
  NGO_STEPS,
  NGO_STEP_FULL_TITLES,
  authorizationDocumentLabel,
  getRegistrationCertificateDoc,
  isRepresentativeEmpty,
  normalizePan,
  getDocsForStructure,
  legalStructureLabel,
  type NGOFormState,
  type UploadedFile,
  type NGOStep,
  getNgoStillNeededItems,
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
  /**
   * Corrections resubmission: what the NGO changed (label + new value), and how many
   * flagged items are still unchanged. Submit stays disabled until that is 0.
   */
  resubmission?: { changes: { key: string; label: string; value: string }[]; remaining: number } | null;
}

export function ReviewSubmit({ data, onChange, onBack, onEditStep, onSubmit, isSubmitting = false, submitError = null, resubmission = null }: ReviewSubmitProps) {
  const [error, setError] = useState<string | null>(null);

  const docs = getDocsForStructure(data.legalStructure);
  const uploadedDocs = docs.filter((d) => !!data.documents[d.id]);
  const activityPhotosCount = data.activityPhotos.filter(Boolean).length;

  // Every uploaded file on this page, in page order, for the preview popup.
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const previewFiles = useMemo(() => {
    const out: { key: string; file: PreviewFile }[] = [];
    const add = (key: string, label: string, f: UploadedFile | null | undefined, kind: "document" | "photo") => {
      if (!f || f.demo) return;
      const id = kind === "photo" ? f.photoId : f.documentId;
      if (id == null && !f.s3Url) return;
      out.push({ key, file: { name: `${label}: ${f.name}`, mimeType: f.mimeType,
        resolve: id != null ? async () => (await getNgoFileLink(kind, id)).url : undefined, url: id == null ? f.s3Url : undefined } });
    };
    add("pan", PAN_DOC.label, data.documents[PAN_DOC.id], "document");
    for (const d of docs) if (d.id !== PAN_DOC.id) add(`doc-${d.id}`, d.label, data.documents[d.id], "document");
    (data.representatives ?? []).forEach((r, i) => add(`rep-${i}`, `${r.fullName || `Representative ${i + 1}`} ID proof`, r.idProof, "document"));
    add("auth", authorizationDocumentLabel(data.legalStructure), data.authorizationLetter, "document");
    add("logo", "Logo", data.logo, "photo");
    add("office", "Office photo", data.officePhoto, "photo");
    data.activityPhotos.forEach((f, i) => add(`activity-${i}`, `Activity photo ${i + 1}`, f, "photo"));
    return out;
  }, [data, docs]);
  const openPreview = (key: string) => {
    const i = previewFiles.findIndex(x => x.key === key);
    if (i >= 0) setPreviewIndex(i);
  };
  /** A file name that opens the preview; plain text when the file can't be previewed. */
  const fileChip = (key: string, f: UploadedFile | null | undefined, empty = "Not uploaded") => {
    if (!f) return <span className="text-stone-400 italic">{empty}</span>;
    const canPreview = previewFiles.some(x => x.key === key);
    if (!canPreview) return <span className="truncate">{f.demo ? "Demo upload" : f.name}</span>;
    return (
      <button type="button" onClick={() => openPreview(key)} data-testid={`preview-${key}`}
        className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-ngo-200 bg-white px-2.5 py-1 text-2xs font-semibold text-ngo-800 hover:bg-ngo-50 focus-visible:outline-2 focus-visible:outline-ngo-700 dark:border-ngo-900 dark:bg-zinc-900 dark:text-ngo-300">
        <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden /><span className="truncate">{f.name}</span>
      </button>
    );
  };

  function handleSubmit() {
    if (!data.confirmationChecked) {
      setError("Please check the declaration box before submitting.");
      return;
    }
    setError(null);
    onSubmit();
  }

  const incompleteSteps = (["org-details", "legal-documents", "authorized-rep", "org-photos"] as NGOStep[]).filter(
    (step) => getNgoStillNeededItems(step, data).length > 0
  );
  const prevStepsComplete = incompleteSteps.length === 0;

  return (
    <div className="space-y-6">
      <FilePreviewDialog files={previewFiles.map(x => x.file)} index={previewIndex} onIndexChange={setPreviewIndex} onClose={() => setPreviewIndex(null)} />
      {/* Header */}
      <div className="space-y-1">
        <span className="text-2xs font-black uppercase tracking-widest text-ngo-700 dark:text-ngo-300">
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
        <section className="rounded-xl border border-[#EADBCE] bg-[#FAF7F2] p-4 dark:border-emerald-950/80 dark:bg-[#141E18]">
          <div className="flex items-center justify-between gap-2 border-b border-stone-200/60 dark:border-zinc-800/80 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ngo-100 text-ngo-700 dark:bg-ngo-900/40 dark:text-ngo-300 text-xs">
                1
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Organization Details
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onEditStep("org-details")}
              className="inline-flex items-center gap-1 text-2xs font-bold text-ngo-700 dark:text-ngo-300 hover:underline underline-offset-2"
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
              <dt className="text-stone-400 text-3xs uppercase font-semibold">PAN Number</dt>
              <dd className="font-bold font-mono text-stone-800 dark:text-stone-200 mt-0.5">
                {normalizePan(data.panNumber ?? "") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-stone-400 text-3xs uppercase font-semibold">{PAN_DOC.label}</dt>
              <dd className="font-medium text-stone-700 dark:text-stone-300 mt-0.5 truncate">
                {fileChip("pan", data.documents[PAN_DOC.id])}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-stone-400 text-3xs uppercase font-semibold">
                {getRegistrationCertificateDoc(data.legalStructure)?.label ?? "Registration certificate"}
              </dt>
              <dd className="font-medium text-stone-700 dark:text-stone-300 mt-0.5 truncate">
                {(() => {
                  const cert = getRegistrationCertificateDoc(data.legalStructure);
                  return cert ? fileChip(`doc-${cert.id}`, data.documents[cert.id]) : "Not uploaded";
                })()}
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
            <div className="sm:col-span-2">
              <dt className="text-stone-400 text-3xs uppercase font-semibold">Organization Email Address</dt>
              <dd className="font-bold text-stone-800 dark:text-stone-200 mt-0.5">
                {data.officialEmail || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-stone-400 text-3xs uppercase font-semibold">Organization Phone Number</dt>
              <dd className="font-bold font-mono text-stone-800 dark:text-stone-200 mt-0.5">
                {data.organizationPhone || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-stone-400 text-3xs uppercase font-semibold">About us</dt>
              <dd className="mt-0.5 whitespace-pre-line text-stone-800 dark:text-stone-200">
                {data.aboutUs?.trim() || "—"}
              </dd>
            </div>
          </dl>
        </section>

        {/* Section 2: Legal Documents */}
        <section className="rounded-xl border border-[#EADBCE] bg-[#FAF7F2] p-4 dark:border-emerald-950/80 dark:bg-[#141E18]">
          <div className="flex items-center justify-between gap-2 border-b border-stone-200/60 dark:border-zinc-800/80 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ngo-100 text-ngo-700 dark:bg-ngo-900/40 dark:text-ngo-300 text-xs">
                2
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Legal Documents
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onEditStep("legal-documents")}
              className="inline-flex items-center gap-1 text-2xs font-bold text-ngo-700 dark:text-ngo-300 hover:underline underline-offset-2"
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
                      <span className="ml-2 min-w-0 shrink-0">
                        {doc.id === PAN_DOC.id ? fileChip("pan", file) : fileChip(`doc-${doc.id}`, file)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Section 3: Authorized Representative */}
        <section className="rounded-xl border border-[#EADBCE] bg-[#FAF7F2] p-4 dark:border-emerald-950/80 dark:bg-[#141E18]">
          <div className="flex items-center justify-between gap-2 border-b border-stone-200/60 dark:border-zinc-800/80 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ngo-100 text-ngo-700 dark:bg-ngo-900/40 dark:text-ngo-300 text-xs">
                3
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Authorized Representatives
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onEditStep("authorized-rep")}
              className="inline-flex items-center gap-1 text-2xs font-bold text-ngo-700 dark:text-ngo-300 hover:underline underline-offset-2"
              aria-label="Edit authorized representative"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>

          <ul className="grid gap-3 lg:grid-cols-2">
            {(data.representatives ?? []).map((card, i) => ({ card, i })).filter(({ card, i }) => i === 0 || !isRepresentativeEmpty(card)).map(({ card, i }) => (
              <li key={i} data-testid="review-representative" className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100">{card.fullName || "—"}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">{card.designation || "—"}{i === 0 ? " · Main contact" : ""}</p>
                <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2.5 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-3xs font-semibold uppercase text-stone-400">Mobile</dt>
                    <dd className="mt-0.5 font-mono text-stone-800 dark:text-stone-200">{card.mobileNumber || "—"}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-3xs font-semibold uppercase text-stone-400">Email</dt>
                    <dd className="mt-0.5 break-all text-stone-800 dark:text-stone-200">
                      {card.email || "—"}{" "}
                      {card.emailVerified ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden />verified
                        </span>
                      ) : <span className="font-bold text-red-600 dark:text-red-400">not verified</span>}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-3xs font-semibold uppercase text-stone-400">PAN</dt>
                    <dd className="mt-0.5 font-mono text-stone-800 dark:text-stone-200">
                      {normalizePan(card.panNumber) || (
                        <button
                          type="button"
                          onClick={() => onEditStep("authorized-rep")}
                          className="text-red-600 dark:text-red-400 font-semibold underline underline-offset-2 hover:text-red-700"
                        >
                          Missing — enter in Step 3
                        </button>
                      )}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-3xs font-semibold uppercase text-stone-400">ID proof</dt>
                    <dd className="mt-0.5">{fileChip(`rep-${i}`, card.idProof)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          <div className="mt-4 text-xs">
            <p className="text-3xs font-semibold uppercase text-stone-400">{authorizationDocumentLabel(data.legalStructure)}</p>
            <div className="mt-1">{fileChip("auth", data.authorizationLetter, "Not attached")}</div>
          </div>
        </section>

        {/* Section 4: Organization Photos */}
        <section className="rounded-xl border border-[#EADBCE] bg-[#FAF7F2] p-4 dark:border-emerald-950/80 dark:bg-[#141E18]">
          <div className="flex items-center justify-between gap-2 border-b border-stone-200/60 dark:border-zinc-800/80 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ngo-100 text-ngo-700 dark:bg-ngo-900/40 dark:text-ngo-300 text-xs">
                4
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Organization Photos
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onEditStep("org-photos")}
              className="inline-flex items-center gap-1 text-2xs font-bold text-ngo-700 dark:text-ngo-300 hover:underline underline-offset-2"
              aria-label="Edit photos"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-white dark:bg-zinc-800/60 p-2.5 border border-stone-100 dark:border-zinc-800">
              <p className="text-3xs uppercase text-stone-400 font-semibold">Logo</p>
              <div className="mt-1">{fileChip("logo", data.logo, "None")}</div>
            </div>
            <div className="rounded-lg bg-white dark:bg-zinc-800/60 p-2.5 border border-stone-100 dark:border-zinc-800">
              <p className="text-3xs uppercase text-stone-400 font-semibold">Office Photo</p>
              <div className="mt-1">{fileChip("office", data.officePhoto, "None")}</div>
            </div>
            <div className="rounded-lg bg-white dark:bg-zinc-800/60 p-2.5 border border-stone-100 dark:border-zinc-800">
              <p className="text-3xs uppercase text-stone-400 font-semibold">Activity Photos</p>
              {activityPhotosCount > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {data.activityPhotos.map((f, i) => f ? <span key={i}>{fileChip(`activity-${i}`, f)}</span> : null)}
                </div>
              ) : <p className="mt-1 font-bold text-stone-800 dark:text-stone-200">None</p>}
            </div>
          </div>
        </section>

        {/* Confirmation Checkbox */}
        <div className="rounded-xl border border-ngo-300/40 bg-ngo-50/60 dark:bg-ngo-950/20 p-4 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="ngo-confirmation-check"
              checked={data.confirmationChecked}
              onChange={(e) => {
                onChange({ confirmationChecked: e.target.checked });
                if (error) setError(null);
              }}
              className="mt-1 h-4 w-4 rounded border-stone-300 accent-ngo-700 cursor-pointer"
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

      {resubmission && (
        <section aria-label="What you changed" data-testid="what-you-changed" className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-stone-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-stone-200">
          <h3 className="text-sm font-bold">What you changed</h3>
          {resubmission.changes.length === 0
            ? <p className="mt-1 text-stone-500">Nothing yet. Fix the items our team flagged.</p>
            : <ul className="mt-2 space-y-1">{resubmission.changes.map((c) => (
                <li key={c.key}><span className="font-semibold">{c.label}:</span> <span className="break-words">{c.value}</span></li>
              ))}</ul>}
          {resubmission.remaining > 0 && (
            <p role="alert" className="mt-2 font-semibold text-amber-800 dark:text-amber-300">
              {resubmission.remaining === 1 ? "1 flagged item still needs a change" : `${resubmission.remaining} flagged items still need a change`} before you can resubmit.
            </p>
          )}
        </section>
      )}

      {/* Navigation */}
      <div className="flex flex-col items-end gap-2 pt-2">
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-zinc-700 bg-transparent px-4 py-2.5 text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!data.confirmationChecked || !prevStepsComplete || isSubmitting || (!!resubmission && resubmission.remaining > 0)}
            className="flex items-center gap-2 rounded-xl bg-ngo-700 hover:bg-ngo-600 active:bg-ngo-800 disabled:bg-stone-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed px-6 py-2.5 text-sm font-bold text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700/40 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                {resubmission ? "Resubmit Application" : "Submit Application"}
              </>
            )}
          </button>
        </div>
        {!prevStepsComplete && (
          <div role="alert" className="w-full rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/40 p-4 text-xs text-amber-900 dark:text-amber-100">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              Please complete the required items before submitting:
            </p>
            <ul className="mt-2 space-y-1.5 pl-5 list-disc">
              {incompleteSteps.flatMap((step) =>
                getNgoStillNeededItems(step, data).map((item) => (
                  <li key={`${step}-${item}`}>
                    <button
                      type="button"
                      onClick={() => onEditStep(step)}
                      className="font-semibold underline underline-offset-2 hover:text-ngo-700 dark:hover:text-ngo-300"
                    >
                      {item}
                    </button>
                    <span className="text-stone-500 dark:text-stone-400 font-normal">
                      {" "}({NGO_STEP_FULL_TITLES[step]} — Step {NGO_STEPS.indexOf(step) + 1})
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
