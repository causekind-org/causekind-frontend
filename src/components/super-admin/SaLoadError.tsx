"use client";

/**
 * Shown when a super-admin panel's list fails to load. Before this, six panels
 * toasted and then rendered their empty state ("No audit entries found"), which
 * reads as a real, empty result.
 */
export function SaLoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div role="alert" className="my-6 rounded-2xl border border-red-300/60 bg-red-50 p-6 text-center dark:border-red-900/60 dark:bg-red-950/30">
      <p className="text-sm font-semibold text-red-700 dark:text-red-300">Couldn&apos;t load {what}.</p>
      <button type="button" onClick={onRetry}
        className="mt-3 min-h-10 rounded-xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700">
        Retry
      </button>
    </div>
  );
}
