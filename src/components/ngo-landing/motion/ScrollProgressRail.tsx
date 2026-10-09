"use client";

import React, { useRef } from "react";
import { useGsapScene } from "./useGsapScene";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface ScrollProgressRailProps {
  className?: string;
  targetRef?: React.RefObject<Element | null>;
  labels?: { text: string; top: string }[];
}

export function ScrollProgressRail({ className, targetRef, labels: customLabels }: ScrollProgressRailProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("NgoLanding");

  const defaultLabels = [
    { text: "Intro", top: "0%" },
    { text: "The Problem", top: "25%" },
    { text: "The Journey", top: "50%" },
    { text: "Verification", top: "75%" },
    { text: "Ready", top: "95%" },
  ];
  
  const labels = customLabels || defaultLabels;

  useGsapScene(barRef, (ctx, mm) => {
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      gsap.to(barRef.current, {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: targetRef?.current || document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.1,
        },
      });
    });
  }, [targetRef]);

  return (
    <div className={cn("hidden md:block fixed right-6 top-[20%] bottom-[20%] w-1 bg-stone-200 dark:bg-zinc-800 rounded-full z-50", className)}>
      <div 
        ref={barRef}
        className="w-full h-full bg-[var(--color-ngo-500)] origin-top scale-y-0 rounded-full"
      />
      
      {/* Chapter Labels */}
      {labels.map((label, i) => (
        <div 
          key={i}
          className="absolute right-4 -translate-y-1/2 flex items-center gap-2 group"
          style={{ top: label.top }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 group-hover:text-stone-900 dark:group-hover:text-stone-100 transition-colors whitespace-nowrap">
            {label.text}
          </span>
          <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-zinc-700 group-hover:bg-[var(--color-ngo-500)] transition-colors" />
        </div>
      ))}
    </div>
  );
}
