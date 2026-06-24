"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  superAdminList, superAdminUpdate, superAdminDelete, superAdminCreateUser,
  type SuperAdminEntity, type SuperAdminRow,
} from "@/lib/api";
import { Search, Pencil, Trash2, X, Plus, Loader2, AlertTriangle, RefreshCw } from "lucide-react";

export type ColumnType = "text" | "number" | "textarea" | "boolean" | "select";

export type Column = {
  key: string;
  label: string;
  editable?: boolean;
  type?: ColumnType;
  options?: string[];
  /** Shown in the table grid (default true). Set false for edit-only fields. */
  inTable?: boolean;
};

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    return new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  }
  const s = String(v);
  return s.length > 60 ? s.slice(0, 57) + "…" : s;
}

/* ── Edit / Create modal ─────────────────────────────────────────────────── */
function RowForm({
  title, columns, initial, onClose, onSave, saving,
}: {
  title: string;
  columns: Column[];
  initial: SuperAdminRow;
  onClose: () => void;
  onSave: (changes: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const editable = columns.filter(c => c.editable);
  const [form, setForm] = useState<Record<string, unknown>>(() => {
    const f: Record<string, unknown> = {};
    editable.forEach(c => { f[c.key] = initial[c.key] ?? (c.type === "boolean" ? false : ""); });
    return f;
  });

  const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose} style={{ animation: "fadeIn 0.15s ease forwards" }}>
      <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto bg-[#0e1320] border border-[#f0b97a]/20 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[#0e1320]">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {editable.map(c => (
            <div key={c.key} className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">{c.label}</label>
              {c.type === "boolean" ? (
                <button
                  type="button"
                  onClick={() => set(c.key, !form[c.key])}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${form[c.key] ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-white/5 border-white/10 text-stone-400"}`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${form[c.key] ? "bg-emerald-400" : "bg-stone-500"}`} />
                  {form[c.key] ? "Active / True" : "Inactive / False"}
                </button>
              ) : c.type === "select" ? (
                <select
                  value={String(form[c.key] ?? "")}
                  onChange={e => set(c.key, e.target.value)}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f0b97a]/50"
                >
                  <option value="" className="bg-[#0e1320]">—</option>
                  {c.options?.map(o => <option key={o} value={o} className="bg-[#0e1320]">{o}</option>)}
                </select>
              ) : c.type === "textarea" ? (
                <textarea
                  rows={3}
                  value={String(form[c.key] ?? "")}
                  onChange={e => set(c.key, e.target.value)}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-stone-600 focus:outline-none focus:border-[#f0b97a]/50 resize-none"
                />
              ) : (
                <input
                  type={c.type === "number" ? "number" : "text"}
                  value={String(form[c.key] ?? "")}
                  onChange={e => set(c.key, e.target.value)}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-stone-600 focus:outline-none focus:border-[#f0b97a]/50"
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-white/10 sticky bottom-0 bg-[#0e1320]">
          <button onClick={() => onSave(form)} disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-[#f0b97a] hover:bg-[#e0a96a] disabled:opacity-50 text-stone-950 font-bold py-2.5 rounded-lg text-sm transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save changes"}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-white/15 text-stone-300 hover:bg-white/5 text-sm font-semibold transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Delete confirm ──────────────────────────────────────────────────────── */
function DeleteConfirm({ row, onCancel, onConfirm, deleting }: { row: SuperAdminRow; onCancel: () => void; onConfirm: () => void; deleting: boolean; }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onCancel} style={{ animation: "fadeIn 0.15s ease forwards" }}>
      <div className="w-full max-w-sm bg-[#1a0e0e] border border-red-500/30 rounded-2xl shadow-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <h3 className="text-base font-bold text-white">Hard-delete row #{String(row.id)}?</h3>
        <p className="text-xs text-stone-400 mt-2 leading-relaxed">This permanently removes the row from the database. It cannot be undone.</p>
        <div className="flex gap-2 mt-6">
          <button onClick={onConfirm} disabled={deleting} className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-sm transition-colors">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete permanently"}
          </button>
          <button onClick={onCancel} className="px-5 py-2.5 rounded-lg border border-white/15 text-stone-300 hover:bg-white/5 text-sm font-semibold transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main table ──────────────────────────────────────────────────────────── */
export function EntityTable({
  entity, title, columns, canCreate = false, createColumns,
}: {
  entity: SuperAdminEntity;
  title: string;
  columns: Column[];
  canCreate?: boolean;
  createColumns?: Column[];
}) {
  const [rows, setRows] = useState<SuperAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editRow, setEditRow] = useState<SuperAdminRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteRow, setDeleteRow] = useState<SuperAdminRow | null>(null);
  const [saving, setSaving] = useState(false);

  const tableCols = columns.filter(c => c.inTable !== false);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      setRows(await superAdminList(entity, q));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [entity]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(changes: Record<string, unknown>) {
    if (!editRow) return;
    setSaving(true);
    try {
      const updated = await superAdminUpdate(entity, Number(editRow.id), changes);
      setRows(prev => prev.map(r => (r.id === editRow.id ? updated : r)));
      toast.success("Updated");
      setEditRow(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(values: Record<string, unknown>) {
    setSaving(true);
    try {
      const created = await superAdminCreateUser(values);
      setRows(prev => [created, ...prev]);
      toast.success("User created");
      setCreating(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteRow) return;
    setSaving(true);
    try {
      await superAdminDelete(entity, Number(deleteRow.id));
      setRows(prev => prev.filter(r => r.id !== deleteRow.id));
      toast.success("Deleted");
      setDeleteRow(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-lg font-black text-white tracking-tight">{title}</h2>
          <p className="text-xs text-stone-500">{rows.length} row{rows.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <form
            onSubmit={e => { e.preventDefault(); load(search); }}
            className="relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-9 pr-3 py-2 w-44 sm:w-56 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-stone-600 focus:outline-none focus:border-[#f0b97a]/50"
            />
          </form>
          <button onClick={() => load(search)} className="p-2 rounded-lg border border-white/10 text-stone-400 hover:text-white hover:bg-white/5 transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          {canCreate && (
            <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 bg-[#f0b97a] hover:bg-[#e0a96a] text-stone-950 font-bold px-4 py-2 rounded-lg text-sm transition-colors">
              <Plus className="w-4 h-4" /> New
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#0b0f1a]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] border-b border-white/10">
              <tr>
                {tableCols.map(c => (
                  <th key={c.key} className="px-4 py-3 text-left font-bold text-[11px] uppercase tracking-wider text-stone-500 whitespace-nowrap">{c.label}</th>
                ))}
                <th className="px-4 py-3 text-right font-bold text-[11px] uppercase tracking-wider text-stone-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {tableCols.map(c => <td key={c.key} className="px-4 py-3"><div className="h-3.5 bg-white/5 rounded animate-pulse" /></td>)}
                    <td className="px-4 py-3"><div className="h-3.5 w-16 bg-white/5 rounded animate-pulse ml-auto" /></td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr><td colSpan={tableCols.length + 1} className="px-4 py-16 text-center text-stone-500 text-sm">No rows found.</td></tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={String(row.id)} className="sa-row-cascade hover:bg-white/[0.03] transition-colors" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                    {tableCols.map(c => (
                      <td key={c.key} className="px-4 py-3 text-stone-300 whitespace-nowrap">
                        {c.key === "id"
                          ? <span className="font-mono text-stone-500">#{fmt(row[c.key])}</span>
                          : c.type === "boolean"
                            ? <span className={`text-xs font-bold ${row[c.key] ? "text-emerald-400" : "text-stone-500"}`}>{fmt(row[c.key])}</span>
                            : fmt(row[c.key])}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditRow(row)} className="p-1.5 rounded-lg text-stone-400 hover:text-[#f0b97a] hover:bg-[#f0b97a]/10 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteRow(row)} className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editRow && (
        <RowForm title={`Edit ${title} #${String(editRow.id)}`} columns={columns} initial={editRow} saving={saving} onClose={() => setEditRow(null)} onSave={handleSave} />
      )}
      {creating && (
        <RowForm title={`Create ${title}`} columns={createColumns ?? columns} initial={{}} saving={saving} onClose={() => setCreating(false)} onSave={handleCreate} />
      )}
      {deleteRow && (
        <DeleteConfirm row={deleteRow} deleting={saving} onCancel={() => setDeleteRow(null)} onConfirm={handleDelete} />
      )}
    </div>
  );
}
