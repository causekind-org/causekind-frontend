/** Stream a lightweight destination shell while route data/code is resolving. */
export default function Loading() {
  return (
    <div className="min-h-[65svh] bg-[#fbf9f4] px-5 py-12 dark:bg-zinc-950" role="status" aria-live="polite" aria-busy="true">
      <p className="mx-auto max-w-5xl text-sm font-semibold text-stone-600 dark:text-stone-300">Loading…</p>
      <div aria-hidden="true" className="mx-auto mt-6 max-w-5xl space-y-5">
        <div className="h-8 w-2/3 rounded-lg bg-stone-200/60 dark:bg-zinc-800" />
        <div className="h-4 w-5/6 rounded bg-stone-200/60 dark:bg-zinc-800" />
        <div className="h-56 rounded-2xl bg-stone-200/40 dark:bg-zinc-900" />
      </div>
    </div>
  );
}
