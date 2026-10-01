"use client";

import { useState, useRef } from "react";
import Image from "next/image";
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
      toast.warning(`Upload handover photos for ${photosDueRequestName} to post your next request.`, {
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
    ? "Post what your organization needs. Our team reviews the request and looks for a suitable match. Track accepted handovers through your account."
    : "Start with your organization’s application. Once approved, you can submit item requests for review and connect with nearby donors.";

  // Secondary CTA details
  let secondaryCtaText = stepNumber === 0 ? "Start your application →" : "Continue application →";
  let secondaryCtaHref = wizardHref || "/profile/ngo-details";

  if (isVerified) {
    secondaryCtaText = "View my application";
    secondaryCtaHref = "/profile/ngo-details";
  } else if (status === "under_review") {
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

  // Background photos
  const heroImageSrc = isVerified
    ? "/images/causekind-hero-handoff.webp"
    : "/images/ngo-hero-landing.jpg";

  const heroImageAlt = isVerified
    ? "Verified community handover moment"
    : "NGO team coordinating community supplies";

  return (
    <section id="ngo-hero" className="relative isolate w-full overflow-hidden text-stone-900 dark:text-stone-100 lg:min-h-[calc(100svh-var(--ck-nav-h,4.5rem))] lg:pb-[2vh]">
      {/* Desktop: one photo behind the whole section — hero, category bar and
          trust card all sit on it. Cover, never stretch. Phones keep the photo
          inside the hero box below. */}
      <div className="pointer-events-none absolute inset-0 -z-10 hidden lg:block" aria-hidden="true">
        <Image
          src={heroImageSrc}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_30%]"
        />
        {/* Bottom dissolve into the next section: the photo blurs progressively
            (masked backdrop blur), then fades into the page colour, so there is no
            hard edge between the hero and "Sound familiar?". */}
        <div className="absolute inset-x-0 bottom-0 h-[32%] backdrop-blur-[10px] [mask-image:linear-gradient(to_bottom,transparent,black_70%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_70%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[40%] bg-[linear-gradient(to_bottom,transparent_0%,color-mix(in_srgb,var(--surface-cream)_55%,transparent)_55%,var(--surface-cream)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.65)_0%,rgba(255,255,255,0.60)_18%,rgba(255,255,255,0.22)_28%,rgba(255,255,255,0)_35%,transparent_100%)] dark:bg-[linear-gradient(to_right,rgba(9,9,11,0.70)_0%,rgba(9,9,11,0.65)_18%,rgba(9,9,11,0.25)_28%,rgba(9,9,11,0)_35%,transparent_100%)]" />
      </div>
      {/* ─────────────────────────────────────────────────────────────
          FULL-WIDTH HERO PHOTO STAGE (100% viewport width, edge to edge)
          ───────────────────────────────────────────────────────────── */}
      <div className="relative isolate w-full min-h-[580px] sm:min-h-[620px] lg:min-h-0 lg:h-[max(420px,calc(100svh-var(--ck-nav-h,4.5rem)-9rem))] rounded-b-[24px] lg:rounded-none overflow-hidden shadow-sm lg:shadow-none flex flex-col justify-between">

        {/* Background Photo with Settle Motion & Optimal Horizon Position */}
        <motion.div
          initial={{ scale: shouldReduceMotion ? 1 : 1.04 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 -z-20 w-full h-full lg:hidden"
        >
          <Image
            src={heroImageSrc}
            alt={heroImageAlt}
            fill
            priority
            sizes="100vw"
            className="object-cover object-[72%_35%] lg:object-[center_30%]"
          />
        </motion.div>

        {/* Desktop Left-to-Right Lighter White Fade: ~0.60 opacity at left, fading to 0 by ~35% width */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 hidden bg-[linear-gradient(to_right,rgba(255,255,255,0.65)_0%,rgba(255,255,255,0.60)_18%,rgba(255,255,255,0.22)_28%,rgba(255,255,255,0)_35%,transparent_100%)] dark:bg-[linear-gradient(to_right,rgba(9,9,11,0.70)_0%,rgba(9,9,11,0.65)_18%,rgba(9,9,11,0.25)_28%,rgba(9,9,11,0)_35%,transparent_100%)]"
          aria-hidden="true"
        />

        {/* Mobile Top-to-Bottom Scrim Overlay */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(251,249,244,0.92)_0%,rgba(251,249,244,0.85)_55%,rgba(251,249,244,0.5)_78%,rgba(251,249,244,0)_95%)] dark:bg-[linear-gradient(to_bottom,rgba(9,9,11,0.92)_0%,rgba(9,9,11,0.85)_55%,rgba(9,9,11,0.5)_78%,rgba(9,9,11,0)_95%)] lg:hidden"
          aria-hidden="true"
        />

        {/* ─────────────────────────────────────────────────────────────
            MAIN CONTENT CONTAINER (Left-aligned text column, edge-positioned)
            ───────────────────────────────────────────────────────────── */}
        <div className="w-full px-4 sm:px-6 lg:pl-10 xl:pl-12 lg:pr-8 py-8 sm:py-12 lg:py-[clamp(1rem,3.5vh,2.5rem)] flex-1 flex flex-col justify-between z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center flex-1 pb-6 sm:pb-8 lg:pb-[2vh]">

            {/* LEFT COLUMN: Verified Badge (if verified), Headlines, CTAs, Helper Text */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="lg:col-span-7 max-w-[560px] flex flex-col items-start text-left [text-shadow:0_1px_3px_rgba(255,255,255,0.9),0_0_12px_rgba(255,255,255,0.8)] dark:[text-shadow:0_1px_3px_rgba(0,0,0,0.9),0_0_12px_rgba(0,0,0,0.8)]"
            >
              {/* 1. Verified Status Badge (Only in verified state) */}
              {isVerified && (
                <motion.div
                  variants={itemVariants}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-sm mb-5 lg:mb-[1.6vh] bg-ngo-700 text-white border-ngo-800"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span className="text-3xs sm:text-2xs font-bold tracking-tight">
                    ✓ Verified by CauseKind
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
                className="text-base sm:text-lg lg:text-[clamp(0.95rem,1.9vh,1.125rem)] text-stone-900 dark:text-stone-100 leading-relaxed max-w-[480px] mb-7 lg:mb-[2.4vh] font-normal [text-shadow:0_1px_2px_rgba(255,255,255,0.9),0_0_12px_rgba(255,255,255,0.85)] dark:[text-shadow:0_1px_2px_rgba(0,0,0,0.9),0_0_12px_rgba(0,0,0,0.85)]"
              >
                {subheadline}
              </motion.p>

              {/* 4. Action CTAs */}
              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto mb-3 relative"
              >
                {/* Post a Request Button */}
                {canPostRequest ? (
                  <Link
                    href="/ngo/requests/new"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-ngo-700 hover:bg-ngo-600 active:bg-ngo-800 active:scale-[0.98] text-white font-bold px-7 py-3.5 lg:py-[1.4vh] text-sm sm:text-base shadow-lg shadow-ngo-700/25 hover:shadow-xl hover:shadow-ngo-700/40 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ngo-700 focus:ring-offset-2"
                  >
                    <span>Post a Request</span>
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
                      <span>Post a Request</span>
                    </button>

                    {/* Desktop Tooltip on Click */}
                    <AnimatePresence>
                      {showLockedTooltip && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          className="hidden sm:block absolute left-0 top-full mt-2 w-72 rounded-2xl bg-stone-900 dark:bg-zinc-800 text-white p-3.5 shadow-2xl z-30 text-xs"
                        >
                          <div className="flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div className="space-y-2">
                              <p className="font-medium text-stone-200 leading-snug">
                                {status === "incomplete" && (stepNumber === 0 ? "Start your application to get verified." : "Complete your profile to get verified.")}
                                {status === "under_review" && "Your application is under review. We'll unlock this once you're approved."}
                                {status === "changes_requested" && "A few documents need fixing."}
                                {isPhotosDue && `Upload handover photos for ${photosDueRequestName} to post your next request.`}
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

                {/* Secondary CTA */}
                <Link
                  href={secondaryCtaHref}
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-stone-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 hover:bg-stone-50 dark:hover:bg-zinc-800 active:scale-[0.98] text-stone-800 dark:text-stone-200 font-bold px-6 py-3.5 lg:py-[1.4vh] text-sm sm:text-base backdrop-blur-sm shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ngo-700 focus:ring-offset-2"
                >
                  <span>{secondaryCtaText}</span>
                </Link>

                {/* Drives are the second way in: a time-boxed collection (e.g. 40
                    blankets for a winter drive) alongside ordinary requests. Same gate. */}
                {canPostRequest && (
                  <Link
                    href="/ngo/drives/new"
                    className="inline-flex items-center justify-center gap-1 text-sm font-bold text-ngo-700 dark:text-ngo-300 hover:underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700 rounded"
                  >
                    <span>Or start a drive</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </motion.div>

              {/* Helper Text Under Hero Button */}
              <motion.div
                variants={itemVariants}
                className="flex items-center gap-2 text-3xs sm:text-2xs text-stone-800 dark:text-stone-200 font-medium mb-4 [text-shadow:0_1px_2px_rgba(255,255,255,0.9),0_0_12px_rgba(255,255,255,0.85)] dark:[text-shadow:0_1px_2px_rgba(0,0,0,0.9),0_0_12px_rgba(0,0,0,0.85)]"
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

            {/* RIGHT COLUMN: Verified Floating Request Card (Only shown for verified NGOs) */}
            {isVerified && (
              <div className="lg:col-span-5 flex flex-col items-start lg:items-end justify-end mt-auto">
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
                    {activeRequests === 0 ? (
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-3xs font-semibold text-stone-500 dark:text-stone-400">
                            Your requests will look like this
                          </span>
                          <span className="text-4xs uppercase tracking-wider bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 font-bold px-1.5 py-0.5 rounded">
                            Sample
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 mb-2">
                          40 blankets · Kopri Night Shelter
                        </p>
                        <div className="h-1.5 w-full rounded-full bg-stone-100 dark:bg-zinc-800 overflow-hidden mb-1.5">
                          <div className="h-full bg-ngo-600 rounded-full w-0" />
                        </div>
                        <div className="flex items-center justify-between text-3xs text-stone-500 dark:text-stone-400 font-medium">
                          <span>0 of 40 pledged</span>
                          <span>10 km donor reach</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-3xs font-bold uppercase tracking-wider text-ngo-700 dark:text-ngo-300">
                            Active Request
                          </span>
                          <Link
                            href="/ngo/requests"
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
                    )}
                  </div>
                </motion.div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          LIGHT TRUST CARD (Below the hero)
          ───────────────────────────────────────────────────────────── */}
      <div className="relative z-20 mt-4 sm:mt-5 max-w-7xl lg:max-w-none mx-auto px-4 sm:px-6 lg:px-10 xl:px-12">
        <NgoHeroTrustCard />
      </div>
    </section>
  );
}

export default NgoHero;


