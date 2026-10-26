"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Lock, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { NGO_LOGIN_HREF, type NgoStatusData } from "./useNgoStatus";
import { formatISTDate } from "@/lib/formatIST";
import { NgoGlassStatusChip } from "./NgoSharedComponents";

export function NgoHeroRedesign({ status }: { status: NgoStatusData }) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);

  const {
    isLoading,
    error,
    refresh,
    status: ngoStatus,
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
    viewer,
    rejectionReason,
  } = status;

  // Tooltip state for desktop locked click
  const [showLockedTooltip, setShowLockedTooltip] = useState<boolean>(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading || error) {
      toast.info(isLoading ? "We’re checking your application. Please try again shortly." : "We couldn’t check your application. Please retry.");
      if (error) void refresh();
      return;
    }

    if (ngoStatus === "incomplete") {
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
    } else if (ngoStatus === "pending_otp") {
      toast.info("Verify your email to send your application for review.", {
        action: { label: "Verify", onClick: () => router.push("/profile/ngo-details") },
      });
    } else if (ngoStatus === "under_review") {
      toast.info("Your application is under review. We'll unlock this once you're approved.");
    } else if (ngoStatus === "rejected") {
      toast.info("Your application was not approved. See your application for the reason.");
    } else if (ngoStatus === "changes_requested") {
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
    } else if (lockReason) {
      toast.info(lockReason);
    }

    setShowLockedTooltip(true);
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowLockedTooltip(false);
    }, 4000);
  };

  // Desktop mouse-follow parallax tilt of 4px
  const [mouseTilt, setMouseTilt] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || typeof window === "undefined" || window.innerWidth < 860) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseTilt({ x: nx * 4, y: ny * 4 });
  };
  const handleMouseLeave = () => {
    setMouseTilt({ x: 0, y: 0 });
  };

  // Scroll parallax for photo cards
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const card1ParallaxY = useTransform(scrollYProgress, [0, 1], [0, 36]);
  const card2ParallaxY = useTransform(scrollYProgress, [0, 1], [0, -32]);
  const card3ParallaxY = useTransform(scrollYProgress, [0, 1], [0, 28]);

  // Chip text determination
  let chipText = "Not yet verified · ready to begin";
  if (isVerified) {
    let formattedDate = "";
    if (status.verifiedAt) {
      try {
        const d = new Date(status.verifiedAt);
        if (!isNaN(d.getTime())) {
          formattedDate = formatISTDate(d);
        }
      } catch {}
    }
    chipText = formattedDate ? `Verified NGO · ${formattedDate}` : "Verified NGO";
  } else if (ngoStatus === "pending_otp") {
    chipText = "Email not verified · Action required";
  } else if (ngoStatus === "under_review") {
    chipText = "Application under review · CauseKind team";
  } else if (ngoStatus === "changes_requested") {
    chipText = "Changes requested · Action required";
  } else if (ngoStatus === "rejected") {
    chipText = "Application not approved · Contact support";
  } else if (stepNumber > 0) {
    chipText = `Application in progress · Step ${stepNumber} of ${totalSteps || 6}`;
  }

  // Heading texts
  const headingWords = isVerified
    ? ["You're", "verified.", "Share", "your", "needs."]
    : ["Where", "trusted", "NGOs", "meet", "generous", "donors."];
  const highlightedWord = isVerified ? "verified." : "NGOs";

  const leadText = isVerified
    ? "Your organisation is trusted by donors. Publish a drive and start receiving support today."
    : "CauseKind helps verified NGOs share real needs, connect with donors and receive support with full transparency.";

  // Button Labels & Routing
  let primaryCtaLabel = "Start your application";
  let primaryCtaHref = wizardHref || "/profile/ngo-details";

  if (isVerified) {
    primaryCtaLabel = "Start a Drive";
    primaryCtaHref = "/ngo/drives/new";
  } else if (ngoStatus === "incomplete") {
    primaryCtaLabel = stepNumber === 0 ? "Start your application" : "Continue application";
    primaryCtaHref = wizardHref || "/profile/ngo-details";
  } else if (ngoStatus === "pending_otp") {
    primaryCtaLabel = "Verify your email";
    primaryCtaHref = "/profile/ngo-details";
  } else if (ngoStatus === "under_review") {
    primaryCtaLabel = "View application status";
    primaryCtaHref = "/profile/ngo-details";
  } else if (ngoStatus === "changes_requested") {
    primaryCtaLabel = "Fix documents";
    primaryCtaHref = "/profile/ngo-details";
  } else if (ngoStatus === "rejected") {
    primaryCtaLabel = "View my application";
    primaryCtaHref = "/profile/ngo-details";
  }
  if (viewer === "guest") {
    primaryCtaLabel = "Log in as an NGO to apply";
    primaryCtaHref = NGO_LOGIN_HREF;
  }

  return (
    <section
      id="ngo-hero"
      ref={heroRef}
      className="relative w-full overflow-hidden bg-[#0B3D2E] text-[#F6F1E4] min-h-[calc(100vh-80px)] lg:min-h-screen pt-[120px] pb-[96px] flex items-center"
    >
      {/* Animated Mesh Layer */}
      <div className="ngo-hero-bg" aria-hidden="true" />
      {/* Noise Grain Overlay at 12% */}
      <div className="ngo-hero-grain" aria-hidden="true" />

      <div className="ngo-container relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-8 lg:gap-12 items-center">
          {/* Left Column (1.15fr) */}
          <div className="flex flex-col items-start z-10">
            {/* Status Chip */}
            <div className="mb-6">
              <NgoGlassStatusChip text={chipText} />
              {isVerified && <span className="sr-only">Verified by CauseKind</span>}
            </div>

            {/* Staggered Rising H1 */}
            <h1 className="ngo-heading text-[clamp(44px,7vw,90px)] text-white tracking-[-0.025em] leading-[1.05] mb-5">
              {headingWords.map((word, i) => {
                const isTarget = word.toLowerCase() === highlightedWord.toLowerCase();
                return (
                  <span
                    key={i}
                    className="inline-block mr-[0.26em] overflow-hidden align-top"
                  >
                    <motion.span
                      initial={{ y: shouldReduceMotion ? 0 : 46, opacity: shouldReduceMotion ? 1 : 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : 0.9,
                        delay: shouldReduceMotion ? 0 : i * 0.1,
                        ease: [0.2, 0.8, 0.2, 1],
                      }}
                      className={`inline-block ${
                        isTarget ? "ngo-gold-underline" : ""
                      }`}
                    >
                      {word}
                    </motion.span>
                  </span>
                );
              })}
            </h1>

            {/* Non-Approved Status & Reason Inline Chip */}
            {!isVerified && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs text-[#F2C969] mb-5 backdrop-blur-md max-w-xl">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#F2C969]" />
                <span className="font-medium text-[#EFEADB] leading-snug">
                  {ngoStatus === "under_review" && (
                    <>
                      <strong className="text-white">Application under review:</strong> Our team is checking your documents (24–48 hours).
                    </>
                  )}
                  {ngoStatus === "changes_requested" && (
                    <>
                      <strong className="text-white">Action required:</strong> A few documents need fixing or clarification.
                    </>
                  )}
                  {ngoStatus === "rejected" && (
                    <>
                      <strong className="text-white">Application declined:</strong> {rejectionReason || "The submitted papers could not be verified with compliance criteria."}
                    </>
                  )}
                  {ngoStatus === "incomplete" && (
                    stepNumber > 0 ? (
                      <>
                        <strong className="text-white">Step {stepNumber} of {totalSteps || 6} completed:</strong> Complete your profile to get verified.
                      </>
                    ) : (
                      <>
                        <strong className="text-white">Ready to begin:</strong> Start your application to get verified.
                      </>
                    )
                  )}
                </span>
              </div>
            )}

            {/* Lead */}
            <p className="text-[18px] md:text-[19px] leading-[1.6] text-[#EFEADB]/90 max-w-[520px] mb-8 font-normal">
              {leadText}
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-wrap items-center gap-4 mb-3 relative z-20">
              {/* Primary Action Button */}
              {isVerified ? (
                canPostRequest ? (
                  <Link
                    href={primaryCtaHref}
                    className="ngo-btn-pill ngo-btn-gold ngo-btn-shine bg-ngo-700 text-[#071A13]"
                  >
                    <span>Start a Drive</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleLockedClick}
                      aria-disabled="true"
                      className="ngo-btn-pill ngo-btn-outline opacity-75 cursor-not-allowed bg-stone-800/60"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      <span>Start a Drive</span>
                    </button>
                  </div>
                )
              ) : (
                <Link
                  href={primaryCtaHref}
                  className="ngo-btn-pill ngo-btn-gold ngo-btn-shine"
                >
                  <span>{primaryCtaLabel}</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              )}

              {/* Secondary Action Button */}
              {isVerified ? (
                <Link
                  href="/dashboard/ngo#live-drives"
                  className="ngo-btn-pill ngo-btn-outline"
                >
                  <span>Manage drives</span>
                </Link>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={handleLockedClick}
                    aria-disabled="true"
                    className="ngo-btn-pill ngo-btn-outline"
                  >
                    <Lock className="w-4 h-4 mr-2 text-[#D9A441]" />
                    <span>Start a Drive</span>
                  </button>

                  {/* Desktop Tooltip on Click */}
                  <AnimatePresence>
                    {showLockedTooltip && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.95 }}
                        className="hidden sm:block absolute left-0 top-full mt-3 w-80 rounded-2xl bg-[#071A13] border border-white/20 text-[#EFEADB] p-4 shadow-2xl z-30 text-xs backdrop-blur-md"
                      >
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-4 h-4 text-[#F2C969] shrink-0 mt-0.5" />
                          <div className="space-y-2">
                            <p className="font-medium leading-relaxed">
                              {ngoStatus === "incomplete" && (stepNumber === 0 ? "Start your application to get verified." : "Complete your profile to get verified.")}
                              {ngoStatus === "under_review" && "Your application is under review. We'll unlock this once you're approved."}
                              {ngoStatus === "changes_requested" && "A few documents need fixing."}
                              {isPhotosDue && `Upload handover photos for ${photosDueRequestName} to start your next drive.`}
                              {lockReason && ngoStatus !== "incomplete" && ngoStatus !== "under_review" && ngoStatus !== "changes_requested" && lockReason}
                            </p>
                            {ngoStatus === "incomplete" && (
                              <Link
                                href={wizardHref || "/profile/ngo-details"}
                                className="inline-flex items-center gap-1 text-xs font-bold text-[#F2C969] hover:underline"
                              >
                                <span>{stepNumber === 0 ? "Start application →" : "Continue application →"}</span>
                              </Link>
                            )}
                            {ngoStatus === "changes_requested" && (
                              <Link
                                href="/profile/ngo-details"
                                className="inline-flex items-center gap-1 text-xs font-bold text-[#F2C969] hover:underline"
                              >
                                <span>Fix now →</span>
                              </Link>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Microcopy Line below buttons: Nothing overlaps or covers buttons */}
            <div className="flex items-center gap-2 text-xs text-[#EFEADB]/75 font-medium mt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#5BE49B] shrink-0" />
              <span>Direct handovers · 10 km donor reach · Verified impact certificates</span>
            </div>
          </div>

          {/* Right Column (.85fr): Clean 3-Photo Cluster (Desktop) + 2-Column Grid (Mobile) */}
          <div className="flex flex-col items-center justify-center w-full">
            {/* ------------------------------------------------------------- */}
            {/* DESKTOP PHOTO CLUSTER (~440px tall, visible >= lg / 860px)    */}
            {/* ------------------------------------------------------------- */}
            <div
              className="hidden lg:block relative w-full max-w-[490px] h-[440px]"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Soft Gold & Emerald Glow behind cluster */}
              <div
                className="absolute top-8 right-2 w-[390px] h-[390px] rounded-full bg-[radial-gradient(circle,rgba(217,164,65,0.20)_0%,rgba(47,143,91,0.12)_45%,transparent_72%)] blur-3xl pointer-events-none z-0"
                aria-hidden="true"
              />

              {/* Faint Dotted & Arc SVG Decoration */}
              <svg
                className="absolute -top-6 -right-4 w-[470px] h-[470px] pointer-events-none z-0 opacity-35"
                viewBox="0 0 500 500"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="270" cy="230" r="150" stroke="#D9A441" strokeWidth="1.5" strokeDasharray="5 7" />
                <circle cx="270" cy="230" r="210" stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeDasharray="4 6" />
                <circle cx="270" cy="230" r="260" stroke="#2F8F5B" strokeWidth="1.2" strokeOpacity="0.4" strokeDasharray="6 8" />
                <circle cx="270" cy="80" r="4.5" fill="#D9A441" />
                <circle cx="420" cy="230" r="3.5" fill="#F2C969" />
                <circle cx="120" cy="230" r="4" fill="#5BE49B" />
              </svg>

              {/* Corner Badge 1: Top-Left (Verified impact certificates) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="absolute -top-3 left-1 z-30 ngo-cluster-float-badge-1 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#071A13]/85 backdrop-blur-md border border-white/25 text-[#EFEADB] text-xs font-semibold shadow-xl pointer-events-none"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#5BE49B] shrink-0" />
                <span>Verified impact certificates</span>
              </motion.div>

              {/* Photo 1: Large portrait (about 54% wide x 380px, left, -4deg) */}
              <motion.div
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 35 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0, ease: [0.2, 0.8, 0.2, 1] }}
                style={{
                  y: shouldReduceMotion ? 0 : card1ParallaxY,
                  x: shouldReduceMotion ? 0 : mouseTilt.x * 0.9,
                }}
                className="absolute top-[30px] left-0 z-10 w-[265px] h-[380px]"
              >
                <div className="ngo-cluster-float-1 -rotate-[4deg] w-full h-full rounded-[28px] border border-white/25 shadow-[0_24px_50px_-10px_rgba(0,0,0,0.65)] overflow-hidden relative group">
                  <Image
                    src="/images/ngo-hero/col-b-1-school-supplies.webp"
                    alt="Indian students in classroom receiving notebooks and learning kits"
                    fill
                    sizes="(max-width: 860px) 100vw, 270px"
                    priority
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                  <div className="absolute bottom-3.5 left-3.5 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/45 backdrop-blur-md border border-white/20 text-white text-[12px] font-medium shadow-md pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5BE49B]" />
                    <span>Classroom supplies</span>
                  </div>
                </div>
              </motion.div>

              {/* Photo 2: Wide card (about 50% x 190px, top-right, +4deg) */}
              <motion.div
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 35 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0.12, ease: [0.2, 0.8, 0.2, 1] }}
                style={{
                  y: shouldReduceMotion ? 0 : card2ParallaxY,
                  x: shouldReduceMotion ? 0 : mouseTilt.x * -0.8,
                }}
                className="absolute top-[18px] right-0 z-20 w-[245px] h-[190px]"
              >
                <div className="ngo-cluster-float-2 rotate-[4deg] w-full h-full rounded-[24px] border border-white/25 shadow-[0_20px_45px_-8px_rgba(0,0,0,0.55)] overflow-hidden relative group">
                  <Image
                    src="/images/ngo-hero/col-a-1-blankets-pune.webp"
                    alt="Distribution of warm winter blankets and clothing to beneficiaries"
                    fill
                    sizes="(max-width: 860px) 50vw, 250px"
                    loading="lazy"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/45 backdrop-blur-md border border-white/20 text-white text-[12px] font-medium shadow-md pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D9A441]" />
                    <span>Winter clothing</span>
                  </div>
                </div>
              </motion.div>

              {/* Photo 3: Medium card (about 46% x 200px, bottom-right, -2deg) */}
              <motion.div
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 35 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
                style={{
                  y: shouldReduceMotion ? 0 : card3ParallaxY,
                  x: shouldReduceMotion ? 0 : mouseTilt.x * 0.7,
                }}
                className="absolute top-[222px] right-[10px] z-20 w-[225px] h-[200px]"
              >
                <div className="ngo-cluster-float-3 -rotate-[2deg] w-full h-full rounded-[24px] border border-white/25 shadow-[0_20px_40px_-8px_rgba(0,0,0,0.55)] overflow-hidden relative group">
                  <Image
                    src="/images/ngo-hero/col-a-3-ration-drive.webp"
                    alt="Essential food and ration kits packed for distribution"
                    fill
                    sizes="(max-width: 860px) 50vw, 230px"
                    loading="lazy"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                  <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/45 backdrop-blur-md border border-white/20 text-white text-[11px] font-medium shadow-md pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5BE49B]" />
                    <span>Food and ration kits</span>
                  </div>
                </div>
              </motion.div>

              {/* Corner Badge 2: Bottom-Right (10 km donor reach) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.54 }}
                className="absolute -bottom-3 right-1 z-30 ngo-cluster-float-badge-2 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#071A13]/85 backdrop-blur-md border border-white/25 text-[#EFEADB] text-xs font-semibold shadow-xl pointer-events-none"
              >
                <span className="w-2 h-2 rounded-full bg-[#D9A441] shrink-0 shadow-[0_0_8px_#D9A441]" />
                <span>10 km donor reach</span>
              </motion.div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* MOBILE PHOTO GRID (< 860px / lg)                               */}
            {/* ------------------------------------------------------------- */}
            <div className="block lg:hidden w-full max-w-[480px] mx-auto mt-8">
              <div className="grid grid-cols-2 gap-3 h-[340px] w-full overflow-hidden relative z-10 ngo-cluster-mobile-float">
                {/* Large card spanning 2 columns */}
                <div className="col-span-2 h-[195px] relative rounded-[24px] overflow-hidden border border-white/25 shadow-lg group">
                  <Image
                    src="/images/ngo-hero/col-b-1-school-supplies.webp"
                    alt="Indian students in classroom receiving notebooks and learning kits"
                    fill
                    sizes="(max-width: 860px) 100vw, 480px"
                    priority
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-[12px] font-medium shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5BE49B]" />
                    <span>Classroom supplies</span>
                  </div>
                </div>

                {/* Small Card 1 (Winter clothing) */}
                <div className="col-span-1 h-[130px] relative rounded-[20px] overflow-hidden border border-white/25 shadow-lg group">
                  <Image
                    src="/images/ngo-hero/col-a-1-blankets-pune.webp"
                    alt="Distribution of warm winter blankets and clothing"
                    fill
                    sizes="(max-width: 860px) 50vw, 240px"
                    loading="lazy"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                  <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-[11px] font-medium shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D9A441]" />
                    <span>Winter clothing</span>
                  </div>
                </div>

                {/* Small Card 2 (Food and ration kits) */}
                <div className="col-span-1 h-[130px] relative rounded-[20px] overflow-hidden border border-white/25 shadow-lg group">
                  <Image
                    src="/images/ngo-hero/col-a-3-ration-drive.webp"
                    alt="Essential food and ration kits packed for distribution"
                    fill
                    sizes="(max-width: 860px) 50vw, 240px"
                    loading="lazy"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                  <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-[11px] font-medium shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5BE49B]" />
                    <span>Food and ration kits</span>
                  </div>
                </div>
              </div>
            </div>

            {/* NGO's Live Drive Card (if active requests exist) */}
            {activeRequests > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[490px] mt-4 rounded-[20px] bg-[#071A13]/90 border border-white/20 p-4 backdrop-blur-xl text-white shadow-xl relative z-20"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase font-bold tracking-wider text-[#5BE49B]">
                    Live Drive
                  </span>
                  <Link
                    href="/dashboard/ngo#live-drives"
                    className="text-xs text-[#EFEADB]/80 hover:text-white underline"
                  >
                    View all →
                  </Link>
                </div>
                <p className="text-sm font-semibold mb-1.5 truncate">
                  {photosDueRequestName || "Community Support Drive"}
                </p>
                <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden mb-2">
                  <div
                    className="h-full bg-[#2F8F5B] rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(20, (itemsPledged / (itemsPledged + 10)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-[#EFEADB]/70">
                  <span>{itemsPledged} items pledged</span>
                  <span className="text-[#5BE49B] font-medium">Active</span>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default NgoHeroRedesign;
