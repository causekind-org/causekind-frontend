"use client";
import { useTranslations } from "next-intl";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "@/components/AppLink";
import { FEATURES } from "@/lib/features";
import { fundraisers, type FundraiserDetail } from "@/lib/api";
import { useFundraisingLabels, Icon, formatINR } from "@/features/fundraising/ui";
import s from "@/features/fundraising/fundraising.module.css";

import { UiText, useUiText } from "@/components/UiText";
/** F22 — public campaign page, Live (canvas F22-Campaign-Live.dc.html). */
export default function FundraiserPage() {
  const fmt = useFundraisingLabels();
  const ui = useUiText();
  const docLabel = (type: string): string => ({
    MEDICAL_REPORT: ui("Medical report"), TREATMENT_ESTIMATE: ui("Treatment estimate"),
    ENROLMENT_PROOF: ui("Admission or enrolment letter"), FEE_STATEMENT: ui("Fee demand"),
    EVENT_EVIDENCE: ui("Proof of what happened"), COST_PROOF: ui("Cost proof"), OTHER: ui("Supporting document"),
  } as Record<string, string>)[type] ?? ui("Document");
  const t = useTranslations("fundraiserFlow");
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<FundraiserDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (FEATURES.fundraising) fundraisers.detail(Number(id)).then(setD).catch(() => setMissing(true)); }, [id]);

  if (!FEATURES.fundraising || missing) {
    return (
      <div className={`${s.root} ${s.publicTheme}`}><main className={s.wrap} style={{ paddingTop: 64, display: "flex", flexDirection: "column", gap: 8 }}>
        <h1 className={s.serif} style={{ fontSize: 28 }}><UiText>This fundraiser isn&apos;t available</UiText></h1>
        <Link href="/fundraisers"><UiText>See other fundraisers</UiText></Link>
      </main></div>
    );
  }
  if (!d) return <div className={`${s.root} ${s.publicTheme}`} aria-busy="true" />;

  const c = d.card;
  const pct = c.target ? Math.min(100, Math.round((c.raised / c.target) * 100)) : 0;
  async function share() {
    const url = window.location.href;
    if (navigator.share) { navigator.share({ title: c.title ?? "Fundraiser", url }).catch(() => {}); return; }
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
  }

  return (
    <div className={`${s.root} ${s.publicTheme}`} style={{ fontSize: 16, lineHeight: 1.6 }}>
      <main className={s.wrap} style={{ paddingTop: 32, paddingBottom: 72, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(280px,380px)", gap: 40, alignItems: "start", maxWidth: 1180 }}>
        <article style={{ display: "flex", flexDirection: "column", gap: 28, minWidth: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link href="/fundraisers" className={s.small} style={{ textDecoration: "none" }}><UiText>← All fundraisers</UiText></Link>
            <h1 className={s.serif} style={{ fontSize: 40, lineHeight: 1.12 }}>{c.title}</h1>
            <p className={s.muted}>
              {c.organiser ? t.rich("organisedByRich", { organiser: c.organiser, strong: (chunks) => <strong style={{ color: "#1f140c" }}>{chunks}</strong> }) : ui("Organiser not shown")}
              {d.beneficiary ? t("forBeneficiary", { name: d.beneficiary }) : ""}{c.location ? ` · ${c.location}` : ""}{c.category ? ` · ${fmt.category(c.category)}` : ""}
            </p>
          </div>
          {c.coverUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={c.coverUrl} alt={c.coverAltText ?? ""} style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 12 }} />
            : <div style={{ aspectRatio: "16 / 9", borderRadius: 12, background: "#e4dbd0" }} />}

          <section style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="st">
            <h2 id="st" className={s.serif} style={{ fontSize: 22 }}>{d.beneficiary ? t("storyOf", { name: d.beneficiary }) : ui("The story")}</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>{d.story}</p>
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="cb">
            <h2 id="cb" className={s.serif} style={{ fontSize: 22 }}><UiText>Where the money goes</UiText></h2>
            <table className={s.tabular} style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
              <tbody>
                {d.costs.map((r, i) => <tr key={i}><td style={{ padding: "10px 0", borderBottom: "1px solid #efe7de" }}>{r.expense}</td><td style={{ textAlign: "right", borderBottom: "1px solid #efe7de" }}>{formatINR(r.amount)}</td></tr>)}
                <tr><td style={{ padding: "10px 0" }}><strong><UiText>Raising</UiText></strong></td><td style={{ textAlign: "right" }}><strong>{formatINR(c.target)}</strong></td></tr>
              </tbody>
            </table>
          </section>

          {(d.documents ?? []).length > 0 && (
            <section style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="dc">
              <h2 id="dc" className={s.serif} style={{ fontSize: 22 }}><UiText>Documents</UiText></h2>
              <p className={`${s.muted} ${s.small}`}><UiText>The documents behind this need, as sent to our team. Identity and family documents stay private.</UiText></p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {d.documents.map((doc, i) => (
                  <li key={i} className={s.card} style={{ padding: "12px 14px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ color: "#6b5d52" }} aria-hidden="true"><Icon name="file" /></span>
                    <div style={{ flex: "1 1 200px", minWidth: 0 }}><strong>{docLabel(doc.type)}</strong>{doc.fileName && <div className={`${s.muted} ${s.small}`} style={{ overflowWrap: "anywhere" }}>{doc.fileName}</div>}</div>
                    <a className={`${s.btn} ${s.bs}`} href={doc.url} target="_blank" rel="noreferrer"><UiText>View</UiText></a>
                  </li>
                ))}
              </ul>
              <p className={`${s.muted} ${s.small}`}><UiText>If a document doesn&apos;t open, reload this page.</UiText></p>
            </section>
          )}

          <section className={s.card} style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 8 }} aria-labelledby="vc">
            <h2 id="vc" style={{ fontSize: 17, fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}><span style={{ color: "#1d5b3a" }}><Icon name="check" /></span><UiText>What CauseKind checked</UiText></h2>
            <p className={s.small}><UiText>Our team reviewed the organiser&apos;s identity and the documents behind this need, and checked this page against them before it went live. A review is not a guarantee.</UiText></p>
          </section>

          {d.outcome && (
            <section className={s.card} style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 10, borderColor: "#bcd9c6" }} aria-labelledby="oc">
              <h2 id="oc" className={s.serif} style={{ fontSize: 22 }}><UiText>Outcome</UiText></h2>
              {d.outcome.publishedAt && <p className={`${s.small} ${s.muted}`}>{t("publishedReviewed", { date: fmt.date(d.outcome.publishedAt) })}</p>}
              <div><strong className={s.small}><UiText>What the money paid for</UiText></strong><p style={{ whiteSpace: "pre-wrap" }}>{d.outcome.moneyUsed}</p></div>
              <div><strong className={s.small}><UiText>How things are now</UiText></strong><p style={{ whiteSpace: "pre-wrap" }}>{d.outcome.currentSituation}</p></div>
              {d.outcome.evidence.length > 0 && (
                <ul className={s.small} style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  {d.outcome.evidence.map((e, i) => <li key={i}><strong>{e.label}</strong> · {e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer"><UiText>View receipt</UiText></a> : <span className={s.muted}>{e.explanation}</span>}</li>)}
                </ul>
              )}
            </section>
          )}

          {d.updates.length > 0 && (
            <section style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="up">
              <h2 id="up" className={s.serif} style={{ fontSize: 22 }}><UiText>Updates</UiText></h2>
              {d.updates.map((u) => (
                <article key={u.id} className={s.card} style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <p className={`${s.small} ${s.muted}`}>{fmt.date(u.decidedAt ?? u.createdAt)}</p>
                  <strong>{u.title}</strong>
                  <p style={{ whiteSpace: "pre-wrap" }}>{u.body}</p>
                </article>
              ))}
            </section>
          )}

          <section style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="sp">
            <h2 id="sp" className={s.serif} style={{ fontSize: 22 }}><UiText>Supporters</UiText></h2>
            {d.supporters.length === 0 ? <p className={`${s.small} ${s.muted}`}><UiText>Be the first to support this fundraiser.</UiText></p> : (
              <ul style={{ listStyle: "none", padding: 0 }} className={s.small}>
                {d.supporters.map((p, i) => <li key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #efe7de" }}><span>{p.name}</span><span className={s.muted}>{fmt.date(p.at)}</span></li>)}
              </ul>
            )}
            <p className={`${s.small} ${s.muted}`}><UiText>Only supporters who chose to show their name are named. Amounts are not shown here.</UiText></p>
          </section>
        </article>

        <aside className={s.card} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }} aria-label={ui("Donate")}>
          <span className={`${s.chip} ${d.acceptingDonations ? s.cOk : d.status === "PAUSED" ? s.cW : s.cM}`} style={{ alignSelf: "flex-start" }}>{d.acceptingDonations ? ui("Live", "campaign status") : d.status === "PAUSED" ? ui("Paused", "campaign status") : d.outcome ? ui("Outcome published", "campaign status") : ui("Collections closed", "campaign status")}</span>
          {d.status === "PAUSED" && <p className={s.small} role="status" style={{ padding: "10px 12px", borderRadius: 8, background: "#fdf3e1" }}>{d.pauseNotice || ui("Donations are paused while we review some information.")}</p>}
          <p className={s.tabular}><strong style={{ fontSize: 30 }}>{formatINR(c.raised)}</strong><br /><span className={s.muted}>{t("confirmedOfTarget", { target: formatINR(c.target) })}</span></p>
          <div className={s.prog} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("pctOfTarget", { pct })}><span style={{ width: `${pct}%` }} /></div>
          <p className={`${s.small} ${s.muted}`}>{t("donationCount", { count: c.donationCount })}{c.endDate ? ` · ${t("endsOnLower", { date: fmt.date(c.endDate) })}` : ""}</p>
          {d.acceptingDonations
            ? <Link href={`/fundraisers/${c.id}/donate`} className={`${s.btn} ${s.bp}`} style={{ minHeight: 52, fontSize: 17 }}><UiText>Donate</UiText></Link>
            : <div aria-disabled="true" className={s.btn} style={{ background: "#e3ddd6", color: "#4a3f37" }}>{d.status === "PAUSED" ? ui("Donations paused") : ui("No longer accepting donations")}</div>}
          <button type="button" className={`${s.btn} ${s.bs}`} onClick={share}>{copied ? ui("Link copied") : ui("Share")}</button>
          <div className={s.small} style={{ padding: "12px 14px", border: "1px dashed #cfc3b6", borderRadius: 10 }}>
            <strong><UiText>Where your money goes</UiText></strong><br />
            <span className={s.muted}>{t.rich("trustNotice", { pct: d.platformFeePercent, strong: (chunks) => <strong>{chunks}</strong> })}</span>
          </div>
          <p className={`${s.small} ${s.muted}`}><UiText>The total counts only payments our server has confirmed.</UiText></p>
          <Link href={`/fundraisers/${c.id}/report`} className={s.small} style={{ alignSelf: "flex-start" }}><UiText>Report this fundraiser</UiText></Link>
        </aside>
      </main>
    </div>
  );
}
