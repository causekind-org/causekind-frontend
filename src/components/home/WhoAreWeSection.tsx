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
} from "lucide-react";
import { HOME_ROLE_COLORS } from "@/lib/landingConstants";

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

  // 4. GSAP Scroll Trigger for Giant Label & Entrance Sequence
  useEffect(() => {
    if (!sectionRef.current) return;

    const section = sectionRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(section);

    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px)", () => {
      // Giant label warmth sweep clip-path scrub
      if (giantLabelFillRef.current) {
        gsap.fromTo(
          giantLabelFillRef.current,
          { clipPath: "inset(0 100% 0 0)" },
          {
            clipPath: "inset(0 0% 0 0)",
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top 80%",
              end: "top 25%",
              scrub: 0.8,
            },
          }
        );
      }
    });

    mm.add("(max-width: 1023px)", () => {
      if (giantLabelFillRef.current) {
        gsap.fromTo(
          giantLabelFillRef.current,
          { clipPath: "inset(0 100% 0 0)" },
          {
            clipPath: "inset(0 0% 0 0)",
            duration: 1.2,
            ease: "power2.out",
            scrollTrigger: {
              trigger: section,
              start: "top 85%",
              once: true,
            },
          }
        );
      }
    });

    return () => {
      observer.disconnect();
      mm.revert();
    };
  }, []);

  // 5. High-Performance 60fps RAF Orbit & Retina Canvas Particle Flow
  useEffect(() => {
    if (!isInView || reduceMotion) return;

    let animationFrameId: number;
    const startTime = performance.now();

    // Particle flow state
    interface FlowParticle {
      progress: number; // 0 to 1
      speed: number;
      type: "donor-to-heart" | "heart-to-donee" | "heart-to-ngo";
      size: number;
    }

    const particles: FlowParticle[] = [];
    const maxParticles = 9;

    const spawnParticle = () => {
      if (particles.length >= maxParticles) return;
      const rand = Math.random();
      if (rand < 0.45) {
        particles.push({
          progress: 0,
          speed: 0.008 + Math.random() * 0.004,
          type: "donor-to-heart",
          size: 4,
        });
      } else if (rand < 0.75) {
        particles.push({
          progress: 0,
          speed: 0.007 + Math.random() * 0.004,
          type: "heart-to-donee",
          size: 4,
        });
      } else {
        particles.push({
          progress: 0,
          speed: 0.006 + Math.random() * 0.004,
          type: "heart-to-ngo",
          size: 4,
        });
      }
    };

    let particleSpawnTimer = 0;

    const renderLoop = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const speedMultiplier = activeHoverPlanet ? 0.08 : 1.0;

      // Check dark mode dynamically for particle colors
      const isDark =
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark");

      const donorColor = isDark ? HOME_ROLE_COLORS.donor.darkAccent : HOME_ROLE_COLORS.donor.main;
      const doneeColor = isDark ? HOME_ROLE_COLORS.donee.darkAccent : HOME_ROLE_COLORS.donee.main;
      const ngoColor = isDark ? HOME_ROLE_COLORS.ngo.darkAccent : HOME_ROLE_COLORS.ngo.main;

      // Update 3D orbital positions for each planet
      planetsConfig.forEach((planet) => {
        const el = planetRefs.current[planet.id];
        if (!el) return;

        const currentAngle =
          planet.initialAngle + (elapsed / planet.speedSec) * (2 * Math.PI) * speedMultiplier;

        // Elliptical coordinate calculation with tilt
        const radTilt = (planet.tiltDeg * Math.PI) / 180;
        const unrotatedX = planet.radiusX * Math.cos(currentAngle);
        const unrotatedY = planet.radiusY * Math.sin(currentAngle);

        const x = unrotatedX * Math.cos(radTilt) - unrotatedY * Math.sin(radTilt);
        const y = unrotatedX * Math.sin(radTilt) + unrotatedY * Math.cos(radTilt);

        // Z-depth representation based on sin(angle)
        const z = Math.sin(currentAngle);
        const scale = 0.88 + (z + 1) * 0.12; // 0.88 to 1.12
        const zIndex = z >= 0 ? 25 : 5;

        el.style.transform = `translate3d(${x}px, ${y}px, ${z * 40}px) scale(${scale})`;
        el.style.zIndex = `${zIndex}`;
      });

      // Canvas Rendering with devicePixelRatio scaling & live coordinates
      const canvas = flowCanvasRef.current;
      if (canvas) {
        const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
        const rect = canvas.getBoundingClientRect();

        const targetW = Math.round(rect.width * dpr);
        const targetH = Math.round(rect.height * dpr);

        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          ctx.clearRect(0, 0, rect.width, rect.height);

          // Get live pixel coordinates of planets and heart center relative to the canvas
          const getLiveCoords = (el: HTMLElement | null) => {
            if (!el) return { x: rect.width / 2, y: rect.height / 2 };
            const elRect = el.getBoundingClientRect();
            return {
              x: elRect.left + elRect.width / 2 - rect.left,
              y: elRect.top + elRect.height / 2 - rect.top,
            };
          };

          const heartCoords = getLiveCoords(heartSunRef.current);
          const donorCoords = getLiveCoords(planetRefs.current.donor);
          const doneeCoords = getLiveCoords(planetRefs.current.donee);
          const ngoCoords = getLiveCoords(planetRefs.current.ngo);

          particleSpawnTimer++;
          if (particleSpawnTimer % 28 === 0) {
            spawnParticle();
          }

          for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.progress += p.speed * speedMultiplier;

            if (p.progress >= 1) {
              particles.splice(i, 1);
              continue;
            }

            let start = heartCoords;
            let end = heartCoords;
            let color: string = donorColor;

            if (p.type === "donor-to-heart") {
              start = donorCoords;
              end = heartCoords;
              color = donorColor;
            } else if (p.type === "heart-to-donee") {
              start = heartCoords;
              end = doneeCoords;
              color = doneeColor;
            } else {
              start = heartCoords;
              end = ngoCoords;
              color = ngoColor;
            }

            // Curved Quadratic Bezier Path
            const ctrlX = (start.x + end.x) / 2 + (start.y - end.y) * 0.25;
            const ctrlY = (start.y + end.y) / 2 - (start.x - end.x) * 0.25;

            const t = p.progress;
            const px = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * ctrlX + t * t * end.x;
            const py = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * ctrlY + t * t * end.y;

            // Draw glowing particle dot
            ctx.save();
            ctx.beginPath();
            ctx.arc(px, py, p.size, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            ctx.globalAlpha = Math.sin(t * Math.PI) * 0.92;
            ctx.fill();
            ctx.restore();
          }

          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isInView, reduceMotion, activeHoverPlanet]);

  return (
    <section
      ref={sectionRef}
      id="about-causekind"
      aria-label="About CauseKind"
      className="relative w-full min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-center py-8 sm:py-12 lg:py-10 bg-[#F8F6F2] dark:bg-[#0E0C0A] text-[#1C1410] dark:text-[#F5EEE8] border-b border-stone-200/80 dark:border-stone-850/70 overflow-hidden transition-colors duration-300"
    >
      {/* Decorative ambient background subtle radial glows */}
      <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle,_rgba(181,72,15,0.18)_0%,_transparent_70%)] blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[550px] h-[550px] bg-[radial-gradient(circle,_rgba(127,176,232,0.18)_0%,_transparent_70%)] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl w-full px-5 sm:px-8 flex flex-col gap-5 lg:gap-7">
        {/* =========================================================================
            1. GIANT LABEL: "ABOUT CAUSEKIND" (Single line outline with warmth fill)
        ========================================================================= */}
        <div className="relative w-full overflow-hidden select-none py-1">
          {/* Base Layer: Outline Only (clamped to fit on one line at all viewports) */}
          <div
            className="text-[clamp(1.75rem,4.8vw,4.25rem)] font-black uppercase tracking-tight leading-none text-transparent select-none whitespace-nowrap"
            style={{
              WebkitTextStroke: "1.5px rgba(181, 72, 15, 0.45)",
            }}
          >
            ABOUT CAUSEKIND
          </div>

          {/* Filled Layer: Swept in via clip-path scrub */}
          <div
            ref={giantLabelFillRef}
            aria-hidden="true"
            className="absolute inset-0 text-[clamp(1.75rem,4.8vw,4.25rem)] font-black uppercase tracking-tight leading-none text-[#B5480F] dark:text-[#F4A25B] select-none pointer-events-none whitespace-nowrap"
            style={{
              clipPath: "inset(0 100% 0 0)",
            }}
          >
            ABOUT CAUSEKIND
          </div>
        </div>

        {/* =========================================================================
            2. TWO-COLUMN MAIN CONTENT (Left: Text & View More; Right: Orbit)
        ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* ── LEFT COLUMN: Living Heading, Paragraph & "View More" ── */}
          <div className="lg:col-span-6 flex flex-col justify-center text-left">
            {/* Heading with Living Words & Marker Underlines */}
            <h2 className="text-2xl sm:text-3xl lg:text-[clamp(1.75rem,2.2vw+0.2rem,2.6rem)] font-extrabold tracking-tight leading-[1.2] text-stone-900 dark:text-stone-100">
              <span>We connect people who have </span>
              {/* Interactive Living Word: "extra things" */}
              <span
                onMouseEnter={triggerExtraThingsBurst}
                onFocus={triggerExtraThingsBurst}
                tabIndex={0}
                className="relative inline-block text-[#B5480F] dark:text-[#F4A25B] font-extrabold cursor-pointer group/living select-none outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-[#B5480F]"
              >
                extra things
                {/* Underline */}
                <span className="absolute left-0 bottom-0.5 w-full h-[3px] sm:h-1 bg-[#B5480F]/40 dark:bg-[#F4A25B]/50 rounded-full group-hover/living:bg-[#B5480F] transition-colors" />
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
                className="relative inline-block text-[#B5480F] dark:text-[#F4A25B] font-extrabold cursor-pointer group/need select-none outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-[#B5480F]"
              >
                need them.
                {/* Underline */}
                <span className="absolute left-0 bottom-0.5 w-full h-[3px] sm:h-1 bg-[#B5480F]/40 dark:bg-[#F4A25B]/50 rounded-full group-hover/need:bg-[#B5480F] transition-colors" />
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
                      <span className="w-6 h-6 rounded-full bg-[#B5480F] shadow-sm flex items-center justify-center text-white">
                        <MapPin className="w-3.5 h-3.5" />
                      </span>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </span>
            </h2>

            {/* Paragraph Text (Exact unaltered wording) */}
            <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 font-normal sm:font-medium leading-relaxed mt-4 max-w-xl">
              CauseKind is a free platform in India where donors give useful items — books, clothes,
              furniture, electronics and more — directly to verified people and NGOs near them. No cash.
              No middlemen. Just real things reaching real people.
            </p>

            {/* ── "View More" Button + Rotating Circular Text Badge ── */}
            <div className="mt-6 sm:mt-7 flex items-center gap-5">
              {/* Primary Action Button */}
              <Link
                href="/the-causekind-way"
                className="inline-flex items-center gap-2.5 px-5 sm:px-6 py-3 rounded-full bg-[#B5480F] hover:bg-[#C95413] text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-md hover:shadow-lg transition-all duration-200 group active:scale-95"
              >
                <span>View more</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>

              {/* Rotating Badge: "THE CAUSEKIND WAY • THE CAUSEKIND WAY •" */}
              <div
                aria-hidden="true"
                className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center pointer-events-none select-none shrink-0"
              >
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full animate-[spin_16s_linear_infinite]"
                >
                  <path
                    id={textPathId}
                    d="M 50, 50 m -36, 0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0"
                    fill="none"
                  />
                  <text className="text-[9.5px] font-bold uppercase tracking-[0.16em] fill-[#B5480F] dark:fill-[#F4A25B]">
                    <textPath href={`#${textPathId}`} startOffset="0%">
                      THE CAUSEKIND WAY • THE CAUSEKIND WAY •
                    </textPath>
                  </text>
                </svg>
                <div className="absolute w-2 h-2 rounded-full bg-[#B5480F] dark:bg-[#F4A25B]" />
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: "The CauseKind Orbit" System ── */}
          <div className="lg:col-span-6 flex items-center justify-center">
            <div
              ref={orbitContainerRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="relative w-full max-w-[520px] aspect-[520/440] mx-auto flex items-center justify-center select-none"
              style={{
                perspective: "1000px",
              }}
            >
              {/* 3D Tilted Wrapper following mouse */}
              <div
                ref={orbitStageRef}
                className="relative w-full h-full flex items-center justify-center transition-transform duration-200 ease-out"
                style={{
                  transform: `rotateX(${mouseTilt.x}deg) rotateY(${mouseTilt.y}deg)`,
                  transformStyle: "preserve-3d",
                }}
              >
                {/* SVG Dashed Elliptical Orbit Rings */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0"
                  viewBox="0 0 520 440"
                  fill="none"
                >
                  {/* Orbit Ring 1: Donors */}
                  <g transform="translate(260, 220) rotate(12)">
                    <ellipse
                      cx="0"
                      cy="0"
                      rx="175"
                      ry="100"
                      stroke={HOME_ROLE_COLORS.donor.main}
                      className="dark:stroke-[#F4A25B]"
                      strokeWidth="1.5"
                      strokeDasharray="5 6"
                      strokeOpacity="0.45"
                    />
                  </g>

                  {/* Orbit Ring 2: Donees (Authentic CauseKind Blue / Sky Blue in dark mode) */}
                  <g transform="translate(260, 220) rotate(-22)">
                    <ellipse
                      cx="0"
                      cy="0"
                      rx="225"
                      ry="130"
                      stroke={HOME_ROLE_COLORS.donee.main}
                      className="dark:stroke-[#7FB0E8]"
                      strokeWidth="1.5"
                      strokeDasharray="5 6"
                      strokeOpacity="0.45"
                    />
                  </g>

                  {/* Orbit Ring 3: NGOs */}
                  <g transform="translate(260, 220) rotate(35)">
                    <ellipse
                      cx="0"
                      cy="0"
                      rx="275"
                      ry="155"
                      stroke={HOME_ROLE_COLORS.ngo.main}
                      className="dark:stroke-[#52B788]"
                      strokeWidth="1.5"
                      strokeDasharray="5 6"
                      strokeOpacity="0.45"
                    />
                  </g>
                </svg>

                {/* Retina Scaled Canvas Layer for dynamic flowing item particles */}
                <canvas
                  ref={flowCanvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                />

                {/* ── Central Sun: The CauseKind Glowing Heart Hub ── */}
                <div
                  ref={heartSunRef}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-20 pointer-events-auto"
                >
                  {/* Pulsing Aura Rings */}
                  <div className="absolute inset-0 -m-3 rounded-full bg-[#B5480F]/15 animate-ping pointer-events-none" />
                  <div className="absolute inset-0 -m-6 rounded-full bg-[#B5480F]/10 blur-md pointer-events-none" />

                  {/* Sun Heart Badge */}
                  <div className="relative flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white dark:bg-[#1A120E] shadow-[0_8px_30px_rgba(181,72,15,0.28)] border-2 border-[#B5480F] dark:border-[#F4A25B]">
                    <Heart className="w-8 h-8 sm:w-9 sm:h-9 fill-[#B5480F] text-[#B5480F] dark:fill-[#F4A25B] dark:text-[#F4A25B] drop-shadow-sm animate-pulse" />
                  </div>
                  <span className="mt-2 text-3xs sm:text-2xs font-black uppercase tracking-[0.2em] text-[#B5480F] dark:text-[#F4A25B] select-none">
                    CAUSEKIND
                  </span>
                </div>

                {/* ── The 3 Orbiting Role Planets ── */}
                {planetsConfig.map((planet) => {
                  const IconComp = planet.icon;
                  const isHovered = activeHoverPlanet === planet.id;

                  return (
                    <div
                      key={planet.id}
                      ref={(el) => {
                        planetRefs.current[planet.id] = el;
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`${planet.name}: ${planet.shortDesc}`}
                      onMouseEnter={() => setActiveHoverPlanet(planet.id)}
                      onMouseLeave={() => setActiveHoverPlanet(null)}
                      onFocus={() => setActiveHoverPlanet(planet.id)}
                      onBlur={() => setActiveHoverPlanet(null)}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#B5480F] rounded-full transition-transform duration-200 group"
                    >
                      {/* Planet Round Badge (with dark mode role color switching) */}
                      <div
                        className={`relative flex items-center gap-2 px-3.5 py-2 rounded-full shadow-md backdrop-blur-xs border-2 transition-all duration-300 ${
                          planet.id === "donee"
                            ? "bg-[#EBF2FA] dark:bg-[#12253f]/80 border-[#1E3A60] dark:border-[#7FB0E8] text-[#1E3A60] dark:text-[#7FB0E8]"
                            : planet.id === "ngo"
                            ? "bg-[#EBF5EE] dark:bg-[#14482A]/70 border-[#1F6B3F] dark:border-[#52B788] text-[#1F6B3F] dark:text-[#52B788]"
                            : "bg-[#FBEDE3] dark:bg-[#7a3410]/70 border-[#B5480F] dark:border-[#F4A25B] text-[#B5480F] dark:text-[#F4A25B]"
                        }`}
                        style={{
                          boxShadow: isHovered
                            ? `0 10px 25px ${planet.glowColor}`
                            : "0 4px 12px rgba(0,0,0,0.06)",
                          transform: isHovered ? "scale(1.15)" : "scale(1)",
                        }}
                      >
                        <div className="w-7 h-7 rounded-full bg-white dark:bg-stone-900 shadow-2xs flex items-center justify-center shrink-0">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-extrabold tracking-tight">
                          {planet.name}
                        </span>
                      </div>

                      {/* Description Card (Pops open when hovered / focused) */}
                      <AnimatePresence>
                        {isHovered && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute left-1/2 bottom-full mb-3 -translate-x-1/2 w-[220px] p-3 rounded-2xl bg-white dark:bg-[#1C1612] border border-stone-200/90 dark:border-stone-800 shadow-xl z-50 text-center pointer-events-none"
                          >
                            <span
                              className={`text-4xs font-extrabold uppercase px-2 py-0.5 rounded-full inline-block mb-1 ${
                                planet.id === "donee"
                                  ? "bg-[#EBF2FA] dark:bg-[#12253f] text-[#1E3A60] dark:text-[#7FB0E8]"
                                  : planet.id === "ngo"
                                  ? "bg-[#EBF5EE] dark:bg-[#14482A] text-[#1F6B3F] dark:text-[#52B788]"
                                  : "bg-[#FBEDE3] dark:bg-[#7a3410] text-[#B5480F] dark:text-[#F4A25B]"
                              }`}
                            >
                              {planet.name}
                            </span>
                            <p className="text-3xs sm:text-2xs text-stone-700 dark:text-stone-300 font-bold leading-snug">
                              {planet.roleDescription}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
