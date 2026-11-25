"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { AlertCircle, ArrowRight, Lock, ShieldCheck, ChevronRight } from "lucide-react";
import type { NgoStatusData } from "./useNgoStatus";
import { formatISTDate } from "@/lib/formatIST";

/* ==========================================================================
   1. Interactive 3D Card with Tilt, Glare, Corner Glow & Hover Lift
   ========================================================================== */
interface NgoCardProps {
  number?: string;
  tag?: string;
  title: string;
  body: string;
  children?: React.ReactNode;
  className?: string;
  isDarkBand?: boolean;
}

export function NgoCard({
  number,
  tag,
  title,
  body,
  children,
  className = "",
  isDarkBand = false,
}: NgoCardProps) {
  return (
    <div className={`ngo-card ngo-card-interactive group ${className}`}>
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          {tag && (
            <span className="ngo-card-tag mb-3">
              {tag}
            </span>
          )}
          {number && (
            <span className="ngo-card-number">{number}</span>
          )}
          <h3 className="ngo-card-title">{title}</h3>
          <p className="ngo-card-body">{body}</p>
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}

/* ==========================================================================
   2. Section Header (Eyebrow + H2)
   ========================================================================== */
interface SectionHeaderProps {
  eyebrow: string;
  h2: string;
  lead?: string;
  align?: "left" | "center";
  isDark?: boolean;
  highlightWord?: string;
  className?: string;
}

export function NgoSectionHeader({
  eyebrow,
  h2,
  lead,
  align = "left",
  isDark = false,
  highlightWord,
  className = "",
}: SectionHeaderProps) {
  const words = h2.split(" ");

  return (
    <div className={`mb-12 md:mb-16 ${align === "center" ? "text-center max-w-3xl mx-auto" : "max-w-3xl"} ${className}`}>
      <span className={`ngo-eyebrow ${isDark ? "ngo-eyebrow-dark" : ""}`}>
        {eyebrow}
      </span>
      <h2 className="ngo-h2">
        {highlightWord ? (
          words.map((w, idx) => {
            const cleanWord = w.replace(/[.,]/g, "");
            const isTarget = cleanWord.toLowerCase() === highlightWord.toLowerCase();
            return (
              <React.Fragment key={idx}>
                {isTarget ? (
                  <span className="ngo-gold-underline">{w}</span>
                ) : (
                  w
                )}
                {idx < words.length - 1 ? " " : ""}
              </React.Fragment>
            );
          })
        ) : (
          h2
        )}
      </h2>
      {lead && (
        <p className="mt-4 text-base md:text-lg opacity-80 max-w-2xl leading-relaxed">
          {lead}
        </p>
      )}
    </div>
  );
}

/* ==========================================================================
   3. Glass Status Chip
   ========================================================================== */
export function NgoGlassStatusChip({ text }: { text: string }) {
  return (
    <div className="ngo-glass-chip" role="status">
      <span className="ngo-live-dot-ping" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

/* ==========================================================================
   4. Glass Status Card (Hero / Status View per state)
   ========================================================================== */
interface GlassStatusCardProps {
  status: NgoStatusData;
  className?: string;
}

export function NgoGlassStatusCard({ status, className = "" }: GlassStatusCardProps) {
  const { isVerified, status: ngoStatus, stepNumber, totalSteps, wizardHref } = status;

  if (isVerified) {
    // Approved State: 150px Gold Progress Ring + Verification Complete
    const r = 60;
    const circ = 2 * Math.PI * r;
    let formattedDate = "";
    if (status.verifiedAt) {
      try {
        const d = new Date(status.verifiedAt);
        if (!isNaN(d.getTime())) {
          formattedDate = formatISTDate(d);
        }
      } catch { }
    }

    return (
      <div className={`ngo-glass-card max-w-md w-full ${className}`}>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-[150px] h-[150px] flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 150 150">
              <circle
                cx="75"
                cy="75"
                r={r}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="10"
                fill="none"
              />
              <circle
                cx="75"
                cy="75"
                r={r}
                stroke="#D9A441"
                strokeWidth="10"
                strokeDasharray={circ}
                strokeDashoffset="0"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <ShieldCheck className="w-8 h-8 text-[#D9A441] mb-1" />
              <span className="text-xs uppercase tracking-wider font-semibold text-[#F2C969]">100%</span>
            </div>
          </div>

          <div className="text-center sm:text-left">
            <div className="flex flex-wrap items-center gap-2 mb-2 justify-center sm:justify-start">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#D9A441]/20 text-[#F2C969] border border-[#D9A441]/30">
                Verification complete
              </span>
              {formattedDate && (
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/10 text-[#5BE49B] border border-white/15">
                  Verified {formattedDate}
                </span>
              )}
            </div>
            <h3 className="ngo-heading text-2xl text-white mb-1">Welcome aboard</h3>
            <p className="text-sm text-[#EFEADB]/80 leading-relaxed">
              Next: publish your first drive.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Before-Verification States
  let percent = 0;
  let tag = "Ready to begin";
  let title = "Application in progress";
  let nextText = "Complete your profile to get verified.";
  let reason = "";
  let actionLabel = stepNumber === 0 ? "Start application" : "Resume application";
  let actionHref = wizardHref || "/profile/ngo-details";

  if (ngoStatus === "incomplete") {
    percent = Math.round((stepNumber / (totalSteps || 6)) * 100);
    tag = `Step ${stepNumber} of ${totalSteps || 6}`;
    title = stepNumber === 0 ? "New NGO profile" : "Complete your profile";
    nextText = "Upload your organization documents to submit for verification.";
  } else if (ngoStatus === "pending_otp") {
    percent = 90;
    tag = "Email not verified";
    title = "Verify your email";
    nextText = "Enter the code we emailed to your account address to send your application for review.";
    actionLabel = "Verify your email";
    actionHref = "/profile/ngo-details";
  } else if (ngoStatus === "under_review") {
    percent = 75;
    tag = "Under review";
    title = "Verification in progress";
    nextText = "Our team is reviewing your documents. Typically takes 2–3 business days.";
    actionLabel = "View application status";
    actionHref = "/profile/ngo-details";
  } else if (ngoStatus === "changes_requested") {
    percent = 50;
    tag = "Changes requested";
    title = "Action required";
    reason = "A few documents need updating or clarification before verification.";
    nextText = "Please update your submitted files to resume review.";
    actionLabel = "Fix documents";
    actionHref = "/profile/ngo-details";
  } else if (ngoStatus === "rejected") {
    percent = 25;
    tag = "Review not approved";
    title = "Application declined";
    reason = status.rejectionReason || "The submitted papers could not be verified with our compliance criteria.";
    nextText = "Contact support if you have questions about this decision.";
    actionLabel = "View my application";
    actionHref = "/profile/ngo-details";
  }

  if (status.viewer === "guest") {
    actionLabel = "Log in as an NGO to apply";
  }

  const r = 45;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;

  return (
    <div className={`ngo-glass-card max-w-md w-full ${className}`}>
      <div className="flex items-start gap-5">
        <div className="relative w-[110px] h-[110px] flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 110 110">
            <circle
              cx="55"
              cy="55"
              r={r}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="55"
              cy="55"
              r={r}
              stroke={ngoStatus === "changes_requested" || ngoStatus === "rejected" ? "#F2C969" : "#2F8F5B"}
              strokeWidth="8"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-lg font-bold text-white">{percent}%</span>
            <span className="text-[10px] uppercase text-[#EFEADB]/70">Progress</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-[#F2C969] border border-white/15 mb-1.5">
            {tag}
          </span>
          <h4 className="ngo-heading text-xl text-white mb-1 truncate">{title}</h4>
          {reason && (
            <p className="text-xs text-amber-200/90 mb-1 leading-snug">
              {reason}
            </p>
          )}
          <p className="text-xs text-[#EFEADB]/80 leading-relaxed mb-3">
            {nextText}
          </p>
          <Link
            href={actionHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F2C969] hover:text-white transition-colors"
          >
            <span>{actionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   5. Seamless Marquee Loop
   ========================================================================== */
const DEFAULT_MARQUEE_CHIPS = [
  "Document checks",
  "Legal review",
  "AI screening",
  "Team review",
  "Transparent donations",
  "Verified badge",
  "Donor trust",
  "Real needs",
];

export function NgoMarquee({ chips = DEFAULT_MARQUEE_CHIPS }: { chips?: string[] }) {
  // Double chips for seamless looping
  const duplicated = [...chips, ...chips, ...chips, ...chips];

  return (
    <div className="ngo-marquee-wrap" aria-label="Key features marquee">
      <div className="ngo-marquee-track">
        {duplicated.map((item, idx) => (
          <div key={idx} className="ngo-marquee-pill">
            <span className="gold-dot" aria-hidden="true" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==========================================================================
   6. Final CTA Band with Container-Bound Floating Photo Cards
   ========================================================================== */
export interface NgoFinalCtaBandProps {
  headline: React.ReactNode;
  primaryButton: {
    label: string;
    href?: string;
    showArrow?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    disabled?: boolean;
    isLocked?: boolean;
  };
  secondaryButton?: {
    label: string;
    href: string;
  };
  /** Two portrait (4:5) photos; the cards use the same ratio so nothing is cropped. */
  photos?: [CtaPhoto, CtaPhoto];
}

export type CtaPhoto = { src: string; alt: string };
const DEFAULT_CTA_PHOTOS: [CtaPhoto, CtaPhoto] = [
  { src: "/images/ngo-landing/ngo-children-school-bags-portrait.webp", alt: "Village children smiling with their new school bags" },
  { src: "/images/ngo-landing/ngo-clothes-toys-doorstep-portrait.webp", alt: "A volunteer handing a box of folded clothes and a teddy bear to a woman at her door" },
];

export function NgoFinalCtaBand({
  headline,
  primaryButton,
  secondaryButton,
  photos = DEFAULT_CTA_PHOTOS,
}: NgoFinalCtaBandProps) {
  const reduce = useReducedMotion();
  const photo = photos[0];
  return (
    <div className="ngo-cta-band-wrapper w-full overflow-x-clip">
      <section className="relative isolate flex min-h-[560px] w-full items-end overflow-hidden bg-[var(--ngo-darkest)] text-white md:min-h-[640px]">
        <motion.div
          className="absolute inset-0 -z-10"
          initial={reduce ? false : { scale: 1.12 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image src={photo.src} alt={photo.alt} fill sizes="100vw" className="object-cover object-[center_35%]" loading="lazy" />
        </motion.div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/45 to-black/5 md:from-black/70 md:via-black/20" />
        {/* md+: shade the right side, where the text now sits, and keep the photo's subject (left) clear. */}
        <div className="absolute inset-0 -z-10 hidden bg-gradient-to-l from-black/75 via-black/35 to-transparent md:block" />

        <motion.div
          className="ngo-container flex py-14 md:justify-end md:py-24"
          initial={reduce ? false : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        >
          <div className="max-w-[760px] md:max-w-[min(560px,48%)]">
            <h2 className="ngo-heading text-[clamp(40px,6.4vw,96px)] md:text-[clamp(40px,4.6vw,76px)] mb-8 md:mb-10 leading-[1] tracking-[-0.04em]">
              {headline}
            </h2>
            <div className="ngo-cta-actions flex w-full flex-wrap items-center gap-3 md:gap-4">
              {primaryButton.isLocked || primaryButton.disabled || !primaryButton.href ? (
                <button
                  type="button"
                  onClick={primaryButton.onClick}
                  aria-disabled={primaryButton.disabled ? "true" : undefined}
                  className="ngo-btn-pill ngo-btn-gold ngo-btn-shine cursor-pointer max-sm:flex-1 max-sm:justify-center"
                >
                  <span>{primaryButton.label}</span>
                  {primaryButton.showArrow !== false && <ArrowRight className="w-4 h-4 ml-2" />}
                </button>
              ) : (
                <Link href={primaryButton.href} className="ngo-btn-pill ngo-btn-gold ngo-btn-shine max-sm:flex-1 max-sm:justify-center">
                  <span>{primaryButton.label}</span>
                  {primaryButton.showArrow !== false && <ArrowRight className="w-4 h-4 ml-2" />}
                </Link>
              )}
              {secondaryButton && (
                <Link href={secondaryButton.href} className="ngo-btn-pill ngo-btn-outline backdrop-blur-md max-sm:flex-1 max-sm:justify-center">
                  <span>{secondaryButton.label}</span>
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
