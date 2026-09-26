"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Deterministic scatter offsets for LOCAL letters (L-O-C-A-L)
const SCATTER_POSITIONS = [
  { x: -320, y: -180, rot: -24 },
  { x: -140, y: 220, rot: 18 },
  { x: 180, y: -240, rot: -15 },
  { x: 260, y: 190, rot: 22 },
  { x: 380, y: -90, rot: -12 },
];

export function ManifestoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const finaleLockupRef = useRef<HTMLDivElement>(null);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    const mm = gsap.matchMedia();

    // ─────────────────────────────────────────────────────────────
    // 1. DESKTOP SEQUENCE (Pinned, Scrubbed) ≥1024px
    // ─────────────────────────────────────────────────────────────
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      // Elements
      const openingText = stage.querySelector(".act-opening");
      const localAct = stage.querySelector(".act-local");
      const localLetters = stage.querySelectorAll(".local-letter");
      const localCircle = stage.querySelector(".local-circle-path") as SVGPathElement | null;
      const localCircleGroup = stage.querySelector(".local-circle-group");
      const localCopy = stage.querySelector(".local-copy");
      
      const chap01 = stage.querySelector(".chap-01");
      const chap02 = stage.querySelector(".chap-02");
      const chap03 = stage.querySelector(".chap-03");
      const chapFin = stage.querySelector(".chap-fin");

      const manifestoPill = stage.querySelector(".manifesto-pill");
      const pillLocal = stage.querySelector(".pill-local");
      const pillDirect = stage.querySelector(".pill-direct");

      const directAct = stage.querySelector(".act-direct");
      const directWord = stage.querySelector(".direct-word");
      const directLine = stage.querySelector(".direct-line-path") as SVGPathElement | null;
      const obstacleWarehouses = stage.querySelector(".obstacle-warehouses");
      const obstacleMiddlemen = stage.querySelector(".obstacle-middlemen");
      const strikeWarehouses = stage.querySelector(".strike-warehouses");
      const strikeMiddlemen = stage.querySelector(".strike-middlemen");
      const directCopy = stage.querySelector(".direct-copy");

      const dignifiedAct = stage.querySelector(".act-dignified");
      const dignifiedLetters = stage.querySelectorAll(".dignified-letter");
      const dignifiedCopy = stage.querySelector(".dignified-copy");
      const privacyBar = stage.querySelector(".privacy-bar");

      const finaleAct = stage.querySelector(".act-finale");
      const finaleLines = stage.querySelectorAll(".finale-line");
      const finaleRule = stage.querySelector(".finale-rule");

      // Setup initial visual states
      if (localCircle) {
        const len = localCircle.getTotalLength ? localCircle.getTotalLength() : 800;
        gsap.set(localCircle, { strokeDasharray: len, strokeDashoffset: len });
      }
      if (directLine) {
        const len = directLine.getTotalLength ? directLine.getTotalLength() : 1200;
        gsap.set(directLine, { strokeDasharray: len, strokeDashoffset: len });
      }

      // Initial letter scatter for LOCAL
      localLetters.forEach((el, i) => {
        const offset = SCATTER_POSITIONS[i % SCATTER_POSITIONS.length];
        gsap.set(el, {
          x: offset.x,
          y: offset.y,
          rotation: offset.rot,
          opacity: 0,
        });
      });

      // Initial rotation for DIGNIFIED (lying flat along baseline)
      dignifiedLetters.forEach((el) => {
        gsap.set(el, {
          rotationX: 85,
          y: 40,
          opacity: 0,
          transformOrigin: "50% 100%",
        });
      });

      // Chapter markers initial state
      gsap.set([chap02, chap03, chapFin], { opacity: 0 });
      gsap.set(chap01, { opacity: 1 });

      // Master Pinned Timeline
      const masterTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=350%",
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          id: "way-manifesto-pinned",
        },
      });

      // ── TIME MAP (Total 100 units) ──
      // 0  -> 12 : OPENING ("Giving should be...")
      // 12 -> 35 : ACT 1 (LOCAL letters assemble, 10km circle draws, copy reveals)
      // 35 -> 40 : TRANSITION 1 (LOCAL shrinks into manifesto list pill)
      // 40 -> 60 : ACT 2 (DIRECT line strikes warehouses/middlemen, they fall, copy reveals)
      // 60 -> 65 : TRANSITION 2 (DIRECT joins manifesto list)
      // 65 -> 82 : ACT 3 (DIGNIFIED letters rise upright, privacy bar slides over)
      // 82 -> 95 : FINALE (Manifesto lockup forms, statement + closing line)
      // 95 -> 100: Short hold before unpin

      // ── OPENING ──
      masterTl.to(openingText, { opacity: 1, y: 0, duration: 8, ease: "power2.out" }, 0);
      masterTl.to(openingText, { opacity: 0, y: -20, duration: 4 }, 10);

      // ── ACT 1 — LOCAL ──
      masterTl.set(localAct, { opacity: 1, pointerEvents: "auto" }, 10);
      masterTl.to(
        localLetters,
        {
          x: 0,
          y: 0,
          rotation: 0,
          opacity: 1,
          duration: 12,
          stagger: 0.8,
          ease: "power3.out",
        },
        12
      );

      // Draw dashed 10km circle
      if (localCircle) {
        masterTl.to(
          localCircle,
          {
            strokeDashoffset: 0,
            duration: 8,
            ease: "power2.out",
          },
          18
        );
      }
      masterTl.to(localCircleGroup, { opacity: 1, duration: 4 }, 18);
      masterTl.to(localCopy, { opacity: 1, y: 0, duration: 6, ease: "power2.out" }, 22);

      // ── TRANSITION 1: Local into Pill ──
      masterTl.to(
        [localAct, localCopy, localCircleGroup],
        { opacity: 0, y: -30, duration: 4, ease: "power2.in" },
        34
      );
      masterTl.set(manifestoPill, { opacity: 1 }, 35);
      masterTl.to(pillLocal, { opacity: 1, y: 0, duration: 3 }, 35);
      masterTl.set(localAct, { pointerEvents: "none" }, 38);

      // ── ACT 2 — DIRECT ──
      masterTl.set(directAct, { opacity: 1, pointerEvents: "auto" }, 38);
      masterTl.to(chap01, { opacity: 0, duration: 1 }, 38);
      masterTl.to(chap02, { opacity: 1, duration: 1 }, 38);

      masterTl.fromTo(
        directWord,
        { opacity: 0, x: -50 },
        { opacity: 1, x: 0, duration: 6, ease: "power2.out" },
        39
      );
      masterTl.fromTo(
        [obstacleWarehouses, obstacleMiddlemen],
        { opacity: 0, x: 30 },
        { opacity: 0.7, x: 0, duration: 4, stagger: 1 },
        41
      );

      // Straight orange line shoots from left to right
      if (directLine) {
        masterTl.to(
          directLine,
          {
            strokeDashoffset: 0,
            duration: 9,
            ease: "power1.inOut",
          },
          44
        );
      }

      // Strike-through occurs when line hits
      masterTl.to(strikeWarehouses, { scaleX: 1, duration: 2, ease: "power2.out" }, 47);
      masterTl.to(strikeMiddlemen, { scaleX: 1, duration: 2, ease: "power2.out" }, 49);

      // Obstacles fall with gravity and slight rotation
      masterTl.to(
        obstacleWarehouses,
        {
          y: 260,
          rotation: 22,
          opacity: 0,
          duration: 6,
          ease: "power3.in",
        },
        50
      );
      masterTl.to(
        obstacleMiddlemen,
        {
          y: 280,
          rotation: -18,
          opacity: 0,
          duration: 6,
          ease: "power3.in",
        },
        51
      );

      masterTl.to(directCopy, { opacity: 1, y: 0, duration: 6, ease: "power2.out" }, 52);

      // ── TRANSITION 2: Direct into Pill ──
      masterTl.to(
        [directAct, directCopy],
        { opacity: 0, y: -30, duration: 4, ease: "power2.in" },
        60
      );
      masterTl.to(pillDirect, { opacity: 1, y: 0, duration: 3 }, 61);
      masterTl.set(directAct, { pointerEvents: "none" }, 64);

      // ── ACT 3 — DIGNIFIED ──
      masterTl.set(dignifiedAct, { opacity: 1, pointerEvents: "auto" }, 64);
      masterTl.to(chap02, { opacity: 0, duration: 1 }, 64);
      masterTl.to(chap03, { opacity: 1, duration: 1 }, 64);

      // Letters rise from lying flat (rotateX 85° -> 0°)
      masterTl.to(
        dignifiedLetters,
        {
          rotationX: 0,
          y: 0,
          opacity: 1,
          duration: 10,
          stagger: 0.6,
          ease: "power3.out",
        },
        65
      );

      masterTl.to(dignifiedCopy, { opacity: 1, y: 0, duration: 5, ease: "power2.out" }, 72);

      // Privacy bar slides over "sharing their story"
      masterTl.fromTo(
        privacyBar,
        { scaleX: 0, transformOrigin: "left center" },
        { scaleX: 1, duration: 5, ease: "power2.out" },
        76
      );

      // ── FINALE ──
      masterTl.to(
        [dignifiedAct, dignifiedCopy, manifestoPill],
        { opacity: 0, y: -20, duration: 4, ease: "power2.in" },
        82
      );
      masterTl.to(chap03, { opacity: 0, duration: 1 }, 83);
      masterTl.to(chapFin, { opacity: 1, duration: 1 }, 83);

      masterTl.set(finaleAct, { opacity: 1, pointerEvents: "auto" }, 83);
      masterTl.fromTo(
        finaleLines,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 8, stagger: 1.2, ease: "power3.out" },
        84
      );

      masterTl.fromTo(
        finaleRule,
        { scaleX: 0, transformOrigin: "center" },
        { scaleX: 1, duration: 4, ease: "power2.out" },
        90
      );

      // ── Desktop Magnetic Interaction in Finale ──
      const lockupEl = finaleLockupRef.current;
      if (lockupEl) {
        const letters = lockupEl.querySelectorAll<HTMLElement>(".mag-char");
        if (letters.length > 0) {
          const quickSetters = Array.from(letters).map((letter) => ({
            el: letter,
            xTo: gsap.quickTo(letter, "x", { duration: 0.4, ease: "power2.out" }),
            yTo: gsap.quickTo(letter, "y", { duration: 0.4, ease: "power2.out" }),
          }));

          const handlePointerMove = (e: PointerEvent) => {
            // Only active when finale is visible in scroll
            const isFinaleVisible = masterTl.progress() >= 0.8;
            if (!isFinaleVisible) return;

            quickSetters.forEach(({ el, xTo, yTo }) => {
              const rect = el.getBoundingClientRect();
              const charCenterX = rect.left + rect.width / 2;
              const charCenterY = rect.top + rect.height / 2;
              const dx = e.clientX - charCenterX;
              const dy = e.clientY - charCenterY;
              const dist = Math.hypot(dx, dy);
              const radius = 90;

              if (dist < radius && dist > 0) {
                const power = (1 - dist / radius) * -12; // gentle repel up to ~12px
                xTo((dx / dist) * power);
                yTo((dy / dist) * power);
              } else {
                xTo(0);
                yTo(0);
              }
            });
          };

          const handlePointerLeave = () => {
            quickSetters.forEach(({ xTo, yTo }) => {
              xTo(0);
              yTo(0);
            });
          };

          window.addEventListener("pointermove", handlePointerMove, { passive: true });
          lockupEl.addEventListener("pointerleave", handlePointerLeave);

          return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            lockupEl.removeEventListener("pointerleave", handlePointerLeave);
          };
        }
      }
    });

    // ─────────────────────────────────────────────────────────────
    // 2. MOBILE / TABLET SEQUENCE (<1024px, No Pinning)
    // ─────────────────────────────────────────────────────────────
    mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
      const blocks = section.querySelectorAll(".mobile-manifesto-block");
      blocks.forEach((block) => {
        gsap.fromTo(
          block,
          { opacity: 0, y: 35 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: block,
              start: "top 80%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });

      // Mobile strike-through on obstacle words
      const mobileWarehouses = section.querySelector(".mobile-strike-warehouses");
      const mobileMiddlemen = section.querySelector(".mobile-strike-middlemen");
      if (mobileWarehouses && mobileMiddlemen) {
        gsap.to([mobileWarehouses, mobileMiddlemen], {
          scaleX: 1,
          duration: 0.6,
          stagger: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: mobileWarehouses,
            start: "top 75%",
          },
        });
      }
    });

    // ─────────────────────────────────────────────────────────────
    // 3. REDUCED MOTION (Static accessible layout)
    // ─────────────────────────────────────────────────────────────
    mm.add("(prefers-reduced-motion: reduce)", () => {
      // Everything visible and static
      gsap.set(section.querySelectorAll(".act-opening, .act-local, .act-direct, .act-dignified, .act-finale"), {
        opacity: 1,
        y: 0,
        pointerEvents: "auto",
      });
    });

    return () => {
      mm.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="our-mission"
      aria-label="Why We Exist"
      className="relative w-full bg-[#FAF8F5] dark:bg-[#0E0C0A] text-[#1C1410] dark:text-[#F5EEE8] border-b border-stone-200/80 dark:border-stone-800/80 overflow-hidden select-none"
    >
      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP PINNED VIEWPORT (≥1024px)
      ═══════════════════════════════════════════════════════════════ */}
      <div
        ref={stageRef}
        className="hidden lg:flex relative w-full h-[100svh] flex-col justify-between p-8 xl:p-14 2xl:p-16 max-w-7xl mx-auto overflow-hidden"
      >
        {/* TOP EDITORIAL HEADER BAR */}
        <div className="relative z-30 flex items-center justify-between w-full border-b border-stone-200/90 dark:border-stone-800/80 pb-4 pt-1">
          {/* Label + Hairline rule */}
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs font-black uppercase tracking-[0.25em] text-[#B5480F] dark:text-[#F4A25B]">
              WHY WE EXIST
            </span>
            <div className="w-12 h-px bg-[#B5480F]/40 dark:bg-[#F4A25B]/40" />
          </div>

          {/* Manifesto Mini Status Pill */}
          <div
            className="manifesto-pill opacity-0 transition-opacity duration-300 flex items-center gap-2 font-mono text-2xs tracking-wider uppercase text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-900 px-3 py-1 rounded-full border border-stone-200 dark:border-stone-800"
            aria-hidden="true"
          >
            <span className="pill-local opacity-30 text-[#B5480F] dark:text-[#F4A25B] font-bold">Local.</span>
            <span className="pill-direct opacity-30 text-[#B5480F] dark:text-[#F4A25B] font-bold">Direct.</span>
            <span className="pill-dignified opacity-30 text-[#B5480F] dark:text-[#F4A25B] font-bold">Dignified.</span>
          </div>

          {/* Chapter Number Multi-Layer */}
          <div className="relative font-mono text-xs tracking-widest text-stone-500 dark:text-stone-400 font-bold w-24 text-right">
            <span className="chap-01 inline-block">01 / 03</span>
            <span className="chap-02 absolute right-0 top-0 opacity-0">02 / 03</span>
            <span className="chap-03 absolute right-0 top-0 opacity-0">03 / 03</span>
            <span className="chap-fin absolute right-0 top-0 opacity-0">MANIFESTO</span>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            CENTRAL STAGE (Absolute Layered Acts)
        ───────────────────────────────────────────────────────────── */}
        <div className="relative flex-1 w-full flex items-center justify-center min-h-[500px]">
          
          {/* ── OPENING: Statement Prompt ── */}
          <div className="act-opening opacity-0 translate-y-6 absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none z-10 px-4">
            <p className="font-serif italic text-2xl sm:text-3xl text-stone-500 dark:text-stone-400 mb-2">
              The fundamental belief
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-stone-900 dark:text-stone-100 max-w-2xl leading-tight">
              Giving should be…
            </h2>
          </div>

          {/* ── ACT 1: LOCAL ── */}
          <div className="act-local opacity-0 absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <div className="relative flex items-center justify-center">
              {/* Thin dashed orange circle */}
              <div
                className="local-circle-group opacity-0 absolute pointer-events-none flex items-center justify-center -translate-y-1"
                style={{ width: "min(68vw, 620px)", height: "min(34vw, 310px)" }}
                aria-hidden="true"
              >
                <svg className="w-full h-full overflow-visible" viewBox="0 0 600 300" fill="none">
                  <ellipse
                    cx="300"
                    cy="150"
                    rx="280"
                    ry="135"
                    className="local-circle-path"
                    stroke="#B5480F"
                    strokeWidth="1.5"
                    strokeDasharray="6 6"
                  />
                </svg>
                {/* 10 km caption tag */}
                <div className="absolute -top-3 right-1/4 bg-[#FAF8F5] dark:bg-[#0E0C0A] px-2 py-0.5 border border-[#B5480F]/40 rounded-full font-mono text-3xs uppercase tracking-widest text-[#B5480F] dark:text-[#F4A25B] font-bold shadow-xs">
                  Within 10 km
                </div>
              </div>

              {/* Giant Scattered Letters */}
              <div
                className="flex items-center justify-center font-serif font-black tracking-tighter leading-none text-stone-950 dark:text-stone-50 select-none text-[clamp(4.5rem,13vw,11rem)]"
                aria-label="LOCAL"
              >
                {["L", "O", "C", "A", "L"].map((char, i) => (
                  <span
                    key={i}
                    className="local-letter inline-block transform-gpu origin-center px-[0.02em]"
                    aria-hidden="true"
                  >
                    {char}
                  </span>
                ))}
              </div>
            </div>

            {/* Editorial Pull-Copy Column */}
            <div className="local-copy opacity-0 translate-y-6 mt-8 max-w-md text-left self-end mr-8 lg:mr-16">
              <div className="w-8 h-px bg-[#B5480F] mb-3" />
              <p className="font-serif text-lg lg:text-xl text-stone-700 dark:text-stone-300 leading-snug">
                Every match is within <span className="text-[#B5480F] dark:text-[#F4A25B] font-bold">10 km</span>, so help stays right inside your neighbourhood.
              </p>
            </div>
          </div>

          {/* ── ACT 2: DIRECT ── */}
          <div className="act-direct opacity-0 absolute inset-0 flex flex-col justify-center pointer-events-none z-10 px-4">
            <div className="relative w-full max-w-6xl mx-auto flex items-center justify-between">
              
              {/* Giant DIRECT word */}
              <div
                className="direct-word font-serif font-black tracking-tighter leading-none text-stone-950 dark:text-stone-50 select-none text-[clamp(4.5rem,13vw,11rem)]"
                aria-label="DIRECT"
              >
                DIRECT
              </div>

              {/* Obstacles knocked out */}
              <div className="flex flex-col items-start gap-4 mr-6 xl:mr-12" aria-hidden="true">
                <div className="obstacle-warehouses relative font-mono text-xl xl:text-2xl text-stone-400 dark:text-stone-600 font-semibold tracking-wide">
                  <span>warehouses</span>
                  <div className="strike-warehouses absolute top-1/2 left-0 right-0 h-[2px] bg-[#B5480F] scale-x-0 origin-left" />
                </div>
                <div className="obstacle-middlemen relative font-mono text-xl xl:text-2xl text-stone-400 dark:text-stone-600 font-semibold tracking-wide">
                  <span>middlemen</span>
                  <div className="strike-middlemen absolute top-1/2 left-0 right-0 h-[2px] bg-[#B5480F] scale-x-0 origin-left" />
                </div>
              </div>

              {/* Laser line through DIRECT */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true">
                <svg className="w-full h-8 overflow-visible" viewBox="0 0 1000 30" fill="none">
                  <line
                    x1="0"
                    y1="15"
                    x2="1000"
                    y2="15"
                    className="direct-line-path"
                    stroke="#B5480F"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {/* Editorial Pull-Copy */}
            <div className="direct-copy opacity-0 translate-y-6 mt-8 max-w-lg text-left ml-4 lg:ml-12">
              <div className="w-8 h-px bg-[#B5480F] mb-3" />
              <p className="font-serif text-lg lg:text-xl text-stone-700 dark:text-stone-300 leading-snug">
                Items go straight from donor to the person or NGO who asked.{" "}
                <span className="text-[#B5480F] dark:text-[#F4A25B] font-bold">
                  No warehouses, no middlemen.
                </span>
              </p>
            </div>
          </div>

          {/* ── ACT 3: DIGNIFIED ── */}
          <div className="act-dignified opacity-0 absolute inset-0 flex flex-col justify-end pb-8 pointer-events-none z-10 px-4">
            <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
              
              {/* Giant DIGNIFIED word (rising upright) */}
              <div
                className="font-serif font-black tracking-tighter leading-none text-stone-950 dark:text-stone-50 select-none text-[clamp(3.8rem,11.5vw,9.5rem)] flex items-end [perspective:800px]"
                aria-label="DIGNIFIED"
              >
                {["D", "I", "G", "N", "I", "F", "I", "E", "D"].map((char, i) => (
                  <span
                    key={i}
                    className="dignified-letter inline-block transform-gpu origin-bottom px-[0.01em]"
                    aria-hidden="true"
                  >
                    {char}
                  </span>
                ))}
              </div>

              {/* Editorial Pull-Copy with Privacy Bar */}
              <div className="dignified-copy opacity-0 translate-y-6 max-w-md text-left mb-2">
                <div className="w-8 h-px bg-[#B5480F] mb-3" />
                <p className="font-serif text-lg lg:text-xl text-stone-700 dark:text-stone-300 leading-snug">
                  People ask for exactly what they need, without public begging or{" "}
                  <span className="relative inline-block whitespace-nowrap">
                    <span className="relative z-10">sharing their story.</span>
                    {/* Soft orange privacy bar */}
                    <span
                      className="privacy-bar absolute inset-y-0 -inset-x-1 bg-[#B5480F]/25 dark:bg-[#F4A25B]/30 rounded-sm z-0 pointer-events-none"
                      aria-hidden="true"
                    />
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* ── FINALE: MANIFESTO LOCKUP ── */}
          <div
            ref={finaleLockupRef}
            className="act-finale opacity-0 absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none z-20 px-4"
          >
            {/* Header statement */}
            <p className="finale-line font-mono text-xs sm:text-sm font-bold tracking-[0.2em] text-stone-500 dark:text-stone-400 uppercase mb-4">
              Giving should be
            </p>

            {/* Giant 3-Word Stacked Typography with Magnetic Letter Interaction */}
            <div className="flex flex-col items-center justify-center font-serif font-black tracking-tighter leading-[0.92] text-stone-950 dark:text-stone-50 text-[clamp(3.2rem,8.5vw,7.5rem)] select-none">
              
              {/* LOCAL */}
              <div
                className="finale-line relative group cursor-pointer pointer-events-auto py-0.5"
                onMouseEnter={() => setHoveredWord("LOCAL")}
                onMouseLeave={() => setHoveredWord(null)}
                aria-label="LOCAL."
              >
                {["L", "O", "C", "A", "L", "."].map((char, i) => (
                  <span
                    key={i}
                    className={`mag-char inline-block transition-colors duration-200 ${
                      hoveredWord === "LOCAL" ? "text-[#B5480F] dark:text-[#F4A25B]" : ""
                    }`}
                    aria-hidden="true"
                  >
                    {char}
                  </span>
                ))}
                <div
                  className={`absolute bottom-0 left-0 right-0 h-[3px] bg-[#B5480F] dark:bg-[#F4A25B] transition-transform duration-300 origin-left ${
                    hoveredWord === "LOCAL" ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </div>

              {/* DIRECT */}
              <div
                className="finale-line relative group cursor-pointer pointer-events-auto py-0.5"
                onMouseEnter={() => setHoveredWord("DIRECT")}
                onMouseLeave={() => setHoveredWord(null)}
                aria-label="DIRECT."
              >
                {["D", "I", "R", "E", "C", "T", "."].map((char, i) => (
                  <span
                    key={i}
                    className={`mag-char inline-block transition-colors duration-200 ${
                      hoveredWord === "DIRECT" ? "text-[#B5480F] dark:text-[#F4A25B]" : ""
                    }`}
                    aria-hidden="true"
                  >
                    {char}
                  </span>
                ))}
                <div
                  className={`absolute bottom-0 left-0 right-0 h-[3px] bg-[#B5480F] dark:bg-[#F4A25B] transition-transform duration-300 origin-left ${
                    hoveredWord === "DIRECT" ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </div>

              {/* DIGNIFIED */}
              <div
                className="finale-line relative group cursor-pointer pointer-events-auto py-0.5"
                onMouseEnter={() => setHoveredWord("DIGNIFIED")}
                onMouseLeave={() => setHoveredWord(null)}
                aria-label="DIGNIFIED."
              >
                {["D", "I", "G", "N", "I", "F", "I", "E", "D", "."].map((char, i) => (
                  <span
                    key={i}
                    className={`mag-char inline-block transition-colors duration-200 ${
                      hoveredWord === "DIGNIFIED" ? "text-[#B5480F] dark:text-[#F4A25B]" : ""
                    }`}
                    aria-hidden="true"
                  >
                    {char}
                  </span>
                ))}
                <div
                  className={`absolute bottom-0 left-0 right-0 h-[3px] bg-[#B5480F] dark:bg-[#F4A25B] transition-transform duration-300 origin-left ${
                    hoveredWord === "DIGNIFIED" ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </div>
            </div>

            {/* Closing Line with Hairline Rule */}
            <div className="finale-line flex flex-col items-center mt-6">
              <div className="finale-rule w-16 h-px bg-[#B5480F] dark:bg-[#F4A25B] mb-4" />
              <p className="font-serif italic text-lg sm:text-xl md:text-2xl text-stone-700 dark:text-stone-300">
                This is the CauseKind way.
              </p>
            </div>
          </div>

        </div>

        {/* BOTTOM EDITORIAL FOOTER */}
        <div className="relative z-30 flex items-center justify-between w-full border-t border-stone-200/90 dark:border-stone-800/80 pt-3 text-3xs font-mono uppercase tracking-widest text-stone-400 dark:text-stone-500">
          <span>01 / ZERO MIDDLEMEN</span>
          <span className="hidden sm:inline">100% IN-KIND</span>
          <span>02 / ZERO CASH</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE / TABLET UNPINNED FLOW (<1024px)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden w-full px-5 sm:px-8 py-16 flex flex-col gap-16">
        
        {/* Header Badge */}
        <div className="border-b border-stone-200 dark:border-stone-800 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xs font-black uppercase tracking-[0.2em] text-[#B5480F] dark:text-[#F4A25B]">
              WHY WE EXIST
            </span>
            <div className="w-8 h-px bg-[#B5480F]/40" />
          </div>
          <span className="font-mono text-3xs text-stone-500 uppercase tracking-widest">
            MANIFESTO
          </span>
        </div>

        {/* Statement Intro */}
        <div className="mobile-manifesto-block">
          <p className="font-serif italic text-lg text-stone-500 dark:text-stone-400 mb-1">
            Giving should be…
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-stone-950 dark:text-stone-50 tracking-tight leading-tight">
            Local, direct and dignified.
          </h2>
        </div>

        {/* Block 1: LOCAL */}
        <div className="mobile-manifesto-block border-l-2 border-[#B5480F] pl-5 sm:pl-6 py-2">
          <span className="font-mono text-3xs uppercase tracking-widest text-[#B5480F] dark:text-[#F4A25B] font-bold block mb-1">
            01 / PROXIMITY
          </span>
          <h3 className="font-serif font-black text-4xl sm:text-5xl tracking-tighter text-stone-950 dark:text-stone-50 mb-3">
            LOCAL.
          </h3>
          <p className="font-serif text-base sm:text-lg text-stone-700 dark:text-stone-300 leading-relaxed max-w-md">
            Every match is within <span className="text-[#B5480F] dark:text-[#F4A25B] font-bold">10 km</span>, so help stays right in your neighbourhood.
          </p>
        </div>

        {/* Block 2: DIRECT */}
        <div className="mobile-manifesto-block border-l-2 border-[#B5480F] pl-5 sm:pl-6 py-2">
          <span className="font-mono text-3xs uppercase tracking-widest text-[#B5480F] dark:text-[#F4A25B] font-bold block mb-1">
            02 / ZERO INTERMEDIARIES
          </span>
          <h3 className="font-serif font-black text-4xl sm:text-5xl tracking-tighter text-stone-950 dark:text-stone-50 mb-3">
            DIRECT.
          </h3>
          
          <div className="flex items-center gap-4 text-xs font-mono text-stone-400 mb-3" aria-hidden="true">
            <span className="relative">
              warehouses
              <span className="mobile-strike-warehouses absolute top-1/2 left-0 right-0 h-[1.5px] bg-[#B5480F] scale-x-0 origin-left" />
            </span>
            <span className="relative">
              middlemen
              <span className="mobile-strike-middlemen absolute top-1/2 left-0 right-0 h-[1.5px] bg-[#B5480F] scale-x-0 origin-left" />
            </span>
          </div>

          <p className="font-serif text-base sm:text-lg text-stone-700 dark:text-stone-300 leading-relaxed max-w-md">
            Items go straight from donor to the person or NGO who asked.{" "}
            <span className="text-[#B5480F] dark:text-[#F4A25B] font-bold">
              No warehouses, no middlemen.
            </span>
          </p>
        </div>

        {/* Block 3: DIGNIFIED */}
        <div className="mobile-manifesto-block border-l-2 border-[#B5480F] pl-5 sm:pl-6 py-2">
          <span className="font-mono text-3xs uppercase tracking-widest text-[#B5480F] dark:text-[#F4A25B] font-bold block mb-1">
            03 / PRIVACY FIRST
          </span>
          <h3 className="font-serif font-black text-4xl sm:text-5xl tracking-tighter text-stone-950 dark:text-stone-50 mb-3">
            DIGNIFIED.
          </h3>
          <p className="font-serif text-base sm:text-lg text-stone-700 dark:text-stone-300 leading-relaxed max-w-md">
            People ask for exactly what they need, without public begging or{" "}
            <span className="bg-[#B5480F]/20 dark:bg-[#F4A25B]/25 px-1 py-0.5 rounded-sm">
              sharing their story.
            </span>
          </p>
        </div>

        {/* Closing Lockup on Mobile */}
        <div className="mobile-manifesto-block border-t border-stone-200 dark:border-stone-800 pt-8 text-center flex flex-col items-center">
          <div className="w-10 h-px bg-[#B5480F] mb-4" />
          <p className="font-serif italic text-xl sm:text-2xl text-stone-900 dark:text-stone-100 font-bold mb-1">
            This is the CauseKind way.
          </p>
          <span className="font-mono text-3xs tracking-widest text-stone-400 uppercase">
            EST. 2025 • DIRECT GIVING
          </span>
        </div>

      </div>
    </section>
  );
}
