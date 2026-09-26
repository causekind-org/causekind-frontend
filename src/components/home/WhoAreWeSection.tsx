"use client";

/**
 * "About CauseKind" — The Living Ecosystem.
 *
 * A visual composition of illustrated characters (Donor, Donee, NGO),
 * floating objects (book, bag, shirt, laptop, chair, box), organic
 * connection curves, and a central CauseKind hub. One object — the
 * school bag — continuously travels the network as a visual protagonist.
 *
 * Desktop: text left (43%), ecosystem right (57%) with parallax.
 * Mobile: text first, compact ecosystem below.
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Heart } from "lucide-react";
import { useRevealOnce, stagger } from "@/components/home/mobile/primitives";
import styles from "./WhoAreWeSection.module.css";

/* ═══════════════════════════════════════════════════════════════════════════
   SVG INLINE ILLUSTRATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

// Stylised characters — editorial, warm, subtle Indian context
function DonorSvg({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden>
      {/* Head */}
      <circle cx="28" cy="16" r="8" fill="#E8C4A0" />
      {/* Hair */}
      <path d="M20 14c0-6 4-10 8-10s8 4 8 10c0 0-2-4-8-4s-8 4-8 4z" fill="#3D2B1F" />
      {/* Body — kurta */}
      <path d="M16 32c0-6 5-10 12-10s12 4 12 10v8c0 2-1 3-3 3H19c-2 0-3-1-3-3v-8z" fill="#F4A25B" />
      {/* Hands with gift */}
      <rect x="22" y="35" width="12" height="10" rx="2" fill="#B5480F" opacity="0.85" />
      <path d="M28 35v10M22 40h12" stroke="white" strokeWidth="1.5" />
      {/* Warm smile */}
      <path d="M25 18c1.5 1.5 4.5 1.5 6 0" stroke="#8B5E3C" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function DoneeSvg({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden>
      {/* Head */}
      <circle cx="28" cy="16" r="8" fill="#D4A574" />
      {/* Hair — longer, with bindi */}
      <path d="M20 13c0-5 3.5-9 8-9s8 4 8 9c0 0-1-3-4-4h-8c-3 1-4 4-4 4z" fill="#1A1A2E" />
      <circle cx="28" cy="10.5" r="1" fill="#E53E3E" />
      {/* Body — salwar */}
      <path d="M16 32c0-6 5-10 12-10s12 4 12 10v8c0 2-1 3-3 3H19c-2 0-3-1-3-3v-8z" fill="#5EC7B6" />
      {/* Dupatta accent */}
      <path d="M20 22c2 3 6 4 8 4" stroke="#0F7A6C" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      {/* Open palms — receiving */}
      <ellipse cx="23" cy="42" rx="3" ry="2" fill="#D4A574" />
      <ellipse cx="33" cy="42" rx="3" ry="2" fill="#D4A574" />
      {/* Gentle smile */}
      <path d="M25 18c1.5 1.5 4.5 1.5 6 0" stroke="#8B5E3C" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function NgoSvg({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden>
      {/* Head */}
      <circle cx="28" cy="16" r="8" fill="#C9A882" />
      {/* Short hair */}
      <path d="M20 14c0-6 3.5-10 8-10s8 4 8 10c-1-3-4-5-8-5s-7 2-8 5z" fill="#2D1B10" />
      {/* Body — professional */}
      <path d="M16 32c0-6 5-10 12-10s12 4 12 10v8c0 2-1 3-3 3H19c-2 0-3-1-3-3v-8z" fill="#6CC98F" />
      {/* Collar */}
      <path d="M24 22l4 3 4-3" stroke="#1F6B3F" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Clipboard */}
      <rect x="24" y="32" width="8" height="11" rx="1.5" fill="white" opacity="0.9" />
      <line x1="26" y1="35" x2="30" y2="35" stroke="#1F6B3F" strokeWidth="1" />
      <line x1="26" y1="37.5" x2="30" y2="37.5" stroke="#1F6B3F" strokeWidth="1" />
      <line x1="26" y1="40" x2="29" y2="40" stroke="#1F6B3F" strokeWidth="1" />
      {/* Smile */}
      <path d="M25 18c1.5 1.5 4.5 1.5 6 0" stroke="#8B5E3C" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// Floating object icons — items that can be donated
function BookIcon({ size = 28 }: { size?: number }) {
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
function BagIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden>
      <path d="M7 10h14v14a2 2 0 01-2 2H9a2 2 0 01-2-2V10z" fill="#0F7A6C" opacity="0.85" />
      <path d="M10 10V7a4 4 0 018 0v3" stroke="#0F7A6C" strokeWidth="2" fill="none" />
      <rect x="11" y="14" width="6" height="4" rx="1" fill="white" opacity="0.4" />
    </svg>
  );
}
function ShirtIcon({ size = 26 }: { size?: number }) {
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
function ChairIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-hidden>
      <rect x="7" y="4" width="12" height="10" rx="2" fill="#B5480F" opacity="0.7" />
      <rect x="8" y="14" width="10" height="3" rx="1" fill="#8B3A0A" opacity="0.5" />
      <line x1="9" y1="17" x2="9" y2="23" stroke="#57534E" strokeWidth="1.5" />
      <line x1="17" y1="17" x2="17" y2="23" stroke="#57534E" strokeWidth="1.5" />
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

/* ═══════════════════════════════════════════════════════════════════════════
   CONFIGURATION
   ═══════════════════════════════════════════════════════════════════════════ */

interface FloatingObj {
  id: string;
  icon: React.FC<{ size?: number }>;
  size: number;
  // Position as percentage of container
  x: number;
  y: number;
  depth: "front" | "mid" | "back";
  floatRotation: number;
  animDelay: number;
  enterDelay: number;
}

const FLOATING_OBJECTS: FloatingObj[] = [
  { id: "book", icon: BookIcon, size: 30, x: 22, y: 25, depth: "front", floatRotation: 1.5, animDelay: 0, enterDelay: 0 },
  { id: "bag", icon: BagIcon, size: 28, x: 68, y: 25, depth: "mid", floatRotation: -1, animDelay: 0.8, enterDelay: 0.05 },
  { id: "shirt", icon: ShirtIcon, size: 26, x: 75, y: 55, depth: "back", floatRotation: 2, animDelay: 1.6, enterDelay: 0.1 },
  { id: "laptop", icon: LaptopIcon, size: 28, x: 12, y: 58, depth: "mid", floatRotation: -0.5, animDelay: 2.4, enterDelay: 0.15 },
  { id: "chair", icon: ChairIcon, size: 24, x: 35, y: 76, depth: "back", floatRotation: 1, animDelay: 1.2, enterDelay: 0.2 },
  { id: "box", icon: BoxIcon, size: 26, x: 60, y: 73, depth: "front", floatRotation: -1.5, animDelay: 2, enterDelay: 0.08 },
];

interface MicroLabelData {
  text: string;
  x: number;
  y: number;
  enterDelay: number;
}

const MICRO_LABELS: MicroLabelData[] = [
  { text: "GIVE", x: 15, y: 33, enterDelay: 1.1 },
  { text: "MATCH", x: 42, y: 42, enterDelay: 1.2 },
  { text: "VERIFY", x: 55, y: 64, enterDelay: 1.3 },
  { text: "HAND OVER", x: 28, y: 68, enterDelay: 1.15 },
  { text: "IMPACT", x: 68, y: 42, enterDelay: 1.25 },
];

/* ═══════════════════════════════════════════════════════════════════════════
   PARALLAX DEPTH MULTIPLIERS
   ═══════════════════════════════════════════════════════════════════════════ */

const DEPTH_MUL = { front: 8, mid: 4, back: 2 } as const;

/* ═══════════════════════════════════════════════════════════════════════════
   NETWORK PATHS — organic Bézier curves
   ═══════════════════════════════════════════════════════════════════════════ */

// Paths connect: Donor ↔ Hub, Donee ↔ Hub, NGO ↔ Hub
// All in a 500×460 viewBox
const PATHS = {
  donorToHub: "M 95 90 C 110 140, 160 185, 250 230",
  doneeToHub: "M 395 100 C 380 155, 330 195, 250 230",
  ngoToHub: "M 250 390 C 245 340, 248 290, 250 230",
  // Secondary/decorative curves (items flowing)
  donorItem: "M 110 130 C 140 170, 190 200, 250 230",
  doneeItem: "M 370 160 C 345 195, 300 215, 250 230",
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   DESKTOP ECOSYSTEM COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

function Ecosystem() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const isInView = useInView(ref, { once: true, amount: 0.25 });
  const [entered, setEntered] = useState(false);
  const [hoveredChar, setHoveredChar] = useState<string | null>(null);
  const [hubPulse, setHubPulse] = useState(false);
  const [travelerPhase, setTravelerPhase] = useState<"idle" | "donorToHub" | "hubToDonee">("idle");

  // Entrance trigger
  useEffect(() => {
    if (isInView && !entered) {
      const t = setTimeout(() => setEntered(true), reduceMotion ? 0 : 100);
      return () => clearTimeout(t);
    }
  }, [isInView, entered, reduceMotion]);

  // Parallax: track cursor position relative to ecosystem container
  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion) return;
    let frame = 0;
    let px = 0, py = 0;

    const write = () => {
      frame = 0;
      el.style.setProperty("--px", px.toFixed(3));
      el.style.setProperty("--py", py.toFixed(3));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(write);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width - 0.5) * 2;
      py = ((e.clientY - r.top) / r.height - 0.5) * 2;
      schedule();
    };
    const onLeave = () => {
      px = 0; py = 0;
      schedule();
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [reduceMotion]);

  // Traveler animation cycle — every 6 seconds, bag travels donor → hub → donee
  useEffect(() => {
    if (!entered || reduceMotion) return;
    let timer: ReturnType<typeof setTimeout>;
    const cycle = () => {
      setTravelerPhase("donorToHub");
      timer = setTimeout(() => {
        setHubPulse(true);
        setTimeout(() => setHubPulse(false), 600);
        setTravelerPhase("hubToDonee");
        timer = setTimeout(() => {
          setTravelerPhase("idle");
          timer = setTimeout(cycle, 4000);
        }, 2000);
      }, 2000);
    };
    timer = setTimeout(cycle, 2000);
    return () => clearTimeout(timer);
  }, [entered, reduceMotion]);

  const charTooltips: Record<string, string> = {
    donor: "Gives what they no longer need",
    donee: "Requests what they genuinely need",
    ngo: "Requests items for the people they serve",
  };

  return (
    <div
      ref={ref}
      className={styles.ecosystem}
      data-entered={entered}
      aria-hidden
    >
      {/* Background network faint lines */}
      <div className={styles.bgNetwork}>
        <svg viewBox="0 0 500 460" fill="none" aria-hidden>
          <circle cx="250" cy="230" r="120" stroke="rgba(181,72,15,0.04)" strokeWidth="1" fill="none" />
          <circle cx="250" cy="230" r="200" stroke="rgba(15,122,108,0.03)" strokeWidth="0.8" fill="none" />
          <line x1="50" y1="100" x2="450" y2="100" stroke="rgba(120,113,108,0.03)" strokeWidth="0.5" />
          <line x1="50" y1="360" x2="450" y2="360" stroke="rgba(120,113,108,0.03)" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Network SVG — organic connection curves */}
      <svg className={styles.networkSvg} viewBox="0 0 500 460">
        <defs>
          <linearGradient id="eco-grad-orange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B5480F" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#F4A25B" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="eco-grad-teal" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0F7A6C" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#5ec7b6" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="eco-grad-green" x1="50%" y1="100%" x2="50%" y2="0%">
            <stop offset="0%" stopColor="#1F6B3F" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#6cc98f" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Donor → Hub */}
        <motion.path
          d={PATHS.donorToHub}
          className={styles.connectionLine}
          stroke="url(#eco-grad-orange)"
          strokeDasharray="5 5"
          data-active={hoveredChar === "donor"}
          initial={{ pathLength: 0 }}
          animate={entered ? { pathLength: 1 } : {}}
          transition={{ duration: 1.2, delay: 0.8, ease: "easeInOut" }}
        />

        {/* Donee → Hub */}
        <motion.path
          d={PATHS.doneeToHub}
          className={styles.connectionLine}
          stroke="url(#eco-grad-teal)"
          strokeDasharray="5 5"
          data-active={hoveredChar === "donee"}
          initial={{ pathLength: 0 }}
          animate={entered ? { pathLength: 1 } : {}}
          transition={{ duration: 1.2, delay: 0.9, ease: "easeInOut" }}
        />

        {/* NGO → Hub */}
        <motion.path
          d={PATHS.ngoToHub}
          className={styles.connectionLine}
          stroke="url(#eco-grad-green)"
          strokeDasharray="5 5"
          data-active={hoveredChar === "ngo"}
          initial={{ pathLength: 0 }}
          animate={entered ? { pathLength: 1 } : {}}
          transition={{ duration: 1.0, delay: 1.0, ease: "easeInOut" }}
        />

        {/* Flowing particles along paths */}
        {entered && !reduceMotion && (
          <>
            <circle r="3" className={styles.flowParticle} fill="#B5480F">
              <animateMotion
                path={PATHS.donorToHub}
                dur="3.5s"
                repeatCount="indefinite"
              />
            </circle>
            <circle r="3" className={styles.flowParticle} fill="#0F7A6C">
              <animateMotion
                path={PATHS.doneeToHub}
                dur="3.8s"
                repeatCount="indefinite"
              />
            </circle>
            <circle r="2.5" className={styles.flowParticle} fill="#1F6B3F">
              <animateMotion
                path={PATHS.ngoToHub}
                dur="3s"
                repeatCount="indefinite"
              />
            </circle>
          </>
        )}

        {/* Traveling protagonist — school bag */}
        {entered && !reduceMotion && (
          <g className={styles.traveler}>
            {travelerPhase === "donorToHub" && (
              <g>
                <animateMotion
                  path={PATHS.donorToHub}
                  dur="2s"
                  fill="freeze"
                />
                <BagIcon size={22} />
              </g>
            )}
            {travelerPhase === "hubToDonee" && (
              <g>
                <animateMotion
                  path="M 250 230 C 310 210, 370 170, 410 95"
                  dur="2s"
                  fill="freeze"
                />
                <BagIcon size={22} />
              </g>
            )}
          </g>
        )}
      </svg>

      {/* Floating objects */}
      {FLOATING_OBJECTS.map((obj) => {
        const Ic = obj.icon;
        const depthMul = DEPTH_MUL[obj.depth];
        return (
          <div
            key={obj.id}
            className={styles.floatingObject}
            style={{
              left: `${obj.x}%`,
              top: `${obj.y}%`,
              transform: `translate(calc(var(--px) * ${depthMul}px), calc(var(--py) * ${depthMul}px))`,
              ["--enter-delay" as string]: `${obj.enterDelay}s`,
            } as React.CSSProperties}
          >
            <div
              className={styles.objectInner}
              style={{
                animationDelay: `${obj.animDelay}s`,
                ["--float-rot" as string]: `${obj.floatRotation}deg`,
                ["--delay" as string]: `${obj.animDelay}s`,
              } as React.CSSProperties}
            >
              <Ic size={obj.size} />
            </div>
          </div>
        );
      })}

      {/* Micro labels */}
      {MICRO_LABELS.map((label) => (
        <span
          key={label.text}
          className={styles.microLabel}
          style={{
            left: `${label.x}%`,
            top: `${label.y}%`,
            ["--enter-delay" as string]: `${label.enterDelay}s`,
          } as React.CSSProperties}
        >
          {label.text}
        </span>
      ))}

      {/* ── Characters ───────────────────────────────────────────── */}

      {/* Donor */}
      <div
        className={`${styles.character} ${styles.charDonor}`}
        data-highlighted={hoveredChar === "donor"}
        onMouseEnter={() => setHoveredChar("donor")}
        onMouseLeave={() => setHoveredChar(null)}
        style={{ ["--enter-delay" as string]: "0.3s" } as React.CSSProperties}
      >
        <div className={styles.characterTooltip}>{charTooltips.donor}</div>
        <div
          className={styles.characterBody}
          style={{
            background: "linear-gradient(135deg, #FBEDE3 0%, #F9DCC4 100%)",
            boxShadow: "0 4px 16px -4px rgba(181,72,15,0.25)",
          }}
        >
          <DonorSvg size={52} />
        </div>
        <span className={styles.characterName} style={{ color: "#B5480F" }}>
          Donor
        </span>
      </div>

      {/* Donee */}
      <div
        className={`${styles.character} ${styles.charDonee}`}
        data-highlighted={hoveredChar === "donee"}
        onMouseEnter={() => setHoveredChar("donee")}
        onMouseLeave={() => setHoveredChar(null)}
        style={{ ["--enter-delay" as string]: "0.45s" } as React.CSSProperties}
      >
        <div className={styles.characterTooltip}>{charTooltips.donee}</div>
        <div
          className={styles.characterBody}
          style={{
            background: "linear-gradient(135deg, #E3F2EF 0%, #C5E8E0 100%)",
            boxShadow: "0 4px 16px -4px rgba(15,122,108,0.25)",
          }}
        >
          <DoneeSvg size={52} />
        </div>
        <span className={styles.characterName} style={{ color: "#0F7A6C" }}>
          Donee
        </span>
      </div>

      {/* NGO */}
      <div
        className={`${styles.character} ${styles.charNgo}`}
        data-highlighted={hoveredChar === "ngo"}
        onMouseEnter={() => setHoveredChar("ngo")}
        onMouseLeave={() => setHoveredChar(null)}
        style={{ ["--enter-delay" as string]: "0.55s" } as React.CSSProperties}
      >
        <div className={styles.characterTooltip}>{charTooltips.ngo}</div>
        <div
          className={styles.characterBody}
          style={{
            background: "linear-gradient(135deg, #E5F1E9 0%, #C4E0CD 100%)",
            boxShadow: "0 4px 16px -4px rgba(31,107,63,0.25)",
          }}
        >
          <NgoSvg size={52} />
        </div>
        <span className={styles.characterName} style={{ color: "#1F6B3F" }}>
          NGO
        </span>
      </div>

      {/* ── CauseKind Hub ──────────────────────────────────────── */}
      <div className={styles.hub}>
        <div className={styles.hubKnot}>
          <div className={styles.hubCore} data-pulse={hubPulse} />
          <div className={styles.hubPulseRing} />
          <Heart
            className={styles.hubHeart}
            style={{ width: 28, height: 28 }}
            fill="white"
            strokeWidth={0}
          />
        </div>
        <span className={styles.hubLabel}>CauseKind</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOBILE ECOSYSTEM — compact version
   ═══════════════════════════════════════════════════════════════════════════ */

function MobileEcosystem() {
  const ref = useRevealOnce<HTMLDivElement>();

  return (
    <div ref={ref} className="md:hidden select-none mt-4">
      <div className="relative mx-auto" style={{ maxWidth: 360, aspectRatio: "1 / 1.15" }}>
        {/* Background network */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 360 414">
          <defs>
            <linearGradient id="m-eco-orange" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#B5480F" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#F4A25B" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="m-eco-teal" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0F7A6C" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#5ec7b6" stopOpacity="0.2" />
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
          <circle r="2.5" fill="#0F7A6C" opacity="0.5">
            <animateMotion path="M 290 70 C 260 140, 220 170, 180 200" dur="3.2s" repeatCount="indefinite" />
          </circle>
          <circle r="2" fill="#1F6B3F" opacity="0.5">
            <animateMotion path="M 180 340 L 180 200" dur="2.8s" repeatCount="indefinite" />
          </circle>
        </svg>

        {/* Floating objects */}
        <div data-reveal-item style={stagger(1)} className="absolute" aria-hidden>
          <div className="absolute" style={{ left: "15%", top: "35%" }}>
            <BookIcon size={22} />
          </div>
          <div className="absolute" style={{ right: "12%", top: "42%" }}>
            <ShirtIcon size={20} />
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
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #E3F2EF, #C5E8E0)", boxShadow: "0 3px 12px -3px rgba(15,122,108,0.2)" }}>
              <DoneeSvg size={38} />
            </div>
            <span className="mt-1 text-[9px] font-extrabold uppercase tracking-widest text-[#0F7A6C]">Donee</span>
          </div>
        </div>

        {/* Hub */}
        <div data-reveal-item="scale" style={stagger(3)} className="absolute flex flex-col items-center" aria-hidden>
          <div className="absolute flex flex-col items-center" style={{ left: "50%", top: "44%", transform: "translateX(-50%)" }}>
            <div className="relative w-14 h-14 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(135deg, #B5480F 0%, #D4690A 100%)", boxShadow: "0 0 0 3px rgba(181,72,15,0.12), 0 6px 24px -6px rgba(181,72,15,0.35)" }} />
              <Heart className="relative z-10" style={{ width: 24, height: 24 }} fill="white" strokeWidth={0} />
            </div>
            <span className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-[#B5480F]">CauseKind</span>
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

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION EXPORT
   ═══════════════════════════════════════════════════════════════════════════ */

export function WhoAreWeSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
  const reduceMotion = useReducedMotion();

  const labelText = "ABOUT CAUSEKIND";

  return (
    <section
      ref={sectionRef}
      id="about-causekind"
      className={`${styles.section} ck-m-section relative w-full min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex items-center py-10 sm:py-12 lg:py-8 border-b border-stone-200/80 dark:border-stone-850/70`}
    >
      <div className={styles.ambientGlow} />

      <div className={styles.inner}>
        {/* ── LEFT: Typography ──────────────────────────────── */}
        <div className={styles.textCol}>
          {/* Eyebrow */}
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowLine} />
            <p className={styles.eyebrowText} style={{ display: "flex", overflow: "hidden" }}>
              {labelText.split("").map((char, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, y: 5 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    duration: 0.03,
                    delay: reduceMotion ? 0 : 0.05 + index * 0.025,
                  }}
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </p>
          </div>

          {/* Headline — editorial, punchy */}
          <motion.h2
            className={styles.headline}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: reduceMotion ? 0 : 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className={styles.headlineHighlight}>Good things</span>{" "}
            shouldn&apos;t sit unused.
          </motion.h2>

          {/* Subhead */}
          <motion.p
            className={styles.subhead}
            initial={{ opacity: 0, y: 15 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.3 }}
          >
            CauseKind connects people who have useful things with verified
            people and NGOs nearby who{" "}
            <span className={styles.headlineHighlight} style={{ fontWeight: 600 }}>
              need them
            </span>.
          </motion.p>

          {/* Supporting detail */}
          <motion.p
            className={styles.detail}
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.4 }}
          >
            A free platform in India. Books, clothes, furniture, electronics and
            more — given directly. No cash. No middlemen. Just real things
            reaching real people.
          </motion.p>
        </div>

        {/* ── RIGHT: Ecosystem (Desktop) ──────────────────── */}
        <div className={styles.desktopSection}>
          <Ecosystem />
        </div>

        {/* ── MOBILE: Compact ecosystem ───────────────────── */}
        <MobileEcosystem />
      </div>
    </section>
  );
}
