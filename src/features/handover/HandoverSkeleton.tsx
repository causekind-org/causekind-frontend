"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state shaped like the page it becomes.
 *
 * <p>Replaces a centred `animate-pulse "Loading..."`, which told the user nothing
 * about what was coming and made the real layout arrive as a jolt. The blocks here
 * match the real grid's proportions so the transition is a fill, not a reflow.
 */
export function HandoverSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6" aria-busy="true" aria-label="Loading handover">
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="h-11 sm:h-14 w-11 sm:w-14 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/5 rounded" />
          <Skeleton className="h-3 w-1/4 rounded" />
        </div>
      </div>

      <Skeleton className="mb-6 h-10 w-full rounded" />

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-12">
        <div className="space-y-3 sm:space-y-4 lg:col-span-7 xl:col-span-8">
          <Skeleton className="h-44 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
        <div className="space-y-3 sm:space-y-4 lg:col-span-5 xl:col-span-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-56 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
