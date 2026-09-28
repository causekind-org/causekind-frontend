"use client";

import React, { useEffect, useRef, useState, useCallback, useId } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Gift,
  HeartHandshake,
  Building2,
  Heart,
  ArrowRight,
  BookOpen,
  Shirt,
  Wind,
  Armchair,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { HOME_ROLE_COLORS } from "@/lib/landingConstants";
import { useRevealOnce, stagger } from "@/components/home/mobile/primitives";
import FlipCard from "@/components/FlipCard";

/* ════════════════════════════════════════════════════════════════════════════════
   SVG INLINE ILLUSTRATIONS FOR MOBILE ECOSYSTEM
   ════════════════════════════════════════════════════════════════════════════════ */
function DonorSvg({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden>
      <circle cx="28" cy="16" r="8" fill="#E8C4A0" />
      <path d="M20 14c0-6 4-10 8-10s8 4 8 10c0 0-2-4-8-4s-8 4-8 4z" fill="#3D2B1F" />
      <path d="M16 32c0-6 5-10 12-10s12 4 12 10v8c0 2-1 3-3 3H19c-2 0-3-1-3-3v-8z" fill="#F4A25B" />
      <rect x="22" y="35" width="12" height="10" rx="2" fill="#B5480F" opacity="0.85" />
      <path d="M28 35v10M22 40h12" stroke="white" strokeWidth="1.5" />
      <path d="M25 18c1.5 1.5 4.5 1.5 6 0" stroke="#8B5E3C" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function DoneeSvg({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden>
      <circle cx="28" cy="16" r="8" fill="#D4A574" />
      <path d="M20 13c0-5 3.5-9 8-9s8 4 8 9c0 0-1-3-4-4h-8c-3 1-4 4-4 4z" fill="#1A1A2E" />
      <circle cx="28" cy="10.5" r="1" fill="#E53E3E" />
      <path d="M16 32c0-6 5-10 12-10s12 4 12 10v8c0 2-1 3-3 3H19c-2 0-3-1-3-3v-8z" fill="#7fb0e8" />
      <path d="M20 22c2 3 6 4 8 4" stroke="#1e3a60" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <ellipse cx="23" cy="42" rx="3" ry="2" fill="#D4A574" />
      <ellipse cx="33" cy="42" rx="3" ry="2" fill="#D4A574" />
      <path d="M25 18c1.5 1.5 4.5 1.5 6 0" stroke="#8B5E3C" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function NgoSvg({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden>
      <circle cx="28" cy="16" r="8" fill="#C9A882" />
      <path d="M20 14c0-6 3.5-10 8-10s8 4 8 10c-1-3-4-5-8-5s-7 2-8 5z" fill="#2D1B10" />
      <path d="M16 32c0-6 5-10 12-10s12 4 12 10v8c0 2-1 3-3 3H19c-2 0-3-1-3-3v-8z" fill="#6CC98F" />
      <path d="M24 22l4 3 4-3" stroke="#1F6B3F" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <rect x="24" y="32" width="8" height="11" rx="1.5" fill="white" opacity="0.9" />
      <line x1="26" y1="35" x2="30" y2="35" stroke="#1F6B3F" strokeWidth="1" />
      <line x1="26" y1="37.5" x2="30" y2="37.5" stroke="#1F6B3F" strokeWidth="1" />
      <line x1="26" y1="40" x2="29" y2="40" stroke="#1F6B3F" strokeWidth="1" />
      <path d="M25 18c1.5 1.5 4.5 1.5 6 0" stroke="#8B5E3C" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function BookIcon2({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect x="5" y="4" width="18" height="20" rx="2" fill="#B5480F" opacity="0.85" />
      <rect x="7" y="6" width="14" height="16" rx="1" fill="#FBEDE3" />
      <line x1="10" y1="10" x2="18" y2="10" stroke="#B5480F" strokeWidth="1.2" opacity="0.5" />
      <line x1="10" y1="13" x2="16" y2="13" stroke="#B5480F" strokeWidth="1.2" opacity="0.3" />
      <rect x="5" y="4" width="3" height="20" rx="1" fill="#8B3A0A" opacity="0.3" />
    </svg>
  );
}
function ShirtIcon2({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-hidden>
      <path d="M8 4l-5 4 3 3 2-2v13h10V9l2 2 3-3-5-4c-1 2-3 3-5 3s-4-1-5-3z" fill="#F4A25B" opacity="0.8" />
      <path d="M10 4c1 2 2.5 3 3 3s2-1 3-3" stroke="#B5480F" strokeWidth="0.8" fill="none" />
    </svg>
  );
}
function LaptopIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect x="5" y="6" width="18" height="12" rx="2" fill="#57534E" />
      <rect x="7" y="8" width="14" height="8" rx="1" fill="#A8E6CF" opacity="0.6" />
      <path d="M3 18h22l-1 3H4l-1-3z" fill="#78716C" />
    </svg>
  );
}
function BoxIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-hidden>
      <path d="M4 9l9-5 9 5v10l-9 5-9-5V9z" fill="#1F6B3F" opacity="0.75" />
      <path d="M4 9l9 5 9-5" stroke="#6CC98F" strokeWidth="1" fill="none" />
      <line x1="13" y1="14" x2="13" y2="24" stroke="#6CC98F" strokeWidth="1" />
      <path d="M4 9l9 5v10l-9-5V9z" fill="#1F6B3F" opacity="0.9" />
    </svg>
  );
}

function HoverFlipCard({ title, desc, icon: Icon }: { title: string, desc: string, icon: any }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      className="w-full h-full min-h-[160px] cursor-default"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
    >
      <FlipCard
        flipped={isHovered}
        axis="y"
        flipOnClick={false}
        width="100%"
        height="100%"
        background="transparent"
        shadow={false}
        front={
          <div className="w-full h-full flex flex-col items-start text-left bg-white dark:bg-[#1C1410] rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-sm transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-[#B5480F] flex items-center justify-center mb-4">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 mb-2">
              {title}
            </h3>
          </div>
        }
        back={
          <div className="w-full h-full flex flex-col items-start justify-center text-left bg-white dark:bg-[#1C1410] rounded-2xl p-5 sm:p-6 border border-stone-200 dark:border-stone-800 shadow-sm transition-shadow">
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-snug">
              {desc}
            </p>
          </div>
        }
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════════
   MOBILE ECOSYSTEM (Varun's branch)
   ════════════════════════════════════════════════════════════════════════════════ */
function MobileEcosystem() {
  const ref = useRevealOnce<HTMLDivElement>();

  return (
    <div ref={ref} className="lg:hidden select-none mt-8 w-full max-w-[360px] mx-auto">
      <div className="relative mx-auto" style={{ maxWidth: 360, aspectRatio: "1 / 1.15" }}>
        {/* Background network */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 360 414">
          <defs>
            <linearGradient id="m-eco-orange" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#B5480F" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#F4A25B" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="m-eco-teal" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a60" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#7fb0e8" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="m-eco-green" x1="50%" y1="100%" x2="50%" y2="0%">
              <stop offset="0%" stopColor="#1F6B3F" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#6cc98f" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Connection paths */}
          <path d="M 70 70 C 100 140, 140 170, 180 200" stroke="url(#m-eco-orange)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" opacity="0.6" data-reveal-item style={stagger(4)} />
          <path d="M 290 70 C 260 140, 220 170, 180 200" stroke="url(#m-eco-teal)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" opacity="0.6" data-reveal-item style={stagger(4)} />
          <path d="M 180 340 L 180 200" stroke="url(#m-eco-green)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" opacity="0.6" data-reveal-item style={stagger(4)} />

          {/* Subtle flowing particles */}
          <circle r="2.5" fill="#B5480F" opacity="0.5">
            <animateMotion path="M 70 70 C 100 140, 140 170, 180 200" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle r="2.5" fill="#1e3a60" opacity="0.5">
            <animateMotion path="M 290 70 C 260 140, 220 170, 180 200" dur="3.2s" repeatCount="indefinite" />
          </circle>
          <circle r="2" fill="#1F6B3F" opacity="0.5">
            <animateMotion path="M 180 340 L 180 200" dur="2.8s" repeatCount="indefinite" />
          </circle>
        </svg>

        {/* Floating objects */}
        <div data-reveal-item style={stagger(1)} className="absolute" aria-hidden>
          <div className="absolute" style={{ left: "15%", top: "35%" }}>
            <BookIcon2 size={22} />
          </div>
          <div className="absolute" style={{ right: "12%", top: "42%" }}>
            <ShirtIcon2 size={20} />
          </div>
          <div className="absolute" style={{ left: "25%", bottom: "22%" }}>
            <LaptopIcon size={22} />
          </div>
          <div className="absolute" style={{ right: "25%", bottom: "20%" }}>
            <BoxIcon size={20} />
          </div>
        </div>

        {/* Micro labels */}
        <span data-reveal-item style={{ ...stagger(5), position: "absolute", left: "8%", top: "48%", fontSize: "0.4375rem", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "rgba(120,113,108,0.45)" }}>GIVE</span>
        <span data-reveal-item style={{ ...stagger(5), position: "absolute", right: "8%", top: "50%", fontSize: "0.4375rem", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "rgba(120,113,108,0.45)" }}>VERIFY</span>
        <span data-reveal-item style={{ ...stagger(5), position: "absolute", left: "42%", top: "70%", fontSize: "0.4375rem", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "rgba(120,113,108,0.45)" }}>MATCH</span>

        {/* Donor */}
        <div data-reveal-item style={stagger(2)} className="absolute flex flex-col items-center" aria-hidden>
          <div className="absolute flex flex-col items-center" style={{ left: "8%", top: "4%" }}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FBEDE3, #F9DCC4)", boxShadow: "0 3px 12px -3px rgba(181,72,15,0.2)" }}>
              <DonorSvg size={38} />
            </div>
            <span className="mt-1 text-[9px] font-extrabold uppercase tracking-widest text-[#B5480F]">Donor</span>
          </div>
        </div>

        {/* Donee */}
        <div data-reveal-item style={stagger(2)} className="absolute flex flex-col items-center" aria-hidden>
          <div className="absolute flex flex-col items-center" style={{ right: "8%", top: "4%" }}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #E3F2EF, #C5E8E0)", boxShadow: "0 3px 12px -3px rgba(30,58,96,0.2)" }}>
              <DoneeSvg size={38} />
            </div>
            <span className="mt-1 text-[9px] font-extrabold uppercase tracking-widest text-[#1e3a60]">Donee</span>
          </div>
        </div>

        {/* Hub */}
        <div data-reveal-item="scale" style={stagger(3)} className="absolute flex flex-col items-center" aria-hidden>
          <div className="absolute flex flex-col items-center" style={{ left: "50%", top: "44%", transform: "translateX(-50%)" }}>
            <div className="relative w-14 h-14 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(135deg, #B5480F 0%, #D4690A 100%)", boxShadow: "0 0 0 3px rgba(181,72,15,0.12), 0 6px 24px -6px rgba(181,72,15,0.35)" }} />
              <Heart className="relative z-10" style={{ width: 24, height: 24 }} fill="white" strokeWidth={0} />
            </div>
            <span className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-[var(--ck-role-accent,#B5480F)]">CauseKind</span>
          </div>
        </div>

        {/* NGO */}
        <div data-reveal-item style={stagger(2)} className="absolute flex flex-col items-center" aria-hidden>
          <div className="absolute flex flex-col items-center" style={{ left: "50%", bottom: "4%", transform: "translateX(-50%)" }}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #E5F1E9, #C4E0CD)", boxShadow: "0 3px 12px -3px rgba(31,107,63,0.2)" }}>
              <NgoSvg size={38} />
            </div>
            <span className="mt-1 text-[9px] font-extrabold uppercase tracking-widest text-[#1F6B3F]">NGO</span>
          </div>
        </div>
      </div>
    </div>
  );
}

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Custom Teddy Bear SVG Icon matching causekind item icons
function TeddyBearIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="6.5" r="2.5" />
      <circle cx="12" cy="10" r="5" />
      <circle cx="10.2" cy="9.5" r="0.7" fill="currentColor" />
      <circle cx="13.8" cy="9.5" r="0.7" fill="currentColor" />
      <ellipse cx="12" cy="11.5" rx="1.5" ry="1.1" />
      <path d="M8.5 15c-1.2 1.8-1.2 4-0.5 5.5h8c0.7-1.5 0.7-3.7-0.5-5.5" />
      <ellipse cx="12" cy="17.5" rx="2.2" ry="1.8" />
    </svg>
  );
}

// Interactive floating icon item definition for hover bursts on living words
interface PopItem {
  id: number;
  icon: React.ComponentType<{ className?: string }>;
  x: number;
  y: number;
  rotate: number;
  color: string;
}

// Orbit Planet configuration
interface PlanetData {
  id: "donor" | "donee" | "ngo";
  name: string;
  roleDescription: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  darkColor: string;
  bgSoft: string;
  bgSoftDark: string;
  borderColor: string;
  glowColor: string;
  radiusX: number;
  radiusY: number;
  tiltDeg: number;
  speedSec: number;
  initialAngle: number; // in radians
}

export function WhoAreWeSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const giantLabelFillRef = useRef<HTMLDivElement>(null);
  const orbitContainerRef = useRef<HTMLDivElement>(null);
  const orbitStageRef = useRef<HTMLDivElement>(null);
  const heartSunRef = useRef<HTMLDivElement>(null);

  const reduceMotion = useReducedMotion();
  const textPathId = useId();

  const [isInView, setIsInView] = useState(false);
  const [activeHoverPlanet, setActiveHoverPlanet] = useState<string | null>(null);
  const [extraThingsPops, setExtraThingsPops] = useState<PopItem[]>([]);
  const [needThemPops, setNeedThemPops] = useState<PopItem[]>([]);

  // 3D Mouse Parallax state
  const [mouseTilt, setMouseTilt] = useState({ x: 0, y: 0 });

  // Orbit planet refs & elements for 60fps RAF transforms (no React re-renders)
  const planetRefs = useRef<Record<string, HTMLDivElement | null>>({
    donor: null,
    donee: null,
    ngo: null,
  });

  const flowCanvasRef = useRef<HTMLCanvasElement>(null);

  // Orbit parameters reading directly from centralised HOME_ROLE_COLORS
  const planetsConfig: PlanetData[] = [
    {
      id: "donor",
      name: "Donors",
      roleDescription: "Donors — give items they no longer need",
      shortDesc: "give items they no longer need",
      icon: Gift,
      color: HOME_ROLE_COLORS.donor.main,
      darkColor: HOME_ROLE_COLORS.donor.darkAccent,
      bgSoft: HOME_ROLE_COLORS.donor.softBg,
      bgSoftDark: HOME_ROLE_COLORS.donor.softBgDark,
      borderColor: HOME_ROLE_COLORS.donor.main,
      glowColor: HOME_ROLE_COLORS.donor.glow,
      radiusX: 180,
      radiusY: 105,
      tiltDeg: 12,
      speedSec: 18,
      initialAngle: 0,
    },
    {
      id: "donee",
      name: "Donees",
      roleDescription: "Donees — ask for what they genuinely need",
      shortDesc: "ask for what they genuinely need",
      icon: HeartHandshake,
      color: HOME_ROLE_COLORS.donee.main,
      darkColor: HOME_ROLE_COLORS.donee.darkAccent, // #7FB0E8 for dark mode visibility
      bgSoft: HOME_ROLE_COLORS.donee.softBg,
      bgSoftDark: HOME_ROLE_COLORS.donee.softBgDark,
      borderColor: HOME_ROLE_COLORS.donee.main,
      glowColor: HOME_ROLE_COLORS.donee.glow,
      radiusX: 235,
      radiusY: 135,
      tiltDeg: -22,
      speedSec: 24,
      initialAngle: (2 * Math.PI) / 3,
    },
    {
      id: "ngo",
      name: "NGOs",
      roleDescription: "NGOs — request items for the people they serve",
      shortDesc: "request items for the people they serve",
      icon: Building2,
      color: HOME_ROLE_COLORS.ngo.main,
      darkColor: HOME_ROLE_COLORS.ngo.darkAccent,
      bgSoft: HOME_ROLE_COLORS.ngo.softBg,
      bgSoftDark: HOME_ROLE_COLORS.ngo.softBgDark,
      borderColor: HOME_ROLE_COLORS.ngo.main,
      glowColor: HOME_ROLE_COLORS.ngo.glow,
      radiusX: 285,
      radiusY: 160,
      tiltDeg: 35,
      speedSec: 30,
      initialAngle: (4 * Math.PI) / 3,
    },
  ];

  // 1. Living Words Hover Bursts ("extra things" with book, shirt, fan, teddy bear, chair)
  const triggerExtraThingsBurst = useCallback(() => {
    const burstIcons = [BookOpen, Shirt, Wind, TeddyBearIcon, Armchair];
    const colors = [
      HOME_ROLE_COLORS.donor.main,
      HOME_ROLE_COLORS.donee.main,
      HOME_ROLE_COLORS.ngo.main,
      "#D95D24",
      HOME_ROLE_COLORS.donee.darkAccent,
    ];
    const newPops: PopItem[] = Array.from({ length: 5 }).map((_, i) => ({
      id: Date.now() + i,
      icon: burstIcons[i % burstIcons.length],
      x: (i - 2) * 26 + (Math.random() * 12 - 6),
      y: -20 - Math.random() * 25,
      rotate: (Math.random() - 0.5) * 40,
      color: colors[i % colors.length],
    }));
    setExtraThingsPops(newPops);
    setTimeout(() => {
      setExtraThingsPops([]);
    }, 900);
  }, []);

  // 2. Living Words Hover Bursts ("need them" with 3 bouncing map pins)
  const triggerNeedThemBurst = useCallback(() => {
    const newPops: PopItem[] = Array.from({ length: 3 }).map((_, i) => ({
      id: Date.now() + i,
      icon: MapPin,
      x: (i - 1) * 28 + (Math.random() * 8 - 4),
      y: -24 - Math.random() * 20,
      rotate: (i - 1) * 15,
      color: HOME_ROLE_COLORS.donor.main,
    }));
    setNeedThemPops(newPops);
    setTimeout(() => {
      setNeedThemPops([]);
    }, 900);
  }, []);

  // 3. Mouse Parallax for Orbit Container
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (typeof window === "undefined" || window.matchMedia("(pointer: coarse)").matches) return;
    if (!orbitContainerRef.current) return;
    const rect = orbitContainerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseTilt({
      x: y * -10, // tilt X (max ~8-10deg)
      y: x * 10,  // tilt Y
    });
  }, []);

  const handleMouseLeave = () => {
    setMouseTilt({ x: 0, y: 0 });
  };

  // Unused GSAP and RAF hooks removed

  return (
    <section
      ref={sectionRef}
      id="about-causekind"
      aria-label="About CauseKind"
      className="relative w-full min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-center py-8 sm:py-12 lg:py-10 bg-[#F8F6F2] dark:bg-[#0E0C0A] text-[#1C1410] dark:text-[#F5EEE8] overflow-hidden transition-colors duration-300"
    >
      {/* Decorative ambient background subtle radial glows */}
      <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle,_rgba(181,72,15,0.18)_0%,_transparent_70%)] blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[550px] h-[550px] bg-[radial-gradient(circle,_rgba(127,176,232,0.18)_0%,_transparent_70%)] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl w-full px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full">
          {/* LEFT COLUMN: Text Content */}
          <div className="flex flex-col items-start text-left w-full">
            {/* =========================================================================
                1. LABEL: "ABOUT CAUSEKIND"
            ========================================================================= */}
            <div className="relative w-full select-none py-1 flex items-center justify-start gap-3 mb-6">
              <span className="w-10 sm:w-12 h-[3px] bg-[var(--ck-role-accent,#B5480F)] rounded-full" />
              <h2 className="text-xl sm:text-2xl font-extrabold uppercase tracking-[0.2em] text-[var(--ck-role-accent,#B5480F)] dark:text-[var(--ck-role-accent,#F4A25B)]">
                About CauseKind
              </h2>
            </div>

            {/* Heading with Living Words & Marker Underlines */}
            <h2 className="text-2xl sm:text-3xl lg:text-[clamp(1.75rem,2.2vw+0.2rem,2.6rem)] font-extrabold tracking-tight leading-[1.3] text-stone-900 dark:text-stone-100 max-w-3xl">
              <span>We connect people who have </span>
              {/* Interactive Living Word: "extra things" */}
              <span
                onMouseEnter={triggerExtraThingsBurst}
                onFocus={triggerExtraThingsBurst}
                tabIndex={0}
                className="relative inline-block text-[var(--ck-role-accent,#B5480F)] dark:text-[var(--ck-role-accent,#F4A25B)] font-extrabold cursor-pointer group/living select-none outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-[var(--ck-role-ring,#B5480F)]"
              >
                extra things
                {/* Underline */}
                <span className="absolute left-0 bottom-0.5 w-full h-[3px] sm:h-1 bg-[var(--ck-role-accent,#B5480F)]/40 dark:bg-[var(--ck-role-accent,#F4A25B)]/50 rounded-full group-hover/living:bg-[var(--ck-role-accent,#B5480F)] transition-colors" />
                {/* Pop-up item particles */}
                <AnimatePresence>
                  {extraThingsPops.map((pop) => {
                    const IconComp = pop.icon;
                    return (
                      <motion.span
                        key={pop.id}
                        className="absolute pointer-events-none z-30"
                        initial={{ opacity: 1, scale: 0.4, x: 0, y: 0, rotate: 0 }}
                        animate={{
                          opacity: 0,
                          scale: 1.15,
                          x: pop.x,
                          y: pop.y,
                          rotate: pop.rotate,
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.75, ease: "easeOut" }}
                      >
                        <span
                          className="w-6 h-6 rounded-lg p-1 shadow-sm flex items-center justify-center text-white"
                          style={{ backgroundColor: pop.color }}
                        >
                          <IconComp className="w-4 h-4" />
                        </span>
                      </motion.span>
                    );
                  })}
                </AnimatePresence>
              </span>
              <span> with people nearby who </span>
              {/* Interactive Living Word: "need them" */}
              <span
                onMouseEnter={triggerNeedThemBurst}
                onFocus={triggerNeedThemBurst}
                tabIndex={0}
                className="relative inline-block text-[var(--ck-role-accent,#B5480F)] dark:text-[var(--ck-role-accent,#F4A25B)] font-extrabold cursor-pointer group/need select-none outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-[var(--ck-role-ring,#B5480F)]"
              >
                need them.
                {/* Underline */}
                <span className="absolute left-0 bottom-0.5 w-full h-[3px] sm:h-1 bg-[var(--ck-role-accent,#B5480F)]/40 dark:bg-[var(--ck-role-accent,#F4A25B)]/50 rounded-full group-hover/need:bg-[var(--ck-role-accent,#B5480F)] transition-colors" />
                {/* Pop-up map pin particles */}
                <AnimatePresence>
                  {needThemPops.map((pop) => (
                    <motion.span
                      key={pop.id}
                      className="absolute pointer-events-none z-30"
                      initial={{ opacity: 1, scale: 0.5, x: 0, y: 0, rotate: 0 }}
                      animate={{
                        opacity: 0,
                        scale: 1.2,
                        x: pop.x,
                        y: pop.y,
                        rotate: pop.rotate,
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.7, ease: "backOut" }}
                    >
                      <span className="w-6 h-6 rounded-full bg-[var(--ck-role-accent,#B5480F)] shadow-sm flex items-center justify-center text-white">
                        <MapPin className="w-3.5 h-3.5" />
                      </span>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </span>
            </h2>

            {/* Paragraph Text (Exact unaltered wording) */}
            <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 font-normal sm:font-medium leading-relaxed mt-6 max-w-2xl">
              CauseKind is a free platform in India where donors give useful items — books, clothes,
              furniture, electronics and more — directly to verified people and NGOs near them. No cash.
              No middlemen. Just real things reaching real people.
            </p>

            {/* ── "Know More" Button ── */}
            <div className="mt-8 sm:mt-10 flex justify-start w-full">
              {/* Primary Action Button */}
              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 rounded-full bg-[var(--ck-role-accent,#B5480F)] hover:bg-[var(--ck-role-hover,#C95413)] text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md hover:shadow-lg transition-all duration-200 group active:scale-95"
              >
                <span>Know more</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: 2x2 Grid of Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full mt-10 lg:mt-0">
            {/* Card 1 */}
            <HoverFlipCard
              title="Direct Giving"
              desc="Donors give items directly to people or NGOs nearby — no warehouses, no delays."
              icon={Gift}
            />

            {/* Card 2 */}
            <HoverFlipCard
              title="Verified & Safe"
              desc="Every request is admin-reviewed, and every handover is confirmed with a one-time code."
              icon={ShieldCheck}
            />

            {/* Card 3 */}
            <HoverFlipCard
              title="Zero Cash, No Middlemen"
              desc="Only in-kind items change hands — books, clothes, furniture, electronics, and more."
              icon={HeartHandshake}
            />

            {/* Card 4 */}
            <HoverFlipCard
              title="Local Matching"
              desc="Donors and recipients are matched within 10km, so help reaches people nearby, fast."
              icon={MapPin}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
