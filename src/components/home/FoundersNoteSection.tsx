"use client";

import React, { useEffect, useId, useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Quote } from "lucide-react";
import { FOUNDER } from "@/lib/landingConstants";
import { useRevealOnce, stagger } from "@/components/home/mobile/primitives";
import { galleryFonts } from "@/components/home/supportGallery/fonts";
import fm from "./FoundersNoteMobile.module.css";
import { usePlaceholderPreview } from "@/lib/placeholderPreview";

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
    <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-b from-[var(--ck-role-soft,#FCEADE)] to-[var(--ck-role-soft,#F5D5C0)] dark:from-[#2A170F] dark:to-[#1C100A] overflow-hidden">
      {/* Soft warm radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(var(--ck-role-shadow-rgb,181,72,15),0.15),transparent_70%)]" />

      {/* Friendly minimalist illustrated silhouette SVG */}
      <svg
        viewBox="0 0 200 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-3/4 h-3/4 object-contain text-[var(--ck-role-accent,#B5480F)] dark:text-[var(--ck-role-highlight,#E07A5F)] opacity-90 transition-transform duration-500 hover:scale-105"
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
 * Phone version (< 768px). A letterhead — small portrait beside the heading,
 * the note in a quote rule underneath — read like a pull quote. Here the note
 * is what it says it is: a letter to the neighbourhood. The founder's photo is
 * a taped print beside the heading, hanging over the corner of a folded sheet
 * on its envelope; "Dear neighbour,", a doodle of two homes a few streets
 * apart, and a signed sign-off with a CauseKind stamp and postmark. The sheet
 * and print rise on the section's reveal; the route and the signature draw in
 * and the postmark lands when each of them reaches the screen — all
 * transform/opacity (styles in FoundersNoteMobile.module.css).
 */
function FoundersNoteMobile() {
  const ref = useRevealOnce<HTMLElement>();
  const doodleRef = useRevealOnce<HTMLDivElement>();
  const signoffRef = useRevealOnce<HTMLElement>();
  const ringId = useId();
  return (
    <section
      ref={ref}
      id="founders-note"
      aria-label="Why We Built CauseKind"
      className={`${galleryFonts} ck-m-section relative w-full bg-[#FAF8F5] dark:bg-[#0E0C0A] border-t border-b border-stone-200/80 dark:border-stone-800/80 px-5`}
    >
      <p data-reveal-item style={stagger(0)} className={fm.eyebrow}>
        Why we built CauseKind
      </p>
      <div className={fm.masthead}>
        <h2 data-reveal-item style={stagger(1)} className={fm.title}>
          Neighbours helping <em>neighbours.</em>
        </h2>
        <figure data-reveal-item="scale" style={stagger(3)} className={fm.print}>
          <div className={fm.printPhoto}>
            {FOUNDER.photo ? (
              <Image src={FOUNDER.photo} alt={`${FOUNDER.name}, founder of CauseKind`} fill sizes="130px" className="object-cover object-top" />
            ) : (
              <div className="absolute inset-0" aria-hidden="true">
                <FounderAvatarPlaceholder />
              </div>
            )}
          </div>
        </figure>
      </div>

      <div className={fm.desk}>
        <div data-reveal-item style={stagger(2)} className={fm.envelope} aria-hidden="true" />
        <article data-reveal-item style={stagger(2)} className={fm.letter}>
          <span className={fm.printSpacer} aria-hidden="true" />
          <p className={fm.salutation}>Dear neighbour,</p>

          <div className={fm.body}>
            <p>
              Every home has things it no longer needs. And just a few streets away, someone is waiting for exactly those things.
              {FOUNDER.personalLine && ` ${FOUNDER.personalLine}`}
            </p>

            <div ref={doodleRef} className={fm.doodle} aria-hidden="true">
              <div className="relative">
                <svg viewBox="0 0 240 66" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {/* a home with things to give */}
                  <path d="M8 36 30 16l22 20M13 32v28h34V32M26 60V47h8v13M38 40h6v6h-6zM40 25v-6h5v10M4 60.5h56" />
                  {/* a few streets */}
                  <path className={fm.route} d="M56 55c24 0 28-24 52-20s24 22 42 15s22-12 36 3" strokeWidth="2" strokeDasharray="2 5.5" />
                  {/* a home that needed them */}
                  <path d="M188 36l22-18 22 18M193 32v28h34V32M206 60V48h8v12M196 40h6v6h-6zM180 60.5h56" />
                  <path
                    className={fm.heart}
                    d="M210 13c-6-4-7-8-4-9.5c2-.9 3.5.1 4 1.5c.5-1.4 2-2.4 4-1.5c3 1.5 2 5.5-4 9.5z"
                    fill="currentColor"
                    stroke="none"
                  />
                </svg>
                <span className={fm.ink} />
              </div>
              <span className={fm.doodleNote}>just a few streets away</span>
            </div>

            <p>
              We built CauseKind to connect the two — simply, safely and with dignity. No cash, no middlemen. Just real things reaching real people.
            </p>
          </div>

          <footer ref={signoffRef} className={fm.signoff}>
            <div className={fm.signRow}>
              <div className="min-w-0">
                <p className={fm.valediction}>With warmth,</p>
                <span className={fm.sig}>
                  {FOUNDER.signature ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={FOUNDER.signature} alt="" aria-hidden className={fm.sigImg} />
                  ) : (
                    <span aria-hidden="true">{FOUNDER.name}</span>
                  )}
                  <span className={fm.ink} aria-hidden="true" />
                </span>
              </div>

              <div className={fm.stampWrap} aria-hidden="true">
                <div className={fm.stamp}>
                  <div className={fm.stampArt}>
                    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 19 20 7l14 12M10 16v17h20V16" />
                      <path
                        d="M20 29c-4-2.6-5.5-5-3.8-6.8c1.1-1.1 2.8-.8 3.8.6c1-1.4 2.7-1.7 3.8-.6c1.7 1.8.2 4.2-3.8 6.8z"
                        fill="currentColor"
                        stroke="none"
                      />
                    </svg>
                    <span className={fm.stampValue}>₹0</span>
                  </div>
                </div>
                <svg className={fm.postmark} viewBox="0 0 120 80" fill="none">
                  <defs>
                    <path id={ringId} d="M12 40a28 28 0 1 1 56 0a28 28 0 1 1 -56 0" />
                  </defs>
                  <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="2" />
                  <circle cx="40" cy="40" r="21.5" stroke="currentColor" strokeWidth="1.2" />
                  <text fontSize="7.2" letterSpacing="0.6">
                    <textPath href={`#${ringId}`} textLength="168" lengthAdjust="spacingAndGlyphs">
                      NEIGHBOURHOOD POST • CAUSEKIND •
                    </textPath>
                  </text>
                  <text x="40" y="38" fontSize="6.5" textAnchor="middle" letterSpacing="0.8">WITHIN</text>
                  <text x="40" y="50" fontSize="10.5" fontWeight="700" textAnchor="middle">10 KM</text>
                  <path
                    d="M76 28q5.25-4 10.5 0t10.5 0t10.5 0t10.5 0M76 40q5.25-4 10.5 0t10.5 0t10.5 0t10.5 0M76 52q5.25-4 10.5 0t10.5 0t10.5 0t10.5 0"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
            <p className={fm.nameLine}>
              <span className={fm.name}>{FOUNDER.name}</span>
              <span className={fm.role}>{FOUNDER.title}</span>
            </p>
          </footer>
        </article>
      </div>
    </section>
  );
}

export function FoundersNoteSection({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  // Visibility safety: placeholder content shows only in dev and on staging, never in production
  const previewAllowed = usePlaceholderPreview();
  if (FOUNDER.isPlaceholder && !previewAllowed) {
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
      {/* Ambient background glow */}
      <div
        className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-[radial-gradient(circle,_rgba(var(--ck-role-shadow-rgb,181,72,15),0.08)_0%,_transparent_70%)] blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 w-full flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] items-center gap-8 sm:gap-10 lg:gap-14">
          
          {/* ── LEFT COLUMN: Photo / Avatar Frame ── */}
          <div className="flex justify-center lg:justify-start">
            <div className="relative group">
              {/* Outer decorative dashed orange ring */}
              <div
                className="absolute -inset-2.5 rounded-[1.75rem] border-2 border-dashed border-[var(--ck-role-accent,#B5480F)]/30 dark:border-[var(--ck-role-accent,#B5480F)]/40 pointer-events-none"
                aria-hidden="true"
              />

              {/* Decorative soft peach offset backplate */}
              <div
                className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-[var(--ck-role-soft,#FCEADE)] dark:bg-[#2A170F] translate-x-1.5 translate-y-1.5 -z-10"
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
              <span className="h-0.5 w-6 rounded-full bg-[var(--ck-role-accent,#B5480F)]" />
              <p className="text-3xs sm:text-2xs font-black uppercase tracking-[0.2em] text-[var(--ck-role-accent,#B5480F)] dark:text-[var(--ck-role-highlight,#F4A25B)]">
                WHY WE BUILT CAUSEKIND
              </p>
              <span className="h-0.5 w-6 rounded-full bg-[var(--ck-role-accent,#B5480F)] lg:hidden" />
            </div>

            {/* Section Heading */}
            <h2 className="founder-anim-item text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
              Neighbours helping neighbours.
            </h2>

            {/* Large Decorative Quote Icon */}
            <div
              ref={quoteMarkRef}
              className="flex justify-center lg:justify-start my-3 sm:my-4 text-[var(--ck-role-accent,#B5480F)]/25 dark:text-[var(--ck-role-highlight,#E07A5F)]/30"
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
              <p className="text-xs sm:text-sm font-semibold text-[var(--ck-role-accent,#B5480F)] dark:text-[var(--ck-role-highlight,#F4A25B)] mt-0.5">
                {FOUNDER.title}
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
