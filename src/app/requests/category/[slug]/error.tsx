"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function CategoryError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-24 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
        <AlertTriangle className="w-6 h-6" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-xl font-bold text-stone-800 dark:text-stone-100">
        This page didn&apos;t load
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        Something went wrong rendering the category guidance. Trying again usually fixes it.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-[var(--ck-role-accent)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/requests"
          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 dark:border-white/15 dark:text-stone-200 dark:hover:bg-white/5"
        >
          All needs
        </Link>
      </div>
    </main>
  );
}
