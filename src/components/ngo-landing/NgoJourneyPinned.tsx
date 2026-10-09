"use client";

import React, { useRef } from "react";
import { useGsapScene } from "./motion/useGsapScene";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
import { Reveal } from "./motion/Reveal";

export function NgoJourneyPinned() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const slidesRef = useRef<HTMLDivElement>(null);
  
  const chapters = [
    { title: "Post your Drive", desc: "List exactly what you need. A clean card is generated." },
    { title: "Local Donors Notified", desc: "Donors within 10km are pinged on the map." },
    { title: "Secure Handover", desc: "Donors drop off items. You share a secure OTP." },
    { title: "Upload Proof", desc: "Snap a photo of the received items." },
    { title: "Certificate Issued", desc: "The donor gets a verified impact certificate." },
  ];

  useGsapScene(containerRef, (ctx, mm) => {
    mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
      const slides = gsap.utils.toArray(".journey-slide");
      
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinRef.current,
          start: "top top",
          end: `+=${slides.length * 800}`, // 800px per slide
          pin: true,
          scrub: 1,
        }
      });

      // Animate slides horizontally
      tl.to(slidesRef.current, {
        xPercent: -100 * (slides.length - 1),
        ease: "none"
      });
    });
  });

  return (
    <section ref={containerRef} className="bg-[#FBF9F4] dark:bg-[#09090b] relative overflow-hidden py-24 md:py-0">
      <Reveal className="text-center pt-12 md:pt-24 mb-12 absolute w-full top-0 z-10 pointer-events-none px-6">
        <h2 className="text-3xl md:text-5xl font-serif font-bold text-stone-900 dark:text-stone-100">
          What happens after you post
        </h2>
        <p className="text-stone-500 dark:text-stone-400 mt-2 font-medium tracking-wide text-sm uppercase">Illustrative Journey (Sample CK-REQ-8821)</p>
      </Reveal>

      <div ref={pinRef} className="w-full h-auto md:h-screen flex items-center overflow-hidden">
        <div ref={slidesRef} className="flex flex-col md:flex-row w-full h-full md:w-[500%] md:h-[70vh]">
          {chapters.map((chapter, i) => (
            <div key={i} className="journey-slide w-full md:w-[20%] h-full flex flex-col items-center justify-center p-8 shrink-0 relative">
              <div className="w-full max-w-lg aspect-square bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-zinc-800 flex items-center justify-center p-12 relative overflow-hidden group">
                {/* Placeholder for actual graphics/images */}
                <span className="text-8xl opacity-10 font-serif absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform duration-700">{i + 1}</span>
                <div className="text-center relative z-10">
                  <h3 className="text-2xl font-bold mb-4">{chapter.title}</h3>
                  <p className="text-stone-600 dark:text-stone-400">{chapter.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
