"use client";

import { useCallback, useEffect, useState } from "react";
import {
  SA_CANCELLATION_REASONS,
  saReasonRequiresDetails,
  superAdminCancel,
  superAdminCancellationPreview,
  type SaCancellationOption,
  type SaCancellationPreview,
  type SaCancellationReason,
  type SaConsequenceKind,
  type SaInterventionEntity,
} from "@/lib/api";
import { saTheme } from "@/components/super-admin/saTheme";
import {
  ArrowRightLeft, Award, Ban, Bell, CheckCircle2, Eraser, Flag, Info,
  Loader2, PackageOpen, RotateCcw, Search, ShieldAlert, TriangleAlert,
  UserCheck, Users, type LucideIcon,
} from "lucide-react";

/**
 * Staff cancellation: what would happen, then confirmation, then the act.
 *
 * <p>The backend for this shipped with Phase 5A on 2026-08-10 and had no console
 * reaching it until now. That ordering matters for how this is written — the
 * endpoints had never been exercised by a person, so this panel surfaces what
 * the API actually returns rather than assuming the happy path.
 *
 * <p><b>Verified live on 2026-08-14</b> against a real backend and Postgres: the
 * refusal path only. A DRAFT offer renders NONE with the server's own
 * blockedReason and offers no confirm control at all, the 404 surfaces, entity
 * switching hits the right path, and ⌘K lands here already looked up. <b>The
 * mutating paths — an allowed preview, the consequence list, the OVERRIDE
 * acknowledgement and the cancel POST itself — have still never run against a
 * real record</b>, because the dev branch has no offer past DRAFT. Treat the
 * unit tests covering them as mocks, not verification; every earlier phase of
 * this rebuild had defects that only live use found.
 *
 * <p><b>The preview is authoritative, not advisory.</b> `option` is the same
 * answer {@code CancellationPolicy} gives the execute path, so when it says
 * `allowed: false` the POST would be refused for exactly the stated reason.
 * There is therefore no confirm button in that case at all — offering one that
 * is guaranteed to fail would be a lie told by the UI.
 *
 * <p>Everything shown is the server's own words. No consequence text, action
 * label or refusal reason is composed here; two accounts of the same behaviour
 * drift, and this codebase has already paid for that once.
 */

const ENTITIES: { value: SaInterventionEntity; label: string }[] = [
  { value: "offers", label: "Offer" },
  { value: "matches", label: "Match" },
];

/**
 * Presentation for each consequence kind.
 *
 * `severe` is not decoration. Those three are the ones that undo something a
 * real person recorded or that follows them afterwards — a raised fraud flag, an
 * erased handover confirmation, an issued certificate that stops matching
 * reality. An agent skim-reading a list of nine grey rows should still not miss
 * those.
 */
const CONSEQUENCE_META: Record<
  SaConsequenceKind,
  { label: string; icon: LucideIcon; severe: boolean }
> = {
  STATUS_CHANGE:       { label: "Status change",      icon: ArrowRightLeft, severe: false },
  ITEM_RELEASED:       { label: "Item released",      icon: PackageOpen,    severe: false },
  REQUEST_REOPENED:    { label: "Request reopened",   icon: RotateCcw,      severe: false },
  BACKUP_PROMOTED:     { label: "Backup promoted",    icon: UserCheck,      severe: false },
  WAITLIST_NOTIFIED:   { label: "Waitlist notified",  icon: Users,          severe: false },
  NOTIFICATION:        { label: "Notification",       icon: Bell,           severe: false },
  FRAUD_FLAG:          { label: "Fraud flag raised",  icon: Flag,           severe: true  },
  CONFIRMATION_ERASED: { label: "Confirmation erased", icon: Eraser,        severe: true  },
  CERTIFICATE_AFFECTED:{ label: "Certificate affected", icon: Award,        severe: true  },
};

