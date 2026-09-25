"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, useInView } from "framer-motion";
import { ArrowRight, MapPin, Sparkles, CheckCircle2, AlertCircle, Package, Smile, HeartHandshake } from "lucide-react";

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
    { id: "book", name: "Textbooks", comp: BookIllustration, activeColor: "#B5480F" },
    { id: "shirt", name: "Clothes", comp: ShirtIllustration, activeColor: "#F4A25B" },
    { id: "fan", name: "Spare Fan", comp: FanIllustration, activeColor: "#0F7A6C" },
    { id: "chair", name: "Study Chair", comp: ChairIllustration, activeColor: "#1F6B3F" },
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

    mm.add("(min-width: 1024px)", () => {
      const itemEls = gsap.utils.toArray<HTMLElement>(".ck-flying-item");
      const startSlots = gsap.utils.toArray<HTMLElement>(".ck-start-slot");
      const targetSlots = gsap.utils.toArray<HTMLElement>(".ck-target-slot");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 60%", // Play automatically when section enters view
        },
      });

      // Step-by-step transfer of items from storage box to needed nearby
      itemEls.forEach((el, index) => {
        const startSlot = startSlots[index];
        const target = targetSlots[index];
        const dustLayer = el.querySelector(".dust-layer");
        const activeIcon = el.querySelector(".active-icon");

        // Crossfade from grey dust to active color
        tl.to(
          dustLayer,
          { opacity: 0, duration: 0.3 },
          index * 0.25
        );
        tl.to(
          activeIcon,
          { opacity: 1, duration: 0.3 },
          index * 0.25
        );

        // Fly item across to exact target slot position
        tl.to(
          el,
          {
            x: () => {
              if (!target || !startSlot) return 300;
              const startRect = startSlot.getBoundingClientRect();
              const targetRect = target.getBoundingClientRect();
              return targetRect.left - startRect.left;
            },
            y: () => {
              if (!target || !startSlot) return 0;
              const startRect = startSlot.getBoundingClientRect();
              const targetRect = target.getBoundingClientRect();
              return targetRect.top - startRect.top;
            },
            scale: 1,
            rotation: 0,
            duration: 0.8,
            ease: "power2.inOut",
          },
          index * 0.25 + 0.1
        );
      });

      // Pulse distance tag
      if (distanceTagRef.current) {
        tl.fromTo(
          distanceTagRef.current,
          { scale: 0.95, opacity: 0.8 },
          { scale: 1.06, opacity: 1, duration: 0.4, yoyo: true, repeat: 1, ease: "sine.inOut" },
          0.8
        );
      }

      // The "Next part of the story" - Reaches the person in need
      tl.to(".ck-target-bg-active", {
        opacity: 1,
        duration: 0.4,
      }, 2.0);
      
      // Title swaps to "Received with Joy"
      tl.to(".ck-target-text", {
        opacity: 0,
        y: -10,
        duration: 0.2,
      }, 2.0);
      
      tl.to(".ck-target-text-received", {
        opacity: 1,
        y: 0,
        duration: 0.3,
      }, 2.2);

      // Smiling faces pop up on each slot
      tl.to(".ck-smile-icon", {
        opacity: 1,
        scale: 1,
        rotation: 0,
        duration: 0.4,
        ease: "back.out(2)",
        stagger: 0.08,
      }, 2.1);

      // Closing line reveal at the end
      if (closingRef.current) {
        tl.fromTo(
          closingRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" },
          2.6
        );
      }
    }, containerRef);

    // Refresh ScrollTrigger after layout settles & font load
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
      <section
        ref={pinTargetRef}
        id="problem-solution-section"
        className="relative w-full py-6 sm:py-8 lg:py-6 min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-center overflow-hidden border-b border-stone-200/80 dark:border-stone-850/70"
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

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 leading-snug">
              Good things sit unused.{" "}
              <span className="text-[#B5480F] dark:text-[#F4A25B]">People nearby go without.</span>
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
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500/80 mt-1.5 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* COL 2, ROW 1 & 2 (Spanned): Center Distance Pulse Badge with Concentric Ring */}
            <div className="row-span-2 flex flex-col items-center justify-center relative">
              {/* Outer Concentric Animated Dashed Ring (Centered around badge) */}
              <div className="relative flex items-center justify-center">
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

            {/* ROW 1, COL 3: Our Solution Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/85 dark:bg-stone-900/85 border border-stone-200/80 dark:border-stone-800 shadow-xs backdrop-blur-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                    Our Solution
                  </h3>
                </div>
                <ul className="space-y-2 text-xs text-stone-600 dark:text-stone-300 font-medium">
                  {solutionPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 mt-1.5 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ROW 2, COL 1: Storage Box (Unused at home) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#EFECE6] dark:bg-[#1C1512] border-2 border-dashed border-stone-300 dark:border-stone-700 flex flex-col justify-between">
              <div className="text-3xs font-extrabold uppercase tracking-widest text-stone-500 dark:text-stone-400 flex items-center gap-1.5 mb-2.5">
                <Package className="w-3.5 h-3.5 text-stone-500" />
                <span>Unused at home</span>
              </div>

              {/* 5 Equal Slots with Placeholders & Flying Items */}
              <div className="grid grid-cols-5 gap-2 items-center justify-items-center">
                {items.map((item) => {
                  const IconComp = item.comp;
                  return (
                    <div
                      key={item.id}
                      className="ck-start-slot relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center"
                    >
                      {/* Faint placeholder left behind */}
                      <div className="absolute inset-0 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700/80 bg-stone-200/40 dark:bg-stone-800/40" />

                      {/* Flying Item with Greyscale / Color crossfade */}
                      <div className="ck-flying-item absolute inset-0 rounded-2xl bg-white dark:bg-stone-900 shadow-xs border border-stone-200 dark:border-stone-800 flex items-center justify-center p-2 z-20 cursor-default">
                        {/* Dusty greyscale layer */}
                        <div className="dust-layer absolute inset-0 rounded-2xl flex items-center justify-center p-2 bg-stone-100/95 dark:bg-stone-800/95 grayscale opacity-90 transition-opacity">
                          <IconComp className="w-full h-full text-stone-400" color="#888" />
                        </div>
                        {/* Clean full-color layer */}
                        <div className="active-icon absolute inset-0 rounded-2xl flex items-center justify-center p-2 opacity-0 transition-opacity">
                          <IconComp className="w-full h-full" color={item.activeColor} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ROW 2, COL 3: Receiving Box (Needed nearby) */}
            <div className="ck-target-box p-4 sm:p-5 rounded-2xl bg-[#E3F2EF]/60 dark:bg-[#0F7A6C]/10 border-2 border-dashed border-[#0F7A6C]/40 flex flex-col justify-between relative overflow-hidden transition-colors">
              {/* Highlight layer for when items are received */}
              <div className="ck-target-bg-active absolute inset-0 bg-[#0F7A6C]/15 dark:bg-[#0F7A6C]/30 opacity-0 pointer-events-none" />
              
              <div className="relative text-3xs font-extrabold uppercase tracking-widest text-[#0F7A6C] dark:text-[#5ec7b6] flex items-center mb-2.5 h-4 z-10">
                <MapPin className="w-3.5 h-3.5 shrink-0 mr-1.5" />
                <span className="ck-target-text absolute left-5 top-0">Needed nearby</span>
                <span className="ck-target-text-received absolute left-5 top-0 opacity-0 translate-y-2 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 w-max">
                  Received with Joy <HeartHandshake className="w-3 h-3 ml-0.5" />
                </span>
              </div>

              {/* 5 Equal Target Slots */}
              <div className="grid grid-cols-5 gap-2 items-center justify-items-center relative z-10">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="ck-target-slot relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 border-dashed border-[#0F7A6C]/35 bg-white/40 dark:bg-stone-900/40 flex items-center justify-center"
                  >
                    <MapPin className="w-4 h-4 text-[#0F7A6C]/35" />
                    {/* Smile that pops up after landing */}
                    <div className="ck-smile-icon absolute -top-3 -right-2 opacity-0 scale-50 rotate-[-20deg]">
                       <Smile className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950" />
                    </div>
                  </div>
                ))}
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

            {/* Our Solution Card */}
            <div className="p-4 rounded-2xl bg-[#E3F2EF]/70 dark:bg-[#0F7A6C]/10 border border-[#0F7A6C]/30 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                  Our Solution
                </h3>
              </div>
              <ul className="space-y-1.5 text-xs text-stone-600 dark:text-stone-300 font-medium mb-3">
                {solutionPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1 shrink-0" />
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

          {/* Centred Closing Line */}
          <div ref={closingRef} className="text-center mt-4 lg:mt-6">
            <p className="text-base sm:text-lg lg:text-xl font-extrabold text-stone-900 dark:text-stone-100 inline-flex items-center justify-center gap-1.5 flex-wrap">
              <span>Your extra becomes someone&apos;s</span>
              <span className="text-[#B5480F] dark:text-[#F4A25B] font-extrabold underline decoration-[#B5480F]/40 decoration-wavy underline-offset-4 inline-flex items-center gap-1.5">
                essential.
                <Sparkles className="w-4 h-4 text-[#F4A25B]" />
              </span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

