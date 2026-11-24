"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  TrendingUp,
  Package,
  Heart,
  Award,
  Camera,
  Sparkles,
  Clock,
  CircleDot,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { triggerNgoLockedToast, type NgoStatusData } from "./useNgoStatus";
import { NgoHeroRedesign } from "./NgoHeroRedesign";
import { NgoJourneyMobileDeck } from "./NgoJourneyMobileDeck";
import { NgoProofDueSection } from "./NgoProofDueSection";
import { NgoSuccessStories } from "./NgoSuccessStories";
import {
  NgoCard,
  NgoSectionHeader,
  NgoMarquee,
  NgoFinalCtaBand,
} from "./NgoSharedComponents";
import { RevealGroup, SwipeRow } from "./NgoMotion";
import { FadeUp, GlassPhotoCard } from "./NgoShowcase";

/* Helper for animated counting number */
function AnimatedCounter({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }
    if (value === 0) {
      setDisplayValue(0);
      return;
    }

    let start = 0;
    const end = value;
    const totalFrames = Math.round(duration * 60);
    let frame = 0;

    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const current = Math.round(start + (end - start) * Math.sin((progress * Math.PI) / 2));
      setDisplayValue(current);

      if (frame >= totalFrames) {
        clearInterval(timer);
        setDisplayValue(end);
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [value, duration, shouldReduceMotion]);

  return <span ref={ref}>{displayValue.toLocaleString()}</span>;
}

