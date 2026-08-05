"use client";

import { useEffect, useState } from "react";
import { useGlobalSearch } from "@/components/super-admin/GlobalSearchPanel";
import type { SaSearchHit } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";

const TYPE_LABEL: Record<string, string> = {
  USER: "User",
  REQUEST: "Request",
  LISTING: "Listing",
  OFFER: "Offer",
  MATCH: "Match",
  CERTIFICATE: "Certificate",
};

/**
 * ⌘K / Ctrl-K overlay over the same global search as the Search page.
 *
 * <p>Shares {@link useGlobalSearch} with that page rather than re-querying its
 * own way, so debounce, minimum length and the stale-response guard cannot drift
 * between the two places a search can start.
 *
 * <p>Deliberately not a shadcn Dialog: this needs to stay mounted and keep focus
 * on a plain input, and the dialog primitive's focus trap fights the arrow-key
 * navigation below for no benefit at this size.
 */
export function CommandPalette({ onOpenUser }: { onOpenUser: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const { query, setQuery, results, loading } = useGlobalSearch(2, 5);

  // Flattened because the cursor moves through results, not through groups.
  const flat: SaSearchHit[] = results?.groups.flatMap((g) => g.hits) ?? [];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { setCursor(0); }, [results]);

  useEffect(() => {
    if (!open) { setQuery(""); setCursor(0); }
  }, [open, setQuery]);

  if (!open) return null;

  function choose(hit: SaSearchHit) {
    // Only users have a destination in this phase. The rest still show, because
    // "does this record exist and what state is it in" is itself the answer an
    // agent often needs; their workspaces arrive with the intervention phases.
    if (hit.type === "USER") {
      onOpenUser(hit.id);
      setOpen(false);
    }
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, Math.max(flat.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && flat[cursor]) {
      e.preventDefault();
      choose(flat[cursor]);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search everything…"
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {query.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              Type at least two characters, or paste an id.
            </p>
          ) : flat.length === 0 && !loading ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">No matches.</p>
          ) : (
            <ul className="py-1">
              {flat.map((hit, i) => (
                <li key={`${hit.type}-${hit.id}`}>
                  <button
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => choose(hit)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left ${
                      i === cursor ? "bg-muted" : ""
                    } ${hit.type === "USER" ? "" : "cursor-default"}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">{hit.title}</p>
                      {hit.subtitle && (
                        <p className="truncate text-xs text-muted-foreground">{hit.subtitle}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {TYPE_LABEL[hit.type] ?? hit.type}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          <span>↑↓ to move · ↵ to open · esc to close</span>
          <span>Users open directly; other types are lookup only for now</span>
        </div>
      </div>
    </div>
  );
}
