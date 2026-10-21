"use client";
import { LandingText, LandingAttributes } from "@/components/LandingTranslation";


import React, { useEffect, useRef, useState, useCallback, useId } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Gift,
  HeartHandshake,
  Building2,
  Heart,
  ArrowRight,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { HOME_ROLE_COLORS } from "@/lib/landingConstants";
import { useRevealOnce, stagger } from "@/components/home/mobile/primitives";

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

/**
 * "donor" is the main landing page's look and must stay byte-for-byte as it was.
 * "donee" scopes the donee role tokens onto the section (see `data-ck-role-theme`
 * in styles.css), so every `--ck-role-*` below resolves to navy in light mode and
 * sky blue in dark mode without hardcoding either.
 */
export type WhoAreWeVariant = "donor" | "donee";

/** One row of the statement layout's list: tinted icon tile, title, always-visible line. */
function AboutPoint({ title, desc, icon: Icon, last = false }: { title: string; desc: string; icon: React.ComponentType<{ className?: string }>; last?: boolean }) {
  return (
    <li className={`flex items-start gap-5 py-5 border-t ${last ? "border-b" : ""} border-[#E7DFD3]! dark:border-stone-800!`}>
      <span className="flex-none w-11 h-11 rounded-xl flex items-center justify-center bg-[rgba(var(--ck-role-shadow-rgb,181,72,15),0.1)] text-[var(--ck-role-accent,#B5480F)] dark:text-[var(--ck-role-accent,#F4A25B)]" aria-hidden="true">
        <Icon className="w-[22px] h-[22px]" />
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="m-0 text-lg sm:text-xl font-extrabold text-stone-900 dark:text-stone-100"><LandingText>{title}</LandingText></h3>
        <p className="m-0 text-sm sm:text-[15px] leading-normal text-stone-600 dark:text-stone-400"><LandingText>{desc}</LandingText></p>
      </div>
    </li>
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
        <span data-reveal-item style={{ ...stagger(5), position: "absolute", left: "8%", top: "48%", fontSize: "0.4375rem", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "rgba(120,113,108,0.45)" }}><LandingText>GIVE</LandingText></span>
        <span data-reveal-item style={{ ...stagger(5), position: "absolute", right: "8%", top: "50%", fontSize: "0.4375rem", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "rgba(120,113,108,0.45)" }}><LandingText>VERIFY</LandingText></span>
        <span data-reveal-item style={{ ...stagger(5), position: "absolute", left: "42%", top: "70%", fontSize: "0.4375rem", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "rgba(120,113,108,0.45)" }}><LandingText>MATCH</LandingText></span>

        {/* Donor */}
        <div data-reveal-item style={stagger(2)} className="absolute flex flex-col items-center" aria-hidden>
          <div className="absolute flex flex-col items-center" style={{ left: "8%", top: "4%" }}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FBEDE3, #F9DCC4)", boxShadow: "0 3px 12px -3px rgba(181,72,15,0.2)" }}>
              <DonorSvg size={38} />
            </div>
            <span className="mt-1 text-[9px] font-extrabold uppercase tracking-widest text-[#B5480F]"><LandingText>Donor</LandingText></span>
          </div>
        </div>

        {/* Donee */}
        <div data-reveal-item style={stagger(2)} className="absolute flex flex-col items-center" aria-hidden>
          <div className="absolute flex flex-col items-center" style={{ right: "8%", top: "4%" }}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #E3F2EF, #C5E8E0)", boxShadow: "0 3px 12px -3px rgba(30,58,96,0.2)" }}>
              <DoneeSvg size={38} />
            </div>
            <span className="mt-1 text-[9px] font-extrabold uppercase tracking-widest text-[#1e3a60]"><LandingText>Donee</LandingText></span>
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

export function WhoAreWeDesktop({ variant = "donor" }: { variant?: WhoAreWeVariant } = {}) {
  const isDonee = variant === "donee";
  const sectionRef = useRef<HTMLElement>(null);
  const giantLabelFillRef = useRef<HTMLDivElement>(null);
  const orbitContainerRef = useRef<HTMLDivElement>(null);
  const orbitStageRef = useRef<HTMLDivElement>(null);
  const heartSunRef = useRef<HTMLDivElement>(null);

  const reduceMotion = useReducedMotion();
  const textPathId = useId();

  const [isInView, setIsInView] = useState(false);
  const [activeHoverPlanet, setActiveHoverPlanet] = useState<string | null>(null);

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
    <LandingAttributes><section
      ref={sectionRef}
      id="about-causekind"
      aria-label="About CauseKind"
      data-ck-role-theme={isDonee ? "donee" : undefined}
      className="relative w-full min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-center py-8 sm:py-12 lg:py-10 bg-[#FAF8F5] dark:bg-[#0E0C0A] text-[#1C1410] dark:text-[#F5EEE8] overflow-hidden transition-colors duration-300"
    >
      {/* Decorative ambient background subtle radial glows */}
      <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20" aria-hidden="true">
        {isDonee ? (
          <div
            className="absolute top-1/4 left-1/4 w-[500px] h-[500px] blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(var(--ck-role-shadow-rgb), 0.18) 0%, transparent 70%)" }}
          />
        ) : (
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle,_rgba(181,72,15,0.18)_0%,_transparent_70%)] blur-3xl" />
        )}
        <div className="absolute bottom-1/4 right-1/4 w-[550px] h-[550px] bg-[radial-gradient(circle,_rgba(127,176,232,0.18)_0%,_transparent_70%)] blur-3xl" />
      </div>

      {/* Statement layout (2026-10-16, from the "About Section Redesign" canvas, option C):
          accent panel with the heading + "No cash" line, then the description and three points. */}
      <div className="relative mx-auto max-w-7xl w-full px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-10 lg:gap-16 items-stretch w-full">
          {/* LEFT: accent statement panel */}
          <div className="flex flex-col justify-between gap-10 rounded-[28px] p-8 sm:p-12 bg-[var(--ck-role-accent,#B5480F)] text-[var(--ck-role-on-accent,#FFFFFF)]">
            <div className="flex flex-col gap-6">
              <h2 className="m-0 text-sm font-bold uppercase tracking-[0.22em] opacity-85"><LandingText>
                About CauseKind
              </LandingText></h2>
              <p className="m-0 text-3xl sm:text-4xl lg:text-[clamp(2.25rem,2.6vw+0.4rem,2.9rem)] font-extrabold tracking-tight leading-[1.1]"><LandingText>
                We connect people who have extra things with people nearby who need them.
              </LandingText></p>
            </div>
            <div className="flex flex-col items-start gap-7">
              <p className="m-0 text-lg sm:text-[22px] font-semibold leading-snug opacity-85"><LandingText>
                No cash. No middlemen. Just real things reaching real people.
              </LandingText></p>
              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-2.5 min-h-[52px] px-7 rounded-full bg-white text-[#7A2F0C] dark:bg-stone-950 dark:text-stone-100 font-bold text-base shadow-md hover:shadow-lg transition-all duration-200 group active:scale-95"
                style={isDonee ? { color: "var(--ck-role-accent)" } : undefined}
              >
                <span><LandingText>Know more</LandingText></span>
                <ArrowRight className="w-[18px] h-[18px] transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* RIGHT: description and the three points */}
          <div className="flex flex-col justify-center">
            <p className="m-0 mb-5 text-base sm:text-lg leading-relaxed text-stone-600 dark:text-stone-300"><LandingText>
              CauseKind is a free platform in India where donors give useful items — books, clothes,
              furniture, electronics and more — directly to verified people and NGOs near them.
            </LandingText></p>
            <ul className="m-0 p-0 list-none">
              <AboutPoint title="Direct giving" desc="Items go straight from the donor to the person who asked." icon={Gift} />
              <AboutPoint title="Verified & safe" desc="Receivers are verified; each handover is confirmed with a one-time code." icon={ShieldCheck} />
              <AboutPoint title="Local matching" desc="Needs meet donors nearby, so items travel a short way." icon={MapPin} last />
            </ul>
          </div>
        </div>
      </div>
    </section></LandingAttributes>
  );
}
