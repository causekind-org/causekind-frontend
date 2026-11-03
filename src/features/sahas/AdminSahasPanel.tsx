"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiError, sahasAdmin, type NgoDriveOfferResponse, type SahasAdminDetail, type SahasAdminLine, type SahasAdminRow,
  type SahasLineInput, type SahasUpsert,
} from "@/lib/api";

/**
 * Admin screens for Sahas campaigns (Phase D2, 2026-11-03; design boards HF · Admin list,
 * editor + publish, operations). Rendered in the admin dashboard's right-hand panel.
 * Items only: money stays off until phase C3, and the server refuses to publish a campaign
 * that collects money. Every mutation sends the campaign's version; a 409 means reload.
 */
export function AdminSahasPanel() {
  const [openId, setOpenId] = useState<number | null>(null);
  return openId === null
    ? <CampaignList onOpen={setOpenId} />
    : <CampaignEditor id={openId} onBack={() => setOpenId(null)} />;
}

const box = "rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";
const field = "min-h-[42px] w-full rounded-lg border border-stone-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950";
const btn = "inline-flex min-h-[40px] items-center justify-center rounded-lg px-4 text-sm font-semibold disabled:opacity-50";
const primary = `${btn} bg-[#b04a15] text-white hover:bg-[#9a3f10]`;
const secondary = `${btn} border border-stone-300 bg-white text-stone-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-100`;

function messageOf(e: unknown): string {
  if (e instanceof ApiError) return e.status === 409 ? `${e.message} Reload to see the latest.` : e.message;
  return "Something went wrong. Try again.";
}
const changed = () => window.dispatchEvent(new Event("ck:data-changed"));

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", APPROVED: "Live", PAUSED: "Paused", COLLECTIONS_CLOSED: "Closed", CANCELLED: "Cancelled",
};
function StatusChip({ status, publishAt }: { status: string; publishAt?: string | null }) {
  const scheduled = status === "APPROVED" && publishAt && new Date(publishAt) > new Date();
  const label = scheduled ? "Scheduled" : STATUS_LABEL[status] ?? status;
  const tone = status === "APPROVED" && !scheduled ? "bg-emerald-50 text-emerald-800"
    : status === "PAUSED" ? "bg-amber-50 text-amber-900" : status === "DRAFT" ? "bg-slate-100 text-slate-700" : "bg-stone-100 text-stone-700";
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>;
}

// ── List ──────────────────────────────────────────────────────────────────

