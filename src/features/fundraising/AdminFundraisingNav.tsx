"use client";

import { useEffect, useState } from "react";
import { HandCoins, ChevronDown, ChevronUp } from "lucide-react";
import { FEATURES } from "@/lib/features";
import { fundraising, fundraisingCampaigns, fundraisingManage, fundraisingReports } from "@/lib/api";

const LINKS = [
  { key: "apps", href: "/admin/fundraising", label: "Applications" },
  { key: "pub", href: "/admin/fundraising/campaigns", label: "Publication review" },
  { key: "items", href: "/admin/fundraising/review", label: "Updates & changes" },
  { key: "reports", href: "/admin/fundraising/reports", label: "Reports" },
] as const;
type Key = (typeof LINKS)[number]["key"];
const COLOR = "#b04a15";
const APP_DETAIL = /^\/admin\/fundraising\/\d+$/;

/** Waiting counts per fundraising queue; a failed queue counts as 0 rather than hiding the nav. */
function useCounts(enabled: boolean, refreshKey: string | null) {
  const [c, setC] = useState<Record<Key, number>>({ apps: 0, pub: 0, items: 0, reports: 0 });
  const [tick, setTick] = useState(0);
  // Refresh after any change made anywhere in the app (approve, decline, pause...).
  useEffect(() => {
    if (!enabled) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const on = () => { clearTimeout(t); t = setTimeout(() => setTick((n) => n + 1), 400); };
    window.addEventListener("ck:data-changed", on);
    return () => { clearTimeout(t); window.removeEventListener("ck:data-changed", on); };
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    const n = (p: Promise<unknown[]>) => p.then((x) => x.length).catch(() => 0);
    Promise.all([
      n(fundraising.admin.queue()),
      // Publication review needs the team for both: pages waiting for review, and approved pages waiting on payment setup.
      Promise.all([n(fundraisingCampaigns.admin.queue()), n(fundraisingCampaigns.admin.queue("APPROVED_SETUP_INCOMPLETE"))]).then(([w, s]) => w + s),
      n(fundraisingManage.admin.queue()),
      fundraisingReports.admin.cases(true).then((r) => r.filter((x) => x.openReports > 0).length).catch(() => 0),
    ]).then(([apps, pub, items, reports]) => setC({ apps, pub, items, reports }));
  }, [enabled, refreshKey, tick]);
  return c;
}

/**
 * Fundraising group in the admin dashboard (owner request 2026-10-19). Selecting an
 * entry opens that page in the dashboard's right-hand panel — it never navigates away.
 * Shown only when the feature is on and the admin holds CAMPAIGNS.
 */
export function AdminFundraisingNav({ variant, allowed, active, onSelect }: {
  variant: "sidebar" | "strip";
  allowed: boolean;
  /** The fundraising path open in the panel, or null when another tab is showing. */
  active: string | null;
  onSelect: (href: string) => void;
}) {
  const show = FEATURES.fundraising && allowed;
  const counts = useCounts(show, active);
  const [open, setOpen] = useState(true);
  if (!show) return null;
  const total = counts.apps + counts.pub + counts.items + counts.reports;
  const isOn = (href: string) => {
    if (active === null) return false;
    if (href === "/admin/fundraising") return active === href || APP_DETAIL.test(active);
    return active === href || active.startsWith(href + "/");
  };

  if (variant === "strip") {
    return (
      <>
        <span className="mx-0.5 h-5 w-px flex-shrink-0 bg-stone-300" aria-hidden />
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
          className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${active ? "bg-[#b04a15] text-white" : "bg-white text-stone-600 border border-stone-200"}`}>
          Fundraising{total > 0 && <span className="opacity-80">{total}</span>}
          {open ? <ChevronUp className="w-3 h-3" aria-hidden /> : <ChevronDown className="w-3 h-3" aria-hidden />}
        </button>
        {open && LINKS.map((l) => (
          <button type="button" key={l.key} onClick={() => onSelect(l.href)} aria-current={isOn(l.href) ? "page" : undefined}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isOn(l.href) ? "bg-[#b04a15] text-white" : "bg-white text-stone-500 border border-stone-200"}`}>
            {l.label}{counts[l.key] > 0 && <span className="opacity-80">{counts[l.key]}</span>}
          </button>
        ))}
      </>
    );
  }

  return (
    <div className="pt-2 space-y-2">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="admin-fundraising-group"
        className="w-full flex items-center justify-between px-1 py-1 text-left">
        <span className="flex items-center gap-2 text-3xs font-black uppercase tracking-widest text-stone-500">
          <HandCoins className="w-3.5 h-3.5" aria-hidden /> Fundraising
        </span>
        <span className="flex items-center gap-2">
          <span className="text-sm font-black tabular-nums" style={{ color: total > 0 ? COLOR : "#3d3d52" }}>{total}</span>
          {open ? <ChevronUp className="w-4 h-4 text-stone-500" aria-hidden /> : <ChevronDown className="w-4 h-4 text-stone-500" aria-hidden />}
        </span>
      </button>
      {open && (
        <div id="admin-fundraising-group" className="space-y-2 pl-2 border-l border-white/[0.07]">
          {LINKS.map((l) => {
            const on = isOn(l.href);
            return (
              <button type="button" key={l.key} onClick={() => onSelect(l.href)} aria-current={on ? "page" : undefined}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all border ${on ? "border-[#b04a15]/40" : "border-white/[0.05] hover:border-white/10"}`}
                style={{ background: on ? "rgba(176,74,21,0.12)" : "rgba(255,255,255,0.025)" }}>
                <span className={`text-sm font-semibold ${on ? "text-white" : "text-stone-400"}`}>{l.label}</span>
                <span className="flex items-center gap-2">
                  {counts[l.key] > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#b04a15] animate-pulse shrink-0" />}
                  <span className="text-base font-black tabular-nums leading-none" style={{ color: counts[l.key] > 0 ? COLOR : "#3d3d52" }}>{counts[l.key]}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
