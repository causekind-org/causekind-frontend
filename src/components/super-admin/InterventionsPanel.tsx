"use client";

import { useCallback, useEffect, useState } from "react";
import {
  superAdminActions,
  superAdminCancellationPreview,
  superAdminMatchState,
  type SaActionEntity,
  type SaCancellationPreview,
  type SaInterventionAction,
  type SaInterventionEntity,
  type SaMatchState,
} from "@/lib/api";
import { saTheme } from "@/components/super-admin/saTheme";
import { CancellationSection } from "@/components/super-admin/CancellationSection";
import { InterventionActions } from "@/components/super-admin/InterventionActions";
import { MatchStatePanel } from "@/components/super-admin/MatchStatePanel";
import { Loader2, Search } from "lucide-react";

/**
 * Staff intervening in someone else's donation.
 *
 * <p>Phase 5B-1 gave the console a way to reach the cancellation endpoints that
 * had shipped backend-only. Phase 5B-2 adds the named domain actions and the
 * match state view, so this file became the shell: it resolves a record, then
 * composes whichever of the three sections apply.
 *
 * <p><b>Which sections apply, and why they differ:</b>
 *
 * <ul>
 *   <li><b>Requests and listings</b> have named actions only. Neither has a
 *       staff cancellation endpoint — {@code CancellationService} exposes admin
 *       preview/cancel for offers and matches and nothing else, so offering a
 *       cancellation box here would be a control with no server behind it.</li>
 *   <li><b>Offers</b> have both: actions and cancellation.</li>
 *   <li><b>Matches</b> have the state view and cancellation, but no named
 *       actions — a match is the meeting of two records rather than a queue item,
 *       and holding one is meaningless when the thing to pause is the request or
 *       the listing behind it.</li>
 * </ul>
 *
 * <p>Everything shown on this screen is the server's own words — action labels,
 * refusal reasons, consequence text. Nothing is composed here; two accounts of
 * the same behaviour drift, and this codebase has already paid for that once.
 */

type Entity = SaActionEntity | "matches";

const ENTITIES: { value: Entity; label: string }[] = [
  { value: "requests", label: "Request" },
  { value: "listings", label: "Listing" },
  { value: "offers",   label: "Offer" },
  { value: "matches",  label: "Match" },
];

/** Which record types have a staff cancellation endpoint behind them. */
function isCancellable(entity: Entity): entity is SaInterventionEntity {
  return entity === "offers" || entity === "matches";
}

/** Which have named domain actions. */
function hasActions(entity: Entity): entity is SaActionEntity {
  return entity !== "matches";
}

export function InterventionsPanel({
  isDark,
  initialTarget,
}: {
  isDark: boolean;
  /** Set when arriving from search or ⌘K, so the record is already loaded. */
  initialTarget?: { entity: SaInterventionEntity; id: number };
}) {
  const t = saTheme(isDark);

  const [entity, setEntity] = useState<Entity>(initialTarget?.entity ?? "offers");
  const [idText, setIdText] = useState(initialTarget ? String(initialTarget.id) : "");
  const [loadedId, setLoadedId] = useState<number | null>(null);

  const [preview, setPreview] = useState<SaCancellationPreview | null>(null);
  const [actions, setActions] = useState<SaInterventionAction[] | null>(null);
  const [matchState, setMatchState] = useState<SaMatchState | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (which: Entity, id: number) => {
    setLoading(true);
    setLoadError(null);
    setPreview(null);
    setActions(null);
    setMatchState(null);
    try {
      // Fetched together rather than in sequence: they are independent reads and
      // an agent waiting on a support call should not pay for them one at a time.
      const [previewResult, actionsResult, stateResult] = await Promise.all([
        isCancellable(which) ? superAdminCancellationPreview(which, id) : Promise.resolve(null),
        hasActions(which) ? superAdminActions(which, id) : Promise.resolve(null),
        which === "matches" ? superAdminMatchState(id) : Promise.resolve(null),
      ]);
      setPreview(previewResult);
      setActions(actionsResult);
      setMatchState(stateResult);
      setLoadedId(id);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load this record.");
      setLoadedId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Arriving from search should land on a loaded record, not on a form the agent
  // has to submit again with the values already filled in.
  useEffect(() => {
    if (initialTarget) {
      setEntity(initialTarget.entity);
      setIdText(String(initialTarget.id));
      void load(initialTarget.entity, initialTarget.id);
    }
  }, [initialTarget, load]);

  function onLookup(e: React.FormEvent) {
    e.preventDefault();
    const id = Number(idText.trim());
    if (!Number.isInteger(id) || id <= 0) {
      setLoadError("Enter a numeric record id.");
      setPreview(null);
      setActions(null);
      setMatchState(null);
      setLoadedId(null);
      return;
    }
    void load(entity, id);
  }

  const loaded = loadedId !== null && (preview || actions || matchState);

  return (
    <div className="space-y-4">
      <div>
        <h2 className={`text-lg font-bold ${t.heading}`}>Interventions</h2>
        <p className={`text-xs ${t.muted}`}>
          Acting on a record on behalf of the people in it. Every action shows what
          follows from it first.
        </p>
      </div>

      {/* ── Record lookup ───────────────────────────────────────────────── */}
      <form onSubmit={onLookup} className={`rounded-xl border p-3 ${t.card}`}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {ENTITIES.map((e) => (
              <button
                key={e.value}
                type="button"
                onClick={() => setEntity(e.value)}
                className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                  entity === e.value ? t.chipActive : t.chipInactive
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
          <input
            value={idText}
            onChange={(ev) => setIdText(ev.target.value)}
            inputMode="numeric"
            aria-label="Record id"
            placeholder="Record id"
            className={`w-32 rounded-lg border px-3 py-1.5 text-sm ${t.input}`}
          />
          <button
            type="submit"
            disabled={loading}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold ${t.btn}`}
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
            Look up
          </button>
        </div>
        <p className={`mt-2 text-[11px] ${t.dim}`}>
          ⌘K search opens offers and matches here directly.
        </p>
      </form>

      {loadError && (
        <div className={`rounded-xl border p-3 text-sm ${t.dangerPanel}`}>{loadError}</div>
      )}

      {loaded && (
        <div className={`space-y-5 rounded-xl border p-4 ${t.card}`}>
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-bold ${t.heading}`}>
              {preview ? preview.entityType : entity.replace(/s$/, "")} #{loadedId}
            </span>
            {preview && (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${t.badge}`}>
                {preview.currentStatus}
              </span>
            )}
            {preview?.option?.late && (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${t.badgeDanger}`}>
                Counterpart already committed
              </span>
            )}
          </div>

          {matchState && <MatchStatePanel state={matchState} isDark={isDark} />}

          {actions && loadedId !== null && hasActions(entity) && (
            <InterventionActions
              entity={entity}
              id={loadedId}
              actions={actions}
              isDark={isDark}
              onChanged={setActions}
            />
          )}

          {preview && isCancellable(entity) && (
            <div className="space-y-2">
              <h3 className={`text-xs font-black uppercase tracking-wider ${t.dim}`}>
                Cancellation
              </h3>
              <CancellationSection
                entity={entity}
                preview={preview}
                isDark={isDark}
                onExecuted={() => loadedId !== null && void load(entity, loadedId)}
              />
            </div>
          )}
        </div>
      )}

      {!loaded && !loading && !loadError && (
        <p className={`rounded-xl border p-6 text-center text-xs ${t.card} ${t.muted}`}>
          Look up a request, listing, offer or match to see what staff can do to it.
        </p>
      )}
    </div>
  );
}
