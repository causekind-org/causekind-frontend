"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export type PathwayTone = "donor" | "donee";

/**
 * Purely decorative "holographic scan" behind a pathway panel.
 *
 * Everything here is CSS gradients, borders and transforms — no canvas, no
 * WebGL, no external asset. That is a deliberate constraint rather than a
 * limitation: this sits above the fold on the landing page, and a three.js
 * bundle to draw six rectangles would cost more than the whole rest of the
 * route.
 *
 * `aria-hidden` on the root, and every element inside is presentational. A
 * screen reader hears the panel's heading and CTA and nothing else.
 *
 * Motion is gated three ways:
 * - `reduceMotion` kills all looping and leaves a composed static frame;
 * - `active` (hover *or* keyboard focus, decided by the parent) deepens it;
 * - `inView` (also from the parent) stops loops when the section is off-screen.
 *
 * Only `transform` and `opacity` are animated, so every frame stays on the
 * compositor and nothing here can trigger layout.
 */
export default function PathwayScene({
  tone, Icon, orbitIcons, active, inView,
}: {
  tone: PathwayTone;
  Icon: LucideIcon;
  orbitIcons: LucideIcon[];
  active: boolean;
  inView: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const animate = !reduceMotion && inView;

  const isDonor = tone === "donor";
  // Two secondary palettes that still sit inside CauseKind's warm range — the
  // donor side leans into the brand terracotta, the donee side to a calm teal.
  const ring = isDonor ? "rgb(176 74 21)" : "rgb(13 148 136)";
  const glow = isDonor ? "rgb(224 123 58)" : "rgb(45 212 191)";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      style={{ perspective: "900px" }}
    >
      {/* Depth wash */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: active ? 0.55 : 0.3,
          background: `radial-gradient(120% 90% at 50% 15%, ${glow}22 0%, transparent 62%)`,
        }}
      />

      {/* Perspective floor grid. Tilted with a static rotateX so it reads as
          depth without animating a 3D transform every frame. */}
      <div
        className="absolute inset-x-[-30%] bottom-[-18%] h-[62%] transition-opacity duration-500"
        style={{
          opacity: active ? 0.5 : 0.26,
          transform: "rotateX(66deg)",
          transformOrigin: "bottom center",
          backgroundImage: `
            linear-gradient(to right, ${ring}44 1px, transparent 1px),
            linear-gradient(to bottom, ${ring}44 1px, transparent 1px)`,
          backgroundSize: "22px 22px",
          maskImage: "linear-gradient(to top, black 8%, transparent 78%)",
          WebkitMaskImage: "linear-gradient(to top, black 8%, transparent 78%)",
        }}
      />

      {/* Scanning line — the one element that most reads as "AR". Sweeps only
          while the panel is active and on-screen. */}
      <motion.div
        className="absolute inset-x-0 h-10"
        style={{
          background: `linear-gradient(to bottom, transparent, ${glow}2e, transparent)`,
        }}
        initial={{ y: "-20%", opacity: 0 }}
        animate={
          animate && active
            ? { y: ["-20%", "420%"], opacity: [0, 1, 1, 0] }
            : { opacity: 0 }
        }
        transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 0.6, ease: "linear" }}
      />

      {/* Holographic frame corners */}
      {[
        "top-3 start-3 border-t-2 border-s-2",
        "top-3 end-3 border-t-2 border-e-2",
        "bottom-3 start-3 border-b-2 border-s-2",
        "bottom-3 end-3 border-b-2 border-e-2",
      ].map((cls, i) => (
        <motion.span
          key={i}
          className={`absolute h-4 w-4 ${cls}`}
          style={{ borderColor: ring }}
          animate={{ opacity: active ? 0.95 : 0.4, scale: active ? 1.12 : 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}

      {/* Emblem + orbit, anchored to the top-end corner rather than the panel
          centre. Centred, they sat directly behind the heading and the orbit
          glyphs crossed the words — legible only by luck. Up here the motif
          reads as a device chrome element and the copy below stays clear. */}
      <motion.div
        className="absolute end-[4.5rem] top-[4.5rem] flex h-12 w-12 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border backdrop-blur-sm"
        style={{ borderColor: `${ring}66`, background: `${glow}14`, color: ring }}
        animate={
          animate
            ? { y: active ? [-6, 4, -6] : [-3, 2, -3], scale: active ? 1.06 : 1 }
            : { y: 0, scale: active ? 1.06 : 1 }
        }
        transition={{
          y: { duration: active ? 3.2 : 5, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
        }}
      >
        <Icon className="h-5 w-5" />
      </motion.div>

      {/* Orbiting interface markers. The ring rotates; each marker counter-rotates
          so the glyphs stay upright instead of tumbling. */}
      <motion.div
        className="absolute end-[4.5rem] top-[4.5rem] h-[6.5rem] w-[6.5rem] translate-x-1/2 -translate-y-1/2 rounded-full border"
        style={{ borderColor: `${ring}33` }}
        animate={animate ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: active ? 26 : 44, repeat: Infinity, ease: "linear" }}
      >
        {orbitIcons.map((OrbitIcon, i) => {
          const angle = (360 / orbitIcons.length) * i;
          return (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 h-0 w-0"
              // Radius tracks the ring: 6.5rem wide → 3.25rem = 52px.
              style={{ transform: `rotate(${angle}deg) translateY(-52px)` }}
            >
              <motion.span
                className="flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border backdrop-blur-sm"
                style={{ borderColor: `${ring}55`, background: `${glow}1a`, color: ring }}
                animate={animate ? { rotate: -360 } : { rotate: 0 }}
                transition={{ duration: active ? 26 : 44, repeat: Infinity, ease: "linear" }}
              >
                <OrbitIcon className="h-3 w-3" />
              </motion.span>
            </span>
          );
        })}
      </motion.div>
    </div>
  );
}
