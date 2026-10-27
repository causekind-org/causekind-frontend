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
import { NgoProofDueSection } from "./NgoProofDueSection";
import {
  NgoCard,
  NgoSectionHeader,
  NgoMarquee,
  NgoFinalCtaBand,
} from "./NgoSharedComponents";

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
      title: "Post a need",
      desc: "Publish your drive.",
      photo: "/images/journey/item-proof-blankets.webp",
      alt: "Publishing NGO request",
    },
    {
      num: 2,
      title: "Donor matching",
      desc: "Donors offer to help.",
      photo: "/images/journey/money-proof-ration.webp",
      alt: "Donor pledge and match",
    },
    {
      num: 3,
      title: "Delivery",
      desc: "Items are sent to you.",
      photo: "/images/ngo-hero/col-a-1-blankets-pune.webp",
      alt: "Items delivered to NGO center",
    },
    {
      num: 4,
      title: "Handover proof",
      desc: "Upload photos.",
      photo: "/images/ngo-hero/col-b-5-food-distribution.webp",
      alt: "Handover photo proof uploaded",
    },
    {
      num: 5,
      title: "Confirmation",
      desc: "Close the loop.",
      photo: "/images/ngo-hero/col-b-4-health-camp.webp",
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
            <div className="w-full rounded-[24px] border border-stone-200 dark:border-white/10 bg-white dark:bg-[#0F2A20] p-12 text-center shadow-sm">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#F6F1E4] dark:bg-white/10 flex items-center justify-center text-[#2F8F5B] mb-5">
                <Sparkles className="w-8 h-8 stroke-[1.8]" />
              </div>
              <h3 className="ngo-heading text-2xl text-stone-900 dark:text-stone-100 mb-2">
                No active metrics yet
              </h3>
              <p className="text-base text-stone-600 dark:text-stone-400 max-w-md mx-auto mb-6">
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
          ) : (
            /* 3 Equal-Height Cards (3 columns desktop, 2 tablet, 1 mobile). No beneficiaries
               card: the overview API has no real count, and an estimate is not evidence. */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {/* Card 1: Drive Progress */}
              <div className="ngo-card ngo-card-interactive group h-full justify-between">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.12em] opacity-65">
                    Drive progress
                  </span>
                  <div className="w-11 h-11 rounded-full bg-[#F6F1E4] dark:bg-white/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-[22px] h-[22px] text-[#2F8F5B] stroke-[1.8]" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2.5">
                  <span className="ngo-heading text-[52px] leading-none text-stone-900 dark:text-stone-100">
                    {status.statsUnavailable ? "—" : <AnimatedCounter value={campaignProgress} />}
                  </span>
                  <span className="text-[15px] opacity-60 font-medium">active</span>
                </div>
              </div>

              {/* Card 2: Donations Received */}
              <div className="ngo-card ngo-card-interactive group h-full justify-between">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.12em] opacity-65">
                    Donations received
                  </span>
                  <div className="w-11 h-11 rounded-full bg-[#F6F1E4] dark:bg-white/10 flex items-center justify-center shrink-0">
                    <Heart className="w-[22px] h-[22px] text-[#2F8F5B] stroke-[1.8]" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2.5">
                  <span className="ngo-heading text-[52px] leading-none text-stone-900 dark:text-stone-100">
                    {status.statsUnavailable ? "—" : <AnimatedCounter value={donationsReceived} />}
                  </span>
                  <span className="text-[15px] opacity-60 font-medium">pledged</span>
                </div>
              </div>

              {/* Card 3: Items Delivered */}
              <div className="ngo-card ngo-card-interactive group h-full justify-between">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.12em] opacity-65">
                    Items delivered
                  </span>
                  <div className="w-11 h-11 rounded-full bg-[#F6F1E4] dark:bg-white/10 flex items-center justify-center shrink-0">
                    <Package className="w-[22px] h-[22px] text-[#2F8F5B] stroke-[1.8]" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2.5">
                  <span className="ngo-heading text-[52px] leading-none text-stone-900 dark:text-stone-100">
                    {status.statsUnavailable ? "—" : <AnimatedCounter value={itemsDelivered} />}
                  </span>
                  <span className="text-[15px] opacity-60 font-medium">confirmed</span>
                </div>
              </div>

            </div>
          )}
        </div>
      </section>

      {/* PROOF DUE (hidden when nothing is due or on error) */}
      <NgoProofDueSection status={status} />

      {/* 3. CREATE YOUR FIRST DRIVE */}
      <section className="ngo-section ngo-band-cream pt-0">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="Create your first drive"
            h2="Say what you need, clearly."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          </div>
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
                <div className="relative w-full h-[clamp(280px,52vh,420px)] rounded-[28px] overflow-hidden border border-white/[0.19] shadow-2xl bg-black/40">
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

          <div className="flex flex-col gap-6">
            {journeySteps.map((step) => (
              <div
                key={step.num}
                className="rounded-[24px] bg-white/[0.08] border border-white/25 overflow-hidden shadow-md flex flex-col"
              >
                {/* Photo Above */}
                <div className="relative w-full h-[200px] border-b border-white/15">
                  <Image
                    src={step.photo}
                    alt={step.alt}
                    fill
                    sizes="(max-width: 860px) 100vw, 400px"
                    className="object-cover"
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

          {/* Row 1: 4 status cards, equal height, 24px gap */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch mb-12">
            {/* Card 1: Offers */}
            <div className="ngo-card ngo-card-interactive group h-full">
              <div className="w-11 h-11 rounded-full bg-[#F6F1E4] dark:bg-white/10 flex items-center justify-center mb-4 shrink-0">
                <Heart className="w-[22px] h-[22px] text-[#2F8F5B] stroke-[1.8]" />
              </div>
              <span className="ngo-card-tag mb-3">Offers</span>
              <h3 className="ngo-card-title text-xl mb-1.5">Offers</h3>
              <p className="ngo-card-body text-sm">Review what donors propose.</p>
              <Link href="/dashboard/ngo#live-drives" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#2F8F5B] dark:text-[#5BE49B] hover:underline">
                <span>View offers →</span>
              </Link>
            </div>

            {/* Card 2: Pending requests */}
            <div className="ngo-card ngo-card-interactive group h-full">
              <div className="w-11 h-11 rounded-full bg-[#F6F1E4] dark:bg-white/10 flex items-center justify-center mb-4 shrink-0">
                <Clock className="w-[22px] h-[22px] text-[#2F8F5B] stroke-[1.8]" />
              </div>
              <span className="ngo-card-tag mb-3">Pending</span>
              <h3 className="ngo-card-title text-xl mb-1.5">Pending requests</h3>
              <p className="ngo-card-body text-sm">Needs waiting for a match.</p>
            </div>

            {/* Card 3: Partially fulfilled */}
            <div className="ngo-card ngo-card-interactive group h-full">
              <div className="w-11 h-11 rounded-full bg-[#F6F1E4] dark:bg-white/10 flex items-center justify-center mb-4 shrink-0">
                <CircleDot className="w-[22px] h-[22px] text-[#2F8F5B] stroke-[1.8]" />
              </div>
              <span className="ngo-card-tag mb-3">Partial</span>
              <h3 className="ngo-card-title text-xl mb-1.5">Partially fulfilled</h3>
              <p className="ngo-card-body text-sm">Needs with items still open.</p>
            </div>

            {/* Card 4: Completed */}
            <div className="ngo-card ngo-card-interactive group h-full">
              <div className="w-11 h-11 rounded-full bg-[#F6F1E4] dark:bg-white/10 flex items-center justify-center mb-4 shrink-0">
                <Package className="w-[22px] h-[22px] text-[#2F8F5B] stroke-[1.8]" />
              </div>
              <span className="ngo-card-tag mb-3">Done</span>
              <h3 className="ngo-card-title text-xl mb-1.5">Completed</h3>
              <p className="ngo-card-body text-sm">Fully delivered and confirmed.</p>
            </div>
          </div>

          {/* Row 2 (48px below row 1): 2 wide cards in a 2-column grid, same total width, 24px gap, equal height */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Wide Card 1: Delivery and handover proof */}
            <div className="ngo-card group h-full">
              <div className="w-11 h-11 rounded-full bg-[#F6F1E4] dark:bg-white/10 flex items-center justify-center mb-4 shrink-0">
                <Camera className="w-[22px] h-[22px] text-[#2F8F5B] stroke-[1.8]" />
              </div>
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] opacity-70 mb-2 block">
                Delivery and handover proof
              </span>
              <h3 className="ngo-heading text-2xl md:text-3xl text-stone-900 dark:text-stone-100 mb-3">
                Confirm receipt, upload photos.
              </h3>
              <p className="text-stone-600 dark:text-stone-300 text-base leading-relaxed">
                Once items arrive, confirm receipt and add handover photos as proof of a successful delivery.
              </p>
            </div>

            {/* Wide Card 2: Certificates and recognition */}
            <div className="ngo-card group h-full">
              <div className="w-11 h-11 rounded-full bg-[#F6F1E4] dark:bg-white/10 flex items-center justify-center mb-4 shrink-0">
                <Award className="w-[22px] h-[22px] text-[#2F8F5B] stroke-[1.8]" />
              </div>
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] opacity-70 mb-2 block">
                Certificates and recognition
              </span>
              <h3 className="ngo-heading text-2xl md:text-3xl text-stone-900 dark:text-stone-100 mb-3">
                Donors receive a certificate for contributing.
              </h3>
              <p className="text-stone-600 dark:text-stone-300 text-base leading-relaxed">
                When a donor contributes to your drive, they receive a certificate as thanks for their support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SUCCESS STORIES */}
      <section className="ngo-section ngo-band-cream">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="Success stories"
            h2="Stories of help, delivered."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Story 1 */}
            <div className="ngo-card ngo-card-interactive group !p-0 overflow-hidden flex flex-col justify-between">
              <div className="relative h-56 w-full overflow-hidden">
                <Image
                  src="/images/journey/item-proof-blankets.webp"
                  alt="Blankets distribution story"
                  fill
                  sizes="(max-width: 860px) 100vw, 400px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-4 left-4 z-10">
                  <span className="ngo-card-tag !bg-white/90 dark:!bg-[#0F2A20]/90 !backdrop-blur-sm">
                    Completed
                  </span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="ngo-heading text-xl text-[#0B3D2E] dark:text-[#EFEADB] mb-2 leading-snug">
                    Winter Relief Blanket Drive
                  </h3>
                  <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                    250 warm blankets distributed to elderly residents and shelter homes across Pune district.
                  </p>
                </div>
              </div>
            </div>

            {/* Story 2 */}
            <div className="ngo-card ngo-card-interactive group !p-0 overflow-hidden flex flex-col justify-between">
              <div className="relative h-56 w-full overflow-hidden">
                <Image
                  src="/images/journey/money-proof-ration.webp"
                  alt="Ration kit distribution story"
                  fill
                  sizes="(max-width: 860px) 100vw, 400px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-4 left-4 z-10">
                  <span className="ngo-card-tag !bg-white/90 dark:!bg-[#0F2A20]/90 !backdrop-blur-sm">
                    Completed
                  </span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="ngo-heading text-xl text-[#0B3D2E] dark:text-[#EFEADB] mb-2 leading-snug">
                    Community Food Kits
                  </h3>
                  <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                    Essential grains, oil, and nutrition kits delivered to 120 low-income family households.
                  </p>
                </div>
              </div>
            </div>

            {/* Story 3 */}
            <div className="ngo-card ngo-card-interactive group !p-0 overflow-hidden flex flex-col justify-between">
              <div className="relative h-56 w-full overflow-hidden">
                <Image
                  src="/images/ngo-hero/col-a-5-elderly-warmth.webp"
                  alt="Elderly care supplies story"
                  fill
                  sizes="(max-width: 860px) 100vw, 400px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute top-4 left-4 z-10">
                  <span className="ngo-card-tag !bg-white/90 dark:!bg-[#0F2A20]/90 !backdrop-blur-sm">
                    Completed
                  </span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="ngo-heading text-xl text-[#0B3D2E] dark:text-[#EFEADB] mb-2 leading-snug">
                    Elderly Care Carepack
                  </h3>
                  <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                    Medical aids and winter sweaters delivered to community assisted living care homes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. TIPS FOR BETTER DRIVES */}
      <section className="ngo-section ngo-band-cream">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="Tips for better drives"
            h2="Small details, bigger response."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <NgoCard
              number="1"
              title="Write clearly"
              body="Say who it helps and why."
            />
            <NgoCard
              number="2"
              title="Add photos"
              body="Real images build trust."
            />
            <NgoCard
              number="3"
              title="Be realistic"
              body="Ask for what you can use."
            />
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA */}
      <NgoFinalCtaBand
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
