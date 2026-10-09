"use client";

import React, { useRef } from "react";
import { useGsapScene } from "./motion/useGsapScene";
import gsap from "gsap";
import { Reveal } from "./motion/Reveal";
import { CheckCircle2 } from "lucide-react";

export function NgoVerificationScan() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scanlineRef = useRef<HTMLDivElement>(null);

  useGsapScene(containerRef, (ctx, mm) => {
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // Setup timeline for the scanline moving down the document
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top center",
          end: "bottom center",
          scrub: 0.5,
        }
      });

      tl.fromTo(scanlineRef.current, 
        { top: "0%", opacity: 0 },
        { top: "100%", opacity: 1, duration: 2, ease: "none" }
      );

      // Pop in highlights as scanline passes them
      gsap.utils.toArray(".doc-highlight").forEach((el: any) => {
        const topPos = parseFloat(el.getAttribute("data-top") || "0");
        tl.to(el, {
          opacity: 1,
          scale: 1,
          duration: 0.2,
          ease: "back.out(1.7)",
        }, (topPos / 100) * 2); // sync with scanline time
      });
    });
  });

  const highlights = [
    { label: "Registration Date", top: 15, left: 20 },
    { label: "Legal Entity Name", top: 30, left: 40 },
    { label: "Authorized Signatory", top: 60, left: 15 },
    { label: "Valid Seal & Stamp", top: 80, left: 60 },
  ];

  return (
    <section ref={containerRef} className="py-32 bg-stone-100 dark:bg-zinc-950 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        <Reveal>
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">What we check at every step</h2>
          <p className="text-xl text-stone-600 dark:text-stone-400 mb-8">
            Our multi-step verification process ensures that only genuine, registered NGOs can connect with givers. We manually review every document.
          </p>
          <ul className="space-y-4">
            {["Trust Deed / Registration Certificate", "Valid 12A / 80G Certificates", "Identity of the Authorized Person", "Recent Bank Statements"].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-lg font-medium">
                <CheckCircle2 className="text-[var(--color-ngo-500)] w-6 h-6 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        <div className="relative w-full max-w-md mx-auto aspect-[3/4] bg-white dark:bg-zinc-900 rounded-sm shadow-2xl border border-stone-200 dark:border-zinc-800 p-8 overflow-hidden">
          {/* Skeleton Document Content */}
          <div className="w-1/3 h-4 bg-stone-200 dark:bg-zinc-800 rounded mb-12 mx-auto"></div>
          <div className="space-y-6">
            <div className="w-full h-3 bg-stone-100 dark:bg-zinc-800/50 rounded"></div>
            <div className="w-5/6 h-3 bg-stone-100 dark:bg-zinc-800/50 rounded"></div>
            <div className="w-4/6 h-3 bg-stone-100 dark:bg-zinc-800/50 rounded"></div>
            <div className="w-full h-3 bg-stone-100 dark:bg-zinc-800/50 rounded mt-12"></div>
            <div className="w-2/3 h-3 bg-stone-100 dark:bg-zinc-800/50 rounded"></div>
          </div>
          
          <div className="absolute bottom-16 right-16 w-24 h-24 rounded-full border-4 border-stone-200 dark:border-zinc-800 opacity-50"></div>

          {/* Highlights */}
          {highlights.map((h, i) => (
            <div 
              key={i} 
              className="doc-highlight absolute opacity-0 scale-50"
              style={{ top: `${h.top}%`, left: `${h.left}%` }}
              data-top={h.top}
            >
              <div className="relative">
                <div className="w-4 h-4 bg-[var(--color-ngo-500)] rounded-full animate-ping absolute inset-0 opacity-50"></div>
                <div className="w-4 h-4 bg-[var(--color-ngo-500)] rounded-full relative z-10 border-2 border-white"></div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-stone-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20">
                  {h.label}
                </div>
              </div>
            </div>
          ))}

          {/* The Scanline */}
          <div ref={scanlineRef} className="absolute left-0 w-full h-1 bg-[var(--color-ngo-400)] shadow-[0_0_15px_rgba(34,197,94,0.5)] z-30 pointer-events-none" />
        </div>

      </div>
    </section>
  );
}
