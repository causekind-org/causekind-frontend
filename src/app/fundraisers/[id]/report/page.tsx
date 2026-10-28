"use client";
import { useTranslations } from "next-intl";
import { useUiText } from "@/components/UiText";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "@/components/AppLink";
import { FEATURES } from "@/lib/features";
import { useAuth } from "@/hooks/useAuth";
import { loginUrlFor } from "@/lib/safeRedirect";
import { fundraisers, fundraisingReports, type FundraiserDetail, type FundraisingReportReason, type MyFundraisingReport } from "@/lib/api";
import s from "@/features/fundraising/fundraising.module.css";

import { UiText } from "@/components/UiText";
const REASONS: { id: FundraisingReportReason; label: string }[] = [
  { id: "UNTRUE", label: "Information looks untrue or exaggerated" },
  { id: "PRIVACY", label: "Someone's privacy or images used without consent" },
  { id: "DUPLICATE", label: "Same need raised elsewhere" },
  { id: "OTHER", label: "Something else" },
];

/** F33 — report a fundraiser. Signed-in users only (owner, 2026-10-19). */
const ERR_NOT_SENT = "\u0000notSent";

export default function ReportFundraiserPage() {
  const ui = useUiText();
  const t = useTranslations("fundraiserFlow");
  const reasonLabel = (id: FundraisingReportReason): string => ({
    UNTRUE: ui("Information looks untrue or exaggerated"),
    PRIVACY: ui("Someone's privacy or images used without consent"),
    DUPLICATE: ui("Same need raised elsewhere"),
    OTHER: ui("Something else"),
  } as Record<FundraisingReportReason, string>)[id] ?? id;
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading, isRestoring } = useAuth();
  const [d, setD] = useState<FundraiserDetail | null>(null);
  const [reason, setReason] = useState<FundraisingReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState<MyFundraisingReport | null>(null);

  useEffect(() => { if (!isLoading && !isRestoring && !user) router.replace(loginUrlFor(`/fundraisers/${id}/report`)); }, [isLoading, isRestoring, user, router, id]);
  useEffect(() => { if (FEATURES.fundraising) fundraisers.detail(Number(id)).then(setD).catch(() => {}); }, [id]);

  if (!FEATURES.fundraising || !user) return <div className={`${s.root} ${s.publicTheme}`} aria-busy="true" style={{ minHeight: 400 }} />;

  const send = async () => {
    if (!reason || !details.trim()) return;
    setBusy(true); setErr(null);
    try { setSent(await fundraisingReports.report(Number(id), reason, details.trim(), file)); }
    catch { setErr(ERR_NOT_SENT); }
    finally { setBusy(false); }
  };

  return (
    <div className={`${s.root} ${s.publicTheme}`}>
      <main className={s.wrap} style={{ paddingTop: 40, paddingBottom: 72, maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
        <Link href={`/fundraisers/${id}`} className={s.small} style={{ textDecoration: "none" }}><UiText>← Back to the fundraiser</UiText></Link>
        {sent ? (
          <section className={s.card} role="status" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 10 }}>
            <h1 className={s.serif} style={{ fontSize: 28 }}><UiText>Report received</UiText></h1>
            <p>{t.rich("reportThanks", { reference: sent.reference, strong: (chunks) => <strong>{chunks}</strong> })}</p>
            <p className={`${s.small} ${s.muted}`}><UiText>You can follow its status: Received → Under investigation → Closed. &quot;Closed&quot; means the review is finished. We don&apos;t share what we found.</UiText></p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/fundraisers/reports" className={`${s.btn} ${s.bp}`}><UiText>Your reports</UiText></Link>
              <Link href={`/fundraisers/${id}`} className={`${s.btn} ${s.bs}`}><UiText>Back to the fundraiser</UiText></Link>
            </div>
          </section>
        ) : (
          <form className={s.card} style={{ padding: 28, display: "flex", flexDirection: "column", gap: 18 }} onSubmit={(e) => { e.preventDefault(); send(); }}>
            <div>
              <h1 className={s.serif} style={{ fontSize: 28 }}><UiText>Report this fundraiser</UiText></h1>
              {d && <p className={s.muted} style={{ marginTop: 4 }}>{d.card.title}</p>}
            </div>
            <p className={s.small} style={{ padding: "12px 14px", borderRadius: 10, background: "#f1ece6" }}>
              <UiText>Reports are private. The organiser isn&apos;t told who reported, and nothing is published or marked as fraud because of a report.</UiText>
            </p>
            <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <legend className={s.lbl} style={{ marginBottom: 8 }}><UiText>What&apos;s the concern?</UiText></legend>
              {REASONS.map((r) => (
                <label key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 14px", border: `1px solid ${reason === r.id ? "#b04a15" : "#e7ddd2"}`, borderRadius: 10, cursor: "pointer", background: "#fff" }}>
                  <input type="radio" name="reason" checked={reason === r.id} onChange={() => setReason(r.id)} />{reasonLabel(r.id)}
                </label>
              ))}
            </fieldset>
            <div><label className={s.lbl} htmlFor="det"><UiText>Tell us more</UiText></label><textarea id="det" className={s.in} rows={5} maxLength={5000} value={details} onChange={(e) => setDetails(e.target.value)} /></div>
            <div>
              <span className={s.lbl}><UiText>Supporting evidence</UiText> <span className={s.muted} style={{ fontWeight: 500 }}><UiText>(optional)</UiText></span></span>
              <div style={{ border: "2px dashed #cfc3b6", borderRadius: 10, padding: 14, display: "flex", gap: 10, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
                {file ? <><span className={s.small}>{file.name}</span><button type="button" className={`${s.btn} ${s.bs}`} onClick={() => setFile(null)}><UiText>Remove</UiText></button></>
                  : <label className={`${s.btn} ${s.bs}`}><UiText>Add file</UiText><input type="file" accept="image/*,application/pdf" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>}
              </div>
              <p className={s.hint}><UiText>Only CauseKind&apos;s team can see it.</UiText></p>
            </div>
            {err && <p className={s.errText} role="alert">{err === ERR_NOT_SENT ? ui("Your report wasn't sent. What you wrote is still here — try again.") : err}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <Link href={`/fundraisers/${id}`} className={`${s.btn} ${s.bs}`}><UiText>Cancel</UiText></Link>
              <button type="submit" className={`${s.btn} ${s.bp}`} disabled={busy || !reason || !details.trim()}><UiText>Send report</UiText></button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
