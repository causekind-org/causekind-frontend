"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { superAdminFundraising, type SaFrSetting } from "@/lib/api";
import type { SaTheme } from "@/components/super-admin/saTheme";
import { Card, ConfirmDialog, ErrorLine, Spinner, dateTime, errorText, type ChangeRow } from "./shared";

const K = {
  enabled: "fundraising.switch_enabled",
  apps: "fundraising.applications_open",
  donations: "fundraising.donations_open",
  fee: "fundraising.platform_fee_percent",
  donMin: "fundraising.donation_min",
  donMax: "fundraising.donation_max",
  tMin: "fundraising.target_min",
  tMax: "fundraising.target_max",
  days: "fundraising.max_duration_days",
  active: "fundraising.max_active_per_donee",
  cats: "fundraising.categories_disabled",
  reviewH: "fundraising.review_target_hours",
  infoD: "fundraising.info_reply_days",
  reports: "fundraising.reports_before_autopause",
  outcomeD: "fundraising.outcome_due_days",
} as const;

const LABEL: Record<string, string> = {
  [K.enabled]: "Fundraising enabled", [K.apps]: "Accept new applications", [K.donations]: "Accept new donations",
  [K.fee]: "Platform fee (%)", [K.donMin]: "Minimum donation (₹)", [K.donMax]: "Maximum donation (₹)",
  [K.tMin]: "Minimum target (₹)", [K.tMax]: "Maximum target (₹)", [K.days]: "Maximum duration (days)",
  [K.active]: "Campaigns per donee at once", [K.cats]: "Disabled categories", [K.reviewH]: "Application review target (hours)",
  [K.infoD]: "Info request reply window (days)", [K.reports]: "Reports before auto-pause", [K.outcomeD]: "Outcome proof due after close (days)",
};
const CATEGORIES = ["MEDICAL", "EDUCATION", "EMERGENCY_HOUSEHOLD", "OTHER"];
const catLabel = (c: string) => c.charAt(0) + c.slice(1).toLowerCase().replaceAll("_", " ");

