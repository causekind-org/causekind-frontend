"use client";

import React, { useState, useEffect, useRef } from "react";
import { FEATURES } from "@/lib/features";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Heart,
  HandHeart,
  Building2,
  ArrowRight,
  MessageCircle,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { CONTACT_INFO, LANDING_ROUTES, HOME_ROLE_COLORS } from "@/lib/landingConstants";
import { WhatsAppTellAFriendButton } from "@/components/home/WhatsAppTellAFriend";
import { TRUST_PILL_EYEBROW } from "@/components/home/DoneeSectionHeading";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/** Pre-filled WhatsApp message for launch updates (both layouts). */
const WHATSAPP_NOTIFY_URL = `https://wa.me/917719938619?text=${encodeURIComponent(
  "Hi CauseKind! Please notify me when online donations and fundraising launch."
)}`;

export function FinalCtaSection({
  variant = "desktop",
  card = true,
}: {
  variant?: "desktop" | "mobile";
  /**
   * true: the dark rounded card (signed-in viewers). false: the guest page's
   * split layout ({@link FinalCtaSplit}).
   */
  card?: boolean;
}) {
  return card ? <FinalCtaCard variant={variant} /> : <FinalCtaSplit />;
}

/** The original dark CTA card, unchanged. */
function FinalCtaCard({
  variant,
}: {
  variant: "desktop" | "mobile";
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;

    const mm = gsap.matchMedia();
    const mediaQuery = variant === "desktop" ? "(min-width: 1024px)" : "(max-width: 1023px)";

    mm.add(mediaQuery, () => {
      // 1. Aurora background gradient blobs drift
      gsap.to(".aurora-blob-1", {
        x: 40,
        y: -30,
        scale: 1.15,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".aurora-blob-2", {
        x: -45,
        y: 35,
        scale: 1.2,
        duration: 9,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".aurora-blob-3", {
        x: 30,
        y: 40,
        scale: 0.9,
        duration: 7,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      // 2. Entrance Animation via ScrollTrigger
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: cardRef.current,
          start: "top 80%",
          once: true,
        },
      });

      tl.fromTo(
        cardRef.current,
        { scale: 0.96, opacity: 0, y: 30 },
        { scale: 1, opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
      );

      // Fast Word-by-word reveal for heading
      const words = gsap.utils.toArray<HTMLElement>(".cta-heading-word");
      tl.fromTo(
        words,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.035, ease: "power2.out" },
        "-=0.4"
      );

      // Stagger Buttons
      tl.fromTo(
        ".cta-action-btn",
        { y: 15, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.08, ease: "back.out(1.4)" },
        "-=0.2"
      );
    });

    return () => mm.revert();
  }, [reduce, variant]);

  const whatsappNotifyUrl = WHATSAPP_NOTIFY_URL;

  return (
    <section
      ref={sectionRef}
      id="join"
      aria-label="Join CauseKind"
      className="relative w-full bg-[#FAF7F2] dark:bg-[#0E0C0A] min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-center py-6 sm:py-8 lg:py-6 overflow-hidden"
    >
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 w-full flex flex-col justify-center h-full">
        {/* Main CTA Card */}
        <div
          ref={cardRef}
          className="relative w-full rounded-3xl bg-[#1C1410] dark:bg-[#241A15] border border-stone-800/80 dark:border-stone-700/60 shadow-2xl overflow-hidden p-6 sm:p-8 lg:p-10 text-center flex flex-col justify-between"
        >
          {/* ════════ AURORA DRIFTING BLOBS ════════ */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            {/* Blob 1: Orange Warmth */}
            <div className="aurora-blob-1 absolute top-[-10%] left-[20%] w-[320px] h-[320px] rounded-full bg-[#B5480F]/25 blur-3xl" />
            {/* Blob 2: Peach Glow */}
            <div className="aurora-blob-2 absolute bottom-[-10%] right-[25%] w-[340px] h-[340px] rounded-full bg-[#F4A25B]/20 blur-3xl" />
            {/* Blob 3: Subtle Blue Depth */}
            <div className="aurora-blob-3 absolute top-[30%] left-[55%] w-[260px] h-[260px] rounded-full bg-[#1E3A60]/20 dark:bg-[#7FB0E8]/15 blur-3xl" />
            {/* Dark vignette overlay */}
            <div className="absolute inset-0 bg-radial from-transparent via-[#1C1410]/40 to-[#1C1410]/80 dark:via-[#241A15]/40 dark:to-[#241A15]/80" />
          </div>

          {/* Card Inner Content */}
          <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
            {/* Small Top Eyebrow */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold tracking-widest uppercase bg-white/10 text-amber-200 border border-white/15 mb-3 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#F4A25B]" aria-hidden="true" />
              <span>START IN 60 SECONDS</span>
            </div>

            {/* Heading with Word-by-Word Reveal */}
            <h2
              ref={headingRef}
              className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight"
            >
              <span className="inline-block cta-heading-word mr-1.5">Someone</span>
              <span className="inline-block cta-heading-word mr-1.5">nearby</span>
              <span className="inline-block cta-heading-word mr-1.5">is</span>
              <span className="inline-block cta-heading-word mr-1.5">waiting</span>
              <span className="inline-block cta-heading-word mr-1.5">for</span>
              <span className="inline-block cta-heading-word mr-1.5 text-[#F4A25B]">what</span>
              <span className="inline-block cta-heading-word mr-1.5 text-[#F4A25B]">you</span>
              <span className="inline-block cta-heading-word mr-1.5 text-[#F4A25B]">already</span>
              <span className="inline-block cta-heading-word text-[#F4A25B]">have.</span>
            </h2>

            {/* Subtext */}
            <p className="mt-2.5 text-xs sm:text-sm text-stone-300 max-w-xl leading-relaxed font-normal">
              Join free in a minute. Give, ask, or help your community — whichever side you're on.
            </p>

            {/* ════════ 3 ACTION BUTTONS (1 Row on Desktop, Stacked on Mobile) ════════ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mt-5 sm:mt-6">
              {/* Button 1: Donor */}
              <Link
                href={LANDING_ROUTES.donorRegister}
                className="cta-action-btn relative group overflow-hidden flex items-center justify-center gap-2 px-4 py-3 sm:py-3.5 rounded-xl bg-[#B5480F] hover:bg-[#C95413] text-white font-bold text-xs sm:text-[13px] tracking-wide shadow-md transition-all duration-200 active:scale-95"
              >
                {/* Periodic Shimmer sweep */}
                <span
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                  aria-hidden="true"
                />
                <Heart className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span>Join as Donor</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>

              {/* Button 2: Donee */}
              <Link
                href={LANDING_ROUTES.doneeRegister}
                className="cta-action-btn relative group overflow-hidden flex items-center justify-center gap-2 px-4 py-3 sm:py-3.5 rounded-xl bg-[#1E3A60] hover:bg-[#2D5A96] text-white font-bold text-xs sm:text-[13px] tracking-wide shadow-md transition-all duration-200 active:scale-95"
              >
                {/* Periodic Shimmer sweep */}
                <span
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none delay-100"
                  aria-hidden="true"
                />
                <HandHeart className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span>Join as a Donee</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>

              {/* Button 3: NGO */}
              {FEATURES.ngoRegistration ? <Link
                href={LANDING_ROUTES.ngoRegister}
                className="cta-action-btn relative group overflow-hidden flex items-center justify-center gap-2 px-4 py-3 sm:py-3.5 rounded-xl bg-[#1F6B3F] hover:bg-[#27824D] text-white font-bold text-xs sm:text-[13px] tracking-wide shadow-md transition-all duration-200 active:scale-95"
              >
                {/* Periodic Shimmer sweep */}
                <span
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none delay-200"
                  aria-hidden="true"
                />
                <Building2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span>Register your NGO</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </Link> : (
                <span aria-disabled="true"
                  className="cta-action-btn relative flex items-center justify-center gap-2 px-4 py-3 sm:py-3.5 rounded-xl bg-[#1F6B3F]/60 text-white/90 font-bold text-xs sm:text-[13px] tracking-wide cursor-not-allowed"
                >
                  <Building2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span>Register your NGO</span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">Coming soon</span>
                </span>
              )}
            </div>

            {/* ════════ TELL A FRIEND ON WHATSAPP ════════ */}
            <div className="mt-5 sm:mt-6 flex flex-col items-center gap-2">
              <p className="text-xs sm:text-[13px] font-semibold text-stone-300">
                Know someone who&apos;d love this?
              </p>
              <WhatsAppTellAFriendButton variant="outline" />
            </div>

            {/* Small reassurance line */}
            <p className="mt-3 text-[11px] sm:text-xs font-medium text-stone-400">
              Free for everyone · Verified · Local
            </p>
          </div>

          {/* ════════ COMING SOON STRIP ════════ */}
          <div className="relative z-10 mt-5 pt-4 sm:mt-6 sm:pt-4 border-t border-stone-800 dark:border-stone-700/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div className="text-stone-300 text-xs sm:text-[13px] font-normal text-center sm:text-left">
              <span>Fundraising, online donations and CSR partnerships are coming soon.</span>
            </div>

            <a
              href={whatsappNotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs hover:shadow-emerald-500/20 transition-all duration-200 active:scale-95 flex-shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Get updates on WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * One "choose your path" row per role. Titles are the "How it works" toggle
 * labels; icons and tints are the role icons/colours used across the page.
 */
const PATHS = [
  {
    role: HOME_ROLE_COLORS.donor,
    icon: Heart,
    subline: "Join as a donor",
    href: LANDING_ROUTES.donorRegister,
    ring: "focus-visible:ring-[#B5480F] dark:focus-visible:ring-[#F4A25B]",
  },
  {
    role: HOME_ROLE_COLORS.donee,
    icon: HandHeart,
    subline: "Join as a donee",
    href: LANDING_ROUTES.doneeRegister,
    ring: "focus-visible:ring-[#1E3A60] dark:focus-visible:ring-[#7FB0E8]",
  },
  {
    role: HOME_ROLE_COLORS.ngo,
    icon: Building2,
    subline: FEATURES.ngoRegistration ? "Register your NGO" : "NGO registration · Coming soon",
    // Empty while NGO signup is off: rendered as a "Coming soon" row, not a link.
    href: FEATURES.ngoRegistration ? LANDING_ROUTES.ngoRegister : "",
    ring: "focus-visible:ring-[#1F6B3F] dark:focus-visible:ring-[#52B788]",
  },
] as const;

const REASSURANCES = ["Free for everyone", "Verified", "Local"] as const;

/**
 * Guest landing page CTA: a split layout instead of a card grid (the "How it
 * works" section above already uses a toggle and a row of cards).
 *
 * <p>Left: pill, heading, subtitle, reassurance checks and the tell-a-friend
 * button. Right: three stacked "choose your path" rows, each a single link.
 * Below both: a dashed announcement strip. Section padding, container width
 * and heading/subtitle type are Trust & Safety's. Border colours are marked
 * important because an unlayered `* { border-color }` in styles.css otherwise
 * overrides every border utility.
 */
function FinalCtaSplit() {
  return (
    <section
      id="join"
      aria-label="Join CauseKind"
      className="ck-m-section relative w-full bg-[#FAF7F2] dark:bg-[#0E0C0A] min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-center py-6 sm:py-8 lg:py-6 overflow-hidden"
    >
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] items-center gap-8 lg:gap-12">
          {/* ════════ LEFT: message ════════ */}
          <div className="flex flex-col items-start text-left min-w-0">
            <div className={`${TRUST_PILL_EYEBROW} mb-3 sm:mb-4`}>
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Start in 60 seconds</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
              Someone nearby is waiting for{" "}
              <span className="text-[#B5480F] dark:text-[#F4A25B]">what you already have.</span>
            </h2>

            <p className="mt-2 text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-xl">
              Join free in a minute. Give, ask, or help your community — whichever side you&apos;re on.
            </p>

            <ul className="mt-4 sm:mt-5 flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Why join">
              {REASSURANCES.map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-stone-600 dark:text-stone-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="text-xs sm:text-[13px] font-medium text-stone-500 dark:text-stone-400">
                Know someone who&apos;d love this?
              </p>
              <WhatsAppTellAFriendButton variant="outline-light" />
            </div>
          </div>

          {/* ════════ RIGHT: choose your path ════════ */}
          <div className="min-w-0">
            <p id="join-paths-label" className="mb-3 text-xs sm:text-sm font-semibold text-stone-500 dark:text-stone-400">
              Choose how you want to join
            </p>
            <ul className="flex flex-col gap-3" aria-labelledby="join-paths-label">
              {PATHS.map(({ role, icon: Icon, subline, href, ring }) => (
                <li key={role.id}>
                  {!href ? (
                    // NGO while signup is off: the same row, not a link, marked "Coming soon".
                    <div aria-disabled="true" className="flex items-center gap-4 w-full rounded-2xl bg-white/70 dark:bg-zinc-900/70 border border-stone-200 dark:border-stone-800 px-4 py-3.5 sm:px-5 sm:py-4 opacity-75 cursor-not-allowed">
                      <span className={`flex items-center justify-center w-11 h-11 shrink-0 rounded-full ${role.accentBgClass}`} aria-hidden="true">
                        <Icon className="w-5 h-5" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">{role.label}</span>
                        <span className="block text-xs sm:text-sm text-stone-500 dark:text-stone-400">{subline}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-stone-500 dark:bg-zinc-800 dark:text-stone-400">Coming soon</span>
                    </div>
                  ) : <Link
                    href={href}
                    aria-label={subline}
                    className={`group flex items-center gap-4 w-full rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200! hover:border-stone-400! dark:border-stone-800! dark:hover:border-stone-600! px-4 py-3.5 sm:px-5 sm:py-4 shadow-sm transition-[transform,border-color,box-shadow] duration-200 motion-safe:hover:translate-x-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F2] dark:focus-visible:ring-offset-[#0E0C0A] ${ring}`}
                  >
                    <span className={`flex items-center justify-center w-11 h-11 shrink-0 rounded-full ${role.accentBgClass}`} aria-hidden="true">
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                        {role.label}
                      </span>
                      <span className="block text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                        {subline}
                      </span>
                    </span>
                    <ArrowRight
                      className="w-4 h-4 shrink-0 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 transition-[transform,color] duration-200 motion-safe:group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </Link>}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ════════ BOTTOM: coming-soon announcement ════════ */}
        <div className="mt-8 sm:mt-10 rounded-2xl border border-dashed border-stone-300! dark:border-stone-700! px-4 py-3 sm:px-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="inline-flex items-center gap-2 text-xs sm:text-[13px] text-stone-600 dark:text-stone-300">
            <Sparkles className="w-4 h-4 shrink-0 text-[#B5480F] dark:text-[#F4A25B]" aria-hidden="true" />
            <span>Fundraising, online donations and CSR partnerships are coming soon.</span>
          </p>
          <a
            href={WHATSAPP_NOTIFY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs hover:shadow-emerald-500/20 transition-all duration-200 active:scale-95 flex-shrink-0"
          >
            <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Get updates on WhatsApp</span>
          </a>
        </div>
      </div>
    </section>
  );
}
