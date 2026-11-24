"use client";

/**
 * One saved list (Phase 2; inventory AU07–AU18): details, member table with
 * search and paging, add/edit/remove one person, append from a sheet,
 * column rename/delete with impact check, CSV export, campaign history, delete.
 */
import { useCallback, useEffect, useState } from "react";
import { saTheme } from "@/components/super-admin/saTheme";
import {
  mcAudience, mcUpdateAudience, mcMembers, mcSavePerson, mcRemovePerson, mcColumnImpact, mcRenameColumn,
  mcDeleteColumn, mcExportAudience, mcDeleteAudience, tagsOfAudience,
  type McAudienceDetail, type McMember,
} from "@/lib/api";
import { ArrowLeft, Download, Loader2, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import { STATUS_STYLE, errText } from "./shared";
import { SheetMapping, uploadInChunks, resultText, type MappedSheet } from "./SheetMapping";
import { columnKey } from "./sheetImport";

const PAGE = 50;
const ORIGIN_LABEL: Record<string, string> = { UPLOAD: "Uploaded sheet", PASTE: "Pasted emails", SEGMENT: "Copy of a group", COHORT: "Campaign engagement", MANUAL: "Added by hand" };
const day = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

type PersonDraft = { id: number | null; email: string; name: string; values: Record<string, string>; newKey: string; newValue: string };

export function AudienceDetail({ isDark, id, onBack, onSendCampaign, onDeleted }: {
  isDark: boolean; id: number; onBack: () => void; onSendCampaign: (id: number) => void; onDeleted: () => void;
}) {
  const t = saTheme(isDark);
  const [a, setA] = useState<McAudienceDetail | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<McMember[] | null>(null);
  const [total, setTotal] = useState(0);
  const [rowsError, setRowsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<{ name: string; description: string; tags: string } | null>(null);
  const [person, setPerson] = useState<PersonDraft | null>(null);
  const [appendOpen, setAppendOpen] = useState(false);
  const [mapped, setMapped] = useState<MappedSheet | null>(null);
  const field = `w-full rounded-xl border px-3 py-2 text-sm ${t.input}`;
  const label = `mb-1 block text-3xs font-black uppercase tracking-wider ${t.dim}`;
  const btn = `inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold ${t.btn}`;

  const loadList = useCallback(() => {
    setLoadError(false);
    mcAudience(id).then(setA).catch(() => setLoadError(true));
  }, [id]);
  const loadRows = useCallback(() => {
    setRowsError(false); setRows(null);
    mcMembers(id, q.trim(), page, PAGE).then((r) => { setRows(r.rows); setTotal(r.total); }).catch(() => setRowsError(true));
  }, [id, q, page]);
  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { const h = window.setTimeout(loadRows, 250); return () => window.clearTimeout(h); }, [loadRows]);

  const cols = a?.columns ? a.columns.split(",").filter(Boolean) : [];

  const act = async (fn: () => Promise<string | void>) => {
    setBusy(true); setError(null); setNote(null);
    try { const msg = await fn(); if (msg) setNote(msg); } catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };

  const saveMeta = () => act(async () => {
    if (!meta) return;
    await mcUpdateAudience(id, { name: meta.name, description: meta.description, tags: meta.tags.split(",").map((x) => x.trim()).filter(Boolean) });
    setMeta(null); loadList(); return "Details saved.";
  });

  const savePerson = () => act(async () => {
    if (!person) return;
    const values = { ...person.values };
    if (person.newKey.trim()) values[person.newKey.trim()] = person.newValue;
    await mcSavePerson(id, person.id, { email: person.email, name: person.name, values });
    setPerson(null); loadRows(); loadList();
    return person.id == null ? "Person added." : "Person updated.";
  });

  const removePerson = (m: McMember) => act(async () => {
    if (!window.confirm(`Remove ${m.email} from this list?`)) return;
    await mcRemovePerson(id, m.id); loadRows(); loadList(); return "Removed.";
  });

  const renameColumn = (c: string) => act(async () => {
    const impact = await mcColumnImpact(id, c);
    const to = window.prompt(
      `Rename {{${c}}} to:` + (impact.usedIn.length ? `\n\nStill used in (update these yourself afterwards):\n• ${impact.usedIn.join("\n• ")}` : ""), c);
    if (!to || columnKey(to) === c) return;
    await mcRenameColumn(id, c, to); loadList(); loadRows(); return `Renamed to {{${columnKey(to)}}}. Sent emails are unchanged.`;
  });

  const deleteColumn = (c: string) => act(async () => {
    const impact = await mcColumnImpact(id, c);
    const warn = impact.usedIn.length ? `\n\nIt's still used in:\n• ${impact.usedIn.join("\n• ")}\nThose would then be blocked from sending until you remove {{${c}}}.` : "";
    if (!window.confirm(`Delete the {{${c}}} column and its value for every person on this list?${warn}`)) return;
    await mcDeleteColumn(id, c); loadList(); loadRows(); return `Column {{${c}}} deleted.`;
  });

  const append = () => act(async () => {
    if (!mapped?.rows.length) throw new Error("Choose a file first.");
    const sum = await uploadInChunks(id, mapped.rows, setNote);
    setAppendOpen(false); setMapped(null); loadList(); loadRows();
    return resultText(sum);
  });

  const exportCsv = () => act(async () => {
    await mcExportAudience(id, `${(a?.name ?? "list").replace(/[^\w-]+/g, "-")}.csv`);
    return "Export downloaded. People marked “no” in can_be_mailed are never emailed.";
  });

  const remove = () => act(async () => {
    if (!a || !window.confirm(`Delete “${a.name}” and its ${a.memberCount} people? Sent campaigns keep their own records.`)) return;
    await mcDeleteAudience(id); onDeleted();
  });

  if (loadError) return <p role="alert" className="text-sm text-red-500">Couldn&apos;t load this list. <button type="button" className="underline" onClick={loadList}>Try again</button> · <button type="button" className="underline" onClick={onBack}>Back</button></p>;
  if (!a) return <Loader2 className={`h-5 w-5 animate-spin ${t.muted}`} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onBack} className={btn}><ArrowLeft className="h-4 w-4" aria-hidden /> All lists</button>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" onClick={() => onSendCampaign(id)} className={`${btn} ${t.btnAccent}`}><Send className="h-4 w-4" aria-hidden /> New campaign to this list</button>
          <button type="button" disabled={busy} onClick={exportCsv} className={btn}><Download className="h-4 w-4" aria-hidden /> Export CSV</button>
          <button type="button" disabled={busy} onClick={remove} className={btn} aria-label="Delete list"><Trash2 className="h-4 w-4" aria-hidden /></button>
        </div>
      </div>

      <div className={`rounded-2xl border p-4 ${t.card}`}>
        {meta ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={label} htmlFor="mc-m-name">Name</label><input id="mc-m-name" className={field} value={meta.name} maxLength={120} onChange={(e) => setMeta({ ...meta, name: e.target.value })} /></div>
            <div><label className={label} htmlFor="mc-m-tags">Tags</label><input id="mc-m-tags" className={field} value={meta.tags} onChange={(e) => setMeta({ ...meta, tags: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className={label} htmlFor="mc-m-desc">Description</label><input id="mc-m-desc" className={field} value={meta.description} maxLength={500} onChange={(e) => setMeta({ ...meta, description: e.target.value })} /></div>
            <div className="flex gap-2"><button type="button" disabled={busy} onClick={saveMeta} className={`${btn} ${t.btnAccent}`}>Save</button><button type="button" onClick={() => setMeta(null)} className={btn}>Cancel</button></div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3 className={`text-lg font-black ${t.heading}`}>{a.name}</h3>
              {a.description && <p className={`text-sm ${t.text}`}>{a.description}</p>}
              <p className={`mt-1 text-xs ${t.muted}`}>
                {a.memberCount.toLocaleString("en-IN")} people · {a.campaigns.length} campaign{a.campaigns.length === 1 ? "" : "s"} ·
                {" "}{ORIGIN_LABEL[a.origin ?? ""] ?? "Uploaded"} · made by {a.createdBy ?? "—"} on {day(a.createdAt)} · updated {day(a.updatedAt)}
              </p>
              {a.sourceNote && <p className={`text-xs ${t.dim}`}>Source: {a.sourceNote}</p>}
              <p className={`text-xs ${t.dim}`}>Consent: {a.consentBasis}</p>
              {tagsOfAudience(a).length > 0 && <p className="mt-1 flex flex-wrap gap-1">{tagsOfAudience(a).map((x) => <span key={x} className={`rounded-full border px-2 py-0.5 text-3xs ${t.badgeAccent}`}>#{x}</span>)}</p>}
            </div>
            <button type="button" onClick={() => setMeta({ name: a.name, description: a.description ?? "", tags: tagsOfAudience(a).join(", ") })} className={btn}><Pencil className="h-3.5 w-3.5" aria-hidden /> Edit</button>
          </div>
        )}
        <div className="mt-3">
          <span className={label}>Variables from this list</span>
          {cols.length === 0 ? <p className={`text-xs ${t.muted}`}>None yet. Add a field to a person, or append a sheet with extra columns.</p> : (
            <div className="flex flex-wrap gap-1.5">
              {cols.map((c) => (
                <span key={c} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-3xs ${t.badgeAccent}`}>
                  {`{{${c}}}`}
                  <button type="button" aria-label={`Rename ${c}`} onClick={() => renameColumn(c)} className="rounded p-0.5 hover:bg-black/10"><Pencil className="h-3 w-3" /></button>
                  <button type="button" aria-label={`Delete column ${c}`} onClick={() => deleteColumn(c)} className="rounded p-0.5 hover:bg-black/10"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      {note && <p className="text-sm text-emerald-500">{note}</p>}

      <div className={`rounded-2xl border p-4 ${t.card}`}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h4 className={`mr-auto text-sm font-black ${t.heading}`}>People</h4>
          <input type="search" aria-label="Search people" placeholder="Search name or email" value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }} className={`${field} max-w-[14rem]`} />
          <button type="button" onClick={() => setPerson({ id: null, email: "", name: "", values: {}, newKey: "", newValue: "" })} className={btn}><Plus className="h-4 w-4" aria-hidden /> Add person</button>
          <button type="button" onClick={() => setAppendOpen((x) => !x)} className={btn}>Add from file</button>
        </div>

        {appendOpen && (
          <div className={`mb-3 space-y-2 rounded-xl border p-3 ${t.cardFlat}`}>
            <p className={`text-xs ${t.muted}`}>People already on the list are updated by email. Empty cells never erase a value. New columns become variables.</p>
            <SheetMapping id="mc-append" onChange={setMapped} fieldClass={field} labelClass={label} mutedClass={t.muted} />
            <button type="button" disabled={busy || !mapped} onClick={append} className={`${btn} ${t.btnAccent}`}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Add / update people</button>
          </div>
        )}

        {person && (
          <div className={`mb-3 space-y-2 rounded-xl border p-3 ${t.cardFlat}`}>
            <div className="grid gap-2 sm:grid-cols-2">
              <div><label className={label} htmlFor="mc-p-email">Email</label><input id="mc-p-email" type="email" className={field} value={person.email} onChange={(e) => setPerson({ ...person, email: e.target.value })} /></div>
              <div><label className={label} htmlFor="mc-p-name">Name</label><input id="mc-p-name" className={field} value={person.name} maxLength={200} onChange={(e) => setPerson({ ...person, name: e.target.value })} /></div>
              {cols.map((c) => (
                <div key={c}><label className={label} htmlFor={`mc-p-${c}`}>{`{{${c}}}`}</label>
                  <input id={`mc-p-${c}`} className={field} value={person.values[c] ?? ""} onChange={(e) => setPerson({ ...person, values: { ...person.values, [c]: e.target.value } })} /></div>
              ))}
              <div><label className={label} htmlFor="mc-p-newkey">New field (optional)</label><input id="mc-p-newkey" className={field} placeholder="e.g. city" value={person.newKey} onChange={(e) => setPerson({ ...person, newKey: e.target.value })} /></div>
              <div><label className={label} htmlFor="mc-p-newval">Its value</label><input id="mc-p-newval" className={field} value={person.newValue} onChange={(e) => setPerson({ ...person, newValue: e.target.value })} /></div>
            </div>
            <p className={`text-xs ${t.dim}`}>Clearing a field removes it for this person. A new field becomes a variable for the whole list.</p>
            <div className="flex gap-2"><button type="button" disabled={busy} onClick={savePerson} className={`${btn} ${t.btnAccent}`}>Save</button><button type="button" onClick={() => setPerson(null)} className={btn}>Cancel</button></div>
          </div>
        )}

        {rowsError ? <p role="alert" className="text-sm text-red-500">Couldn&apos;t load people. <button type="button" className="underline" onClick={loadRows}>Try again</button></p>
          : rows == null ? <Loader2 className={`h-4 w-4 animate-spin ${t.muted}`} />
          : rows.length === 0 ? <p className={`py-4 text-center text-sm ${t.muted}`}>{q ? "No one matches." : "No people yet."}</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className={t.dim}><tr>
                  {["Email", "Name", ...cols.map((c) => `{{${c}}}`), "Added", ""].map((h, i) => <th key={i} className="px-2 py-1.5 font-black uppercase tracking-wider">{h}</th>)}
                </tr></thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id} className={`border-t ${t.text}`}>
                      <td className="max-w-[16rem] px-2 py-1.5">
                        <span className="block truncate" title={m.email}>{m.email}</span>
                        {m.blocked && <span className="text-3xs text-amber-500">Never emailed: {m.blocked}</span>}
                      </td>
                      <td className="px-2 py-1.5">{m.name ?? ""}</td>
                      {cols.map((c) => <td key={c} className="max-w-[10rem] truncate px-2 py-1.5" title={m.values[c] ?? ""}>{m.values[c] ?? ""}</td>)}
                      <td className="whitespace-nowrap px-2 py-1.5">{day(m.createdAt)}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right">
                        <button type="button" aria-label={`Edit ${m.email}`} onClick={() => setPerson({ id: m.id, email: m.email, name: m.name ?? "", values: { ...m.values }, newKey: "", newValue: "" })} className="rounded p-1 hover:bg-black/10"><Pencil className="h-3.5 w-3.5" /></button>
                        <button type="button" aria-label={`Remove ${m.email}`} onClick={() => removePerson(m)} className="rounded p-1 hover:bg-black/10"><Trash2 className="h-3.5 w-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        <div className="mt-2 flex items-center justify-end gap-2 text-xs">
          <span className={`mr-auto ${t.muted}`}>{total.toLocaleString("en-IN")} {q ? "matching" : "in total"}</span>
          <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className={btn}>Previous</button>
          <span className={t.muted}>Page {page + 1} of {Math.max(1, Math.ceil(total / PAGE))}</span>
          <button type="button" disabled={(page + 1) * PAGE >= total} onClick={() => setPage((p) => p + 1)} className={btn}>Next</button>
        </div>
      </div>

      <div className={`rounded-2xl border p-4 ${t.card}`}>
        <h4 className={`mb-2 text-sm font-black ${t.heading}`}>Campaigns sent to this list</h4>
        {a.campaigns.length === 0 ? <p className={`text-xs ${t.muted}`}>None yet.</p> : (
          <ul className="space-y-1 text-xs">
            {a.campaigns.map((c) => (
              <li key={c.id} className={`flex items-center gap-2 ${t.text}`}>
                <span className={`rounded-full px-2 py-0.5 text-3xs font-black ${STATUS_STYLE[c.status] ?? ""}`}>{c.status}</span>
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <span className={t.muted}>{day(c.startedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
