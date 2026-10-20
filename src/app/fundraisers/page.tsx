"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "@/components/AppLink";
import { FEATURES } from "@/lib/features";
import { fundraisers, type FundraiserCard, type FundraisingCategory } from "@/lib/api";
import { CATEGORY_LABEL, formatDate, formatINR } from "@/features/fundraising/ui";
import s from "@/features/fundraising/fundraising.module.css";

const CATS: (FundraisingCategory | undefined)[] = [undefined, "MEDICAL", "EDUCATION", "EMERGENCY_HOUSEHOLD", "OTHER"];

/** F21 — fundraiser discovery (canvas F21-Discovery.dc.html). */
export default function FundraisersPage() {
  const [cat, setCat] = useState<FundraisingCategory | undefined>(undefined);
  const [cards, setCards] = useState<FundraiserCard[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    setCards(null); setFailed(false);
    fundraisers.live(cat).then(setCards).catch(() => setFailed(true));
  }, [cat]);
  useEffect(() => { if (FEATURES.fundraising) load(); }, [load]);

  if (!FEATURES.fundraising) {
    return <div className={`${s.root} ${s.publicTheme}`}><main className={s.wrap} style={{ paddingTop: 64 }}><h1 className={s.serif} style={{ fontSize: 28 }}>Fundraisers aren&apos;t available yet</h1></main></div>;
  }

  const term = q.trim().toLowerCase();
  const shown = (cards ?? []).filter((c) => !term || (c.title ?? "").toLowerCase().includes(term) || (c.location ?? "").toLowerCase().includes(term));

  return (
    <div className={`${s.root} ${s.publicTheme}`}>
      <main className={s.wrap} style={{ paddingTop: 40, paddingBottom: 72, display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 720 }}>
          <h1 className={s.serif} style={{ fontSize: 40, lineHeight: 1.1 }}>Fundraisers</h1>
          <p className={s.muted}>Money raised for a specific person&apos;s need. Each one was reviewed by our team before it went public. Looking to give items instead? <Link href="/requests">Donate items</Link></p>
          <p className={s.small} style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Link href="/fundraisers/my-donations">Your fundraiser donations</Link>
            <Link href="/fundraisers/reports">Your reports</Link>
          </p>
        </div>
        <label style={{ display: "flex" }}>
          <span style={{ position: "absolute", left: -9999 }}>Search fundraisers</span>
          <input className={s.in} placeholder="Search by title or city" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <nav aria-label="Category" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CATS.map((c) => {
            const on = c === cat;
            return (
              <button key={c ?? "all"} type="button" aria-pressed={on} onClick={() => setCat(c)}
                style={{ minHeight: 40, padding: "0 16px", borderRadius: 999, fontWeight: 600, fontSize: 14, cursor: "pointer", font: "inherit",
                  border: on ? "1px solid #1f140c" : "1px solid #cfc3b6", background: on ? "#1f140c" : "#fff", color: on ? "#fff" : "#1f140c" }}>
                {c ? CATEGORY_LABEL[c] : "All"}
              </button>
            );
          })}
        </nav>

        {failed ? (
          <div className={s.card} role="alert" style={{ padding: 16, borderColor: "#e9b8b3", display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
            <strong style={{ color: "#8f1d1d" }}>Couldn&apos;t load fundraisers</strong><p className={`${s.small} ${s.muted}`}>Check your connection.</p>
            <button type="button" className={`${s.btn} ${s.bs}`} onClick={load}>Try again</button>
          </div>
        ) : cards === null ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }} aria-busy="true">
            {[0, 1, 2].map((i) => <div key={i} className={s.card} style={{ height: 320, background: "#f3eee8" }} />)}
          </div>
        ) : shown.length === 0 ? (
          <div className={s.card} style={{ padding: 16 }}>
            <strong className={s.small}>{cards.length === 0 ? "No fundraisers yet" : "No matches"}</strong>
            <p className={`${s.small} ${s.muted}`}>{cards.length === 0 ? "There are no live fundraisers right now. You can still donate items." : `Nothing matches "${q}".`}</p>
            {cards.length === 0 ? <Link href="/requests" className={s.small}>Donate items</Link> : <button type="button" className={`${s.btn} ${s.bq}`} onClick={() => setQ("")}>Clear search</button>}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {shown.map((c) => {
              const pct = c.target ? Math.min(100, Math.round((c.raised / c.target) * 100)) : 0;
              return (
                <Link key={c.id} href={`/fundraisers/${c.id}`} className={s.card} style={{ display: "flex", flexDirection: "column", overflow: "hidden", textDecoration: "none", color: "inherit" }}>
                  {c.coverUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={c.coverUrl} alt={c.coverAltText ?? ""} style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover" }} />
                    : <div style={{ aspectRatio: "16 / 9", background: "#e4dbd0" }} />}
                  <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    <span className={`${s.chip} ${s.cM}`} style={{ alignSelf: "flex-start" }}>{c.category ? CATEGORY_LABEL[c.category] : "Fundraiser"}{c.location ? ` · ${c.location}` : ""}</span>
                    <h2 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3, color: "#1f140c" }}>{c.title}</h2>
                    {c.organiser && <p className={`${s.small} ${s.muted}`}>By {c.organiser}</p>}
                    <div className={s.prog} aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
                    <p className={`${s.small} ${s.tabular}`} style={{ color: "#1f140c" }}><strong>{formatINR(c.raised)}</strong> confirmed of {formatINR(c.target)}</p>
                    {c.endDate && <p className={`${s.small} ${s.muted}`}>Ends {formatDate(c.endDate)}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        <p className={`${s.muted} ${s.small}`}>Totals on cards count only payments our server has confirmed. No featured or paid placement.</p>
      </main>
    </div>
  );
}
