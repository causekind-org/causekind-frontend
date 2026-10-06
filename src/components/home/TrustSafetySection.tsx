"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Heart,
  HandHeart,
  Building2,
  Check,
  BadgeCheck,
} from "lucide-react";
import { useRevealOnce, stagger } from "@/components/home/mobile/primitives";
import { galleryFonts } from "@/components/home/supportGallery/fonts";
import m from "./TrustSafetyMobile.module.css";
import { DONEE_PILL_EYEBROW } from "./DoneeSectionHeading";

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
    accentBg: "bg-[var(--ck-role-accent,#B5480F)]/10 text-[var(--ck-role-accent,#B5480F)] dark:bg-[var(--ck-role-accent,#B5480F)]/20 dark:text-[#E07A5F]",
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
    roleColor: "#1e3a60",
    accentBg: "bg-[#1e3a60]/10 text-[#1e3a60] dark:bg-[#1e3a60]/20 dark:text-[#2EC4B6]",
    borderHover: "hover:border-[#1e3a60]/50 hover:shadow-[#1e3a60]/10",
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

const TRUST_STATS = [
  { value: "100%", label: "Admin-verified listings", color: "text-[var(--ck-role-accent,#B5480F)]" },
  { value: "10 km", label: "Local matching radius", color: "text-[var(--ck-role-accent)]" },
  { value: "Zero", label: "Middlemen or warehouses", color: "text-stone-800 dark:text-stone-100" },
];

/**
 * Phone version (< 768px).
 *
 * <p>Three full-width cards stacked were most of the section's 1.4 screens.
 * They become a swipe row (one card of height), the stats a single row of
 * four, and the scroll-scrubbed shield assembly and per-frame counters give
 * way to one IntersectionObserver reveal — the numbers are shown as they are
 * rather than counted up, which on a phone meant a React render every frame.
 */
