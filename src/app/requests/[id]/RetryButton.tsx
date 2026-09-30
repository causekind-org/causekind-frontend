"use client";

import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

/** Re-runs the server fetch for this page without a full reload. */
export default function RetryButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-stone-300 px-4 text-sm font-semibold hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-role-accent)] dark:border-white/15 dark:hover:bg-white/5"
    >
      <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
    </button>
  );
}
