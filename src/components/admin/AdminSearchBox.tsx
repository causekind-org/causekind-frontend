"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

/**
 * Admin list search: search icon, clear (x), 300 ms debounce, Escape clears.
 * 16px text and full width on mobile (no iOS zoom). `value` is the applied query;
 * `onChange` gets the trimmed query after the debounce (immediately on clear).
 */
export function AdminSearchBox({ value, onChange, placeholder, label = "Search", delay = 300 }: {
  value: string; onChange: (query: string) => void; placeholder: string; label?: string; delay?: number;
}) {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(onChange);
  useEffect(() => { latest.current = onChange; }, [onChange]);

  // An outside change (e.g. "Clear search", URL) replaces what is typed.
  useEffect(() => { setText((t) => (t.trim() === value ? t : value)); }, [value]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function type(next: string) {
    setText(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => latest.current(next.trim()), delay);
  }
  function clear() {
    if (timer.current) clearTimeout(timer.current);
    setText("");
    latest.current("");
  }

  return (
    <div role="search" className="relative w-full sm:max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={text}
        maxLength={100}
        onChange={(e) => type(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); clear(); } }}
        className="w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-9 pr-10 text-base text-stone-900 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-100 [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button type="button" aria-label="Clear search" onClick={clear}
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100 dark:hover:bg-zinc-800">
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

/** Case-insensitive, trimmed, partial match of `query` against any of `fields`. */
export function matchesQuery(query: string, ...fields: (string | number | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f != null && String(f).toLowerCase().includes(q));
}

/** `No results for "<query>"` with a "Clear search" button. */
export function NoSearchResults({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div role="status" className="rounded-lg border border-stone-200 p-4 text-sm text-stone-600 dark:border-zinc-700 dark:text-stone-300">
      <p>No results for &quot;{query}&quot;</p>
      <button type="button" onClick={onClear}
        className="mt-2 rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700">Clear search</button>
    </div>
  );
}
