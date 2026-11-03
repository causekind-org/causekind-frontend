"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import Link from "@/components/AppLink";
import { FEATURES } from "@/lib/features";
import { sahasCampaigns, type SahasCampaignCard } from "@/lib/api";
import { UiText } from "@/components/UiText";
import { SAHAS_NAME, SahasCard, serif } from "@/features/sahas/sahasUi";

/**
 * Homepage Sahas spotlight (owner decision D08, option B, 2026-11-03): one featured campaign
 * and up to two more, below the fundraiser row. Renders nothing while the feature is off,
 * while loading, on a fetch failure or when no campaign is open, so the page never shows an
 * empty frame. Static grid, no autoplay.
 */
export function SahasSpotlight() {
  const locale = useLocale();
  const [cards, setCards] = useState<SahasCampaignCard[] | null>(null);

  useEffect(() => {
    if (!FEATURES.sahas) return;
    let live = true;
    sahasCampaigns.live()
      .then((all) => { if (live) setCards(all.filter((c) => c.phase === "OPEN" || c.phase === "UPCOMING")); })
      .catch(() => { if (live) setCards([]); });
    return () => { live = false; };
  }, []);

  if (!FEATURES.sahas || !cards || cards.length === 0) return null;
  const [first, ...rest] = cards;
  const more = rest.slice(0, 2);

  return (
    <section aria-labelledby="sahas-spotlight-h" className="mx-auto w-full max-w-6xl px-4 py-12 text-[#1F140D] sm:px-6 dark:text-stone-100">
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[#b04a15] dark:text-[#e07b3a]">
            <UiText>Organised by</UiText> {SAHAS_NAME}
          </span>
          <h2 id="sahas-spotlight-h" className={`${serif} m-0 text-3xl sm:text-4xl`}><UiText>Sahas Campaigns</UiText></h2>
        </div>
        <Link href="/sahas" className="ms-auto flex min-h-[44px] items-center text-[15px] font-semibold text-[#b04a15] no-underline hover:underline dark:text-[#e07b3a]">
          <UiText>View all campaigns</UiText> →
        </Link>
      </div>
      <div className={`grid grid-cols-1 gap-6 ${more.length ? "lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]" : ""}`}>
        <SahasCard c={first} locale={locale} />
        {more.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1">
            {more.map((c) => <SahasCard key={c.slug} c={c} locale={locale} compact />)}
          </div>
        )}
      </div>
    </section>
  );
}
