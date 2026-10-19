"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "@/components/AppLink";
import { FEATURES } from "@/lib/features";
import { fundraisingCampaigns, type CampaignFlowStatus, type FundraisingCampaignQueueRow } from "@/lib/api";
import { CATEGORY_LABEL, CampaignChip, formatDate, formatINR } from "@/features/fundraising/ui";
import a from "@/features/fundraising/admin.module.css";

const FILTERS: { label: string; status?: CampaignFlowStatus }[] = [
  { label: "Waiting for review" },
  { label: "Changes requested", status: "CHANGES_REQUESTED" },
  { label: "Approved — setup incomplete", status: "APPROVED_SETUP_INCOMPLETE" },
  { label: "Live", status: "APPROVED" },
  { label: "Declined", status: "PUBLICATION_DECLINED" },
  { label: "Drafts", status: "DRAFT" },
  { label: "Cancelled", status: "CANCELLED" },
];

/** Publication review queue (lists the campaigns F19 reviews). */
export default function AdminCampaignQueuePage() {
  const [filter, setFilter] = useState(0);
  const [rows, setRows] = useState<FundraisingCampaignQueueRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setRows(null); setFailed(false);
    fundraisingCampaigns.admin.queue(FILTERS[filter].status).then(setRows).catch(() => setFailed(true));
  }, [filter]);
  useEffect(() => { if (FEATURES.fundraising) load(); }, [load]);

  if (!FEATURES.fundraising) return <div className={a.root}><main className={a.wrap} style={{ paddingTop: 40 }}><p className={a.muted}>Fundraising is switched off.</p></main></div>;

  return (
    <div className={a.root}>
      <main className={a.wrap} style={{ paddingTop: 28, paddingBottom: 56, display: "flex", flexDirection: "column", gap: 18 }}>
        <nav className={a.switch} aria-label="Fundraising review"><Link href="/admin/fundraising" className={a.switchBtn}>Applications</Link><span className={`${a.switchBtn} ${a.switchOn}`} aria-current="page">Publication review</span></nav>
        <div><h1 className={a.serif} style={{ fontSize: 28 }}>Publication review</h1><p className={a.muted}>Check each fundraiser page against its approved application before it can go public.</p></div>
        <nav className={a.tabs} aria-label="Filter by state">
          {FILTERS.map((f, i) => <button key={f.label} type="button" className={`${a.tab} ${i === filter ? a.tabOn : ""}`} aria-pressed={i === filter} onClick={() => setFilter(i)}>{f.label}</button>)}
        </nav>
        {failed ? (
          <div className={a.card} role="alert" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start", borderColor: "#e9b8b3" }}>
            <strong className={a.err}>Couldn&apos;t load campaigns</strong><button type="button" className={`${a.btn} ${a.bs}`} onClick={load}>Retry</button>
          </div>
        ) : rows === null ? (
          <div className={a.card} aria-busy="true" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}><div className={a.skel} style={{ width: "80%" }} /><div className={a.skel} style={{ width: "60%" }} /></div>
        ) : rows.length === 0 ? (
          <div className={a.card} style={{ padding: 20 }}><strong>Nothing here</strong><p className={a.muted}>No campaigns in this list.</p></div>
        ) : (
          <div className={a.card} style={{ overflowX: "auto" }}>
            <table className={a.table}>
              <thead><tr><th>Campaign</th><th>Category</th><th className={a.num}>Target</th><th>Submitted</th><th>State</th><th>Changes</th><th></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.title || "Untitled"}</strong><div className={`${a.muted} ${a.small}`}>{r.organiserName}</div></td>
                    <td>{r.category ? CATEGORY_LABEL[r.category] : "—"}</td>
                    <td className={a.num}>{formatINR(r.targetAmount)}</td>
                    <td>{formatDate(r.submittedAt)}</td>
                    <td><CampaignChip status={r.status} /></td>
                    <td className={a.small}>{r.hasMaterialChanges ? "Differs from application" : "None"}</td>
                    <td><Link href={`/admin/fundraising/campaigns/${r.id}`} className={`${a.btn} ${r.status === "PUBLICATION_REVIEW" ? a.bp : a.bs}`}>Review</Link></td>
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
