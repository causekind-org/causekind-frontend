export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6" aria-busy="true">
      <div className="h-4 w-24 animate-pulse rounded bg-stone-200 dark:bg-white/10" />
      <div className="mt-5 h-14 w-14 animate-pulse rounded-2xl bg-stone-200 dark:bg-white/10" />
      <div className="mt-4 h-9 w-64 max-w-full animate-pulse rounded bg-stone-200 dark:bg-white/10" />
      <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-stone-200 dark:bg-white/10" />
      <div className="mt-6 h-28 animate-pulse rounded-2xl bg-stone-200 dark:bg-white/10" />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="h-56 animate-pulse rounded-2xl bg-stone-200 dark:bg-white/10" />
        <div className="h-56 animate-pulse rounded-2xl bg-stone-200 dark:bg-white/10" />
      </div>
      <span className="sr-only">Loading category guidance…</span>
    </main>
  );
}
