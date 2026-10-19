"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "@/components/AppLink";
import { fundraising, ApiError, type FundraisingApplication, type FundraisingInfoRequest } from "@/lib/api";
import { DoneeGate } from "@/features/fundraising/DoneeGate";
import { Icon, StatusChip } from "@/features/fundraising/ui";
import s from "@/features/fundraising/fundraising.module.css";

/** F09 — Respond to the reviewer's questions (canvas F09-InfoRequest.dc.html). */
export default function RespondPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <DoneeGate path={`/fundraising/applications/${id}/respond`}>
      <Respond id={Number(id)} />
    </DoneeGate>
  );
}

function Respond({ id }: { id: number }) {
  const router = useRouter();
  const [app, setApp] = useState<FundraisingApplication | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => { fundraising.get(id).then(setApp).catch(() => setError("Couldn't load this application.")); }, [id]);

  if (!app) return <main className={s.wrap} aria-busy="true" style={{ minHeight: 400 }}>{error && <p role="alert" className={s.errText}>{error}</p>}</main>;
  if (app.status !== "INFORMATION_REQUESTED") {
    return (
      <main className={s.wrap} style={{ paddingTop: 64, paddingBottom: 64, display: "flex", flexDirection: "column", gap: 12 }}>
        <StatusChip status={app.status} />
        <h1 className={s.serif} style={{ fontSize: 28 }}>There are no open questions</h1>
        <Link href={`/fundraising/applications/${id}`}>See where your application is</Link>
      </main>
    );
  }

  const open = app.infoRequests.filter((q) => !q.response);
  const answered = app.infoRequests.length - open.length;

  async function save(q: FundraisingInfoRequest) {
    const text = (drafts[q.id] ?? "").trim();
    if (!text) return;
    setSaving(q.id); setError(null);
    try { setApp(await fundraising.answer(id, q.id, text)); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Your answer wasn't saved. It's still here — try again."); }
    finally { setSaving(null); }
  }

  async function send() {
    setSending(true); setError(null);
    try { await fundraising.resubmit(id); router.push(`/fundraising/applications/${id}`); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Couldn't send. Try again."); setSending(false); }
  }

  return (
    <>
      <header className={s.top}>
        <div className={`${s.wrap} ${s.topIn}`}>
          <span className={`${s.muted} ${s.small}`} style={{ flex: 1 }}>Application {app.reference} · Information requested</span>
          <Link href="/fundraising" className={`${s.btn} ${s.bs}`}>Save and exit</Link>
        </div>
      </header>
      <main className={s.wrap} style={{ paddingTop: 32, paddingBottom: 72, display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 700 }}>
            <StatusChip status="INFORMATION_REQUESTED" />
            <h1 className={s.serif} style={{ fontSize: 32 }}>The reviewer has {app.infoRequests.length} question{app.infoRequests.length === 1 ? "" : "s"}</h1>
            <p className={s.muted}>Answer just these. Everything else you sent stays as it is — you don&apos;t need to start again.</p>
          </div>
          <p style={{ fontWeight: 600 }} className={s.tabular}>{answered} of {app.infoRequests.length} answered</p>
        </div>

        {app.infoRequests.map((q, i) => {
          const done = !!q.response;
          return (
            <section key={q.id} className={s.card} style={{ overflow: "hidden", borderColor: done ? undefined : "#e8c98a" }} aria-labelledby={`q${q.id}`}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.2fr)" }}>
                <div style={{ padding: "20px 22px", background: "#fbf8f4", borderRight: "1px solid #efe7de", display: "flex", flexDirection: "column", gap: 8 }}>
                  <span className={`${s.muted} ${s.small}`} style={{ fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>About · {q.section.toLowerCase()}</span>
                  <Link href={`/fundraising/applications/${id}`} className={s.small}>See what you sent</Link>
                </div>
                <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <h2 id={`q${q.id}`} style={{ fontSize: 16, fontWeight: 700 }}>Question {i + 1}</h2>
                    {done ? <span className={`${s.chip} ${s.cOk}`}><Icon name="check" />Answered</span> : <span className={`${s.chip} ${s.cW}`}>Not answered yet</span>}
                  </div>
                  <p style={{ padding: "12px 14px", borderRadius: 10, background: "#fdf3e1", color: "#4a3000" }}>&ldquo;{q.question}&rdquo;</p>
                  {done ? (
                    <p className={s.small}><strong>Your answer:</strong> {q.response}</p>
                  ) : (
                    <>
                      <div><label className={s.lbl} htmlFor={`a${q.id}`}>Your answer</label><textarea id={`a${q.id}`} className={s.in} rows={3} value={drafts[q.id] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))} maxLength={8000} style={{ resize: "vertical" }} /></div>
                      <div><button type="button" className={`${s.btn} ${s.bs}`} onClick={() => void save(q)} disabled={saving === q.id || !(drafts[q.id] ?? "").trim()}>{saving === q.id ? "Saving…" : "Save answer"}</button></div>
                    </>
                  )}
                </div>
              </div>
            </section>
          );
        })}

        {error && <p role="alert" className={s.errText}><Icon name="alert" />{error}</p>}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/fundraising" className={`${s.btn} ${s.bs}`}>Save and finish later</Link>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            {open.length > 0 && <span className={`${s.muted} ${s.small}`}>Answer every question to send</span>}
            <button type="button" className={`${s.btn} ${s.bp}`} onClick={send} disabled={open.length > 0 || sending}>{sending ? "Sending…" : "Send responses"}</button>
          </div>
        </div>
        <p className={`${s.muted} ${s.small}`}>Once sent, your application shows <strong>Resubmitted</strong> and goes back to the reviewer. Need to replace a document? Uploads during a review are kept alongside the earlier version.</p>
      </main>
    </>
  );
}
