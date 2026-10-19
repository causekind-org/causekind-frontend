"use client";

import { useMemo } from "react";
import { AdminFrEmbedContext } from "./adminLink";
import a from "./admin.module.css";
import ApplicationsQueue from "@/app/admin/fundraising/page";
import ApplicationReview from "@/app/admin/fundraising/[id]/page";
import PublicationQueue from "@/app/admin/fundraising/campaigns/page";
import PublicationReview from "@/app/admin/fundraising/campaigns/[id]/page";
import ItemReview from "@/app/admin/fundraising/review/page";
import ReportCases from "@/app/admin/fundraising/reports/page";
import ReportCase from "@/app/admin/fundraising/reports/[campaignId]/page";

/** Resolves an /admin/fundraising/... path to the page shown in the dashboard panel. */
function resolve(path: string): { el: () => React.ReactElement; params: Record<string, string> } {
  let m: RegExpMatchArray | null;
  if ((m = path.match(/^\/admin\/fundraising\/campaigns\/(\d+)$/))) return { el: () => <PublicationReview />, params: { id: m[1] } };
  if (path === "/admin/fundraising/campaigns") return { el: () => <PublicationQueue />, params: {} };
  if (path === "/admin/fundraising/review") return { el: () => <ItemReview />, params: {} };
  if ((m = path.match(/^\/admin\/fundraising\/reports\/(\d+)$/))) return { el: () => <ReportCase />, params: { campaignId: m[1] } };
  if (path === "/admin/fundraising/reports") return { el: () => <ReportCases />, params: {} };
  if ((m = path.match(/^\/admin\/fundraising\/(\d+)$/))) return { el: () => <ApplicationReview />, params: { id: m[1] } };
  return { el: () => <ApplicationsQueue />, params: {} };
}

export function AdminFundraisingPanel({ path, go }: { path: string; go: (href: string) => void }) {
  const r = useMemo(() => resolve(path), [path]);
  const ctx = useMemo(() => ({ go, params: r.params }), [go, r.params]);
  return (
    <AdminFrEmbedContext.Provider value={ctx}>
      <div className={a.embed} key={path}>{r.el()}</div>
    </AdminFrEmbedContext.Provider>
  );
}
