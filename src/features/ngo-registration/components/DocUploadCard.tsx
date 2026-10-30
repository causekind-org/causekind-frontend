"use client";

import { useRef, useState, useEffect } from "react";
import { Upload, FileText, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  IS_NGO_DEMO_MODE,
  type DocCategory,
  type UploadedFile,
} from "@/features/ngo-registration/ngoRegistrationModel";
import { NGO_DOCUMENT_RULE, uploadNgoDocument, getNgoFilePreviewUrl } from "@/lib/api";
import { UploadedFilePreview, formatFileSize } from "@/features/ngo-registration/components/UploadedFilePreview";
import { FilePreviewDialog } from "@/components/FilePreviewDialog";

/** Documents: PDF, JPG or PNG, up to 10 MB (the server checks the real file too). */
export const NGO_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const DOCUMENT_EXTENSIONS = /\.(pdf|jpe?g|png)$/i;

/** Null when the file may be uploaded, otherwise the message to show. */
export function checkNgoDocumentFile(file: File): string | null {
  const typeOk = DOCUMENT_TYPES.includes(file.type) || (!file.type && DOCUMENT_EXTENSIONS.test(file.name));
  if (!typeOk || file.size > NGO_DOCUMENT_MAX_BYTES || file.size === 0) return NGO_DOCUMENT_RULE;
  return null;
}

interface DocUploadCardProps {
  docId: string;
  label: string;
  category: DocCategory;
  uploaded: UploadedFile | null;
  onUpload: (file: UploadedFile) => void;
  onRemove: () => void;
  /** Short help shown under the label. */
  hint?: string;
  /** id of the file input when the same document type appears more than once (representative ID proofs). */
  inputId?: string;
  /** Custom handler to open full-size preview within step context */
  onPreview?: () => void;
}

/**
 * Reusable document upload card for the NGO registration flow.
 *
 * Uploads PDF/JPEG/PNG to the backend via POST /api/v1/ngo-registration/documents/upload,
 * showing local immediate blob preview, uploading progress, inline thumbnail preview,
 * Replace flow (keeping old file on failure), and Remove confirmation.
 */
