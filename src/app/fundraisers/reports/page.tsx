"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/AppLink";
import { FEATURES } from "@/lib/features";
import { useAuth } from "@/hooks/useAuth";
import { loginUrlFor } from "@/lib/safeRedirect";
import { fundraisingReports, type MyFundraisingReport } from "@/lib/api";
import { formatDate } from "@/features/fundraising/ui";
import s from "@/features/fundraising/fundraising.module.css";

const STEPS = ["Received", "Under investigation", "Closed"];

/** F33 (status) — a reporter follows their reports. Outcomes are never shown. */
export default function MyReportsPage() {
  const router = useRouter();
  const { user, isLoading, isRestoring } = useAuth();
  const [rows, setRows] = useState<MyFundraisingReport[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { if (!isLoading && !isRestoring && !user) router.replace(loginUrlFor("/fundraisers/reports")); }, [isLoading, isRestoring, user, router]);
  useEffect(() => { if (FEATURES.fundraising && user) fundraisingReports.mine().then(setRows).catch(() => setFailed(true)); }, [user]);
  if (!FEATURES.fundraising || !user) return <div className={`${s.root} ${s.publicTheme}`} aria-busy="true" style={{ minHeight: 400 }} />;

  return (
    <div className={`${s.root} ${s.publicTheme}`}>
      <main className={s.wrap} style={{ paddingTop: 40, paddingBottom: 72, maxWidth: 820, display: "flex", flexDirection: "column", gap: 18 }}>
        <h1 className={s.serif} style={{ fontSize: 30 }}>Your reports</h1>
        <p className={`${s.small} ${s.muted}`}>&quot;Closed&quot; means the review is finished. We don&apos;t share what we found.</p>
        {failed ? <p className={s.errText} role="alert">Couldn&apos;t load your reports.</p>
          : rows === null ? <div className={s.card} aria-busy="true" style={{ minHeight: 120 }} />
          : rows.length === 0 ? <div className={s.card} style={{ padding: 20 }}><p className={s.muted}>You haven&apos;t reported any fundraisers.</p></div>
          : rows.map((r) => {
            const at = STEPS.indexOf(r.status);
            return (
              <section key={r.id} className={s.card} style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                <p><strong>{r.reference}</strong> <span className={s.muted}>· sent {formatDate(r.createdAt)}</span></p>
                <p className={s.small}><Link href={`/fundraisers/${r.campaignId}`}>{r.campaignTitle || "Fundraiser"}</Link></p>
                <ol style={{ listStyle: "none", padding: 0, display: "flex", gap: 8, flexWrap: "wrap" }} aria-label="Status">
                  {STEPS.map((st, i) => (
                    <li key={st} className={`${s.chip} ${i <= at ? s.cN : s.cM}`} aria-current={i === at ? "step" : undefined} style={{ fontWeight: i === at ? 700 : 500 }}>{st}</li>
                  ))}
                </ol>
              </section>
            );
          })}
      </main>
    </div>
  );
}