function TrustSafetyMobile() {
  const ref = useRevealOnce<HTMLElement>();
  return (
    <section
      ref={ref}
      id="trust"
      aria-label="Trust and Safety"
      className={`${galleryFonts} ck-m-section relative w-full bg-[#FAF7F2] dark:bg-[#0E0C0A] border-t border-stone-200/80 dark:border-stone-800/80 px-5`}
    >
      <div data-reveal-item style={stagger(0)} className={m.eyebrow}>
        Trust &amp; safety
      </div>
      <h2 data-reveal-item style={stagger(1)} className={m.title}>
        Built on trust, <em>for everyone.</em>
      </h2>
      <p data-reveal-item style={stagger(2)} className={m.lede}>
        Clear verification, complete privacy protection, and transparent community handovers.
      </p>

      <ol className={m.stack} aria-label="Trust and safety for each role">
        {TRUST_CARDS.map((card, idx) => {
          const IconComponent = card.icon;
          return (
            <li
              key={card.id}
              className={m.slot}
              style={{ ["--k" as string]: idx, ["--role" as string]: card.roleColor } as React.CSSProperties}
            >
              <article data-reveal-item style={stagger(3 + idx)} className={m.card}>
                <header className={m.head}>
                  <span className={m.headIcon} aria-hidden="true">
                    <IconComponent className="w-3.5 h-3.5" />
                  </span>
                  <span className={m.headLabel}>{card.roleTitle}</span>
                  <span className={m.headNum} aria-hidden="true">0{idx + 1}</span>
                </header>
                <div className={m.body}>
                  <h3 className={m.cardTitle}>{card.roleSubtitle}</h3>
                  <ul className={m.points}>
                    {card.points.map((point) => (
                      <li key={point} className={m.point}>
                        <span className={m.check} aria-hidden="true">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <footer className={m.foot}>
                  <span className={m.footLabel}>
                    <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    Guaranteed protocol
                  </span>
                  <span className={m.footIndex}>0{idx + 1} / 03</span>
                </footer>
              </article>
            </li>
          );
        })}
      </ol>

      <div data-reveal-item style={stagger(6)} className={m.ticketWrap}>
        <dl className={m.ticket}>
          {TRUST_STATS.map((st) => (
            <div key={st.label} className={m.cell}>
              <dt className={m.label}>{st.label}</dt>
              <dd className={`${m.value} ${st.color}`}>{st.value}</dd>
            </div>
          ))}
        </dl>
      </div>

    </section>
  );
}

export function TrustSafetySection({
  variant = "desktop",
  tone = "donor",
}: {
  variant?: "desktop" | "mobile";
  /** "donee" swaps in the donee page's larger pill; nothing else changes. */
  tone?: "donor" | "donee";
}) {
  if (variant === "desktop") return <TrustSafetyFull variant="desktop" tone={tone} />;
  return (
    <>
      <div className="md:hidden">
        <TrustSafetyMobile />
      </div>
      <div className="hidden md:block">
        <TrustSafetyFull variant="mobile" tone={tone} />
      </div>
    </>
  );
}

function TrustSafetyFull({
  variant,
  tone = "donor",
}: {
  variant: "desktop" | "mobile";
  tone?: "donor" | "donee";
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const badgeShieldRef = useRef<HTMLDivElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const statsContainerRef = useRef<HTMLDivElement>(null);

  // Animated stat values state for smooth render
  const [stat1, setStat1] = useState(0);
  const [stat2, setStat2] = useState(0);
  const [typedZero, setTypedZero] = useState("");

  useEffect(() => {
    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setStat1(100);
      setStat2(10);
      setTypedZero("Zero");
      return;
    }

    const mm = gsap.matchMedia();
    // The "mobile" variant of this layout now only serves tablets; phones get
    // TrustSafetyMobile, so its timeline must not run below 768px.
    const mediaQuery = variant === "desktop" ? "(min-width: 1024px)" : "(min-width: 768px) and (max-width: 1023px)";

    mm.add(mediaQuery, () => {
      // 1. Initial State Setup
      // Master ScrollTrigger Timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 85%",
          toggleActions: "play none none none",
          once: true,
        },
      });

      // Step: Badge Reveal
      tl.from(
        badgeShieldRef.current,
        {
          opacity: 0,
          y: 10,
          duration: 0.3,
        }
      );

      // Step D: Cards Fan Out / Deal - START MUCH EARLIER
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
          0.3 + (index * 0.1) // Start at 0.3s, stagger by 0.1s
        );
      });

      // Step E: Stagger checkmarks inside cards
      tl.fromTo(
        ".card-point-check",
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.25, stagger: 0.04, ease: "back.out(2)" },
        0.7
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
      className="relative w-full bg-[#FAF7F2] dark:bg-[#0E0C0A] min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-center py-6 sm:py-8 lg:py-6 overflow-hidden"
    >
      {/* Background Subtle Gradient Glows */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-b from-[#B5480F]/5 via-[#1e3a60]/5 to-transparent rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 w-full flex flex-col justify-between h-full gap-4 sm:gap-6 lg:gap-5">
        {/* ================= HEADER ================= */}
        <div className="flex flex-col items-center text-center relative mt-2 sm:mt-4">
          {/* Section Eyebrow Badge */}
          <div
            ref={badgeShieldRef}
            className={tone === "donee"
              ? `${DONEE_PILL_EYEBROW} mb-3 sm:mb-4`
              : "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-[0.2em] uppercase text-[var(--ck-role-accent,#B5480F)] dark:text-[var(--ck-role-accent,#F4A25B)] border border-[var(--ck-role-accent,#B5480F)]/20 bg-[var(--ck-role-accent,#B5480F)]/5 mb-3 sm:mb-4"}
          >
            TRUST & SAFETY
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
          className="grid grid-cols-3 gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-xl bg-white/70 dark:bg-[#14100E]/70 border border-stone-200/80 dark:border-stone-800 backdrop-blur-sm shadow-xs"
        >
          {/* Stat 1: 100% */}
          <div className="flex flex-col items-center text-center p-1.5 sm:p-2">
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[var(--ck-role-accent,#B5480F)] font-mono tracking-tight">
              {stat1}%
            </div>
            <div className="text-[11px] sm:text-xs font-medium text-stone-600 dark:text-stone-400 mt-0.5">
              Admin-verified listings
            </div>
          </div>

          {/* Stat 2: 10 km */}
          <div className="flex flex-col items-center text-center p-1.5 sm:p-2 border-l border-stone-200/60 dark:border-stone-800/60">
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[var(--ck-role-accent)] font-mono tracking-tight">
              {stat2} km
            </div>
            <div className="text-[11px] sm:text-xs font-medium text-stone-600 dark:text-stone-400 mt-0.5">
              Local matching radius
            </div>
          </div>

          {/* Stat 3: Zero */}
          <div className="flex flex-col items-center text-center p-1.5 sm:p-2 border-l border-stone-200/60 dark:border-stone-800/60">
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-stone-800 dark:text-stone-100 font-mono tracking-tight min-h-[1.75rem] flex items-center justify-center">
              {typedZero || "\u00A0"}
            </div>
            <div className="text-[11px] sm:text-xs font-medium text-stone-600 dark:text-stone-400 mt-0.5">
              Middlemen or warehouses
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
