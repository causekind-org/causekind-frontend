"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

/**
 * A wizard photo thumbnail that never shows the browser's broken-image icon.
 *
 * <p>If the image cannot load (a link that expired, or one the storage refused),
 * the tile says so in words instead. Keyed on `src`, so a fresh URL for the same
 * photo gets a fresh attempt. Rendered inside a `relative` box it fills.
 */
export function WizardPhotoImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (failedSrc === src) {
    return (
      <span
        role="img"
        aria-label={alt ? `${alt}: couldn't load` : "Photo couldn't load"}
        className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-stone-100 p-1 text-center text-4xs font-semibold text-stone-500 dark:bg-zinc-900 dark:text-stone-400"
      >
        <ImageOff className="h-4 w-4" aria-hidden />
        <span>Couldn&apos;t load photo</span>
      </span>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element -- signed storage URLs; nothing for the optimizer to do
  return <img src={src} alt={alt} className={`absolute inset-0 h-full w-full ${className}`} onError={() => setFailedSrc(src)} />;
}