export function FrSettings({ t, onSaved }: { t: SaTheme; onSaved: () => void }) {
  const [saved, setSaved] = useState<SaFrSetting[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    superAdminFundraising.settings().then((s) => { setSaved(s); setValues(Object.fromEntries(s.map((x) => [x.key, x.value]))); })
      .catch((e) => setError(errorText(e, "We couldn't load the settings.")));
  }, []);
  useEffect(() => { load(); }, [load]);

  const changes: ChangeRow[] = useMemo(() => (saved ?? [])
    .filter((s) => (values[s.key] ?? "") !== s.value)
    .map((s) => ({ field: LABEL[s.key] ?? s.key, before: s.value === "" ? "No limit" : s.value, after: values[s.key] === "" ? "No limit" : values[s.key] })), [saved, values]);

  if (error) return <ErrorLine message={error} onRetry={load} />;
  if (!saved) return <Spinner t={t} />;

  const v = (k: string) => values[k] ?? "";
  const set = (k: string, val: string) => setValues({ ...values, [k]: val });
  const bool = (k: string) => v(k) !== "false";
  const disabled = new Set(v(K.cats).split(",").map((s) => s.trim()).filter(Boolean));
  const toggleCat = (c: string) => { const n = new Set(disabled); if (n.has(c)) n.delete(c); else n.add(c); set(K.cats, [...n].join(",")); };
  const lastChange = saved.filter((s) => s.updatedAt).sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))[0];
  const num = (k: string, placeholder = "No limit") => (
    <input inputMode="decimal" value={v(k)} placeholder={placeholder} onChange={(e) => set(k, e.target.value.replace(/[^\d.]/g, ""))}
      className={`min-h-10 rounded-xl border px-3 text-sm ${t.input}`} />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm ${t.muted}`}>Platform-wide fundraising rules. Changes apply without a deploy and are audit-logged.
          {lastChange && <> Last change by {lastChange.updatedBy ?? "—"} on {dateTime(lastChange.updatedAt)}.</>}</p>
        <div className="flex gap-2">
          <button type="button" disabled={!changes.length} onClick={() => setValues(Object.fromEntries(saved.map((x) => [x.key, x.value])))} className={`min-h-10 rounded-xl border px-4 text-sm ${t.btn}`}>Discard</button>
          <button type="button" disabled={!changes.length} onClick={() => setConfirm(true)} className={`min-h-10 rounded-xl border px-5 text-sm font-semibold disabled:opacity-50 ${t.btnAccent}`}>Save settings…</button>
        </div>
      </div>
      {notice && <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">{notice}</p>}

      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-2">
        <Card t={t} className="p-[22px]">
          <h2 className={`mb-1.5 text-base font-bold ${t.heading}`}>Switches</h2>
          <Switch t={t} label="Fundraising enabled" hint="Off hides every fundraiser page and stops new donations and applications." checked={bool(K.enabled)} onChange={(x) => set(K.enabled, String(x))} />
          <Switch t={t} label="Accept new applications" hint="Donees can start new fundraiser applications." checked={bool(K.apps)} onChange={(x) => set(K.apps, String(x))} />
          <Switch t={t} label="Accept new donations" hint="Global pause on all fundraiser checkouts." checked={bool(K.donations)} onChange={(x) => set(K.donations, String(x))} last />
        </Card>
        <Card t={t} className="flex flex-col gap-3.5 p-[22px]">
          <h2 className={`text-base font-bold ${t.heading}`}>Money</h2>
          <Field t={t} label="Platform fee (%)" hint="Applies to donations made after saving. Past donations keep their rate.">{num(K.fee, "5.00")}</Field>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field t={t} label="Minimum donation (₹)">{num(K.donMin)}</Field>
            <Field t={t} label="Maximum donation (₹)">{num(K.donMax)}</Field>
          </div>
        </Card>
        <Card t={t} className="flex flex-col gap-3.5 p-[22px]">
          <h2 className={`text-base font-bold ${t.heading}`}>Campaign limits</h2>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field t={t} label="Minimum target (₹)">{num(K.tMin)}</Field>
            <Field t={t} label="Maximum target (₹)">{num(K.tMax)}</Field>
            <Field t={t} label="Maximum duration (days)">{num(K.days)}</Field>
            <Field t={t} label="Campaigns per donee at once">{num(K.active)}</Field>
          </div>
          <span className={`text-xs ${t.dim}`}>Checked when a donee submits a campaign; live campaigns are not changed.</span>
        </Card>
        <Card t={t} className="flex flex-col gap-3.5 p-[22px]">
          <h2 className={`text-base font-bold ${t.heading}`}>Categories</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <label key={c} className={`flex min-h-9 items-center gap-2 rounded-full border px-3 text-[13px] ${t.cardFlat} ${t.text}`}>
                <input type="checkbox" checked={!disabled.has(c)} onChange={() => toggleCat(c)} /> {catLabel(c)}
              </label>
            ))}
          </div>
          <span className={`text-xs ${t.dim}`}>Turning a category off hides it for new applications only. Categories also need to be open on the server (fundraising.categories).</span>
        </Card>
        <Card t={t} className="flex flex-col gap-3.5 p-[22px] xl:col-span-2">
          <h2 className={`text-base font-bold ${t.heading}`}>Review timings</h2>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            <Field t={t} label="Application review target (hours)">{num(K.reviewH, "Not set")}</Field>
            <Field t={t} label="Info request reply window (days)">{num(K.infoD, "Not set")}</Field>
            <Field t={t} label="Reports before auto-pause">{num(K.reports, "Not set")}</Field>
            <Field t={t} label="Outcome proof due after close (days)">{num(K.outcomeD, "Not set")}</Field>
          </div>
          <span className={`text-xs ${t.dim}`}>Saved for the team&apos;s reference; reminders and auto-pause don&apos;t use them yet.</span>
        </Card>
      </div>

      {confirm && (
        <ConfirmDialog t={t} title="Confirm fundraising settings" changes={changes} primaryNotify={null}
          onCancel={() => setConfirm(false)}
          onConfirm={async (r) => {
            const out = Object.fromEntries(saved.filter((s) => (values[s.key] ?? "") !== s.value).map((s) => [s.key, values[s.key] ?? ""]));
            const next = await superAdminFundraising.saveSettings(out, r.details ? `${r.reason}: ${r.details}` : r.reason);
            setSaved(next); setValues(Object.fromEntries(next.map((x) => [x.key, x.value])));
            setConfirm(false); setNotice("Settings saved."); onSaved();
          }} />
      )}
    </div>
  );
}

function Switch({ t, label, hint, checked, onChange, last = false }: { t: SaTheme; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <label className={`flex items-center justify-between gap-4 py-3 text-sm ${last ? "" : `border-b ${t.cardFlat}`}`}>
      <span className={t.text}>{label}<span className={`block text-xs ${t.dim}`}>{hint}</span></span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
    </label>
  );
}

function Field({ t, label, hint, children }: { t: SaTheme; label: string; hint?: string; children: ReactNode }) {
  return (
    <label className={`flex flex-col gap-1.5 text-[13px] font-medium ${t.text}`}>
      {label}{children}{hint && <span className={`text-xs font-normal ${t.dim}`}>{hint}</span>}
    </label>
  );
}
