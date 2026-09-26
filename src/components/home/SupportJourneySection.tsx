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
  Heart,
  FileCheck,
  User,
  Calendar,
  Smile,
} from "lucide-react";
import { ENABLE_SUPPORT_JOURNEY_ANIMATION, HOME_ROLE_COLORS } from "@/lib/landingConstants";

// Illustrated Handover Icons (2 hands meeting prominently with warm orange tone)
function HandsMeetingIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <path
        d="M6 34L20 26C23 24.5 27 25.5 28.5 28.5L32 35C33.5 38 32.5 41.5 29.5 43L18 48"
        stroke="#B5480F"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M58 34L44 26C41 24.5 37 25.5 35.5 28.5L32 35C30.5 38 31.5 41.5 34.5 43L46 48"
        stroke="#D95D24"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="34" r="6" fill="#B5480F" fillOpacity="0.25" stroke="#B5480F" strokeWidth="2.5" />
      <path
        d="M27 18L32 13L37 18"
        stroke="#F4A25B"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) return;
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
      className="ck-cert-card relative w-full max-w-[340px] sm:max-w-[360px] lg:max-w-[370px] rounded-2xl bg-[#FCFAF6] dark:bg-[#1A130E] border-2 border-[#B5480F]/40 dark:border-[#B5480F]/60 shadow-xl p-4 sm:p-5 select-none transition-transform duration-150 ease-out will-change-transform"
      style={{
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      }}
    >
      {/* Moving Specular Shine Overlay */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-40 dark:opacity-25 transition-opacity"
        style={{
          background: `radial-gradient(circle at ${shinePos.x}% ${shinePos.y}%, rgba(255,255,255,0.85) 0%, transparent 60%)`,
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
            <Package className="w-3 h-3 text-[#B5480F]" /> Item
          </span>
          <span className="font-bold text-stone-900 dark:text-stone-100 truncate max-w-[180px]">
            School textbooks (set of 5)
          </span>
        </div>

        <div className="flex items-center justify-between bg-stone-100/70 dark:bg-stone-900/60 p-1.5 rounded-lg">
          <span className="text-stone-400 font-semibold flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#B5480F]" /> Handed to
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

      {/* "HANDOVER VERIFIED" Rubber Stamp (positioned in lower corner over watermark, leaving footer readable) */}
      <div className="ck-cert-stamp absolute right-2.5 sm:right-3.5 bottom-3.5 sm:bottom-4.5 z-30 pointer-events-none">
        <div className="px-2.5 py-1 rounded-md border-2 border-[#B5480F] text-[#B5480F] bg-[#FBEDE3]/95 dark:bg-[#2A150D]/95 font-black uppercase text-3xs sm:text-2xs tracking-wider shadow-md transform -rotate-12 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#B5480F]" />
          <span>HANDOVER VERIFIED</span>
        </div>
      </div>

      {/* Dust Particles Burst upon Stamp Landing */}
      <div className="ck-stamp-dust-container absolute right-8 bottom-8 pointer-events-none z-40">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <span
            key={i}
            className="ck-stamp-dust-particle absolute w-1.5 h-1.5 rounded-full bg-[#B5480F] opacity-0"
          />
        ))}
      </div>
    </div>
  );
}

