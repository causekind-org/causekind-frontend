"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function Chapter1TheHome() {
  const chapterRef = useRef<HTMLElement>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Note: The parent CinematicOrchestrator manages the GSAP context scope,
    // so we can safely register ScrollTriggers here and they will be cleaned up.
    
    // 1. Position the global protagonist box exactly where the "dummy" shelf box would be.
    // The global box starts at top: 50%, left: 50%.
    // We want it to start on the shelf in Chapter 1.
    // Let's assume the shelf is around y: 20vh, x: -20vw from center.
    
    // We use a timeline pinned to this chapter to animate the room and the box.
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: chapterRef.current,
        start: "top top",
        end: "+=150%", // Scroll distance for this chapter
        pin: true,
        scrub: 1, // Smooth scrubbing
      }
    });

    // Initial State: Box is on the shelf, visible.
    // (We set it here so it immediately snaps to the shelf when this component mounts)
    gsap.set(".ck-protagonist-box", {
      opacity: 1,
      x: "-25vw",
      y: "15vh",
      rotation: -5,
      scale: 0.7,
    });

    // Animation Sequence:
    // Room fades back and scales down
    tl.to(roomRef.current, {
      scale: 0.85,
      opacity: 0.2,
      filter: "blur(8px)",
      duration: 1,
    }, 0);

    // Box lifts off the shelf, straightens out, and centers in the viewport
    tl.to(".ck-protagonist-box", {
      x: "0vw",
      y: "0vh",
      rotation: 0,
      scale: 1,
      duration: 1,
      ease: "power2.inOut",
    }, 0);

    // Text fades in as the box centers
    tl.fromTo(".ck-chapter1-text", {
      opacity: 0,
      y: 30,
    }, {
      opacity: 1,
      y: 0,
      duration: 0.5,
    }, 0.5);

    // Hold the state for a bit at the end of the scroll before moving to Chapter 2
    tl.to(".ck-chapter1-text", { opacity: 0, duration: 0.3 }, 1.2);

  }, []);

  return (
    <section ref={chapterRef} className="relative w-full h-[100svh] overflow-hidden flex items-center justify-center">
      
      {/* ── The Environment (Room/Shelf) ── */}
      <div ref={roomRef} className="absolute inset-0 w-full h-full flex items-center justify-center origin-center">
        {/* We use a stylized SVG illustration for the shelf. */}
        <div className="relative w-full max-w-4xl aspect-[16/9] opacity-80">
          <svg viewBox="0 0 800 450" className="w-full h-full drop-shadow-2xl text-[var(--ck-home-ink,#b04a15)]">
            <defs>
              <pattern id="dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="currentColor" opacity="0.1" />
              </pattern>
              <linearGradient id="wall-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--ck-home-soft, #fed7aa)" stopOpacity="0.1" />
                <stop offset="100%" stopColor="var(--ck-home-soft, #fed7aa)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Background wall & grid */}
            <rect width="800" height="450" fill="url(#wall-grad)" />
            <rect width="800" height="450" fill="url(#dot-grid)" />

            {/* A modern, minimal Indian shelf (books, a plant, a framed photo) */}
            {/* Shelf board */}
            <rect x="100" y="320" width="600" height="12" rx="6" fill="currentColor" opacity="0.8" />
            <rect x="120" y="332" width="20" height="40" rx="3" fill="currentColor" opacity="0.4" />
            <rect x="660" y="332" width="20" height="40" rx="3" fill="currentColor" opacity="0.4" />

            {/* Potted Plant */}
            <path d="M 600 320 Q 580 250 630 220 Q 640 280 600 320" fill="currentColor" opacity="0.5" />
            <path d="M 600 320 Q 650 260 670 280 Q 640 310 600 320" fill="currentColor" opacity="0.7" />
            <rect x="585" y="290" width="30" height="30" rx="4" fill="currentColor" opacity="0.9" />

            {/* Books */}
            <rect x="180" y="240" width="25" height="80" rx="2" fill="currentColor" opacity="0.6" />
            <rect x="210" y="230" width="20" height="90" rx="2" fill="currentColor" opacity="0.5" />
            <rect x="235" y="250" width="30" height="70" rx="2" fill="currentColor" opacity="0.7" />
            
            {/* Leaning book */}
            <g transform="translate(270, 260) rotate(15)">
              <rect x="0" y="0" width="25" height="70" rx="2" fill="currentColor" opacity="0.4" />
            </g>

            {/* Picture Frame */}
            <rect x="450" y="250" width="60" height="70" rx="4" fill="currentColor" opacity="0.6" stroke="currentColor" strokeWidth="4" />
            <circle cx="480" cy="285" r="15" fill="var(--surface-cream, #faf8f5)" opacity="0.5" />
            
            {/* The Empty Space (where the global box will visually sit at start) */}
            {/* We leave x: ~300 to ~400 empty on the shelf for the box */}
            <path d="M 250 400 L 550 400" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" opacity="0.2" />
          </svg>
        </div>
      </div>

      {/* ── Narrative Text ── */}
      <div className="ck-chapter1-text absolute z-10 text-center max-w-2xl px-6 pointer-events-none mt-40">
        <h2 className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tight text-stone-900 dark:text-white leading-[1.05] drop-shadow-sm">
          It starts with a simple realization.
        </h2>
        <p className="mt-6 text-lg md:text-xl text-stone-600 dark:text-stone-300 font-medium">
          Something you no longer use, sitting quietly on a shelf.
        </p>
      </div>

    </section>
  );
}
