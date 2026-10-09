"use client";

import React, { useRef } from "react";
import { useGsapScene } from "./useGsapScene";
import gsap from "gsap";
import { cn } from "@/lib/utils";

interface ScrollProgressRailProps {
  className?: string;
  targetRef?: React.RefObject<Element | null>;
}

export function ScrollProgressRail({ className, targetRef }: ScrollProgressRailProps) {
  const barRef = useRef<HTMLDivElement>(null);

  useGsapScene(barRef, (ctx, mm) => {
    mm.add("(prefers-reduced-motion: no-preference)", () => {
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
    <div className={cn("fixed right-4 top-1/4 bottom-1/4 w-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden z-50", className)}>
      <div 
        ref={barRef}
        className="w-full h-full bg-[var(--color-ngo-500)] origin-top scale-y-0"
      />
    </div>
  );
}
