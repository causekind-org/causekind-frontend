"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
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

  useEffect(() => {
    let live = true;
    setUrl(null); setError(null);
    if (!file) return;
    if (file.url) { setUrl(file.url); return; }
    if (file.resolve) {
      file.resolve().then(u => { if (live) setUrl(u); }).catch(() => { if (live) setError("This file can't be shown right now."); });
    } else setError("This file can't be shown right now.");
    return () => { live = false; };
  }, [file]);

  if (!file || index == null) return null;
  const many = files.length > 1;
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent data-testid="file-preview" className="block max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-4xl overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 pr-14 dark:border-zinc-800">
          <DialogTitle className="truncate text-sm font-semibold">{file.name}</DialogTitle>
          {many && <span className="shrink-0 text-xs text-stone-500">{index + 1} / {files.length}</span>}
        </div>
        <div className="relative flex h-[70dvh] items-center justify-center bg-stone-100 dark:bg-zinc-950">
          {error ? (
            <p role="alert" className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300"><FileText className="h-4 w-4" aria-hidden />{error}</p>
          ) : !url ? (
            <Loader2 className="h-6 w-6 animate-spin text-stone-400" aria-label="Loading" />
          ) : isPdf(file, url) ? (
            <iframe src={url} title={file.name} className="h-full w-full bg-white" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed link
            <img src={url} alt={file.name} className="max-h-full max-w-full object-contain" />
          )}
          {many && (
            <>
              <button type="button" aria-label="Previous file" onClick={() => onIndexChange((index - 1 + files.length) % files.length)}
                className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-stone-800 shadow">
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button type="button" aria-label="Next file" onClick={() => onIndexChange((index + 1) % files.length)}
                className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-stone-800 shadow">
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
