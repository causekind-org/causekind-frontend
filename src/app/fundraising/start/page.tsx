"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/AppLink";
import { fundraising, type FundraisingApplication } from "@/lib/api";
import { DoneeGate } from "@/features/fundraising/DoneeGate";
import { Icon } from "@/features/fundraising/ui";
import s from "@/features/fundraising/fundraising.module.css";

/** F02 — Application introduction, new / returning (canvas F02-Intro.dc.html). */
export default function FundraisingStartPage() {
  return (
    <DoneeGate path="/fundraising/start">
      <Intro />
    </DoneeGate>
  );
}

const PREP = [
  "A cost estimate or fee statement for the need",
  "A report, admission letter or bill that shows the need",
  "Your government ID — if it is already in your profile, you can reuse it",
  "If it is for someone else: how you are related and their consent",
];

function Intro() {
  const router = useRouter();
  const [draft, setDraft] = useState<FundraisingApplication | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fundraising.mine().then((apps) => setDraft(apps.find((a) => a.status === "DRAFT") ?? null)).catch(() => {});
  }, []);

  async function start() {
    if (draft) { router.push(`/fundraising/applications/${draft.id}`); return; }
    setStarting(true);
    setError(null);
    try {
      const app = await fundraising.create();
      router.push(`/fundraising/applications/${app.id}`);
    } catch {
      setError("We couldn't start your application. Please try again.");
      setStarting(false);
    }
  }

  return (
    <main className={s.wrap} style={{ paddingTop: 48, paddingBottom: 72, display: "flex", flexDirection: "column", gap: 40 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
        <Link href="/fundraising" className={s.small} style={{ textDecoration: "none" }}>← Back to fundraisers</Link>
        <h1 className={s.serif} style={{ fontSize: 44, lineHeight: 1.1 }}>Start a fundraiser</h1>
        <p style={{ fontSize: 18, lineHeight: 1.6 }}>Tell us who needs help and what the funds will cover. Our team will review your details before you can publish a fundraiser.</p>
      </div>

      <ol style={{ listStyle: "none", padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <li className={s.card} style={{ display: "flex", flexDirection: "column", gap: 10, padding: 24 }}>
          <span className={s.num} aria-hidden="true">1</span>
          <h2 className={s.serif} style={{ fontSize: 20 }}>Apply for review</h2>
          <p className={s.muted}>Tell us about the need, what it costs and who you are. Upload the evidence we ask for.</p>
        </li>
        <li className={s.card} style={{ display: "flex", flexDirection: "column", gap: 10, padding: 24 }}>
          <span className={`${s.num} ${s.numSoft}`} aria-hidden="true">2</span>
          <h2 className={s.serif} style={{ fontSize: 20 }}>Prepare your campaign</h2>
          <p className={s.muted}>Once approved, turn what you told us into a public page. Nothing needs re-typing.</p>
        </li>
        <li className={s.card} style={{ display: "flex", flexDirection: "column", gap: 10, padding: 24 }}>
          <span className={`${s.num} ${s.numSoft}`} aria-hidden="true">3</span>
          <h2 className={s.serif} style={{ fontSize: 20 }}>Publish after approval</h2>
          <p className={s.muted}>We review the public page too. Donations open only once it is approved and payment setup is complete.</p>
        </li>
      </ol>

      <div className={s.notice}>
        <Icon name="lock" className={s.icon} />
        <p><strong>Saving or submitting an application does not make anything public</strong> and does not start collecting donations. Only reviewers can see what you send.</p>
      </div>

      <div className={s.grid2} style={{ gap: 16 }}>
        <section className={s.card} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }} aria-labelledby="prep">
          <h2 id="prep" className={s.serif} style={{ fontSize: 20 }}>Good to have ready</h2>
          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {PREP.map((p) => (
              <li key={p} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ marginTop: 4, color: "#1e3a60" }}><Icon name="file" /></span><span>{p}</span>
              </li>
            ))}
          </ul>
          <p className={`${s.muted} ${s.small}`}>PDF or photos are fine. Missing something? You can save and come back.</p>
        </section>
        <section className={s.card} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }} aria-labelledby="priv">
          <h2 id="priv" className={s.serif} style={{ fontSize: 20 }}>Your privacy</h2>
          <p className={s.muted}>Identity documents and medical or school records stay private. Only authorised reviewers can open them, and they are never shown on a public page.</p>
          <p className={s.muted}>Later, when you prepare the campaign, you choose exactly what donors can see.</p>
          <Link href="/privacy" className={s.small}>How we handle your documents</Link>
        </section>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className={`${s.btn} ${s.bp}`} onClick={start} disabled={starting}>
          {starting ? "Starting…" : draft ? "Continue application" : "Start application"}<Icon name="arrow" />
        </button>
        <span className={`${s.muted} ${s.small}`}>Takes a while — your progress is saved as you go.</span>
      </div>
      {error && <p role="alert" className={s.errText}><Icon name="alert" />{error}</p>}
    </main>
  );
}
