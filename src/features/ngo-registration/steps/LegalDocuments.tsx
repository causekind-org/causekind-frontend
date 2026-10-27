"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import {
  getDocsForStructure,
  legalStructureLabel,
  type NGOFormState,
  type UploadedFile,
} from "@/features/ngo-registration/ngoRegistrationModel";
import { DocUploadCard } from "@/features/ngo-registration/components/DocUploadCard";
import { CorrectionNote, type NgoCorrections } from "@/features/ngo-registration/components/CorrectionNote";
import { FilePreviewDialog, type PreviewFile } from "@/components/FilePreviewDialog";
import { getNgoFileLink } from "@/lib/api";

interface LegalDocumentsProps {
  data: NGOFormState;
  onChange: (patch: Partial<NGOFormState>) => void;
  onBack: () => void;
  onContinue: () => void;
  /** Items a reviewer asked to fix, with their notes (shown next to each). */
  corrections?: NgoCorrections;
}

/**
 * Step 2 — Legal Documents.
 *
 * The document set is dynamically chosen from the legal structure selected
 * in Step 1. Changing the structure (via Back → Step 1) clears the documents
 * state, so stale uploads from a previous structure don't bleed through.
 */
export function LegalDocuments({ data, onChange, onBack, onContinue, corrections }: LegalDocumentsProps) {
  const docs = getDocsForStructure(data.legalStructure);
  const mustHaveDocs = docs.filter((d) => d.category === "must-have");
  const supportingDocs = docs.filter((d) => d.category === "supporting");

  // All "Must Have" docs must be uploaded to continue.
  const missingMustHave = mustHaveDocs.filter((d) => !data.documents[d.id]);

  // Full-size preview dialog for all uploaded files in this step
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const previewFiles = useMemo(() => {
    const out: { id: string; file: PreviewFile }[] = [];
    for (const d of docs) {
      const f = data.documents[d.id];
      if (f && !f.demo) {
        out.push({
          id: d.id,
          file: {
            name: `${d.label}: ${f.name}`,
            mimeType: f.mimeType,
            resolve: f.documentId != null ? async () => (await getNgoFileLink("document", f.documentId!)).url : undefined,
            url: f.documentId == null ? f.s3Url : undefined,
          },
        });
      }
    }
    return out;
  }, [docs, data.documents]);

  const openPreview = (id: string) => {
    const idx = previewFiles.findIndex((x) => x.id === id);
    if (idx >= 0) setPreviewIndex(idx);
  };

  function setDoc(id: string, file: UploadedFile | null) {
    onChange({ documents: { ...data.documents, [id]: file } });
  }

  function handleContinue() {
    if (missingMustHave.length > 0) return; // Guard — button is disabled anyway
    onContinue();
  }

  return (
    <div className="space-y-6">
      <FilePreviewDialog
        files={previewFiles.map((x) => x.file)}
        index={previewIndex}
        onIndexChange={setPreviewIndex}
        onClose={() => setPreviewIndex(null)}
      />

      {/* Header */}
      <div className="space-y-1">
        <span className="text-2xs font-black uppercase tracking-widest text-ngo-700 dark:text-ngo-300">
          Step 2 of 6
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
          Legal Documents
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Upload your organization&apos;s legal documents.
        </p>
      </div>

      {/* Structure badge */}
      <div className="flex items-center gap-2 rounded-lg bg-ngo-50 dark:bg-ngo-900/30 border border-ngo-300/40 dark:border-ngo-700/40 px-3 py-2">
        <Info className="h-3.5 w-3.5 shrink-0 text-ngo-700 dark:text-ngo-300" aria-hidden />
        <p className="text-2xs font-bold text-ngo-700 dark:text-ngo-300">
          Showing documents for:{" "}
          <span className="font-black">{legalStructureLabel(data.legalStructure)}</span>
        </p>
      </div>

      {/* Must Have */}
      {mustHaveDocs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-2xs font-black uppercase tracking-widest text-stone-400">
            Required
          </h3>
          <div className="space-y-2.5">
            {mustHaveDocs.map((doc) => (
              <div key={doc.id}>
                <DocUploadCard
                  docId={doc.id}
                  label={doc.label}
                  category={doc.category}
                  hint={doc.hint}
                  uploaded={data.documents[doc.id] ?? null}
                  onUpload={(file) => setDoc(doc.id, file)}
                  onRemove={() => setDoc(doc.id, null)}
                  onPreview={() => openPreview(doc.id)}
                />
                <CorrectionNote note={corrections?.[`documents.${doc.id}`]} field={`documents.${doc.id}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supporting */}
      {supportingDocs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-2xs font-black uppercase tracking-widest text-stone-400">
            Optional (a plus for reviewers)
          </h3>
          <div className="space-y-2.5">
            {supportingDocs.map((doc) => (
              <div key={doc.id}>
                <DocUploadCard
                  docId={doc.id}
                  label={doc.label}
                  category={doc.category}
                  hint={doc.hint}
                  uploaded={data.documents[doc.id] ?? null}
                  onUpload={(file) => setDoc(doc.id, file)}
                  onRemove={() => setDoc(doc.id, null)}
                  onPreview={() => openPreview(doc.id)}
                />
                <CorrectionNote note={corrections?.[`documents.${doc.id}`]} field={`documents.${doc.id}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation message */}
      {missingMustHave.length > 0 && (
        <p className="text-3xs text-stone-400 dark:text-stone-500 text-center">
          Upload all <span className="font-bold text-ngo-700 dark:text-ngo-300">Required</span> documents to continue.
        </p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 pt-2">
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
          disabled={missingMustHave.length > 0}
          className="flex items-center gap-1.5 rounded-xl bg-ngo-700 hover:bg-ngo-600 active:bg-ngo-800 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700/40"
        >
          Continue
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
