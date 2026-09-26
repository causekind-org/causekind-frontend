"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { motion, useInView } from "framer-motion";
import {
  Package,
  MapPin,
  HeartHandshake,
  Award,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Heart,
  FileCheck,
  User,
  Calendar,
  Layers,
  Smile,
} from "lucide-react";
import { FlipCard, SnapCarousel, useRevealOnce, stagger } from "@/components/home/mobile/primitives";

// Illustrated Handover Icons (2 hands meeting)
function HandsMeetingIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <path
        d="M8 36L22 28C24.5 26.5 28 27.5 29.5 30L33 36C34.5 38.5 33.5 42 31 43.5L20 48"
        stroke="#B5480F"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M56 36L42 28C39.5 26.5 36 27.5 34.5 30L31 36C29.5 38.5 30.5 42 33 43.5L44 48"
        stroke="#0F7A6C"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="34" r="5" fill="#B5480F" fillOpacity="0.2" stroke="#B5480F" strokeWidth="2" />
    </svg>
  );
}

// 3D Tilt Impact Certificate Component
function ImpactCertificateSample() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [shinePos, setShinePos] = useState({ x: 50, y: 50 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    setRotateX(-((y - centerY) / centerY) * 8);
    setRotateY(((x - centerX) / centerX) * 8);
    setShinePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  }, []);

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="ck-cert-card relative w-full max-w-[340px] sm:max-w-[360px] lg:max-w-[370px] rounded-2xl bg-[#FCFAF6] dark:bg-[#1A130E] border-2 border-[#B5480F]/40 dark:border-[#B5480F]/60 shadow-xl p-4 sm:p-5 select-none transition-transform duration-150 ease-out"
      style={{
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      }}
    >
      {/* Moving Specular Shine Overlay */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-40 dark:opacity-25 transition-opacity"
        style={{
          background: `radial-gradient(circle at ${shinePos.x}% ${shinePos.y}%, rgba(255,255,255,0.8) 0%, transparent 60%)`,
        }}
      />

      {/* Decorative inner ornamental border */}
      <div className="absolute inset-2 border border-[#B5480F]/20 dark:border-[#B5480F]/30 rounded-xl pointer-events-none" />

      {/* Diagonal SAMPLE Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <span className="text-5xl sm:text-6xl font-black tracking-widest text-stone-900/[0.04] dark:text-white/[0.04] -rotate-25 select-none">
          SAMPLE
        </span>
      </div>

      {/* Certificate Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-stone-200/80 dark:border-stone-800/80 pb-2.5 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-[#B5480F] flex items-center justify-center text-white shadow-2xs">
            <Heart className="w-3.5 h-3.5 fill-white" />
          </div>
          <span className="text-3xs font-extrabold tracking-widest uppercase text-[#B5480F] dark:text-[#F4A25B]">
            CauseKind
          </span>
        </div>
        <span className="text-4xs font-mono font-bold tracking-wider text-stone-400 dark:text-stone-500">
          CK-SAMPLE-0001
        </span>
      </div>

      {/* Certificate Title */}
      <div className="relative z-10 text-center mb-3">
        <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-stone-900 dark:text-stone-100">
          Certificate of Impact
        </h4>
        <p className="text-4xs text-[#B5480F] dark:text-[#F4A25B] font-bold uppercase tracking-widest">
          Verified In-Kind Handover
        </p>
      </div>

      {/* Certificate Data Rows */}
      <div className="relative z-10 space-y-2 text-3xs sm:text-2xs text-stone-700 dark:text-stone-300 font-medium">
        <div className="flex items-center justify-between bg-stone-100/70 dark:bg-stone-900/60 p-1.5 rounded-lg">
          <span className="text-stone-400 font-semibold flex items-center gap-1">
            <User className="w-3 h-3 text-[#B5480F]" /> Donor
          </span>
          <span className="font-bold text-stone-900 dark:text-stone-100">Sample Donor</span>
        </div>

        <div className="flex items-center justify-between bg-stone-100/70 dark:bg-stone-900/60 p-1.5 rounded-lg">
          <span className="text-stone-400 font-semibold flex items-center gap-1">
            <Package className="w-3 h-3 text-[#0F7A6C]" /> Item
          </span>
          <span className="font-bold text-stone-900 dark:text-stone-100 truncate max-w-[180px]">
            School textbooks (set of 5)
          </span>
        </div>

        <div className="flex items-center justify-between bg-stone-100/70 dark:bg-stone-900/60 p-1.5 rounded-lg">
          <span className="text-stone-400 font-semibold flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#1F6B3F]" /> Handed to
          </span>
          <span className="font-bold text-stone-900 dark:text-stone-100">Verified Student, Mumbai</span>
        </div>

        <div className="flex items-center justify-between bg-stone-100/70 dark:bg-stone-900/60 p-1.5 rounded-lg">
          <span className="text-stone-400 font-semibold flex items-center gap-1">
            <Calendar className="w-3 h-3 text-stone-500" /> Date
          </span>
          <span className="font-bold text-stone-900 dark:text-stone-100">24 Sep 2026</span>
        </div>
      </div>

      {/* Certificate Footer with Stamp Landing Zone */}
      <div className="relative z-10 mt-3 pt-2 border-t border-stone-200/80 dark:border-stone-800/80 flex items-center justify-between">
        <div className="flex items-center gap-1 text-4xs text-stone-400 font-semibold">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>100% In-Person Handover</span>
        </div>
        <div className="w-6 h-6 rounded-md bg-stone-200/60 dark:bg-stone-800/80 flex items-center justify-center">
          <FileCheck className="w-3.5 h-3.5 text-stone-500" />
        </div>
      </div>

      {/* "HANDOVER VERIFIED" Slamming Rubber Stamp */}
      <div className="ck-cert-stamp absolute right-3 bottom-5 z-30 pointer-events-none">
        <div className="px-2.5 py-1 rounded-md border-2 border-[#B5480F] text-[#B5480F] bg-[#FBEDE3]/95 dark:bg-[#2A150D]/95 font-black uppercase text-3xs sm:text-2xs tracking-wider shadow-md transform -rotate-12 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#B5480F]" />
          <span>HANDOVER VERIFIED</span>
        </div>
      </div>
    </div>
  );
}

