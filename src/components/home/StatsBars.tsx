"use client";

/**
 * StatsBars — Desktop stats row + live activity ticker.
 * Extracted from HomeClient.tsx for maintainability.
 */

import { useTranslations } from "next-intl";
import { Coins, Heart, Sparkles, Users } from "lucide-react";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import type { PlatformStats, RecentActivity } from "@/lib/api";

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

export function DesktopStatsBar({ stats }: { stats: PlatformStats | null }) {
  const tStats = useTranslations("stats");

  const items = [
    { value: stats ? `₹${formatINR(stats.totalRaised)}` : "₹5,652", label: tStats("totalRaised"),    icon: Coins,    color: "text-[#b04a15]"  },
    { value: stats ? stats.activeCampaigns             : "3",       label: tStats("activeCampaigns"), icon: Heart,    color: "text-[#c2660a]"  },
    { value: stats ? stats.totalDonations               : "24",      label: tStats("donations"),       icon: Sparkles, color: "text-[#1e3a60]"  },
    { value: stats ? stats.uniqueDonors                 : "18",      label: tStats("donors"),          icon: Users,    color: "text-amber-700"  },
  ];

  return (
    <div className="hidden sm:block border-y border-orange-100/50 dark:border-stone-850 bg-white dark:bg-zinc-950 shadow-xs">
      <div className="flex items-stretch divide-x divide-orange-50 dark:divide-zinc-800 justify-around py-5">
        {items.map(s => (
          <div key={s.label} className="flex items-center gap-3 px-10">
            <s.icon className={`h-6 w-6 shrink-0 ${s.color}`} />
            <div>
              <p className="text-2xl font-black text-stone-900 dark:text-stone-100 tabular-nums leading-none">{s.value}</p>
              <p className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mt-0.5 whitespace-nowrap">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LiveTicker({ activity }: { activity: RecentActivity[] }) {
  if (!activity.length) return null;

  return (
    <div className="border-b border-orange-100/40 dark:border-stone-850/40 bg-orange-50/30 dark:bg-zinc-900/10 py-3 overflow-hidden flex items-center gap-3">
      <span className="shrink-0 ml-6 rounded-full bg-[#963c0d] px-3 py-1 text-[10px] font-black tracking-widest text-white z-10 flex items-center gap-1 shadow-sm">
        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-[#f0b97a]" />
        LIVE
      </span>
      <div className="overflow-hidden flex-1">
        <div className="ticker-track">
          {[...activity, ...activity].map((a, i) => (
            <span key={i} className="flex items-center gap-2 text-xs text-stone-500 font-bold whitespace-nowrap px-8">
              {a.type === "DONATION" ? (
                <>
                  <span className="inline-block h-2 w-2 rounded-full bg-[#b04a15]" />
                  <span className="text-[#b04a15] font-extrabold">₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(a.amount ?? 0)}</span>
                  {" donated to "}
                  <span className="font-extrabold text-stone-800 dark:text-stone-200"><TranslatedText text={a.campaignTitle} /></span>
                  <span className="text-stone-400">· <TranslatedText text={a.city} /></span>
                </>
              ) : (
                <>
                  <span className="inline-block h-2 w-2 rounded-full bg-[#1e3a60]" />
                  <span className="text-[#1e3a60] font-extrabold">New Campaign </span>
                  <span className="font-extrabold text-stone-800 dark:text-stone-200"><TranslatedText text={a.campaignTitle} /></span>
                  <span className="text-stone-400">· <TranslatedText text={a.category} /> · <TranslatedText text={a.city} /></span>
                </>
              )}
              <span className="text-stone-200 dark:text-stone-800 mx-4">|</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
