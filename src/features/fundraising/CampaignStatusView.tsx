"use client";

import Link from "@/components/AppLink";
import type { FundraisingCampaign } from "@/lib/api";
import { CampaignChip, Icon, formatDate } from "./ui";
import s from "./fundraising.module.css";

/** F18 — publication status: review, declined, approved — setup incomplete, cancelled (canvas F18-*). */
export function CampaignStatusView({ c }: { c: FundraisingCampaign }) {
  const ck = (tone: "ok" | "now" | "off", label: string, title: string, sub?: string) => (
    <div style={{ display: "flex", gap: 14, padding: "16px 0", borderTop: "1px solid #efe7de", alignItems: "flex-start" }}>
      <span className={`${s.chip} ${tone === "ok" ? s.cOk : tone === "now" ? s.cW : s.cM}`}>{label}</span>
      <div><strong>{title}</strong>{sub && <p className={`${s.small} ${s.muted}`}>{sub}</p>}</div>
    </div>
  );
  const title = c.title || "Untitled campaign";
  return (
    <main className={s.wrap} style={{ paddingTop: 40, paddingBottom: 72, display: "flex", flexDirection: "column", gap: 22, maxWidth: 900 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Link href="/fundraising" className={s.small} style={{ textDecoration: "none" }}>← Back to fundraisers</Link>
        <span style={{ alignSelf: "flex-start" }}><CampaignChip status={c.status} /></span>
        {c.status === "PUBLICATION_REVIEW" && <h1 className={s.serif} style={{ fontSize: 30 }}>Your fundraiser is being reviewed for publication.</h1>}
        {c.status === "APPROVED_SETUP_INCOMPLETE" && <h1 className={s.serif} style={{ fontSize: 30 }}>Your page is approved. One step left before it goes live.</h1>}
        {c.status === "PUBLICATION_DECLINED" && <h1 className={s.serif} style={{ fontSize: 30 }}>This page wasn&apos;t approved for publication</h1>}
        {c.status === "CANCELLED" && <h1 className={s.serif} style={{ fontSize: 30 }}>You cancelled this campaign draft</h1>}
        <p className={s.muted}>{title}{c.submittedAt ? ` · submitted ${formatDate(c.submittedAt)}` : ""}{c.decidedAt ? ` · decided ${formatDate(c.decidedAt)}` : ""}</p>
      </div>

      {(c.status === "PUBLICATION_REVIEW" || c.status === "APPROVED_SETUP_INCOMPLETE") && (
        <div className={s.notice}>
          <Icon name="lock" />
          <p><strong>Not public yet.</strong> Only you and CauseKind reviewers can see this page. No one can find it, share it or donate.</p>
        </div>
      )}

      {c.status === "PUBLICATION_DECLINED" && (
        <section className={s.card} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="why">
          <h2 id="why" style={{ fontSize: 16, fontWeight: 700 }}>Reason from the reviewer</h2>
          <p>{c.reviewerMessage}</p>
          <p className={`${s.small} ${s.muted}`}>Your application approval is unchanged. Whether you can revise and resubmit this page is still being decided.</p>
        </section>
      )}

      {c.status !== "CANCELLED" && c.status !== "PUBLICATION_DECLINED" && (
        <section className={s.card} style={{ padding: "22px 24px" }} aria-labelledby="lc">
          <h2 id="lc" style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Launch checklist</h2>
          {ck("ok", "Done", "Application approved", c.applicationReference ?? undefined)}
          {c.status === "PUBLICATION_REVIEW"
            ? ck("now", "Now", "Publication review", "A reviewer is checking the page against your approved application.")
            : ck("ok", "Done", "Page content approved", c.decidedAt ? `Publication review passed ${formatDate(c.decidedAt)}` : undefined)}
          {ck("off", "Not ready", "Payment setup", "Requirements to be defined. When they are, the steps will appear here. You don't need to do anything yet.")}
        </section>
      )}

      {c.status === "APPROVED_SETUP_INCOMPLETE" && c.reviewerMessage && (
        <p className={s.small}><strong>Message from the reviewer:</strong> {c.reviewerMessage}</p>
      )}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}><Link href="/fundraising" className={`${s.btn} ${s.bs}`}>Back to dashboard</Link></div>
    </main>
  );
}
