"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/** The home page's NGO drives section: where a visitor without history goes back to. */
export const DRIVES_SECTION_HREF = "/#ngo-drives-section";

/**
 * "← Back": the browser's back when this tab has somewhere to go back to
 * (an in-site page), otherwise a fallback page.
 */
export function BackButton({ fallbackHref = DRIVES_SECTION_HREF, label = "Back", className = "" }: {
  fallbackHref?: string; label?: string; className?: string;
}) {
  const router = useRouter();
  function goBack() {
    const fromSite = typeof document !== "undefined" && document.referrer.startsWith(window.location.origin);
    if (fromSite && window.history.length > 1) router.back();
    else router.push(fallbackHref);
  }
  return (
    <button type="button" onClick={goBack} data-testid="back-button"
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-stone-700 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)] dark:text-stone-200 dark:hover:bg-zinc-800 ${className}`}>
      <ArrowLeft className="h-4 w-4" aria-hidden /> {label}
    </button>
  );
}
