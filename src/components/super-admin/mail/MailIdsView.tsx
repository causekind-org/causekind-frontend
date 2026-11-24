"use client";

/**
 * Mail Center: Mail IDs (Phase 3a; inventory ID01–ID04, ID08).
 * Shared sender addresses on the verified identity domain. Shows real setup
 * state: if the domain isn't configured, creation is disabled and says why.
 * Receiving (inbox) arrives in Phase 4 — shown as "not receiving yet".
 */
import { useCallback, useEffect, useState } from "react";
import { saTheme } from "@/components/super-admin/saTheme";
import { mcMailIds, mcCreateMailId, mcUpdateMailId, mcSetMailIdActive, mcDeleteMailId, type McMailId, type McMailIdSetup } from "@/lib/api";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { errText } from "./shared";

type Form = { id: number | null; localPart: string; displayName: string; department: string; send: string; recipients: string };
const EMPTY_FORM: Form = { id: null, localPart: "", displayName: "", department: "", send: "500", recipients: "2000" };
const ago = (s?: string | null) => {
  if (!s) return "never";
  const h = Math.round((Date.now() - new Date(s).getTime()) / 3_600_000);
  return h < 1 ? "within the hour" : h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
};

export function MailIdsView({ isDark }: { isDark: boolean }) {
  const t = saTheme(isDark);
  const [data, setData] = useState<{ setup: McMailIdSetup; identities: McMailId[] } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field = `w-full rounded-xl border px-3 py-2 text-sm ${t.input}`;
  const label = `mb-1 block text-3xs font-black uppercase tracking-wider ${t.dim}`;
  const btn = `inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold ${t.btn}`;

  const load = useCallback(() => { setLoadError(false); mcMailIds().then(setData).catch(() => setLoadError(true)); }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); load(); } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };

  const save = () => act(async () => {
    if (!form) return;
    const send = Number(form.send), recipients = Number(form.recipients);
    if (!Number.isInteger(send) || !Number.isInteger(recipients) || send < 1 || recipients < 1) throw new Error("Limits must be whole numbers above zero.");
    if (form.id == null) {
      await mcCreateMailId({ localPart: form.localPart, displayName: form.displayName, department: form.department || undefined, dailySendLimit: send, dailyRecipientLimit: recipients });
    } else {
      await mcUpdateMailId(form.id, { displayName: form.displayName, department: form.department, dailySendLimit: send, dailyRecipientLimit: recipients });
    }
    setForm(null);
  });

  if (loadError) return <p role="alert" className="text-sm text-red-500">Couldn&apos;t load Mail IDs. <button type="button" className="underline" onClick={load}>Try again</button></p>;
  if (!data) return <Loader2 className={`h-5 w-5 animate-spin ${t.muted}`} />;
  const { setup, identities } = data;

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-4 text-xs ${t.cardFlat}`}>
        <p className={`mb-1 text-sm font-bold ${t.heading}`}>Setup</p>
        <ul className={`space-y-0.5 ${t.text}`}>
          <li>{setup.identityDomainConfigured ? "✅" : "⚠️"} Sending domain: {setup.identityDomain ?? "not set (MAIL_IDENTITY_DOMAIN). New Mail IDs can't be created until a verified SES domain is configured."}</li>
          <li>{setup.untrackedModeConfigured ? "✅" : "⚠️"} Personal mode (no open/click tracking): {setup.untrackedModeConfigured ? "available" : "not set up (MAIL_MARKETING_CONFIGURATION_SET_UNTRACKED). Campaigns must keep tracking on."}</li>
          <li>⏳ Receiving replies in the Mail Center inbox: arrives in a later phase. Until then, replies go wherever that address is delivered today.</li>
        </ul>
      </div>

      <div className="flex items-center gap-2">
        <h3 className={`mr-auto text-base font-black ${t.heading}`}>Mail IDs</h3>
        <button type="button" disabled={!setup.identityDomainConfigured} onClick={() => setForm({ ...EMPTY_FORM })}
          className={`${btn} ${t.btnAccent}`}><Plus className="h-4 w-4" aria-hidden /> New Mail ID</button>
      </div>

      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}

      {form && (
        <div className={`grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 ${t.card}`}>
          {form.id == null ? (
            <div>
              <label className={label} htmlFor="mid-local">Address</label>
              <div className="flex items-center gap-1">
                <input id="mid-local" className={field} value={form.localPart} maxLength={64} placeholder="support"
                  onChange={(e) => setForm({ ...form, localPart: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "") })} />
                <span className={`whitespace-nowrap text-sm ${t.muted}`}>@{setup.identityDomain}</span>
              </div>
            </div>
          ) : <div><span className={label}>Address</span><p className={`py-2 text-sm ${t.text}`}>{identities.find((i) => i.id === form.id)?.address}</p></div>}
          <div><label className={label} htmlFor="mid-name">Display name (what people see)</label>
            <input id="mid-name" className={field} value={form.displayName} maxLength={120} placeholder="CauseKind Support" onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></div>
          <div><label className={label} htmlFor="mid-dept">Team (optional)</label>
            <input id="mid-dept" className={field} value={form.department} maxLength={120} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={label} htmlFor="mid-send">Emails per day</label>
              <input id="mid-send" inputMode="numeric" className={field} value={form.send} onChange={(e) => setForm({ ...form, send: e.target.value.replace(/\D/g, "") })} /></div>
            <div><label className={label} htmlFor="mid-rcpt">People per day</label>
              <input id="mid-rcpt" inputMode="numeric" className={field} value={form.recipients} onChange={(e) => setForm({ ...form, recipients: e.target.value.replace(/\D/g, "") })} /></div>
          </div>
          <p className={`text-xs sm:col-span-2 ${t.dim}`}>Limits are rolling 24 hours, on top of the overall daily cap. A campaign from this address pauses for the day when either is reached.</p>
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" disabled={busy} onClick={save} className={`${btn} ${t.btnAccent}`}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save</button>
            <button type="button" onClick={() => setForm(null)} className={btn}>Cancel</button>
          </div>
        </div>
      )}

      {identities.length === 0 ? (
        <p className={`text-sm ${t.muted}`}>No Mail IDs yet. Campaigns use the default newsletter sender.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className={t.dim}><tr>{["Address", "Team", "Status", "Sent (24 h)", "Limits / day", "Campaigns", "Last sent", ""].map((h) => <th key={h} className="px-2 py-1.5 font-black uppercase tracking-wider">{h}</th>)}</tr></thead>
            <tbody>
              {identities.map((i) => (
                <tr key={i.id} className={`border-t ${t.text}`}>
                  <td className="px-2 py-2"><p className="font-bold">{i.displayName}</p><p className={t.muted}>{i.address}</p></td>
                  <td className="px-2 py-2">{i.department ?? "—"}</td>
                  <td className="px-2 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-3xs font-black ${i.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-500" : "bg-orange-500/15 text-orange-500"}`}>{i.status === "ACTIVE" ? "Active" : "Suspended"}</span>
                    {!i.receiveReady && <p className={`mt-0.5 text-3xs ${t.dim}`}>not receiving yet</p>}
                  </td>
                  <td className="px-2 py-2 tabular-nums">{i.sentLast24h ?? 0} / {Math.min(i.dailySendLimit, i.dailyRecipientLimit)}</td>
                  <td className="px-2 py-2 tabular-nums">{i.dailySendLimit} emails · {i.dailyRecipientLimit} people</td>
                  <td className="px-2 py-2 tabular-nums">{i.campaignCount ?? 0} ({i.broadcastTotal ?? 0} sent)</td>
                  <td className="px-2 py-2">{ago(i.lastSentAt)}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-right">
                    <button type="button" aria-label={`Edit ${i.address}`} className="rounded p-1 hover:bg-black/10"
                      onClick={() => setForm({ id: i.id, localPart: "", displayName: i.displayName, department: i.department ?? "", send: String(i.dailySendLimit), recipients: String(i.dailyRecipientLimit) })}><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" disabled={busy} className={`ml-1 rounded border px-2 py-1 text-3xs font-bold ${t.btn}`}
                      onClick={() => act(async () => {
                        if (i.status === "ACTIVE" && !window.confirm(`Suspend ${i.address}? Running campaigns from it will pause.`)) return;
                        await mcSetMailIdActive(i.id, i.status !== "ACTIVE");
                      })}>{i.status === "ACTIVE" ? "Suspend" : "Reactivate"}</button>
                    <button type="button" aria-label={`Delete ${i.address}`} disabled={busy} className="ml-1 rounded p-1 hover:bg-black/10"
                      onClick={() => act(async () => { if (window.confirm(`Delete ${i.address}? Only possible if no campaign ever used it.`)) await mcDeleteMailId(i.id); })}><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
