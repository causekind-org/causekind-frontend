"use client";

import React, { useRef } from "react";
import { useGsapScene } from "./useGsapScene";
import gsap from "gsap";

interface CountUpProps {
  end: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function CountUp({ end, duration = 1.5, className, prefix = "", suffix = "" }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useGsapScene(ref, (ctx, mm) => {
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: end,
        duration,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
        },
        onUpdate: () => {
          if (ref.current) {
            ref.current.innerText = `${prefix}${Math.floor(obj.val)}${suffix}`;
          }
        },
      });
    });
    
    mm.add("(prefers-reduced-motion: reduce)", () => {
      if (ref.current) ref.current.innerText = `${prefix}${end}${suffix}`;
    });
  }, [end, prefix, suffix]);

  return (
    <span ref={ref} className={className}>
      {/* Fallback starting text for reduced motion will be overridden */}
      {prefix}0{suffix}
    </span>
  );
}
