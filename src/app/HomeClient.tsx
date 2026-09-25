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

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { Reveal } from "@/components/Reveal";
import { LatestActiveCampaignsSection } from "@/components/CampaignCarousel";
import { BeTheChangeSection } from "@/components/BeTheChangeSection";
import { ComingSoonMagnets } from "@/components/ComingSoonMagnets";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Sparkles,
  Heart,
  HandCoins,
  Coins,
  Users,
  ArrowRight,
  ShieldCheck,
  Check,
  Clock,
} from "lucide-react";
import { FEATURES } from "@/lib/features";
import { IndependenceDayStrip } from "@/components/IndependenceDayStrip";
import { RakshaBandhanStrip } from "@/components/RakshaBandhanStrip";
import { RakshaBandhanIntro } from "@/components/RakshaBandhanIntro";

import type { Campaign, InKindStats, ItemRequest, PlatformStats, PublicItemRequest, RecentActivity } from "@/lib/api";
import { isRakshaBandhanCampaignActive, longestWaiting } from "@/lib/raksha-bandhan";
import { UnclaimedSection } from "@/components/home/UnclaimedSection";
import {
  getMyProfile,
  getItemRequests,
  type UserProfile,
} from "@/lib/api";
import { toast } from "@/lib/toast";

// ── Extracted section components ─────────────────────────────────────────────
import { HeroSection } from "@/components/home/HeroSection";
import { DesktopStatsBar, LiveTicker } from "@/components/home/StatsBars";
import { LiveNeedsSection } from "@/components/home/LiveNeedsSection";
import AudiencePathwaysSection from "@/components/audience-pathways/AudiencePathwaysSection";
import { MobileDoors, useLandingDoor } from "@/components/audience-pathways/MobileDoors";
import DoneeDoorEvidence from "@/components/audience-pathways/DoneeDoorEvidence";
import { ItemDonationScrolly } from "@/components/home/ItemDonationScrolly";
import { CTASection } from "@/components/home/CTASection";
import { InKindProof } from "@/components/home/InKindProof";
import { TheGapSection } from "@/components/home/TheGapSection";


