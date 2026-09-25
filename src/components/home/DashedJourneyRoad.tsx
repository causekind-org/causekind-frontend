"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Heart, Package } from "lucide-react";

interface Milestone {
  id: string;
  name: string;
  y: number;
}

const SECTION_IDS = [
  { id: "about-causekind", name: "About CauseKind" },
  { id: "problem-solution-section", name: "The Problem & Solution" },
  { id: "how-it-works", name: "How It Works" },
  { id: "where-support-goes", name: "Where Support Goes" },
  { id: "live-needs-section", name: "Live Needs" },
  { id: "trust", name: "Trust & Safety" },
  { id: "founders-note", name: "Founder's Note" },
  { id: "join", name: "Join CauseKind" },
];

export function DashedJourneyRoad() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const trackPathRef = useRef<SVGPathElement>(null);
  const headMarkerRef = useRef<HTMLDivElement>(null);
  const heartMarkerRef = useRef<HTMLDivElement>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [roadHeight, setRoadHeight] = useState(4000);
  const [pathData, setPathData] = useState("");
  const [activeMilestones, setActiveMilestones] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mm = gsap.matchMedia();

    mm.add("(min-width: 1280px)", () => {
      const container = containerRef.current;
      if (!container) return;

      const calculatePath = () => {
        const parent = container.parentElement;
        if (!parent) return;

        const parentRect = parent.getBoundingClientRect();
        const totalHeight = parent.scrollHeight;
        const screenWidth = window.innerWidth;
        
        // Calculate gutter X position (just outside the max-w-6xl 1152px content column)
        const contentWidth = Math.min(1152, screenWidth - 80);
        const contentLeft = (screenWidth - contentWidth) / 2;
        const gutterX = Math.max(28, contentLeft - 36);

        const newMilestones: Milestone[] = [];

        SECTION_IDS.forEach(({ id, name }) => {
          const el = document.getElementById(id);
          if (el) {
            // Find vertical position relative to the home page container
            const elRect = el.getBoundingClientRect();
            const relativeY = elRect.top - parentRect.top + 80;
            newMilestones.push({ id, name, y: relativeY });
          }
        });

        if (newMilestones.length < 2) return;

        setRoadHeight(totalHeight);
        setMilestones(newMilestones);

        // Construct a smooth SVG path running down the left gutter
        const startY = Math.max(60, newMilestones[0].y - 40);

        let d = `M ${gutterX} ${startY}`;

        for (let i = 0; i < newMilestones.length; i++) {
          const curr = newMilestones[i];
          const next = newMilestones[i + 1];

          if (next) {
            const midY = (curr.y + next.y) / 2;
            // Subtle gentle curve oscillation between sections (shifts by +/- 10px)
            const curveOffset = i % 2 === 0 ? 8 : -8;
            d += ` C ${gutterX + curveOffset} ${curr.y + 40}, ${gutterX + curveOffset} ${midY}, ${gutterX} ${next.y}`;
          }
        }

        setPathData(d);

        // Setup GSAP ScrollTrigger Scrub
        requestAnimationFrame(() => {
          const pathEl = pathRef.current;
          if (!pathEl) return;

          const totalLength = pathEl.getTotalLength();
          pathEl.style.strokeDasharray = `${totalLength} ${totalLength}`;
          pathEl.style.strokeDashoffset = prefersReducedMotion ? "0" : `${totalLength}`;

          if (prefersReducedMotion) {
            return;
          }

          // Master Road Scrub Animation
          ScrollTrigger.create({
            trigger: parent,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.6,
            onUpdate: (self) => {
              const progress = self.progress;
              const currentOffset = totalLength * (1 - progress);
              pathEl.style.strokeDashoffset = `${currentOffset}`;

              // Position head marker along the path
              if (headMarkerRef.current) {
                const point = pathEl.getPointAtLength(progress * totalLength);
                headMarkerRef.current.style.transform = `translate3d(${point.x - 14}px, ${point.y - 14}px, 0)`;
                headMarkerRef.current.style.opacity = progress > 0.01 && progress < 0.98 ? "1" : "0";
              }

              // Update active milestone nodes
              const currentY = progress * totalHeight;
              const newActive: Record<string, boolean> = {};
              newMilestones.forEach((m) => {
                if (currentY >= m.y - 150) {
                  newActive[m.id] = true;
                }
              });
              setActiveMilestones(newActive);

              // Light up Final Heart node when reaching the bottom
              if (heartMarkerRef.current) {
                if (progress >= 0.92) {
                  heartMarkerRef.current.classList.add("text-[#B5480F]", "scale-125");
                  heartMarkerRef.current.classList.remove("text-stone-300", "dark:text-stone-700");
                } else {
                  heartMarkerRef.current.classList.remove("text-[#B5480F]", "scale-125");
                  heartMarkerRef.current.classList.add("text-stone-300", "dark:text-stone-700");
                }
              }
            },
          });
        });
      };

      calculatePath();

      // Recalculate on window resize and font load
      window.addEventListener("resize", calculatePath);
      ScrollTrigger.addEventListener("refresh", calculatePath);

      const timer = setTimeout(calculatePath, 500);

      return () => {
        window.removeEventListener("resize", calculatePath);
        ScrollTrigger.removeEventListener("refresh", calculatePath);
        clearTimeout(timer);
      };
    });

    return () => {
      mm.revert();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 hidden xl:block overflow-hidden transition-opacity duration-300"
      style={{ height: roadHeight }}
    >
      <svg
        className="w-full h-full"
        style={{ minHeight: roadHeight }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="ck-road-glow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#B5480F" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#0F7A6C" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#B5480F" stopOpacity="0.9" />
          </linearGradient>
          <filter id="road-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Background Track (faint dotted path) */}
        {pathData && (
          <path
            ref={trackPathRef}
            d={pathData}
            fill="none"
            stroke="currentColor"
            className="text-stone-200 dark:text-stone-850/60"
            strokeWidth="2"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />
        )}

        {/* 2. Active Animated Dashed Road */}
        {pathData && (
          <path
            ref={pathRef}
            d={pathData}
            fill="none"
            stroke="url(#ck-road-glow)"
            strokeWidth="3"
            strokeDasharray="6 6"
            strokeLinecap="round"
            className="transition-all duration-75"
          />
        )}
      </svg>

      {/* 3. Milestone Nodes */}
      {milestones.map((m) => {
        const isActive = activeMilestones[m.id];
        const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1440;
        const contentWidth = Math.min(1152, screenWidth - 80);
        const contentLeft = (screenWidth - contentWidth) / 2;
        const gutterX = Math.max(28, contentLeft - 36);

        const isFinal = m.id === "join";

        return (
          <div
            key={m.id}
            className="absolute transition-all duration-500 flex items-center justify-center pointer-events-none"
            style={{
              left: `${gutterX}px`,
              top: `${m.y}px`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {isFinal ? (
              <div
                ref={heartMarkerRef}
                className="transition-all duration-500 text-stone-300 dark:text-stone-700 drop-shadow-md"
              >
                <Heart className="w-6 h-6 fill-current" />
              </div>
            ) : (
              <div className="relative flex items-center justify-center">
                {/* Active Ripple */}
                {isActive && (
                  <span className="absolute w-6 h-6 rounded-full bg-[#B5480F]/20 dark:bg-[#F4A25B]/25 animate-ping" />
                )}
                {/* Node Disc */}
                <div
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
                    isActive
                      ? "bg-[#B5480F] border-white dark:border-[#140E0B] shadow-[0_0_10px_rgba(181,72,15,0.6)] scale-110"
                      : "bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-750 scale-90"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* 4. Traveling Head Parcel / Dot Indicator */}
      <div
        ref={headMarkerRef}
        className="absolute top-0 left-0 w-7 h-7 rounded-full bg-[#B5480F] text-white flex items-center justify-center shadow-[0_0_14px_rgba(181,72,15,0.7)] transition-opacity duration-200 pointer-events-none z-10"
        style={{ opacity: 0 }}
      >
        <Package className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}
