"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { notFound } from "next/navigation";
import { useLocale } from "next-intl";
import Link from "@/components/AppLink";
import { FEATURES } from "@/lib/features";
import { sahasCampaigns, type SahasCampaignCard } from "@/lib/api";
import { UiText, useUiText } from "@/components/UiText";
import { SAHAS_NAME, SahasCard, serif, tabOf, type SahasTab } from "@/features/sahas/sahasUi";

const TABS: SahasTab[] = ["active", "upcoming", "completed"];

/** /sahas — the Sahas Campaigns hub (design board HF · /sahas hub). */
export default function SahasHubPage() {
  if (!FEATURES.sahas) notFound();
  return <SahasHub />;
}

function SahasHub() {
  const ui = useUiText();
  const locale = useLocale();
  const [cards, setCards] = useState<SahasCampaignCard[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<SahasTab>("active");

  // The tab lives in the URL (?status=) so a shared link opens the same list.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("status");
    if (q && (TABS as string[]).includes(q)) setTab(q as SahasTab);
  }, []);
  const pick = (t: SahasTab) => {
    setTab(t);
    const url = new URL(window.location.href);
    if (t === "active") url.searchParams.delete("status"); else url.searchParams.set("status", t);
    window.history.replaceState(null, "", url);
  };

  const load = useCallback(() => {
    setFailed(false);
    setCards(null);
    sahasCampaigns.live().then(setCards).catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);

  const counts = useMemo(() => {
    const c = { active: 0, upcoming: 0, completed: 0 };
    for (const x of cards ?? []) c[tabOf(x.phase)]++;
    return c;
  }, [cards]);
  const shown = (cards ?? []).filter((c) => tabOf(c.phase) === tab);
  const tabLabel: Record<SahasTab, string> = {
    active: ui("Active", "sahas hub tab"), upcoming: ui("Upcoming", "sahas hub tab"), completed: ui("Completed", "sahas hub tab"),
  };

  return (
    <main className="min-h-screen bg-[#FBF7F2] text-[#1F140D] dark:bg-zinc-950 dark:text-stone-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-7 px-4 py-10 sm:px-6">
        <nav aria-label={ui("Breadcrumb")} className="text-sm text-[#6B5A4E] dark:text-stone-400">
          <Link href="/" className="text-inherit hover:underline"><UiText>Home</UiText></Link> › <UiText>Sahas Campaigns</UiText>
        </nav>
        <header className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[#b04a15] dark:text-[#e07b3a]">
            <UiText>Organised by</UiText> {SAHAS_NAME}
          </span>
          <h1 className={`${serif} m-0 text-4xl leading-tight sm:text-5xl`}><UiText>Sahas Campaigns</UiText></h1>
          <p className="m-0 max-w-2xl text-base leading-relaxed text-[#4A3B30] dark:text-stone-300">
            <UiText>Specific needs that Sahas is collecting for right now. Give the items on the list, and follow what was received and delivered.</UiText>
          </p>
        </header>

        <div role="tablist" aria-label={ui("Campaign status")} className="flex gap-6 overflow-x-auto border-b border-[#EADFD3] dark:border-zinc-800">
          {TABS.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => pick(t)}
              className={`min-h-[48px] whitespace-nowrap border-b-[3px] text-[15px] font-semibold ${tab === t ? "border-[#b04a15] text-[#1F140D] dark:text-stone-100" : "border-transparent text-[#6B5A4E] dark:text-stone-400"}`}>
              {tabLabel[t]}{cards ? ` · ${counts[t]}` : ""}
            </button>
          ))}
        </div>

        {failed ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-[#D9C9B8] p-6">
            <b><UiText>Couldn&apos;t load campaigns</UiText></b>
            <span className="text-sm text-[#4A3B30] dark:text-stone-300"><UiText>Check your connection and try again.</UiText></span>
            <button type="button" onClick={load} className="min-h-[44px] rounded-xl border border-[#b04a15] px-4 text-sm font-semibold text-[#b04a15]">
              <UiText>Try again</UiText>
            </button>
          </div>
        ) : cards === null ? (
          <div aria-busy="true" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-96 animate-pulse rounded-2xl bg-[#EFE4D8] motion-reduce:animate-none dark:bg-zinc-900" />)}
          </div>
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D9C9B8] p-6 text-sm leading-relaxed text-[#4A3B30] dark:text-stone-300">
            {tab === "active" ? (
              <>
                <b className="block text-[15px] text-[#1F140D] dark:text-stone-100"><UiText>No active campaigns</UiText></b>
                <UiText>There&apos;s no Sahas campaign open right now. See what earlier campaigns achieved, or give to Sahas directly.</UiText>{" "}
                <Link href="/donate" className="font-semibold text-[#b04a15]"><UiText>Donate</UiText></Link>
              </>
            ) : tab === "upcoming" ? <UiText>No upcoming campaigns yet.</UiText> : <UiText>No completed campaigns yet.</UiText>}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((c) => <SahasCard key={c.slug} c={c} locale={locale} />)}
          </div>
        )}
      </div>
    </main>
  );
}
