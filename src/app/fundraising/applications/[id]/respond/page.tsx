"use client";
import { useTranslations } from "next-intl";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "@/components/AppLink";
import { fundraising, ApiError, type FundraisingApplication, type FundraisingInfoRequest } from "@/lib/api";
import { DoneeGate } from "@/features/fundraising/DoneeGate";
import { EvidenceSections } from "@/features/fundraising/Wizard";
import { DocumentConsent } from "@/features/fundraising/DocumentConsent";
import { usePageDraft } from "@/features/fundraising/PageSteps";
import { StatusChip, Icon } from "@/features/fundraising/ui";
import s from "@/features/fundraising/fundraising.module.css";

import { UiText, useUiText } from "@/components/UiText";
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
  const ui = useUiText();
  const [app, setApp] = useState<FundraisingApplication | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => { fundraising.get(id).then(setApp).catch(() => setLoadError(ui("Couldn't load this application."))); }, [id]);

  if (!app) return <main className={s.wrap} aria-busy="true" style={{ minHeight: 400 }}>{loadError && <p role="alert" className={s.errText}>{loadError}</p>}</main>;
  return <RespondBody id={id} app={app} setApp={setApp} />;
}

/** Split from Respond so the page-draft hook only runs once the application has loaded. */
function RespondBody({ id, app, setApp }: { id: number; app: FundraisingApplication; setApp: (a: FundraisingApplication) => void }) {
  const ui = useUiText();
  const t = useTranslations("fundraiserFlow");
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // Documents show while any requirement is unmet, and stay on screen once something was added here.
  const docsMissing = (app.requiredEvidence ?? []).some((g) => g.state !== "MET");
  const [docsTouched, setDocsTouched] = useState(false);
  useEffect(() => { if (docsMissing) setDocsTouched(true); }, [docsMissing]);
  const docsNeeded = docsMissing || docsTouched;
  // The application's page stays DRAFT while information is requested: its document choices
  // load and save here, through the campaign the application already has.
  const page = usePageDraft(app, app.status === "INFORMATION_REQUESTED");
  const { reload: reloadPage } = page;
  const evidenceKey = app.evidence.map((e) => `${e.id}:${e.superseded}`).join(",");
  useEffect(() => { if (app.status === "INFORMATION_REQUESTED") reloadPage(); }, [evidenceKey, app.status, reloadPage]);
  if (app.status !== "INFORMATION_REQUESTED") {
    return (
      <main className={s.wrap} style={{ paddingTop: 64, paddingBottom: 64, display: "flex", flexDirection: "column", gap: 12 }}>
        <StatusChip status={app.status} localize />
        <h1 className={s.serif} style={{ fontSize: 28 }}><UiText>There are no open questions</UiText></h1>
        <Link href={`/fundraising/applications/${id}`}><UiText>See where your application is</UiText></Link>
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
    catch (e) { setError(e instanceof ApiError ? e.message : ui("Your answer wasn't saved. It's still here — try again.")); }
    finally { setSaving(null); }
  }

  async function send() {
    setSending(true); setError(null);
    if (!(await page.flush())) { setSending(false); setError(ui("Your document choices haven't saved yet. Try again before sending.")); return; }
    try { await fundraising.resubmit(id); router.push(`/fundraising/applications/${id}`); }
    catch (e) { setError(e instanceof ApiError ? e.message : ui("Couldn't send. Try again.")); setSending(false); }
  }

  return (
    <>
      <header className={s.top}>
        <div className={`${s.wrap} ${s.topIn}`}>
          <span className={`${s.muted} ${s.small}`} style={{ flex: 1 }}>{t("applicationInfoRequested", { reference: app.reference })}</span>
          <Link href="/fundraising" className={`${s.btn} ${s.bs}`}><UiText>Save and exit</UiText></Link>
        </div>
      </header>
      <main className={s.wrap} style={{ paddingTop: 32, paddingBottom: 72, display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 700 }}>
            <StatusChip status="INFORMATION_REQUESTED" localize />
            <h1 className={s.serif} style={{ fontSize: 32 }}>{t("reviewerQuestions", { count: app.infoRequests.length })}</h1>
            <p className={s.muted}><UiText>Answer just these. Everything else you sent stays as it is — you don&apos;t need to start again.</UiText></p>
          </div>
          <p style={{ fontWeight: 600 }} className={s.tabular}>{t("answeredOf", { answered, total: app.infoRequests.length })}</p>
        </div>

        {app.infoRequests.map((q, i) => {
          const done = !!q.response;
          return (
            <section key={q.id} className={s.card} style={{ overflow: "hidden", borderColor: done ? undefined : "#e8c98a" }} aria-labelledby={`q${q.id}`}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.2fr)" }}>
                <div style={{ padding: "20px 22px", background: "#fbf8f4", borderRight: "1px solid #efe7de", display: "flex", flexDirection: "column", gap: 8 }}>
                  <span className={`${s.muted} ${s.small}`} style={{ fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>{t("aboutSection", { section: q.section.toLowerCase() })}</span>
                  <Link href={`/fundraising/applications/${id}`} className={s.small}><UiText>See what you sent</UiText></Link>
                </div>
                <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <h2 id={`q${q.id}`} style={{ fontSize: 16, fontWeight: 700 }}>{t("questionNumber", { n: i + 1 })}</h2>
                    {done ? <span className={`${s.chip} ${s.cOk}`}><Icon name="check" /><UiText>Answered</UiText></span> : <span className={`${s.chip} ${s.cW}`}><UiText>Not answered yet</UiText></span>}
                  </div>
                  <p style={{ padding: "12px 14px", borderRadius: 10, background: "#fdf3e1", color: "#4a3000" }}>&ldquo;{q.question}&rdquo;</p>
                  {done ? (
                    <p className={s.small}><strong><UiText>Your answer:</UiText></strong> {q.response}</p>
                  ) : (
                    <>
                      <div><label className={s.lbl} htmlFor={`a${q.id}`}><UiText>Your answer</UiText></label><textarea id={`a${q.id}`} className={s.in} rows={3} value={drafts[q.id] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))} maxLength={8000} style={{ resize: "vertical" }} /></div>
                      <div><button type="button" className={`${s.btn} ${s.bs}`} onClick={() => void save(q)} disabled={saving === q.id || !(drafts[q.id] ?? "").trim()}>{saving === q.id ? ui("Saving…") : ui("Save answer")}</button></div>
                    </>
                  )}
                </div>
              </div>
            </section>
          );
        })}

        {docsNeeded && (
          <section aria-labelledby="docs" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 id="docs" style={{ fontSize: 18, fontWeight: 700 }}><UiText>Documents</UiText></h2>
            <p className={s.muted} style={{ maxWidth: 700 }}><UiText>Resubmitting checks your documents against the current list for this kind of fundraiser. Add anything marked as needed before you send.</UiText></p>
            <EvidenceSections app={app} setApp={setApp} profile={null} />
          </section>
        )}

        {page.page && (
          <section aria-label={ui("What donors can see")} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <DocumentConsent page={page.page} set={page.set} />
            {page.save === "error" && <p role="alert" className={s.errText}><Icon name="alert" /><UiText>Your document choices weren&apos;t saved. Try again.</UiText></p>}
          </section>
        )}
        {page.loadError && <p role="alert" className={s.errText}><Icon name="alert" /><UiText>Couldn&apos;t load your document choices.</UiText> <button type="button" className={`${s.btn} ${s.bq}`} onClick={page.reload}><UiText>Try again</UiText></button></p>}

        {error && <p role="alert" className={s.errText}><Icon name="alert" />{error}</p>}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/fundraising" className={`${s.btn} ${s.bs}`}><UiText>Save and finish later</UiText></Link>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            {open.length > 0 ? <span className={`${s.muted} ${s.small}`}><UiText>Answer every question to send</UiText></span>
              : docsMissing && <span className={`${s.muted} ${s.small}`}><UiText>Add the needed documents to send</UiText></span>}
            <button type="button" className={`${s.btn} ${s.bp}`} onClick={send} disabled={open.length > 0 || docsMissing || sending}>{sending ? ui("Sending…") : ui("Send responses")}</button>
          </div>
        </div>
        <p className={`${s.muted} ${s.small}`}><UiText>Once sent, your application shows</UiText> <strong><UiText>Resubmitted</UiText></strong> <UiText>and goes back to the reviewer. Need to replace a document? Uploads during a review are kept alongside the earlier version.</UiText></p>
      </main>
    </>
  );
}
