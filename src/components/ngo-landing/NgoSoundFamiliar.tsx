"use client";

import React, { useRef } from "react";
import { useGsapScene } from "./motion/useGsapScene";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function NgoSoundFamiliar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useGsapScene(containerRef, (ctx, mm) => {
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      // Pin the whole section
      ScrollTrigger.create({
        trigger: triggerRef.current,
        start: "top top",
        end: "+=1500", // scroll duration
        pin: true,
        scrub: 1,
        animation: gsap.timeline()
          // Animate left side out (chaotic messages fade out)
          .to(leftColRef.current, { opacity: 0.2, scale: 0.95, duration: 1 }, 0)
          // Animate right side in (clean card assembles)
          .fromTo(rightColRef.current, 
            { opacity: 0, x: 50 },
            { opacity: 1, x: 0, duration: 1 }, 0.5)
      });
    });
  });

  return (
    <section ref={containerRef} className="py-24 bg-stone-50 dark:bg-black overflow-hidden relative">
      <div ref={triggerRef} className="w-full max-w-7xl mx-auto px-6 h-full flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24">
        
        {/* Left: Chaotic Messages */}
        <div ref={leftColRef} className="w-full md:w-1/2 flex flex-col gap-6 relative">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-4">
            Sound familiar?
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 rounded-tl-none w-[85%]">
              <p className="text-stone-800 dark:text-stone-200">"We need 50 blankets by tomorrow!"</p>
            </div>
            <div className="p-4 bg-stone-100 dark:bg-zinc-800 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 self-end rounded-tr-none w-[75%] ml-auto">
              <p className="text-stone-800 dark:text-stone-200">"I can give 5, where to drop?"</p>
            </div>
            <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 rounded-tl-none w-[90%]">
              <p className="text-stone-800 dark:text-stone-200">"Wait, who is collecting? Is it verified?"</p>
            </div>
          </div>
        </div>

        {/* Right: Clean Verified Card */}
        <div ref={rightColRef} className="w-full md:w-1/2 flex flex-col gap-6">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-4 text-left md:text-right">
            The CauseKind Way
          </h2>
          <div className="glass-card p-8 rounded-3xl border border-stone-200 dark:border-zinc-800 shadow-xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl relative">
            <div className="absolute -top-4 -right-4 w-12 h-12 bg-[var(--color-ngo-500)] rounded-full flex items-center justify-center text-white shadow-lg">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Winter Blanket Drive</h3>
            <p className="text-stone-500 dark:text-stone-400 text-sm mb-6">Verified NGO • 10km radius</p>
            <div className="w-full bg-stone-100 dark:bg-zinc-800 rounded-full h-2 mb-2">
              <div className="bg-[var(--color-ngo-500)] h-2 rounded-full w-3/4"></div>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span>38 Pledged</span>
              <span>50 Needed</span>
            </div>
          </div>
        </div>
        
      </div>
    </section>
  );
}
