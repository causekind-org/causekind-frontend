"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { superAdminFundraising, type SaFrCampaignRow, type SaFrDonationFilter, type SaFrDonationPage } from "@/lib/api";
import type { SaTheme } from "@/components/super-admin/saTheme";
import { Card, ErrorLine, Pill, Spinner, Stat, dateTime, errorText, inr } from "./shared";

const SIZE = 50;

export function FrDonations({ t, onOpenCampaign }: { t: SaTheme; onOpenCampaign: (id: number) => void }) {
  const [f, setF] = useState<SaFrDonationFilter>({});
  const [page, setPage] = useState(0);
  const [data, setData] = useState<SaFrDonationPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<SaFrCampaignRow[]>([]);

  useEffect(() => { superAdminFundraising.campaigns().then(setCampaigns).catch(() => setCampaigns([])); }, []);

  const load = useCallback(() => {
    setError(null);
    superAdminFundraising.donations({ ...f, page, size: SIZE }).then(setData).catch((e) => setError(errorText(e, "We couldn't load donations.")));
  }, [f, page]);
  useEffect(() => { const h = setTimeout(load, 250); return () => clearTimeout(h); }, [load]);

  const set = (patch: SaFrDonationFilter) => { setF({ ...f, ...patch }); setPage(0); };
  const sel = `min-h-9 rounded-lg border px-2 text-[13px] ${t.input}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm ${t.muted}`}>All fundraiser donations across campaigns. Read-only while refunds and payouts are on hold.</p>
        <button type="button" className={`min-h-9 rounded-lg border px-3 text-[13px] ${t.btn}`}
          onClick={async () => {
            try {
              const res = await fetch(superAdminFundraising.donationsCsvUrl(f), { credentials: "include", cache: "no-store" });
              if (!res.ok) throw new Error();
              const url = URL.createObjectURL(await res.blob());
              const a = document.createElement("a");
              a.href = url; a.download = "fundraiser-donations.csv"; a.click();
              URL.revokeObjectURL(url);
            } catch { setError("The export didn't download. Try again."); }
          }}>Export CSV</button>
      </div>
      {data && (
        <section className="grid grid-cols-2 gap-3.5 xl:grid-cols-4" aria-label="Donation totals">
          <Stat t={t} label="Successful" value={inr(data.totals.successfulAmount)} sub={`${data.totals.successfulCount} donations`} />
          <Stat t={t} label="Pending" value={inr(data.totals.pendingAmount)} sub={`${data.totals.pendingCount} donations`} />
          <Stat t={t} label="Failed" value={data.totals.failedCount} />
          <Stat t={t} label="Platform fees" value={inr(data.totals.fees)} />
        </section>
      )}
      <div className="flex flex-wrap items-center gap-2.5">
        <label className={`flex w-full items-center gap-2 rounded-xl border px-3 sm:w-[320px] ${t.input}`}>
          <Search className={`h-4 w-4 ${t.dim}`} aria-hidden="true" />
          <input value={f.q ?? ""} onChange={(e) => set({ q: e.target.value })} aria-label="Search donations" placeholder="Donor, email, campaign, payment ID"
            className="min-h-10 flex-1 bg-transparent text-sm outline-none" />
        </label>
        <label className={`flex items-center gap-1.5 text-[13px] ${t.text}`}>Status
          <select value={f.status ?? ""} onChange={(e) => set({ status: e.target.value || undefined })} className={sel}>
            <option value="">All</option><option value="COMPLETED">Success</option><option value="INITIATED">Pending</option><option value="FAILED">Failed</option>
          </select>
        </label>
        <label className={`flex items-center gap-1.5 text-[13px] ${t.text}`}>Campaign
          <select value={f.campaignId ?? ""} onChange={(e) => set({ campaignId: e.target.value ? Number(e.target.value) : undefined })} className={`${sel} max-w-[220px]`}>
            <option value="">All campaigns</option>{campaigns.map((c) => <option key={c.id} value={c.id}>#{c.id} {c.title ?? "Untitled"}</option>)}
          </select>
        </label>
        <label className={`flex items-center gap-1.5 text-[13px] ${t.text}`}>Donor
          <select value={f.donorMode ?? ""} onChange={(e) => set({ donorMode: e.target.value || undefined })} className={sel}>
            <option value="">Any</option><option value="LOGGED_IN">Account</option><option value="GUEST">Guest</option><option value="anonymous">Anonymous</option>
          </select>
        </label>
        <label className={`flex items-center gap-1.5 text-[13px] ${t.text}`}>From <input type="date" value={f.from ?? ""} onChange={(e) => set({ from: e.target.value || undefined })} className={sel} /></label>
        <label className={`flex items-center gap-1.5 text-[13px] ${t.text}`}>To <input type="date" value={f.to ?? ""} onChange={(e) => set({ to: e.target.value || undefined })} className={sel} /></label>
      </div>
      {error ? <ErrorLine message={error} onRetry={load} /> : !data ? <Spinner t={t} /> : (
        <Card t={t} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className={`border-b text-left text-xs font-semibold uppercase tracking-wider ${t.tableHead} ${t.muted}`}>
                  <th className="px-3.5 py-3">Date</th><th className="px-3.5 py-3">Donor</th><th className="px-3.5 py-3">Campaign</th><th className="px-3.5 py-3">Amount</th>
                  <th className="px-3.5 py-3">Fee</th><th className="px-3.5 py-3">Net</th><th className="px-3.5 py-3">Status</th><th className="px-3.5 py-3">Payment ID</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${t.divide}`}>
                {data.rows.length === 0 && <tr><td colSpan={8} className={`px-4 py-10 text-center ${t.muted}`}>No donations match.</td></tr>}
                {data.rows.map((r) => (
                  <tr key={r.id} className={t.rowHover}>
                    <td className={`px-3.5 py-3 ${t.text}`}>{dateTime(r.createdAt)}</td>
                    <td className="px-3.5 py-3"><div className={t.heading}>{r.anonymous ? "Anonymous" : r.donorName ?? "—"}</div><div className={`text-xs ${t.muted}`}>{r.donorMode === "GUEST" ? "Guest" : "Account"}{r.donorEmail ? ` · ${r.donorEmail}` : ""}</div></td>
                    <td className="px-3.5 py-3"><button type="button" onClick={() => onOpenCampaign(r.campaignId)} className="text-left underline" style={{ color: t.accent }}>{r.campaignTitle ?? `#${r.campaignId}`}</button></td>
                    <td className={`px-3.5 py-3 font-semibold ${t.heading}`}>{inr(r.amount)}</td>
                    <td className={`px-3.5 py-3 ${t.text}`}>{inr(r.fee)}</td>
                    <td className={`px-3.5 py-3 ${t.text}`}>{inr(r.net)}</td>
                    <td className="px-3.5 py-3"><Pill tone={r.status === "COMPLETED" ? "ok" : r.status === "FAILED" ? "danger" : "warn"}>{r.status === "COMPLETED" ? "Success" : r.status === "FAILED" ? "Failed" : "Pending"}</Pill></td>
                    <td className={`px-3.5 py-3 font-mono text-xs ${t.muted}`}>{r.razorpayPaymentId ?? r.razorpayOrderId ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={`flex items-center justify-end gap-3 px-4 py-3 text-[13px] ${t.muted}`}>
            <span>Showing {data.total ? page * SIZE + 1 : 0}–{Math.min(data.total, page * SIZE + SIZE)} of {data.total}</span>
            <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className={`min-h-9 rounded-lg border px-3 ${t.btn}`}>← Prev</button>
            <button type="button" disabled={(page + 1) * SIZE >= data.total} onClick={() => setPage(page + 1)} className={`min-h-9 rounded-lg border px-3 ${t.btn}`}>Next →</button>
          </div>
        </Card>
      )}
    </div>
  );
}
