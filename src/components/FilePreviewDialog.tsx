"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Loader2, ExternalLink, Download, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export type PreviewFile = {
  name: string;
  /** A direct URL, or a function that fetches a short-lived signed link. */
  url?: string | null;
  resolve?: () => Promise<string>;
  mimeType?: string | null;
};

function isPdf(f: PreviewFile, url: string | null): boolean {
  return (f.mimeType ?? "").includes("pdf") || /\.pdf($|\?)/i.test(f.name) || /\.pdf($|\?)/i.test(url ?? "");
}

/**
 * The whole file in a popup: an image at full size, or a PDF in the browser's own
 * viewer. Prev / next move between the files; links are fetched when shown.
 */
export function FilePreviewDialog({ files, index, onIndexChange, onClose }: {
  files: PreviewFile[]; index: number | null; onIndexChange: (i: number) => void; onClose: () => void;
}) {
  const file = index != null ? files[index] : null;
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let live = true;
    setUrl(null);
    setError(null);
    if (!file) return;

    if (file.url) {
      setUrl(file.url);
      setLoading(false);
      return;
    }

    if (file.resolve) {
      setLoading(true);
      file.resolve()
        .then((u) => {
          if (live) {
            setUrl(u);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (live) {
            const anyErr = err as { status?: number; statusCode?: number; url?: string } | null | undefined;
            const status = anyErr?.status ?? anyErr?.statusCode;
            let host: string | undefined;
            const linkUrl = anyErr?.url || file.url;
            if (linkUrl) {
              try { host = new URL(linkUrl).host; } catch {}
            } else if (typeof window !== "undefined") {
              host = window.location.host;
            }
            console.error("FilePreviewDialog link request failed:", { status, host, error: err });
            // A small code tells support which failure it was (e.g. 403, 404, or NET for a network error).
            setError(`This file can't be shown right now. (Error ${status ?? "NET"})`);
            setLoading(false);
          }
        });
    } else {
      console.warn("FilePreviewDialog missing link or resolver:", { name: file.name });
      setError("This file can't be shown right now.");
    }
    return () => { live = false; };
  }, [file, retryCount]);

  function handleRetry() {
    setError(null);
    setUrl(null);
    setRetryCount((c) => c + 1);
  }

  if (!file || index == null) return null;
  const many = files.length > 1;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent data-testid="file-preview" className="block max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-4xl overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 pr-14 dark:border-zinc-800">
          <DialogTitle className="truncate text-sm font-semibold">{file.name}</DialogTitle>
          {many && <span className="shrink-0 text-xs text-stone-500">{index + 1} / {files.length}</span>}
        </div>
        <div className="relative flex h-[70dvh] items-center justify-center bg-stone-100 dark:bg-zinc-950">
          {error ? (
            <div role="alert" className="flex flex-col items-center justify-center gap-3 p-6 text-center max-w-md">
              <FileText className="h-10 w-10 text-stone-400" aria-hidden />
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">{error}</p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {url && (
                  <>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      Open in new tab
                    </a>
                    <a
                      href={url}
                      download={file.name}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden />
                      Download
                    </a>
                  </>
                )}
                {file.resolve && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-ngo-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-ngo-600 transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    Retry
                  </button>
                )}
              </div>
            </div>
          ) : loading || !url ? (
            <Loader2 className="h-6 w-6 animate-spin text-stone-400" aria-label="Loading" />
          ) : isPdf(file, url) ? (
            <object data={url} type="application/pdf" className="h-full w-full bg-white">
              <iframe
                src={url}
                title={file.name}
                className="h-full w-full bg-white"
                onError={() => {
                  let host: string | undefined;
                  try { host = new URL(url).host; } catch {}
                  console.error("FilePreviewDialog PDF frame failed to load:", { host, url });
                  setError("This file can't be shown right now.");
                }}
              />
            </object>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed link
            <img
              src={url}
              alt={file.name}
              onError={() => {
                let host: string | undefined;
                try { host = new URL(url).host; } catch {}
                console.error("FilePreviewDialog image failed to load:", { host, url });
                setError("This file can't be shown right now.");
              }}
              className="max-h-full max-w-full object-contain"
            />
          )}
          {many && (
            <>
              <button
                type="button"
                aria-label="Previous file"
                onClick={() => onIndexChange((index - 1 + files.length) % files.length)}
                className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-stone-800 shadow hover:bg-white"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Next file"
                onClick={() => onIndexChange((index + 1) % files.length)}
                className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-stone-800 shadow hover:bg-white"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
