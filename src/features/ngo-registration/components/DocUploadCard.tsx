"use client";

import { useRef, useState } from "react";
import { Upload, Check, FileText, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  IS_NGO_DEMO_MODE,
  getNextDemoDocId,
  type DocCategory,
  type UploadedFile,
} from "@/features/ngo-registration/ngoRegistrationModel";
import { uploadNgoDocument } from "@/lib/api";

interface DocUploadCardProps {
  docId: string;
  label: string;
  category: DocCategory;
  uploaded: UploadedFile | null;
  onUpload: (file: UploadedFile) => void;
  onRemove: () => void;
}

/**
 * Reusable document upload card for the NGO registration flow.
 *
 * <p>Uploads real files (PDF/JPEG/PNG) to the backend via
 * {@code POST /api/v1/ngo-registration/documents/upload}, showing in-flight
 * progress, per-card error states, and a retry action on failure.
 */
export function DocUploadCard({
  docId,
  label,
  category,
  uploaded,
  onUpload,
  onRemove,
}: DocUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);

  async function performUpload(file: File) {
    setIsUploading(true);
    setUploadError(null);
    setLastFile(file);

    // TEMPORARY: Demo Mode — skip real S3 upload when demo flag is active
    if (IS_NGO_DEMO_MODE) {
      setTimeout(() => {
        onUpload({
          name: file.name,
          documentId: getNextDemoDocId(),
          s3Key: `demo/documents/${docId}`,
          s3Url: undefined,
          size: file.size,
          mimeType: file.type || "application/pdf",
          demo: true,
        });
        setIsUploading(false);
      }, 400);
      return;
    }

    try {
      const res = await uploadNgoDocument(file, docId, category);
      onUpload({
        name: file.name,
        documentId: res.documentId,
        s3Key: res.s3Key,
        s3Url: res.fileUrl ?? undefined,
        size: file.size,
        mimeType: file.type,
        demo: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed. Please check the file and try again.";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  }


  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    performUpload(files[0]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  const mustHave = category === "must-have";

  if (uploaded) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/20 p-3.5 transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
                {label}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-2xs text-green-700 dark:text-green-400 font-medium truncate">
                <FileText className="h-3 w-3 shrink-0" aria-hidden />
                {uploaded.demo ? (uploaded.name || "Demo upload") : uploaded.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 text-2xs font-bold text-stone-400 hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]/40 rounded px-1"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50/60 dark:bg-zinc-900/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3.5 pt-3 pb-1.5">
        <p className="text-xs font-bold text-stone-800 dark:text-stone-200">{label}</p>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-3xs font-black uppercase tracking-wide",
            mustHave
              ? "bg-[#b04a15]/10 text-[#b04a15] dark:bg-[#b04a15]/20 dark:text-[#e07b3a]"
              : "bg-stone-200 text-stone-500 dark:bg-zinc-700 dark:text-stone-400"
          )}
        >
          {mustHave ? "Must Have" : "Supporting"}
        </span>
      </div>

      {/* Drop zone / Uploading State */}
      <div
        onDragOver={(e) => {
          if (isUploading) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          if (isUploading) return;
          handleDrop(e);
        }}
        className={cn(
          "mx-3 mb-3 rounded-lg border-2 border-dashed transition-colors",
          isUploading
            ? "border-[#b04a15]/40 bg-[#b04a15]/5 cursor-wait"
            : dragging
            ? "border-[#b04a15] bg-[#b04a15]/5 cursor-pointer"
            : "border-stone-200 dark:border-zinc-700 hover:border-[#b04a15]/50 hover:bg-[#b04a15]/[0.03] cursor-pointer"
        )}
        onClick={() => {
          if (!isUploading) inputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        aria-label={`Upload ${label}`}
        onKeyDown={(e) => {
          if (!isUploading && (e.key === "Enter" || e.key === " ")) {
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          id={`doc-upload-${docId}`}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="sr-only"
          disabled={isUploading}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center justify-center gap-1 py-4 px-3 text-center">
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-[#b04a15]" aria-hidden />
              <p className="text-2xs font-bold text-[#b04a15]">
                Uploading & scanning document…
              </p>
              <p className="text-3xs text-stone-400 dark:text-stone-500">
                Running antivirus and format verification
              </p>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 text-stone-400 dark:text-stone-500" aria-hidden />
              <p className="text-2xs font-semibold text-stone-500 dark:text-stone-400">
                Click or drag to upload
              </p>
              <p className="text-3xs text-stone-400 dark:text-stone-500">
                PDF, JPG, PNG or WebP · Max 10 MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* TEMPORARY: Demo Mode shortcut — instant complete on click */}
      {IS_NGO_DEMO_MODE && (
        <div className="border-t border-stone-200/70 dark:border-zinc-800 px-3.5 py-1.5 flex items-center justify-between bg-stone-100/50 dark:bg-zinc-800/40">
          <span className="text-3xs font-medium text-stone-400 dark:text-stone-500">Demo mode active</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpload({
                name: `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-demo.pdf`,
                documentId: getNextDemoDocId(),
                s3Key: `demo/documents/${docId}`,
                s3Url: undefined,
                size: 1024 * 180,
                mimeType: "application/pdf",
                demo: true,
              });
            }}
            className="text-3xs font-bold text-[#b04a15] dark:text-[#e07b3a] hover:underline underline-offset-2"
          >
            Mark as uploaded ✓
          </button>
        </div>
      )}

      {/* Error state with retry */}
      {uploadError && (
        <div className="border-t border-red-100 dark:border-red-950/50 bg-red-50/70 dark:bg-red-950/20 px-3.5 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-3xs text-red-700 dark:text-red-300 font-medium truncate">
              {uploadError}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (lastFile) {
                performUpload(lastFile);
              } else {
                inputRef.current?.click();
              }
            }}
            className="shrink-0 inline-flex items-center gap-1 text-3xs font-bold text-red-700 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200 underline underline-offset-2"
          >
            <RefreshCw className="h-2.5 w-2.5" /> Retry
          </button>
        </div>
      )}
    </div>
  );
}
