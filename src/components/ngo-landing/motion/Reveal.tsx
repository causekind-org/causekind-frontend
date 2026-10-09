"use client";

import React, { useRef } from "react";
import { useGsapScene } from "./useGsapScene";
import gsap from "gsap";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  y?: number;
  ease?: string;
}

export function Reveal({ children, className, delay = 0, duration = 0.8, y = 30, ease = "power3.out" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGsapScene(ref, () => {
    gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        ref.current,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          delay,
          ease,
          scrollTrigger: {
            trigger: ref.current,
            start: "top 85%",
          },
        }
      );
    });
    
    // In reduced motion, we let the element render naturally without opacity: 0
    gsap.matchMedia().add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(ref.current, { opacity: 1, y: 0 });
    });
  });

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
