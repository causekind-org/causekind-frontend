"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  superAdminSearch,
  type SaInterventionEntity,
  type SaSearchHit,
  type SaSearchResponse,
} from "@/lib/api";
import { saTheme } from "@/components/super-admin/saTheme";
import { Loader2, Search } from "lucide-react";

const TYPE_LABEL: Record<string, string> = {
  USER: "Users",
  REQUEST: "Requests",
  LISTING: "Listings",
  OFFER: "Offers",
  MATCH: "Matches",
  CERTIFICATE: "Certificates",
};

/**
 * Debounced search across every entity type, grouped by type.
 *
 * <p>Results are grouped rather than ranked into one list: relevance across
 * unlike types is not meaningful, and an agent is looking for one kind of thing
 * at a time.
 */
export function useGlobalSearch(minLength = 2, limit = 5) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SaSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  // Guards against a slow early request landing after a fast later one and
  // painting stale results over the current query.
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < minLength) {
      setResults(null);
      setLoading(false);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(() => {
      superAdminSearch(trimmed, undefined, limit)
        .then((res) => { if (id === requestId.current) setResults(res); })
        .catch(() => { if (id === requestId.current) setResults(null); })
        .finally(() => { if (id === requestId.current) setLoading(false); });
    }, 250);

    return () => clearTimeout(timer);
  }, [query, minLength, limit]);

  return { query, setQuery, results, loading };
}

export function GlobalSearchPanel({
  onOpenUser,
  onOpenIntervention,
  isDark,
}: {
  onOpenUser: (id: number) => void;
  onOpenIntervention: (entity: SaInterventionEntity, id: number) => void;
  isDark: boolean;
}) {
  const t = saTheme(isDark);
  const { query, setQuery, results, loading } = useGlobalSearch(2, 10);

  // Kept in step with CommandPalette's destinationOf — the same hit must lead to
  // the same place whether it was found here or through ⌘K.
  const hasDestination = useCallback(
    (hit: SaSearchHit) => hit.type === "USER" || hit.type === "OFFER" || hit.type === "MATCH",
    []
  );

  const open = useCallback(
    (hit: SaSearchHit) => {
      if (hit.type === "USER") onOpenUser(hit.id);
      else if (hit.type === "OFFER") onOpenIntervention("offers", hit.id);
      else if (hit.type === "MATCH") onOpenIntervention("matches", hit.id);
    },
    [onOpenUser, onOpenIntervention]
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-lg">
        <Search className={`absolute left-2.5 top-1/2 size-4 -translate-y-1/2 ${t.dim}`} />
        <input
          autoFocus
          placeholder="Search users, requests, listings, offers, matches, certificates…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`h-10 w-full rounded-lg border pl-8 pr-3 text-sm transition-colors ${t.input}`}
        />
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className={`size-6 animate-spin ${t.dim}`} />
        </div>
      )}

      {!loading && query.trim().length >= 2 && results?.groups.length === 0 && (
        <p className={`py-10 text-center text-sm ${t.muted}`}>
          Nothing matches “{query.trim()}”.
        </p>
      )}

      {!loading && query.trim().length < 2 && (
        <p className={`py-10 text-center text-sm ${t.muted}`}>
          Type at least two characters. A bare number finds a record by its id.
        </p>
      )}

      {!loading &&
        results?.groups.map((group) => (
          <section key={group.type} className="space-y-1.5">
            <h3 className={`flex items-baseline gap-2 text-sm font-bold ${t.heading}`}>
              {TYPE_LABEL[group.type] ?? group.type}
              <span className={`text-xs font-normal ${t.muted}`}>
                {group.totalMatches} match{group.totalMatches === 1 ? "" : "es"}
                {group.totalMatches > group.hits.length && ` · showing ${group.hits.length}`}
              </span>
            </h3>
            <ul className={`divide-y rounded-xl border ${t.cardFlat} ${t.divide}`}>
              {group.hits.map((hit) => (
                <li
                  key={`${hit.type}-${hit.id}`}
                  onClick={() => open(hit)}
                  className={`flex flex-wrap items-center justify-between gap-2 p-3 transition-colors ${
                    hasDestination(hit) ? `cursor-pointer ${t.rowHover}` : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${t.heading}`}>{hit.title}</p>
                    {hit.subtitle && (
                      <p className={`truncate text-xs ${t.muted}`}>{hit.subtitle}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {hit.status && (
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${t.badge}`}>
                        {hit.status}
                      </span>
                    )}
                    <span className={`text-[11px] tabular-nums ${t.dim}`}>#{hit.id}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
