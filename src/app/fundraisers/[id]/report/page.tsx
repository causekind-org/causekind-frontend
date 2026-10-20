"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "@/components/AppLink";
import { FEATURES } from "@/lib/features";
import { useAuth } from "@/hooks/useAuth";
import { loginUrlFor } from "@/lib/safeRedirect";
import { fundraisers, fundraisingReports, type FundraiserDetail, type FundraisingReportReason, type MyFundraisingReport } from "@/lib/api";
import s from "@/features/fundraising/fundraising.module.css";

const REASONS: { id: FundraisingReportReason; label: string }[] = [
  { id: "UNTRUE", label: "Information looks untrue or exaggerated" },
  { id: "PRIVACY", label: "Someone's privacy or images used without consent" },
  { id: "DUPLICATE", label: "Same need raised elsewhere" },
  { id: "OTHER", label: "Something else" },
];

/** F33 — report a fundraiser. Signed-in users only (owner, 2026-10-19). */
export default function ReportFundraiserPage() {
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
    catch { setErr("Your report wasn't sent. What you wrote is still here — try again."); }
    finally { setBusy(false); }
  };

  return (
    <div className={`${s.root} ${s.publicTheme}`}>
      <main className={s.wrap} style={{ paddingTop: 40, paddingBottom: 72, maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
        <Link href={`/fundraisers/${id}`} className={s.small} style={{ textDecoration: "none" }}>← Back to the fundraiser</Link>
        {sent ? (
          <section className={s.card} role="status" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 10 }}>
            <h1 className={s.serif} style={{ fontSize: 28 }}>Report received</h1>
            <p>Thank you. Our team will look into it. Reference <strong>{sent.reference}</strong>.</p>
            <p className={`${s.small} ${s.muted}`}>You can follow its status: Received → Under investigation → Closed. &quot;Closed&quot; means the review is finished. We don&apos;t share what we found.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/fundraisers/reports" className={`${s.btn} ${s.bp}`}>Your reports</Link>
              <Link href={`/fundraisers/${id}`} className={`${s.btn} ${s.bs}`}>Back to the fundraiser</Link>
            </div>
          </section>
        ) : (
          <form className={s.card} style={{ padding: 28, display: "flex", flexDirection: "column", gap: 18 }} onSubmit={(e) => { e.preventDefault(); send(); }}>
            <div>
              <h1 className={s.serif} style={{ fontSize: 28 }}>Report this fundraiser</h1>
              {d && <p className={s.muted} style={{ marginTop: 4 }}>{d.card.title}</p>}
            </div>
            <p className={s.small} style={{ padding: "12px 14px", borderRadius: 10, background: "#f1ece6" }}>
              Reports are private. The organiser isn&apos;t told who reported, and nothing is published or marked as fraud because of a report.
            </p>
            <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <legend className={s.lbl} style={{ marginBottom: 8 }}>What&apos;s the concern?</legend>
              {REASONS.map((r) => (
                <label key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 14px", border: `1px solid ${reason === r.id ? "#b04a15" : "#e7ddd2"}`, borderRadius: 10, cursor: "pointer", background: "#fff" }}>
                  <input type="radio" name="reason" checked={reason === r.id} onChange={() => setReason(r.id)} />{r.label}
                </label>
              ))}
            </fieldset>
            <div><label className={s.lbl} htmlFor="det">Tell us more</label><textarea id="det" className={s.in} rows={5} maxLength={5000} value={details} onChange={(e) => setDetails(e.target.value)} /></div>
            <div>
              <span className={s.lbl}>Supporting evidence <span className={s.muted} style={{ fontWeight: 500 }}>(optional)</span></span>
              <div style={{ border: "2px dashed #cfc3b6", borderRadius: 10, padding: 14, display: "flex", gap: 10, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
                {file ? <><span className={s.small}>{file.name}</span><button type="button" className={`${s.btn} ${s.bs}`} onClick={() => setFile(null)}>Remove</button></>
                  : <label className={`${s.btn} ${s.bs}`}>Add file<input type="file" accept="image/*,application/pdf" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>}
              </div>
              <p className={s.hint}>Only CauseKind&apos;s team can see it.</p>
            </div>
            {err && <p className={s.errText} role="alert">{err}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <Link href={`/fundraisers/${id}`} className={`${s.btn} ${s.bs}`}>Cancel</Link>
              <button type="submit" className={`${s.btn} ${s.bp}`} disabled={busy || !reason || !details.trim()}>Send report</button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
