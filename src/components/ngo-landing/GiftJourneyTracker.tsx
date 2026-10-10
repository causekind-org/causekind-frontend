"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useInView } from "framer-motion";
import {
  FileText,
  Handshake,
  CheckCircle2,
  Camera,
  Award,
  RotateCcw,
  Check,
  Sparkles,
} from "lucide-react";
import { NgoSectionLabel } from "./NgoSectionLabel";

export interface NgoJourneyStep {
  id: number;
  icon: React.ElementType;
  title: string;
  description: string;
  timestamp: string;
  statusBadge: string;
  proofBadge?: string;
  image?: string;
}

const NGO_JOURNEY_STEPS: NgoJourneyStep[] = [
  {
    id: 1,
    icon: FileText,
    title: "You start a drive",
    description: "Submit the items, quantity and intended use. Our team reviews each need before matching.",
    timestamp: "Step 1",
    statusBadge: "Drive Submitted for Review",
  },
  {
    id: 2,
    icon: Handshake,
    title: "Donors nearby pledge them",
    description: "Nearby givers receive the alert and commit exact quantities to fulfill the need.",
    timestamp: "Step 2",
    statusBadge: "Donor Commitment",
  },
  {
    id: 3,
    icon: CheckCircle2,
    title: "They drop off, and you confirm receipt",
    description: "Donors hand over the items directly at your verified drop-off point, and you complete receipt and OTP confirmations.",
    timestamp: "Step 3",
    statusBadge: "Handover Verified",
  },
  {
    id: 4,
    icon: Camera,
    title: "You upload a handover photo",
    description: "Upload a clear photo of the received items. Avoid people and private documents.",
    timestamp: "Step 4",
    statusBadge: "Photo Proof Uploaded",
    proofBadge: "📸 Handover Proof",
    image: "/images/journey/item-proof-blankets.webp",
  },
  {
    id: 5,
    icon: Award,
    title: "Completed handovers become eligible for certificates",
    description: "Both parties confirm the handover and complete OTP checks before certificate eligibility is assessed.",
    timestamp: "Step 5",
    statusBadge: "Completion Checks",
    proofBadge: "Certificate Eligibility",
    image: "/images/hero-1.webp",
  },
];