// The parked landing film (FEATURES.cinematicLanding). A dynamic import so that
// while it is switched off, none of its code or SVG ships with the home page.
const CinematicOrchestrator = dynamic(() =>
  import("@/components/cinematic/CinematicOrchestrator").then((m) => m.CinematicOrchestrator),
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

const MOBILE_CATEGORY_IMAGES: Record<string, string[]> = {
  Medical: ["/images/medical-1.webp", "/images/medical-2.webp"],
  Education: ["/images/hero-7.webp"],
  Livelihood: ["/images/hero-3.webp"],
  Community: ["/images/hero-6.webp"],
};
function getMobileCardImage(category: string, id: number): string {
  const imgs = MOBILE_CATEGORY_IMAGES[category];
  return imgs?.length ? imgs[id % imgs.length] : "/images/hero-1.webp";
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371, dLat = ((lat2 - lat1) * Math.PI) / 180, dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HomeClient({
  initialCampaigns,
  initialStats,
  initialInKindStats = null,
  initialActivity,
  initialItemRequests,
  initialPublicRequests = [],
}: {
  initialCampaigns: Campaign[];
  initialStats: PlatformStats | null;
  /**
   * Real in-kind counts (items listed, needs posted, verified handovers) from
   * `/api/v1/stats/in-kind`. Optional and defaulting to null so every existing
   * caller and test keeps working; the proof section renders nothing when it is
   * null rather than showing zeros it cannot vouch for.
   */
  initialInKindStats?: InKindStats | null;
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

  /*
    Which door a guest picked on the mobile landing. Drives what renders below
    the switcher there; the desktop tree ignores it entirely.

    `doorIsDonor` collapses the two cases a section actually cares about: a
    signed-in visitor has no doors at all and keeps today's page, so everything
    donor-facing renders for them unconditionally.
  */
  const { door, pick: pickDoor } = useLandingDoor();

  // Development-only preview of the parked film: /?cinematic
  const [cinematicPreview, setCinematicPreview] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    setCinematicPreview(new URLSearchParams(window.location.search).has("cinematic"));
  }, []);
  const showCinematic = FEATURES.cinematicLanding || cinematicPreview;
  const doorIsDonor = !showAudiencePathways || door === "donor";

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

  const HeroComponent = HeroSection;
  const LiveNeedsComponent = LiveNeedsSection;
  const ComingSoonComponent = ComingSoonMagnets;
  const CTAComponent = CTASection;
  const AudiencePathwaysComponent = AudiencePathwaysSection;
  const MobileDoorsComponent = MobileDoors;
  const DoneeDoorEvidenceComponent = DoneeDoorEvidence;

  // The single need that has gone unclaimed longest. It ends the hero's thread,
  // and is excluded from the section below so the same request does not appear
  // twice within one screen of itself.
  const longestWaitingRequest = useMemo(
    () => (rakshaBandhan ? longestWaiting(initialPublicRequests, 1)[0] ?? null : null),
    [rakshaBandhan, initialPublicRequests],
  );


  return (
    <div className="ck-home-page bg-[#fbf9f4] dark:bg-[#09090b] text-stone-900 dark:text-stone-100 min-h-[100svh] overflow-x-clip transition-colors duration-300">
      {/* Full-screen Raksha Bandhan intro. Mounted here rather than in the
          root layout, which is what makes it homepage-only — HomeClient renders
          on "/" and nowhere else, so login, dashboard, requests, profile and
          admin never see it. Renders null (and never fetches the video) on
          every day but 28 August 2026 IST. */}
      <RakshaBandhanIntro />

      <IndependenceDayStrip />
      <RakshaBandhanStrip />
      {/* One responsive front door. Keeping it outside the two legacy layout
          trees prevents CTA, image and tour-anchor drift between breakpoints. */}
      <HeroComponent />

      {/* The landing film — parked behind FEATURES.cinematicLanding (off).
          Mounted once, outside both responsive trees: it pins and scrubs its
          own stage at every width, and a hidden second copy would still
          create pinned triggers that skew every scroll position after it.

          The wavy four-step How-it-works section (HowCauseKindWorks) used to
          follow it and was taken off the page on 2026-09-25; its file is kept. */}
      {showCinematic && <CinematicOrchestrator />}

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


        {/* ── The evidence, after the film ───────────────────────────────
            The cinematic chapters above make the argument with a story; what
            follows is the same argument made with live data:

              1. The gap      — real needs that have waited longest
              2. Live needs   — the board those rows come from
              3. Pathways     — which side of it the visitor is on (guests)
              4. Proof        — the three real in-kind counts

            These were dropped from the desktop tree when the cinematic
            orchestrator was first added (2026-09-24), which left the desktop
            page ending on the film with no board, no signup path and no CTA.
            ItemDonationScrolly — the older frame-sequence film — is not
            restored: two films back to back is one too many. */}
        <TheGapSection requests={initialPublicRequests} />

        <LiveNeedsComponent initialRequests={initialPublicRequests} stats={stats} />

        {/* Donor / Donee pathways — guest-only, and desktop-only: the mobile
            tree has MobileDoors instead. Asking someone already signed in to
            "Join as a donor" is the whole reason for the condition. */}
        {showAudiencePathways && <AudiencePathwaysComponent />}

        <InKindProof stats={initialInKindStats} />

        {FEATURES.money && (
          <LatestActiveCampaignsSection campaigns={campaigns} loading={loading} error={error} />
        )}

        {/* The needs nobody has taken, oldest first. */}
        {rakshaBandhan && (
          <UnclaimedSection
            requests={initialPublicRequests}
            excludeId={longestWaitingRequest?.id ?? null}
          />
        )}

        <BeTheChangeSection />

        <ComingSoonComponent />

        {/* Bottom CTA — hidden when logged in */}
        <CTAComponent />
      </div>

      {/* ════════════════════════════════════════════════════════════
          MOBILE VIEW  (lg:hidden)
      ════════════════════════════════════════════════════════════ */}
      {/* `pt-11` matches this column's own `gap-11`: the join between the
          previous section and whatever follows it is a section join like every
          other one. */}
      {/* `overflow-x-clip`, never `overflow-x-hidden`. They clip identically,
          but `hidden` on one axis drags the other one with it: CSS will not let
          a box be `hidden` across and `visible` down, so `overflow-y` computes
          to `auto` and this column silently becomes its own scroll container —
          a 100vh-tall one, wrapping the whole mobile page. The footer's `-mb-2`
          then lands 8px past its content box, which is the entire scroll range,
          so a swipe anywhere over this column moved the doors 8px and stopped
          before the page itself would take the gesture. `clip` leaves
          `overflow-y: visible` alone, so nothing here scrolls and the
          horizontal bleed is still clipped exactly as before. */}
      <div className="lg:hidden relative min-h-screen px-5 flex flex-col gap-11 overflow-x-clip pt-11 bg-[#fbf9f4] dark:bg-zinc-950">

        {/* Mobile stats ticker — Dark mode fix: bg stays terracotta, text white.

            `-mt-9` pulls it back up against the hero. This bar is chrome, not a
            section — full-bleed terracotta, it belongs flush under the hero
            rather than 44px below it on a strip of cream. It cancels the
            column's `pt-11` back to the 8px this join used to have. Dead today
            (`money` is off) but correct the moment that flag flips. */}
        {FEATURES.money && (
          <div className="overflow-hidden bg-[var(--ck-home-accent,#b04a15)] -mx-5 -mt-9">
            <div className="animate-stats-ticker flex gap-0 whitespace-nowrap py-2">
              {[0, 1].map(copy => (
                <div key={copy} className="flex items-center gap-8 px-4 shrink-0">
                  {statItems.map(item => (
                    <span key={item.label + copy} className="flex items-center gap-2 text-white">
                      <item.icon className="w-3.5 h-3.5 opacity-80" />
                      <span className="text-xs font-bold">{item.value}</span>
                      <span className="text-3xs opacity-75 font-medium">{item.label}</span>
                      <span className="opacity-40 mx-2">·</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Doors — the guest spine. One question, two cards, then a switcher;
            everything after this point is the answer to it.

            This replaces AudiencePathwaysSection in the mobile tree only. The
            desktop tree still renders that section in its old position, and a
            signed-in visitor still gets today's page in both trees — the donor
            and donee variants are a separate piece of work. */}
        {showAudiencePathways && <MobileDoorsComponent door={door} pick={pickDoor} />}

        {/* The donee door's evidence. The one genuinely new surface here:
            everything else below the hero is donor-facing, so a visitor who
            says "I need something" had nothing to read. */}
        {showAudiencePathways && door === "donee" && <DoneeDoorEvidenceComponent />}

        {/* Live Needs — the donor door's first piece of evidence, so it leads
            now rather than sitting below the campaigns rail.
            No bleed wrapper below lg: the section drops its own horizontal
            padding and background at this width (see LiveNeedsSection), so it
            sits on this column's px-5 gutter like everything else. */}
        {doorIsDonor && (
          <LiveNeedsComponent initialRequests={initialPublicRequests} stats={stats} />
        )}

        {/* Where support goes, and the three real counts.
            Both doors get these, deliberately — "what happens after I hand it
            over" and "has this actually worked before" are the two questions a
            recipient asks as hard as a donor does, and neither had an answer on
            the mobile page.

            TheGapSection is desktop-only on purpose. Its argument is "look at
            these unclaimed needs", which MobileDoors and the live board above
            already make at this width; adding it here would be the fourth
            surface saying the same thing, which is the exact mistake the Be the
            Change and Coming Soon notes below record having already fixed.

            The film stays desktop-only too — it always was. It lives in a
            `hidden lg:block` tree and its 598-frame set is desktop-sized, so
            mobile has never paid for it and still does not. */}
        <InKindProof stats={initialInKindStats} />

        {/* Mobile Campaigns horizontal scroll */}
        {FEATURES.money && doorIsDonor && (
          <>
            <section className="space-y-4 relative">
              {/* One header shape, shared with every other mobile section: a
                short rule, an eyebrow, then a 24px title. This one used to be
                16px while its neighbours were 30px, which is most of why the
                stack read as unrelated pages. */}
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="h-0.5 w-[22px] shrink-0 rounded-full bg-[var(--ck-home-accent,#b04a15)]" />
                  <span className="text-3xs font-extrabold uppercase tracking-[0.16em] text-[var(--ck-home-ink,#b04a15)]">
                    <TranslatedText text="Money campaigns" />
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <h2 className="text-2xl font-black tracking-tight leading-[1.2] text-stone-850 dark:text-stone-100">
                    <TranslatedText text="Latest Active Campaigns" />
                  </h2>
                  <Link href="/campaigns" className="shrink-0 pb-1 text-3xs font-extrabold text-[var(--ck-home-ink,#b04a15)] uppercase tracking-wider hover:underline">
                    <TranslatedText text="Browse All" /> →
                  </Link>
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 -mr-5 scrollbar-none snap-x snap-mandatory">
                {loading && <div className="flex justify-center py-10 w-full"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--ck-home-accent,#b04a15)]/20 border-t-[var(--ck-home-accent,#b04a15)]" /></div>}
                {!loading && campaigns.slice(0, 5).map(campaign => {
                  const pct = Math.min(100, Math.round((campaign.amountRaised / campaign.targetAmount) * 100));
                  return (
                    <div key={campaign.id} className="bg-white dark:bg-zinc-900 rounded-[1.25rem] p-3.5 border border-[var(--ck-home-soft,#e8e2d5)] dark:border-zinc-800 flex gap-3.5 w-[310px] sm:w-[325px] snap-start shrink-0">
                      <div className="w-[100px] flex-shrink-0 flex flex-col justify-start">
                        <div className="relative h-18 w-full rounded-xl overflow-hidden bg-stone-100 dark:bg-zinc-950">
                          <Image src={campaign.imageUrl || getMobileCardImage(campaign.category, campaign.id)} alt={campaign.title} fill className="object-contain object-center" sizes="100px" />
                        </div>
                        <p className="text-3xs font-black text-stone-800 dark:text-stone-100 mt-2 line-clamp-2 leading-snug"><TranslatedText text={campaign.title} /></p>
                      </div>
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <h4 className="text-2xs font-black text-stone-850 dark:text-stone-100 leading-snug truncate"><TranslatedText text={campaign.title} /></h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {[campaign.city, campaign.category].map(t => (
                            <span key={t} className="bg-[var(--ck-home-surface,#faf1e1)] dark:bg-zinc-850 text-[var(--ck-home-ink,#b04a15)] dark:text-[var(--ck-home-highlight,#fb923c)] font-extrabold text-5xs px-1.5 py-0.5 rounded tracking-wider uppercase"><TranslatedText text={t} /></span>
                          ))}
                        </div>
                        <div className="mt-2.5 space-y-1">
                          <div className="flex justify-between items-center text-4xs font-extrabold text-stone-400 uppercase">
                            <span>Progress</span><span className="text-[var(--ck-home-ink,#b04a15)]">{pct}% Funded</span>
                          </div>
                          <div className="w-full bg-stone-100 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
                            <div className="bg-[var(--ck-home-accent,#b04a15)] h-full rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-4xs text-stone-500 dark:text-stone-400 font-extrabold mt-1">₹{formatINR(campaign.amountRaised)} of ₹{formatINR(campaign.targetAmount)}</p>
                        </div>
                        <Link href={`/campaigns/${campaign.id}`} className="block w-full mt-2.5">
                          <button className="w-full bg-[var(--ck-home-accent,#b04a15)] hover:bg-[var(--ck-home-hover,#963c0d)] text-white font-extrabold py-2 rounded-lg text-4xs tracking-wide uppercase transition-all shadow-sm active:scale-95"><TranslatedText text="Donate Now" /></button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* The needs nobody has taken. Repeated here rather than shared, because
            HomeClient keeps two separate trees and a component placed in one is
            simply absent from the other — the mistake the pathways section
            below records having made. The section's own grid collapses to a
            single column at this width. */}
        {rakshaBandhan && doorIsDonor && (
          <UnclaimedSection
            requests={initialPublicRequests}
            excludeId={longestWaitingRequest?.id ?? null}
          />
        )}

        {/* Be the Change — cut from the guest page. It restates "here are needs
            and here is proof", which the doors and the live board already do;
            leaving it in is how the mobile stack got to four sections saying
            the same two things. Signed-in visitors keep it until their own
            layout is designed. */}
        {!showAudiencePathways && <BeTheChangeSection tourAnchors />}

        {/* AudiencePathwaysSection used to sit here, guest-only. MobileDoors
            took its job at the top of this tree and its `tourAnchors` with it,
            so rendering it again would put the same two signup CTAs on the page
            twice. The desktop tree still renders it in its own position. */}


        {/* Coming soon magnets — previously desktop-only. The section sizes
            itself down through its own CSS vars, so the same component serves
            both branches rather than a mobile-specific copy. Below lg it zeroes
            --ck-magnets-pad and drops its background, so it aligns to this
            column's px-5 gutter with no bleed wrapper.

            Cut from the guest page for the same reason as Be the Change: it is
            a fourth restatement of what the doors and the board already say.
            Signed-in visitors keep it. */}
        {!showAudiencePathways && <ComingSoonComponent />}

      </div>
    </div>
  );
}