export function DocUploadCard({
  docId,
  label,
  category,
  uploaded,
  onUpload,
  onRemove,
  hint,
  inputId,
  onPreview,
}: DocUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [uploadingFileSize, setUploadingFileSize] = useState<number | null>(null);
  const [standalonePreviewOpen, setStandalonePreviewOpen] = useState(false);

  const [isReplacing, setIsReplacing] = useState(false);

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => {
      if (localBlobUrl && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
        try {
          URL.revokeObjectURL(localBlobUrl);
        } catch {
          // ignore
        }
      }
    };
  }, [localBlobUrl]);

  useEffect(() => {
    if (isReplacing && inputRef.current) {
      inputRef.current.click();
    }
  }, [isReplacing]);

  async function performUpload(file: File) {
    const refused = IS_NGO_DEMO_MODE ? null : checkNgoDocumentFile(file);
    if (refused) {
      setUploadError(refused);
      setLastFile(null);
      return;
    }

    // Create local blob URL immediately for instant preview when supported
    let blobUrl: string | null = null;
    if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      try {
        blobUrl = URL.createObjectURL(file);
      } catch {
        blobUrl = null;
      }
    }
    setLocalBlobUrl(blobUrl);
    setUploadingFileName(file.name);
    setUploadingFileSize(file.size);
    setIsUploading(true);
    setUploadError(null);
    setLastFile(file);

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
      setUploadError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed. Please check the file and try again.";
      setUploadError(msg);
      // If we were replacing an existing upload, keep the previous upload intact!
    } finally {
      setIsUploading(false);
      setUploadingFileName(null);
      setUploadingFileSize(null);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    performUpload(files[0]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleTriggerFileInput() {
    if (uploaded && !inputRef.current) {
      setIsReplacing(true);
    } else {
      inputRef.current?.click();
    }
  }

  function handlePreview() {
    if (onPreview) {
      onPreview();
    } else {
      setStandalonePreviewOpen(true);
    }
  }

  const mustHave = category === "must-have";

  return (
    <div className="space-y-2">
      {/* Hidden file input: only rendered when slot is empty or actively replacing */}
      {(!uploaded || isReplacing) && (
        <input
          ref={inputRef}
          id={inputId ?? `doc-upload-${docId}`}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="sr-only"
          disabled={isUploading}
          onChange={(e) => {
            setIsReplacing(false);
            handleFiles(e.target.files);
          }}
        />
      )}

      {/* Standalone preview dialog fallback if parent step doesn't host one */}
      {standalonePreviewOpen && uploaded && !onPreview && (
        <FilePreviewDialog
          files={[
            {
              name: `${label}: ${uploaded.name}`,
              mimeType: uploaded.mimeType,
              resolve:
                uploaded.documentId != null
                  ? async () => await getNgoFilePreviewUrl("document", uploaded.documentId!)
                  : undefined,
              url: uploaded.documentId == null ? uploaded.s3Url : undefined,
            },
          ]}
          index={0}
          onIndexChange={() => {}}
          onClose={() => setStandalonePreviewOpen(false)}
        />
      )}

      {/* Uploading State with Immediate Local Preview */}
      {isUploading ? (
        <div className="rounded-xl border border-ngo-300 bg-[#FAF7F2] p-4 dark:border-emerald-900/60 dark:bg-[#141E18]">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden border border-stone-200 dark:border-zinc-700 bg-stone-100 dark:bg-zinc-800 flex items-center justify-center">
              {localBlobUrl && (!uploadingFileName || !uploadingFileName.toLowerCase().endsWith(".pdf")) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={localBlobUrl}
                  alt={`Uploading preview of ${label}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <FileText className="h-6 w-6 text-stone-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-ngo-700 dark:text-ngo-300 shrink-0" />
                <p className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
                  Uploading {uploadingFileName ?? label}…
                </p>
              </div>
              <p className="mt-0.5 text-3xs text-stone-500 dark:text-stone-400">
                {uploadingFileSize ? formatFileSize(uploadingFileSize) + " • " : ""}
                Running antivirus and format verification
              </p>
            </div>
          </div>
        </div>
      ) : uploaded ? (
        /* Uploaded State: Shared Inline Preview */
        <div>
          <UploadedFilePreview
            file={uploaded}
            label={label}
            kind="document"
            localBlobUrl={localBlobUrl}
            onPreview={handlePreview}
            onReplace={handleTriggerFileInput}
            onRemove={() => {
              setLocalBlobUrl(null);
              onRemove();
            }}
          />
          {uploadError && (
            <div className="mt-1.5 rounded-lg border border-red-200 bg-red-50 p-2 text-2xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Replacement failed: {uploadError} (kept previous file)
              </span>
              <button
                type="button"
                onClick={() => {
                  if (lastFile) performUpload(lastFile);
                  else handleTriggerFileInput();
                }}
                className="shrink-0 font-bold underline"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty Dropzone State */
        <div className="rounded-xl border border-[#EADBCE] dark:border-emerald-950/80 bg-[#FAF7F2] dark:bg-[#141E18] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-3.5 pt-3 pb-1.5">
            <div className="min-w-0">
              <p className="text-xs font-bold text-stone-800 dark:text-stone-200">{label}</p>
              {hint && <p className="mt-0.5 text-3xs text-stone-500 dark:text-stone-400">{hint}</p>}
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-3xs font-black uppercase tracking-wide",
                mustHave
                  ? "bg-ngo-50 text-ngo-700 dark:bg-ngo-900/40 dark:text-ngo-300"
                  : "bg-stone-200 text-stone-500 dark:bg-zinc-700 dark:text-stone-400"
              )}
            >
              {mustHave ? "Required" : "Optional"}
            </span>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={handleTriggerFileInput}
            role="button"
            tabIndex={0}
            aria-label={`Upload ${label}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleTriggerFileInput();
              }
            }}
            className={cn(
              "mx-3 mb-3 min-h-[60px] rounded-lg border-2 border-dashed transition-colors",
              dragging
                ? "border-ngo-700 bg-ngo-700/5 cursor-pointer"
                : "border-[#EADBCE] dark:border-emerald-950/60 hover:border-ngo-700/50 hover:bg-ngo-50/50 cursor-pointer"
            )}
          >
            <div className="flex flex-col items-center justify-center gap-1 py-4 px-3 text-center">
              <Upload className="h-5 w-5 text-stone-400 dark:text-stone-500" aria-hidden />
              <p className="text-2xs font-semibold text-stone-500 dark:text-stone-400">
                Click or drag to upload
              </p>
              <p className="text-3xs text-stone-400 dark:text-stone-500">
                PDF, JPG or PNG · Max 10 MB
              </p>
            </div>
          </div>

          {/* Demo Mode shortcut */}
          {IS_NGO_DEMO_MODE && (
            <div className="border-t border-stone-200/70 dark:border-zinc-800 px-3.5 py-1.5 flex items-center justify-between bg-stone-100/50 dark:bg-zinc-800/40">
              <span className="text-3xs font-medium text-stone-400 dark:text-stone-500">Demo mode active</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const dummyBlob = new Blob(["demo document content"], { type: "text/plain" });
                  const file = new File([dummyBlob], `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-demo.txt`, { type: "text/plain" });
                  performUpload(file);
                }}
                className="text-3xs font-bold text-ngo-700 dark:text-ngo-300 hover:underline underline-offset-2"
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
                <p role="alert" className="text-3xs text-red-700 dark:text-red-300 font-medium truncate">
                  {uploadError}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (lastFile) performUpload(lastFile);
                  else handleTriggerFileInput();
                }}
                className="shrink-0 inline-flex items-center gap-1 text-3xs font-bold text-red-700 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200 underline underline-offset-2"
              >
                <RefreshCw className="h-2.5 w-2.5" /> Retry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
