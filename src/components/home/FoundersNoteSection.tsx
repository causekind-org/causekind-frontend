"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Quote } from "lucide-react";
import { FOUNDER } from "@/lib/landingConstants";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Illustrated friendly person silhouette (avatar placeholder).
 * Rendered when FOUNDER.photo is null.
 * Styled in CauseKind warm peach & terracotta brand colours.
 */
function FounderAvatarPlaceholder() {
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-b from-[#FCEADE] to-[#F5D5C0] dark:from-[#2A170F] dark:to-[#1C100A] overflow-hidden">
      {/* Soft warm radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(181,72,15,0.15),transparent_70%)]" />

      {/* Friendly minimalist illustrated silhouette SVG */}
      <svg
        viewBox="0 0 200 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-3/4 h-3/4 object-contain text-[#B5480F] dark:text-[#E07A5F] opacity-90 transition-transform duration-500 hover:scale-105"
        aria-hidden="true"
      >
        {/* Head */}
        <circle cx="100" cy="72" r="36" fill="currentColor" fillOpacity="0.85" />
        {/* Shoulders & torso */}
        <path
          d="M38 190C38 145 66 126 100 126C134 126 162 145 162 190C162 198 156 204 148 204H52C44 204 38 198 38 190Z"
          fill="currentColor"
          fillOpacity="0.85"
        />
        {/* Subtle collar / smile accent */}
        <path
          d="M84 128C92 138 108 138 116 128"
          stroke="#FAF7F2"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Heart on chest symbolising giving */}
        <path
          d="M100 162C100 162 92 153 87 149C82 145 76 148 76 153C76 158 82 163 100 174C118 163 124 158 124 153C124 148 118 145 113 149C108 153 100 162 100 162Z"
          fill="#FAF7F2"
          fillOpacity="0.9"
        />
      </svg>
    </div>
  );
}

