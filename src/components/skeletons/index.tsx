import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared loading placeholders.
 *
 * <p>A skeleton earns its place by occupying **the shape the content will
 * take**. One that does not is worse than a spinner: the page settles once when
 * the placeholder appears and again when the real content replaces it, so the
 * reader is moved twice instead of once. Every component here therefore mirrors
 * the grid columns, gaps and rounding of the surface it stands in for, and the
 * matching real layout is named in each doc comment so the two can be kept in
 * step.
 *
 * <p>Accessibility: each block is a single `role="status"` region with one
 * `sr-only` label. The individual bars are `aria-hidden` — announcing forty
 * empty rectangles is noise, and a screen reader user wants "Loading needs",
 * once.
 *
 * <p>Colour comes from `bg-muted` via `ui/skeleton.tsx`, which is themed for
 * light and dark in `styles.css`. No hardcoded greys, and the pulse stops under
 * `prefers-reduced-motion` through the `[data-slot="skeleton"]` rule there.
 */

function Region({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" className="w-full">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

/**
 * Card grid — needs board, listings, campaigns.
 * Mirrors `grid gap-3 sm:grid-cols-2 lg:grid-cols-3` as used by
 * `PublicRequestsBoard` and the category boards.
 */
export function CardGridSkeleton({ count = 6, label = "Loading" }: { count?: number; label?: string }) {
  return (
    <Region label={label}>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <li
            key={i}
            className="flex h-full flex-col gap-2.5 rounded-2xl border border-stone-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <div className="mt-auto flex gap-3 pt-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </li>
        ))}
      </ul>
    </Region>
  );
}

/** Stacked rows — offers, matches, admin queues. */
export function ListRowsSkeleton({ rows = 5, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <Region label={label}>
      <ul className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="h-8 w-20 shrink-0 rounded-full" />
          </li>
        ))}
      </ul>
    </Region>
  );
}

/** Stat tiles above panels — dashboards. */
export function DashboardSkeleton({ tiles = 3, label = "Loading your dashboard" }: { tiles?: number; label?: string }) {
  return (
    <Region label={label}>
      <div className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: tiles }, (_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-stone-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="mt-3 h-7 w-16" />
              <Skeleton className="mt-2 h-3 w-20" />
            </div>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 2 }, (_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-2xl border border-stone-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/6" />
            </div>
          ))}
        </div>
      </div>
    </Region>
  );
}

/** Media panel beside a text column — item, campaign and request detail. */
export function DetailPageSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <Region label={label}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
          <Skeleton className="h-7 w-2/3" />
          <div className="flex gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-2 pt-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
        <aside className="space-y-3">
          <div className="space-y-3 rounded-2xl border border-stone-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-11 w-full rounded-full" />
          </div>
        </aside>
      </div>
    </Region>
  );
}

/**
 * Label-and-control pairs — profile, wizard steps.
 * Controls are 44px so the placeholder matches the real touch-target height.
 */
export function FormSkeleton({ fields = 5, label = "Loading form" }: { fields?: number; label?: string }) {
  return (
    <Region label={label}>
      <div className="space-y-4">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
        <Skeleton className="h-11 w-36 rounded-full" />
      </div>
    </Region>
  );
}

/** Header row plus body rows — admin and super-admin tables. */
export function TableSkeleton({
  rows = 8, columns = 5, label = "Loading table",
}: { rows?: number; columns?: number; label?: string }) {
  return (
    <Region label={label}>
      <div className="overflow-hidden rounded-2xl border border-stone-200/80 dark:border-white/10">
        <div
          className="flex gap-4 border-b border-stone-200/80 bg-stone-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]"
        >
          {Array.from({ length: columns }, (_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, r) => (
          <div
            key={r}
            className="flex gap-4 border-b border-stone-200/60 px-4 py-3.5 last:border-b-0 dark:border-white/[0.06]"
          >
            {Array.from({ length: columns }, (_, c) => (
              <Skeleton key={c} className="h-3.5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </Region>
  );
}

/**
 * Full-page wrapper for the "route is still resolving" case, so a `loading.tsx`
 * and its client-side counterpart share one ground and one max-width instead of
 * flashing between two different placeholders.
 */
export function PageSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f4f0] dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">{children}</div>
    </div>
  );
}
