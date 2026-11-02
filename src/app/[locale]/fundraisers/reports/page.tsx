"use client";
import { useTranslations } from "next-intl";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/AppLink";
import { FEATURES } from "@/lib/features";
import { useAuth } from "@/hooks/useAuth";
import { loginUrlFor } from "@/lib/safeRedirect";
import { fundraisingReports, type MyFundraisingReport } from "@/lib/api";
import { useFundraisingLabels } from "@/features/fundraising/ui";
import s from "@/features/fundraising/fundraising.module.css";

import { useUiText, UiText } from "@/components/UiText";
const STEPS = ["Received", "Under investigation", "Closed"];

/** F33 (status) — a reporter follows their reports. Outcomes are never shown. */
export default function MyReportsPage() {
  const fmt = useFundraisingLabels();
  const ui = useUiText();
  const t = useTranslations("fundraiserFlow");
  // STEPS values are the API's status names; only the label shown is translated.
  const stepLabel = (st: string) => ({ Received: ui("Received", "report status"), "Under investigation": ui("Under investigation", "report status"), Closed: ui("Closed", "report status") } as Record<string, string>)[st] ?? st;
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
        <h1 className={s.serif} style={{ fontSize: 30 }}><UiText>Your reports</UiText></h1>
        <p className={`${s.small} ${s.muted}`}><UiText>&quot;Closed&quot; means the review is finished. We don&apos;t share what we found.</UiText></p>
        {failed ? <p className={s.errText} role="alert"><UiText>Couldn&apos;t load your reports.</UiText></p>
          : rows === null ? <div className={s.card} aria-busy="true" style={{ minHeight: 120 }} />
          : rows.length === 0 ? <div className={s.card} style={{ padding: 20 }}><p className={s.muted}><UiText>You haven&apos;t reported any fundraisers.</UiText></p></div>
          : rows.map((r) => {
            const at = STEPS.indexOf(r.status);
            return (
              <section key={r.id} className={s.card} style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                <p><strong>{r.reference}</strong> <span className={s.muted}>· {t("sentOn", { date: fmt.date(r.createdAt) })}</span></p>
                <p className={s.small}><Link href={`/fundraisers/${r.campaignId}`}>{r.campaignTitle || ui("Fundraiser")}</Link></p>
                <ol style={{ listStyle: "none", padding: 0, display: "flex", gap: 8, flexWrap: "wrap" }} aria-label={ui("Status")}>
                  {STEPS.map((st, i) => (
                    <li key={st} className={`${s.chip} ${i <= at ? s.cN : s.cM}`} aria-current={i === at ? "step" : undefined} style={{ fontWeight: i === at ? 700 : 500 }}>{stepLabel(st)}</li>
                  ))}
                </ol>
              </section>
            );
          })}
      </main>
    </div>
  );
}