export function FoundersNoteSection({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const isDev = process.env.NODE_ENV === "development";

  // Visibility safety: hidden in production while isPlaceholder is true.
  // (Checked AFTER all hooks below, so React's rules of hooks are respected.)
  const isHidden = FOUNDER.isPlaceholder && !isDev;

  const sectionRef = useRef<HTMLElement>(null);
  const photoFrameRef = useRef<HTMLDivElement>(null);
  const quoteMarkRef = useRef<HTMLDivElement>(null);
  const textBlockRef = useRef<HTMLDivElement>(null);
  const signatureRef = useRef<HTMLDivElement>(null);
  const [svgSignature, setSvgSignature] = useState<string | null>(null);

  // Fetch and inline the SVG signature, only if it is a valid local /images/*.svg path
  useEffect(() => {
    if (isHidden) return;

    const signaturePath = FOUNDER.signature;
    const isLocalSvg =
      !!signaturePath &&
      signaturePath.startsWith("/images/") &&
      signaturePath.endsWith(".svg") &&
      !signaturePath.includes("..");

    if (!isLocalSvg || !signaturePath) {
      setSvgSignature(null);
      return;
    }

    let isMounted = true;
    fetch(signaturePath)
      .then((res) => (res.ok ? res.text() : null))
      .then((text) => {
        if (!isMounted || !text) return;
        // Strip any <script> tags and inline on* event attributes for safety
        const sanitized = text
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
          .replace(/\son\w+\s*=\s*[^>\s]+/gi, "");
        setSvgSignature(sanitized);
      })
      .catch(() => {
        if (isMounted) setSvgSignature(null);
      });

    return () => {
      isMounted = false;
    };
  }, [isHidden]);

  // Entrance animation (runs once, only for the instance visible at this screen size)
  useEffect(() => {
    if (isHidden) return;
    if (!sectionRef.current) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const mm = gsap.matchMedia();
    const mediaQuery =
      variant === "desktop" ? "(min-width: 1024px)" : "(max-width: 1023px)";

    mm.add(mediaQuery, () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
          toggleActions: "play none none none",
          once: true,
        },
        onComplete: () => {
          // Clear any leftover styles so the photo renders perfectly sharp
          if (photoFrameRef.current) {
            photoFrameRef.current.style.transform = "none";
            photoFrameRef.current.style.willChange = "auto";
            photoFrameRef.current.style.clipPath = "none";
            photoFrameRef.current.style.filter = "none";
          }
        },
      });

      // 1. Photo / avatar mask wipe & slight scale down
      if (photoFrameRef.current) {
        tl.fromTo(
          photoFrameRef.current,
          {
            clipPath: "inset(100% 0% 0% 0% round 1.5rem)",
            scale: 1.05,
            opacity: 0,
          },
          {
            clipPath: "inset(0% 0% 0% 0% round 1.5rem)",
            scale: 1,
            opacity: 1,
            duration: 0.85,
            ease: "power3.out",
            clearProps: "transform,scale,clipPath,willChange",
          }
        );
      }

      // 2. Quote mark fade & scale in
      if (quoteMarkRef.current) {
        tl.fromTo(
          quoteMarkRef.current,
          { scale: 0.7, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(1.5)" },
          "-=0.45"
        );
      }

      // 3. Text block items fade up
      if (textBlockRef.current) {
        const textElements =
          textBlockRef.current.querySelectorAll(".founder-anim-item");
        tl.fromTo(
          textElements,
          { y: 18, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.08,
            ease: "power2.out",
            clearProps: "transform",
          },
          "-=0.3"
        );
      }

      // 4. Signature: draw the outline, then fill it in (works for filled-shape signatures)
      if (signatureRef.current) {
        const paths =
          signatureRef.current.querySelectorAll<SVGPathElement>("path");
        if (paths.length > 0) {
          paths.forEach((p) => {
            const len = p.getTotalLength ? p.getTotalLength() : 100;
            gsap.set(p, {
              strokeDasharray: len,
              strokeDashoffset: len,
              stroke: "currentColor",
              strokeWidth: 1,
              fill: "currentColor",
              fillOpacity: 0,
            });
          });
          tl.to(
            paths,
            { strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut" },
            "-=0.2"
          ).to(
            paths,
            { fillOpacity: 1, duration: 0.4, ease: "power1.out" },
            "-=0.3"
          );
        } else {
          tl.fromTo(
            signatureRef.current,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
            "-=0.2"
          );
        }
      }
    });

    return () => mm.revert();
  }, [svgSignature, variant, isHidden]);

  // Hidden in production while the founder details are still a placeholder
  if (isHidden) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      id="founders-note"
      aria-label="Why we built CauseKind"
      className="relative w-full bg-[#FAF8F5] dark:bg-[#0E0C0A] border-t border-b border-stone-200/80 dark:border-stone-800/80 min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-center py-10 sm:py-14 lg:py-16 overflow-hidden transition-colors"
    >
      {/* Dev-only placeholder tag */}
      {FOUNDER.isPlaceholder && isDev && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 backdrop-blur-sm shadow-sm pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          PLACEHOLDER (Hidden in Production)
        </div>
      )}

      {/* Ambient background glow */}
      <div
        className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-[radial-gradient(circle,_rgba(181,72,15,0.08)_0%,_transparent_70%)] blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 w-full flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] items-center gap-8 sm:gap-10 lg:gap-14">
          {/* ── LEFT COLUMN: Photo / avatar frame ── */}
          <div className="flex justify-center lg:justify-start">
            <div className="relative group">
              {/* Outer decorative dashed orange ring */}
              <div
                className="absolute -inset-2.5 rounded-[1.75rem] border-2 border-dashed border-[#B5480F]/30 dark:border-[#B5480F]/40 pointer-events-none"
                aria-hidden="true"
              />

              {/* Decorative soft peach offset backplate */}
              <div
                className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-[#FCEADE] dark:bg-[#2A170F] translate-x-1.5 translate-y-1.5 -z-10"
                aria-hidden="true"
              />

              {/* Main image frame (4:5). For the full photo with no side trimming,
                  change aspect-[4/5] to aspect-[1856/1986]. */}
              <div
                ref={photoFrameRef}
                className="relative w-[190px] sm:w-[240px] xl:w-[290px] aspect-[4/5] rounded-2xl sm:rounded-3xl overflow-hidden border border-stone-200/90 dark:border-stone-800 shadow-lg bg-white dark:bg-zinc-900"
              >
                {FOUNDER.photo ? (
                  <Image
                    src={FOUNDER.photo}
                    alt={`${FOUNDER.name}, founder of CauseKind`}
                    fill
                    sizes="(min-width: 1280px) 290px, (min-width: 640px) 240px, 190px"
                    quality={90}
                    loading="lazy"
                    className="object-cover object-top"
                  />
                ) : (
                  <FounderAvatarPlaceholder />
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Founder's note text ── */}
          <div ref={textBlockRef} className="flex flex-col text-center lg:text-left">
            {/* Eyebrow label */}
            <div className="founder-anim-item flex items-center justify-center lg:justify-start gap-2 mb-2">
              <span className="h-0.5 w-6 rounded-full bg-[#B5480F]" />
              <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-[#B5480F] dark:text-[#F4A25B]">
                WHY WE BUILT CAUSEKIND
              </p>
              <span className="h-0.5 w-6 rounded-full bg-[#B5480F] lg:hidden" />
            </div>

            {/* Section heading */}
            <h2 className="founder-anim-item text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
              Neighbours helping neighbours.
            </h2>

            {/* Large decorative quote icon */}
            <div
              ref={quoteMarkRef}
              className="flex justify-center lg:justify-start my-3 sm:my-4 text-[#B5480F]/25 dark:text-[#E07A5F]/30"
              aria-hidden="true"
            >
              <Quote className="w-8 h-8 sm:w-10 sm:h-10 fill-current rotate-180" />
            </div>

            {/* Note paragraphs */}
            <div className="founder-anim-item space-y-3 text-sm sm:text-base lg:text-lg text-stone-700 dark:text-stone-300 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
              <p>
                Every home has things it no longer needs. And just a few streets
                away, someone is waiting for exactly those things.
                {FOUNDER.personalLine && ` ${FOUNDER.personalLine}`}
              </p>
              <p>
                We built CauseKind to connect the two — simply, safely and with
                dignity. No cash, no middlemen. Just real things reaching real
                people.
              </p>
            </div>

            {/* ── Sign-off: signature, name & title ── */}
            <div className="founder-anim-item mt-6 sm:mt-8 pt-4 border-t border-stone-200/60 dark:border-stone-800/60 flex flex-col items-center lg:items-start">
              {/* Optional signature SVG (inlined for the draw animation) */}
              {FOUNDER.signature && svgSignature && (
                <div
                  ref={signatureRef}
                  className="founder-signature-box relative h-10 w-40 mb-2 text-stone-900 dark:text-stone-100 flex items-center justify-center lg:justify-start [&>svg]:h-full [&>svg]:w-auto [&>svg]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: svgSignature }}
                />
              )}

              {/* Founder name */}
              <p className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
                {FOUNDER.name}
              </p>

              {/* Founder title */}
              <p className="text-xs sm:text-sm font-semibold text-[#B5480F] dark:text-[#F4A25B] mt-0.5">
                {FOUNDER.title}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}