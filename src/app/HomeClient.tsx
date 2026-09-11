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
import { Sparkles, Heart, HandCoins, Coins, Users, ArrowRight } from "lucide-react";
import { FEATURES } from "@/lib/features";
import { IndependenceDayStrip } from "@/components/IndependenceDayStrip";
import { RakshaBandhanStrip } from "@/components/RakshaBandhanStrip";
import { RakshaBandhanIntro } from "@/components/RakshaBandhanIntro";

import type { Campaign, ItemRequest, PlatformStats, PublicItemRequest, RecentActivity } from "@/lib/api";
import { isRakshaBandhanCampaignActive, longestWaiting } from "@/lib/raksha-bandhan";
import { UnclaimedSection } from "@/components/home/UnclaimedSection";
import { getMyProfile, getItemRequests, type UserProfile } from "@/lib/api";

// ── Extracted section components ─────────────────────────────────────────────
import { HeroSection }           from "@/components/home/HeroSection";
import { DesktopStatsBar, LiveTicker } from "@/components/home/StatsBars";
import { LiveNeedsSection }      from "@/components/home/LiveNeedsSection";
import AudiencePathwaysSection   from "@/components/audience-pathways/AudiencePathwaysSection";
import { MobileDoors, useLandingDoor } from "@/components/audience-pathways/MobileDoors";
import DoneeDoorEvidence      from "@/components/audience-pathways/DoneeDoorEvidence";
import { ItemDonationScrolly }   from "@/components/home/ItemDonationScrolly";
import { CTASection }            from "@/components/home/CTASection";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

