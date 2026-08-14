"use client";

import { saTheme } from "@/components/super-admin/saTheme";
import type { SaMatchState } from "@/lib/api";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDot, Clock, User } from "lucide-react";

/**
 * The state-machine view of a match.
 *
 * <p>What makes this more than a record dump is the handover block. <b>The
 * half-confirmed handover has no status of its own</b> — it lives in two
 * timestamps — and it is the most confusing state to meet in support, because the
 * match still reads as in-progress while one party believes it is finished.
 * Naming it is most of the value of this screen.
 *
 * <p>`stuckSince` null means <b>unknown</b>, not "just changed": nothing has been
 * recorded. Those must not render the same, because one is a reason to chase
 * someone and the other is a reason to go and look.
 */

function ago(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function MatchStatePanel({ state, isDark }: { state: SaMatchState; isDark: boolean }) {
  const t = saTheme(isDark);
  const h = state.handover;
  const elapsed = ago(state.stuckSince);

  return (
    <div className="space-y-4">
      {/* ── Status ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${t.badge}`}>
          {state.status}
        </span>
        {state.terminal && (
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${t.badge}`}>
            Terminal
          </span>
        )}
        <span className={`flex items-center gap-1 text-[11px] ${t.dim}`}>
          <Clock className="size-3" />
          {elapsed
            ? `in this status for ${elapsed}`
            : "no recorded transitions — how long this has been here is unknown"}
        </span>
      </div>

      {/* ── The state with no name ──────────────────────────────────────── */}
      {h.partlyConfirmed && (
        <div className={`flex gap-2.5 rounded-lg border p-3 ${t.dangerPanel}`}>
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-bold">Half-confirmed handover</p>
            <p className="text-xs">
              One side has confirmed and the other has not. There is no status for this,
              so the match still reads as in progress while one party believes it is
              finished. Cancelling here erases a confirmation somebody recorded, which is
              why staff get an override rather than an ordinary cancellation.
            </p>
          </div>
        </div>
      )}

      {/* ── Confirmations ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        <h3 className={`text-xs font-black uppercase tracking-wider ${t.dim}`}>Handover</h3>
        <ul className={`divide-y rounded-lg border ${t.cardFlat} ${t.divide}`}>
          {[
            { who: "Donor", confirmed: h.donorConfirmed, at: h.donorConfirmedAt, person: state.donor },
            { who: "Donee", confirmed: h.doneeConfirmed, at: h.doneeConfirmedAt, person: state.donee },
          ].map((row) => (
            <li key={row.who} className="flex items-center gap-2.5 p-2.5">
              {row.confirmed ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              ) : (
                <CircleDot className={`size-4 shrink-0 ${t.dim}`} />
              )}
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-bold ${t.text}`}>
                  {row.who}
                  {row.person && (
                    <span className={`ml-1.5 font-normal ${t.muted}`}>{row.person.name}</span>
                  )}
                </p>
                <p className={`text-xs ${t.muted}`}>
                  {row.confirmed
                    ? `Confirmed${row.at ? ` · ${new Date(row.at).toLocaleString()}` : ""}`
                    : "Not confirmed"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Participants ────────────────────────────────────────────────── */}
      {(state.donor || state.donee) && (
        <div className="space-y-2">
          <h3 className={`text-xs font-black uppercase tracking-wider ${t.dim}`}>Participants</h3>
          <ul className={`divide-y rounded-lg border ${t.cardFlat} ${t.divide}`}>
            {[state.donor, state.donee].filter(Boolean).map((p) => (
              <li key={p!.userId} className="flex items-center gap-2.5 p-2.5">
                <User className={`size-4 shrink-0 ${t.dim}`} />
                <div className="min-w-0">
                  <p className={`truncate text-xs font-bold ${t.text}`}>{p!.name}</p>
                  <p className={`truncate text-xs ${t.muted}`}>{p!.email}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── History ─────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <h3 className={`text-xs font-black uppercase tracking-wider ${t.dim}`}>
          Transitions
        </h3>
        {state.history.length === 0 ? (
          <p className={`text-xs ${t.muted}`}>
            Nothing recorded. This match has no status history, which is why the age above
            is unknown rather than zero.
          </p>
        ) : (
          <ul className={`divide-y rounded-lg border ${t.cardFlat} ${t.divide}`}>
            {[...state.history].reverse().map((h2, i) => (
              <li key={i} className="p-2.5">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className={t.muted}>{h2.fromStatus}</span>
                  <ArrowRight className={`size-3 ${t.dim}`} />
                  <span className={`font-bold ${t.text}`}>{h2.toStatus}</span>
                  <span className={`ml-auto ${t.dim}`}>
                    {h2.at ? new Date(h2.at).toLocaleString() : ""}
                  </span>
                </div>
                {(h2.changedBy || h2.note) && (
                  <p className={`mt-0.5 text-xs ${t.muted}`}>
                    {h2.changedBy}
                    {h2.changedBy && h2.note ? " · " : ""}
                    {h2.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
