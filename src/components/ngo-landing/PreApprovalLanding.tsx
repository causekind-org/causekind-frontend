"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import type { NgoStatusData } from "./useNgoStatus";
import { NgoHeroRedesign } from "./NgoHeroRedesign";
import {
  NgoCard,
  NgoSectionHeader,
  NgoMarquee,
  NgoFinalCtaBand,
} from "./NgoSharedComponents";

export function PreApprovalLanding({ status }: { status: NgoStatusData }) {
  const shouldReduceMotion = useReducedMotion();

  // ---------------------------------------------------------------------------
  // How CauseKind Works - Sticky Scroll-Telling Setup
  // ---------------------------------------------------------------------------
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const stepsContainerRef = useRef<HTMLDivElement>(null);
  const circle1Ref = useRef<HTMLDivElement>(null);
  const circle5Ref = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [lineCoords, setLineCoords] = useState<{
    top: number;
    height: number;
    left: number;
  } | null>(null);

  const howItWorksSteps = [
    {
      num: 1,
      title: "Register",
      desc: "Create your NGO account.",
      photo: "/images/ngo-hero/col-a-6-volunteer-team.webp",
      alt: "NGO volunteer team registration",
    },
    {
      num: 2,
      title: "Get verified",
      desc: "Submit documents for review.",
      photo: "/images/ngo-hero/col-b-2-community-aid.webp",
      alt: "Verification document submission",
    },
    {
      num: 3,
      title: "Create drives",
      desc: "Post what you need.",
      photo: "/images/journey/item-proof-blankets.webp",
      alt: "Drive for blankets and relief kits",
    },
    {
      num: 4,
      title: "Match donors",
      desc: "Donors offer to help.",
      photo: "/images/journey/money-proof-ration.webp",
      alt: "Donor offers matched with NGO needs",
    },
    {
      num: 5,
      title: "Receive support",
      desc: "Confirm delivery with proof.",
      photo: "/images/ngo-hero/col-b-4-health-camp.webp",
      alt: "Confirmed handover and delivery proof",
    },
  ];

  // Scroll tracking for gold line drawing & active step detection
  const { scrollYProgress: worksScrollProgress } = useScroll({
    target: howItWorksRef,
    offset: ["start center", "end end"],
  });

  const pathLength = useTransform(worksScrollProgress, [0, 1], [0, 1]);

  useEffect(() => {
    return worksScrollProgress.on("change", (latest) => {
      const idx = Math.min(
        howItWorksSteps.length - 1,
        Math.floor(latest * howItWorksSteps.length)
      );
      setActiveStep(idx);
    });
  }, [worksScrollProgress, howItWorksSteps.length]);

  // Measure exact vertical line endpoints from circle 1 centre to circle 5 centre
  useEffect(() => {
    const updateLine = () => {
      if (!circle1Ref.current || !circle5Ref.current || !stepsContainerRef.current) return;
      const containerRect = stepsContainerRef.current.getBoundingClientRect();
      const c1Rect = circle1Ref.current.getBoundingClientRect();
      const c5Rect = circle5Ref.current.getBoundingClientRect();

      const top = c1Rect.top + c1Rect.height / 2 - containerRect.top;
      const bottom = c5Rect.top + c5Rect.height / 2 - containerRect.top;
      const left = c1Rect.left + c1Rect.width / 2 - containerRect.left;

      setLineCoords({
        top,
        height: Math.max(0, bottom - top),
        left,
      });
    };

    updateLine();
    window.addEventListener("resize", updateLine);
    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(updateLine)
      : null;
    if (stepsContainerRef.current && ro) {
      ro.observe(stepsContainerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateLine);
      ro?.disconnect();
    };
  }, []);

  // CTA Links
  const registerHref = status.wizardHref || "/profile/ngo-details";

  return (
    <div className="w-full flex flex-col overflow-x-clip">
      {/* 1. HERO */}
      <NgoHeroRedesign status={status} />

      {/* 2. MARQUEE CHIPS */}
      <NgoMarquee />

      {/* 3. WHY JOIN CAUSEKIND */}
      <section className="ngo-section ngo-band-cream">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="Why join CauseKind"
            h2="Visibility, trust and transparency, built in."
          />

          <div className="ngo-grid-3">
            <NgoCard
              number="01"
              title="Better visibility"
              body="Get your cause in front of donors actively looking to help."
            />
            <NgoCard
              number="02"
              title="Trusted connections"
              body="Verified status shows donors you are the real thing."
            />
            <NgoCard
              number="03"
              title="Transparent giving"
              body="Every offer and delivery is tracked from start to finish."
            />
          </div>
        </div>
      </section>

      {/* 4. HOW CAUSEKIND WORKS (Dark Band + Sticky Scroll-Telling) */}
      <section ref={howItWorksRef} className="ngo-section ngo-band-dark">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="How CauseKind works"
            h2="From registration to receiving support."
            isDark
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start relative">
            {/* Steps Column with Drawing Gold SVG Path */}
            <div className="lg:col-span-7 relative">
              <div ref={stepsContainerRef} className="relative flex flex-col gap-4">
                {/* Gold SVG Drawing Path: runs exactly through number circles, circle 1 center to circle 5 center */}
                <div
                  className="absolute pointer-events-none z-0"
                  style={{
                    top: lineCoords ? `${lineCoords.top}px` : "40px",
                    height: lineCoords ? `${lineCoords.height}px` : "calc(100% - 80px)",
                    left: lineCoords ? `${lineCoords.left}px` : "40px",
                    width: "3px",
                    transform: "translateX(-50%)",
                  }}
                >
                  <svg className="w-full h-full" preserveAspectRatio="none">
                    <line
                      x1="1.5"
                      y1="0"
                      x2="1.5"
                      y2="100%"
                      stroke="rgba(255, 255, 255, 0.15)"
                      strokeWidth="3"
                    />
                    <motion.line
                      x1="1.5"
                      y1="0"
                      x2="1.5"
                      y2="100%"
                      stroke="#D9A441"
                      strokeWidth="3"
                      style={{
                        pathLength: shouldReduceMotion ? 1 : pathLength,
                      }}
                    />
                  </svg>
                </div>

                {/* 5 Steps equally spaced */}
                {howItWorksSteps.map((step, i) => {
                  const isActive = activeStep >= i;
                  return (
                    <div
                      key={step.num}
                      className={`relative flex items-start gap-6 p-4 rounded-2xl transition-all duration-300 ${
                        isActive
                          ? "bg-white/[0.07] border border-white/20 shadow-lg"
                          : "bg-transparent opacity-65"
                      }`}
                    >
                      {/* 48px green numbered bubble with 8px soft ring */}
                      <div
                        ref={
                          i === 0
                            ? circle1Ref
                            : i === howItWorksSteps.length - 1
                            ? circle5Ref
                            : undefined
                        }
                        className="ngo-step-bubble relative z-10 transition-transform duration-300"
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

            {/* Sticky Photo Column swapping photos on scroll */}
            <div className="lg:col-span-5 hidden lg:block sticky top-28">
              <div className="relative w-full h-[460px] rounded-[28px] overflow-hidden border border-white/20 shadow-2xl bg-black/40">
                {howItWorksSteps.map((step, i) => (
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

      {/* 5. CHALLENGES */}
      <section className="ngo-section ngo-band-cream">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="The challenges NGOs face"
            h2="Doing good is hard enough."
          />

          <div className="ngo-grid-4">
            <NgoCard
              tag="Resources"
              title="Limited resources"
              body="Small teams stretch to cover every need."
            />
            <NgoCard
              tag="Reach"
              title="Low visibility"
              body="Great work often goes unseen."
            />
            <NgoCard
              tag="Donors"
              title="Finding donors"
              body="Reaching the right givers takes time."
            />
            <NgoCard
              tag="Trust"
              title="Proving credibility"
              body="Donors need confidence before they give."
            />
          </div>
        </div>
      </section>

      {/* 6. REGISTRATION PROCESS */}
      <section className="ngo-section ngo-band-cream pt-0">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="NGO registration process"
            h2="Create your account in minutes."
          />

          <div className="ngo-grid-3">
            <NgoCard
              number="1"
              title="Create an account"
              body="Sign up with your organisation email."
            />
            <NgoCard
              number="2"
              title="Add organisation details"
              body="Name, mission, location and contact person."
            />
            <NgoCard
              number="3"
              title="Submit for review"
              body="Upload documents and send your application."
            />
          </div>
        </div>
      </section>

      {/* 7. VERIFICATION STEPS (Dark Band) */}
      <section className="ngo-section ngo-band-dark">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="Verification steps"
            h2="Four checks. One trusted badge."
            isDark
          />

          <div className="ngo-grid-4">
            <NgoCard
              number="1"
              title="Document submission"
              body="Upload your registration papers."
              isDarkBand
            />
            <NgoCard
              number="2"
              title="Legal checks"
              body="We confirm your legal standing."
              isDarkBand
            />
            <NgoCard
              number="3"
              title="AI screening"
              body="Automated checks flag inconsistencies."
              isDarkBand
            />
            <NgoCard
              number="4"
              title="Team review"
              body="A person reviews and decides."
              isDarkBand
            />
          </div>
        </div>
      </section>

      {/* 8. DOCUMENTS REQUIRED */}
      <section className="ngo-section ngo-band-cream">
        <div className="ngo-container">
          <NgoSectionHeader
            eyebrow="Documents required"
            h2="Keep these ready."
          />

          <div className="ngo-grid-3">
            <NgoCard
              title="Registration certificate"
              body="Trust, society or Section 8 proof."
            />
            <NgoCard
              title="PAN of the organisation"
              body="Tax identity document."
            />
            <NgoCard
              title="12A / 80G certificates"
              body="If your NGO holds them."
            />
            <NgoCard
              title="Address proof"
              body="Office or premises proof."
            />
            <NgoCard
              title="Authorised person ID"
              body="Government ID of your representative."
            />
            <NgoCard
              title="Mission and activities"
              body="A short description of your work."
            />
          </div>
        </div>
      </section>

      {/* 9. WHY VERIFICATION MATTERS (Wide gradient card) */}
      <section className="ngo-section ngo-band-cream pt-0">
        <div className="ngo-container">
          <span className="ngo-eyebrow">Why verification matters</span>
          <div className="rounded-[28px] p-8 md:p-16 text-white shadow-2xl relative overflow-hidden bg-gradient-to-br from-[#0B3D2E] to-[#1E6B4A]">
            <div className="relative z-10 max-w-3xl">
              <h2 className="ngo-heading text-3xl sm:text-4xl md:text-5xl mb-6 leading-[1.1]">
                Donors give faster when they know you are genuine.
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-[#EFEADB]/90 leading-relaxed font-normal">
                A verified badge tells donors your organisation was checked by documents, AI screening and a real person, so every need you post is taken seriously.
              </p>
            </div>
            <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-96 h-96 rounded-full bg-[#2F8F5B]/30 blur-3xl pointer-events-none" />
          </div>
        </div>
      </section>

      {/* 10. FINAL CTA */}
      <NgoFinalCtaBand
        headline={
          <>
            Ready to get{" "}
            <span className="ngo-gold-underline">verified?</span>
          </>
        }
        primaryButton={{
          label: "Complete registration",
          href: registerHref,
          showArrow: true,
        }}
        secondaryButton={{
          label: "Review the checklist",
          href: registerHref,
        }}
      />
    </div>
  );
}

export default PreApprovalLanding;
