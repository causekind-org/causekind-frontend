"use client";

import { useCallback, useEffect, useState } from "react";
import {
  superAdminAuditExport,
  superAdminReveal,
  superAdminRevealLog,
  type SaRevealField,
  type SaRevealLogEntry,
} from "@/lib/api";
import { saTheme } from "@/components/super-admin/saTheme";
import { Copy, Download, Eye, Loader2, ScrollText, ShieldAlert } from "lucide-react";

/**
 * Phase 7: reading a private detail in full, and the trail of having done so.
 *
 * <p><b>The justification is required before the value appears</b>, not collected
 * after. That ordering is most of the control — a field you must fill in order to
 * see something makes you state a purpose, and a log nobody has to write in front
 * of fills up with blanks.
 *
 * <p>The revealed value is deliberately <b>not</b> kept in component state beyond
 * the moment it is shown. It is not re-fetched on re-render, not cached, and
 * clearing it is one click — because a contact detail left sitting on screen
 * through a screen-share is the leak this whole mechanism exists to prevent.
 */

const FIELDS: { value: SaRevealField; label: string }[] = [
  { value: "EMAIL", label: "Email address" },
  { value: "PHONE", label: "Phone number" },
];

export function GovernancePanel({ isDark }: { isDark: boolean }) {
  const t = saTheme(isDark);

  const [userIdText, setUserIdText] = useState("");
  const [field, setField] = useState<SaRevealField>("EMAIL");
  const [justification, setJustification] = useState("");
  const [revealing, setRevealing] = useState(false);
  const [revealed, setRevealed] = useState<{ field: string; value: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [log, setLog] = useState<SaRevealLogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState<string | null>(null);

  const loadLog = useCallback(async () => {
    setLogLoading(true);
    try {
      setLog((await superAdminRevealLog({ size: 25 })).items);
    } catch {
      setLog([]);
    } finally {
      setLogLoading(false);
    }
  }, []);

  useEffect(() => { void loadLog(); }, [loadLog]);

  const canReveal = justification.trim().length > 0 && userIdText.trim().length > 0 && !revealing;

  async function onReveal() {
    const targetUserId = Number(userIdText.trim());
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      setError("Enter the numeric id of the user.");
      return;
    }
    setRevealing(true);
    setError(null);
    setRevealed(null);
    try {
      setRevealed(await superAdminReveal({ targetUserId, field, justification: justification.trim() }));
      setJustification("");
      await loadLog();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The reveal was refused.");
    } finally {
      setRevealing(false);
    }
  }

  async function onExport() {
    setExporting(true);
    setExportNote(null);
    try {
      const csv = await superAdminAuditExport();
      // Copied rather than downloaded: a download started by script is blocked
      // in some embedded contexts, and silently doing nothing is worse than
      // handing the agent something they can paste.
      await navigator.clipboard.writeText(csv);
      const truncated = csv.includes("# TRUNCATED:");
      setExportNote(
        truncated
          ? "Copied to the clipboard — but the export hit its 10,000-row cap. The last line says so; narrow the filters for the rest."
          : `Copied to the clipboard — ${csv.trim().split("\n").length - 1} rows.`
      );
    } catch (e) {
      setExportNote(e instanceof Error ? e.message : "The export failed.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className={`text-lg font-bold ${t.heading}`}>Governance</h2>
        <p className={`text-xs ${t.muted}`}>
          Reading a private detail in full, and the record of everyone who has.
        </p>
      </div>

      {/* ── Reveal ──────────────────────────────────────────────────────── */}
      <div className={`space-y-3 rounded-xl border p-4 ${t.card}`}>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={userIdText}
            onChange={(e) => setUserIdText(e.target.value)}
            inputMode="numeric"
            aria-label="User id"
            placeholder="User id"
            className={`w-32 rounded-lg border px-3 py-1.5 text-sm ${t.input}`}
          />
          <select
            value={field}
            aria-label="Field"
            onChange={(e) => setField(e.target.value as SaRevealField)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${t.input}`}
          >
            {FIELDS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        <textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          rows={2}
          aria-label="Justification"
          placeholder="Why do you need this? Recorded against your name, permanently."
          className={`w-full rounded-lg border px-3 py-2 text-sm ${t.input}`}
        />
        {justification.trim().length === 0 && (
          <p className={`text-xs ${t.muted}`}>
            The reason is recorded with the reveal. It is required before the value is shown.
          </p>
        )}

        {error && <div className={`rounded-lg border p-3 text-xs ${t.dangerPanel}`}>{error}</div>}

        <button
          type="button"
          onClick={onReveal}
          disabled={!canReveal}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold ${t.btn} disabled:opacity-40 disabled:pointer-events-none`}
        >
          {revealing ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
          Reveal
        </button>

        {revealed && (
          <div className={`flex items-start gap-2.5 rounded-lg border p-3 ${t.dangerPanel}`}>
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-bold">{revealed.field}</p>
              <p className="break-all font-mono text-sm">{revealed.value}</p>
              <button
                type="button"
                onClick={() => setRevealed(null)}
                className="text-[11px] underline opacity-80"
              >
                Hide it
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Audit export ────────────────────────────────────────────────── */}
      <div className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 ${t.card}`}>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold ${t.btn}`}
        >
          {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          Export audit log (CSV)
        </button>
        {exportNote && (
          <p className={`flex items-center gap-1.5 text-xs ${t.muted}`}>
            <Copy className="size-3" />
            {exportNote}
          </p>
        )}
      </div>

      {/* ── Reveal trail ────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <h3 className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-wider ${t.dim}`}>
          <ScrollText className="size-3.5" />
          Who has read what
        </h3>
        {logLoading ? (
          <p className={`text-xs ${t.muted}`}>Loading…</p>
        ) : log.length === 0 ? (
          <p className={`rounded-xl border p-6 text-center text-xs ${t.card} ${t.muted}`}>
            Nobody has revealed a private detail yet.
          </p>
        ) : (
          <ul className={`divide-y rounded-xl border ${t.card} ${t.divide}`}>
            {log.map((r) => (
              <li key={r.id} className="p-3">
                <p className={`text-xs font-bold ${t.text}`}>
                  {r.actorEmail} read {r.field.toLowerCase()} of user {r.targetUserId}
                </p>
                <p className={`text-xs ${t.muted}`}>
                  {new Date(r.revealedAt).toLocaleString()}
                  {r.caseId ? ` · case ${r.caseId}` : ""}
                </p>
                {/* The stated reason is the point of the record. Shown in full,
                    not truncated behind a hover. */}
                <p className={`mt-0.5 text-xs ${t.text}`}>
                  {r.justification || <span className={t.dim}>No reason recorded.</span>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
