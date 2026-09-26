"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Quote } from "lucide-react";
import { FOUNDER } from "@/lib/landingConstants";
import { useRevealOnce, stagger } from "@/components/home/mobile/primitives";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Illustrated Friendly Person Silhouette (Avatar Placeholder)
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
        {/* Shoulders & Torso */}
        <path
          d="M38 190C38 145 66 126 100 126C134 126 162 145 162 190C162 198 156 204 148 204H52C44 204 38 198 38 190Z"
          fill="currentColor"
          fillOpacity="0.85"
        />
        {/* Subtle Collar / Smile Accent */}
        <path
          d="M84 128C92 138 108 138 116 128"
          stroke="#FAF7F2"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Heart icon on chest symbolizing giving */}
        <path
          d="M100 162C100 162 92 153 87 149C82 145 76 148 76 153C76 158 82 163 100 174C118 163 124 158 124 153C124 148 118 145 113 149C108 153 100 162 100 162Z"
          fill="#FAF7F2"
          fillOpacity="0.9"
        />
      </svg>
    </div>
  );
}

/**
 * Phone version (< 768px). The 190×237 portrait on its own row, then the note
 * below it, made a centred column most of a screen tall. Here the portrait
 * shrinks and sits beside the heading — a letterhead — and the note reads
 * straight on underneath. The clip-path wipe becomes a plain fade-up.
 */
function FoundersNoteMobile() {
  const ref = useRevealOnce<HTMLElement>();
  const isDev = process.env.NODE_ENV === "development";
  return (
    <section
      ref={ref}
      id="founders-note"
      aria-label="Why We Built CauseKind"
      className="ck-m-section relative w-full bg-[#FAF8F5] dark:bg-[#0E0C0A] border-t border-b border-stone-200/80 dark:border-stone-800/80 px-5"
    >
      {FOUNDER.isPlaceholder && isDev && (
        <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-4xs font-black tracking-widest uppercase bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          PLACEHOLDER (Hidden in Production)
        </div>
      )}

      <div className="flex items-center gap-4">
        <div data-reveal-item="scale" style={stagger(0)} className="relative shrink-0">
          <div className="absolute inset-0 rounded-2xl bg-[#FCEADE] dark:bg-[#2A170F] translate-x-1 translate-y-1" aria-hidden="true" />
          <div className="relative w-[84px] aspect-[4/5] rounded-2xl overflow-hidden border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-zinc-900">
            {FOUNDER.photo ? (
              <Image src={FOUNDER.photo} alt={`${FOUNDER.name}, founder of CauseKind`} fill sizes="84px" className="object-cover object-top" />
            ) : (
              <FounderAvatarPlaceholder />
            )}
          </div>
        </div>
        <div className="min-w-0">
          <div data-reveal-item style={stagger(1)} className="flex items-center gap-2 mb-1.5">
            <span className="h-0.5 w-5 rounded-full bg-[#B5480F]" />
            <p className="text-3xs font-black uppercase tracking-[0.2em] text-[#B5480F] dark:text-[#F4A25B]">WHY WE BUILT CAUSEKIND</p>
          </div>
          <h2 data-reveal-item style={stagger(2)} className="text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
            Neighbours helping neighbours.
          </h2>
        </div>
      </div>

      <div data-reveal-item style={stagger(3)} className="relative mt-4 pl-4 border-l-2 border-[#B5480F]/25">
        <Quote className="absolute -left-2 -top-1 w-4 h-4 fill-current rotate-180 text-[#B5480F]/40 bg-[#FAF8F5] dark:bg-[#0E0C0A]" aria-hidden="true" />
        <div className="space-y-2.5 text-[15px] text-stone-700 dark:text-stone-300 font-medium leading-relaxed">
          <p>
            Every home has things it no longer needs. And just a few streets away, someone is waiting for exactly those things.
            {FOUNDER.personalLine && ` ${FOUNDER.personalLine}`}
          </p>
          <p>
            We built CauseKind to connect the two — simply, safely and with dignity. No cash, no middlemen. Just real things reaching real people.
          </p>
        </div>
      </div>

      <div data-reveal-item style={stagger(4)} className="mt-4 pt-3 border-t border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">{FOUNDER.name}</p>
          <p className="text-xs font-semibold text-[#B5480F] dark:text-[#F4A25B] mt-0.5">{FOUNDER.title}</p>
        </div>
        {FOUNDER.signature && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={FOUNDER.signature} alt="" aria-hidden className="h-9 w-auto max-w-[45%] dark:invert" />
        )}
      </div>
    </section>
  );
}

