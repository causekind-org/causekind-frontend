"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, useInView } from "framer-motion";
import { ArrowRight, MapPin, Sparkles, AlertCircle, Package, Smile, HeartHandshake, Heart } from "lucide-react";
import { HOME_ROLE_COLORS } from "@/lib/landingConstants";

// Inline illustrated SVG icons for the 5 items
function BookIllustration({ className = "", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <path d="M12 16C12 13.7909 13.7909 12 16 12H30C31.1046 12 32 12.8954 32 14V52C32 52 28 50 20 50C15.5817 50 12 51.5 12 52V16Z" fill={color} fillOpacity="0.85" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M52 16C52 13.7909 50.2091 12 48 12H34C32.8954 12 32 12.8954 32 14V52C32 52 36 50 44 50C48.4183 50 52 51.5 52 52V16Z" fill={color} fillOpacity="0.7" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M18 22H26M18 30H26M18 38H24M46 22H38M46 30H38M46 38H40" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ShirtIllustration({ className = "", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <path d="M22 14L10 24L18 32L24 26V52H40V26L46 32L54 24L42 14C39 18 25 18 22 14Z" fill={color} fillOpacity="0.85" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M32 17V36M32 24H32.01M32 30H32.01" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function FanIllustration({ className = "", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <circle cx="32" cy="28" r="18" stroke={color} strokeWidth="2.5" strokeDasharray="3 3" />
      <circle cx="32" cy="28" r="5" fill={color} stroke={color} strokeWidth="2" />
      <path d="M32 23C32 16 38 16 38 23C38 28 32 28 32 23Z" fill={color} fillOpacity="0.8" />
      <path d="M37 28C44 28 44 34 37 34C32 34 32 28 37 28Z" fill={color} fillOpacity="0.8" />
      <path d="M32 33C32 40 26 40 26 33C26 28 32 28 32 33Z" fill={color} fillOpacity="0.8" />
      <path d="M27 28C20 28 20 22 27 22C32 22 32 28 27 28Z" fill={color} fillOpacity="0.8" />
      <path d="M32 46V54M24 54H40" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function ChairIllustration({ className = "", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <path d="M20 12V34H44V12" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 22H44" stroke={color} strokeWidth="2" />
      <path d="M16 34H48C49.1046 34 50 34.8954 50 36V38C50 39.1046 49.1046 40 48 40H16C14.8954 40 14 39.1046 14 38V36C14 34.8954 14.8954 34 16 34Z" fill={color} fillOpacity="0.85" stroke={color} strokeWidth="2" />
      <path d="M18 40L14 54M46 40L50 54M22 40V50M42 40V50" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function TeddyIllustration({ className = "", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <circle cx="20" cy="18" r="6" fill={color} fillOpacity="0.8" stroke={color} strokeWidth="2" />
      <circle cx="44" cy="18" r="6" fill={color} fillOpacity="0.8" stroke={color} strokeWidth="2" />
      <circle cx="32" cy="26" r="14" fill={color} fillOpacity="0.85" stroke={color} strokeWidth="2" />
      <ellipse cx="32" cy="44" rx="15" ry="12" fill={color} fillOpacity="0.85" stroke={color} strokeWidth="2" />
      <circle cx="27" cy="24" r="2" fill="white" />
      <circle cx="37" cy="24" r="2" fill="white" />
      <ellipse cx="32" cy="28" rx="4" ry="3" fill="white" />
      <circle cx="32" cy="27.5" r="1.5" fill={color} />
      <circle cx="16" cy="40" r="5" fill={color} fillOpacity="0.8" stroke={color} strokeWidth="2" />
      <circle cx="48" cy="40" r="5" fill={color} fillOpacity="0.8" stroke={color} strokeWidth="2" />
    </svg>
  );
}

export function ProblemSolutionSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinTargetRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef<HTMLDivElement>(null);
  const distanceTagRef = useRef<HTMLDivElement>(null);

  const [isClient, setIsClient] = useState(false);
  const isInView = useInView(containerRef, { once: true, amount: 0.1 });

  const labelText = "THE PROBLEM WE SOLVE";

  const problemPoints = [
    "Many homes have useful things lying unused — old textbooks, clothes, a spare fan, a study table.",
    "Just a few kilometres away, a student needs books, or a family needs a mattress.",
    "People want to help, but don't know who really needs what, or if the need is real.",
  ];

  const solutionPoints = [
    "Verified people and NGOs post exactly what they need.",
    "Donors nearby see these needs and offer the item.",
    "The item is handed over in person, within 10 km.",
  ];

  const items = [
    { id: "book", name: "Textbooks", comp: BookIllustration, activeColor: HOME_ROLE_COLORS.donor.main },
    { id: "shirt", name: "Clothes", comp: ShirtIllustration, activeColor: HOME_ROLE_COLORS.donor.darkAccent },
    { id: "fan", name: "Spare Fan", comp: FanIllustration, activeColor: HOME_ROLE_COLORS.donee.main },
    { id: "chair", name: "Study Chair", comp: ChairIllustration, activeColor: HOME_ROLE_COLORS.ngo.main },
    { id: "teddy", name: "Toys & Books", comp: TeddyIllustration, activeColor: "#C54805" },
  ];

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !pinTargetRef.current || !containerRef.current) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    // Reduced motion fallback — show the end-state immediately
    if (prefersReducedMotion) {
      mm.add("(min-width: 1024px)", () => {
        // Hide left flying icons, show right destination icons
        gsap.set(".ck-src-icon", { opacity: 0 });
        gsap.set(".ck-dst-icon", { opacity: 1, scale: 1 });
        gsap.set(".ck-smile-icon", { opacity: 1, scale: 1, rotation: 0 });
        gsap.set(".ck-target-slot", {
          borderStyle: "solid",
          borderColor: "transparent",
          backgroundColor: "var(--ck-tile-landed-bg, white)",
        });
        gsap.set(".ck-target-text", { opacity: 0 });
        gsap.set(".ck-target-text-received", { opacity: 1, y: 0 });
        if (closingRef.current) gsap.set(closingRef.current, { opacity: 1, y: 0 });
        gsap.set(".ck-wavy-path", { strokeDashoffset: 0 });
      });
      return () => mm.revert();
    }

    // Desktop: Pinned scroll-scrubbed sequential icon travel
    mm.add("(min-width: 1024px)", () => {
      const pinTarget = pinTargetRef.current;
      const srcSlots = gsap.utils.toArray<HTMLElement>(".ck-start-slot");
      const dstSlots = gsap.utils.toArray<HTMLElement>(".ck-target-slot");
      const srcIcons = gsap.utils.toArray<HTMLElement>(".ck-src-icon");

      if (!pinTarget) return;

      // Helper to compute travel delta from source slot to destination slot
      const getDelta = (index: number) => {
        const src = srcSlots[index];
        const dst = dstSlots[index];
        if (!src || !dst) return { x: 320, y: 0 };
        const sRect = src.getBoundingClientRect();
        const dRect = dst.getBoundingClientRect();
        return {
          x: dRect.left - sRect.left + (dRect.width - sRect.width) / 2,
          y: dRect.top - sRect.top + (dRect.height - sRect.height) / 2,
        };
      };

      // Set initial states
      gsap.set(srcIcons, { x: 0, y: 0, scale: 1, opacity: 0.7 });
      gsap.set(".ck-dst-icon", { opacity: 0, scale: 0.8 });
      gsap.set(".ck-landing-heart", { scale: 0, opacity: 0 });
      gsap.set(".ck-smile-icon", { scale: 0.3, opacity: 0, rotation: -25 });
      gsap.set(".ck-target-text", { opacity: 1, y: 0 });
      gsap.set(".ck-target-text-received", { opacity: 0, y: 8 });
      if (closingRef.current) {
        gsap.set(closingRef.current, { opacity: 0, y: 24 });
      }
      gsap.set(".ck-wavy-path", { strokeDashoffset: 120 });

      // Master scrubbed timeline pinned during scroll
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinTarget,
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
          start: "top top",
          end: "+=1700",
          invalidateOnRefresh: true,
        },
      });

      // 1. Initial atmosphere on arrival: Heading & Problem/Solution card subtle reveals
      tl.to(".ck-heading-unused", { color: "#9ca3af", duration: 0.4, ease: "power1.out" }, 0);
      tl.fromTo(
        ".ck-heading-glow",
        { textShadow: "0 0 0px rgba(181,72,15,0)" },
        { textShadow: "0 0 16px rgba(181,72,15,0.4)", duration: 0.5, yoyo: true, repeat: 1, ease: "sine.inOut" },
        0.1
      );
      tl.fromTo(
        ".ck-problem-dot",
        { scale: 0.6, opacity: 0.5 },
        { scale: 1.3, opacity: 1, duration: 0.3, stagger: 0.1, yoyo: true, repeat: 1, ease: "back.out(2)" },
        0.05
      );
      tl.fromTo(
        ".ck-solution-check-path",
        { strokeDashoffset: 24 },
        { strokeDashoffset: 0, duration: 0.35, stagger: 0.1, ease: "power2.out" },
        0.15
      );

      // Radar rotation & distance badge pulse
      tl.fromTo(".ck-radar-sweep", { rotation: 0 }, { rotation: 360, duration: 8.5, ease: "none" }, 0);
      if (distanceTagRef.current) {
        tl.fromTo(
          distanceTagRef.current,
          { scale: 0.95, opacity: 0.85 },
          { scale: 1.05, opacity: 1, duration: 0.4, yoyo: true, repeat: 3, ease: "sine.inOut" },
          0.3
        );
      }

      // 2. Sequential Icon Journeys (1 by 1 across the 5 items)
      srcIcons.forEach((srcIcon, index) => {
        const itemStart = 0.45 + index * 1.35;
        const flightDuration = 0.85;
        const flightStart = itemStart + 0.15;
        const landingTime = flightStart + flightDuration;

        const dstSlot = dstSlots[index];
        const dstIcon = dstSlot?.querySelector<HTMLElement>(".ck-dst-icon");
        const smileIcon = dstSlot?.querySelector<HTMLElement>(".ck-smile-icon");
        const heartBurst = dstSlot?.querySelector<HTMLElement>(".ck-landing-heart");

        // Step A: Source icon wakes up (0.7 → 1.0 opacity, slight scale-up)
        tl.to(srcIcon, { opacity: 1, scale: 1.1, duration: 0.2, ease: "power1.out" }, itemStart);

        // Step B: Arced flight from left slot to right slot
        // Horizontal travel
        tl.to(
          srcIcon,
          {
            x: () => getDelta(index).x,
            duration: flightDuration,
            ease: "power1.inOut",
          },
          flightStart
        );

        // Vertical arcing motion with tilt
        tl.to(
          srcIcon,
          {
            keyframes: [
              {
                y: () => getDelta(index).y - 36,
                rotation: index % 2 === 0 ? 8 : -8,
                scale: 1.18,
                duration: flightDuration * 0.5,
                ease: "sine.out",
              },
              {
                y: () => getDelta(index).y,
                rotation: 0,
                scale: 1.06,
                duration: flightDuration * 0.5,
                ease: "sine.in",
              },
            ],
          },
          flightStart
        );

        // Step C: Crossfade — source icon fades out, destination icon fades in
        // Source fades out right at landing
        tl.to(srcIcon, { opacity: 0, duration: 0.15, ease: "power1.out" }, landingTime - 0.05);

        // Destination icon pops in with scale spring
        if (dstIcon) {
          tl.to(
            dstIcon,
            {
              keyframes: [
                { opacity: 1, scale: 1.1, duration: 0.15, ease: "power2.out" },
                { scale: 1.0, duration: 0.15, ease: "back.out(2)" },
              ],
            },
            landingTime - 0.05
          );
        }

        // Step D: Target slot tile becomes solid white (animate the tile itself)
        if (dstSlot) {
          tl.to(dstSlot, {
            borderColor: "transparent",
            backgroundColor: "var(--ck-tile-landed-bg)",
            boxShadow: "0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.07)",
            duration: 0.2,
            ease: "power1.out",
          }, landingTime);
        }

        // Step E: Heart burst + Smiley pop-in
        if (heartBurst) {
          tl.fromTo(
            heartBurst,
            { scale: 0, opacity: 0, y: 0 },
            { scale: 1.3, opacity: 1, y: -16, duration: 0.25, ease: "back.out(2)" },
            landingTime
          );
          tl.to(heartBurst, { opacity: 0, duration: 0.15 }, landingTime + 0.25);
        }

        if (smileIcon) {
          tl.fromTo(
            smileIcon,
            { opacity: 0, scale: 0.3, rotation: -25 },
            { opacity: 1, scale: 1, rotation: 0, duration: 0.35, ease: "back.out(2.5)" },
            landingTime + 0.05
          );
        }

        // When the first item lands, transition the header to "Received with Joy"
        if (index === 0) {
          tl.to(".ck-target-text", { opacity: 0, y: -8, duration: 0.2 }, landingTime);
          tl.to(".ck-target-text-received", { opacity: 1, y: 0, duration: 0.25 }, landingTime + 0.05);
        }
      });

      // 3. Closing Line: Appears ONLY after ALL 5 icons have completed their journey
      const allItemsLandedTime = 0.45 + 4 * 1.35 + 0.15 + 0.85 + 0.32; // ~7.2s

      if (closingRef.current) {
        tl.fromTo(
          closingRef.current,
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
          allItemsLandedTime + 0.15
        );
      }

      tl.fromTo(
        ".ck-wavy-path",
        { strokeDashoffset: 120 },
        { strokeDashoffset: 0, duration: 0.7, ease: "power2.out" },
        allItemsLandedTime + 0.35
      );

      tl.fromTo(
        ".ck-sparkle-twinkle",
        { scale: 0.5, rotate: -20, opacity: 0.3 },
        { scale: 1.3, rotate: 20, opacity: 1, duration: 0.4, yoyo: true, repeat: 2, ease: "sine.inOut" },
        allItemsLandedTime + 0.45
      );

      // ── DEBUG VERIFICATION (temporary, remove after confirming) ──
      // Uncomment the block below to verify end-state in browser console:
      /*
      setTimeout(() => {
        tl.progress(1);
        dstSlots.forEach((slot, i) => {
          const icon = slot.querySelector(".ck-dst-icon") as HTMLElement | null;
          if (!icon) { console.warn(`[VERIFY] slot ${i}: no .ck-dst-icon found`); return; }
          const cs = getComputedStyle(icon);
          const rect = icon.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const topEl = document.elementFromPoint(cx, cy);
          console.log(`[VERIFY] slot ${i}:`, {
            iconOpacity: cs.opacity,
            iconDisplay: cs.display,
            iconVisibility: cs.visibility,
            topElement: topEl?.className?.slice(0, 60),
            isIconOrChild: icon.contains(topEl),
          });
          // Check all ancestors up to section
          let el: HTMLElement | null = icon;
          while (el && el.id !== "problem-solution-section") {
            const pcs = getComputedStyle(el);
            if (parseFloat(pcs.opacity) < 1) {
              console.warn(`[VERIFY] slot ${i}: ancestor with opacity < 1:`, el.className.slice(0, 60), pcs.opacity);
            }
            el = el.parentElement;
          }
        });
        console.log("[VERIFY] progress(0) check:");
        tl.progress(0);
        srcIcons.forEach((icon, i) => {
          console.log(`  src ${i} opacity:`, getComputedStyle(icon).opacity);
        });
      }, 2000);
      */
    });

    // Mobile (<1024px) simpler entrance without horizontal flight
    mm.add("(max-width: 1023px)", () => {
      const tlMobile = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 75%",
        },
      });

      tlMobile.fromTo(
        ".ck-solution-check-path",
        { strokeDashoffset: 24 },
        { strokeDashoffset: 0, duration: 0.4, stagger: 0.15, ease: "power2.out" },
        0.1
      );

      if (closingRef.current) {
        tlMobile.fromTo(
          closingRef.current,
          { y: 15, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" },
          0.3
        );
        tlMobile.fromTo(
          ".ck-wavy-path",
          { strokeDashoffset: 120 },
          { strokeDashoffset: 0, duration: 0.6, ease: "power2.out" },
          0.5
        );
      }
    });

    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 300);

    return () => {
      clearTimeout(refreshTimer);
      mm.revert();
    };
  }, [isClient]);

  return (
    <div ref={containerRef} className="relative w-full bg-[#FAF8F5] dark:bg-[#120C04] transition-colors duration-300">
      {/* CSS custom property for tile landed background, used by GSAP */}
      <style jsx>{`
        :root { --ck-tile-landed-bg: white; }
        :root.dark { --ck-tile-landed-bg: #1c1917; }
        .dark { --ck-tile-landed-bg: #1c1917; }
      `}</style>

      <section
        ref={pinTargetRef}
        id="problem-solution-section"
        className="relative w-full py-6 sm:py-8 lg:py-6 min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-center overflow-visible border-b border-stone-200/80 dark:border-stone-850/70"
      >
        {/* Decorative background subtle radial glow */}
        <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-15">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[radial-gradient(circle,_rgba(181,72,15,0.18)_0%,_transparent_70%)] blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-5 sm:px-8 w-full">
          {/* Header & Eyebrow */}
          <div className="text-center max-w-2xl mx-auto mb-4 lg:mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="h-0.5 w-6 rounded-full bg-[#B5480F]" />
              <p className="text-3xs sm:text-2xs font-black uppercase tracking-[0.2em] text-[#B5480F] dark:text-[#F4A25B] flex overflow-hidden">
                {labelText.split("").map((char, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, y: 4 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.03, delay: 0.05 + index * 0.02 }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </p>
              <span className="h-0.5 w-6 rounded-full bg-[#B5480F]" />
            </div>

            {/* Heading: "unused" loses colour, "People nearby go without." has warm pulse */}
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 leading-snug">
              <span>Good things sit </span>
              <span className="ck-heading-unused transition-colors duration-500">unused.</span>{" "}
              <span className="ck-heading-glow text-[#B5480F] dark:text-[#F4A25B] transition-all duration-500">
                People nearby go without.
              </span>
            </h2>
          </div>

          {/* Unified Desktop CSS Grid: 3 columns (Left, Center Badge, Right) & 2 rows (Cards, Item Boxes) */}
          <div className="hidden lg:grid grid-cols-[1fr_100px_1fr] grid-rows-[auto_auto] gap-x-6 gap-y-3.5 items-stretch relative">
            {/* ROW 1, COL 1: The Problem Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/85 dark:bg-stone-900/85 border border-stone-200/80 dark:border-stone-800 shadow-xs backdrop-blur-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="p-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                    The Problem
                  </h3>
                </div>
                <ul className="space-y-2 text-xs text-stone-600 dark:text-stone-300 font-medium">
                  {problemPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="ck-problem-dot w-1.5 h-1.5 rounded-full bg-red-500/90 mt-1.5 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* COL 2, ROW 1 & 2 (Spanned): Center Distance Pulse Badge with Concentric Ring & Radar Sweep */}
            <div className="row-span-2 flex flex-col items-center justify-center relative">
              {/* Radar Sweep & Concentric Rings */}
              <div className="relative flex items-center justify-center">
                <div className="ck-radar-sweep absolute w-28 h-28 rounded-full border border-[#B5480F]/20 pointer-events-none">
                  <div className="w-1/2 h-1/2 bg-gradient-to-br from-[#B5480F]/20 to-transparent rounded-tl-full" />
                </div>
                <div className="absolute w-24 h-24 rounded-full border border-dashed border-[#B5480F]/30 dark:border-[#F4A25B]/30 pointer-events-none animate-spin-slow" />
                <div className="absolute w-20 h-20 rounded-full bg-[#B5480F]/5 dark:bg-[#B5480F]/10 animate-ping pointer-events-none" />

                {/* Centered Badge */}
                <div
                  ref={distanceTagRef}
                  className="relative z-10 px-3 py-1.5 rounded-full bg-[#FBEDE3] dark:bg-[#25150E] border border-[#B5480F]/40 shadow-xs flex items-center gap-1.5 text-3xs font-black uppercase tracking-wider text-[#B5480F] dark:text-[#F4A25B] whitespace-nowrap"
                >
                  <MapPin className="w-3 h-3 shrink-0 text-[#B5480F] dark:text-[#F4A25B]" />
                  <span>Within 10 km</span>
                </div>
              </div>
            </div>

            {/* ROW 1, COL 3: Our Solution Card (Orange / CauseKind Primary Theme) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/85 dark:bg-stone-900/85 border border-stone-200/80 dark:border-stone-800 shadow-xs backdrop-blur-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="p-1 rounded-lg bg-[#B5480F]/10 text-[#B5480F] dark:text-[#F4A25B]">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                    Our Solution
                  </h3>
                </div>
                <ul className="space-y-2 text-xs text-stone-600 dark:text-stone-300 font-medium">
                  {solutionPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#B5480F]/15 dark:bg-[#F4A25B]/20 flex items-center justify-center mt-0.5 shrink-0">
                        <svg viewBox="0 0 14 14" className="w-2.5 h-2.5">
                          <path
                            d="M 2 7 L 5 10 L 12 3"
                            fill="none"
                            stroke="#B5480F"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="24"
                            className="ck-solution-check-path"
                          />
                        </svg>
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ROW 2, COL 1: Storage Box (Unused at home) — higher z-index so flying icons pass OVER the right box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#EFECE6] dark:bg-[#1C1512] border-2 border-dashed border-stone-300 dark:border-stone-700 flex flex-col justify-between relative overflow-visible z-20">
              <div className="text-3xs font-extrabold uppercase tracking-widest text-stone-500 dark:text-stone-400 flex items-center gap-1.5 mb-2.5">
                <Package className="w-3.5 h-3.5 text-stone-500" />
                <span>Unused at home</span>
              </div>

              {/* 5 source slots: each has a dashed outline and a dusty grey icon */}
              <div className="grid grid-cols-5 gap-2 items-center justify-items-center relative">
                {items.map((item) => {
                  const IconComp = item.comp;
                  return (
                    <div
                      key={item.id}
                      className="ck-start-slot relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700/80 bg-stone-200/40 dark:bg-stone-800/40 flex items-center justify-center overflow-visible"
                    >
                      {/* The flying icon — dusty grey, direct child, GSAP transforms this */}
                      <div className="ck-src-icon w-8 h-8 sm:w-9 sm:h-9 grayscale opacity-70" style={{ position: "relative", zIndex: 30 }}>
                        <IconComp className="w-full h-full" color="#999" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ROW 2, COL 3: Receiving Box (Needed nearby) — lower z-index so flying icons pass over */}
            <div className="ck-target-box p-4 sm:p-5 rounded-2xl bg-[#FBEDE3]/30 dark:bg-[#B5480F]/5 border-2 border-dashed border-[#B5480F]/30 flex flex-col justify-between relative overflow-visible z-10 transition-colors">
              <div className="relative text-3xs font-extrabold uppercase tracking-widest text-[#B5480F] dark:text-[#F4A25B] flex items-center mb-2.5 h-4 z-10">
                <MapPin className="w-3.5 h-3.5 shrink-0 mr-1.5" />
                <span className="ck-target-text absolute left-5 top-0">Needed nearby</span>
                <span className="ck-target-text-received absolute left-5 top-0 opacity-0 translate-y-2 text-[#B5480F] dark:text-[#F4A25B] flex items-center gap-1 w-max">
                  Received with Joy <HeartHandshake className="w-3 h-3 ml-0.5" />
                </span>
              </div>

              {/* 5 destination slots: each is a tile with the full-colour icon inside (opacity 0 initially) */}
              <div className="grid grid-cols-5 gap-2 items-center justify-items-center relative">
                {items.map((item) => {
                  const IconComp = item.comp;
                  return (
                    <div
                      key={item.id}
                      className="ck-target-slot relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 border-dashed border-[#B5480F]/35 flex items-center justify-center overflow-visible"
                      style={{ backgroundColor: "transparent" }}
                    >
                      {/* Full-colour destination icon — direct child, on top, starts at opacity 0 */}
                      <div className="ck-dst-icon relative z-10 w-8 h-8 sm:w-9 sm:h-9 opacity-0">
                        <IconComp className="w-full h-full" color={item.activeColor} />
                      </div>

                      {/* Tiny Heart burst on landing */}
                      <div className="ck-landing-heart absolute -top-2 left-1/2 -translate-x-1/2 opacity-0 pointer-events-none z-40">
                        <Heart className="w-3.5 h-3.5 fill-[#B5480F] text-[#B5480F] dark:fill-[#F4A25B] dark:text-[#F4A25B]" />
                      </div>

                      {/* Smile that pops up after landing with spring */}
                      <div className="ck-smile-icon absolute -top-3 -right-2 opacity-0 scale-50 rotate-[-20deg] z-40">
                        <Smile className="w-5 h-5 text-[#B5480F] dark:text-[#F4A25B] fill-[#FBEDE3] dark:fill-[#25150E]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile Stacked View (<1024px) */}
          <div className="lg:hidden flex flex-col gap-4 my-2">
            {/* The Problem Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                  The Problem
                </h3>
              </div>
              <ul className="space-y-1.5 text-xs text-stone-600 dark:text-stone-300 font-medium mb-3">
                {problemPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-950 grid grid-cols-5 gap-1.5 items-center justify-items-center">
                {items.map((item) => {
                  const IconComp = item.comp;
                  return (
                    <div key={item.id} className="w-10 h-10 p-1.5 rounded-xl bg-white dark:bg-stone-900 shadow-2xs flex items-center justify-center grayscale opacity-75">
                      <IconComp className="w-full h-full text-stone-500" color="#777" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Connecting Badge */}
            <div className="flex items-center justify-center gap-2">
              <span className="h-px w-10 bg-[#B5480F]/30" />
              <div className="px-3 py-1 rounded-full bg-[#FBEDE3] dark:bg-[#B5480F]/20 border border-[#B5480F]/40 text-3xs font-black uppercase text-[#B5480F] dark:text-[#F4A25B] flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />
                <span>Handover within 10 km</span>
                <ArrowRight className="w-3 h-3" />
              </div>
              <span className="h-px w-10 bg-[#B5480F]/30" />
            </div>

            {/* Our Solution Card (Orange) */}
            <div className="p-4 rounded-2xl bg-[#FBEDE3]/70 dark:bg-[#B5480F]/10 border border-[#B5480F]/30 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 rounded-lg bg-[#B5480F]/10 text-[#B5480F] dark:text-[#F4A25B]">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                  Our Solution
                </h3>
              </div>
              <ul className="space-y-1.5 text-xs text-stone-600 dark:text-stone-300 font-medium mb-3">
                {solutionPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B5480F] mt-1 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-stone-900/80 grid grid-cols-5 gap-1.5 items-center justify-items-center">
                {items.map((item) => {
                  const IconComp = item.comp;
                  return (
                    <div key={item.id} className="w-10 h-10 p-1.5 rounded-xl bg-white dark:bg-stone-900 shadow-2xs flex items-center justify-center">
                      <IconComp className="w-full h-full" color={item.activeColor} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Centred Closing Line: Wavy underline draws + Sparkle twinkles */}
          <div ref={closingRef} className="text-center mt-4 lg:mt-6 opacity-0">
            <p className="text-base sm:text-lg lg:text-xl font-extrabold text-stone-900 dark:text-stone-100 inline-flex items-center justify-center gap-1.5 flex-wrap">
              <span>Your extra becomes someone&apos;s</span>
              <span className="relative inline-flex items-center gap-1.5 text-[#B5480F] dark:text-[#F4A25B] font-extrabold">
                <span>essential.</span>
                <Sparkles className="ck-sparkle-twinkle w-4 h-4 text-[#F4A25B]" />
                {/* Wavy Underline SVG */}
                <svg
                  className="absolute left-0 -bottom-1.5 w-full h-2 overflow-visible pointer-events-none"
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 0 4 Q 25 0, 50 4 T 100 4"
                    fill="none"
                    stroke="#B5480F"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray="120"
                    className="ck-wavy-path"
                  />
                </svg>
              </span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