function CampaignList({ onOpen }: { onOpen: (id: number) => void }) {
  const [rows, setRows] = useState<SahasAdminRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => { setError(null); sahasAdmin.list().then(setRows).catch((e) => setError(messageOf(e))); }, []);
  useEffect(load, [load]);

  const create = async () => {
    setCreating(true);
    try { const d = await sahasAdmin.create({ title: "Untitled campaign", collectsItems: true, collectsMoney: false }); changed(); onOpen(d.id); }
    catch (e) { setError(messageOf(e)); } finally { setCreating(false); }
  };

  const shown = (rows ?? []).filter((r) => (filter === "ALL" || r.status === filter)
    && (!q || `${r.title ?? ""} ${r.slug ?? ""}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div><h2 className="m-0 text-xl font-bold">Sahas campaigns</h2><p className="m-0 text-sm text-stone-500">Campaigns organised by Sahas Charitable Trust</p></div>
        <button type="button" className={`${primary} ms-auto`} onClick={create} disabled={creating}>New campaign</button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="Search campaigns" placeholder="Search title or address" value={q} onChange={(e) => setQ(e.target.value)} className={`${field} max-w-xs`} />
        {["ALL", "DRAFT", "APPROVED", "PAUSED", "COLLECTIONS_CLOSED", "CANCELLED"].map((s) => (
          <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}
            className={`min-h-[36px] rounded-full border px-3 text-xs font-semibold ${filter === s ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-600"}`}>
            {s === "ALL" ? "All" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="m-0 text-sm text-red-700">{error}</p>}
      {rows === null && !error ? <p className="text-sm text-stone-500">Loading…</p> : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead><tr className="text-left text-xs text-stone-500">
              <th className="p-3 font-semibold">Campaign</th><th className="p-3 font-semibold">Status</th>
              <th className="p-3 font-semibold">Collects</th><th className="p-3 font-semibold">Ends</th><th className="p-3 font-semibold">Home</th>
            </tr></thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={5} className="p-4 text-stone-500">No campaigns here.</td></tr>}
              {shown.map((r) => (
                <tr key={r.id} className="border-t border-stone-100 dark:border-zinc-800">
                  <td className="p-3">
                    <button type="button" onClick={() => onOpen(r.id)} className="text-left font-semibold text-[#b04a15] hover:underline">{r.title || "Untitled"}</button>
                    <div className="text-xs text-stone-500">{r.slug ? `/sahas/${r.slug}` : "No page address yet"}</div>
                  </td>
                  <td className="p-3"><StatusChip status={r.status} publishAt={r.publishAt} /></td>
                  <td className="p-3">{[r.collectsItems && "Items", r.collectsMoney && "Money"].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="p-3">{r.endDate ?? "—"}</td>
                  <td className="p-3">{r.featured ? "Featured" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Editor ────────────────────────────────────────────────────────────────

type Tab = "details" | "items" | "offers";

function CampaignEditor({ id, onBack }: { id: number; onBack: () => void }) {
  const [d, setD] = useState<SahasAdminDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("details");
  const load = useCallback(() => { setError(null); sahasAdmin.get(id).then(setD).catch((e) => setError(messageOf(e))); }, [id]);
  useEffect(load, [load]);

  if (!d) return <div className="flex flex-col gap-3"><button type="button" onClick={onBack} className="self-start text-sm text-stone-500">← Sahas campaigns</button>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : <p className="text-sm text-stone-500">Loading…</p>}</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className="text-sm text-stone-500 hover:underline">← Sahas campaigns</button>
        <h2 className="m-0 text-xl font-bold">{d.title || "Untitled"}</h2>
        <StatusChip status={d.status} publishAt={d.publishAt} />
        {d.slug && d.status !== "DRAFT" && <a href={`/sahas/${d.slug}`} target="_blank" rel="noreferrer" className="ms-auto text-sm font-semibold text-[#b04a15]">View public page ↗</a>}
      </div>
      <div role="tablist" aria-label="Campaign sections" className="flex gap-5 border-b border-stone-200 dark:border-zinc-800">
        {(["details", "items", "offers"] as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`min-h-[44px] border-b-[3px] text-sm font-semibold ${tab === t ? "border-[#b04a15] text-stone-900 dark:text-stone-100" : "border-transparent text-stone-500"}`}>
            {t === "details" ? "Details and publishing" : t === "items" ? "Items" : "Offers and handovers"}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="m-0 text-sm text-red-700">{error}</p>}
      {tab === "details" && <Details d={d} onSaved={setD} onError={setError} />}
      {tab === "items" && <Items d={d} onChanged={load} onError={setError} />}
      {tab === "offers" && <Offers campaignId={d.id} onError={setError} />}
    </div>
  );
}

function Details({ d, onSaved, onError }: { d: SahasAdminDetail; onSaved: (d: SahasAdminDetail) => void; onError: (m: string | null) => void }) {
  const [f, setF] = useState<SahasUpsert>({});
  const [busy, setBusy] = useState(false);
  const [publishAt, setPublishAt] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const v = <K extends keyof SahasUpsert>(k: K): SahasUpsert[K] => (k in f ? f[k] : (d as unknown as SahasUpsert)[k]);
  const set = <K extends keyof SahasUpsert>(k: K, val: SahasUpsert[K]) => setF((x) => ({ ...x, [k]: val }));
  const dirty = Object.keys(f).length > 0;
  const live = d.status !== "DRAFT";

  const run = async (p: Promise<SahasAdminDetail>) => {
    setBusy(true); onError(null);
    try { const next = await p; onSaved(next); setF({}); setReason(""); changed(); }
    catch (e) { onError(messageOf(e)); } finally { setBusy(false); }
  };

  const text = (k: keyof SahasUpsert, label: string, opts: { area?: boolean; type?: string; disabled?: boolean } = {}) => (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      {opts.area
        ? <textarea className={`${field} min-h-[120px] py-2 font-normal`} value={(v(k) as string | undefined) ?? ""} onChange={(e) => set(k, e.target.value as never)} />
        : <input type={opts.type ?? "text"} disabled={opts.disabled} className={`${field} font-normal`} value={(v(k) as string | undefined) ?? ""} onChange={(e) => set(k, e.target.value as never)} />}
    </label>
  );

  return (
    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className={`${box} flex flex-col gap-4`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {text("title", "Title")}
          {text("slug", "Page address (/sahas/…)", { disabled: live })}
          {text("city", "City / area")}
          {text("state", "State")}
          {text("startDate", "Start date", { type: "date" })}
          {text("endDate", "End date", { type: "date" })}
        </div>
        {text("summary", "One-line summary (shown on cards)")}
        {text("description", "Story", { area: true })}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {text("imageUrl", "Cover photo URL")}
          {text("coverAltText", "Cover photo description (alt text)")}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(v("coverConsent"))} onChange={(e) => set("coverConsent", e.target.checked)} /> People shown in the cover photo agreed to it being public</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(v("featured"))} onChange={(e) => set("featured", e.target.checked)} /> Feature on the home page</label>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(v("collectsItems"))} onChange={(e) => set("collectsItems", e.target.checked)} /> Collects items</label>
          <label className="flex items-center gap-2 text-stone-400"><input type="checkbox" checked={Boolean(v("collectsMoney"))} disabled={live} onChange={(e) => set("collectsMoney", e.target.checked)} /> Collects money (not available yet)</label>
        </div>
        <button type="button" className={`${primary} self-start`} disabled={!dirty || busy} onClick={() => run(sahasAdmin.update(d.id, { ...f, version: d.version }))}>Save</button>
      </div>

      <div className="flex flex-col gap-4">
        {d.status === "DRAFT" && (
          <div className={`${box} flex flex-col gap-3`}>
            <h3 className="m-0 text-base font-bold">Ready to publish?</h3>
            {d.missingForPublish.length === 0
              ? <p className="m-0 text-sm text-emerald-800">Everything needed is in place.</p>
              : <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">{d.missingForPublish.map((m) => <li key={m} className="text-red-800">• {m}</li>)}</ul>}
            <label className="flex flex-col gap-1.5 text-sm font-semibold">Publish at (leave empty for now)
              <input type="datetime-local" className={`${field} font-normal`} value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">Note for the activity log
              <input className={`${field} font-normal`} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <button type="button" className={primary} disabled={busy || dirty || d.missingForPublish.length > 0}
              onClick={() => run(sahasAdmin.publish(d.id, d.version, publishAt ? `${publishAt}:00` : null, note || null))}>
              {dirty ? "Save changes first" : d.missingForPublish.length ? `Publish · fix ${d.missingForPublish.length} first` : "Publish"}
            </button>
          </div>
        )}
        {(d.status === "APPROVED" || d.status === "PAUSED" || d.status === "DRAFT") && (
          <div className={`${box} flex flex-col gap-3`}>
            <h3 className="m-0 text-base font-bold">{d.status === "DRAFT" ? "Cancel draft" : "When live"}</h3>
            {d.pauseReason && <p className="m-0 text-sm text-amber-900">Paused: {d.pauseReason}</p>}
            <label className="flex flex-col gap-1.5 text-sm font-semibold">Reason (shown publicly)
              <input className={`${field} font-normal`} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            <div className="flex flex-wrap gap-2">
              {d.status === "APPROVED" && <button type="button" className={secondary} disabled={busy || !reason} onClick={() => run(sahasAdmin.transition(d.id, "pause", d.version, reason))}>Pause</button>}
              {d.status === "PAUSED" && <button type="button" className={secondary} disabled={busy} onClick={() => run(sahasAdmin.transition(d.id, "resume", d.version, reason || null))}>Resume</button>}
              {d.status !== "DRAFT" && <button type="button" className={secondary} disabled={busy || !reason} onClick={() => run(sahasAdmin.transition(d.id, "close", d.version, reason))}>Close</button>}
              <button type="button" className={`${btn} text-red-800`} disabled={busy || !reason} onClick={() => run(sahasAdmin.transition(d.id, "cancel", d.version, reason))}>Cancel campaign</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const EMPTY_LINE: SahasLineInput = { itemName: "", quantityNeeded: 1, handoverMode: "BOTH" };

function Items({ d, onChanged, onError }: { d: SahasAdminDetail; onChanged: () => void; onError: (m: string | null) => void }) {
  const [lines, setLines] = useState<SahasAdminLine[] | null>(null);
  const [draft, setDraft] = useState<SahasLineInput>(EMPTY_LINE);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { sahasAdmin.items(d.id).then(setLines).catch((e) => onError(messageOf(e))); }, [d.id, onError]);
  useEffect(load, [load]);
  const closed = d.status === "COLLECTIONS_CLOSED" || d.status === "CANCELLED";

  const add = async () => {
    setBusy(true); onError(null);
    try { await sahasAdmin.addItem(d.id, draft); setDraft(EMPTY_LINE); load(); onChanged(); changed(); }
    catch (e) { onError(messageOf(e)); } finally { setBusy(false); }
  };
  const remove = async (lineId: number) => {
    onError(null);
    try { await sahasAdmin.removeItem(d.id, lineId); load(); onChanged(); changed(); } catch (e) { onError(messageOf(e)); }
  };
  const inp = (k: keyof SahasLineInput, label: string, type = "text") => (
    <label className="flex flex-col gap-1 text-xs font-semibold">{label}
      <input type={type} className={`${field} font-normal`} value={(draft[k] as string | number | undefined) ?? ""}
        onChange={(e) => setDraft((x) => ({ ...x, [k]: type === "number" ? (e.target.value === "" ? undefined : Number(e.target.value)) : e.target.value }))} />
    </label>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead><tr className="text-left text-xs text-stone-500">
            <th className="p-3">Item</th><th className="p-3">Needed</th><th className="p-3">Pledged</th><th className="p-3">Received</th><th className="p-3">Handover</th><th className="p-3">Still missing</th><th className="p-3" />
          </tr></thead>
          <tbody>
            {lines?.length === 0 && <tr><td colSpan={7} className="p-4 text-stone-500">No items yet. Add the first one below.</td></tr>}
            {lines?.map((l) => (
              <tr key={l.id} className="border-t border-stone-100 align-top dark:border-zinc-800">
                <td className="p-3"><b>{l.itemName}</b><div className="text-xs text-stone-500">{[l.itemCondition, l.unit].filter(Boolean).join(" · ")}</div></td>
                <td className="p-3">{l.quantityNeeded}</td><td className="p-3">{l.quantityPledged}</td><td className="p-3">{l.quantityReceived}</td>
                <td className="p-3 text-xs">{l.handoverMode === "DROP_OFF" ? "Drop-off" : l.handoverMode === "PICKUP" ? `Pickup ${l.pickupRadiusKm ?? "?"} km` : `Both · ${l.pickupRadiusKm ?? "?"} km`}</td>
                <td className="p-3 text-xs text-red-800">{l.missing.join(", ") || <span className="text-emerald-800">Complete</span>}</td>
                <td className="p-3">{!closed && <button type="button" className="text-xs font-semibold text-stone-600 hover:underline" onClick={() => remove(l.id)}>{d.status === "DRAFT" && l.quantityPledged + l.quantityReceived === 0 ? "Remove" : "Close"}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!closed && (
        <div className={`${box} flex flex-col gap-3`}>
          <h3 className="m-0 text-base font-bold">Add an item</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {inp("itemName", "Item")}
            {inp("quantityNeeded", "Needed", "number")}
            {inp("unit", "Unit (e.g. piece)")}
            {inp("itemCondition", "Condition (e.g. New only)")}
            <label className="flex flex-col gap-1 text-xs font-semibold">Handover
              <select className={`${field} font-normal`} value={draft.handoverMode} onChange={(e) => setDraft((x) => ({ ...x, handoverMode: e.target.value as SahasLineInput["handoverMode"] }))}>
                <option value="BOTH">Drop-off and pickup</option><option value="DROP_OFF">Drop-off only</option><option value="PICKUP">Pickup only</option>
              </select>
            </label>
            {inp("availableDays", "Hours (e.g. Mon–Sat 10–6)")}
          </div>
          {draft.handoverMode !== "PICKUP" && <div className="grid grid-cols-1 gap-3">{inp("dropOffAddress", "Drop-off point (a staffed address, never a home)")}</div>}
          {draft.handoverMode !== "DROP_OFF" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              {inp("pickupRadiusKm", "Pickup radius (km)", "number")}
              {inp("locationCity", "Pickup centre: area")}
              {inp("locationLatitude", "Latitude", "number")}
              {inp("locationLongitude", "Longitude", "number")}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {inp("contactName", "Collection contact (private)")}
            {inp("contactPhone", "Contact phone (private)")}
          </div>
          <button type="button" className={`${primary} self-start`} disabled={busy || !draft.itemName || !draft.quantityNeeded} onClick={add}>Add item</button>
        </div>
      )}
    </div>
  );
}

const WAITING = new Set(["PENDING_NGO_REVIEW", "SUBMITTED", "AI_ELIGIBILITY_SCREENING", "AI_COMPATIBILITY_SCREENING"]);
const READY = new Set(["NGO_ACCEPTED", "ADMIN_APPROVED", "HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK"]);
const OFFER_LABEL: Record<string, string> = {
  PENDING_NGO_REVIEW: "Waiting for review", NGO_ACCEPTED: "Ready for handover", HANDOVER_IN_PROGRESS: "Handover planned",
  HANDOVER_AT_RISK: "Handover at risk", ISSUE_WINDOW_OPEN: "Received", COMPLETED: "Received", NGO_DECLINED: "Declined",
  NEEDS_INFORMATION: "Asked for changes", WITHDRAWN: "Withdrawn", CANCELLED: "Cancelled",
};

function Offers({ campaignId, onError }: { campaignId: number; onError: (m: string | null) => void }) {
  const [offers, setOffers] = useState<NgoDriveOfferResponse[] | null>(null);
  const [codeFor, setCodeFor] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { sahasAdmin.offers(campaignId).then(setOffers).catch((e) => onError(messageOf(e))); }, [campaignId, onError]);
  useEffect(load, [load]);

  const act = async (p: Promise<unknown>) => {
    setBusy(true); onError(null);
    try { await p; setCodeFor(null); setCode(""); setQty(""); load(); changed(); } catch (e) { onError(messageOf(e)); } finally { setBusy(false); }
  };
  const decline = (o: NgoDriveOfferResponse) => {
    const reason = window.prompt("Why is this offer declined? The donor sees this.");
    if (reason) void act(sahasAdmin.review(campaignId, o.id, "DECLINE", reason));
  };

  const waiting = (offers ?? []).filter((o) => WAITING.has(o.status)).length;
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-sm text-stone-600">{offers ? `${waiting} offer${waiting === 1 ? "" : "s"} waiting for review` : "Loading…"}</p>
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full min-w-[700px] border-collapse text-sm">
          <thead><tr className="text-left text-xs text-stone-500"><th className="p-3">Ref</th><th className="p-3">Donor</th><th className="p-3">Qty</th><th className="p-3">Handover</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead>
          <tbody>
            {offers?.length === 0 && <tr><td colSpan={6} className="p-4 text-stone-500">No offers yet.</td></tr>}
            {offers?.map((o) => (
              <tr key={o.id} className="border-t border-stone-100 align-top dark:border-zinc-800">
                <td className="p-3">#{o.id}</td>
                <td className="p-3">{o.donorDisplayName}</td>
                <td className="p-3">{o.quantity ?? "—"}</td>
                <td className="p-3">{o.handoverMethod === "NGO_PICKUP" ? `Pickup${o.donorLocality ? ` · ${o.donorLocality}` : ""}` : "Drop-off"}</td>
                <td className="p-3">{OFFER_LABEL[o.status] ?? o.status}</td>
                <td className="p-3">
                  {o.status === "PENDING_NGO_REVIEW" && (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={primary} disabled={busy} onClick={() => act(sahasAdmin.review(campaignId, o.id, "ACCEPT"))}>Accept</button>
                      {o.handoverMethod === "NGO_PICKUP" && <button type="button" className={secondary} disabled={busy} onClick={() => act(sahasAdmin.review(campaignId, o.id, "ASK_TO_DROP_OFF"))}>Ask to drop off</button>}
                      <button type="button" className={secondary} disabled={busy} onClick={() => decline(o)}>Decline</button>
                    </div>
                  )}
                  {READY.has(o.status) && (codeFor === o.id ? (
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="flex flex-col gap-1 text-xs font-semibold">Handover code
                        <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={`${field} w-28 font-normal tracking-[0.3em]`} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-semibold">Received
                        <input type="number" min={1} max={o.quantity} placeholder={String(o.quantity ?? "")} className={`${field} w-24 font-normal`} value={qty} onChange={(e) => setQty(e.target.value)} />
                      </label>
                      <button type="button" className={primary} disabled={busy || code.length < 4}
                        onClick={() => act(sahasAdmin.handover(campaignId, o.id, code, qty ? Number(qty) : undefined))}>Confirm</button>
                    </div>
                  ) : <button type="button" className={primary} onClick={() => { setCodeFor(o.id); setCode(""); setQty(""); }}>Enter handover code</button>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
