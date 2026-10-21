"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Package,
  Heart,
  Users,
  Award,
  Camera,
  Sparkles,
} from "lucide-react";
import type { NgoStatusData } from "./useNgoStatus";
import { NgoHeroRedesign } from "./NgoHeroRedesign";
import {
  NgoCard,
  NgoSectionHeader,
  NgoMarquee,
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
  const shouldReduceMotion = useReducedMotion();
  const overview = status.overview;

  const campaignProgress = status.activeRequests;
  const donationsReceived = status.itemsPledged;
  const itemsDelivered = (overview as any)?.verifiedDeliveries ?? 0;
  const beneficiaries = itemsDelivered > 0 ? itemsDelivered * 4 : donationsReceived > 0 ? donationsReceived * 2 : 0;

  const hasAnyData = campaignProgress > 0 || donationsReceived > 0 || itemsDelivered > 0;

  // ---------------------------------------------------------------------------
  // Campaign Journey - Sticky Scroll-Telling Setup
  // ---------------------------------------------------------------------------
  const journeyRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  const journeySteps = [
    {
      num: 1,
      title: "Post a need",
      desc: "Publish your campaign.",
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
    offset: ["start center", "end end"],
  });

  const pathLength = useTransform(journeyScrollProgress, [0, 1], [0, 1]);

  useEffect(() => {
    return journeyScrollProgress.on("change", (latest) => {
      const idx = Math.min(
        journeySteps.length - 1,
        Math.floor(latest * journeySteps.length)
      );
      setActiveStep(idx);
    });
  }, [journeyScrollProgress, journeySteps.length]);

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
            <div className="w-full rounded-[28px] border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-900/60 p-12 text-center shadow-sm">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-[#2F8F5B]/10 dark:bg-[#2F8F5B]/20 flex items-center justify-center text-[#2F8F5B] mb-5">
                <Sparkles className="w-10 h-10" />
              </div>
              <h3 className="ngo-heading text-2xl text-stone-900 dark:text-stone-100 mb-2">
                No active metrics yet
              </h3>
              <p className="text-base text-stone-600 dark:text-stone-400 max-w-md mx-auto mb-6">
                Appears once your first campaign is live.
              </p>
              <Link
                href="/ngo/drives/new"
                className="ngo-btn-pill ngo-btn-gold inline-flex"
              >
                <span>Create your first campaign</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          ) : (
            /* Bento Grid of 4 Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Campaign Progress */}
              <div className="ngo-card ngo-card-interactive group">
                <div className="ngo-card-glow" />
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 bg-[#2F8F5B]/10 text-[#2F8F5B]">
                  Campaign progress
                </span>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="ngo-heading text-4xl text-stone-900 dark:text-stone-100 font-bold">
                    <AnimatedCounter value={campaignProgress} />
                  </span>
                  <span className="text-xs text-stone-500">active</span>
                </div>
                {/* Sparkline SVG */}
                <div className="h-10 w-full mb-3">
                  <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <path
                      d="M0 25 Q25 10, 50 18 T100 5"
                      fill="none"
                      stroke="#2F8F5B"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                {/* 10px progress bar green to gold */}
                <div className="h-[10px] w-full rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, Math.max(15, campaignProgress * 30))}%`,
                      background: "linear-gradient(90deg, #2F8F5B, #D9A441)",
                    }}
                  />
                </div>
              </div>

              {/* Card 2: Donations Received */}
              <div className="ngo-card ngo-card-interactive group">
                <div className="ngo-card-glow" />
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 bg-[#D9A441]/10 text-[#D9A441]">
                  Donations received
                </span>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="ngo-heading text-4xl text-stone-900 dark:text-stone-100 font-bold">
                    <AnimatedCounter value={donationsReceived} />
                  </span>
                  <span className="text-xs text-stone-500">pledged</span>
                </div>
                <div className="h-10 w-full mb-3">
                  <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <path
                      d="M0 20 Q30 5, 60 15 T100 8"
                      fill="none"
                      stroke="#D9A441"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="h-[10px] w-full rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, Math.max(15, (donationsReceived / 50) * 100))}%`,
                      background: "linear-gradient(90deg, #2F8F5B, #D9A441)",
                    }}
                  />
                </div>
              </div>

              {/* Card 3: Items Delivered */}
              <div className="ngo-card ngo-card-interactive group">
                <div className="ngo-card-glow" />
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 bg-[#1E6B4A]/10 text-[#1E6B4A] dark:text-[#A8DEC8]">
                  Items delivered
                </span>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="ngo-heading text-4xl text-stone-900 dark:text-stone-100 font-bold">
                    <AnimatedCounter value={itemsDelivered} />
                  </span>
                  <span className="text-xs text-stone-500">confirmed</span>
                </div>
                <div className="h-10 w-full mb-3">
                  <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <path
                      d="M0 28 Q35 15, 70 8 T100 3"
                      fill="none"
                      stroke="#1E6B4A"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="h-[10px] w-full rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, Math.max(15, (itemsDelivered / 30) * 100))}%`,
                      background: "linear-gradient(90deg, #2F8F5B, #D9A441)",
                    }}
                  />
                </div>
              </div>

              {/* Card 4: Beneficiaries Reached */}
              <div className="ngo-card ngo-card-interactive group">
                <div className="ngo-card-glow" />
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Beneficiaries reached
                </span>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="ngo-heading text-4xl text-stone-900 dark:text-stone-100 font-bold">
                    <AnimatedCounter value={beneficiaries} />
                  </span>
                  <span className="text-xs text-stone-500">people</span>
                </div>
                <div className="h-10 w-full mb-3">
                  <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                    <path
                      d="M0 22 Q40 25, 75 12 T100 6"
                      fill="none"
                      stroke="#5BE49B"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="h-[10px] w-full rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, Math.max(15, (beneficiaries / 100) * 100))}%`,
                      background: "linear-gradient(90deg, #2F8F5B, #D9A441)",
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. CREATE YOUR FIRST CAMPAIGN (Dark Band) */}
      <section className="ngo-section ngo-band-dark">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="Create your first campaign"
            h2="Say what you need, clearly."
            isDark
          />

          <div className="ngo-grid-3">
            <NgoCard
              number="1"
              title="Describe your need"
              body="Give a clear title and purpose."
              isDarkBand
            />
            <NgoCard
              number="2"
              title="Set quantities"
              body="List items and realistic amounts."
              isDarkBand
            />
            <NgoCard
              number="3"
              title="Publish"
              body="Go live for donors to see."
              isDarkBand
            />
          </div>
        </div>
      </section>

      {/* 4. MANAGE YOUR CAMPAIGNS */}
      <section className="ngo-section ngo-band-cream">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="Manage your campaigns"
            h2="View, edit and track every campaign."
          />

          <div className="ngo-grid-3">
            <NgoCard
              tag="Active"
              title="Active campaigns"
              body="See progress and edit details."
            />
            <NgoCard
              tag="Completed"
              title="Completed campaigns"
              body="Review outcomes and proof."
            />
            <NgoCard
              tag="Drafts"
              title="Drafts"
              body="Finish and publish when ready."
            />
          </div>
        </div>
      </section>

      {/* 5. CONNECT WITH DONORS (Wide Gradient Card) */}
      <section className="ngo-section ngo-band-cream pt-0">
        <div className="ngo-container">
          <span className="ngo-eyebrow">Connect with donors</span>
          <div className="rounded-[28px] p-8 md:p-14 text-white shadow-2xl relative overflow-hidden bg-gradient-to-br from-[#0B3D2E] to-[#1E6B4A]">
            <div className="relative z-10 max-w-3xl">
              <h2 className="ngo-heading text-3xl sm:text-4xl md:text-5xl mb-4 leading-[1.1]">
                Donors who want to fulfil your needs find you.
              </h2>
              <p className="text-base sm:text-lg text-[#EFEADB]/90 leading-relaxed font-normal">
                Verified campaigns reach interested donors, who offer to give. You review each offer and choose how to proceed.
              </p>
            </div>
            <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-80 h-80 rounded-full bg-[#2F8F5B]/30 blur-3xl pointer-events-none" />
          </div>
        </div>
      </section>

      {/* 6. CAMPAIGN JOURNEY (Dark Band + Sticky Scroll-Telling) */}
      <section ref={journeyRef} className="ngo-section ngo-band-dark">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="Campaign journey"
            h2="From posting a need to confirmed delivery."
            isDark
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start relative">
            <div className="lg:col-span-7 relative pl-4 md:pl-8">
              <div className="absolute left-[39px] md:left-[55px] top-6 bottom-10 w-1 pointer-events-none">
                <svg className="w-full h-full" preserveAspectRatio="none">
                  <line
                    x1="2"
                    y1="0"
                    x2="2"
                    y2="100%"
                    stroke="rgba(255, 255, 255, 0.15)"
                    strokeWidth="3"
                  />
                  <motion.line
                    x1="2"
                    y1="0"
                    x2="2"
                    y2="100%"
                    stroke="#D9A441"
                    strokeWidth="3"
                    style={{
                      pathLength: shouldReduceMotion ? 1 : pathLength,
                    }}
                  />
                </svg>
              </div>

              <div className="space-y-6">
                {journeySteps.map((step, i) => {
                  const isActive = activeStep >= i;
                  return (
                    <div
                      key={step.num}
                      style={{ marginTop: i > 0 ? `${i * 12}px` : 0 }}
                      className={`relative z-10 flex items-start gap-6 p-4 rounded-2xl transition-all duration-300 ${
                        isActive
                          ? "bg-white/[0.07] border border-white/20 shadow-lg"
                          : "bg-transparent opacity-65"
                      }`}
                    >
                      <div
                        className="ngo-step-bubble transition-transform duration-300"
                        style={{
                          transform: isActive ? "scale(1.05)" : "scale(1)",
                        }}
                      >
                        {step.num}
                      </div>

                      <div className="pt-2">
                        <h3 className="ngo-heading text-2xl text-white mb-1">
                          {step.title}
                        </h3>
                        <p className="text-base text-[#EFEADB]/85 font-normal">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-5 hidden lg:block sticky top-28">
              <div className="relative w-full h-[460px] rounded-[28px] overflow-hidden border border-white/20 shadow-2xl bg-black/40">
                {journeySteps.map((step, i) => (
                  <div
                    key={step.num}
                    className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                      activeStep === i ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                    }`}
                  >
                    <Image
                      src={step.photo}
                      alt={step.alt}
                      fill
                      sizes="480px"
                      className="object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6">
                      <span className="text-xs uppercase tracking-wider text-[#D9A441] font-semibold block mb-1">
                        Step {step.num}
                      </span>
                      <h4 className="ngo-heading text-xl text-white">
                        {step.title}
                      </h4>
                      <p className="text-xs text-[#EFEADB]/80 mt-1">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. TRACK DONATIONS AND REQUESTS */}
      <section className="ngo-section ngo-band-cream">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="Track donations and requests"
            h2="Always know where each need stands."
          />

          <div className="ngo-grid-4">
            <NgoCard
              tag="Offers"
              title="Offers"
              body="Review what donors propose."
            />
            <NgoCard
              tag="Pending"
              title="Pending requests"
              body="Needs waiting for a match."
            />
            <NgoCard
              tag="Partial"
              title="Partially fulfilled"
              body="Needs with items still open."
            />
            <NgoCard
              tag="Done"
              title="Completed"
              body="Fully delivered and confirmed."
            />
          </div>
        </div>
      </section>

      {/* 8. DELIVERY AND HANDOVER PROOF + 9. CERTIFICATES AND RECOGNITION */}
      <section className="ngo-section ngo-band-cream pt-0">
        <div className="ngo-container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card Left: Delivery and Handover Proof */}
            <div className="ngo-card ngo-card-interactive">
              <div className="ngo-card-glow" />
              <span className="ngo-eyebrow">Delivery and handover proof</span>
              <h3 className="ngo-heading text-2xl md:text-3xl text-stone-900 dark:text-stone-100 mb-3">
                Confirm receipt, upload photos.
              </h3>
              <p className="text-stone-600 dark:text-stone-300 text-base leading-relaxed">
                Once items arrive, confirm receipt and add handover photos as proof of a successful delivery.
              </p>
            </div>

            {/* Card Right: Certificates and Recognition */}
            <div className="ngo-card ngo-card-interactive">
              <div className="ngo-card-glow" />
              <span className="ngo-eyebrow">Certificates and recognition</span>
              <h3 className="ngo-heading text-2xl md:text-3xl text-stone-900 dark:text-stone-100 mb-3">
                Documented impact earns recognition.
              </h3>
              <p className="text-stone-600 dark:text-stone-300 text-base leading-relaxed">
                Completed campaigns with proof become eligible for completion certificates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. SUCCESS STORIES (Dark Band) */}
      <section className="ngo-section ngo-band-dark">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="Success stories"
            h2="Stories of help, delivered."
            isDark
          />

          <div className="ngo-grid-3">
            {/* Story 1 */}
            <div className="ngo-card ngo-card-interactive group !p-0 overflow-hidden flex flex-col justify-between">
              <div className="relative h-60 w-full overflow-hidden">
                <Image
                  src="/images/journey/item-proof-blankets.webp"
                  alt="Blankets distribution story"
                  fill
                  sizes="400px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-700 text-white shadow-md">
                  Completed
                </span>
              </div>
              <div className="p-6">
                <h4 className="ngo-heading text-xl text-white mb-2">
                  Winter Relief Blanket Drive
                </h4>
                <p className="text-sm text-[#EFEADB]/80 leading-relaxed">
                  250 warm blankets distributed to elderly residents and shelter homes across Pune district.
                </p>
              </div>
            </div>

            {/* Story 2 */}
            <div className="ngo-card ngo-card-interactive group !p-0 overflow-hidden flex flex-col justify-between">
              <div className="relative h-60 w-full overflow-hidden">
                <Image
                  src="/images/journey/money-proof-ration.webp"
                  alt="Ration kit distribution story"
                  fill
                  sizes="400px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-700 text-white shadow-md">
                  Completed
                </span>
              </div>
              <div className="p-6">
                <h4 className="ngo-heading text-xl text-white mb-2">
                  Community Food Kits
                </h4>
                <p className="text-sm text-[#EFEADB]/80 leading-relaxed">
                  Essential grains, oil, and nutrition kits delivered to 120 low-income family households.
                </p>
              </div>
            </div>

            {/* Story 3 */}
            <div className="ngo-card ngo-card-interactive group !p-0 overflow-hidden flex flex-col justify-between">
              <div className="relative h-60 w-full overflow-hidden">
                <Image
                  src="/images/ngo-hero/col-a-5-elderly-warmth.webp"
                  alt="Elderly care supplies story"
                  fill
                  sizes="400px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-700 text-white shadow-md">
                  Completed
                </span>
              </div>
              <div className="p-6">
                <h4 className="ngo-heading text-xl text-white mb-2">
                  Elderly Care Carepack
                </h4>
                <p className="text-sm text-[#EFEADB]/80 leading-relaxed">
                  Medical aids and winter sweaters delivered to community assisted living care homes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. TIPS FOR BETTER CAMPAIGNS */}
      <section className="ngo-section ngo-band-cream">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="Tips for better campaigns"
            h2="Small details, bigger response."
          />

          <div className="ngo-grid-3">
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

      {/* 12. FINAL CTA */}
      <section className="relative w-full py-[130px] px-7 overflow-hidden text-center text-white bg-gradient-to-br from-[#0B3D2E] via-[#1E6B4A] to-[#2F8F5B]">
        {/* Floating Photo Card Left */}
        <div className="ngo-cta-floater left-8 top-12 rotate-[-4deg]">
          <Image
            src="/images/ngo-hero/col-a-2-classroom-nashik.webp"
            alt="Students with supplies"
            fill
            sizes="190px"
            className="object-cover"
            loading="lazy"
          />
        </div>

        {/* Floating Photo Card Right */}
        <div className="ngo-cta-floater right-8 bottom-12 rotate-[5deg]">
          <Image
            src="/images/ngo-hero/col-a-3-ration-drive.webp"
            alt="Ration kit handover"
            fill
            sizes="190px"
            className="object-cover"
            loading="lazy"
          />
        </div>

        <div className="ngo-container relative z-10 max-w-3xl mx-auto flex flex-col items-center">
          <h2 className="ngo-heading text-[clamp(40px,7vw,96px)] mb-8 leading-[1.05]">
            Publish a need.{" "}
            <span className="ngo-gold-underline">Begin receiving support.</span>
          </h2>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/ngo/drives/new"
              className="ngo-btn-pill ngo-btn-gold ngo-btn-shine"
            >
              <span>Create a campaign</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>

            <Link
              href="/dashboard/ngo#drives"
              className="ngo-btn-pill ngo-btn-outline"
            >
              <span>View my campaigns</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PostApprovalLanding;
