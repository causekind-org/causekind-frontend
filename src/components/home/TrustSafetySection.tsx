"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Heart,
  HandHeart,
  Building2,
  Check,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface TrustCardData {
  id: "donor" | "donee" | "ngo";
  roleTitle: string;
  roleSubtitle: string;
  roleColor: string;
  accentBg: string;
  borderHover: string;
  glowColor: string;
  icon: React.ElementType;
  points: string[];
}

const TRUST_CARDS: TrustCardData[] = [
  {
    id: "donor",
    roleTitle: "FOR DONORS",
    roleSubtitle: "Give with absolute confidence",
    roleColor: "#B5480F",
    accentBg: "bg-[#B5480F]/10 text-[#B5480F] dark:bg-[#B5480F]/20 dark:text-[#E07A5F]",
    borderHover: "hover:border-[#B5480F]/50 hover:shadow-[#B5480F]/10",
    glowColor: "rgba(181, 72, 15, 0.15)",
    icon: Heart,
    points: [
      "Every donee and NGO is verified before their need goes live.",
      "You see the real need before you give.",
      "You can report a problem at any step of the handover.",
    ],
  },
  {
    id: "donee",
    roleTitle: "FOR DONEES",
    roleSubtitle: "Receive with safety and dignity",
    roleColor: "#0F7A6C",
    accentBg: "bg-[#0F7A6C]/10 text-[#0F7A6C] dark:bg-[#0F7A6C]/20 dark:text-[#2EC4B6]",
    borderHover: "hover:border-[#0F7A6C]/50 hover:shadow-[#0F7A6C]/10",
    glowColor: "rgba(15, 122, 108, 0.15)",
    icon: HandHeart,
    points: [
      "Your exact address is never shown publicly.",
      "Ask with dignity — no public begging, share your story only if you choose to.",
      "CauseKind is completely free for you, always.",
    ],
  },
  {
    id: "ngo",
    roleTitle: "FOR NGOS",
    roleSubtitle: "Legitimate community partners",
    roleColor: "#1F6B3F",
    accentBg: "bg-[#1F6B3F]/10 text-[#1F6B3F] dark:bg-[#1F6B3F]/20 dark:text-[#52B788]",
    borderHover: "hover:border-[#1F6B3F]/50 hover:shadow-[#1F6B3F]/10",
    glowColor: "rgba(31, 107, 63, 0.15)",
    icon: Building2,
    points: [
      "Every NGO is checked with official documents before it can post.",
      "Donors know your requests are genuine.",
      "You get a clear record of every item received.",
    ],
  },
];

