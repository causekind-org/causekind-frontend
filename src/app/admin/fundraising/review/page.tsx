"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "@/components/AppLink";
import { FEATURES } from "@/lib/features";
import {
  fundraisingManage, type FundraiserClosure, type FundraiserRevision, type FundraiserUpdate,
  type ReviewItemKind, type ReviewItemRow,
} from "@/lib/api";
import { formatDate, formatINR } from "@/features/fundraising/ui";
import a from "@/features/fundraising/admin.module.css";

const KIND: Record<ReviewItemKind, { label: string; bg: string; fg: string }> = {
  UPDATE: { label: "Update", bg: "#eaf0f8", fg: "#1e3a60" },
  REVISION: { label: "Revision", bg: "#fdf3e1", fg: "#7a4a00" },
  CLOSURE: { label: "Closure", bg: "#f1ece6", fg: "#5c4f45" },
};
type Item = { kind: "UPDATE"; v: FundraiserUpdate } | { kind: "REVISION"; v: FundraiserRevision } | { kind: "CLOSURE"; v: FundraiserClosure };

/** F32 — admin review of organiser updates, page changes and closure requests. */
export default function AdminFundraisingReviewPage() {
  const [rows, setRows] = useState<ReviewItemRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [sel, setSel] = useState<ReviewItemRow | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    fundraisingManage.admin.queue().then((r) => { setRows(r); setSel((cur) => r.find((x) => cur && x.kind === cur.kind && x.id === cur.id) ?? r[0] ?? null); }).catch(() => setFailed(true));
  }, []);
  useEffect(() => { if (FEATURES.fundraising) load(); }, [load]);

  if (!FEATURES.fundraising) return <div className={a.root}><main className={a.wrap} style={{ paddingTop: 40 }}><p className={a.muted}>Fundraising is switched off.</p></main></div>;

  return (
    <div className={a.root}>
      <main style={{ padding: "20px 28px 48px", display: "flex", flexDirection: "column", gap: 18 }}>
        <nav className={a.switch} aria-label="Fundraising review">
          <Link href="/admin/fundraising" className={a.switchBtn}>Applications</Link>
          <Link href="/admin/fundraising/campaigns" className={a.switchBtn}>Publication review</Link>
          <span className={`${a.switchBtn} ${a.switchOn}`} aria-current="page">Updates &amp; changes</span>
          <Link href="/admin/fundraising/reports" className={a.switchBtn}>Reports</Link>
        </nav>
        {failed ? (
          <div className={a.card} role="alert" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start", borderColor: "#e9b8b3" }}>
            <strong className={a.err}>Couldn&apos;t load the review queue</strong><button type="button" className={`${a.btn} ${a.bs}`} onClick={load}>Retry</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0, 1fr) 340px", gap: 18, alignItems: "start" }}>
            <section className={a.card} style={{ overflow: "hidden" }} aria-labelledby="qq">
              <div style={{ padding: "12px 14px" }}><h2 id="qq" className={a.h}>Waiting for review</h2></div>
              {rows === null ? <div style={{ padding: 14 }}><div className={a.skel} /></div>
                : rows.length === 0 ? <p className={`${a.small} ${a.muted}`} style={{ padding: "12px 14px", borderTop: "1px solid #efe9e2" }}>Nothing waiting.</p>
                : rows.map((r) => {
                  const on = sel?.kind === r.kind && sel.id === r.id;
                  return (
                    <button key={`${r.kind}${r.id}`} type="button" aria-current={on ? "true" : undefined} onClick={() => setSel(r)}
                      style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 14px", borderTop: "1px solid #efe9e2", width: "100%", textAlign: "left", font: "inherit", color: "inherit", border: 0, borderTopStyle: "solid", borderTopWidth: 1, borderTopColor: "#efe9e2", cursor: "pointer", background: on ? "#fdf6f1" : "#fff", boxShadow: on ? "inset 3px 0 0 #b04a15" : "none" }}>
                      <span className={a.small} style={{ background: KIND[r.kind].bg, color: KIND[r.kind].fg, borderRadius: 999, padding: "3px 10px", fontWeight: 600 }}>{KIND[r.kind].label}</span>
                      <span style={{ flex: 1 }}><strong>{r.campaignTitle || "Untitled"}</strong><br /><span className={`${a.small} ${a.muted}`}>{r.organiser}{r.kind === "REVISION" && r.material ? " · Material change" : ""} · {formatDate(r.submittedAt)}</span></span>
                    </button>
                  );
                })}
            </section>
            {sel ? <Review key={`${sel.kind}${sel.id}`} row={sel} onDecided={load} /> : <section className={a.card} style={{ padding: 22 }}><p className={a.muted}>Pick an item to review.</p></section>}
          </div>
        )}
      </main>
    </div>
  );
}

