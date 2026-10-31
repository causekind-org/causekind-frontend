"use client";

import Link from "@/components/AppLink";
import type { FundraisingCampaign } from "@/lib/api";
import { useFundraisingLabels, Icon, CampaignChip } from "./ui";
import s from "./fundraising.module.css";

import { UiText, useUiText } from "@/components/UiText";
import { useTranslations } from "next-intl";
/** F18 — publication status: review, declined, approved — setup incomplete, cancelled (canvas F18-*). */
export function CampaignStatusView({ c }: { c: FundraisingCampaign }) {
  const fmt = useFundraisingLabels();
  const ui = useUiText();
  const t = useTranslations("fundraiserFlow");
  const ck = (tone: "ok" | "now" | "off", label: string, title: string, sub?: string) => (
    <div style={{ display: "flex", gap: 14, padding: "16px 0", borderTop: "1px solid #efe7de", alignItems: "flex-start" }}>
      <span className={`${s.chip} ${tone === "ok" ? s.cOk : tone === "now" ? s.cW : s.cM}`}>{label}</span>
      <div><strong>{title}</strong>{sub && <p className={`${s.small} ${s.muted}`}>{sub}</p>}</div>
    </div>
  );
  const title = c.title || ui("Untitled campaign");
  return (
    <main className={s.wrap} style={{ paddingTop: 40, paddingBottom: 72, display: "flex", flexDirection: "column", gap: 22, maxWidth: 900 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Link href="/fundraising" className={s.small} style={{ textDecoration: "none" }}><UiText>← Back to fundraisers</UiText></Link>
        <span style={{ alignSelf: "flex-start" }}><CampaignChip status={c.status} localize /></span>
        {c.status === "PUBLICATION_REVIEW" && <h1 className={s.serif} style={{ fontSize: 30 }}><UiText>Your fundraiser is being reviewed for publication.</UiText></h1>}
        {c.status === "APPROVED_SETUP_INCOMPLETE" && <h1 className={s.serif} style={{ fontSize: 30 }}><UiText>Your page is approved. One step left before it goes live.</UiText></h1>}
        {c.status === "PUBLICATION_DECLINED" && <h1 className={s.serif} style={{ fontSize: 30 }}><UiText>This page wasn&apos;t approved for publication</UiText></h1>}
        {c.status === "CANCELLED" && <h1 className={s.serif} style={{ fontSize: 30 }}><UiText>You cancelled this campaign draft</UiText></h1>}
        {c.status === "APPROVED" && <h1 className={s.serif} style={{ fontSize: 30 }}><UiText>Your fundraiser is live</UiText></h1>}
        {c.status === "APPROVED" && <p><Link href={`/fundraisers/${c.id}`}><UiText>Open the public page</UiText></Link> <UiText>to see it as donors do, and share the link.</UiText></p>}
        <p className={s.muted}>{title}{c.submittedAt ? ` · ${t("submittedOnLower", { date: fmt.date(c.submittedAt) })}` : ""}{c.decidedAt ? ` · ${t("decidedOnLower", { date: fmt.date(c.decidedAt) })}` : ""}</p>
      </div>

      {(c.status === "PUBLICATION_REVIEW" || c.status === "APPROVED_SETUP_INCOMPLETE") && (
        <div className={s.notice}>
          <Icon name="lock" />
          <p><strong><UiText>Not public yet.</UiText></strong> <UiText>Only you and CauseKind reviewers can see this page. No one can find it, share it or donate.</UiText></p>
        </div>
      )}

      {c.status === "PUBLICATION_DECLINED" && (
        <section className={s.card} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="why">
          <h2 id="why" style={{ fontSize: 16, fontWeight: 700 }}><UiText>Reason from the reviewer</UiText></h2>
          <p>{c.reviewerMessage}</p>
          <p className={`${s.small} ${s.muted}`}><UiText>Your application approval is unchanged. Whether you can revise and resubmit this page is still being decided.</UiText></p>
        </section>
      )}

      {c.status !== "CANCELLED" && c.status !== "PUBLICATION_DECLINED" && c.status !== "APPROVED" && (
        <section className={s.card} style={{ padding: "22px 24px" }} aria-labelledby="lc">
          <h2 id="lc" style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}><UiText>Launch checklist</UiText></h2>
          {ck("ok", ui("Done", "checklist"), ui("Application approved"), c.applicationReference ?? undefined)}
          {c.status === "PUBLICATION_REVIEW"
            ? ck("now", ui("Now", "checklist"), ui("Publication review", "campaign status"), ui("A reviewer is checking the page against your approved application."))
            : ck("ok", ui("Done", "checklist"), ui("Page content approved"), c.decidedAt ? t("publicationPassed", { date: fmt.date(c.decidedAt) }) : undefined)}
          {ck("off", ui("Not ready", "checklist"), ui("Payment setup"), ui("Requirements to be defined. When they are, the steps will appear here. You don't need to do anything yet."))}
        </section>
      )}

      {c.status === "APPROVED_SETUP_INCOMPLETE" && c.reviewerMessage && (
        <p className={s.small}><strong><UiText>Message from the reviewer:</UiText></strong> {c.reviewerMessage}</p>
      )}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}><Link href="/fundraising" className={`${s.btn} ${s.bs}`}><UiText>Back to dashboard</UiText></Link></div>
    </main>
  );
}
