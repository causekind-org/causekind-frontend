"use client";

import React, { useState, useEffect, useRef } from "react";
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

export function FinalCtaSection({
  variant = "desktop",
  card = true,
}: {
  variant?: "desktop" | "mobile";
  /**
   * true: the dark rounded card (signed-in pages). false: the same content
   * straight on the page background, restyled for it (guest landing page).
   */
  card?: boolean;
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

  // "what you already have.": peach reads on the dark card; on the light page
  // it needs the deeper terracotta, lifting back to peach in dark mode.
  const highlight = card ? "text-[#F4A25B]" : "text-[#B5480F] dark:text-[#F4A25B]";

  // WhatsApp Notify URL with pre-filled message
  const whatsappNotifyUrl = `https://wa.me/917719938619?text=${encodeURIComponent(
    "Hi CauseKind! Please notify me when online donations and fundraising launch."
  )}`;

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
          className={card
            ? "relative w-full rounded-3xl bg-[#1C1410] dark:bg-[#241A15] border border-stone-800/80 dark:border-stone-700/60 shadow-2xl overflow-hidden p-6 sm:p-8 lg:p-10 text-center flex flex-col justify-between"
            : "relative w-full py-6 sm:py-8 text-center flex flex-col justify-between"}
        >
          {/* ════════ AURORA DRIFTING BLOBS ════════ */}
          {card && (
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
          )}

          {/* Card Inner Content */}
          <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
            {/* Small Top Eyebrow */}
            <div className={card
              ? "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold tracking-widest uppercase bg-white/10 text-amber-200 border border-white/15 mb-3 backdrop-blur-xs"
              : `${TRUST_PILL_EYEBROW} mb-3 sm:mb-4`}>
              <Sparkles className={card ? "w-3.5 h-3.5 text-[#F4A25B]" : "w-3.5 h-3.5"} aria-hidden="true" />
              <span>START IN 60 SECONDS</span>
            </div>

            {/* Heading with Word-by-Word Reveal */}
            <h2
              ref={headingRef}
              className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight ${card ? "text-white" : "text-stone-900 dark:text-stone-100"}`}
            >
              <span className="inline-block cta-heading-word mr-1.5">Someone</span>
              <span className="inline-block cta-heading-word mr-1.5">nearby</span>
              <span className="inline-block cta-heading-word mr-1.5">is</span>
              <span className="inline-block cta-heading-word mr-1.5">waiting</span>
              <span className="inline-block cta-heading-word mr-1.5">for</span>
              <span className={`inline-block cta-heading-word mr-1.5 ${highlight}`}>what</span>
              <span className={`inline-block cta-heading-word mr-1.5 ${highlight}`}>you</span>
              <span className={`inline-block cta-heading-word mr-1.5 ${highlight}`}>already</span>
              <span className={`inline-block cta-heading-word ${highlight}`}>have.</span>
            </h2>

            {/* Subtext */}
            <p className={`mt-2.5 text-xs sm:text-sm ${card ? "text-stone-300" : "text-stone-600 dark:text-stone-400"} max-w-xl leading-relaxed font-normal`}>
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
              <Link
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
              </Link>
            </div>

            {/* ════════ TELL A FRIEND ON WHATSAPP ════════ */}
            <div className="mt-5 sm:mt-6 flex flex-col items-center gap-2">
              <p className={`text-xs sm:text-[13px] font-semibold ${card ? "text-stone-300" : "text-stone-700 dark:text-stone-300"}`}>
                Know someone who&apos;d love this?
              </p>
              <WhatsAppTellAFriendButton variant={card ? "outline" : "outline-light"} />
            </div>

            {/* Small reassurance line */}
            <p className={`mt-3 text-[11px] sm:text-xs font-medium ${card ? "text-stone-400" : "text-stone-500 dark:text-stone-400"}`}>
              Free for everyone · Verified · Local
            </p>
          </div>

          {/* ════════ COMING SOON STRIP ════════ */}
          <div className={`relative z-10 mt-5 pt-4 sm:mt-6 sm:pt-4 border-t ${card ? "border-stone-800 dark:border-stone-700/60" : "border-stone-200/80 dark:border-stone-800/80"} flex flex-col sm:flex-row items-center justify-between gap-3 text-left`}>
            <div className={`${card ? "text-stone-300" : "text-stone-600 dark:text-stone-300"} text-xs sm:text-[13px] font-normal text-center sm:text-left`}>
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
