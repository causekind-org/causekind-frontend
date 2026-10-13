"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { useNgoStatus } from "./useNgoStatus";
import { NgoHeroGallery } from "./NgoHeroGallery";
import { NgoHeroTrustCard } from "./NgoHeroTrustCard";

export function NgoHero() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const {
    isLoading, error, refresh,
    status,
    stepNumber,
    totalSteps,
    wizardHref,
    activeRequests,
    itemsPledged,
    isVerified,
    canPostRequest,
    isPhotosDue,
    photosDueRequestName,
    lockReason,
  } = useNgoStatus();

  // Tooltip state for desktop locked click
  const [showLockedTooltip, setShowLockedTooltip] = useState<boolean>(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle locked button click (desktop tooltip + mobile toast)
  const handleLockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading || error) {
      toast.info(isLoading ? "We’re checking your application. Please try again shortly." : "We couldn’t check your application. Please retry.");
      if (error) void refresh();
      return;
    }
    // Trigger toast message
    if (status === "incomplete") {
      const isZero = stepNumber === 0;
      toast.info(
        isZero
          ? "Start your application to get verified. Start now →"
          : "Complete your profile to get verified. Continue →",
        {
          action: {
            label: isZero ? "Start now" : "Continue",
            onClick: () => router.push(wizardHref || "/profile/ngo-details"),
          },
        }
      );
    } else if (status === "under_review") {
      toast.info("Your application is under review. We'll unlock this once you're approved.");
    } else if (status === "changes_requested") {
      toast.warning("A few documents need fixing. Fix now →", {
        action: {
          label: "Fix now",
          onClick: () => router.push("/profile/ngo-details"),
        },
      });
    } else if (isPhotosDue) {
      toast.warning(`Upload handover photos for ${photosDueRequestName} to start your next drive.`, {
        action: {
          label: "Upload",
          onClick: () => router.push("/ngo/handovers"),
        },
      });
    }

    // Toggle desktop tooltip
    setShowLockedTooltip(true);
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowLockedTooltip(false);
    }, 4000);
  };

  // Headlines and subheadlines
  const headlineLine1 = isVerified ? "You're verified." : "Post what you need.";
  const headlineLine2 = isVerified ? "Let givers nearby find you." : "Connect with givers nearby.";
  const subheadline = isVerified
    ? "Post what your organization needs. Our team reviews the drive before it goes live to nearby givers. Track accepted handovers through your account."
    : "Start with your organization’s application. Once approved, you can start drives for review and connect with nearby donors.";

  // Secondary CTA details
  let secondaryCtaText = stepNumber === 0 ? "Start your application →" : "Continue application →";
  let secondaryCtaHref = wizardHref || "/profile/ngo-details";

  if (status === "under_review") {
    secondaryCtaText = "View application status";
    secondaryCtaHref = "/profile/ngo-details";
  } else if (status === "changes_requested") {
    secondaryCtaText = "Fix documents →";
    secondaryCtaHref = "/profile/ngo-details";
  }

  if (isLoading || error) {
    secondaryCtaText = isLoading ? "Checking application…" : "View your application";
    secondaryCtaHref = "/profile/ngo-details";
  }

  // Stagger animation container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
        delayChildren: shouldReduceMotion ? 0 : 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  // One photo for every NGO state (incomplete, under review, changes
  // requested, verified) — only the copy and buttons change with status.
  const heroImageAlt = "NGO workers handing school supplies to children";

  return (
    <section id="ngo-hero" className="relative isolate w-full text-stone-900 dark:text-stone-100">
      {/* ─────────────────────────────────────────────────────────────
          HERO STAGE. The photo covers the FULL hero width edge-to-edge,
          starting from the left under the navbar. Text sits on the photo
          with a narrow left fade + text-shadow for readability.
          ───────────────────────────────────────────────────────────── */}
      <div className="relative isolate w-full">

        {/* ─────────────────────────────────────────────────────────────
            MAIN CONTENT CONTAINER (Left-aligned text column, edge-positioned)
            ───────────────────────────────────────────────────────────── */}
        <div className="relative z-20 w-full px-4 sm:px-6 pt-10 sm:pt-14 lg:pt-16 -mb-8 sm:-mb-12">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">

            {/* LEFT COLUMN: Verified Badge (if verified), Headlines, CTAs, Helper Text */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="max-w-[640px] flex flex-col items-center text-center"
            >
              {/* 1. Verified Status Badge (Only in verified state) */}
              {isVerified && (
                <motion.div
                  variants={itemVariants}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-sm mb-5 lg:mb-[1.6vh] bg-ngo-700 text-white border-ngo-800"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span className="text-3xs sm:text-2xs font-bold tracking-tight">
                    Verified by CauseKind
                  </span>
                </motion.div>
              )}

              {/* 2. Headline Line 1 & Line 2 */}
              <motion.h1
                variants={itemVariants}
                className="text-3xl sm:text-5xl lg:text-[clamp(2rem,5.4vh,3.4rem)] font-bold tracking-tight text-stone-900 dark:text-stone-50 leading-[1.08] mb-5 lg:mb-[1.8vh]"
                style={{ fontFamily: "var(--font-source-serif-4), var(--font-lora), serif" }}
              >
                <span className="block">{headlineLine1}</span>
                <span className="block text-ngo-700 dark:text-ngo-300 italic font-serif">
                  {headlineLine2}
                </span>
              </motion.h1>

              {/* 3. Subheadline */}
              <motion.p
                variants={itemVariants}
                className="text-base sm:text-lg lg:text-[clamp(0.95rem,1.9vh,1.125rem)] text-stone-900 dark:text-stone-100 leading-relaxed max-w-[520px] mx-auto mb-7 lg:mb-[2.4vh] font-normal"
              >
                {subheadline}
              </motion.p>

              {/* 4. Action CTAs */}
              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 w-full sm:w-auto mb-3 relative"
              >
                {/* Start a Drive Button */}
                {canPostRequest ? (
                  <Link
                    href="/ngo/drives/new"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-ngo-700 hover:bg-ngo-600 active:bg-ngo-800 active:scale-[0.98] text-white font-bold px-7 py-3.5 lg:py-[1.4vh] text-sm sm:text-base shadow-lg shadow-ngo-700/25 hover:shadow-xl hover:shadow-ngo-700/40 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ngo-700 focus:ring-offset-2"
                  >
                    <span>Start a Drive</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={handleLockedClick}
                      aria-disabled="true"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-stone-200 dark:bg-zinc-800 text-stone-500 dark:text-stone-400 font-bold px-7 py-3.5 lg:py-[1.4vh] text-sm sm:text-base cursor-not-allowed border border-stone-300 dark:border-zinc-700 shadow-sm transition-all focus:outline-none"
                    >
                      <Lock className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                      <span>Start a Drive</span>
                    </button>

                    {/* Desktop Tooltip on Click */}
                    <AnimatePresence>
                      {showLockedTooltip && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 rounded-2xl bg-stone-900 dark:bg-zinc-800 text-white p-3.5 shadow-2xl z-30 text-xs"
                        >
                          <div className="flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div className="space-y-2">
                              <p className="font-medium text-stone-200 leading-snug">
                                {status === "incomplete" && (stepNumber === 0 ? "Start your application to get verified." : "Complete your profile to get verified.")}
                                {status === "under_review" && "Your application is under review. We'll unlock this once you're approved."}
                                {status === "changes_requested" && "A few documents need fixing."}
                                {isPhotosDue && `Upload handover photos for ${photosDueRequestName} to start your next drive.`}
                              </p>
                              {status === "incomplete" && (
                                <Link
                                  href={wizardHref || "/profile/ngo-details"}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300"
                                >
                                  <span>{stepNumber === 0 ? "Start application →" : "Continue application →"}</span>
                                </Link>
                              )}
                              {status === "changes_requested" && (
                                <Link
                                  href="/profile/ngo-details"
                                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300"
                                >
                                  <span>Fix now →</span>
                                </Link>
                              )}
                              {isPhotosDue && (
                                <Link
                                  href="/ngo/handovers"
                                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300"
                                >
                                  <span>Upload photos →</span>
                                </Link>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Secondary CTA — not for a verified NGO, whose one action is Start a Drive */}
                {!isVerified && <Link
                  href={secondaryCtaHref}
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-stone-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 hover:bg-stone-50 dark:hover:bg-zinc-800 active:scale-[0.98] text-stone-800 dark:text-stone-200 font-bold px-6 py-3.5 lg:py-[1.4vh] text-sm sm:text-base backdrop-blur-sm shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ngo-700 focus:ring-offset-2"
                >
                  <span>{secondaryCtaText}</span>
                </Link>}
              </motion.div>

              {/* Helper Text Under Hero Button */}
              <motion.div
                variants={itemVariants}
                className="flex items-center justify-center gap-2 text-3xs sm:text-2xs text-stone-800 dark:text-stone-200 font-medium mb-4"
              >
                {!canPostRequest ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 shrink-0" />
                    <span>{lockReason || "Available once CauseKind verifies your NGO."}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-ngo-700 dark:text-ngo-300 shrink-0" />
                    <span>Direct handovers · 10 km donor reach · Verified impact certificates</span>
                  </>
                )}
              </motion.div>
            </motion.div>

            {/* RIGHT COLUMN: the NGO's live drive (verified NGOs with an active drive only) */}
            {isVerified && activeRequests > 0 && (
              <div className="flex w-full flex-col items-center">
                <motion.div
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: shouldReduceMotion ? 0 : 0.45,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="w-full max-w-sm"
                >
                  <div className="rounded-[14px] bg-white/95 dark:bg-stone-900/95 border border-ngo-100 dark:border-zinc-800 shadow-[0_12px_30px_rgba(0,0,0,0.12)] p-4 sm:p-5 backdrop-blur-md">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-3xs font-bold uppercase tracking-wider text-ngo-700 dark:text-ngo-300">
                            Live Drive
                          </span>
                          <Link
                            href="/dashboard/ngo#live-drives"
                            className="text-3xs font-bold text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
                          >
                            View all →
                          </Link>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 mb-2">
                          {photosDueRequestName || "Winter Relief Blankets Drive"}
                        </p>
                        <div className="h-1.5 w-full rounded-full bg-stone-100 dark:bg-zinc-800 overflow-hidden mb-1.5">
                          <div
                            className="h-full bg-ngo-600 rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(15, (itemsPledged / (itemsPledged + 10)) * 100))}%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-3xs text-stone-500 dark:text-stone-400 font-medium">
                          <span>{itemsPledged} items pledged</span>
                          <span>Live</span>
                        </div>
                      </div>
                  </div>
                </motion.div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Animated scroll gallery: tilts from angled to flat as the text scrolls away */}
      <div className="relative">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[40vh] bg-[radial-gradient(ellipse_at_top,rgba(21,128,61,0.28),transparent_70%)] blur-3xl dark:bg-[radial-gradient(ellipse_at_top,rgba(74,222,128,0.18),transparent_70%)]" />
        <NgoHeroGallery />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          LIGHT TRUST CARD (Below the hero)
          ───────────────────────────────────────────────────────────── */}
      <div className="relative z-20 mt-2 sm:mt-3 max-w-7xl lg:max-w-none mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
        <NgoHeroTrustCard />
      </div>
    </section>
  );
}

export default NgoHero;


