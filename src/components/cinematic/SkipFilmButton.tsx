"use client";

import { LandingText, useLandingTranslation } from "@/components/LandingTranslation";

/**
 * "Skip intro" pill shown to returning visitors while the landing film plays
 * (handoffs/Landing Film Skip Plan.md). The orchestrator mounts it only while
 * the film is active and the visitor is eligible, so when it isn't shown it is
 * not in the DOM and never in the tab order.
 */
export function SkipFilmButton({ onSkip }: { onSkip: () => void }) {
  const label = useLandingTranslation("Skip the intro film");
  return (
    <button
      type="button"
      onClick={onSkip}
      aria-label={label}
      className="ck-skip-film fixed z-[60] left-1/2 -translate-x-1/2 lg:left-auto lg:translate-x-0 lg:right-8 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg backdrop-blur-md bg-white/90 text-stone-900 border border-stone-200 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b04a15] dark:bg-zinc-900/90 dark:text-stone-100 dark:border-zinc-700"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}
    >
      <LandingText>Skip intro</LandingText>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M6 13l6 6 6-6" />
      </svg>
    </button>
  );
}
