"use client";

import React, { useRef } from "react";
import { useGsapScene } from "./useGsapScene";
import gsap from "gsap";
import { cn } from "@/lib/utils";

interface SplitHeadlineProps {
  text: string;
  className?: string;
  stagger?: number;
  delay?: number;
}

export function SplitHeadline({ text, className, stagger = 0.05, delay = 0 }: SplitHeadlineProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const words = text.split(" ");

  useGsapScene(ref, (ctx, mm) => {
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const chars = ctx.selector?.(".split-word");
      if (chars) {
        gsap.fromTo(
          chars,
          { opacity: 0, y: 15, rotateX: -20 },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            duration: 0.8,
            delay,
            stagger,
            ease: "expo.out",
            scrollTrigger: {
              trigger: ref.current,
              start: "top 90%",
            },
          }
        );
      }
    });
    
    mm.add("(prefers-reduced-motion: reduce)", () => {
      const chars = ctx.selector?.(".split-word");
      if (chars) gsap.set(chars, { opacity: 1, y: 0, rotateX: 0 });
    });
  });

  return (
    <h2 ref={ref} className={cn("inline-flex flex-wrap gap-x-2 perspective-[1000px]", className)}>
      {words.map((word, i) => (
        <span key={i} className="split-word inline-block opacity-0" style={{ transformOrigin: "bottom" }}>
          {word}
        </span>
      ))}
    </h2>
  );
}
