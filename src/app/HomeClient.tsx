"use client";

/**
 * HomeClient — landing page orchestrator.
 *
 * WHY SPLIT?
 * The original file was 900+ lines — one giant component mixing hero images,
 * stats bars, in-kind cards, "how it works", mobile views, and CTAs. That made
 * it hard to find bugs, add features, or understand what any section does.
 *
 * HOW IT'S NOW STRUCTURED:
 *   src/components/home/
 *     HeroSection.tsx         — shared responsive front door + category rail
 *     StatsBars.tsx           — desktop stats row + live activity ticker
 *     ItemDonationScrolly.tsx — scroll-scrubbed film hero ("How it works")
 *     CTASection.tsx          — bottom "Get started" CTA (hidden when logged in)
 *
 * This file keeps only:
 *   1. State (campaigns, stats, requests, listings, activity)
 *   2. Shared responsive hero (rendered once before both legacy branches)
 *   3. Desktop layout wrapper (imports the sections above)
 *   4. Mobile layout (still inline — ~200 lines — a future task can extract it too)
 */

import { useEffect, useState, useMemo } from "react";


import { useTranslations } from "next-intl";


import { LatestActiveCampaignsSection } from "@/components/CampaignCarousel";
import { BeTheChangeSection } from "@/components/BeTheChangeSection";
import { DonateBand } from "@/components/donate/DonateBand";
import { ComingSoonMagnets } from "@/components/ComingSoonMagnets";
import { useAuth } from "@/hooks/useAuth";



import { Sparkles, Heart, Coins, Users } from "lucide-react";
import { FEATURES } from "@/lib/features";
import { IndependenceDayStrip } from "@/components/IndependenceDayStrip";
import { RakshaBandhanStrip } from "@/components/RakshaBandhanStrip";
import { RakshaBandhanIntro } from "@/components/RakshaBandhanIntro";


import type { Campaign, ItemRequest, PlatformStats, PublicItemRequest, RecentActivity } from "@/lib/api";
import { isRakshaBandhanCampaignActive, longestWaiting } from "@/lib/raksha-bandhan";
import { UnclaimedSection } from "@/components/home/UnclaimedSection";
import {
  getMyProfile,
  getItemRequests,
  type UserProfile,
} from "@/lib/api";


// ── Extracted section components ─────────────────────────────────────────────
import { HeroSection } from "@/components/home/HeroSection";
import { DesktopStatsBar, LiveTicker } from "@/components/home/StatsBars";
import { LiveNeedsSection } from "@/components/home/LiveNeedsSection";
import AudiencePathwaysSection from "@/components/audience-pathways/AudiencePathwaysSection";
import { MobileVisualStory } from "@/components/home/MobileVisualStory";

import { ItemDonationScrolly } from "@/components/home/ItemDonationScrolly";
import { CTASection } from "@/components/home/CTASection";













// DiyaDecoration is exported from this module too, and is deliberately not
// imported here: nothing on the page places a lamp yet, and an import with no
// call site is the kind of thing that survives three refactors before anyone
// checks whether it was ever meant to render.




// ── Helpers ───────────────────────────────────────────────────────────────────



const MOBILE_CATEGORY_IMAGES: Record<string, string[]> = {
  Medical: ["/images/medical-1.webp", "/images/medical-2.webp"],
  Education: ["/images/hero-7.webp"],
  Livelihood: ["/images/hero-3.webp"],
  Community: ["/images/hero-6.webp"],
};


