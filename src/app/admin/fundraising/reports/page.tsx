"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "@/components/AppLink";
import { FEATURES } from "@/lib/features";
import { fundraisingReports, type ReportCaseRow } from "@/lib/api";
import { CampaignChip, formatDate } from "@/features/fundraising/ui";
import a from "@/features/fundraising/admin.module.css";

/** Report cases, one per fundraiser (opens F34). */
export default function AdminReportsPage() {
  const [open, setOpen] = useState(true);
  const [rows, setRows] = useState<ReportCaseRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setRows(null); setFailed(false);
    fundraisingReports.admin.cases(open).then(setRows).catch(() => setFailed(true));
  }, [open]);
  useEffect(() => { if (FEATURES.fundraising) load(); }, [load]);

  if (!FEATURES.fundraising) return <div className={a.root}><main className={a.wrap} style={{ paddingTop: 40 }}><p className={a.muted}>Fundraising is switched off.</p></main></div>;

  return (
    <div className={a.root}>
      <main className={a.wrap} style={{ paddingTop: 28, paddingBottom: 56, display: "flex", flexDirection: "column", gap: 18 }}>
        <nav className={a.switch} aria-label="Fundraising review">
          <Link href="/admin/fundraising" className={a.switchBtn}>Applications</Link>
          <Link href="/admin/fundraising/campaigns" className={a.switchBtn}>Publication review</Link>
          <Link href="/admin/fundraising/review" className={a.switchBtn}>Updates &amp; changes</Link>
          <span className={`${a.switchBtn} ${a.switchOn}`} aria-current="page">Reports</span>
        </nav>
        <div><h1 className={a.serif} style={{ fontSize: 28 }}>Reports</h1><p className={a.muted}>Concerns raised about fundraisers. Reporter identities are visible to admins only.</p></div>
        <nav className={a.tabs} aria-label="Filter">
          <button type="button" className={`${a.tab} ${open ? a.tabOn : ""}`} aria-pressed={open} onClick={() => setOpen(true)}>Open</button>
          <button type="button" className={`${a.tab} ${!open ? a.tabOn : ""}`} aria-pressed={!open} onClick={() => setOpen(false)}>All</button>
        </nav>
        {failed ? (
          <div className={a.card} role="alert" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start", borderColor: "#e9b8b3" }}>
            <strong className={a.err}>Couldn&apos;t load reports</strong><button type="button" className={`${a.btn} ${a.bs}`} onClick={load}>Retry</button>
          </div>
        ) : rows === null ? <div className={a.card} aria-busy="true" style={{ padding: 20 }}><div className={a.skel} /></div>
          : rows.length === 0 ? <div className={a.card} style={{ padding: 20 }}><strong>Nothing here</strong><p className={a.muted}>No reports in this list.</p></div>
          : (
            <div className={a.card} style={{ overflowX: "auto" }}>
              <table className={a.table}>
                <thead><tr><th>Fundraiser</th><th>State</th><th className={a.num}>Open</th><th className={a.num}>Total</th><th>Organiser response</th><th>Latest</th><th></th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.campaignId}>
                      <td><strong>{r.title || "Untitled"}</strong><div className={`${a.muted} ${a.small}`}>{r.organiser}</div></td>
                      <td><CampaignChip status={r.campaignStatus} /></td>
                      <td className={a.num}>{r.openReports}</td>
                      <td className={a.num}>{r.totalReports}</td>
                      <td className={a.small}>{r.responseReceived ? "Received" : r.responseRequested ? "Requested" : "—"}</td>
                      <td className={a.small}>{formatDate(r.latestAt)}</td>
                      <td><Link href={`/admin/fundraising/reports/${r.campaignId}`} className={`${a.btn} ${r.openReports > 0 ? a.bp : a.bs}`}>Open case</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </main>
    </div>
  );
}