export function InterventionsPanel({
  isDark,
  initialTarget,
}: {
  isDark: boolean;
  /** Set when arriving from search or ⌘K, so the record is already loaded. */
  initialTarget?: { entity: SaInterventionEntity; id: number };
}) {
  const t = saTheme(isDark);

  const [entity, setEntity] = useState<SaInterventionEntity>(initialTarget?.entity ?? "offers");
  const [idText, setIdText] = useState(initialTarget ? String(initialTarget.id) : "");

  const [preview, setPreview] = useState<SaCancellationPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [reason, setReason] = useState<SaCancellationReason>("ITEM_NO_LONGER_AVAILABLE");
  const [details, setDetails] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<SaCancellationOption | null>(null);

  const load = useCallback(async (which: SaInterventionEntity, id: number) => {
    setLoading(true);
    setLoadError(null);
    setPreview(null);
    setResult(null);
    setSubmitError(null);
    setAcknowledged(false);
    try {
      setPreview(await superAdminCancellationPreview(which, id));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load the preview.");
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
      return;
    }
    void load(entity, id);
  }

  const option = preview?.option ?? null;
  const needsDetails = saReasonRequiresDetails(reason);
  const isOverride = option?.outcome === "OVERRIDE";
  const detailsMissing = needsDetails && details.trim().length === 0;
  const canSubmit =
    !!option?.allowed && !submitting && !detailsMissing && (!isOverride || acknowledged);

  async function onConfirm() {
    if (!preview || !option?.allowed) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const outcome = await superAdminCancel(entity, preview.entityId, {
        reason,
        details: details.trim() || undefined,
      });
      setResult(outcome);
      // Re-read rather than patching local state: the record's available action
      // has changed, and the policy is the only thing that knows into what.
      await load(entity, preview.entityId);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "The cancellation was refused.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className={`text-lg font-bold ${t.heading}`}>Interventions</h2>
        <p className={`text-xs ${t.muted}`}>
          Ending an offer or match on behalf of the people in it. Every action shows
          what follows from it first.
        </p>
      </div>

      {/* ── Record lookup ───────────────────────────────────────────────── */}
      <form onSubmit={onLookup} className={`rounded-xl border p-3 ${t.card}`}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5">
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

      {preview && (
        <div className={`space-y-4 rounded-xl border p-4 ${t.card}`}>
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-bold ${t.heading}`}>
              {preview.entityType} #{preview.entityId}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${t.badge}`}>
              {preview.currentStatus}
            </span>
            {option?.late && (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${t.badgeDanger}`}>
                Counterpart already committed
              </span>
            )}
          </div>

          {/* ── Refusals. No action is offered, because none would succeed. ──
              The DISPUTE arm below is unreachable from this console today, and
              that was confirmed live on 2026-08-14 rather than assumed: both
              `previewOfferAsAdmin` and `previewMatchAsAdmin` pass
              `Actor.ADMIN`, and `CancellationPolicy` never answers DISPUTE for
              that actor — every state where a donor or donee is told to report
              an issue instead returns OVERRIDE for staff. Only NONE renders
              here. It is kept because the arm costs nothing and the policy is
              the kind of thing that changes; do not read it as a distinction
              the console currently draws. */}
          {option && !option.allowed && (
            <div className={`flex gap-2.5 rounded-lg border p-3 ${t.dangerPanel}`}>
              <Ban className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-bold">
                  {option.outcome === "DISPUTE"
                    ? "This is past the point of cancelling"
                    : "No action available here"}
                </p>
                <p className="text-xs">{option.blockedReason}</p>
                {option.outcome === "DISPUTE" && (
                  <p className="text-xs">
                    The donation happened. The honest route is Report an issue, which keeps
                    the record of what took place instead of rewriting it as a cancellation.
                  </p>
                )}
              </div>
            </div>
          )}

          {option?.allowed && (
            <>
              {/* OVERRIDE is deliberately not styled as an ordinary cancellation.
                  It is staff acting past the boundary a donor or donee is stopped
                  at, it can erase a confirmation somebody recorded, and the
                  outcome's own contract says it must read differently here. */}
              {isOverride && (
                <div className={`flex gap-2.5 rounded-lg border p-3 ${t.dangerPanel}`}>
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold">Staff override</p>
                    <p className="text-xs">
                      This goes past the point where a donor or donee is told to report an
                      issue instead. It is recorded as an override in the audit trail and on
                      the user&apos;s timeline, not as an ordinary cancellation.
                    </p>
                  </div>
                </div>
              )}

              {option.warning && !isOverride && (
                <div className={`flex gap-2.5 rounded-lg border p-3 ${t.dangerPanel}`}>
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <p className="text-xs">{option.warning}</p>
                </div>
              )}
              {option.warning && isOverride && (
                <p className={`text-xs ${t.text}`}>{option.warning}</p>
              )}

              {/* ── Consequences ──────────────────────────────────────────── */}
              <div className="space-y-2">
                <h3 className={`text-xs font-black uppercase tracking-wider ${t.dim}`}>
                  What follows
                </h3>
                {preview.consequences.length === 0 ? (
                  // Empty means the backend built no consequences for this outcome,
                  // which is a statement and not a failure to compute one.
                  <p className={`flex items-center gap-2 text-xs ${t.muted}`}>
                    <Info className="size-3.5 shrink-0" />
                    Nothing else follows from this.
                  </p>
                ) : (
                  <ul className={`divide-y rounded-lg border ${t.cardFlat} ${t.divide}`}>
                    {preview.consequences.map((c, i) => {
                      const meta = CONSEQUENCE_META[c.kind];
                      const Icon = meta?.icon ?? Info;
                      return (
                        <li key={`${c.kind}-${i}`} className="flex items-start gap-2.5 p-2.5">
                          <Icon
                            className={`mt-0.5 size-4 shrink-0 ${
                              meta?.severe ? "text-red-500" : t.dim
                            }`}
                          />
                          <div className="min-w-0">
                            <p className={`text-xs font-bold ${meta?.severe ? "text-red-500" : t.text}`}>
                              {/* Unknown kinds print their raw name rather than
                                  disappearing: a consequence the console cannot
                                  label is still one the agent must see. */}
                              {meta?.label ?? c.kind}
                            </p>
                            <p className={`text-xs ${t.muted}`}>{c.description}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* ── Reason ────────────────────────────────────────────────── */}
              <div className="space-y-2">
                <h3 className={`text-xs font-black uppercase tracking-wider ${t.dim}`}>
                  Reason
                </h3>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as SaCancellationReason)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${t.input}`}
                >
                  {SA_CANCELLATION_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>

                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  aria-label="Reason details"
                  placeholder={
                    needsDetails
                      ? "Required — what happened, in enough detail for whoever reads this next"
                      : "Optional context"
                  }
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${t.input}`}
                />
                {detailsMissing && (
                  <p className="text-xs text-red-500">
                    {reason === "SAFETY_CONCERN"
                      ? "A safety concern nobody can read is not actionable — describe it."
                      : "“Other” says nothing on its own. Describe what happened."}
                  </p>
                )}
                {reason === "SAFETY_CONCERN" && (
                  <p className={`text-xs ${t.muted}`}>
                    This also raises a fraud flag for admin attention.
                  </p>
                )}
              </div>

              {isOverride && (
                <label className={`flex cursor-pointer items-start gap-2 text-xs ${t.text}`}>
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    className="mt-0.5 size-3.5 shrink-0"
                  />
                  <span>
                    I understand this overrides a completed step and will be recorded as a
                    staff override.
                  </span>
                </label>
              )}

              {submitError && (
                <div className={`rounded-lg border p-3 text-xs ${t.dangerPanel}`}>{submitError}</div>
              )}

              <button
                type="button"
                onClick={onConfirm}
                disabled={!canSubmit}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold ${
                  isOverride || option.outcome === "CANCEL"
                    ? "border-red-500 bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:pointer-events-none"
                    : t.btnAccent
                }`}
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {/* The server's label, never a generic "Cancel" — it is written to
                    say what this specific act is. */}
                {option.actionLabel ?? "Confirm"}
              </button>
            </>
          )}

          {result && (
            <div className={`flex items-start gap-2.5 rounded-lg border p-3 ${t.accentPanel}`}>
              <CheckCircle2 className={`mt-0.5 size-4 shrink-0 ${t.text}`} />
              <div className={`text-xs ${t.text}`}>
                <p className="font-bold">Done — recorded as {result.outcome}.</p>
                <p className={t.muted}>
                  The preview above has been reloaded and now shows what remains possible.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {!preview && !loading && !loadError && (
        <p className={`rounded-xl border p-6 text-center text-xs ${t.card} ${t.muted}`}>
          Look up an offer or a match to see what staff can do to it.
        </p>
      )}
    </div>
  );
}