function Review({ row, onDecided }: { row: ReviewItemRow; onDecided: () => void }) {
  const [item, setItem] = useState<Item | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const m = fundraisingManage.admin;
    const p: Promise<Item> = row.kind === "UPDATE" ? m.update(row.id).then((v) => ({ kind: "UPDATE", v }))
      : row.kind === "REVISION" ? m.revision(row.id).then((v) => ({ kind: "REVISION", v }))
      : m.closure(row.id).then((v) => ({ kind: "CLOSURE", v }));
    p.then(setItem).catch(() => setErr("Couldn't load this item"));
  }, [row]);

  const decide = async (d: "APPROVED" | "CHANGES_REQUESTED" | "DECLINED") => {
    if (!item) return;
    if (d !== "APPROVED" && !msg.trim()) { setErr("Tell the organiser why."); return; }
    setBusy(true); setErr(null);
    try { await fundraisingManage.admin.decide(row.kind, row.id, d, { expectedVersion: item.v.version, message: msg.trim() || undefined }); onDecided(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong"); setBusy(false); }
  };

  const title = row.kind === "UPDATE" ? `Update: ${item?.kind === "UPDATE" ? item.v.title ?? "" : ""}` : row.kind === "REVISION" ? "Page revision" : "Closure request";

  return (
    <>
      <section className={a.card} style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }} aria-labelledby="it">
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <h1 id="it" className={a.serif} style={{ fontSize: 22 }}>{title}</h1>
          <span className={a.small} style={{ background: "#eaf0f8", color: "#1e3a60", borderRadius: 999, padding: "3px 10px", fontWeight: 600 }}>Submitted</span>
        </div>
        <p className={`${a.small} ${a.muted}`}>{row.campaignTitle} · {row.organiser} · {formatDate(row.submittedAt)} · <Link href={`/fundraisers/${row.campaignId}`}>Public page</Link></p>
        {!item ? <div className={a.skel} /> : item.kind === "UPDATE" ? (
          <>
            <div style={{ padding: 16, border: "1px solid #e4ddd5", borderRadius: 8, background: "#fbf9f6", display: "flex", flexDirection: "column", gap: 8 }}>
              <p className={a.h}>Exactly as donors will see it</p><strong>{item.v.title}</strong><p style={{ whiteSpace: "pre-wrap" }}>{item.v.body}</p>
            </div>
            <p className={a.small}><strong>Checks:</strong> no personal contact details · no unconsented names · no new amounts or claims.</p>
          </>
        ) : item.kind === "REVISION" ? (
          <>
            <table className={a.table}>
              <thead><tr><th>Field</th><th>Live now</th><th>Proposed</th></tr></thead>
              <tbody>
                <Row label="Title" from={item.v.currentTitle} to={item.v.title} />
                <Row label="Target" from={formatINR(item.v.currentTarget)} to={item.v.targetAmount != null ? formatINR(item.v.targetAmount) : null} material />
                <Row label="End date" from={formatDate(item.v.currentEndDate)} to={item.v.endDate ? formatDate(item.v.endDate) : null} material />
                <Row label="Story" from={item.v.story ? "Current story" : null} to={item.v.story ? "Rewritten (below)" : null} />
              </tbody>
            </table>
            {item.v.story && <div style={{ padding: 16, border: "1px solid #e4ddd5", borderRadius: 8, background: "#fbf9f6" }}><p className={a.h} style={{ marginBottom: 6 }}>Proposed story</p><p style={{ whiteSpace: "pre-wrap" }}>{item.v.story}</p></div>}
            {item.v.changeReason && <p className={a.small}><strong>Organiser&apos;s reason:</strong> {item.v.changeReason}</p>}
            <p className={`${a.small} ${a.muted}`}>Raised so far: {formatINR(item.v.raised)}. Approving applies these changes to the live page straight away.</p>
          </>
        ) : (
          <>
            <p className={a.small}><strong>Reason:</strong> &quot;{item.v.reason}&quot;</p>
            <p className={`${a.small} ${a.muted}`}>Approve → Collections closed: donations stop, the public page stays visible. Decline → stays Live; the organiser sees your reason. Donations are not refundable either way.</p>
          </>
        )}
      </section>
      <section className={a.card} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="dc">
        <h2 id="dc" className={a.h}>Decision</h2>
        <label className={a.lbl} htmlFor="msg">Message to organiser <span className={a.muted} style={{ fontWeight: 500 }}>(required unless approving)</span></label>
        <textarea id="msg" className={a.in} rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} />
        {err && <p className={a.err} role="alert">{err}</p>}
        <button type="button" className={`${a.btn} ${a.bp}`} disabled={busy || !item} onClick={() => decide("APPROVED")}>
          {row.kind === "UPDATE" ? "Approve and publish" : row.kind === "REVISION" ? "Approve and apply" : "Approve closure"}
        </button>
        {row.kind !== "CLOSURE" && <button type="button" className={`${a.btn} ${a.bs}`} disabled={busy || !item} onClick={() => decide("CHANGES_REQUESTED")}>Request changes</button>}
        <button type="button" className={`${a.btn} ${a.bs}`} style={{ color: "#8f1d1d" }} disabled={busy || !item} onClick={() => decide("DECLINED")}>Decline</button>
        <p className={`${a.small} ${a.muted}`}>{row.kind === "CLOSURE" ? "Closure requests have Approve / Decline only." : "Approve publishes it. Request changes sends it back to the organiser."}</p>
      </section>
    </>
  );
}

function Row({ label, from, to, material }: { label: string; from: string | null; to: string | null; material?: boolean }) {
  return (
    <tr>
      <td><strong>{label}</strong></td>
      <td className={a.small}>{from ?? "—"}</td>
      <td className={a.small}>{to == null ? <span className={a.muted}>unchanged</span> : <><mark style={{ background: "#e6f2ea", color: "#1d5b3a", padding: "0 2px" }}>{to}</mark>{material && <span style={{ marginLeft: 6, background: "#fdf3e1", color: "#7a4a00", borderRadius: 999, padding: "2px 8px", fontWeight: 600 }}>Material</span>}</>}</td>
    </tr>
  );
}
