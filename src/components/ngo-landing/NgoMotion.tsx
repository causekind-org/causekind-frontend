"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from "framer-motion";

/* Shared scroll-motion primitives for the NGO landing (verified and unverified).
   Animate transform/opacity only; every effect turns static under reduced motion,
   and the heavier ones (sideways text, parallax, sticky stacking) are desktop-only. */

const EASE = [0.22, 1, 0.36, 1] as const;
const DESKTOP_QUERY = "(min-width: 768px)";

function subscribe(cb: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener?.("change", cb);
  return () => mq.removeEventListener?.("change", cb);
}

/** True at >= 768px. False on the server and where matchMedia is missing (tests). */
export function useIsDesktop() {
  return useSyncExternalStore(
    subscribe,
    () => (typeof window !== "undefined" && !!window.matchMedia ? window.matchMedia(DESKTOP_QUERY).matches : false),
    () => false,
  );
}

const groupVariants: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/** Grid/list whose children fade up one after another when it enters the viewport. */
export function RevealGroup({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={groupVariants}
    >
      {React.Children.map(children, (child) =>
        child == null ? null : (
          <motion.div variants={itemVariants} className="h-full min-w-0 [&>*]:h-full">
            {child}
          </motion.div>
        ),
      )}
    </motion.div>
  );
}

/** Eyebrow + oversized heading that drifts sideways with scroll (desktop); a plain slide-in on phones. */
export function NgoSidewaysHeader({ eyebrow, h2, isDark = false }: { eyebrow: string; h2: string; isDark?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const desktop = useIsDesktop();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], ["8%", "-12%"]);
  const drift = desktop && !reduce;

  return (
    <div ref={ref} className="ngo-sideways mb-12 md:mb-20">
      <span className={`ngo-eyebrow ${isDark ? "ngo-eyebrow-dark" : ""}`}>{eyebrow}</span>
      {drift ? (
        <motion.h2 style={{ x }} className="ngo-h2 ngo-h2-display whitespace-nowrap will-change-transform">
          {h2}
        </motion.h2>
      ) : (
        <motion.h2
          initial={reduce ? false : { opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="ngo-h2 ngo-h2-display"
        >
          {h2}
        </motion.h2>
      )}
    </div>
  );
}

/** Steps that pile up as sticky cards on desktop; an auto-advancing swipe row on phones. */
export function NgoStackCards({ children, label }: { children: React.ReactNode; label: string }) {
  const reduce = useReducedMotion();
  const desktop = useIsDesktop();
  if (!desktop) return <SwipeRow label={label} className="flex flex-col gap-5">{children}</SwipeRow>;
  return (
    <ol className="ngo-stack" aria-label={label}>
      {React.Children.map(children, (child, i) => (
        <motion.li
          className="ngo-stack-item"
          style={{ ["--i" as string]: i } as React.CSSProperties}
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          {child}
        </motion.li>
      ))}
    </ol>
  );
}

/** Large cinematic photo (slow parallax on desktop) with text in a blurred translucent box. */
export function NgoPhotoPanel({ src, alt, children }: { src: string; alt: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const desktop = useIsDesktop();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);
  const parallax = desktop && !reduce;

  return (
    <div ref={ref} className="ngo-photo-panel">
      <motion.div className="absolute inset-x-0 -inset-y-[8%]" style={parallax ? { y } : undefined}>
        <Image src={src} alt={alt} fill sizes="(max-width: 1200px) 100vw, 1200px" className="object-cover" loading="lazy" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent pointer-events-none" />
      <motion.div
        className="ngo-photo-panel-box"
        initial={reduce ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Marks the item nearest the centre of a horizontal scroll-snap row as active (focus-frame slider). */
export function useFocusFrame<T extends HTMLElement>(enabled: boolean) {
  const rowRef = useRef<T>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const row = rowRef.current;
    if (!enabled || !row || typeof IntersectionObserver === "undefined") return;
    const items = Array.from(row.children) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(items.indexOf(e.target as HTMLElement));
        }
      },
      { root: row, rootMargin: "0px -40% 0px -40%", threshold: 0 },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [enabled]);
  return { rowRef, active };
}

/** Desktop: the given grid with a staggered reveal. Phones: one horizontal snap row with a focus card and
 *  dots that advances by itself every 3 s while on screen, and pauses while a finger or mouse is on it. */
export function SwipeRow({ children, className = "", label, reveal = true }: { children: React.ReactNode; className?: string; label: string; reveal?: boolean }) {
  const items = React.Children.toArray(children);
  const desktop = useIsDesktop();
  const reduce = useReducedMotion();
  const { rowRef, active } = useFocusFrame<HTMLDivElement>(!desktop);
  const [paused, setPaused] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const el = wrapRef.current;
    if (desktop || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [desktop]);

  useEffect(() => {
    if (desktop || reduce || paused || !onScreen || items.length < 2) return;
    const id = window.setInterval(() => {
      const row = rowRef.current;
      if (!row) return;
      const next = row.children[(activeRef.current + 1) % row.children.length] as HTMLElement | undefined;
      if (!next) return;
      row.scrollTo({ left: next.offsetLeft - (row.clientWidth - next.clientWidth) / 2, behavior: "smooth" });
    }, 3000);
    return () => window.clearInterval(id);
  }, [desktop, reduce, paused, onScreen, items.length, rowRef]);

  return (
    <div
      ref={wrapRef}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <motion.div
        ref={rowRef}
        role="list"
        aria-label={label}
        className={`${className} ngo-mswipe`}
        initial={reduce || !reveal ? false : "hidden"}
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        variants={groupVariants}
      >
        {items.map((child, i) => (
          <motion.div key={i} role="listitem" variants={itemVariants} className="h-full min-w-0">
            <div className="ngo-mswipe-inner [&>*]:h-full" data-active={desktop ? undefined : String(i === active)}>
              {child}
            </div>
          </motion.div>
        ))}
      </motion.div>
      <div className="ngo-mswipe-dots" aria-hidden="true">
        {items.map((_, i) => <span key={i} data-on={String(i === active)} />)}
      </div>
    </div>
  );
}
