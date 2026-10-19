"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "@/components/AppLink";
import { FEATURES } from "@/lib/features";
import { fundraisers, type FundraiserDetail } from "@/lib/api";
import { CATEGORY_LABEL, Icon, formatDate, formatINR } from "@/features/fundraising/ui";
import s from "@/features/fundraising/fundraising.module.css";

/** F22 — public campaign page, Live (canvas F22-Campaign-Live.dc.html). */
export default function FundraiserPage() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<FundraiserDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (FEATURES.fundraising) fundraisers.detail(Number(id)).then(setD).catch(() => setMissing(true)); }, [id]);

  if (!FEATURES.fundraising || missing) {
    return (
      <div className={`${s.root} ${s.publicTheme}`}><main className={s.wrap} style={{ paddingTop: 64, display: "flex", flexDirection: "column", gap: 8 }}>
        <h1 className={s.serif} style={{ fontSize: 28 }}>This fundraiser isn&apos;t available</h1>
        <Link href="/fundraisers">See other fundraisers</Link>
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
            <Link href="/fundraisers" className={s.small} style={{ textDecoration: "none" }}>← All fundraisers</Link>
            <h1 className={s.serif} style={{ fontSize: 40, lineHeight: 1.12 }}>{c.title}</h1>
            <p className={s.muted}>
              {c.organiser ? <>Organised by <strong style={{ color: "#1f140c" }}>{c.organiser}</strong></> : "Organiser not shown"}
              {d.beneficiary ? ` for ${d.beneficiary}` : ""}{c.location ? ` · ${c.location}` : ""}{c.category ? ` · ${CATEGORY_LABEL[c.category]}` : ""}
            </p>
          </div>
          {c.coverUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={c.coverUrl} alt={c.coverAltText ?? ""} style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 12 }} />
            : <div style={{ aspectRatio: "16 / 9", borderRadius: 12, background: "#e4dbd0" }} />}

          <section style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="st">
            <h2 id="st" className={s.serif} style={{ fontSize: 22 }}>{d.beneficiary ? `${d.beneficiary}'s story` : "The story"}</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>{d.story}</p>
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="cb">
            <h2 id="cb" className={s.serif} style={{ fontSize: 22 }}>Where the money goes</h2>
            <table className={s.tabular} style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
              <tbody>
                {d.costs.map((r, i) => <tr key={i}><td style={{ padding: "10px 0", borderBottom: "1px solid #efe7de" }}>{r.expense}</td><td style={{ textAlign: "right", borderBottom: "1px solid #efe7de" }}>{formatINR(r.amount)}</td></tr>)}
                {d.otherHelp > 0 && <tr><td className={s.muted} style={{ padding: "10px 0", borderBottom: "1px solid #efe7de" }}>Covered by insurance and family</td><td className={s.muted} style={{ textAlign: "right", borderBottom: "1px solid #efe7de" }}>− {formatINR(d.otherHelp)}</td></tr>}
                <tr><td style={{ padding: "10px 0" }}><strong>Raising</strong></td><td style={{ textAlign: "right" }}><strong>{formatINR(c.target)}</strong></td></tr>
              </tbody>
            </table>
          </section>

          <section className={s.card} style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 8 }} aria-labelledby="vc">
            <h2 id="vc" style={{ fontSize: 17, fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}><span style={{ color: "#1d5b3a" }}><Icon name="check" /></span>What CauseKind checked</h2>
            <p className={s.small}>Our team reviewed the organiser&apos;s identity and the documents behind this need, and checked this page against them before it went live. A review is not a guarantee.</p>
          </section>

          {d.outcome && (
            <section className={s.card} style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 10, borderColor: "#bcd9c6" }} aria-labelledby="oc">
              <h2 id="oc" className={s.serif} style={{ fontSize: 22 }}>Outcome</h2>
              {d.outcome.publishedAt && <p className={`${s.small} ${s.muted}`}>Published {formatDate(d.outcome.publishedAt)} · reviewed by CauseKind</p>}
              <div><strong className={s.small}>What the money paid for</strong><p style={{ whiteSpace: "pre-wrap" }}>{d.outcome.moneyUsed}</p></div>
              <div><strong className={s.small}>How things are now</strong><p style={{ whiteSpace: "pre-wrap" }}>{d.outcome.currentSituation}</p></div>
              {d.outcome.evidence.length > 0 && (
                <ul className={s.small} style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  {d.outcome.evidence.map((e, i) => <li key={i}><strong>{e.label}</strong> · {e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer">View receipt</a> : <span className={s.muted}>{e.explanation}</span>}</li>)}
                </ul>
              )}
            </section>
          )}

          {d.updates.length > 0 && (
            <section style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="up">
              <h2 id="up" className={s.serif} style={{ fontSize: 22 }}>Updates</h2>
              {d.updates.map((u) => (
                <article key={u.id} className={s.card} style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <p className={`${s.small} ${s.muted}`}>{formatDate(u.decidedAt ?? u.createdAt)}</p>
                  <strong>{u.title}</strong>
                  <p style={{ whiteSpace: "pre-wrap" }}>{u.body}</p>
                </article>
              ))}
            </section>
          )}

          <section style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="sp">
            <h2 id="sp" className={s.serif} style={{ fontSize: 22 }}>Supporters</h2>
            {d.supporters.length === 0 ? <p className={`${s.small} ${s.muted}`}>Be the first to support this fundraiser.</p> : (
              <ul style={{ listStyle: "none", padding: 0 }} className={s.small}>
                {d.supporters.map((p, i) => <li key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #efe7de" }}><span>{p.name}</span><span className={s.muted}>{formatDate(p.at)}</span></li>)}
              </ul>
            )}
            <p className={`${s.small} ${s.muted}`}>Only supporters who chose to show their name are named. Amounts are not shown here.</p>
          </section>
        </article>

        <aside className={s.card} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }} aria-label="Donate">
          <span className={`${s.chip} ${d.acceptingDonations ? s.cOk : d.status === "PAUSED" ? s.cW : s.cM}`} style={{ alignSelf: "flex-start" }}>{d.acceptingDonations ? "Live" : d.status === "PAUSED" ? "Paused" : d.outcome ? "Outcome published" : "Collections closed"}</span>
          {d.status === "PAUSED" && <p className={s.small} role="status" style={{ padding: "10px 12px", borderRadius: 8, background: "#fdf3e1" }}>{d.pauseNotice || "Donations are paused while we review some information."}</p>}
          <p className={s.tabular}><strong style={{ fontSize: 30 }}>{formatINR(c.raised)}</strong><br /><span className={s.muted}>confirmed of {formatINR(c.target)} target</span></p>
          <div className={s.prog} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% of target`}><span style={{ width: `${pct}%` }} /></div>
          <p className={`${s.small} ${s.muted}`}>{c.donationCount} donation{c.donationCount === 1 ? "" : "s"}{c.endDate ? ` · ends ${formatDate(c.endDate)}` : ""}</p>
          {d.acceptingDonations
            ? <Link href={`/fundraisers/${c.id}/donate`} className={`${s.btn} ${s.bp}`} style={{ minHeight: 52, fontSize: 17 }}>Donate</Link>
            : <div aria-disabled="true" className={s.btn} style={{ background: "#e3ddd6", color: "#4a3f37" }}>{d.status === "PAUSED" ? "Donations paused" : "No longer accepting donations"}</div>}
          <button type="button" className={`${s.btn} ${s.bs}`} onClick={share}>{copied ? "Link copied" : "Share"}</button>
          <div className={s.small} style={{ padding: "12px 14px", border: "1px dashed #cfc3b6", borderRadius: 10 }}>
            <strong>Where your money goes</strong><br />
            <span className={s.muted}>Donations are received by Sahas Charitable Trust, which transfers them to the beneficiary. CauseKind keeps {d.platformFeePercent}% to run the platform. <strong>Donations are not refundable</strong> and do not get an 80G tax receipt.</span>
          </div>
          <p className={`${s.small} ${s.muted}`}>The total counts only payments our server has confirmed.</p>
          <Link href={`/fundraisers/${c.id}/report`} className={s.small} style={{ alignSelf: "flex-start" }}>Report this fundraiser</Link>
        </aside>
      </main>
    </div>
  );
}
