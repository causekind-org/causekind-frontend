"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { superAdminFundraising, type SaFrSetting } from "@/lib/api";
import { saTheme } from "@/components/super-admin/saTheme";
import { FR_TABS, Pill, type FrTab } from "./shared";
import { FrOverview } from "./FrOverview";
import { FrCampaigns } from "./FrCampaigns";
import { FrCampaignDetail } from "./FrCampaignDetail";
import { FrApplications } from "./FrApplications";
import { FrDonations } from "./FrDonations";
import { FrReviews } from "./FrReviews";
import { FrSettings } from "./FrSettings";

/**
 * Super-admin Fundraisers section (layout approved 2026-10-26, design canvas
 * "Super Admin Fundraisers Layout"). Its own nav item; the older generic
 * "Campaigns" table is left as it was.
 */
export function FundraisersPanel({ isDark }: { isDark: boolean }) {
  const t = saTheme(isDark);
  const [tab, setTab] = useState<FrTab>("overview");
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [enabled, setEnabled] = useState<boolean | null>(null);

  const loadSwitch = useCallback(() => {
    superAdminFundraising.settings()
      .then((s: SaFrSetting[]) => setEnabled(s.find((x) => x.key === "fundraising.switch_enabled")?.value !== "false"))
      .catch(() => setEnabled(null));
  }, []);
  useEffect(() => { loadSwitch(); }, [loadSwitch]);

  const go = (next: FrTab) => { setTab(next); setCampaignId(null); };
  const openCampaign = (id: number) => { setTab("campaigns"); setCampaignId(id); };
  const openApplication = (id: number) => { setTab("applications"); setApplicationId(id); setCampaignId(null); };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={`text-[26px] font-extrabold ${t.heading}`}>Fundraisers</h1>
          <p className={`mt-1 text-sm ${t.muted}`}>Every application, campaign, donation and report in one place. Edits are audit-logged.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {enabled != null && <Pill tone={enabled ? "ok" : "danger"}>{enabled ? "Fundraising ON" : "Fundraising OFF"}</Pill>}
          <form onSubmit={(e) => { e.preventDefault(); go("campaigns"); }}
            className={`flex w-full min-w-0 items-center gap-2 rounded-xl border px-3 sm:w-[300px] ${t.input}`}>
            <Search className={`h-4 w-4 shrink-0 ${t.dim}`} aria-hidden="true" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search fundraisers"
              placeholder="Search campaign, donee, city, #ID…" className="min-h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </form>
        </div>
      </header>

      <nav className={`flex gap-1 overflow-x-auto border-b ${t.cardFlat}`} aria-label="Fundraiser tabs">
        {FR_TABS.map((x) => (
          <button key={x.key} type="button" onClick={() => go(x.key)} aria-current={tab === x.key ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm ${tab === x.key ? `${t.tabActive} font-semibold` : t.tabInactive}`}>
            {x.label}
          </button>
        ))}
      </nav>

      {tab === "overview" && <FrOverview t={t} onGo={go} onOpenCampaign={openCampaign} />}
      {tab === "campaigns" && (campaignId == null
        ? <FrCampaigns t={t} search={search} onSearch={setSearch} onOpen={setCampaignId} />
        : <FrCampaignDetail t={t} id={campaignId} onBack={() => setCampaignId(null)} onOpenApplication={openApplication} />)}
      {tab === "applications" && <FrApplications t={t} focusId={applicationId} onOpenCampaign={openCampaign} />}
      {tab === "donations" && <FrDonations t={t} onOpenCampaign={openCampaign} />}
      {tab === "reviews" && <FrReviews t={t} onOpenCampaign={openCampaign} />}
      {tab === "settings" && <FrSettings t={t} onSaved={loadSwitch} />}
    </div>
  );
}
