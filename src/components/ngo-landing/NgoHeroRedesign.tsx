"use client";

import { NGO_TOAST_STYLE } from "./ngoToastStyle";
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
          ? "Start your application to get verified."
          : "Complete your profile to get verified.",
        {
          ...NGO_TOAST_STYLE,
          action: {
            label: isZero ? "Start now" : "Continue",
            onClick: () => router.push(wizardHref || "/profile/ngo-details"),
          },
        }
      );
    } else if (ngoStatus === "pending_otp") {
      toast.info("Verify your email to send your application for review.", {
        ...NGO_TOAST_STYLE,
        action: { label: "Verify", onClick: () => router.push("/profile/ngo-details") },
      });
    } else if (ngoStatus === "under_review") {
      toast.info("Your application is under review. We'll unlock this once you're approved.");
    } else if (ngoStatus === "rejected") {
      toast.info("Your application was not approved. See your application for the reason.");
    } else if (ngoStatus === "changes_requested") {
      toast.warning("A few documents need fixing.", {
        ...NGO_TOAST_STYLE,
        action: {
          label: "Fix now",
          onClick: () => router.push("/profile/ngo-details"),
        },
      });
    } else if (isPhotosDue) {
      toast.warning(`Upload handover photos for ${photosDueRequestName} to start your next drive.`, {
        ...NGO_TOAST_STYLE,
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
  const stageY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const stageScale = useTransform(scrollYProgress, [0, 1], [1.06, 1.14]);

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
      className="relative w-full overflow-hidden bg-[#0B3D2E] text-[#F6F1E4] min-h-[calc(100vh-80px)] lg:min-h-[calc(100vh-72px)] pt-[120px] pb-[96px] lg:pt-24 lg:pb-20 flex items-center lg:items-end ck-ngo-hero-stage"
    >
      {/* Animated Mesh Layer */}
      <div className="ngo-hero-bg max-md:hidden lg:hidden" aria-hidden="true" />
      {/* Noise Grain Overlay at 12% */}
      <div className="ngo-hero-grain max-md:hidden lg:hidden" aria-hidden="true" />
      {/* Mobile (<768px): full-bleed photo with a dark bottom gradient, the same
          pattern as the guest homepage hero; text and buttons sit over it. */}
      <div data-testid="ngo-hero-mobile-photo" className="absolute inset-0 z-0 md:hidden" aria-hidden="true">
        <Image src="/images/ngo-landing/ngo-hero-mobile.webp" alt="" fill priority fetchPriority="high" sizes="100vw" className="object-cover object-[center_30%]" />
        <div className="ck-ngo-hero-shade absolute inset-0" />
      </div>

      {/* Desktop (lg+): one full-bleed photo, slow zoom + parallax, dark gradients only (no colour tint). */}
      <div className="ck-ngo-hero-stage-photo absolute inset-0 z-0 hidden overflow-hidden lg:block" aria-hidden="true">
        <motion.div className="absolute inset-0 will-change-transform"
          style={shouldReduceMotion ? undefined : { y: stageY, scale: stageScale }}>
          <Image src="/images/ngo-landing/ngo-winter-blankets-elderly-landscape.webp" alt="" fill priority sizes="100vw" className="object-cover object-[center_45%]" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/20 to-transparent" />
      </div>

      <div className="ngo-container relative z-10 w-full lg:!max-w-none lg:!px-10 xl:!px-14">
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 lg:gap-14 items-center lg:items-end max-md:gap-0">
          {/* Left Column (1.15fr) */}
          <div className="ck-ngo-hero-copy flex flex-col items-start z-10 lg:max-w-[560px] xl:max-w-[600px]">
            {/* Status Chip */}
            <div className="ck-ngo-hero-badge mb-6">
              <NgoGlassStatusChip text={chipText} />
              {isVerified && <span className="sr-only">Verified by CauseKind</span>}
            </div>

            {/* Staggered Rising H1 */}
            <h1 className="ck-ngo-hero-title ngo-heading text-[clamp(44px,7vw,90px)] lg:text-[clamp(56px,5.6vw,92px)] text-white tracking-[-0.025em] lg:tracking-[-0.045em] leading-[1.05] lg:leading-[0.98] mb-5 lg:mb-7">
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
              <div className="ck-ngo-hero-alert flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs text-[#F2C969] mb-5 backdrop-blur-md max-w-xl">
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
            <p className="ck-ngo-hero-sub text-[18px] md:text-[19px] lg:text-[21px] leading-[1.6] text-[#EFEADB]/90 max-w-[520px] lg:max-w-[560px] mb-8 lg:mb-10 font-normal lg:font-light">
              {leadText}
            </p>

            {/* Hero CTAs */}
            <div className="ck-ngo-hero-ctas flex flex-wrap items-center gap-4 mb-3 relative z-20">
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
                  prefetch={viewer === "guest" ? false : undefined}
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
            <div className="ck-ngo-hero-trust flex items-center gap-2 text-xs text-[#EFEADB]/75 font-medium mt-2 lg:mt-4 lg:rounded-full lg:border lg:border-white/15 lg:bg-black/30 lg:px-4 lg:py-2 lg:backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5 text-[#5BE49B] shrink-0" />
              {/* Two lines on mobile so nothing is cut off under the chat bubble. */}
              <span className="max-md:!whitespace-normal max-md:!overflow-visible max-md:leading-snug">
                <span className="max-md:block">Direct handovers · 10 km donor reach</span>
                <span className="max-md:hidden"> · </span>
                <span className="max-md:block">Verified impact certificates</span>
              </span>
            </div>
          </div>

          {/* Right Column (.85fr): Clean 3-Photo Cluster (Desktop) + 2-Column Grid (Mobile) */}
          <div className="flex flex-col items-center justify-center w-full">
            {/* ------------------------------------------------------------- */}
            {/* DESKTOP PHOTO CLUSTER (~440px tall, visible >= lg / 860px)    */}
            {/* ------------------------------------------------------------- */}
            {/* Desktop right side intentionally empty: the photo carries it. */}
            <div className="hidden lg:block" aria-hidden="true" />

            {/* ------------------------------------------------------------- */}
            {/* MOBILE PHOTO GRID (< 860px / lg)                               */}
            {/* ------------------------------------------------------------- */}
            <div data-testid="ngo-hero-mobile-collage" className="hidden md:block lg:hidden w-full max-w-[480px] mx-auto mt-8">
              <div className="grid grid-cols-2 gap-3 w-full relative z-10 ngo-cluster-mobile-float">
                {[
                  { src: "ngo-school-supplies-girl-portrait.webp", alt: "A volunteer handing notebooks and a pencil box to a smiling schoolgirl", caption: "School kit handover", ratio: "aspect-[4/5]" },
                  { src: "ngo-children-school-bags-portrait.webp", alt: "Village children smiling with their new school bags", caption: "New school bags", ratio: "aspect-[4/5]" },
                  { src: "ngo-ration-distribution-landscape.webp", alt: "Volunteers handing a grain sack and ration box to villagers", caption: "Ration distribution", ratio: "col-span-2 aspect-[3/2]" },
                ].map((p, i) => (
                  <div key={p.src} className={`${p.ratio} relative rounded-[20px] overflow-hidden border border-white/25 shadow-lg`}>
                    <Image src={`/images/ngo-landing/${p.src}`} alt={p.alt} fill sizes={p.ratio.includes("col-span-2") ? "(max-width: 520px) 100vw, 480px" : "(max-width: 520px) 50vw, 240px"} priority={i === 0} loading={i === 0 ? undefined : "lazy"} className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-[11px] font-medium shadow-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#5BE49B]" />
                      <span>{p.caption}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* NGO's Live Drive Card (if active requests exist) */}
            {activeRequests > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[490px] lg:max-w-[420px] lg:ml-0 mt-4 lg:mt-3 rounded-[20px] lg:rounded-[24px] bg-[#071A13]/90 lg:bg-black/40 border border-white/20 p-4 lg:p-5 backdrop-blur-xl text-white shadow-xl relative z-20"
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
