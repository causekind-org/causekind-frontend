"use client";

import { useCallback, useEffect, useState } from "react";
import { fundraisingManage, superAdminFundraising, type ReviewItemRow, type SaFrOverview } from "@/lib/api";
import type { SaTheme } from "@/components/super-admin/saTheme";
import { Card, ErrorLine, Pill, Spinner, Stat, dateTime, errorText, inr, type FrTab } from "./shared";

const ACTION_WORDS: Record<string, string> = {
  SUPER_ADMIN_EDIT_FUNDRAISER: "edited",
  SUPER_ADMIN_FUNDRAISER_FLAGS: "changed visibility on",
  SUPER_ADMIN_MESSAGE_ORGANISER: "messaged the organiser of",
  SUPER_ADMIN_OVERRIDE_APPLICATION: "changed the status of application",
  SUPER_ADMIN_FUNDRAISING_SETTINGS: "changed fundraising settings",
  PAUSE_FUNDRAISER: "paused",
  APPROVE_PUBLICATION: "approved",
  DECLINE_PUBLICATION: "declined",
  CLOSE_NOW: "closed",
};

export function FrOverview({ t, onGo, onOpenCampaign }: { t: SaTheme; onGo: (tab: FrTab) => void; onOpenCampaign: (id: number) => void }) {
  const [data, setData] = useState<SaFrOverview | null>(null);
  const [review, setReview] = useState<ReviewItemRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    superAdminFundraising.overview().then(setData).catch((e) => setError(errorText(e, "We couldn't load the overview.")));
    fundraisingManage.admin.queue().then(setReview).catch(() => setReview([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorLine message={error} onRetry={load} />;
  if (!data) return <Spinner t={t} />;

  const s = data.campaignsByStatus;
  const n = (k: keyof typeof s) => s[k] ?? 0;
  const segments = [
    { label: "Live", value: n("APPROVED"), color: "#047857" },
    { label: "In review", value: n("PUBLICATION_REVIEW") + n("CHANGES_REQUESTED"), color: "#d97706" },
    { label: "Collections closed", value: n("COLLECTIONS_CLOSED") + n("OUTCOME_REPORTING"), color: "#1d4ed8" },
    { label: "Draft", value: n("DRAFT") + n("APPROVED_SETUP_INCOMPLETE"), color: "#78716c" },
    { label: "Declined / paused", value: n("PUBLICATION_DECLINED") + n("PAUSED") + n("CANCELLED"), color: "#b91c1c" },
  ];
  const total = segments.reduce((a, b) => a + b.value, 0) || 1;
  const updates = review.filter((r) => r.kind === "UPDATE" || r.kind === "REVISION").length;
  const closures = review.filter((r) => r.kind === "CLOSURE").length;
  const attention: { label: string; count: number; tab: FrTab; tone: "warn" | "danger" | "muted" }[] = [
    { label: "Applications to review", count: data.applicationsToReview, tab: "applications", tone: "warn" },
    { label: "Campaigns awaiting publication", count: data.campaignsAwaitingPublication, tab: "campaigns", tone: "warn" },
    { label: "Updates & changes", count: updates, tab: "reviews", tone: "warn" },
    { label: "Open donor reports", count: data.openReportCases, tab: "reviews", tone: "danger" },
    { label: "Closure requests", count: closures, tab: "reviews", tone: "warn" },
    { label: "Paused campaigns", count: data.pausedCampaigns, tab: "campaigns", tone: "muted" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Totals">
        <Stat t={t} label="Total raised" value={inr(data.totalRaised)} sub={`${data.successfulDonations} successful donations`} />
        <Stat t={t} label="Platform fees" value={inr(data.platformFees)} sub={`at ${data.feePercent}% current rate`} />
        <Stat t={t} label="Live campaigns" value={data.liveCampaigns} sub={`${data.endingThisWeek} ending this week`} />
        <Stat t={t} label="Unique donors" value={data.uniqueDonors} />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card t={t} className="flex flex-col gap-3.5 p-5">
          <h2 className={`text-base font-bold ${t.heading}`}>Needs attention</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {attention.map((a) => (
              <button key={a.label} type="button" onClick={() => onGo(a.tab)}
                className={`flex min-h-12 items-center justify-between rounded-xl border px-3.5 text-left text-sm ${t.cardFlat} ${t.rowHover} ${t.text}`}>
                <span>{a.label}</span><Pill tone={a.count ? a.tone : "muted"}>{a.count}</Pill>
              </button>
            ))}
          </div>
          <h2 className={`mt-2 text-base font-bold ${t.heading}`}>Campaigns by status</h2>
          <div className="flex h-3.5 overflow-hidden rounded-full bg-stone-200/60" role="img"
            aria-label={segments.map((x) => `${x.label} ${x.value}`).join(", ")}>
            {segments.map((x) => x.value > 0 && <div key={x.label} style={{ width: `${(x.value / total) * 100}%`, background: x.color }} />)}
          </div>
          <div className={`flex flex-wrap gap-4 text-[13px] ${t.text}`}>
            {segments.map((x) => <span key={x.label}><b style={{ color: x.color }} aria-hidden="true">■</b> {x.label} {x.value}</span>)}
          </div>
        </Card>

        <Card t={t} className="flex flex-col gap-2.5 p-5">
          <h2 className={`text-base font-bold ${t.heading}`}>Recent admin activity</h2>
          {data.recentActivity.length === 0 ? <p className={`text-sm ${t.muted}`}>No admin activity yet.</p> : (
            <ul className={`flex flex-col divide-y text-sm ${t.divide}`}>
              {data.recentActivity.map((a) => (
                <li key={a.id} className="py-2.5">
                  <span className={t.text}><b>{a.actorEmail ?? "System"}</b> {ACTION_WORDS[a.action] ?? a.action.toLowerCase().replaceAll("_", " ")}{" "}
                    {a.entityType === "fundraising_campaign" && a.entityId != null
                      ? <button type="button" onClick={() => onOpenCampaign(a.entityId!)} className="font-semibold underline" style={{ color: t.accent }}>#{a.entityId}</button>
                      : a.entityId != null ? `#${a.entityId}` : null}
                  </span>
                  <div className={`text-xs ${t.muted}`}>{a.reason ? `Reason: ${a.reason} · ` : ""}{dateTime(a.at)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
