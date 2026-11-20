"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useGlobalSearch } from "@/components/super-admin/GlobalSearchPanel";
import type { SaInterventionEntity, SaSearchHit } from "@/lib/api";

const TYPE_LABEL: Record<string, string> = {
  USER: "User", REQUEST: "Request", LISTING: "Listing", OFFER: "Offer", MATCH: "Match", CERTIFICATE: "Certificate",
};

/**
 * Inline global search in the Super Admin top bar (2026-11-20, owner request:
 * type right in the bar, suggestions drop down under it — no pop-up window).
 *
 * Same {@link useGlobalSearch} hook and the same destinations as the old ⌘K
 * palette, so debounce, minimum length and the stale-response guard are shared.
 * Ctrl/⌘K focuses this field. A combobox: ↑↓ move, Enter opens, Esc closes.
 */
export function TopbarSearch({ onOpenUser, onOpenIntervention }: {
  onOpenUser: (id: number) => void;
  onOpenIntervention: (entity: SaInterventionEntity, id: number) => void;
}) {
  const { query, setQuery, results, loading, failed } = useGlobalSearch(2, 6);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const flat: SaSearchHit[] = results?.groups.flatMap((g) => g.hits) ?? [];
  const typed = query.trim().length >= 2;

  useEffect(() => { setCursor(0); }, [results]);

  // Ctrl/⌘K focuses the field from anywhere in the console.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click outside closes the suggestions.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function destinationOf(hit: SaSearchHit): (() => void) | null {
    if (hit.type === "USER") return () => onOpenUser(hit.id);
    if (hit.type === "OFFER") return () => onOpenIntervention("offers", hit.id);
    if (hit.type === "MATCH") return () => onOpenIntervention("matches", hit.id);
    return null;
  }

  function choose(hit: SaSearchHit) {
    const go = destinationOf(hit);
    if (!go) return;
    go();
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setCursor((c) => Math.min(c + 1, Math.max(flat.length - 1, 0))); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === "Enter" && flat[cursor]) { e.preventDefault(); choose(flat[cursor]); }
    else if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
  }

  const showPanel = open && (typed || query.length > 0);
  const listId = "sa-topbar-search-results";

  return (
    <div ref={boxRef} className="relative w-full max-w-lg min-w-0">
      <div className="flex h-10 items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 transition-colors duration-150 focus-within:border-white/50 focus-within:bg-white/15">
        <Search className="size-4 shrink-0 text-white/70" aria-hidden />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showPanel && flat[cursor] ? `${listId}-${cursor}` : undefined}
          aria-label="Search users, requests, listings, offers, matches and certificates"
          placeholder="Search users, requests, offers…"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/60"
        />
        {loading && <Loader2 className="size-4 shrink-0 animate-spin text-white/70" aria-hidden />}
        {query && !loading && (
          <button type="button" onClick={() => { setQuery(""); inputRef.current?.focus(); }} aria-label="Clear search"
            className="rounded-full p-0.5 text-white/70 hover:text-white"><X className="size-3.5" /></button>
        )}
        {!query && <kbd className="hidden shrink-0 rounded border border-white/25 px-1.5 font-mono text-[10px] text-white/80 md:inline">Ctrl K</kbd>}
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-white/80 bg-white text-[#10233a] shadow-[0_24px_48px_-20px_rgba(16,35,58,0.55)]">
          <div className="max-h-[60vh] overflow-y-auto">
            {!typed ? (
              <p className="px-4 py-4 text-xs text-[#4f6480]">Type at least two characters, or paste an id.</p>
            ) : failed ? (
              <p className="px-4 py-4 text-xs text-red-700" role="alert">Search failed. Try again in a moment.</p>
            ) : flat.length === 0 && !loading ? (
              <p className="px-4 py-4 text-xs text-[#4f6480]">No matches for “{query.trim()}”.</p>
            ) : (
              <ul id={listId} role="listbox" className="py-1">
                {flat.map((hit, i) => {
                  const clickable = !!destinationOf(hit);
                  return (
                    <li key={`${hit.type}-${hit.id}`} id={`${listId}-${i}`} role="option" aria-selected={i === cursor}>
                      <button type="button" onMouseEnter={() => setCursor(i)} onClick={() => choose(hit)}
                        className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors duration-100 ${i === cursor ? "bg-[#eef4fb]" : ""} ${clickable ? "" : "cursor-default"}`}>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{hit.title}</span>
                          {hit.subtitle && <span className="block truncate text-xs text-[#4f6480]">{hit.subtitle}</span>}
                        </span>
                        <span className="shrink-0 rounded-full bg-[#e6eef8] px-2 py-0.5 text-[10px] font-bold text-[#41567a]">{TYPE_LABEL[hit.type] ?? hit.type}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-[#dfe6ef] px-4 py-1.5 text-[11px] text-[#4f6480]">
            <span>↑↓ move · ↵ open · esc close</span>
            <span className="hidden sm:inline">Users, offers and matches open; others are lookup only</span>
          </div>
        </div>
      )}
    </div>
  );
}
