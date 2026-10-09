"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * A row of square photo thumbnails; tapping one opens it full size, with
 * previous/next when there are several. Used by the dashboard's listing and
 * request cards and their match banners (owner, 2026-10-09).
 */
export function PhotoThumbs({ photos, alt, size = 64 }: { photos: string[]; alt: string; size?: number }) {
  const [open, setOpen] = useState<number | null>(null);
  if (photos.length === 0) return null;
  const step = (d: number) => setOpen(i => (i == null ? i : (i + d + photos.length) % photos.length));

  return (
    <>
      <div className="flex shrink-0 gap-1.5">
        {photos.map((src, i) => (
          <button key={src} type="button" onClick={() => setOpen(i)} aria-label={`View ${alt} photo ${i + 1} of ${photos.length}`}
            className="shrink-0 overflow-hidden border border-stone-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] dark:border-zinc-700"
            style={{ width: size, height: size }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      <Dialog open={open != null} onOpenChange={o => { if (!o) setOpen(null); }}>
        <DialogContent className="max-w-3xl rounded-none p-3">
          <DialogTitle className="sr-only">{alt} — photo {(open ?? 0) + 1} of {photos.length}</DialogTitle>
          {open != null && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photos[open]} alt={`${alt} photo ${open + 1}`} className="max-h-[75vh] w-full object-contain" />
              {photos.length > 1 && (
                <>
                  <button type="button" onClick={() => step(-1)} aria-label="Previous photo"
                    className="absolute start-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-white/90 text-stone-800 shadow dark:bg-zinc-900/90 dark:text-stone-100">
                    <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden />
                  </button>
                  <button type="button" onClick={() => step(1)} aria-label="Next photo"
                    className="absolute end-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-white/90 text-stone-800 shadow dark:bg-zinc-900/90 dark:text-stone-100">
                    <ChevronRight className="h-5 w-5 rtl:rotate-180" aria-hidden />
                  </button>
                  <p className="mt-2 text-center text-xs text-stone-500">{open + 1} / {photos.length}</p>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