const MOBILE_CATEGORY_IMAGES: Record<string, string[]> = {
  Medical:    ["/images/medical-1.webp", "/images/medical-2.webp"],
  Education:  ["/images/hero-7.webp"],
  Livelihood: ["/images/hero-3.webp"],
  Community:  ["/images/hero-6.webp"],
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
  initialActivity,
  initialItemRequests,
  initialPublicRequests = [],
}: {
  initialCampaigns:    Campaign[];
  initialStats:        PlatformStats | null;
  initialActivity:     RecentActivity[];
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
  const t       = useTranslations("landing");
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
  const doorIsDonor = !showAudiencePathways || door === "donor";

  const [campaigns,    setCampaigns]    = useState<Campaign[]>(initialCampaigns);
  const [itemRequests, setItemRequests] = useState<ItemRequest[]>(initialItemRequests);
  const [stats,        setStats]        = useState<PlatformStats | null>(initialStats);
  const [activity,     setActivity]     = useState<RecentActivity[]>(initialActivity);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);

  // Item requests are private inventory (auth required) — the server-side render
  // above can't attach the httpOnly cookie, so `initialItemRequests` is always
  // empty. Re-fetch client-side once a logged-in user's cookie is available.
  useEffect(() => {
    if (!user) return;
    getItemRequests().then(setItemRequests).catch(() => {});
  }, [user]);

  useEffect(() => {
    const handleFilter = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.category) {
        setSelectedCategory(detail.category);
        try {
          const profile = await getMyProfile();
          setMyProfile(profile);
        } catch (err) {}
        
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

  const statItems = [
    { value: stats ? `₹${formatINR(stats.totalRaised)}` : "—", label: useTranslations("stats")("totalRaised"),    icon: Coins,    color: "text-[var(--ck-home-ink,#b04a15)]" },
    { value: stats ? stats.activeCampaigns               : "—", label: useTranslations("stats")("activeCampaigns"), icon: Heart,    color: "text-[var(--ck-home-ink,#b04a15)]" },
    { value: stats ? stats.totalDonations                : "—", label: useTranslations("stats")("donations"),       icon: Sparkles, color: "text-[var(--ck-home-ink,#b04a15)]" },
    { value: stats ? stats.uniqueDonors                  : "—", label: useTranslations("stats")("donors"),          icon: Users,    color: "text-[var(--ck-home-ink,#b04a15)]" },
  ];

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
      <HeroSection />

      {/* ════════════════════════════════════════════════════════════
          DESKTOP VIEW  (lg:block)
          Each section is its own extracted component — edit the
          file in src/components/home/ to change that section.
      ════════════════════════════════════════════════════════════ */}
      {/* One paper for the whole desktop page. Sections are transparent over
          it — see PageSection for why they no longer bring their own. */}
      <div className="hidden lg:block bg-[var(--surface-cream,#faf8f5)] dark:bg-zinc-950 relative z-10">
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

        {/* Latest campaigns carousel */}
        {FEATURES.money && (
          <>
            <LatestActiveCampaignsSection campaigns={campaigns} loading={loading} error={error} />
          </>
        )}

        {/* In-Kind Requests section — hidden from landing page; shown only via WelcomeOverlay filter */}
        {false && (loading || itemRequests.length > 0) && (
          <section id="inkind-requests-section" className="bg-white dark:bg-zinc-900 border-b border-[var(--ck-home-surface,#ffedd5)]/35 dark:border-stone-850 py-20">
            <div className="mx-auto max-w-7xl px-6">
              <Reveal className="mb-14">
                <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-end">
                  <div>
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-2xs font-black uppercase tracking-widest text-[var(--ck-home-ink,#b04a15)]">In-Kind Giving</span>
                      <span className="h-px flex-1 bg-[var(--ck-home-accent,#b04a15)]/20" />
                    </div>
                    <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-stone-900 dark:text-white leading-[1.05]">
                      {selectedCategory ? `${selectedCategory} Needs Near You` : t("inkindSection.title")}
                    </h2>
                    <p className="text-base text-stone-500 dark:text-stone-400 font-medium mt-3 max-w-xl">
                      {selectedCategory ? `Showing ${(selectedCategory ?? "").toLowerCase()} requests sorted by distance.` : t("inkindSection.subtitle")}
                    </p>
                  </div>
                  <Link href="/requests" className="inline-flex shrink-0">
                    <Button variant="outline" className="btn-3d border-[var(--ck-home-soft,#fed7aa)] dark:border-stone-850 hover:bg-[var(--ck-home-surface,#fff7ed)] dark:hover:bg-zinc-800 rounded-xl font-bold px-5 py-5 text-sm gap-2 text-stone-700 dark:text-stone-200">
                      {t("inkindSection.browseAll")} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </Reveal>

              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--ck-home-accent,#b04a15)]/20 border-t-[var(--ck-home-accent,#b04a15)]" />
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
                  {displayedRequests.slice(0, 6).map((req, i) => {
                    const isFeatured = i === 0;
                    const isTall     = i === 0 || i === 3;
                    return (
                      <Reveal key={req.id} delay={i * 90} className={isFeatured ? "col-span-2 lg:col-span-1 row-span-2 lg:row-span-1" : ""}>
                        <HoverCard openDelay={300}>
                          <HoverCardTrigger asChild>
                            <Card className={`card-glow inkind-card-featured bg-white dark:bg-zinc-900 rounded-2xl border border-[var(--ck-home-surface,#ffedd5)] dark:border-zinc-800 overflow-hidden flex flex-col cursor-pointer group transition-all duration-300 ${isFeatured ? "lg:min-h-[320px]" : isTall ? "min-h-[280px]" : "min-h-[220px]"}`}>
                              <div className={`relative w-full bg-stone-100 dark:bg-zinc-950 shrink-0 overflow-hidden ${isFeatured ? "h-40 sm:h-52" : "h-28 sm:h-36"}`}>
                                <Image src={req.imageUrl || getMobileCardImage(req.category, req.id)} alt={req.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="(max-width: 640px) 50vw, 33vw" />
                                {isFeatured && <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />}
                                <div className="absolute top-2 right-2">
                                  <span className={`text-5xs sm:text-4xs font-black px-1.5 py-0.5 rounded-full uppercase border ${req.urgency === "CRITICAL" ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400" : req.urgency === "HIGH" ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400" : "bg-stone-100/90 dark:bg-zinc-800/90 border-stone-200 dark:border-zinc-700 text-stone-500 dark:text-stone-400"}`}>
                                    {tCommon("urgency" + req.urgency.charAt(0) + req.urgency.slice(1).toLowerCase())}
                                  </span>
                                </div>
                                {isFeatured && (
                                  <div className="absolute bottom-3 left-3">
                                    <span className="text-3xs font-black text-white/80 uppercase tracking-wider bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1">{req.category}</span>
                                  </div>
                                )}
                              </div>
                              <CardContent className={`flex flex-col flex-1 gap-2 ${isFeatured ? "p-4 sm:p-5" : "p-3 sm:p-4"}`}>
                                <div>
                                  <h3 className={`font-bold text-stone-900 dark:text-stone-100 leading-snug line-clamp-2 ${isFeatured ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}>
                                    <TranslatedText text={req.title} />
                                  </h3>
                                  <p className="text-3xs sm:text-xs text-stone-400 font-semibold mt-0.5 truncate">
                                    By {req.doneeName} · <TranslatedText text={req.city} />
                                  </p>
                                </div>
                                {req.description && isFeatured && (
                                  <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 font-medium leading-relaxed line-clamp-2">
                                    <TranslatedText text={req.description} />
                                  </p>
                                )}
                                <div className="mt-auto pt-2 border-t border-[var(--ck-home-surface,#fff7ed)] dark:border-zinc-800 flex justify-between items-center">
                                  <span className="text-3xs sm:text-xs text-stone-400 font-semibold">
                                    Qty: <span className="text-stone-700 dark:text-stone-300 font-black">{req.quantity}</span>
                                  </span>
                                  <Link href="/requests" className="inline-flex">
                                    <span className="text-[var(--ck-home-ink,#b04a15)] font-extrabold uppercase text-4xs sm:text-3xs tracking-wider hover:underline">Give →</span>
                                  </Link>
                                </div>
                              </CardContent>
                            </Card>
                          </HoverCardTrigger>
                          <HoverCardContent side="top" align="center" className="w-80 z-50 p-4 shadow-xl">
                            <div className="space-y-2">
                              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-tight"><TranslatedText text={req.title} /></h4>
                              <p className="text-sm text-stone-500 dark:text-stone-400">{req.description ? <TranslatedText text={req.description} /> : `Requested by ${req.doneeName}. Qty ${req.quantity} needed.`}</p>
                              <div className="text-xs text-[var(--ck-home-ink,#b04a15)] dark:text-[var(--ck-home-ink,#e07b3a)] font-bold">Requested by: {req.doneeName}</div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      </Reveal>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

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

      {/* ════════════════════════════════════════════════════════════
          MOBILE VIEW  (lg:hidden)
          Still inline here — can be extracted to MobileView.tsx
          in a future session if it grows.
      ════════════════════════════════════════════════════════════ */}
      {/* `pt-11` matches this column's own `gap-11`: the join between the hero
          and whatever follows it is a section join like every other one, and at
          `pt-2` it was 8px against 44px everywhere else — the one odd seam on
          the page, and it read as the next section being glued to the hero. */}
      <div className="lg:hidden min-h-screen bg-[#fbf9f4] dark:bg-zinc-950 px-5 pt-11 flex flex-col gap-11">
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
        {showAudiencePathways && <MobileDoors door={door} pick={pickDoor} />}

        {/* The donee door's evidence. The one genuinely new surface here:
            everything else below the hero is donor-facing, so a visitor who
            says "I need something" had nothing to read. */}
        {showAudiencePathways && door === "donee" && <DoneeDoorEvidence />}

        {/* Live Needs — the donor door's first piece of evidence, so it leads
            now rather than sitting below the campaigns rail.
            No bleed wrapper below lg: the section drops its own horizontal
            padding and background at this width (see LiveNeedsSection), so it
            sits on this column's px-5 gutter like everything else. */}
        {doorIsDonor && (
          <LiveNeedsSection initialRequests={initialPublicRequests} stats={stats} />
        )}

        {/* Mobile Campaigns horizontal scroll */}
        {FEATURES.money && doorIsDonor && (
          <section className="space-y-4">
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
        {!showAudiencePathways && <ComingSoonMagnets />}
      </div>
    </div>
  );
}
