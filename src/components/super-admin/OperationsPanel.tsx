"use client";

import { useCallback, useEffect, useState } from "react";
import {
  superAdminConfig,
  superAdminHealth,
  superAdminSetConfig,
  type SaCheckState,
  type SaHealthReport,
  type SaPlatformConfig,
} from "@/lib/api";
import { saTheme } from "@/components/super-admin/saTheme";
import {
  AlertTriangle, CheckCircle2, CircleHelp, Loader2, RefreshCw, Save, XCircle,
} from "lucide-react";

/**
 * Phase 8: is the platform working, and what is it configured to do.
 *
 * <p><b>UNKNOWN renders differently from OK.</b> A check that could not
 * determine an answer must not look like a passing one — a health screen showing
 * green because the check itself failed is worse than one showing nothing, and
 * this codebase has already been bitten by exactly that shape.
 *
 * <p>Settings are editable here because a deploy on a single instance with an
 * AllAtOnce policy is an outage, which is the wrong price for turning autopilot
 * off while it is misbehaving.
 */

const STATE_META: Record<SaCheckState, { icon: typeof CheckCircle2; className: string }> = {
  OK:       { icon: CheckCircle2,  className: "text-emerald-500" },
  DEGRADED: { icon: AlertTriangle, className: "text-amber-500" },
  FAILED:   { icon: XCircle,       className: "text-red-500" },
  // Deliberately grey rather than green: this is "we do not know", not "fine".
  UNKNOWN:  { icon: CircleHelp,    className: "text-stone-400" },
};

export function OperationsPanel({ isDark }: { isDark: boolean }) {
  const t = saTheme(isDark);

  const [health, setHealth] = useState<SaHealthReport | null>(null);
  const [config, setConfig] = useState<SaPlatformConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, c] = await Promise.all([superAdminHealth(), superAdminConfig()]);
      setHealth(h);
      setConfig(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the health report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function onSave() {
    if (!newKey.trim() || !reason.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await superAdminSetConfig(newKey.trim(), newValue, reason.trim());
      setNewKey(""); setNewValue(""); setReason("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The setting was not saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className={`text-lg font-bold ${t.heading}`}>Operational health</h2>
          <p className={`text-xs ${t.muted}`}>
            Cheap checks only, so this stays safe to open during an incident.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold ${t.btn}`}
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Refresh
        </button>
      </div>

      {error && <div className={`rounded-xl border p-3 text-sm ${t.dangerPanel}`}>{error}</div>}

      {/* ── Checks ──────────────────────────────────────────────────────── */}
      {health && (
        <>
          <ul className={`divide-y rounded-xl border ${t.card} ${t.divide}`}>
            {health.checks.map((c) => {
              const meta = STATE_META[c.state] ?? STATE_META.UNKNOWN;
              const Icon = meta.icon;
              return (
                <li key={c.name} className="flex items-start gap-2.5 p-3">
                  <Icon className={`mt-0.5 size-4 shrink-0 ${meta.className}`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-bold ${t.text}`}>
                      {c.name}
                      <span className={`ml-2 font-normal ${t.dim}`}>{c.state}</span>
                    </p>
                    <p className={`text-xs ${t.muted}`}>{c.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className={`rounded-xl border p-4 ${t.card}`}>
            <h3 className={`mb-2 text-xs font-black uppercase tracking-wider ${t.dim}`}>
              Environment
            </h3>
            <dl className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {Object.entries(health.configuration).map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3">
                  <dt className={`text-xs ${t.muted}`}>{k}</dt>
                  <dd className={`font-mono text-xs ${t.text}`}>{v}</dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-3">
                <dt className={`text-xs ${t.muted}`}>schema version</dt>
                <dd className={`font-mono text-xs ${t.text}`}>
                  {/* Null means Flyway has never run here, which is a different
                      thing from being at version zero. */}
                  {health.schemaVersion ?? "never migrated"}
                </dd>
              </div>
            </dl>
          </div>
        </>
      )}

      {/* ── Runtime settings ────────────────────────────────────────────── */}
      <div className="space-y-2">
        <h3 className={`text-xs font-black uppercase tracking-wider ${t.dim}`}>
          Runtime settings
        </h3>

        <div className={`space-y-2 rounded-xl border p-4 ${t.card}`}>
          <div className="flex flex-wrap gap-2">
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              aria-label="Setting key"
              placeholder="key — e.g. autopilot.mode"
              className={`flex-1 rounded-lg border px-3 py-1.5 text-sm ${t.input}`}
            />
            <input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              aria-label="Setting value"
              placeholder="value"
              className={`w-40 rounded-lg border px-3 py-1.5 text-sm ${t.input}`}
            />
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            aria-label="Reason"
            placeholder="Why is this changing? Recorded against your name."
            className={`w-full rounded-lg border px-3 py-2 text-sm ${t.input}`}
          />
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !newKey.trim() || !reason.trim()}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold ${t.btnAccent} disabled:opacity-40 disabled:pointer-events-none`}
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save setting
          </button>
        </div>

        {config.length === 0 ? (
          <p className={`rounded-xl border p-6 text-center text-xs ${t.card} ${t.muted}`}>
            Nothing is overridden. Everything is running on its deployed default.
          </p>
        ) : (
          <ul className={`divide-y rounded-xl border ${t.card} ${t.divide}`}>
            {config.map((c) => (
              <li key={c.id} className="p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className={`font-mono text-xs font-bold ${t.text}`}>{c.configKey}</p>
                  <p className={`font-mono text-xs ${t.text}`}>{c.configValue ?? "(null)"}</p>
                </div>
                <p className={`text-xs ${t.muted}`}>
                  {c.updatedBy} · {new Date(c.updatedAt).toLocaleString()}
                </p>
                {c.reason && <p className={`mt-0.5 text-xs ${t.text}`}>{c.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