type Stop = {
  step: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgSoft: string;
};
type Point = { title: string; text: string; icon: React.ComponentType<{ className?: string }> };

/**
 * Phone version (< 768px).
 *
 * <p>The vertical timeline, certificate and three points were stacked into
 * about a screen and a half. The stops become a horizontal timeline — the
 * dashed road runs from each stop's node into the next slide, so the swipe
 * *is* the journey — and the certificate and the three promises it stands for
 * share one flip card.
 */
function SupportJourneyMobile({ stops, points }: { stops: Stop[]; points: Point[] }) {
  const ref = useRevealOnce<HTMLDivElement>();
  return (
    <div ref={ref} className="md:hidden px-5 mt-5 flex flex-col gap-5">
      <div data-reveal-item="left" style={stagger(0)}>
        <SnapCarousel label="Where your item goes" dotsClassName="mt-1">
          {stops.map((st, i) => {
            const IconComp = st.icon;
            const last = i === stops.length - 1;
            return (
              <div key={st.step} className="relative flex flex-col">
                <div className="relative flex items-center h-10 mb-2">
                  <span
                    className="relative z-10 w-9 h-9 rounded-full border-2 flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: st.bgSoft, borderColor: st.color, color: st.color }}
                  >
                    <IconComp className="w-4 h-4" />
                  </span>
                  {/* The road: runs past this slide's edge, across the gap, to the next node. */}
                  {!last && (
                    <span
                      aria-hidden
                      className="absolute left-10 -right-3 top-1/2 border-t-2 border-dashed"
                      style={{ borderColor: `${st.color}66` }}
                    />
                  )}
                </div>
                <div className="flex-1 p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs">
                  <span
                    className="text-4xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: st.bgSoft, color: st.color }}
                  >
                    Stop {st.step}
                  </span>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-1.5">{st.title}</h3>
                  <p className="text-xs text-stone-600 dark:text-stone-300 font-medium mt-0.5 leading-snug">{st.desc}</p>
                </div>
              </div>
            );
          })}
        </SnapCarousel>
      </div>

      <div data-reveal-item style={stagger(1)}>
        <FlipCard
          className="mx-auto w-full max-w-[340px]"
          toBackLabel="Why it matters"
          toFrontLabel="Show the certificate"
          front={
            <div className="flex justify-center">
              <ImpactCertificateSample />
            </div>
          }
          back={
            <div className="h-full rounded-2xl bg-[#FCFAF6] dark:bg-[#1A130E] border-2 border-[#B5480F]/30 shadow-xl p-4 flex flex-col justify-center gap-3">
              {points.map((pt) => {
                const IconComp = pt.icon;
                return (
                  <div key={pt.title} className="flex items-start gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-[#FBEDE3] dark:bg-[#2A150D] text-[#B5480F] flex items-center justify-center shrink-0 mt-0.5">
                      <IconComp className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">{pt.title}</h4>
                      <p className="text-[11px] text-stone-600 dark:text-stone-300 font-medium mt-0.5 leading-snug">{pt.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          }
        />
      </div>
    </div>
  );
}

export function SupportJourneySection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinTargetRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const parcelRef = useRef<HTMLDivElement>(null);

  const [isClient, setIsClient] = useState(false);
  const isInView = useInView(containerRef, { once: true, amount: 0.1 });

  const labelText = "WHERE YOUR SUPPORT GOES";

  const stops = [
    {
      step: "01",
      title: "Your item",
      desc: "Books, clothes, or appliances you no longer use",
      icon: Package,
      color: "#B5480F",
      bgSoft: "#FBEDE3",
    },
    {
      step: "02",
      title: "Verified person nearby",
      desc: "Govt-ID & address checked before matching",
      icon: ShieldCheck,
      color: "#0F7A6C",
      bgSoft: "#E3F2EF",
    },
    {
      step: "03",
      title: "Handed over in person",
      desc: "Direct handover within 10 km, no middlemen",
      icon: HeartHandshake,
      color: "#1F6B3F",
      bgSoft: "#E5F1E9",
    },
    {
      step: "04",
      title: "Impact certificate",
      desc: "Instant digital proof of your direct contribution",
      icon: Award,
      color: "#B5480F",
      bgSoft: "#FBEDE3",
    },
  ];

  const threePoints = [
    {
      title: "You choose who you help",
      text: "You see the need before you give, so you know exactly who benefits.",
      icon: CheckCircle2,
    },
    {
      title: "It stays local",
      text: "Every match is within 10 km, so your help strengthens your own neighbourhood.",
      icon: MapPin,
    },
    {
      title: "You get proof",
      text: "Every completed handover gives you an impact certificate you can keep or share.",
      icon: Award,
    },
  ];

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !pinTargetRef.current || !containerRef.current || !trackRef.current) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px)", () => {
      const track = trackRef.current;
      if (!track) return;

      const stopCards = gsap.utils.toArray<HTMLElement>(".ck-stop-card");
      const stopPins = gsap.utils.toArray<HTMLElement>(".ck-stop-pin");
      const certCard = document.querySelector<HTMLElement>(".ck-cert-card");
      const certStamp = document.querySelector<HTMLElement>(".ck-cert-stamp");
      const glowBurst = document.querySelector<HTMLElement>(".ck-handover-glow");
      const benefitPoints = gsap.utils.toArray<HTMLElement>(".ck-benefit-point");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 60%", // Play automatically without scrub
        },
      });

      // 1. Horizontal Track Translation
      tl.to(
        track,
        {
          x: () => -(track.scrollWidth - window.innerWidth + 80),
          ease: "power1.inOut",
          duration: 3.5,
        },
        0
      );

      // 2. Parcel Box Motion along track
      if (parcelRef.current) {
        tl.to(
          parcelRef.current,
          {
            x: () => track.scrollWidth * 0.58,
            ease: "power1.inOut",
            duration: 3.0,
          },
          0
        );
      }

      // 3. Stop pins & cards pop open as parcel reaches them
      stopPins.forEach((pin, i) => {
        tl.fromTo(
          pin,
          { y: -25, opacity: 0, scale: 0.6 },
          { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" },
          i * 0.7 + 0.2
        );
      });

      stopCards.forEach((card, i) => {
        tl.fromTo(
          card,
          { opacity: 0, scale: 0.88, y: 15 },
          { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "power2.out" },
          i * 0.7 + 0.3
        );
      });

      // 4. Handover Glow Burst & Happy Face at Stop 3 (i = 2 -> 1.6s)
      if (glowBurst) {
        tl.fromTo(
          glowBurst,
          { scale: 0, opacity: 0 },
          { scale: 1.4, opacity: 0.85, duration: 0.4, yoyo: true, repeat: 1, ease: "sine.inOut" },
          1.6
        );
      }
      
      const happyRecipient = document.querySelector<HTMLElement>(".ck-happy-recipient");
      if (happyRecipient) {
        tl.fromTo(
          happyRecipient,
          { opacity: 0, scale: 0, y: 10, rotate: -20 },
          { opacity: 1, scale: 1.2, y: 0, rotate: 10, duration: 0.5, ease: "back.out(2)" },
          1.8
        );
      }

      // 5. Final Certificate Fly-In & 3D Upright Rotate
      if (certCard) {
        tl.fromTo(
          certCard,
          { rotateX: 30, rotateY: -10, scale: 0.85, opacity: 0 },
          { rotateX: 0, rotateY: 0, scale: 1, opacity: 1, duration: 0.6, ease: "power2.out" },
          2.6
        );
      }

      // 6. Stamp Slams Onto Certificate with subtle card shake
      if (certStamp) {
        tl.fromTo(
          certStamp,
          { scale: 2.5, opacity: 0, rotate: -30 },
          { scale: 1, opacity: 1, rotate: -12, duration: 0.4, ease: "back.out(2.2)" },
          3.2
        );

        if (certCard) {
          tl.to(
            certCard,
            { x: 4, yoyo: true, repeat: 3, duration: 0.05, ease: "linear" },
            3.3
          );
        }
      }

      // 7. Three Points Fade Up Sequentially
      benefitPoints.forEach((point, i) => {
        tl.fromTo(
          point,
          { opacity: 0, x: 25 },
          { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" },
          2.8 + i * 0.2
        );
      });
    }, containerRef);

    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 350);

    return () => {
      clearTimeout(refreshTimer);
      mm.revert();
    };
  }, [isClient]);

  return (
    <div ref={containerRef} className="relative w-full bg-[#FAF8F5] dark:bg-[#120C04] transition-colors duration-300">
      <section
        ref={pinTargetRef}
        id="where-support-goes"
        className="ck-m-section relative w-full min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-between py-6 sm:py-8 lg:py-6 overflow-hidden border-b border-stone-200/80 dark:border-stone-850/70"
      >
        {/* Decorative background ambient radial glow */}
        <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-15">
          <div className="absolute top-1/2 left-1/3 w-[650px] h-[450px] bg-[radial-gradient(circle,_rgba(181,72,15,0.18)_0%,_transparent_70%)] blur-3xl" />
        </div>

        {/* Top Fixed Header */}
        <div className="relative mx-auto max-w-6xl px-5 sm:px-8 w-full text-center">
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

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 leading-snug max-w-2xl mx-auto">
            Your item goes straight to the person who asked for it.
          </h2>

          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-medium max-w-xl mx-auto mt-1.5 leading-relaxed">
            No warehouses. No middlemen. No cash handling. What you give reaches the exact person or NGO who requested it.
          </p>
        </div>

        {/* DESKTOP (≥1024px) Horizontal Moving Journey Track */}
        <div className="hidden lg:block relative w-full overflow-hidden my-auto py-4">
          <div
            ref={trackRef}
            className="flex items-center gap-12 sm:gap-16 pl-12 sm:pl-16 pr-24 w-max relative"
          >
            {/* SVG Dashed Orange Road running through stops */}
            <svg
              className="absolute left-16 right-0 top-1/2 -translate-y-1/2 h-20 w-[1700px] pointer-events-none z-0"
              viewBox="0 0 1700 80"
              fill="none"
            >
              <defs>
                <linearGradient id="road-grad-journey" gradientUnits="userSpaceOnUse" x1="0" y1="40" x2="1700" y2="40">
                  <stop offset="0%" stopColor="#B5480F" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#0F7A6C" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#1F6B3F" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <path
                d="M 20 40 C 240 10, 360 70, 560 40 C 760 10, 920 70, 1140 40 L 1650 40"
                stroke="url(#road-grad-journey)"
                strokeWidth="3"
                strokeDasharray="8 8"
                strokeLinecap="round"
              />
            </svg>

            {/* Traveling Parcel SVG */}
            <div
              ref={parcelRef}
              className="absolute left-16 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500 shadow-md flex items-center justify-center text-white border border-amber-300">
                <Package className="w-5 h-5" />
              </div>
            </div>

            {/* STOP 1: Your item */}
            <div className="relative z-10 flex flex-col items-center w-[220px] shrink-0">
              <div className="ck-stop-pin w-11 h-11 rounded-2xl bg-[#FBEDE3] dark:bg-[#2A150D] border-2 border-[#B5480F] flex items-center justify-center text-[#B5480F] shadow-md mb-3">
                <Package className="w-5 h-5" />
              </div>
              <div className="ck-stop-card w-full p-3.5 rounded-2xl bg-white dark:bg-[#1A1310] border border-stone-200/90 dark:border-stone-800 shadow-xs text-center">
                <span className="text-4xs font-extrabold uppercase tracking-widest text-[#B5480F] px-2 py-0.5 rounded-full bg-[#FBEDE3] dark:bg-[#2A150D] mb-1.5 inline-block">
                  Stop 01
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                  Your item
                </h3>
                <p className="text-3xs text-stone-600 dark:text-stone-300 font-medium leading-tight mt-1">
                  Books, clothes, or appliances you no longer use
                </p>
              </div>
            </div>

            {/* STOP 2: Verified person nearby */}
            <div className="relative z-10 flex flex-col items-center w-[220px] shrink-0">
              <div className="ck-stop-pin w-11 h-11 rounded-2xl bg-[#E3F2EF] dark:bg-[#0D2421] border-2 border-[#0F7A6C] flex items-center justify-center text-[#0F7A6C] shadow-md mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="ck-stop-card w-full p-3.5 rounded-2xl bg-white dark:bg-[#1A1310] border border-stone-200/90 dark:border-stone-800 shadow-xs text-center">
                <span className="text-4xs font-extrabold uppercase tracking-widest text-[#0F7A6C] px-2 py-0.5 rounded-full bg-[#E3F2EF] dark:bg-[#0D2421] mb-1.5 inline-block">
                  Stop 02
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                  Verified person nearby
                </h3>
                <p className="text-3xs text-stone-600 dark:text-stone-300 font-medium leading-tight mt-1">
                  Govt-ID & address checked before matching
                </p>
              </div>
            </div>

            {/* STOP 3: Handed over in person */}
            <div className="relative z-10 flex flex-col items-center w-[220px] shrink-0">
              {/* Warm Glow Burst on Handover */}
              <div className="ck-handover-glow absolute -top-4 w-20 h-20 rounded-full bg-amber-500/25 blur-xl pointer-events-none" />

              <div className="ck-stop-pin relative w-11 h-11 rounded-2xl bg-[#E5F1E9] dark:bg-[#0E2618] border-2 border-[#1F6B3F] flex items-center justify-center text-[#1F6B3F] shadow-md mb-3">
                <HandsMeetingIcon className="w-7 h-7" />
                {/* The Happy Face popping up */}
                <div className="ck-happy-recipient absolute -top-4 -right-4 opacity-0 scale-50 z-20">
                  <Smile className="w-7 h-7 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950" />
                </div>
              </div>
              <div className="ck-stop-card w-full p-3.5 rounded-2xl bg-white dark:bg-[#1A1310] border border-stone-200/90 dark:border-stone-800 shadow-xs text-center">
                <span className="text-4xs font-extrabold uppercase tracking-widest text-[#1F6B3F] px-2 py-0.5 rounded-full bg-[#E5F1E9] dark:bg-[#0E2618] mb-1.5 inline-block">
                  Stop 03
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                  Handed over in person
                </h3>
                <p className="text-3xs text-stone-600 dark:text-stone-300 font-medium leading-tight mt-1">
                  Direct handover within 10 km, no middlemen
                </p>
              </div>
            </div>

            {/* FINAL PANEL: Certificate on Left & 3 Points on Right */}
            <div className="relative z-10 flex items-center gap-8 pl-6 border-l-2 border-dashed border-stone-300/80 dark:border-stone-800 shrink-0">
              {/* Left: Certificate Sample */}
              <div className="shrink-0">
                <ImpactCertificateSample />
              </div>

              {/* Right: Three Points Stacked */}
              <div className="w-[320px] sm:w-[350px] flex flex-col gap-3">
                {threePoints.map((pt, i) => {
                  const IconComp = pt.icon;
                  return (
                    <div
                      key={i}
                      className="ck-benefit-point p-3.5 rounded-2xl bg-white/90 dark:bg-[#1A1310]/90 border border-stone-200/90 dark:border-stone-800 shadow-xs flex items-start gap-3 backdrop-blur-xs"
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#FBEDE3] dark:bg-[#2A150D] text-[#B5480F] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                          {pt.title}
                        </h4>
                        <p className="text-3xs sm:text-xs text-stone-600 dark:text-stone-300 font-medium leading-relaxed mt-0.5">
                          {pt.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* PHONE (< 768px): horizontal timeline + certificate flip card */}
        <SupportJourneyMobile stops={stops} points={threePoints} />

        {/* TABLET (768–1023px) Vertical Timeline & Stacked Layout */}
        <div className="hidden md:flex lg:hidden flex-col gap-6 px-5 sm:px-8 mt-4">
          {/* Vertical Timeline for the 4 Stops */}
          <div className="relative pl-6 border-l-2 border-dashed border-[#B5480F]/40 space-y-4 ml-2">
            {stops.map((st, i) => {
              const IconComp = st.icon;
              return (
                <div key={i} className="relative flex items-start gap-3">
                  <div
                    className="absolute -left-[35px] top-1 w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-xs"
                    style={{
                      backgroundColor: st.bgSoft,
                      borderColor: st.color,
                      color: st.color,
                    }}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs flex-1">
                    <span
                      className="text-4xs font-black uppercase px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: st.bgSoft, color: st.color }}
                    >
                      Stop {st.step}
                    </span>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 mt-1">
                      {st.title}
                    </h4>
                    <p className="text-3xs text-stone-600 dark:text-stone-300 font-medium mt-0.5">
                      {st.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Certificate Sample (Mobile Full Width) */}
          <div className="flex justify-center my-2">
            <ImpactCertificateSample />
          </div>

          {/* Three Points Stacked */}
          <div className="flex flex-col gap-2.5">
            {threePoints.map((pt, i) => {
              const IconComp = pt.icon;
              return (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs flex items-start gap-2.5"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#FBEDE3] dark:bg-[#2A150D] text-[#B5480F] flex items-center justify-center shrink-0 mt-0.5">
                    <IconComp className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {pt.title}
                    </h4>
                    <p className="text-3xs text-stone-600 dark:text-stone-300 font-medium mt-0.5 leading-snug">
                      {pt.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
