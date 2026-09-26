"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Heart } from "lucide-react";

interface Milestone {
  id: string;
  name: string;
  y: number;
}

const WAY_SECTION_IDS = [
  { id: "way-hero", name: "The CauseKind Way" },
  { id: "our-mission", name: "Why We Exist" },
  { id: "problem-solution-section", name: "Problem & Solution" },
  { id: "where-support-goes", name: "Where Support Goes" },
  { id: "verification", name: "Verification" },
  { id: "the-handover", name: "The Handover" },
  { id: "what-you-can-give", name: "What You Can Give" },
  { id: "who-its-for", name: "Who It's For" },
  { id: "where-we-are", name: "Where We Are" },
  { id: "way-final-cta", name: "Get Started" },
];

export function WayVerticalRoad() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
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

        const contentWidth = Math.min(1152, screenWidth - 80);
        const contentLeft = (screenWidth - contentWidth) / 2;
        const gutterX = Math.max(28, contentLeft - 36);

        const newMilestones: Milestone[] = [];

        WAY_SECTION_IDS.forEach(({ id, name }) => {
          const el = document.getElementById(id);
          if (el) {
            const elRect = el.getBoundingClientRect();
            const relativeY = elRect.top - parentRect.top + 80;
            newMilestones.push({ id, name, y: relativeY });
          }
        });

        if (newMilestones.length < 2) return;

        setRoadHeight(totalHeight);
        setMilestones(newMilestones);

        const startY = Math.max(60, newMilestones[0].y - 40);
        let d = `M ${gutterX} ${startY}`;

        for (let i = 0; i < newMilestones.length; i++) {
          const curr = newMilestones[i];
          const next = newMilestones[i + 1];

          if (next) {
            const midY = (curr.y + next.y) / 2;
            const curveOffset = i % 2 === 0 ? 8 : -8;
            d += ` C ${gutterX + curveOffset} ${curr.y + 40}, ${gutterX + curveOffset} ${midY}, ${gutterX} ${next.y}`;
          }
        }

        setPathData(d);

        requestAnimationFrame(() => {
          const pathEl = pathRef.current;
          if (!pathEl) return;

          const pathLen = pathEl.getTotalLength();
          gsap.set(pathEl, { strokeDasharray: pathLen, strokeDashoffset: pathLen });

          if (!prefersReducedMotion) {
            gsap.to(pathEl, {
              strokeDashoffset: 0,
              ease: "none",
              scrollTrigger: {
                trigger: parent,
                start: "top top",
                end: "bottom bottom",
                scrub: 0.5,
                onUpdate: (self) => {
                  const scrollProgress = self.progress;
                  const newActive: Record<string, boolean> = {};
                  newMilestones.forEach((m, idx) => {
                    const ratio = m.y / totalHeight;
                    newActive[m.id] = scrollProgress >= ratio - 0.05;
                  });
                  setActiveMilestones(newActive);
                },
              },
            });
          }
        });
      };

      const timer = setTimeout(calculatePath, 500);
      window.addEventListener("resize", calculatePath);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("resize", calculatePath);
      };
    });

    return () => {
      mm.revert();
    };
  }, []);

  if (milestones.length < 2) return null;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="hidden xl:block absolute inset-0 pointer-events-none z-10 select-none overflow-hidden"
      style={{ height: roadHeight }}
    >
      <svg
        className="w-full h-full overflow-visible"
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: roadHeight }}
      >
        {/* Background Faint Track */}
        {pathData && (
          <path
            d={pathData}
            fill="none"
            stroke="rgba(181, 72, 15, 0.12)"
            strokeWidth="2"
            strokeDasharray="5 7"
            strokeLinecap="round"
          />
        )}

        {/* Animated Drawing Track */}
        {pathData && (
          <path
            ref={pathRef}
            d={pathData}
            fill="none"
            stroke="#B5480F"
            strokeWidth="2"
            strokeDasharray="5 7"
            strokeLinecap="round"
          />
        )}
      </svg>

      {/* Milestone Dots */}
      {milestones.map((m, idx) => {
        const isActive = activeMilestones[m.id] ?? false;
        const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1440;
        const contentWidth = Math.min(1152, screenWidth - 80);
        const contentLeft = (screenWidth - contentWidth) / 2;
        const gutterX = Math.max(28, contentLeft - 36);

        return (
          <div
            key={m.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 pointer-events-auto group cursor-pointer"
            style={{ left: gutterX, top: m.y }}
            onClick={() => {
              const el = document.getElementById(m.id);
              el?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                isActive
                  ? "bg-[#B5480F] border-[#B5480F] scale-125 shadow-xs"
                  : "bg-[#FAF8F5] dark:bg-[#120C04] border-stone-300 dark:border-stone-700"
              }`}
            >
              {isActive && <span className="w-1 h-1 rounded-full bg-white" />}
            </div>

            {/* Hover Tooltip showing section title */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-stone-900 text-white text-4xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
              {m.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
