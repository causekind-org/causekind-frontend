"use client";

import { useCallback, useEffect, useState } from "react";
import { fundraisingManage, fundraisingReports, type ReportCaseRow, type ReviewItemRow } from "@/lib/api";
import type { SaTheme } from "@/components/super-admin/saTheme";
import { Card, Chip, ErrorLine, Pill, Spinner, dateTime, errorText } from "./shared";

type Kind = "REPORT" | "UPDATE" | "REVISION" | "CLOSURE" | "OUTCOME" | "QUESTION";
type Item = { key: string; kind: Kind; title: string; sub: string; campaignId: number; campaignTitle: string; at: string | null; href: string };

const KIND: Record<Kind, { label: string; tone: "danger" | "info" | "violet" | "warn" | "ok" | "muted" }> = {
  REPORT: { label: "Donor report", tone: "danger" },
  UPDATE: { label: "Update", tone: "info" },
  REVISION: { label: "Page change", tone: "violet" },
  CLOSURE: { label: "Closure", tone: "warn" },
  OUTCOME: { label: "Outcome", tone: "ok" },
  QUESTION: { label: "Question", tone: "muted" },
};
const FILTERS: { label: string; kinds: Kind[] }[] = [
  { label: "All open", kinds: ["REPORT", "UPDATE", "REVISION", "CLOSURE", "OUTCOME", "QUESTION"] },
  { label: "Donor reports", kinds: ["REPORT"] },
  { label: "Updates", kinds: ["UPDATE"] },
  { label: "Page changes", kinds: ["REVISION"] },
  { label: "Closure requests", kinds: ["CLOSURE"] },
  { label: "Outcomes", kinds: ["OUTCOME"] },
  { label: "Questions", kinds: ["QUESTION"] },
];

/** One queue over the existing admin review sources; decisions open the existing admin pages. */
export function FrReviews({ t, onOpenCampaign }: { t: SaTheme; onOpenCampaign: (id: number) => void }) {
  const [filter, setFilter] = useState(0);
  const [showResolved, setShowResolved] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([fundraisingManage.admin.queue(), fundraisingReports.admin.cases(!showResolved)])
      .then(([review, cases]: [ReviewItemRow[], ReportCaseRow[]]) => {
        const fromReview: Item[] = review.map((r) => ({
          key: `${r.kind}-${r.id}`, kind: r.kind as Kind,
          title: r.kind === "UPDATE" ? "Update posted by the organiser" : r.kind === "REVISION" ? `Campaign page change${r.material ? " (material)" : ""}`
            : r.kind === "CLOSURE" ? "Early closure requested" : "Use-of-funds outcome submitted",
          sub: `By ${r.organiser}`, campaignId: r.campaignId, campaignTitle: r.campaignTitle ?? `#${r.campaignId}`, at: r.submittedAt,
          href: "/admin/fundraising/review",
        }));
        const fromCases: Item[] = cases.flatMap((c) => {
          const out: Item[] = [];
          if (c.openReports > 0 || showResolved) out.push({
            key: `R-${c.campaignId}`, kind: "REPORT", title: `${c.openReports} open of ${c.totalReports} report${c.totalReports === 1 ? "" : "s"}`,
            sub: `Organiser ${c.organiser}`, campaignId: c.campaignId, campaignTitle: c.title ?? `#${c.campaignId}`, at: c.latestAt,
            href: `/admin/fundraising/reports/${c.campaignId}`,
          });
          if (c.responseRequested) out.push({
            key: `Q-${c.campaignId}`, kind: "QUESTION", title: c.responseReceived ? "Organiser answered your questions" : "Waiting for the organiser's answers",
            sub: `Organiser ${c.organiser}`, campaignId: c.campaignId, campaignTitle: c.title ?? `#${c.campaignId}`, at: c.latestAt,
            href: `/admin/fundraising/reports/${c.campaignId}`,
          });
          return out;
        });
        setItems([...fromCases, ...fromReview].sort((a, b) => (b.at ?? "").localeCompare(a.at ?? "")));
      })
      .catch((e) => setError(errorText(e, "We couldn't load the review queue.")));
  }, [showResolved]);
  useEffect(() => { load(); }, [load]);

  const count = (kinds: Kind[]) => items?.filter((i) => kinds.includes(i.kind)).length ?? 0;
  const shown = items?.filter((i) => FILTERS[filter].kinds.includes(i.kind)) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        {FILTERS.map((x, i) => <Chip key={x.label} t={t} active={filter === i} onClick={() => setFilter(i)}>{x.label} {count(x.kinds)}</Chip>)}
        <span className="flex-1" />
        <label className={`flex items-center gap-1.5 text-[13px] ${t.text}`}><input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> Show resolved reports</label>
      </div>
      {error ? <ErrorLine message={error} onRetry={load} /> : !items ? <Spinner t={t} /> : (
        <Card t={t} className="overflow-hidden">
          <div className={`hidden grid-cols-[150px_minmax(0,1fr)_200px_110px] gap-4 border-b px-[18px] py-3 text-xs font-semibold uppercase tracking-wider md:grid ${t.tableHead} ${t.muted}`}>
            <span>Type</span><span>Item</span><span>Campaign</span><span />
          </div>
          {shown.length === 0 && <p className={`px-4 py-10 text-center text-sm ${t.muted}`}>Nothing waiting here.</p>}
          <ul className={`divide-y ${t.divide}`}>
            {shown.map((i) => (
              <li key={i.key} className="grid grid-cols-1 items-center gap-2 px-[18px] py-4 text-sm md:grid-cols-[150px_minmax(0,1fr)_200px_110px] md:gap-4">
                <span><Pill tone={KIND[i.kind].tone}>{KIND[i.kind].label}</Pill></span>
                <div><b className={t.heading}>{i.title}</b><div className={`mt-0.5 text-[13px] ${t.muted}`}>{i.sub} · {dateTime(i.at)}</div></div>
                <button type="button" onClick={() => onOpenCampaign(i.campaignId)} className="truncate text-left underline" style={{ color: t.accent }}>{i.campaignTitle}</button>
                <a href={i.href} className={`min-h-9 rounded-lg border px-3 py-1.5 text-center text-[13px] ${t.btn}`}>Review</a>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
