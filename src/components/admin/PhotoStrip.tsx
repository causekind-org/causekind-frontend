"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * Thumbnail strip + built-in lightbox preview. Works for base64 data URLs
 * (which browsers refuse to open in a new tab) as well as real image URLs —
 * the preview is an in-app overlay, so storage backend doesn't matter.
 * Keyboard: ← → to navigate, Esc to close. Used by every admin surface that
 * shows listing/offer photos, so the behavior stays identical everywhere.
 */
export function PhotoStrip({ images, label }: { images: string[]; label?: string }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const close = useCallback(() => setOpenIdx(null), []);
  const step = useCallback(
    (d: number) =>
      setOpenIdx((i) => (i === null ? null : (i + d + images.length) % images.length)),
    [images.length],
  );

  useEffect(() => {
    if (openIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIdx, close, step]);

  if (!images || images.length === 0) return null;

  return (
    <div>
      {label && (
        <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 mb-1">
          {label} ({images.length})
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {images.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpenIdx(i)}
            className="group relative block cursor-zoom-in"
            title="Click to preview"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Photo ${i + 1}`}
              className="h-20 w-20 rounded-lg border border-stone-200 dark:border-zinc-700 object-cover transition group-hover:opacity-80 group-hover:ring-2 group-hover:ring-[#b04a15]/40"
            />
          </button>
        ))}
      </div>

      {openIdx !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); step(-1); }}
              className="absolute left-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[openIdx]}
            alt={`Photo ${openIdx + 1} (full size)`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
          />
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); step(1); }}
              className="absolute right-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Next photo"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
          {images.length > 1 && (
            <span className="absolute bottom-4 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
              {openIdx + 1} / {images.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
