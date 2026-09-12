"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

export type PathwayTone = "donor" | "donee";

/**
 * PathwaySceneGanpati — Reskinned holographic scan scene with festive Ganpati palette.
 * 
 * Saffron/terracotta palette on the donor side.
 * Deep temple maroon into gold on the donee side.
 * 
 * Features:
 * - Continuous slow rotation animation on orbiting ring
 * - Idle floating animation on center motif
 * - Reskinned festive icons (ModakIcon for donor center, LotusIcon for donee center)
 */
export default function PathwaySceneGanpati({
  tone,
  Icon,
  orbitIcons,
  active,
  inView,
  frame = false,
  motif = { x: "calc(100% - 4.5rem)", y: "4.5rem" },
}: {
  tone: PathwayTone;
  Icon: React.ComponentType<{ className?: string }>;
  orbitIcons: React.ComponentType<{ className?: string }>[];
  active: boolean;
  inView: boolean;
  frame?: boolean;
  motif?: { x: string; y: string };
}) {
  const reduceMotion = useReducedMotion();
  const animate = !reduceMotion && inView;

  const isDonor = tone === "donor";

  // Saffron/terracotta for donor; temple maroon for donee. The maroon is
  // the same red the panel wash and the CTA ramp use, rather than the three
  // neighbouring wines this half carried before.
  const ring = isDonor ? "rgb(234 88 12)" : "rgb(107 23 23)";
  const glow = isDonor ? "rgb(245 158 11)" : "rgb(202 138 4)";
  const greenAccent = "rgb(20 83 45)";

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
          opacity: active ? 0.65 : 0.35,
          background: isDonor
            ? `radial-gradient(120% 90% at 50% 15%, ${glow}2e 0%, transparent 62%)`
            : `radial-gradient(120% 90% at 50% 15%, ${ring}33 0%, ${greenAccent}1f 45%, transparent 70%)`,
        }}
      />

      {/* Perspective floor grid */}
      <div
        className="absolute inset-x-[-30%] bottom-[-18%] h-[62%] transition-opacity duration-500"
        style={{
          opacity: active ? 0.5 : 0.25,
          transform: "rotateX(66deg)",
          transformOrigin: "bottom center",
          backgroundImage: `
            linear-gradient(to right, ${ring}38 1px, transparent 1px),
            linear-gradient(to bottom, ${ring}38 1px, transparent 1px)`,
          backgroundSize: "22px 22px",
          maskImage: "linear-gradient(to top, black 8%, transparent 78%)",
          WebkitMaskImage: "linear-gradient(to top, black 8%, transparent 78%)",
        }}
      />

      {/* Scanning line */}
      <motion.div
        className="absolute inset-x-0 h-10"
        style={{
          background: `linear-gradient(to bottom, transparent, ${glow}38, transparent)`,
        }}
        initial={{ y: "-20%", opacity: 0 }}
        animate={
          animate && active
            ? { y: ["-20%", "420%"], opacity: [0, 1, 1, 0] }
            : { opacity: 0 }
        }
        transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 0.6, ease: "linear" }}
      />

      {/* Holographic frame corners (optional) */}
      {frame &&
        [
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

      {/* Emblem + Orbit */}
      <div
        className="absolute inset-0 scale-[0.62] sm:scale-100"
        style={{ transformOrigin: `${motif.x} ${motif.y}` }}
      >
        {/* Center Emblem with gentle floating idle loop */}
        <motion.div
          className="absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border backdrop-blur-sm shadow-md"
          style={{
            left: motif.x,
            top: motif.y,
            borderColor: isDonor ? "rgba(234, 88, 12, 0.4)" : "rgba(107, 23, 23, 0.4)",
            background: isDonor ? "rgba(245, 158, 11, 0.15)" : "rgba(107, 23, 23, 0.15)",
            color: ring,
          }}
          animate={
            animate
              ? { y: active ? [-6, 4, -6] : [-3, 2, -3], scale: active ? 1.08 : 1 }
              : { y: 0, scale: active ? 1.08 : 1 }
          }
          transition={{
            y: { duration: active ? 3.2 : 5, repeat: Infinity, ease: "easeInOut" },
            scale: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
          }}
        >
          <Icon className="h-6 w-6 drop-shadow-sm" />
        </motion.div>

        {/* Orbiting ring with continuous slow rotation */}
        <motion.div
          className="absolute h-[6.5rem] w-[6.5rem] -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{
            left: motif.x,
            top: motif.y,
            borderColor: isDonor ? "rgba(234, 88, 12, 0.28)" : "rgba(107, 23, 23, 0.28)",
          }}
          animate={animate ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: active ? 26 : 44, repeat: Infinity, ease: "linear" }}
        >
          {orbitIcons.map((OrbitIcon, i) => {
            const angle = (360 / orbitIcons.length) * i;
            return (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 h-0 w-0"
                style={{ transform: `rotate(${angle}deg) translateY(-52px)` }}
              >
                <motion.span
                  className="flex h-6.5 w-6.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border backdrop-blur-sm shadow-sm"
                  style={{
                    borderColor: isDonor ? "rgba(234, 88, 12, 0.4)" : "rgba(107, 23, 23, 0.4)",
                    background: isDonor ? "rgba(254, 240, 138, 0.2)" : "rgba(254, 240, 138, 0.15)",
                    color: ring,
                  }}
                  animate={animate ? { rotate: [-angle, -angle - 360] } : { rotate: -angle }}
                  transition={{ duration: active ? 26 : 44, repeat: Infinity, ease: "linear" }}
                >
                  <OrbitIcon className="h-3.5 w-3.5" />
                </motion.span>
              </span>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