export function GiftJourneyTracker() {
  const shouldReduceMotion = useReducedMotion();

  const [activeStepIndex, setActiveStepIndex] = useState<number>(shouldReduceMotion ? 4 : 0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(!shouldReduceMotion);
  const [progress, setProgress] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });

  // Handle manual jump
  const handleStepClick = (index: number) => {
    setActiveStepIndex(index);
    setProgress(0);
    setIsAutoPlaying(false);
  };

  // Handle Replay
  const handleReplay = () => {
    setActiveStepIndex(0);
    setProgress(0);
    setIsAutoPlaying(true);
  };

  // Autoplay Timer and Progress Bar
  useEffect(() => {
    if (shouldReduceMotion || !isInView || !isAutoPlaying || process.env.NODE_ENV === "test") return;

    const stepDuration = 2500; // 2.5s
    const tickInterval = 50;
    const increment = (tickInterval / stepDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveStepIndex((prevStep) => {
            if (prevStep < NGO_JOURNEY_STEPS.length - 1) {
              return prevStep + 1;
            } else {
              setIsAutoPlaying(false);
              return prevStep;
            }
          });
          return 0;
        }
        return prev + increment;
      });
    }, tickInterval);

    return () => clearInterval(timer);
  }, [isAutoPlaying, isInView, shouldReduceMotion]);

  const activeStep = NGO_JOURNEY_STEPS[activeStepIndex] || NGO_JOURNEY_STEPS[0];
  const ActiveIcon = activeStep.icon;

  return (
    <div ref={containerRef} className="max-w-5xl mx-auto space-y-8">
      {/* ─────────────────────────────────────────────────────────────
          SECTION HEADER: NGO Perspective
          ───────────────────────────────────────────────────────────── */}
      <div className="text-center max-w-3xl mx-auto">
        <NgoSectionLabel align="center">After you post</NgoSectionLabel>

        <h2
          className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-50 leading-tight"
          style={{ fontFamily: "var(--font-source-serif-4), var(--font-lora), serif" }}
        >
          What happens after you post
        </h2>

        <p className="text-xs sm:text-sm md:text-base text-stone-600 dark:text-stone-400 mt-3 max-w-2xl mx-auto leading-relaxed">
          From starting a drive to donor handover, every step is direct, transparent, and closed with photo proof.
        </p>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MAIN LARGE ROUNDED CARD
          ───────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-stone-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 p-6 sm:p-10 shadow-xl backdrop-blur-sm">
        
        {/* Journey Summary Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 mb-8 border-b border-stone-100 dark:border-zinc-800 text-left">
          <div>
            <span className="text-3xs font-semibold text-stone-500 dark:text-stone-400">
              Sample drive
            </span>
            <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 mt-0.5">
              Illustrative journey · 40 blankets
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-3xs font-mono font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              CK-REQ-8821
            </span>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* ─────────────────────────────────────────────────────────────
              LEFT COLUMN: 5-Step Vertical Interactive Timeline
              ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-6 order-2 lg:order-1 relative">
            
            {/* Connecting Vertical Line */}
            <div className="absolute left-4 sm:left-5 top-5 bottom-6 w-0.5 bg-stone-200 dark:bg-zinc-800 -z-0">
              <motion.div
                className="w-full bg-ngo-700 transition-all duration-300"
                style={{
                  height: `${(activeStepIndex / (NGO_JOURNEY_STEPS.length - 1)) * 100}%`,
                }}
              />
            </div>

            {/* Steps List */}
            <div className="space-y-6 sm:space-y-7 relative z-10">
              {NGO_JOURNEY_STEPS.map((step, idx) => {
                const StepIcon = step.icon;
                const isCompleted = idx < activeStepIndex;
                const isCurrent = idx === activeStepIndex;

                return (
                  <button
                    key={`step-${step.id}`}
                    type="button"
                    onClick={() => handleStepClick(idx)}
                    className="w-full flex items-start gap-3.5 sm:gap-4 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700 rounded-xl p-1 -m-1 transition-all"
                  >
                    {/* Step Icon Circle */}
                    <div
                      className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 shadow-sm ${
                        isCurrent
                          ? "bg-ngo-700 border-ngo-700 text-white scale-110 shadow-md shadow-ngo-700/30 ring-4 ring-ngo-50 dark:ring-ngo-900/30"
                          : isCompleted
                          ? "bg-ngo-700 border-ngo-700 text-white"
                          : "bg-stone-50 dark:bg-zinc-800 border-stone-200 dark:border-zinc-700 text-stone-400 dark:text-stone-500 group-hover:border-stone-400"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4 text-white stroke-[2.5]" />
                      ) : (
                        <StepIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2">
                        <span
                          className={`text-xs sm:text-sm font-bold transition-colors ${
                            isCurrent
                              ? "text-ngo-700 dark:text-ngo-300"
                              : isCompleted
                              ? "text-stone-900 dark:text-stone-100"
                              : "text-stone-500 dark:text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200"
                          }`}
                        >
                          {idx + 1}. {step.title}
                        </span>
                        <span className="text-4xs sm:text-3xs text-stone-400 dark:text-stone-500 font-mono">
                          {step.timestamp}
                        </span>
                      </div>
                      <p className="text-2xs sm:text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

          </div>

          {/* ─────────────────────────────────────────────────────────────
              RIGHT COLUMN: Live Status Preview Card
              ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-6 order-1 lg:order-2">
            <div className="rounded-2xl border border-stone-200/90 dark:border-zinc-800 bg-stone-50/80 dark:bg-zinc-950/80 p-5 sm:p-6 shadow-sm flex flex-col justify-between min-h-[320px] relative overflow-hidden">
              
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-stone-200/70 dark:border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-3xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Live Workflow Preview
                  </span>
                </div>
                <span className="text-3xs font-mono font-semibold text-stone-400">
                  Step {activeStepIndex + 1} of 5
                </span>
              </div>

              {/* Dynamic Step Status Display */}
              <motion.div
                key={`ngo-journey-${activeStepIndex}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="py-4 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-ngo-50 dark:bg-ngo-900/30 border border-ngo-300/40 dark:border-ngo-700/40 text-ngo-700 dark:text-ngo-300 flex items-center justify-center shrink-0 shadow-sm">
                    <ActiveIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded text-4xs font-black uppercase tracking-wider bg-ngo-700 text-white">
                      {activeStep.statusBadge}
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 mt-1">
                      {activeStep.title}
                    </h4>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-normal bg-white/90 dark:bg-zinc-900/90 p-3.5 rounded-xl border border-stone-200/80 dark:border-zinc-800 shadow-sm">
                  &ldquo;{activeStep.description}&rdquo;
                </p>

                {/* Handover Image */}
                {activeStep.image && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="relative rounded-xl overflow-hidden border border-stone-200 dark:border-zinc-800 aspect-[16/10] w-full shadow-md group"
                  >
                    <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-ngo-700 via-ngo-500 to-emerald-500 opacity-30 blur-sm animate-pulse" />

                    <div className="relative w-full h-full bg-stone-100 dark:bg-zinc-900">
                      <Image
                        src={activeStep.image}
                        alt={activeStep.title}
                        fill
                        loading="lazy"
                        sizes="(max-width: 768px) 100vw, 400px"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                      {/* Top Chip */}
                      <div className="absolute top-2.5 left-2.5">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-black/60 dark:bg-zinc-950/80 backdrop-blur-md px-2.5 py-1 text-3xs uppercase tracking-wider font-bold text-white shadow-lg">
                          <Camera className="w-3.5 h-3.5 text-emerald-400" />
                          {activeStep.proofBadge}
                        </span>
                      </div>

                      {/* Bottom Verified Note */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                        <p className="text-2xs font-bold drop-shadow-sm flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          Direct verified handover with certificates
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Footer: Progress Bar + Replay Button */}
              <div className="mt-auto pt-3 border-t border-stone-200/70 dark:border-zinc-800/80 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="h-1.5 w-full bg-stone-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ngo-700 transition-all duration-75"
                      style={{
                        width: shouldReduceMotion
                          ? "100%"
                          : isAutoPlaying
                          ? `${progress}%`
                          : "100%",
                      }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReplay}
                  className="inline-flex items-center gap-1.5 text-3xs sm:text-2xs font-bold text-ngo-700 dark:text-ngo-300 hover:text-ngo-600 transition-colors focus:outline-none"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Replay journey</span>
                </button>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default GiftJourneyTracker;
