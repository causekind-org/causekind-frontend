export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6" aria-busy="true">
      {/* Back link skeleton */}
      <div className="h-4 w-24 animate-pulse rounded bg-stone-200 dark:bg-white/10" />

      {/* Hero banner skeleton */}
      <div className="mt-5 h-[340px] sm:h-[400px] animate-pulse rounded-3xl bg-gradient-to-t from-stone-300 to-stone-200 dark:from-white/10 dark:to-white/5" />

      {/* Live needs board skeleton */}
      <div className="mt-8 space-y-4">
        <div className="h-6 w-52 animate-pulse rounded bg-stone-200 dark:bg-white/10" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-28 animate-pulse rounded-2xl bg-stone-200/60 dark:bg-white/5" />
          <div className="h-28 animate-pulse rounded-2xl bg-stone-200/60 dark:bg-white/5" />
        </div>
      </div>

      {/* Quote skeleton */}
      <div className="mt-8 h-24 animate-pulse rounded-2xl bg-stone-200/60 dark:bg-white/5" />

      {/* Guidance cards skeleton */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="h-56 animate-pulse rounded-2xl bg-emerald-500/5 border border-emerald-500/10" />
        <div className="h-56 animate-pulse rounded-2xl bg-red-500/5 border border-red-500/10" />
      </div>

      {/* Checklist skeleton */}
      <div className="mt-10 space-y-3">
        <div className="h-6 w-52 animate-pulse rounded bg-stone-200 dark:bg-white/10" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-stone-200/60 dark:bg-white/5" />
        ))}
      </div>

      <span className="sr-only">Loading category guidance…</span>
    </main>
  );
}

