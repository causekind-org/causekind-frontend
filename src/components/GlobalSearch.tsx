"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ClipboardList, Loader2, ArrowRight } from "lucide-react";
import { getItemRequests, type ItemRequest } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

// Need-first privacy: donor listings are private inventory — never searchable.
// Global search covers only requests published on the public need board.

/* ── Highlight matched substring ─────────────────────────────────────────── */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#f0b97a]/40 dark:bg-[#b04a15]/30 text-inherit rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

/* ── Single result row ───────────────────────────────────────────────────── */
function ResultRow({
  item,
  query,
  active,
  onClick,
}: {
  item: ItemRequest;
  query: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors rounded-xl ${
        active
          ? "bg-[#b04a15]/8 dark:bg-[#b04a15]/15"
          : "hover:bg-stone-50 dark:hover:bg-zinc-800/60"
      }`}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#b04a15]/10 text-[#b04a15]">
        <ClipboardList className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug truncate">
          <Highlight text={item.title} query={query} />
        </p>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 truncate">
          Request · {item.city} · Qty: {item.quantity}
        </p>
      </div>
      <ArrowRight className={`w-3.5 h-3.5 shrink-0 transition-opacity ${active ? "opacity-100 text-[#b04a15]" : "opacity-0"}`} />
    </button>
  );
}

/* ── Main GlobalSearch component ─────────────────────────────────────────── */
export function GlobalSearch() {
  const router = useRouter();
  const { user } = useAuth();
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<ItemRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [active,  setActive]  = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Data cache — fetched once per session */
  const cache = useRef<ItemRequest[] | null>(null);

  const fetchData = useCallback(async () => {
    if (cache.current) return cache.current;
    setLoading(true);
    try {
      // silent401: search is a background/optional fetch — a logged-out visitor
      // opening search must not be redirected to login as "session expired".
      cache.current = await getItemRequests(undefined, undefined, undefined, { silent401: true }).catch(() => []);
      return cache.current;
    } finally {
      setLoading(false);
    }
  }, []);

  /* Open on Ctrl+K / Cmd+K */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (user) setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [user]);

  /* Focus input when opened */
  useEffect(() => {
    if (open) {
      fetchData().then(data => {
        if (!query.trim()) {
          setResults(data.slice(0, 5));
        }
      });
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery("");
      setActive(0);
    }
  }, [open, fetchData, query]);

  /* Search filter */
  useEffect(() => {
    if (!cache.current) return;
    const q = query.toLowerCase().trim();
    if (!q) {
      setResults(cache.current.slice(0, 5));
      return;
    }
    const reqs = cache.current
      .filter(r => r.title.toLowerCase().includes(q) || r.city.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
      .slice(0, 8);
    setResults(reqs);
    setActive(0);
  }, [query]);

  /* Keyboard navigation inside list */
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    if (e.key === "Enter" && results[active]) {
      navigate();
    }
  }

  function navigate() {
    setOpen(false);
    router.push("/requests");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center pt-[10vh] px-4"
      onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-[#e5e2d5] dark:border-zinc-700"
        style={{ animation: "fadeIn 0.15s ease forwards" }}
      >
        {/* Search input row */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-100 dark:border-zinc-800">
          <Search className="w-4.5 h-4.5 text-stone-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search requests…"
            className="flex-1 bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 outline-none font-medium"
          />
          {loading && <Loader2 className="w-4 h-4 text-stone-400 animate-spin shrink-0" />}
          {query && !loading && (
            <button onClick={() => setQuery("")} className="text-stone-400 hover:text-stone-600 transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-stone-400 border border-stone-200 dark:border-zinc-700 rounded px-1.5 py-0.5 font-mono shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {results.length === 0 && !loading ? (
            !user ? (
              <div className="py-10 text-center space-y-2">
                <p className="text-sm text-stone-400 font-medium">Live requests are visible to members only.</p>
                <button
                  onClick={() => { setOpen(false); router.push("/login"); }}
                  className="text-sm font-bold text-[#b04a15] hover:underline"
                >
                  Log in to search requests →
                </button>
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-stone-400 font-medium">
                {query ? `No results for "${query}"` : "Type to search"}
              </div>
            )
          ) : (
            <>
              {/* Label */}
              <p className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">
                {query ? `${results.length} result${results.length !== 1 ? "s" : ""}` : "Recent"}
              </p>
              {results.map((r, i) => (
                <ResultRow
                  key={r.id}
                  item={r}
                  query={query}
                  active={i === active}
                  onClick={navigate}
                />
              ))}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-stone-100 dark:border-zinc-800 px-4 py-2 flex items-center gap-4 text-[10px] text-stone-400 font-medium">
          <span className="flex items-center gap-1"><kbd className="border border-stone-200 dark:border-zinc-700 rounded px-1 py-0.5 font-mono">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="border border-stone-200 dark:border-zinc-700 rounded px-1 py-0.5 font-mono">↵</kbd> open</span>
          <span className="flex items-center gap-1"><kbd className="border border-stone-200 dark:border-zinc-700 rounded px-1 py-0.5 font-mono">ESC</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

/* ── Trigger button (goes in Navbar) ─────────────────────────────────────── */
export function SearchTrigger({ className = "" }: { className?: string }) {
  function open() {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
  }
  return (
    <button
      onClick={open}
      aria-label="Search"
      title="Search (Ctrl+K)"
      className={`relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#e5e2d5] dark:border-zinc-800 text-stone-700 dark:text-stone-300 hover:bg-[#f0eee6] dark:hover:bg-zinc-900 transition-all duration-200 active:scale-95 overflow-hidden bg-white dark:bg-zinc-900 ${className}`}
    >
      <Search className="w-4 h-4 sm:w-5 sm:h-5" />
    </button>
  );
}