export function TrustSafetySection({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const shieldStageRef = useRef<HTMLDivElement>(null);
  const badgeShieldRef = useRef<HTMLDivElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const statsContainerRef = useRef<HTMLDivElement>(null);

  // Animated stat values state for smooth render
  const [stat1, setStat1] = useState(0);
  const [stat2, setStat2] = useState(0);
  const [stat3, setStat3] = useState(0);
  const [typedZero, setTypedZero] = useState("");

  useEffect(() => {
    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setStat1(100);
      setStat2(10);
      setStat3(0);
      setTypedZero("Zero");
      return;
    }

    const mm = gsap.matchMedia();
    const mediaQuery = variant === "desktop" ? "(min-width: 1024px)" : "(max-width: 1023px)";

    mm.add(mediaQuery, () => {
      // 1. Initial State Setup
      const shieldPieces = gsap.utils.toArray<SVGPathElement>(".shield-piece");
      const shieldCheck = document.querySelector<SVGPathElement>(".shield-check-path");
      const shieldGlow = document.querySelector<SVGCircleElement>(".shield-glow");

      // Initial positions for shield pieces (scattered)
      gsap.set(shieldPieces[0], { x: -60, y: -40, rotation: -25, opacity: 0, transformOrigin: "center" });
      gsap.set(shieldPieces[1], { x: 60, y: -40, rotation: 25, opacity: 0, transformOrigin: "center" });
      gsap.set(shieldPieces[2], { x: -50, y: 50, rotation: -15, opacity: 0, transformOrigin: "center" });
      gsap.set(shieldPieces[3], { x: 50, y: 50, rotation: 15, opacity: 0, transformOrigin: "center" });
      gsap.set(shieldPieces[4], { scale: 0, opacity: 0, transformOrigin: "center" }); // center core

      if (shieldCheck) {
        const length = shieldCheck.getTotalLength ? shieldCheck.getTotalLength() : 60;
        gsap.set(shieldCheck, { strokeDasharray: length, strokeDashoffset: length });
      }
      if (shieldGlow) {
        gsap.set(shieldGlow, { scale: 0, opacity: 0, transformOrigin: "center" });
      }

      // Master ScrollTrigger Timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
          toggleActions: "play none none none",
          once: true,
        },
      });

      // Step A: Shield Assembly
      tl.to(shieldPieces, {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        opacity: 1,
        duration: 0.7,
        stagger: 0.05,
        ease: "back.out(1.8)",
      });

      // Step B: Shield Checkmark Draws & Glow Pulse
      if (shieldCheck) {
        tl.to(
          shieldCheck,
          {
            strokeDashoffset: 0,
            duration: 0.45,
            ease: "power2.out",
          },
          "-=0.2"
        );
      }
      if (shieldGlow) {
        tl.to(
          shieldGlow,
          {
            scale: 1.6,
            opacity: 0.8,
            duration: 0.35,
            ease: "power1.out",
          },
          "-=0.4"
        ).to(
          shieldGlow,
          {
            scale: 2.2,
            opacity: 0,
            duration: 0.45,
            ease: "power2.out",
          },
          "-=0.1"
        );
      }

      // Step C: Shield shrinks & moves to top badge
      tl.to(
        shieldStageRef.current,
        {
          scale: 0.55,
          opacity: 0.9,
          y: -20,
          duration: 0.5,
          ease: "power3.inOut",
        },
        "+=0.1"
      );

      // Step D: Cards Fan Out / Deal
      cardsRef.current.forEach((card, index) => {
        if (!card) return;
        const rotOffset = index === 0 ? -4 : index === 2 ? 4 : 0;
        const xOffset = index === 0 ? -30 : index === 2 ? 30 : 0;

        tl.fromTo(
          card,
          {
            opacity: 0,
            y: 40,
            x: xOffset,
            rotation: rotOffset,
            scale: 0.92,
          },
          {
            opacity: 1,
            y: 0,
            x: 0,
            rotation: 0,
            scale: 1,
            duration: 0.65,
            ease: "power3.out",
          },
          index === 0 ? "-=0.3" : "-=0.5"
        );
      });

      // Step E: Stagger checkmarks inside cards
      tl.fromTo(
        ".card-point-check",
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.25, stagger: 0.04, ease: "back.out(2)" },
        "-=0.3"
      );

      // Step F: Animate Counter Stats
      const statObj = { count1: 0, count2: 0, count3: 0 };
      tl.to(
        statObj,
        {
          count1: 100,
          count2: 10,
          count3: 0,
          duration: 1.2,
          ease: "power2.out",
          onUpdate: () => {
            setStat1(Math.round(statObj.count1));
            setStat2(Math.round(statObj.count2));
            setStat3(Math.round(statObj.count3));
          },
        },
        "-=0.5"
      );

      // Typewriter for "Zero"
      const word = "Zero";
      tl.call(
        () => {
          let charIndex = 0;
          const interval = setInterval(() => {
            charIndex++;
            setTypedZero(word.substring(0, charIndex));
            if (charIndex >= word.length) clearInterval(interval);
          }, 80);
        },
        [],
        "-=0.9"
      );
    });

    return () => mm.revert();
  }, [variant]);

  return (
    <section
      ref={sectionRef}
      id="trust"
      aria-label="Trust and Safety"
      className="relative w-full bg-[#FAF7F2] dark:bg-[#0E0C0A] border-t border-stone-200/80 dark:border-stone-800/80 min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-center py-6 sm:py-8 lg:py-6 overflow-hidden"
    >
      {/* Background Subtle Gradient Glows */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-b from-[#B5480F]/5 via-[#0F7A6C]/5 to-transparent rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 w-full flex flex-col justify-between h-full gap-4 sm:gap-6 lg:gap-5">
        {/* ================= HEADER & SHIELD ASSEMBLY STAGE ================= */}
        <div className="flex flex-col items-center text-center relative">
          {/* Animated Shield Assembly Graphic */}
          <div
            ref={shieldStageRef}
            className="w-14 h-14 sm:w-16 sm:h-16 mb-2 relative flex items-center justify-center pointer-events-none"
          >
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full drop-shadow-md overflow-visible"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="shield-glow"
                cx="50"
                cy="50"
                r="35"
                fill="#B5480F"
                opacity="0"
              />
              {/* Piece 1: Top-Left Crest */}
              <path
                className="shield-piece"
                d="M50 8 L18 22 V50 C18 50 18 58 24 67 L50 50 Z"
                fill="#B5480F"
              />
              {/* Piece 2: Top-Right Crest */}
              <path
                className="shield-piece"
                d="M50 8 L82 22 V50 C82 50 82 58 76 67 L50 50 Z"
                fill="#D4602C"
              />
              {/* Piece 3: Bottom-Left Wing */}
              <path
                className="shield-piece"
                d="M24 67 C32 80 50 92 50 92 V50 L24 67 Z"
                fill="#0F7A6C"
              />
              {/* Piece 4: Bottom-Right Wing */}
              <path
                className="shield-piece"
                d="M76 67 C68 80 50 92 50 92 V50 L76 67 Z"
                fill="#1F6B3F"
              />
              {/* Piece 5: Center Core Star/Emblem */}
              <circle
                className="shield-piece fill-white dark:fill-[#1A1412]"
                cx="50"
                cy="50"
                r="18"
              />
              {/* Checkmark Path */}
              <path
                className="shield-check-path"
                d="M42 50 L48 56 L59 44"
                stroke="#B5480F"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Section Eyebrow Badge */}
          <div
            ref={badgeShieldRef}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 mb-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#B5480F]" aria-hidden="true" />
            <span>TRUST & SAFETY</span>
          </div>

          {/* Section Heading */}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
            Built on trust, for everyone.
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-xl mx-auto">
            Clear verification, complete privacy protection, and transparent community handovers.
          </p>
        </div>

        {/* ================= 3 CARDS DEALING GRID ================= */}
        <div
          ref={cardsContainerRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-5 w-full items-stretch"
        >
          {TRUST_CARDS.map((card, idx) => {
            const IconComponent = card.icon;
            return (
              <div
                key={card.id}
                ref={(el) => {
                  cardsRef.current[idx] = el;
                }}
                className={`relative group flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#181411] border border-stone-200/90 dark:border-stone-800 shadow-sm transition-all duration-300 ${card.borderHover}`}
                style={
                  {
                    "--card-glow": card.glowColor,
                  } as React.CSSProperties
                }
              >
                {/* Top Accent Gradient Border highlight */}
                <div
                  className="absolute inset-x-0 top-0 h-1 rounded-t-2xl transition-opacity duration-300"
                  style={{ backgroundColor: card.roleColor }}
                  aria-hidden="true"
                />

                {/* Card Header */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider ${card.accentBg}`}
                    >
                      <IconComponent className="w-3.5 h-3.5" aria-hidden="true" />
                      {card.roleTitle}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: card.roleColor }}
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mb-3">
                    {card.roleSubtitle}
                  </h3>

                  {/* Bullet Points */}
                  <ul className="space-y-2.5 text-xs sm:text-[13px] leading-relaxed text-stone-600 dark:text-stone-300">
                    {card.points.map((point, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2.5">
                        <span
                          className="card-point-check flex-shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white"
                          style={{ backgroundColor: card.roleColor }}
                          aria-hidden="true"
                        >
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card Subtle Bottom Indicator */}
                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[11px] font-medium text-stone-600 dark:text-stone-300">
                  <span>Guaranteed protocol</span>
                  <span className="font-mono text-[10px] text-stone-600 dark:text-stone-300">0{idx + 1}/03</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ================= ANIMATED STATS ROW ================= */}
        <div
          ref={statsContainerRef}
          className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-xl bg-white/70 dark:bg-[#14100E]/70 border border-stone-200/80 dark:border-stone-800 backdrop-blur-sm shadow-xs"
        >
          {/* Stat 1: 100% */}
          <div className="flex flex-col items-center text-center p-1.5 sm:p-2">
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#B5480F] font-mono tracking-tight">
              {stat1}%
            </div>
            <div className="text-[11px] sm:text-xs font-medium text-stone-600 dark:text-stone-400 mt-0.5">
              Admin-verified listings
            </div>
          </div>

          {/* Stat 2: 10 km */}
          <div className="flex flex-col items-center text-center p-1.5 sm:p-2 border-l border-stone-200/60 dark:border-stone-800/60">
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0F7A6C] font-mono tracking-tight">
              {stat2} km
            </div>
            <div className="text-[11px] sm:text-xs font-medium text-stone-600 dark:text-stone-400 mt-0.5">
              Local matching radius
            </div>
          </div>

          {/* Stat 3: ₹0 */}
          <div className="flex flex-col items-center text-center p-1.5 sm:p-2 border-t md:border-t-0 md:border-l border-stone-200/60 dark:border-stone-800/60">
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#1F6B3F] font-mono tracking-tight">
              ₹{stat3}
            </div>
            <div className="text-[11px] sm:text-xs font-medium text-stone-600 dark:text-stone-400 mt-0.5">
              Platform or hidden fees
            </div>
          </div>

          {/* Stat 4: Zero */}
          <div className="flex flex-col items-center text-center p-1.5 sm:p-2 border-t md:border-t-0 border-l border-stone-200/60 dark:border-stone-800/60">
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-stone-800 dark:text-stone-100 font-mono tracking-tight min-h-[1.75rem] flex items-center justify-center">
              {typedZero || "\u00A0"}
            </div>
            <div className="text-[11px] sm:text-xs font-medium text-stone-600 dark:text-stone-400 mt-0.5">
              Middlemen or warehouses
            </div>
          </div>
        </div>

        {/* ================= SAFETY NOTE BANNER ================= */}
        <div className="w-full flex items-center justify-center">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs sm:text-[13px] leading-snug shadow-xs max-w-2xl text-center sm:text-left">
            <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" aria-hidden="true" />
            <span>
              Every handover is confirmed in the app with a one-time code. We recommend meeting in a public place.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
