"use client";

import React, { useRef } from "react";
import { useGsapScene } from "./motion/useGsapScene";
import gsap from "gsap";
import { Reveal } from "./motion/Reveal";
import { CheckCircle2, ScanFace, Scale, MapPin, Lock, Camera } from "lucide-react";
import { useTranslations } from "next-intl";

export function NgoVerificationScan() {
  const t = useTranslations("NgoLanding");
  const containerRef = useRef<HTMLDivElement>(null);
  const scanlineRef = useRef<HTMLDivElement>(null);

  useGsapScene(containerRef, (ctx, mm) => {
    mm.add("(prefers-reduced-motion: no-preference)", () => {
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

      gsap.utils.toArray(".doc-highlight").forEach((el: any) => {
        const topPos = parseFloat(el.getAttribute("data-top") || "0");
        tl.to(el, {
          opacity: 1,
          scale: 1,
          duration: 0.2,
          ease: "back.out(1.7)",
        }, (topPos / 100) * 2);
      });
    });
  });

  const features = [
    { label: t("Scan.item1") },
    { label: t("Scan.item2") },
    { label: t("Scan.item3") },
    { label: t("Scan.item4") },
  ];

  const highlights = [
    { title: t("Scan.aiScreening"), desc: t("Scan.aiScreeningDesc"), icon: ScanFace, top: 15, left: 15 },
    { title: t("Scan.legalChecks"), desc: t("Scan.legalChecksDesc"), icon: Scale, top: 35, left: 70 },
    { title: t("Scan.localMatching"), desc: t("Scan.localMatchingDesc"), icon: MapPin, top: 55, left: 20 },
    { title: t("Scan.safeDropOffs"), desc: t("Scan.safeDropOffsDesc"), icon: Lock, top: 75, left: 65 },
    { title: t("Scan.proofRequired"), desc: t("Scan.proofRequiredDesc"), icon: Camera, top: 85, left: 30 },
  ];

  return (
    <section ref={containerRef} className="py-32 bg-stone-100 dark:bg-zinc-950 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        <Reveal>
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">{t("Scan.title")}</h2>
          <p className="text-xl text-stone-600 dark:text-stone-400 mb-8">
            {t("Scan.subtitle")}
          </p>
          <ul className="space-y-4">
            {features.map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-lg font-medium">
                <CheckCircle2 className="text-[var(--color-ngo-500)] w-6 h-6 shrink-0" />
                {item.label}
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
          {highlights.map((h, i) => {
            const Icon = h.icon;
            return (
              <div 
                key={i} 
                className="doc-highlight absolute opacity-0 scale-50 group cursor-pointer"
                style={{ top: `${h.top}%`, left: `${h.left}%` }}
                data-top={h.top}
              >
                <div className="relative z-10 flex items-center justify-center w-10 h-10 bg-white dark:bg-zinc-800 rounded-full shadow-lg border border-[var(--color-ngo-300)] dark:border-ngo-700/50">
                  <Icon className="w-5 h-5 text-[var(--color-ngo-600)]" />
                </div>
                {/* Tooltip on hover */}
                <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 top-full left-1/2 -translate-x-1/2 mt-2 bg-stone-900 text-white p-3 rounded-lg w-48 shadow-xl z-20 pointer-events-none">
                  <p className="font-bold text-sm mb-1">{h.title}</p>
                  <p className="text-xs text-stone-300">{h.desc}</p>
                </div>
              </div>
            );
          })}

          {/* The Scanline */}
          <div ref={scanlineRef} className="absolute left-0 w-full h-1 bg-[var(--color-ngo-400)] shadow-[0_0_15px_rgba(34,197,94,0.5)] z-30 pointer-events-none" />
        </div>

      </div>
    </section>
  );
}
