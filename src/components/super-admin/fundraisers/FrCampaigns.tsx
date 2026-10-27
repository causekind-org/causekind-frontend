"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { superAdminFundraising, type SaFrCampaignRow } from "@/lib/api";
import type { SaTheme } from "@/components/super-admin/saTheme";
import { CampaignStatusPill, Card, Chip, ErrorLine, Pill, Spinner, errorText, inr, shortDate } from "./shared";

const STATUS_CHIPS: { label: string; status?: string; flag?: string }[] = [
  { label: "All" },
  { label: "Draft", status: "DRAFT" },
  { label: "In review", status: "PUBLICATION_REVIEW" },
  { label: "Live", status: "APPROVED" },
  { label: "Paused", status: "PAUSED" },
  { label: "Collections closed", status: "COLLECTIONS_CLOSED" },
  { label: "Declined", status: "PUBLICATION_DECLINED" },
  { label: "Hidden", flag: "hidden" },
  { label: "Deleted", flag: "deleted" },
];

const CATEGORIES = ["MEDICAL", "EDUCATION", "EMERGENCY_HOUSEHOLD", "OTHER"];
const catLabel = (c: string | null) => (c ? c.charAt(0) + c.slice(1).toLowerCase().replaceAll("_", " ") : "—");

export function FrCampaigns({ t, search, onSearch, onOpen }: {
  t: SaTheme; search: string; onSearch: (q: string) => void; onOpen: (id: number) => void;
}) {
  const [chip, setChip] = useState(0);
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("");
  const [rows, setRows] = useState<SaFrCampaignRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const size = 25;

  const load = useCallback(() => {
    setError(null);
    const c = STATUS_CHIPS[chip];
    superAdminFundraising.campaigns({ q: search, status: c.status, flag: c.flag, category, sort })
      .then((r) => { setRows(r); setPage(0); })
      .catch((e) => setError(errorText(e, "We couldn't load campaigns.")));
  }, [chip, category, sort, search]);
  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h); }, [load]);

  function exportCsv() {
    if (!rows) return;
    const head = "id,title,donee,category,city,status,raised,target,donors,end_date,hidden,featured,accepting_donations,payout_ready\n";
    const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const body = rows.map((r) => [r.id, r.title, r.doneeName, r.category, r.city, r.status, r.raised, r.target, r.donors, r.endDate,
      r.hidden, r.featured, r.acceptingDonations, r.payoutReady].map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([head + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "fundraiser-campaigns.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const shown = rows?.slice(page * size, page * size + size) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <label className={`flex w-full items-center gap-2 rounded-xl border px-3 sm:w-[320px] ${t.input}`}>
          <Search className={`h-4 w-4 ${t.dim}`} aria-hidden="true" />
          <input value={search} onChange={(e) => onSearch(e.target.value)} aria-label="Search campaigns" placeholder="Title, donee, city or #ID"
            className="min-h-10 flex-1 bg-transparent text-sm outline-none" />
        </label>
        {STATUS_CHIPS.map((c, i) => (
          <Chip key={c.label} t={t} active={chip === i} onClick={() => setChip(i)}>{c.label}{chip === i && rows ? ` ${rows.length}` : ""}</Chip>
        ))}
        <span className="flex-1" />
        <label className={`flex items-center gap-1.5 text-[13px] ${t.text}`}>Category
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={`min-h-9 rounded-lg border px-2 text-[13px] ${t.input}`}>
            <option value="">All</option>{CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
          </select>
        </label>
        <label className={`flex items-center gap-1.5 text-[13px] ${t.text}`}>Sort
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={`min-h-9 rounded-lg border px-2 text-[13px] ${t.input}`}>
            <option value="">Newest</option><option value="raised">Most raised</option><option value="ending">Ending soon</option>
          </select>
        </label>
        <button type="button" onClick={exportCsv} disabled={!rows?.length} className={`min-h-9 rounded-lg border px-3 text-[13px] ${t.btn}`}>Export CSV</button>
      </div>

      {error ? <ErrorLine message={error} onRetry={load} /> : !rows ? <Spinner t={t} /> : (
        <Card t={t} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className={`border-b text-left text-xs font-semibold uppercase tracking-wider ${t.tableHead} ${t.muted}`}>
                  <th className="px-3.5 py-3">Campaign</th><th className="px-3.5 py-3">Donee</th><th className="px-3.5 py-3">Status</th>
                  <th className="px-3.5 py-3">Raised / target</th><th className="px-3.5 py-3">Donors</th><th className="px-3.5 py-3">Ends</th>
                  <th className="px-3.5 py-3">Flags</th><th className="px-3.5 py-3"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className={`divide-y ${t.divide}`}>
                {shown.length === 0 && <tr><td colSpan={8} className={`px-4 py-10 text-center ${t.muted}`}>No campaigns match.</td></tr>}
                {shown.map((r) => {
                  const pct = r.target ? Math.min(100, ((r.raised ?? 0) / r.target) * 100) : 0;
                  return (
                    <tr key={r.id} className={t.rowHover}>
                      <td className="px-3.5 py-3">
                        <button type="button" onClick={() => onOpen(r.id)} className={`text-left font-semibold ${t.heading} hover:underline`}>{r.title || "Untitled"}</button>
                        <div className={`text-xs ${t.muted}`}>#{r.id} · {catLabel(r.category)} · {r.city || "—"}</div>
                      </td>
                      <td className={`px-3.5 py-3 ${t.text}`}>{r.doneeName ?? "—"}</td>
                      <td className="px-3.5 py-3"><CampaignStatusPill status={r.status} /></td>
                      <td className="px-3.5 py-3">
                        <div className={`font-semibold ${t.heading}`}>{inr(r.raised)} <span className={`font-normal ${t.dim}`}>/ {inr(r.target)}</span></div>
                        {r.target ? <div className="mt-1.5 h-1.5 rounded-full bg-stone-200/70"><div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: t.accent }} /></div> : null}
                      </td>
                      <td className={`px-3.5 py-3 ${t.text}`}>{r.donors}</td>
                      <td className={`px-3.5 py-3 ${t.text}`}>{shortDate(r.endDate)}</td>
                      <td className="px-3.5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {r.deleted && <Pill tone="danger">Deleted</Pill>}
                          {r.hidden && <Pill tone="muted">Hidden</Pill>}
                          {r.featured && <Pill tone="info">Featured</Pill>}
                          {!r.acceptingDonations && <Pill tone="warn">Donations off</Pill>}
                          {r.payoutReady && <Pill tone="violet">Payout ready</Pill>}
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <button type="button" onClick={() => onOpen(r.id)} className="text-sm font-semibold" style={{ color: t.accent }}>Open →</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={`flex items-center justify-end gap-3 px-4 py-3 text-[13px] ${t.muted}`}>
            <span>Showing {rows.length ? page * size + 1 : 0}–{Math.min(rows.length, page * size + size)} of {rows.length}</span>
            <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className={`min-h-9 rounded-lg border px-3 ${t.btn}`}>← Prev</button>
            <button type="button" disabled={(page + 1) * size >= rows.length} onClick={() => setPage(page + 1)} className={`min-h-9 rounded-lg border px-3 ${t.btn}`}>Next →</button>
          </div>
        </Card>
      )}
    </div>
  );
}
