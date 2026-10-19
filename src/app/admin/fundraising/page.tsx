"use client";

import { useCallback, useEffect, useState } from "react";
import { FrLink as Link } from "@/features/fundraising/adminLink";
import { FEATURES } from "@/lib/features";
import { fundraising, ApiError, type FundraisingQueueRow, type FundraisingStatus } from "@/lib/api";
import { CATEGORY_LABEL, StatusChip, formatDate, formatINR } from "@/features/fundraising/ui";
import a from "@/features/fundraising/admin.module.css";

const FILTERS: { label: string; status?: FundraisingStatus }[] = [
  { label: "Open" },
  { label: "Submitted", status: "SUBMITTED" },
  { label: "In review", status: "IN_REVIEW" },
  { label: "Information requested", status: "INFORMATION_REQUESTED" },
  { label: "Resubmitted", status: "RESUBMITTED" },
  { label: "Approved", status: "APPROVED" },
  { label: "Not approved", status: "NOT_APPROVED" },
  { label: "Withdrawn", status: "WITHDRAWN" },
];

/** F10 — Admin application queue (canvas F10-AdminQueue.dc.html). */
export default function AdminFundraisingQueuePage() {
  const [filter, setFilter] = useState(0);
  const [rows, setRows] = useState<FundraisingQueueRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [serverOff, setServerOff] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setRows(null); setFailed(false);
    fundraising.admin.queue(FILTERS[filter].status).then(setRows)
      .catch((e) => { setServerOff(e instanceof ApiError && e.status === 404); setFailed(true); });
  }, [filter]);
  useEffect(() => { if (FEATURES.fundraising) load(); }, [load]);

  if (!FEATURES.fundraising) {
    return <div className={a.root}><main className={a.wrap} style={{ paddingTop: 40 }}><p className={a.muted}>Fundraising is switched off (NEXT_PUBLIC_FUNDRAISING_ENABLED).</p></main></div>;
  }

  const q = search.trim().toLowerCase();
  const shown = (rows ?? []).filter((r) => !q || r.applicantName.toLowerCase().includes(q) || r.reference.toLowerCase().includes(q)
    || (r.category && CATEGORY_LABEL[r.category].toLowerCase().includes(q)));

  return (
    <div className={a.root}>
      <main className={a.wrap} style={{ paddingTop: 28, paddingBottom: 56, display: "flex", flexDirection: "column", gap: 18 }}>
        <nav className={a.switch} aria-label="Fundraising review"><span className={`${a.switchBtn} ${a.switchOn}`} aria-current="page">Applications</span><Link href="/admin/fundraising/campaigns" className={a.switchBtn}>Publication review</Link><Link href="/admin/fundraising/review" className={a.switchBtn}>Updates &amp; changes</Link><Link href="/admin/fundraising/reports" className={a.switchBtn}>Reports</Link></nav>
        <div><h1 className={a.serif} style={{ fontSize: 28 }}>Fundraising applications</h1><p className={a.muted}>Decide whether a donee can proceed with fundraising.</p></div>
        <nav className={a.tabs} aria-label="Filter by state">
          {FILTERS.map((f, i) => (
            <button key={f.label} type="button" className={`${a.tab} ${i === filter ? a.tabOn : ""}`} aria-pressed={i === filter} onClick={() => setFilter(i)}>{f.label}</button>
          ))}
        </nav>
        <label style={{ display: "flex" }}>
          <span style={{ position: "absolute", left: -9999 }}>Search applications</span>
          <input className={a.in} placeholder="Search name, reference or category" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>

        {failed ? (
          <div className={a.card} role="alert" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start", borderColor: "#e9b8b3" }}>
            {serverOff
              ? <><strong className={a.err}>Fundraising is switched off on the server</strong><p className={a.muted}>Set FUNDRAISING_ENABLED=true for the backend and restart it.</p></>
              : <><strong className={a.err}>Couldn&apos;t load applications</strong><p className={a.muted}>Your filters are kept. Try again.</p></>}
            <button type="button" className={`${a.btn} ${a.bs}`} onClick={load}>Retry</button>
          </div>
        ) : rows === null ? (
          <div className={a.card} aria-busy="true" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <div className={a.skel} style={{ width: "80%" }} /><div className={a.skel} style={{ width: "60%" }} /><div className={a.skel} style={{ width: "70%" }} />
          </div>
        ) : shown.length === 0 ? (
          <div className={a.card} style={{ padding: 20 }}>
            <strong>{q ? "No matches" : "Nothing here"}</strong>
            <p className={a.muted}>{q ? `No applications match "${search}".` : "No applications in this list."} {q && <button type="button" className={`${a.btn} ${a.bs}`} onClick={() => setSearch("")}>Clear search</button>}</p>
          </div>
        ) : (
          <div className={a.card} style={{ overflowX: "auto" }}>
            <table className={a.table}>
              <thead><tr><th>Applicant</th><th>Purpose</th><th className={a.num}>Requested</th><th>Submitted</th><th>State</th><th>Open questions</th><th></th></tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.applicantName}</strong><div className={`${a.muted} ${a.small}`}>{r.reference} · {r.forSelf ? "for self" : "for someone else"}</div></td>
                    <td>{r.category ? CATEGORY_LABEL[r.category] : "—"}</td>
                    <td className={a.num}>{formatINR(r.requestedAmount)}</td>
                    <td>{formatDate(r.submittedAt)}</td>
                    <td><StatusChip status={r.status} /></td>
                    <td className={a.small}>{r.openQuestions || "None"}</td>
                    <td><Link href={`/admin/fundraising/${r.id}`} className={`${a.btn} ${r.status === "SUBMITTED" || r.status === "RESUBMITTED" ? a.bp : a.bs}`}>Review</Link></td>
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