function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371, dLat = ((lat2 - lat1) * Math.PI) / 180, dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HomeClient({
  initialCampaigns,
  initialStats,
  initialActivity,
  initialItemRequests,
  initialPublicRequests = [],
  fulfilledNeeds = [],
}: {
  initialCampaigns: Campaign[];
  initialStats: PlatformStats | null;
  initialActivity: RecentActivity[];
  initialItemRequests: ItemRequest[];
  /**
   * The guest-browsable need board. Everything on it is unclaimed by
   * construction — a request reaches PUBLIC_REQUEST status only after private
   * matching failed — which is what the Raksha Bandhan surfaces rely on.
   * Defaults to empty so the prop is additive and every existing caller and
   * test keeps working untouched.
   */
  initialPublicRequests?: PublicItemRequest[];
  fulfilledNeeds?: import("@/lib/api").FulfilledNeedSummary[];
}) {
  const t = useTranslations("landing");
  const tCommon = useTranslations("common");
  const { user, isRestoring } = useAuth();

  /**
   * The donor/donee signup pathways are guest-only.
   *
   * <p><b>Waits for storage, not for the network.</b> `useAuth` starts at
   * `{ user: null }` and only then hydrates from `localStorage["ck_user"]`, so
   * testing `!user` alone renders "Join as a donor" to someone already signed
   * in and takes it away a moment later. `isRestoring` closes that window.
   *
   * <p>It must NOT be `isLoading`. That flag is deliberately asymmetric — with
   * no cached user it stays true until `/api/v1/users/me` answers, and that
   * call wakes the deliberately cold Neon pool. Gating on it meant a guest saw
   * the pre-Doors page for seconds and then watched it rearrange, which is the
   * same bug the hero's primary CTA had. Guests are exactly who this is for.
   *
   * <p>The cost is the same one the hero accepts: someone holding a valid
   * cookie but empty storage sees signup CTAs for a beat before their role
   * resolves. That is a visible correction, not a redirect, and it corrects
   * itself. See the two-flag table in `useAuth`.
   *
   * <p>Any authenticated user hides it, not just DONOR and DONEE. Role strings
   * circulate in both `ROLE_`-prefixed and bare forms (see `normalizeRole`), and
   * a role-by-role check would quietly start showing signup CTAs to whichever
   * role is added next.
   */
  const showAudiencePathways = !isRestoring && user === null;



  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [itemRequests, setItemRequests] = useState<ItemRequest[]>(initialItemRequests);
  const [stats, setStats] = useState<PlatformStats | null>(initialStats);
  const [activity, setActivity] = useState<RecentActivity[]>(initialActivity);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tStats = useTranslations("stats");
  const statItems = useMemo(() => [
    { value: stats ? `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(stats.totalRaised)}` : "₹5,652", label: tStats("totalRaised"), icon: Coins, color: "text-[#b04a15]" },
    { value: stats ? stats.activeCampaigns : "3", label: tStats("activeCampaigns"), icon: Heart, color: "text-[#c2660a]" },
    { value: stats ? stats.totalDonations : "24", label: tStats("donations"), icon: Sparkles, color: "text-[#1e3a60]" },
    { value: stats ? stats.uniqueDonors : "18", label: tStats("donors"), icon: Users, color: "text-amber-700" },
  ], [stats, tStats]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);

  // Item requests are private inventory (auth required) — the server-side render
  // above can't attach the httpOnly cookie, so `initialItemRequests` is always
  // empty. Re-fetch client-side once a logged-in user's cookie is available.
  useEffect(() => {
    if (!user) return;
    getItemRequests().then(setItemRequests).catch(() => { });
  }, [user]);

  useEffect(() => {
    const handleFilter = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.category) {
        setSelectedCategory(detail.category);
        try {
          const profile = await getMyProfile();
          setMyProfile(profile);
        } catch (err) { }

        // Scroll slightly after state updates
        setTimeout(() => {
          document.getElementById("inkind-requests-section")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    };
    window.addEventListener("filter-home-requests", handleFilter);
    return () => window.removeEventListener("filter-home-requests", handleFilter);
  }, []);

  const displayedRequests = useMemo(() => {
    let out = itemRequests;
    if (selectedCategory) {
      out = out.filter(r => r.category === selectedCategory);
      if (myProfile?.latitude && myProfile?.longitude) {
        const lat = myProfile.latitude;
        const lon = myProfile.longitude;
        out = [...out].sort((a, b) => {
          const dA = a.latitude && a.longitude ? haversineKm(lat, lon, a.latitude, a.longitude) : 99999;
          const dB = b.latitude && b.longitude ? haversineKm(lat, lon, b.latitude, b.longitude) : 99999;
          return dA - dB;
        });
      }
    }
    return out;
  }, [itemRequests, selectedCategory, myProfile]);

  // ── Raksha Bandhan ────────────────────────────────────────────────────────
  //
  // One switch, read once here and handed down, so the hero thread, the need at
  // the end of it and the section below can never disagree about whether the
  // campaign is on.
  const rakshaBandhan = isRakshaBandhanCampaignActive();

  

  // The single need that has gone unclaimed longest. It ends the hero's thread,
  // and is excluded from the section below so the same request does not appear
  // twice within one screen of itself.
  const longestWaitingRequest = useMemo(
    () => (rakshaBandhan ? longestWaiting(initialPublicRequests, 1)[0] ?? null : null),
    [rakshaBandhan, initialPublicRequests],
  );


  return (
    <div className={`ck-home-page bg-[#fbf9f4] dark:bg-[#09090b] text-stone-900 dark:text-stone-100 min-h-[100svh] overflow-x-clip transition-colors duration-300`}>
      
      

      {/* Full-screen Raksha Bandhan intro. Mounted here rather than in the
          root layout, which is what makes it homepage-only — HomeClient renders
          on "/" and nowhere else, so login, dashboard, requests, profile and
          admin never see it. Renders null (and never fetches the video) on
          every day but 28 August 2026 IST. */}
      <RakshaBandhanIntro />

      <IndependenceDayStrip />
      <RakshaBandhanStrip />
      
      <div className="hidden lg:block">
        
      </div>

      {/* One responsive front door. Keeping it outside the two legacy layout
          trees prevents CTA, image and tour-anchor drift between breakpoints. */}
      <HeroSection />

      {/* ════════════════════════════════════════════════════════════
          DESKTOP VIEW  (lg:block)
          Each section is its own extracted component — edit the
          file in src/components/home/ to change that section.
      ════════════════════════════════════════════════════════════ */}
      {/* One paper for the whole desktop page. Sections are transparent over
          it — see PageSection for why they no longer bring their own. */}
      <div className="ck-home-paper hidden lg:block relative z-10">
        {/* Mobile stats strip (inside desktop wrapper but sm:hidden) */}
        {FEATURES.money && (
          <div className="sm:hidden overflow-hidden border-b border-[var(--ck-home-surface,#ffedd5)] bg-white dark:bg-zinc-950">
            <div className="stats-ticker-track py-3.5">
              {[0, 1].map(copy => (
                <div key={copy} className="flex items-center shrink-0">
                  {statItems.map(s => (
                    <div key={s.label} className="flex items-center gap-2 px-5">
                      <s.icon className={`h-4 w-4 shrink-0 ${s.color}`} />
                      <span className="text-stone-900 dark:text-stone-100 font-black text-sm tabular-nums">{s.value}</span>
                      <span className="text-stone-500 font-bold text-3xs uppercase tracking-wider whitespace-nowrap">{s.label}</span>
                      <span className="text-stone-200 dark:text-zinc-700 ml-3 select-none">·</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats bar + live ticker — only when money feature enabled */}
        {FEATURES.money && (
          <>
            <DesktopStatsBar stats={stats} />
            <LiveTicker activity={activity} />
          </>
        )}


        {/* "What We Provide" — 2-step dark section. Second on the page, right
            after the hero: it is the one section that explains what actually
            happens here, so it earns the position before the visitor is asked
            to look at open needs. */}
        <ItemDonationScrolly />

        {/* Donor / Donee pathways — the two sides of the platform, each with a
            role-preselecting signup CTA. Third on the page, so the visitor is
            told which side they are on before being shown the board.
            ("Why CauseKind" used to follow this and was removed on 2026-08-21:
            it advertised fundraising, which FEATURES.money gates off, and
            repeated three claims the Be the Change band already makes.)

            Guest-only, and gated in both responsive trees — see the mobile copy
            below. Asking someone who is already signed in to "Join as a donor"
            is the whole reason for the condition. */}
        {showAudiencePathways && (
          <>
            <AudiencePathwaysSection />
          </>
        )}


        {/* Live Needs section — real verified needs across multiple categories */}
        <LiveNeedsSection initialRequests={initialPublicRequests} stats={stats} />

        {/* Money donation. Placed after the needs board on purpose: the visitor
            has just seen what people actually need, which is the moment the ask
            makes sense. Hidden for donees by the .ck-donate-band rule. */}
        <div className="mx-auto w-full max-w-[1200px] px-6 py-10">
          <DonateBand />
        </div>

        {/* Latest campaigns carousel */}
        {FEATURES.money && (
          <>
            <LatestActiveCampaignsSection campaigns={campaigns} loading={loading} error={error} />
          </>
        )}

        {/* In-Kind Requests section — hidden from landing page; shown only via WelcomeOverlay filter */}
        

        {/* The needs nobody has taken, oldest first. Above "Be the Change" on
            purpose: that section is the argument for giving, and this one is the
            specific unmet request the argument is about. */}
        {rakshaBandhan && (
          <UnclaimedSection
            requests={initialPublicRequests}
            excludeId={longestWaitingRequest?.id ?? null}
          />
        )}


        {/* "Be the Change" feature cards */}
        <BeTheChangeSection />



        {/* Coming soon magnets */}
        <ComingSoonMagnets />



        {/* Bottom CTA — hidden when logged in */}
        
        <CTASection />

        
        
      </div>

      {/* Mobile-only story sections; the shared hero stays above both layouts. */}
      <MobileVisualStory requests={initialPublicRequests} fulfilledNeeds={fulfilledNeeds} />
    </div>
  );
}
