"use client";

import { useEffect, useState } from "react";
import { Eye, RefreshCw, Trash2, Check, FileText, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UploadedFile } from "@/features/ngo-registration/ngoRegistrationModel";
import { getNgoFileLink } from "@/lib/api";

export interface UploadedFilePreviewProps {
  file: UploadedFile;
  label: string;
  kind?: "document" | "photo";
  localBlobUrl?: string | null;
  onPreview: () => void;
  onReplace: () => void;
  onRemove: () => void;
  disabled?: boolean;
  className?: string;
}

// In-memory cache for presigned read links so repeated views don't re-fetch needlessly
const fileLinkCache = new Map<string, { url: string; expiresAt: number }>();

export async function getCachedFileLink(kind: "document" | "photo", id: number): Promise<string> {
  const cacheKey = `${kind}:${id}`;
  const cached = fileLinkCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.url;
  }
  const res = await getNgoFileLink(kind, id);
  // Cache for 9 minutes (presigned link TTL is 10 minutes)
  fileLinkCache.set(cacheKey, { url: res.url, expiresAt: Date.now() + 9 * 60 * 1000 });
  return res.url;
}

export function invalidateFileLinkCache(kind: "document" | "photo", id: number) {
  fileLinkCache.delete(`${kind}:${id}`);
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: UploadedFile): boolean {
  if (file.mimeType?.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|svg)$/i.test(file.name);
}

function isPdfFile(file: UploadedFile): boolean {
  if (file.mimeType === "application/pdf") return true;
  return /\.pdf$/i.test(file.name);
}

/**
 * Shared inline preview component for uploaded documents and photos across
 * the NGO 6-step registration wizard.
 *
 * Shows thumbnail, filename, size, and status pill with Preview, Replace,
 * and Remove actions (with confirmation).
 */
export function UploadedFilePreview({
  file,
  label,
  kind = "document",
  localBlobUrl,
  onPreview,
  onReplace,
  onRemove,
  disabled = false,
  className,
}: UploadedFilePreviewProps) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(localBlobUrl ?? file.s3Url ?? null);
  const [loadingThumb, setLoadingThumb] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const isImg = isImageFile(file) || kind === "photo";
  const isPdf = isPdfFile(file);

  const fileId = kind === "photo" ? file.photoId : file.documentId;

  // Resolve thumbnail link lazily for images when no local blob or direct url is present
  useEffect(() => {
    if (localBlobUrl) {
      setThumbUrl(localBlobUrl);
      setThumbError(false);
      return;
    }
    if (file.s3Url && !fileId) {
      setThumbUrl(file.s3Url);
      setThumbError(false);
      return;
    }
    if (isImg && fileId != null) {
      let active = true;
      setLoadingThumb(true);
      setThumbError(false);
      getCachedFileLink(kind, fileId)
        .then((url) => {
          if (active) {
            setThumbUrl(url);
            setLoadingThumb(false);
          }
        })
        .catch(() => {
          if (active) {
            setThumbError(true);
            setLoadingThumb(false);
          }
        });
      return () => {
        active = false;
      };
    }
  }, [fileId, kind, isImg, localBlobUrl, file.s3Url]);

  return (
    <div
      className={cn(
        "rounded-xl border border-green-200/90 bg-[#FAF7F2] p-3 sm:p-4 dark:border-green-900/40 dark:bg-[#141E18] transition-all",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Thumbnail & Details */}
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          {/* Thumbnail tile */}
          <div
            className="relative h-16 w-16 sm:h-14 sm:w-14 shrink-0 rounded-lg overflow-hidden border border-stone-200 dark:border-zinc-700 bg-stone-100 dark:bg-zinc-800 flex items-center justify-center cursor-pointer group"
            onClick={onPreview}
            title={`Preview ${label}`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPreview();
              }
            }}
          >
            {isImg && thumbUrl && !thumbError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbUrl}
                alt={`Preview of ${label}`}
                loading="lazy"
                onError={() => setThumbError(true)}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            ) : loadingThumb ? (
              <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
            ) : isPdf ? (
              <div className="flex flex-col items-center justify-center text-red-600 dark:text-red-400">
                <FileText className="h-6 w-6" aria-hidden />
                <span className="text-4xs font-black uppercase tracking-wider mt-0.5">PDF</span>
              </div>
            ) : (
              <FileText className="h-6 w-6 text-stone-400 dark:text-stone-500" aria-hidden />
            )}

            {/* Hover overlay hint */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Eye className="h-4 w-4" />
            </div>
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate max-w-[200px] sm:max-w-[260px]" title={file.name}>
                {file.demo ? (file.name || "Demo upload") : file.name}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-3xs font-bold text-green-700 dark:text-green-300 shrink-0">
                <Check className="h-3 w-3" strokeWidth={2.5} />
                Uploaded
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-3xs text-stone-500 dark:text-stone-400 flex-wrap">
              <span>{label}</span>
              {file.size ? (
                <>
                  <span>•</span>
                  <span>{formatFileSize(file.size)}</span>
                </>
              ) : null}
            </div>

            {file.rejectedReason && (
              <p role="alert" className="mt-1 flex items-start gap-1 text-2xs font-semibold text-red-700 dark:text-red-300">
                <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" aria-hidden />
                {file.rejectedReason}
              </p>
            )}
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center flex-wrap pt-1 sm:pt-0">
          {confirmRemove ? (
            <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg p-1 text-2xs">
              <span className="text-red-700 dark:text-red-300 font-medium px-1">Remove file?</span>
              <button
                type="button"
                onClick={() => {
                  setConfirmRemove(false);
                  onRemove();
                }}
                disabled={disabled}
                className="rounded-md bg-red-600 px-2.5 py-1 text-white font-bold hover:bg-red-700 transition-colors min-h-[32px]"
              >
                Yes, remove
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemove(false)}
                className="rounded-md border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-stone-700 dark:text-stone-300 font-semibold hover:bg-stone-100 transition-colors min-h-[32px]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onPreview}
                disabled={disabled}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-2.5 py-1.5 text-2xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-zinc-700 transition-colors"
                title={`Preview ${label}`}
              >
                <Eye className="h-3.5 w-3.5 text-stone-500" />
                Preview
              </button>

              <button
                type="button"
                onClick={onReplace}
                disabled={disabled}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-2.5 py-1.5 text-2xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-zinc-700 transition-colors"
                title={`Replace ${label}`}
              >
                <RefreshCw className="h-3.5 w-3.5 text-stone-500" />
                Replace
              </button>

              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                disabled={disabled}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2.5 py-1.5 text-2xs font-semibold text-stone-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title={`Remove ${label}`}
                aria-label={`Remove ${label}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
