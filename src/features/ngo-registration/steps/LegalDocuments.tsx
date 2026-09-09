"use client";

import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import {
  getDocsForStructure,
  legalStructureLabel,
  type NGOFormState,
  type UploadedFile,
} from "@/features/ngo-registration/ngoRegistrationModel";
import { DocUploadCard } from "@/features/ngo-registration/components/DocUploadCard";

interface LegalDocumentsProps {
  data: NGOFormState;
  onChange: (patch: Partial<NGOFormState>) => void;
  onBack: () => void;
  onContinue: () => void;
}

/**
 * Step 2 — Legal Documents.
 *
 * <p>The document set is dynamically chosen from the legal structure selected
 * in Step 1. Changing the structure (via Back → Step 1) clears the documents
 * state, so stale uploads from a previous structure don't bleed through.
 */
export function LegalDocuments({ data, onChange, onBack, onContinue }: LegalDocumentsProps) {
  const docs = getDocsForStructure(data.legalStructure);
  const mustHaveDocs = docs.filter((d) => d.category === "must-have");
  const supportingDocs = docs.filter((d) => d.category === "supporting");

  // All "Must Have" docs must be uploaded to continue.
  const missingMustHave = mustHaveDocs.filter((d) => !data.documents[d.id]);

  function setDoc(id: string, file: UploadedFile | null) {
    onChange({ documents: { ...data.documents, [id]: file } });
  }

  function handleContinue() {
    if (missingMustHave.length > 0) return; // Guard — button is disabled anyway
    onContinue();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-2xs font-black uppercase tracking-widest text-[#b04a15]">
          Step 2 of 6
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
          Legal Documents
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Upload your organization&apos;s legal documents. Required documents are tagged{" "}
          <span className="font-bold text-[#b04a15]">Must Have</span>.
        </p>
      </div>

      {/* Structure badge */}
      <div className="flex items-center gap-2 rounded-lg bg-[#b04a15]/5 dark:bg-[#b04a15]/10 border border-[#b04a15]/15 px-3 py-2">
        <Info className="h-3.5 w-3.5 shrink-0 text-[#b04a15]" aria-hidden />
        <p className="text-2xs font-bold text-[#b04a15]">
          Showing documents for:{" "}
          <span className="font-black">{legalStructureLabel(data.legalStructure)}</span>
        </p>
      </div>

      {/* Must Have */}
      {mustHaveDocs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-2xs font-black uppercase tracking-widest text-stone-400">
            Must Have
          </h3>
          <div className="space-y-2.5">
            {mustHaveDocs.map((doc) => (
              <DocUploadCard
                key={doc.id}
                docId={doc.id}
                label={doc.label}
                category={doc.category}
                uploaded={data.documents[doc.id] ?? null}
                onUpload={(file) => setDoc(doc.id, file)}
                onRemove={() => setDoc(doc.id, null)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Supporting */}
      {supportingDocs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-2xs font-black uppercase tracking-widest text-stone-400">
            Supporting Documents
          </h3>
          <div className="space-y-2.5">
            {supportingDocs.map((doc) => (
              <DocUploadCard
                key={doc.id}
                docId={doc.id}
                label={doc.label}
                category={doc.category}
                uploaded={data.documents[doc.id] ?? null}
                onUpload={(file) => setDoc(doc.id, file)}
                onRemove={() => setDoc(doc.id, null)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Validation message */}
      {missingMustHave.length > 0 && (
        <p className="text-3xs text-stone-400 dark:text-stone-500 text-center">
          Upload all <span className="font-bold text-[#b04a15]">Must Have</span> documents to continue.
        </p>
      )}

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
          disabled={missingMustHave.length > 0}
          className="flex items-center gap-1.5 rounded-xl bg-[#b04a15] hover:bg-[#963c0d] disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]/40"
        >
          Continue
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