export function SupportJourneySection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinTargetRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const parcelRef = useRef<HTMLDivElement>(null);
  const roadPathRef = useRef<SVGPathElement>(null);

  const [isClient, setIsClient] = useState(false);
  const isInView = useInView(containerRef, { once: true, amount: 0.1 });

  const labelText = "WHERE YOUR SUPPORT GOES";

  const stops = [
    {
      step: "01",
      title: "Your item",
      desc: "Books, clothes, or appliances you no longer use",
      icon: Package,
      color: HOME_ROLE_COLORS.donor.main,
      bgSoft: HOME_ROLE_COLORS.donor.softBg,
    },
    {
      step: "02",
      title: "Verified person nearby",
      desc: "Govt-ID & address checked before matching",
      icon: ShieldCheck,
      color: HOME_ROLE_COLORS.donee.main,
      bgSoft: HOME_ROLE_COLORS.donee.softBg,
    },
    {
      step: "03",
      title: "Handed over in person",
      desc: "Direct handover within 10 km, no middlemen",
      icon: HeartHandshake,
      color: HOME_ROLE_COLORS.ngo.main,
      bgSoft: HOME_ROLE_COLORS.ngo.softBg,
    },
    {
      step: "04",
      title: "Impact certificate",
      desc: "Instant digital proof of your direct contribution",
      icon: Award,
      color: HOME_ROLE_COLORS.donor.main,
      bgSoft: HOME_ROLE_COLORS.donor.softBg,
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

    gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mm = gsap.matchMedia();

    if (prefersReducedMotion || !ENABLE_SUPPORT_JOURNEY_ANIMATION) {
      // Static mode: ensure all elements are visible in their natural state
      mm.add("(min-width: 1024px)", () => {
        gsap.set(
          [
            ".ck-stop-pin",
            ".ck-stop-card",
            ".ck-cert-card",
            ".ck-cert-stamp",
            ".ck-benefit-point",
            ".ck-journey-parcel",
          ],
          {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            rotate: 0,
            rotateX: 0,
            rotateY: 0,
            clearProps: "all",
          }
        );
        if (roadPathRef.current) {
          gsap.set(roadPathRef.current, { strokeDashoffset: 0 });
        }
      });
      return () => mm.revert();
    }

    mm.add("(min-width: 1024px)", () => {
      const track = trackRef.current;
      const pinTarget = pinTargetRef.current;
      const pathEl = roadPathRef.current;
      const parcelEl = parcelRef.current;
      const certCard = document.querySelector<HTMLElement>(".ck-cert-card");
      const certStamp = document.querySelector<HTMLElement>(".ck-cert-stamp");
      const glowBurst = document.querySelector<HTMLElement>(".ck-handover-glow");
      const happyFace = document.querySelector<HTMLElement>(".ck-happy-recipient");
      const dustParticles = gsap.utils.toArray<HTMLElement>(".ck-stamp-dust-particle");
      const stopCards = gsap.utils.toArray<HTMLElement>(".ck-stop-card");
      const stopPins = gsap.utils.toArray<HTMLElement>(".ck-stop-pin");
      const benefitPoints = gsap.utils.toArray<HTMLElement>(".ck-benefit-point");

      if (!track || !pinTarget || !pathEl || !parcelEl) return;

      const pathLength = pathEl.getTotalLength();
      gsap.set(pathEl, {
        strokeDasharray: pathLength,
        strokeDashoffset: pathLength,
      });

      // Initial state of interactive elements
      gsap.set(parcelEl, { opacity: 1, scale: 1 });
      gsap.set(stopPins, { y: -30, opacity: 0, scale: 0.6 });
      gsap.set(stopCards, { y: 15, opacity: 0, scale: 0.9 });
      if (glowBurst) gsap.set(glowBurst, { scale: 0, opacity: 0 });
      if (happyFace) gsap.set(happyFace, { scale: 0, opacity: 0, y: 10 });
      if (certCard) gsap.set(certCard, { rotateX: 35, rotateY: -12, scale: 0.88, opacity: 0 });
      if (certStamp) gsap.set(certStamp, { scale: 2.8, opacity: 0, rotate: -28 });
      gsap.set(benefitPoints, { opacity: 0, x: 25 });

      // Master Scroll-pinned scrub timeline
      const totalScroll = () => Math.max(window.innerHeight * 1.8, track.scrollWidth - window.innerWidth + 120);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinTarget,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          start: "top top",
          end: () => `+=${totalScroll()}`,
          invalidateOnRefresh: true,
          onLeave: () => {
            // Clean residual GPU compositing transforms for crisp text
            if (certCard) certCard.style.willChange = "auto";
          },
        },
      });

      // 1. Translate horizontal track across the view
      tl.to(
        track,
        {
          x: () => -(track.scrollWidth - window.innerWidth + 80),
          ease: "none",
          duration: 4.0,
        },
        0
      );

      // 2. Draw the dashed orange road progressively
      tl.to(
        pathEl,
        {
          strokeDashoffset: 0,
          ease: "none",
          duration: 2.4,
        },
        0
      );

      // 3. Move Parcel along the actual SVG curve via MotionPathPlugin
      tl.to(
        parcelEl,
        {
          motionPath: {
            path: pathEl,
            align: pathEl,
            alignOrigin: [0.5, 0.5],
            autoRotate: false,
          },
          ease: "none",
          duration: 2.4,
        },
        0
      );

      // 4. Stops reveal in sync with parcel progression
      // Stop 1: ~progress 0.1 (t = 0.2s)
      if (stopPins[0]) {
        tl.to(stopPins[0], { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, 0.15);
      }
      if (stopCards[0]) {
        tl.to(stopCards[0], { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: "power2.out" }, 0.2);
      }

      // Stop 2: ~progress 0.45 (t = 1.0s)
      if (stopPins[1]) {
        tl.to(stopPins[1], { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, 0.9);
      }
      if (stopCards[1]) {
        tl.to(stopCards[1], { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: "power2.out" }, 0.95);
      }

      // Stop 3 (Handover): ~progress 0.75 (t = 1.7s)
      if (stopPins[2]) {
        tl.to(stopPins[2], { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, 1.6);
      }
      if (stopCards[2]) {
        tl.to(stopCards[2], { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: "power2.out" }, 1.65);
      }
      if (glowBurst) {
        tl.to(glowBurst, { scale: 1.5, opacity: 0.85, duration: 0.3, ease: "sine.out" }, 1.65);
        tl.to(glowBurst, { scale: 0.8, opacity: 0, duration: 0.3, ease: "sine.in" }, 1.95);
      }
      if (happyFace) {
        tl.to(happyFace, { scale: 1.2, opacity: 1, y: 0, rotate: 12, duration: 0.35, ease: "back.out(2)" }, 1.75);
      }

      // 5. Parcel arrives at certificate entrance (t = 2.4s) & disappears cleanly (never overlaps certificate)
      tl.to(
        parcelEl,
        {
          scale: 0.4,
          opacity: 0,
          duration: 0.25,
          ease: "power2.in",
        },
        2.35
      );

      // 6. Certificate flies in and rotates upright in 3D (t = 2.45s)
      if (certCard) {
        tl.to(
          certCard,
          {
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            opacity: 1,
            duration: 0.5,
            ease: "power2.out",
          },
          2.45
        );
      }

      // 7. Stamp Slams down onto certificate with dust burst + subtle card-only shake (t = 2.95s)
      if (certStamp) {
        tl.to(
          certStamp,
          {
            scale: 1,
            opacity: 1,
            rotate: -12,
            duration: 0.35,
            ease: "back.out(2.4)",
          },
          2.95
        );

        // Certificate subtle shake
        if (certCard) {
          tl.to(certCard, { x: 3, yoyo: true, repeat: 4, duration: 0.04, ease: "linear" }, 3.1);
          tl.to(certCard, { x: 0, duration: 0.02 }, 3.26);
        }

        // Dust particle explosion
        if (dustParticles.length > 0) {
          tl.fromTo(
            dustParticles,
            { scale: 0, opacity: 1, x: 0, y: 0 },
            {
              scale: (i) => 0.5 + ((i * 3) % 4) * 0.2,
              opacity: 0,
              x: (i) => Math.cos((i / 8) * Math.PI * 2) * (20 + (i % 3) * 8),
              y: (i) => Math.sin((i / 8) * Math.PI * 2) * (20 + (i % 3) * 8),
              duration: 0.35,
              ease: "power2.out",
            },
            3.05
          );
        }
      }

      // 8. Three Points Fade Up Sequentially (t = 3.3s to 3.8s)
      benefitPoints.forEach((pt, i) => {
        tl.to(
          pt,
          {
            opacity: 1,
            x: 0,
            duration: 0.35,
            ease: "power2.out",
          },
          3.25 + i * 0.2
        );
      });
    }, containerRef);

    // Refresh triggers after fonts and layout settle
    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 400);

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
        className="relative w-full min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-between py-6 sm:py-8 lg:py-5 overflow-hidden border-b border-stone-200/80 dark:border-stone-850/70"
      >
        {/* Decorative background ambient radial glow */}
        <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-15">
          <div className="absolute top-1/2 left-1/3 w-[650px] h-[450px] bg-[radial-gradient(circle,_rgba(181,72,15,0.18)_0%,_transparent_70%)] blur-3xl" />
        </div>

        {/* Top Fixed Header */}
        <div className="relative mx-auto max-w-6xl px-5 sm:px-8 w-full text-center shrink-0">
          <div className="flex items-center justify-center gap-2 mb-1.5">
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

          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-medium max-w-xl mx-auto mt-1 leading-relaxed">
            No warehouses. No middlemen. No cash handling. What you give reaches the exact person or NGO who requested it.
          </p>
        </div>

        {/* DESKTOP (≥1024px) Horizontal Moving Journey Track */}
        <div className="hidden lg:block relative w-full overflow-hidden my-auto py-2">
          <div
            ref={trackRef}
            className="flex items-center gap-12 sm:gap-14 pl-12 pr-24 w-max relative"
          >
            {/* SVG Dashed ORANGE Road (Only connects stops and ENDS at certificate left boundary) */}
            <svg
              className="absolute left-0 top-1/2 -translate-y-1/2 h-[120px] w-[950px] pointer-events-none z-0"
              viewBox="0 0 950 120"
              fill="none"
            >
              <defs>
                <linearGradient
                  id="road-grad-journey-orange"
                  gradientUnits="userSpaceOnUse"
                  x1="60"
                  y1="60"
                  x2="930"
                  y2="60"
                >
                  <stop offset="0%" stopColor="#B5480F" />
                  <stop offset="50%" stopColor="#D95D24" />
                  <stop offset="100%" stopColor="#F4A25B" />
                </linearGradient>
              </defs>
              <path
                ref={roadPathRef}
                id="support-journey-path"
                d="M 60 60 C 180 20, 240 100, 360 60 C 480 20, 540 100, 660 60 L 920 60"
                stroke="url(#road-grad-journey-orange)"
                strokeWidth="3.5"
                strokeDasharray="6 6"
                strokeLinecap="round"
              />
            </svg>

            {/* Traveling Parcel SVG Follower */}
            <div
              ref={parcelRef}
              className="ck-journey-parcel absolute left-0 top-0 z-20 pointer-events-none"
              style={{ transform: "translate(-50%, -50%)" }}
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500 shadow-lg flex items-center justify-center text-white border-2 border-amber-300">
                <Package className="w-5 h-5" />
              </div>
            </div>

            {/* STOP 1: Your item */}
            <div className="relative z-10 flex flex-col items-center w-[230px] shrink-0">
              <div className="ck-stop-pin w-11 h-11 rounded-2xl bg-[#FBEDE3] dark:bg-[#2A150D] border-2 border-[#B5480F] flex items-center justify-center text-[#B5480F] shadow-md mb-3">
                <Package className="w-5 h-5" />
              </div>
              <div className="ck-stop-card w-full h-[116px] p-3.5 rounded-2xl bg-white dark:bg-[#1A1310] border border-stone-200/90 dark:border-stone-800 shadow-xs flex flex-col justify-center text-center">
                <span className="text-4xs font-extrabold uppercase tracking-widest text-[#B5480F] px-2 py-0.5 rounded-full bg-[#FBEDE3] dark:bg-[#2A150D] mb-1.5 self-center inline-block">
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
            <div className="relative z-10 flex flex-col items-center w-[230px] shrink-0">
              <div className="ck-stop-pin w-11 h-11 rounded-2xl bg-[#EBF2FA] dark:bg-[#0E1B2A] border-2 border-[#1E3A60] dark:border-[#7FB0E8] flex items-center justify-center text-[#1E3A60] dark:text-[#7FB0E8] shadow-md mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="ck-stop-card w-full h-[116px] p-3.5 rounded-2xl bg-white dark:bg-[#1A1310] border border-stone-200/90 dark:border-stone-800 shadow-xs flex flex-col justify-center text-center">
                <span className="text-4xs font-extrabold uppercase tracking-widest text-[#1E3A60] dark:text-[#7FB0E8] px-2 py-0.5 rounded-full bg-[#EBF2FA] dark:bg-[#0E1B2A] mb-1.5 self-center inline-block">
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
            <div className="relative z-10 flex flex-col items-center w-[230px] shrink-0">
              {/* Soft Warm Orange Glow Burst on Handover */}
              <div className="ck-handover-glow absolute -top-4 w-24 h-24 rounded-full bg-[#B5480F]/30 blur-xl pointer-events-none" />

              <div className="ck-stop-pin relative w-12 h-12 rounded-2xl bg-[#FBEDE3] dark:bg-[#2A150D] border-2 border-[#B5480F] flex items-center justify-center text-[#B5480F] shadow-md mb-3">
                <HandsMeetingIcon className="w-8 h-8" />
                {/* Happy Face Pop-up */}
                <div className="ck-happy-recipient absolute -top-3.5 -right-3.5 opacity-0 scale-50 z-20">
                  <Smile className="w-7 h-7 text-[#B5480F] dark:text-[#F4A25B] fill-[#FBEDE3] dark:fill-[#2A150D]" />
                </div>
              </div>
              <div className="ck-stop-card w-full h-[116px] p-3.5 rounded-2xl bg-white dark:bg-[#1A1310] border border-stone-200/90 dark:border-stone-800 shadow-xs flex flex-col justify-center text-center">
                <span className="text-4xs font-extrabold uppercase tracking-widest text-[#B5480F] px-2 py-0.5 rounded-full bg-[#FBEDE3] dark:bg-[#2A150D] mb-1.5 self-center inline-block">
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

            {/* FINAL PANEL: Certificate on Left & 3 Points on Right (NO road extends past here) */}
            <div className="relative z-10 flex items-center gap-8 pl-6 border-l-2 border-dashed border-stone-300/80 dark:border-stone-800 shrink-0">
              {/* Left: Certificate Sample with 3D Tilt & Slam Stamp */}
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
                      className="ck-benefit-point p-3.5 rounded-2xl bg-white/95 dark:bg-[#1A1310]/95 border border-stone-200/90 dark:border-stone-800 shadow-xs flex items-start gap-3 backdrop-blur-xs"
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

        {/* MOBILE & TABLET (<1024px) Vertical Timeline & Stacked Layout */}
        <div className="lg:hidden flex flex-col gap-6 px-5 sm:px-8 mt-4">
          {/* Vertical Timeline for the 4 Stops with Orange Dashed Line */}
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
