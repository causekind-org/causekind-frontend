"use client";

import React from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

/* Visual building blocks for the NGO landing redesign (layout only, no copy). */

const EASE = [0.22, 1, 0.36, 1] as const;
export const IMG = "/images/ngo-landing/";
export const STEP_IMG = "/images/ngo-steps/";

export function FadeUp({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Arch-topped photo frame (rounded top, soft bottom corners). */
export function ArchPhoto({ src, alt, className = "", sizes = "(max-width: 768px) 90vw, 480px", position }: {
  src: string; alt: string; className?: string; sizes?: string; position?: string;
}) {
  return (
    <div className={`ngo-arch relative overflow-hidden ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover ngo-zoom-img" style={{ objectPosition: position }} loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />
    </div>
  );
}

/** Photo card: full-bleed photo, bottom-up dark gradient, text in a blurred glass box. */
export function GlassPhotoCard({ src, alt, children, className = "", sizes = "(max-width: 768px) 100vw, 50vw", position }: {
  src: string; alt: string; children: React.ReactNode; className?: string; sizes?: string; position?: string;
}) {
  return (
    <div className={`ngo-glass-photo group relative overflow-hidden rounded-[28px] ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover ngo-zoom-img" style={{ objectPosition: position }} loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
      <div className="absolute inset-x-3 bottom-3 md:inset-x-5 md:bottom-5 rounded-[20px] border border-white/15 bg-black/30 p-5 md:p-6 text-white backdrop-blur-xl">
        {children}
      </div>
    </div>
  );
}

/** Round icon badge in the NGO palette. */
export function IconBubble({ children, tone = "light" }: { children: React.ReactNode; tone?: "light" | "dark" | "gold" }) {
  const cls =
    tone === "dark"
      ? "bg-white/10 text-[var(--ngo-gold-light)] border border-white/15"
      : tone === "gold"
        ? "bg-[var(--ngo-deep)] text-[var(--ngo-gold-light)]"
        : "ngo-icon-light";
  return <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${cls}`}>{children}</span>;
}
