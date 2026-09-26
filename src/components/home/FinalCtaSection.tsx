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
import { CONTACT_INFO, LANDING_ROUTES } from "@/lib/landingConstants";
import { WhatsAppTellAFriendButton } from "@/components/home/WhatsAppTellAFriend";
import { useRevealOnce, stagger } from "@/components/home/mobile/primitives";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Floating Background SVG Items (book, shirt, teddy bear, fan, chair)
function FloatingItems({ mousePos }: { mousePos: { x: number; y: number } }) {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden hidden lg:block" aria-hidden="true">
      {/* 1. Book (Top Left) */}
      <div
        className="absolute top-8 left-10 w-10 h-10 text-amber-200/20 transition-transform duration-700 ease-out"
        style={{ transform: `translate(${mousePos.x * -15}px, ${mousePos.y * -15}px)` }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </div>

      {/* 2. Shirt (Top Right) */}
      <div
        className="absolute top-10 right-12 w-10 h-10 text-orange-200/20 transition-transform duration-700 ease-out"
        style={{ transform: `translate(${mousePos.x * 20}px, ${mousePos.y * -12}px)` }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
          <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
        </svg>
      </div>

      {/* 3. Teddy Bear (Bottom Left) */}
      <div
        className="absolute bottom-16 left-12 w-11 h-11 text-amber-300/15 transition-transform duration-700 ease-out"
        style={{ transform: `translate(${mousePos.x * -25}px, ${mousePos.y * 18}px)` }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
          <circle cx="7" cy="5" r="2.5" />
          <circle cx="17" cy="5" r="2.5" />
          <circle cx="12" cy="13" r="7" />
          <circle cx="9.5" cy="11.5" r="1" fill="currentColor" />
          <circle cx="14.5" cy="11.5" r="1" fill="currentColor" />
          <path d="M11 14.5c.5.5 1.5.5 2 0" />
        </svg>
      </div>

      {/* 4. Fan (Bottom Right) */}
      <div
        className="absolute bottom-14 right-14 w-11 h-11 text-teal-200/20 transition-transform duration-700 ease-out"
        style={{ transform: `translate(${mousePos.x * 22}px, ${mousePos.y * 20}px)` }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 12c-2-2-2-5 0-5s2 3 0 5z" />
          <path d="M12 12c2-2 5-2 5 0s-3 2-5 0z" />
          <path d="M12 12c2 2 2 5 0 5s-2-3 0-5z" />
          <path d="M12 12c-2 2-5 2-5 0s3-2 5 0z" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      </div>

      {/* 5. Chair (Far Right Center) */}
      <div
        className="absolute top-1/2 right-6 -translate-y-1/2 w-9 h-9 text-orange-300/15 transition-transform duration-700 ease-out"
        style={{ transform: `translate(${mousePos.x * 15}px, ${mousePos.y * 5}px)` }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
          <path d="M6 4h12v7H6z" />
          <path d="M4 11h16v3H4z" />
          <path d="M6 14v7" />
          <path d="M18 14v7" />
        </svg>
      </div>
    </div>
  );
}

const WHATSAPP_NOTIFY_URL = `https://wa.me/917719938619?text=${encodeURIComponent(
  "Hi CauseKind! Please notify me when online donations and fundraising launch."
)}`;

const HEADING_WORDS: { text: string; accent?: boolean }[] = [
  { text: "Someone" },
  { text: "nearby" },
  { text: "is" },
  { text: "waiting" },
  { text: "for" },
  { text: "what", accent: true },
  { text: "you", accent: true },
  { text: "already", accent: true },
  { text: "have.", accent: true },
];

/**
 * Phone version (< 768px). Same dark card, same words, at content height
 * rather than a full screen. The aurora blobs are blurred, so on a phone they
 * stay put — a moving 320px blur is exactly the repaint a mid-range Android
 * drops frames on — and the three joins sit in one row instead of three.
 */
function FinalCtaMobile() {
  const ref = useRevealOnce<HTMLElement>();
  const joins = [
    { href: LANDING_ROUTES.donorRegister, label: "Join as Donor", icon: Heart, bg: "bg-[#B5480F] active:bg-[#C95413]" },
    { href: LANDING_ROUTES.doneeRegister, label: "Join as a Donee", icon: HandHeart, bg: "bg-[#0F7A6C] active:bg-[#139181]" },
    { href: LANDING_ROUTES.ngoRegister, label: "Register your NGO", icon: Building2, bg: "bg-[#1F6B3F] active:bg-[#27824D]" },
  ];
  return (
    <section ref={ref} id="join" aria-label="Join CauseKind" className="ck-m-section relative w-full bg-[#FAF7F2] dark:bg-[#0E0C0A] px-4">
      <div
        data-reveal-item="scale"
        style={stagger(0)}
        className="relative w-full rounded-3xl bg-[#1C1410] dark:bg-[#241A15] border border-stone-800/80 dark:border-stone-700/60 shadow-2xl overflow-hidden px-5 py-6 text-center"
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute -top-16 left-[10%] w-56 h-56 rounded-full bg-[#B5480F]/25 blur-3xl" />
          <div className="absolute -bottom-16 right-[5%] w-56 h-56 rounded-full bg-[#F4A25B]/15 blur-3xl" />
          <div className="absolute top-1/3 left-1/2 w-40 h-40 rounded-full bg-[#0F7A6C]/15 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div data-reveal-item style={stagger(1)} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase bg-white/10 text-amber-200 border border-white/15 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#F4A25B]" aria-hidden="true" />
            <span>START IN 60 SECONDS</span>
          </div>
          <h2 data-reveal-item style={stagger(2)} className="text-2xl font-extrabold text-white tracking-tight leading-tight">
            {HEADING_WORDS.map((w, i) => (
              <span key={i} className={w.accent ? "text-[#F4A25B]" : undefined}>
                {w.text}
                {i < HEADING_WORDS.length - 1 ? " " : ""}
              </span>
            ))}
          </h2>
          <p data-reveal-item style={stagger(3)} className="mt-2 text-xs text-stone-300 leading-relaxed">
            Join free in a minute. Give, ask, or help your community — whichever side you&apos;re on.
          </p>

          <div className="grid grid-cols-3 gap-2 w-full mt-5">
            {joins.map((j, i) => {
              const Icon = j.icon;
              return (
                <Link
                  key={j.href}
                  href={j.href}
                  data-reveal-item
                  style={stagger(4 + i)}
                  className={`flex flex-col items-center justify-center gap-1.5 min-h-[4.25rem] px-1.5 py-2.5 rounded-xl text-white font-bold text-[11px] leading-tight shadow-md active:scale-95 transition-transform ${j.bg}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span>{j.label}</span>
                </Link>
              );
            })}
          </div>

          <div data-reveal-item style={stagger(6)} className="mt-5 flex flex-col items-center gap-2">
            <p className="text-xs font-semibold text-stone-300">Know someone who&apos;d love this?</p>
            <WhatsAppTellAFriendButton variant="outline" />
            <p className="mt-1 text-[11px] font-medium text-stone-400">Free for everyone · Verified · Local</p>
          </div>
        </div>

        <div className="relative z-10 mt-5 pt-4 border-t border-stone-800 dark:border-stone-700/60 flex flex-col items-center gap-2.5">
          <p className="text-stone-300 text-xs text-center">Fundraising, online donations and CSR partnerships are coming soon.</p>
          <a
            href={WHATSAPP_NOTIFY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600/90 active:bg-emerald-600 text-white text-xs font-semibold active:scale-95 transition-transform"
          >
            <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Get updates on WhatsApp</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export function FinalCtaSection({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  if (variant === "desktop") return <FinalCtaFull variant="desktop" />;
  return (
    <>
      <div className="md:hidden">
        <FinalCtaMobile />
      </div>
      <div className="hidden md:block">
        <FinalCtaFull variant="mobile" />
      </div>
    </>
  );
}

function FinalCtaFull({
  variant,
}: {
  variant: "desktop" | "mobile";
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const reduce = useReducedMotion();

  // Mouse move handler for subtle parallax
  const handleMouseMove = (e: React.MouseEvent) => {
    if (reduce) return;
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    setMousePos({
      x: (clientX / innerWidth - 0.5) * 2,
      y: (clientY / innerHeight - 0.5) * 2,
    });
  };

  useEffect(() => {
    if (reduce) return;

    const mm = gsap.matchMedia();
    // Tablet only for the "mobile" variant — phones render FinalCtaMobile.
    const mediaQuery = variant === "desktop" ? "(min-width: 1024px)" : "(min-width: 768px) and (max-width: 1023px)";

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

  // WhatsApp Notify URL with pre-filled message
  const whatsappNotifyUrl = WHATSAPP_NOTIFY_URL;

  return (
    <section
      ref={sectionRef}
      id="join"
      aria-label="Join CauseKind"
      onMouseMove={handleMouseMove}
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
            {/* Blob 3: Subtle Teal Depth */}
            <div className="aurora-blob-3 absolute top-[30%] left-[55%] w-[260px] h-[260px] rounded-full bg-[#0F7A6C]/15 blur-3xl" />
            {/* Dark vignette overlay */}
            <div className="absolute inset-0 bg-radial from-transparent via-[#1C1410]/40 to-[#1C1410]/80 dark:via-[#241A15]/40 dark:to-[#241A15]/80" />
          </div>

          {/* Floating Subtle Items for Parallax */}
          <FloatingItems mousePos={mousePos} />

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
                className="cta-action-btn relative group overflow-hidden flex items-center justify-center gap-2 px-4 py-3 sm:py-3.5 rounded-xl bg-[#0F7A6C] hover:bg-[#139181] text-white font-bold text-xs sm:text-[13px] tracking-wide shadow-md transition-all duration-200 active:scale-95"
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