export function FoundersNoteSection({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  // Visibility safety: Hide in production if isPlaceholder is true
  if (FOUNDER.isPlaceholder && process.env.NODE_ENV !== "development") {
    return null;
  }
  if (variant === "desktop") return <FoundersNoteFull variant="desktop" />;
  return (
    <>
      <div className="md:hidden">
        <FoundersNoteMobile />
      </div>
      <div className="hidden md:block">
        <FoundersNoteFull variant="mobile" />
      </div>
    </>
  );
}

function FoundersNoteFull({
  variant,
}: {
  variant: "desktop" | "mobile";
}) {
  const isDev = process.env.NODE_ENV === "development";

  const sectionRef = useRef<HTMLElement>(null);
  const photoFrameRef = useRef<HTMLDivElement>(null);
  const quoteMarkRef = useRef<HTMLDivElement>(null);
  const textBlockRef = useRef<HTMLDivElement>(null);
  const signatureRef = useRef<HTMLDivElement>(null);
  const [svgSignature, setSvgSignature] = React.useState<string | null>(null);

  // Fetch and inline SVG signature only if it is a valid local /images/*.svg path
  useEffect(() => {
    const isLocalSvg =
      FOUNDER.signature &&
      FOUNDER.signature.startsWith("/images/") &&
      FOUNDER.signature.endsWith(".svg") &&
      !FOUNDER.signature.includes("..");

    if (!isLocalSvg || !FOUNDER.signature) {
      setSvgSignature(null);
      return;
    }

    let isMounted = true;
    fetch(FOUNDER.signature)
      .then((res) => (res.ok ? res.text() : null))
      .then((text) => {
        if (!isMounted || !text) return;
        // Strip any <script> tags and inline on* event attributes for safety
        const sanitized = text
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/on\w+\s*=\s*(['"]).*?\1/gi, "")
          .replace(/on\w+\s*=\s*[^>\s]+/gi, "");
        setSvgSignature(sanitized);
      })
      .catch(() => {
        if (isMounted) setSvgSignature(null);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!sectionRef.current) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const mm = gsap.matchMedia();
    // Tablet only for the "mobile" variant — phones render FoundersNoteMobile.
    const mediaQuery = variant === "desktop" ? "(min-width: 1024px)" : "(min-width: 768px) and (max-width: 1023px)";

    mm.add(mediaQuery, () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
          toggleActions: "play none none none",
          once: true,
        },
      });

      // 1. Photo / Avatar Mask Wipe & slight scale down
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
          }
        );
      }

      // 2. Quote Mark fade & scale in
      if (quoteMarkRef.current) {
        tl.fromTo(
          quoteMarkRef.current,
          { scale: 0.7, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(1.5)" },
          "-=0.45"
        );
      }

      // 3. Text block lines / sentences fade up
      if (textBlockRef.current) {
        const textElements = textBlockRef.current.querySelectorAll(".founder-anim-item");
        tl.fromTo(
          textElements,
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power2.out" },
          "-=0.3"
        );
      }

      // 4. Signature draw animation (if SVG paths present)
      if (signatureRef.current) {
        const paths = signatureRef.current.querySelectorAll<SVGPathElement>("path");
        if (paths.length > 0) {
          paths.forEach((p) => {
            const len = p.getTotalLength ? p.getTotalLength() : 100;
            gsap.set(p, { strokeDasharray: len, strokeDashoffset: len, stroke: "currentColor", fill: "none" });
          });
          tl.to(
            paths,
            {
              strokeDashoffset: 0,
              duration: 1.4,
              ease: "power2.inOut",
            },
            "-=0.2"
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
  }, [svgSignature, variant]);

  return (
    <section
      ref={sectionRef}
      id="founders-note"
      aria-label="Why We Built CauseKind"
      className="relative w-full bg-[#FAF8F5] dark:bg-[#0E0C0A] border-t border-b border-stone-200/80 dark:border-stone-800/80 min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4.5rem)] flex flex-col justify-center py-10 sm:py-14 lg:py-16 overflow-hidden transition-colors"
    >
      {/* Dev-only placeholder tag */}
      {FOUNDER.isPlaceholder && isDev && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full text-4xs font-black tracking-widest uppercase bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 backdrop-blur-sm shadow-xs pointer-events-none">
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
          
          {/* ── LEFT COLUMN: Photo / Avatar Frame ── */}
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

              {/* Main Image Frame (4:5 Aspect Ratio) */}
              <div
                ref={photoFrameRef}
                className="relative w-[190px] sm:w-[240px] xl:w-[280px] aspect-[4/5] rounded-2xl sm:rounded-3xl overflow-hidden border border-stone-200/90 dark:border-stone-800 shadow-lg bg-white dark:bg-zinc-900"
              >
                {FOUNDER.photo ? (
                  <Image
                    src={FOUNDER.photo}
                    alt={`${FOUNDER.name}, founder of CauseKind`}
                    fill
                    sizes="(max-width: 640px) 190px, (max-width: 1024px) 240px, 280px"
                    className="object-cover object-top"
                    priority={false}
                  />
                ) : (
                  <FounderAvatarPlaceholder />
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Founder's Note Text ── */}
          <div ref={textBlockRef} className="flex flex-col text-center lg:text-left">
            {/* Eyebrow Label */}
            <div className="founder-anim-item flex items-center justify-center lg:justify-start gap-2 mb-2">
              <span className="h-0.5 w-6 rounded-full bg-[#B5480F]" />
              <p className="text-3xs sm:text-2xs font-black uppercase tracking-[0.2em] text-[#B5480F] dark:text-[#F4A25B]">
                WHY WE BUILT CAUSEKIND
              </p>
              <span className="h-0.5 w-6 rounded-full bg-[#B5480F] lg:hidden" />
            </div>

            {/* Section Heading */}
            <h2 className="founder-anim-item text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
              Neighbours helping neighbours.
            </h2>

            {/* Large Decorative Quote Icon */}
            <div
              ref={quoteMarkRef}
              className="flex justify-center lg:justify-start my-3 sm:my-4 text-[#B5480F]/25 dark:text-[#E07A5F]/30"
              aria-hidden="true"
            >
              <Quote className="w-8 h-8 sm:w-10 sm:h-10 fill-current rotate-180" />
            </div>

            {/* Note Paragraphs */}
            <div className="founder-anim-item space-y-3 text-sm sm:text-base lg:text-lg text-stone-700 dark:text-stone-300 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
              <p>
                Every home has things it no longer needs. And just a few streets away, someone is waiting for exactly those things.
                {FOUNDER.personalLine && ` ${FOUNDER.personalLine}`}
              </p>
              <p>
                We built CauseKind to connect the two — simply, safely and with dignity. No cash, no middlemen. Just real things reaching real people.
              </p>
            </div>

            {/* ── Sign-off: Signature, Name & Title ── */}
            <div className="founder-anim-item mt-6 sm:mt-8 pt-4 border-t border-stone-200/60 dark:border-stone-800/60 flex flex-col items-center lg:items-start">
              {/* Optional Signature SVG (Inlined for draw animation) */}
              {FOUNDER.signature && svgSignature && (
                <div
                  ref={signatureRef}
                  className="founder-signature-box relative h-10 w-40 mb-2 text-stone-900 dark:text-stone-100 flex items-center justify-center lg:justify-start [&>svg]:h-full [&>svg]:w-auto [&>svg]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: svgSignature }}
                />
              )}

              {/* Founder Name */}
              <p className="text-base sm:text-lg font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
                {FOUNDER.name}
              </p>

              {/* Founder Title */}
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