export function PostApprovalLanding({ status }: { status: NgoStatusData }) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const handleFinalCtaClick = (e: React.MouseEvent) => {
    if (!status.canPostRequest) {
      e.preventDefault();
      triggerNgoLockedToast(status.status, status.isPhotosDue, status.photosDueRequestName, router);
    }
  };
  const overview = status.overview;

  const campaignProgress = status.activeRequests;
  const donationsReceived = status.itemsPledged;
  const itemsDelivered = (overview as any)?.verifiedDeliveries ?? 0;

  // A failed overview shows "—" counters, not the empty "no activity yet" state.
  const hasAnyData = status.statsUnavailable || campaignProgress > 0 || donationsReceived > 0 || itemsDelivered > 0;

  // ---------------------------------------------------------------------------
  // Drive Journey - Sticky Scroll-Telling Setup
  // ---------------------------------------------------------------------------
  const journeyRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  const journeySteps = [
    {
      num: 1,
      title: "Start your drive",
      desc: "Publish your drive.",
      photo: "/images/ngo-steps/post-a-need.webp",
      alt: "Publishing NGO request",
    },
    {
      num: 2,
      title: "Donor matching",
      desc: "Donors offer to help.",
      photo: "/images/ngo-steps/donor-matching.webp",
      alt: "Donor pledge and match",
    },
    {
      num: 3,
      title: "Delivery",
      desc: "Items are sent to you.",
      photo: "/images/ngo-steps/delivery.webp",
      alt: "Items delivered to NGO center",
    },
    {
      num: 4,
      title: "Handover proof",
      desc: "Upload photos.",
      photo: "/images/ngo-steps/handover-proof.webp",
      alt: "Handover photo proof uploaded",
    },
    {
      num: 5,
      title: "Confirmation",
      desc: "Close the loop.",
      photo: "/images/ngo-steps/confirmation.webp",
      objectPosition: "85% center",
      alt: "Completed confirmed handover loop",
    },
  ];

  const { scrollYProgress: journeyScrollProgress } = useScroll({
    target: journeyRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    if (shouldReduceMotion) {
      setActiveStep(0);
      return;
    }
    const syncStep = (v: number) => {
      if (v < 0.26) {
        setActiveStep(0);
      } else if (v < 0.46) {
        setActiveStep(1);
      } else if (v < 0.66) {
        setActiveStep(2);
      } else if (v < 0.86) {
        setActiveStep(3);
      } else {
        setActiveStep(4);
      }
    };
    syncStep(journeyScrollProgress.get());
    const unsubscribe = journeyScrollProgress.on("change", syncStep);
    return () => unsubscribe();
  }, [journeyScrollProgress, shouldReduceMotion]);

  return (
    <div className="w-full flex flex-col">
      {/* 1. HERO (Approved State) */}
      <NgoHeroRedesign status={status} />

      {/* MARQUEE CHIPS */}
      <NgoMarquee />

      {/* 2. IMPACT STATISTICS (Bento of 4 Cards) */}
      <section className="ngo-section ngo-band-cream">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="Impact statistics"
            h2="Your impact, at a glance."
          />

          {!hasAnyData ? (
            /* Illustrated Empty State */
            <div className="w-full overflow-hidden rounded-[32px] border border-[var(--ngo-line)] bg-[var(--ngo-card)] shadow-sm grid grid-cols-1 md:grid-cols-2">
              <div className="relative min-h-[260px] md:min-h-[380px]">
                <Image src="/images/ngo-steps/post-a-need.webp" alt="" fill sizes="(max-width: 768px) 100vw, 600px" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
              <div className="flex flex-col items-start justify-center p-8 md:p-14 text-left">
              <div className="w-16 h-16 rounded-2xl bg-[#F6F1E4] dark:bg-white/10 flex items-center justify-center text-[#2F8F5B] mb-5">
                <Sparkles className="w-8 h-8 stroke-[1.8]" />
              </div>
              <h3 className="ngo-heading text-3xl md:text-4xl text-stone-900 dark:text-stone-100 mb-2">
                No active metrics yet
              </h3>
              <p className="text-base text-stone-600 dark:text-stone-400 max-w-md mb-6">
                Appears once your first drive is live.
              </p>
              <Link
                href="/ngo/drives/new"
                className="ngo-btn-pill ngo-btn-gold inline-flex"
              >
                <span>Create your first drive</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              </div>
            </div>
          ) : (
            /* Dark stats slab. No beneficiaries cell: the overview API has no real count. */
            <FadeUp>
              <div className="ngo-stat-slab">
                <div className="ngo-blob -right-16 -top-20 h-72 w-72 opacity-60" aria-hidden />
                <div className="relative grid grid-cols-1 md:grid-cols-3">
                <div className="ngo-stat-cell">
                  <div className="mb-6 flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[var(--ngo-gold-light)]">
                      <TrendingUp className="h-5 w-5" strokeWidth={1.8} />
                    </span>
                    <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#EFEADB]/75">Drive progress</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="ngo-stat-num">
                      {status.statsUnavailable ? "—" : <AnimatedCounter value={campaignProgress} />}
                    </span>
                    <span className="text-base text-[#EFEADB]/70">active</span>
                  </div>
                </div>
                <div className="ngo-stat-cell">
                  <div className="mb-6 flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[var(--ngo-gold-light)]">
                      <Heart className="h-5 w-5" strokeWidth={1.8} />
                    </span>
                    <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#EFEADB]/75">Donations received</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="ngo-stat-num">
                      {status.statsUnavailable ? "—" : <AnimatedCounter value={donationsReceived} />}
                    </span>
                    <span className="text-base text-[#EFEADB]/70">pledged</span>
                  </div>
                </div>
                <div className="ngo-stat-cell">
                  <div className="mb-6 flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[var(--ngo-gold-light)]">
                      <Package className="h-5 w-5" strokeWidth={1.8} />
                    </span>
                    <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#EFEADB]/75">Items delivered</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="ngo-stat-num">
                      {status.statsUnavailable ? "—" : <AnimatedCounter value={itemsDelivered} />}
                    </span>
                    <span className="text-base text-[#EFEADB]/70">confirmed</span>
                  </div>
                </div>
                </div>
              </div>
            </FadeUp>
          )}
        </div>
      </section>

      {/* PROOF DUE (always shown: due drives, or "All caught up") */}
      <NgoProofDueSection status={status} />

      {/* 3. CREATE YOUR FIRST DRIVE */}
      <section className="ngo-section ngo-band-cream pt-0">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="Create your first drive"
            h2="Say what you need, clearly."
          />

          <SwipeRow label="Create your first drive" className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <NgoCard
              number="1"
              title="Describe your need"
              body="Give a clear title and purpose."
            />
            <NgoCard
              number="2"
              title="Set quantities"
              body="List items and realistic amounts."
            />
            <NgoCard
              number="3"
              title="Publish"
              body="Go live for donors to see."
            />
          </SwipeRow>
        </div>
      </section>

      {/* 4. DRIVE JOURNEY (Dark Green Band 1 of 2 + Sticky Scroll-Telling) */}
      {/* Desktop (>= 860px): Sticky Scroll-Driven */}
      <div
        ref={journeyRef}
        className="ngo-journey-wrapper ngo-journey-desktop relative w-full h-[400vh] bg-[#0B3D2E] text-[#F6F1E4]"
      >
        <div className="ngo-journey-sticky px-7">
          <div className="ngo-container w-full">
            {/* Row 1: Eyebrow + 1 / 5 Counter + H2 */}
            <div className="mb-4 lg:mb-6">
              <div className="flex items-center justify-between mb-1.5">
                <span className="ngo-eyebrow !mb-0 text-[#D9A441]">
                  Drive journey
                </span>
                <span className="text-xs font-semibold font-mono tracking-wider text-white/90 bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
                  {activeStep + 1} / 5
                </span>
              </div>
              <h2 className="ngo-heading text-[clamp(30px,3.6vw,48px)] text-white leading-[1.08]">
                From posting a need to confirmed delivery.
              </h2>
            </div>

            {/* Row 2: 2-column layout */}
            <div className="grid grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Column: 5 steps as cards (padding 14px 20px, title 18px, description 14px) */}
              <div className="col-span-7 flex flex-col gap-2.5">
                {journeySteps.map((step, i) => {
                  const isActive = shouldReduceMotion || activeStep === i;
                  return (
                    <div
                      key={step.num}
                      className={`rounded-[20px] p-[14px_20px] bg-white/[0.08] border border-white/25 flex items-center gap-4 transition-all duration-300 ${
                        isActive
                          ? "opacity-100 shadow-md translate-x-1"
                          : "opacity-45"
                      }`}
                    >
                      <div className="ngo-step-bubble !w-9 !h-9 !text-sm !font-semibold text-white bg-[#2F8F5B] rounded-full flex items-center justify-center shrink-0">
                        {step.num}
                      </div>

                      <div className="min-w-0">
                        <h3 className="ngo-heading text-[18px] text-white mb-0.5 leading-snug">
                          {step.title}
                        </h3>
                        <p className="text-[14px] text-[#EFEADB]/85 leading-normal">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: photo card stack (height clamp(280px, 52vh, 420px), width 100%) */}
              <div className="col-span-5 flex justify-center w-full">
                <div className="relative w-full aspect-[4/3] max-h-[60vh] rounded-[28px] overflow-hidden border border-white/[0.19] shadow-2xl bg-black/40">
                  {journeySteps.map((step, i) => (
                    <div
                      key={step.num}
                      className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                        (shouldReduceMotion ? i === 0 : activeStep === i)
                          ? "opacity-100 scale-100 z-10"
                          : "opacity-0 scale-[0.98] z-0 pointer-events-none"
                      }`}
                    >
                      <Image
                        src={step.photo}
                        alt={step.alt}
                        fill
                        sizes="(max-width: 1200px) 45vw, 440px"
                        className="object-cover"
                        style={{ objectPosition: step.objectPosition }}
                        priority={i === 0}
                        loading={i === 0 ? "eager" : "lazy"}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
                      <div className="absolute bottom-5 left-5 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-medium shadow-md pointer-events-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#5BE49B]" />
                        <span>Step {step.num} · {step.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile (< 860px): Stacked Revealed on Scroll */}
      <div className="ngo-journey-mobile w-full bg-[#0B3D2E] text-[#F6F1E4] py-16 px-5">
        <div className="ngo-container !px-0">
          <div className="mb-8">
            <span className="ngo-eyebrow !mb-1 text-[#D9A441]">Drive journey</span>
            <h2 className="ngo-heading text-2xl sm:text-3xl text-white leading-tight">
              From posting a need to confirmed delivery.
            </h2>
          </div>

          <NgoJourneyMobileDeck steps={journeySteps} label="Drive journey steps" />
          <div className="hidden flex-col gap-6">
            {journeySteps.map((step) => (
              <div
                key={step.num}
                className="rounded-[24px] bg-white/[0.08] border border-white/25 overflow-hidden shadow-md flex flex-col"
              >
                {/* Photo Above */}
                <div className="relative w-full aspect-[4/3] border-b border-white/15">
                  <Image
                    src={step.photo}
                    alt={step.alt}
                    fill
                    sizes="(max-width: 860px) 100vw, 400px"
                    className="object-cover"
                    style={{ objectPosition: step.objectPosition }}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-medium pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5BE49B]" />
                    <span>Step {step.num} · {step.title}</span>
                  </div>
                </div>

                {/* Content Below */}
                <div className="p-5 flex items-center gap-4">
                  <div className="ngo-step-bubble !w-10 !h-10 !text-base !font-semibold text-white bg-[#2F8F5B] rounded-full flex items-center justify-center shrink-0">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="ngo-heading text-lg text-white mb-0.5">
                      {step.title}
                    </h3>
                    <p className="text-sm text-[#EFEADB]/85">
                      {step.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. TRACK DONATIONS AND REQUESTS + DELIVERY/CERTIFICATES (Unified Section) */}
      <section className="ngo-section ngo-band-cream">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="Track donations and requests"
            h2="Always know where each need stands."
            className="mb-12"
          />

          {/* Row 1: status tiles in the NGO palette */}
          <SwipeRow label="Track donations and requests" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
            <div className="ngo-tile ngo-tile-deep h-full">
              <div className="flex items-center justify-between">
                <span className="ngo-tile-tag">Offers</span>
                <span className="ngo-tile-icon"><Heart className="h-5 w-5" strokeWidth={1.8} /></span>
              </div>
              <div>
                <h3 className="ngo-heading text-[28px] leading-tight">Offers</h3>
                <p className="mt-1 text-[15px] opacity-80">Review what donors propose.</p>
                <Link href="/dashboard/ngo#live-drives" className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--ngo-gold-light)] underline-offset-4 hover:underline">
                  <span>View offers →</span>
                </Link>
              </div>
            </div>
            <div className="ngo-tile ngo-tile-card h-full">
              <div className="flex items-center justify-between">
                <span className="ngo-tile-tag">Pending</span>
                <span className="ngo-tile-icon"><Clock className="h-5 w-5" strokeWidth={1.8} /></span>
              </div>
              <div>
                <h3 className="ngo-heading text-[28px] leading-tight">Pending requests</h3>
                <p className="mt-1 text-[15px] opacity-80">Needs waiting for a match.</p>
              </div>
            </div>
            <div className="ngo-tile ngo-tile-gold h-full">
              <div className="flex items-center justify-between">
                <span className="ngo-tile-tag">Partial</span>
                <span className="ngo-tile-icon"><CircleDot className="h-5 w-5" strokeWidth={1.8} /></span>
              </div>
              <div>
                <h3 className="ngo-heading text-[28px] leading-tight">Partially fulfilled</h3>
                <p className="mt-1 text-[15px] opacity-80">Needs with items still open.</p>
              </div>
            </div>
            <div className="ngo-tile ngo-tile-forest h-full">
              <div className="flex items-center justify-between">
                <span className="ngo-tile-tag">Done</span>
                <span className="ngo-tile-icon"><Package className="h-5 w-5" strokeWidth={1.8} /></span>
              </div>
              <div>
                <h3 className="ngo-heading text-[28px] leading-tight">Completed</h3>
                <p className="mt-1 text-[15px] opacity-80">Fully delivered and confirmed.</p>
              </div>
            </div>
          </SwipeRow>
          <div className="h-5" />

          {/* Row 2: photo cards with glass text boxes */}
          <SwipeRow label="Delivery and certificates" className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            <GlassPhotoCard src="/images/ngo-steps/handover-proof.webp" alt="Handover photo proof uploaded" className="h-full">
              <div className="mb-3 flex items-center gap-2 text-[var(--ngo-gold-light)]">
                <Camera className="h-5 w-5" strokeWidth={1.8} />
                <span className="text-[12px] font-semibold uppercase tracking-[0.12em]">Delivery and handover proof</span>
              </div>
              <h3 className="ngo-heading text-2xl md:text-3xl mb-2">Confirm receipt, upload photos.</h3>
              <p className="text-white/85 text-[15px] leading-relaxed">
                Once items arrive, confirm receipt and add handover photos as proof of a successful delivery.
              </p>
            </GlassPhotoCard>
            <GlassPhotoCard src="/images/ngo-steps/confirmation.webp" alt="Completed confirmed handover loop" className="h-full" position="85% center">
              <div className="mb-3 flex items-center gap-2 text-[var(--ngo-gold-light)]">
                <Award className="h-5 w-5" strokeWidth={1.8} />
                <span className="text-[12px] font-semibold uppercase tracking-[0.12em]">Certificates and recognition</span>
              </div>
              <h3 className="ngo-heading text-2xl md:text-3xl mb-2">Donors receive a certificate for contributing.</h3>
              <p className="text-white/85 text-[15px] leading-relaxed">
                When a donor contributes to your drive, they receive a certificate as thanks for their support.
              </p>
            </GlassPhotoCard>
          </SwipeRow>
        </div>
      </section>

      {/* 6. SUCCESS STORIES: this NGO's own drives with approved proof (never sample stories) */}
      <NgoSuccessStories stories={overview?.successStories} />

      {/* 7. TIPS FOR BETTER DRIVES */}
      <section className="ngo-section ngo-band-cream">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="Tips for better drives"
            h2="Small details, bigger response."
          />

          <SwipeRow reveal={false} label="Tips for better drives" className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="ngo-card ngo-card-interactive group !p-0 overflow-hidden">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image src="/images/ngo-steps/post-a-need.webp" alt="" fill sizes="(max-width: 768px) 100vw, 380px" className="object-cover ngo-zoom-img" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                <span className="ngo-heading absolute bottom-3 left-6 text-7xl text-white/95">1</span>
              </div>
              <div className="p-7">
                <h3 className="ngo-card-title">Write clearly</h3>
                <p className="ngo-card-body">Say who it helps and why.</p>
              </div>
            </div>
            <div className="ngo-card ngo-card-interactive group !p-0 overflow-hidden">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image src="/images/ngo-steps/handover-proof.webp" alt="" fill sizes="(max-width: 768px) 100vw, 380px" className="object-cover ngo-zoom-img" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                <span className="ngo-heading absolute bottom-3 left-6 text-7xl text-white/95">2</span>
              </div>
              <div className="p-7">
                <h3 className="ngo-card-title">Add photos</h3>
                <p className="ngo-card-body">Real images build trust.</p>
              </div>
            </div>
            <div className="ngo-card ngo-card-interactive group !p-0 overflow-hidden">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image src="/images/ngo-steps/delivery.webp" alt="" fill sizes="(max-width: 768px) 100vw, 380px" className="object-cover ngo-zoom-img" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                <span className="ngo-heading absolute bottom-3 left-6 text-7xl text-white/95">3</span>
              </div>
              <div className="p-7">
                <h3 className="ngo-card-title">Be realistic</h3>
                <p className="ngo-card-body">Ask for what you can use.</p>
              </div>
            </div>
          </SwipeRow>
        </div>
      </section>

      {/* 8. FINAL CTA */}
      <NgoFinalCtaBand
        photos={[
          { src: "/images/ngo-steps/left-side.webp", alt: "Volunteer handing over care package" },
          { src: "/images/ngo-steps/right-side.webp", alt: "Children supported through community drives" },
        ]}
        headline={
          <>
            Publish a need.{" "}
            <span className="ngo-gold-underline">Begin receiving support.</span>
          </>
        }
        primaryButton={{
          label: "Start a Drive",
          href: status.canPostRequest ? "/ngo/drives/new" : undefined,
          isLocked: !status.canPostRequest,
          onClick: !status.canPostRequest ? handleFinalCtaClick : undefined,
          showArrow: true,
        }}
        secondaryButton={{
          label: "View my drives",
          href: "/dashboard/ngo#live-drives",
        }}
      />
    </div>
  );
}

export default PostApprovalLanding;
