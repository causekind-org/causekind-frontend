"use client";

import { motion, useReducedMotion, type Transition } from "framer-motion";
import type { StepMotif } from "./howItWorksData";

/**
 * The four step glyphs, drawn rather than imported.
 *
 * <p><b>Why not lucide.</b> The rest of the site uses lucide and should keep
 * doing so — but these four are the only icons on the page that have to *act*:
 * the box opens, the pin drops, the hands meet, the certificate unrolls. A
 * lucide glyph is a single static path with no named interior parts, so the
 * best you can do is scale or spin the whole thing, which reads as decoration.
 * These are built from separately-addressable parts so the motion can describe
 * the step instead of merely accompanying it.
 *
 * <p>Each is on a 48×48 grid with a 2px stroke, matching lucide's proportions
 * closely enough that they sit beside the site's other icons without looking
 * like a different set. Colour comes from `currentColor`.
 *
 * <p><b>Reduced motion:</b> every part renders in its resting *final* pose with
 * no transition. The glyph still reads correctly — an open box is an open box
 * whether or not you watched the flaps move.
 */

const SPRING: Transition = { type: "spring", stiffness: 260, damping: 18, mass: 0.7 };

export function StepMotifIcon({
  motif,
  active,
  className = "",
}: {
  motif: StepMotif;
  /** The line has reached this step. Drives every part's pose. */
  active: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  // Under reduced motion the glyph is drawn as if it had already played.
  const on = reduceMotion ? true : active;
  const t = reduceMotion ? { duration: 0 } : SPRING;

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {motif === "box" && <BoxGlyph on={on} t={t} />}
      {motif === "pin" && <PinGlyph on={on} t={t} reduceMotion={!!reduceMotion} />}
      {motif === "handshake" && <HandshakeGlyph on={on} t={t} />}
      {motif === "certificate" && <CertificateGlyph on={on} t={t} />}
    </svg>
  );
}

/** A carton whose two flaps fall open. */
function BoxGlyph({ on, t }: { on: boolean; t: Transition }) {
  return (
    <>
      {/* Body */}
      <path d="M10 20 H38 V38 A2 2 0 0 1 36 40 H12 A2 2 0 0 1 10 38 Z" />
      <path d="M24 20 V40" opacity={0.35} />
      {/* Flaps. Hinged at the top edge of the body, so opening is a rotation
          about that hinge rather than a translation — the difference between a
          box opening and two lines sliding. */}
      <motion.path
        d="M24 20 L10 20 L14 11 L24 20 Z"
        style={{ originX: "24px", originY: "20px" }}
        initial={false}
        animate={{ rotate: on ? -26 : 0, y: on ? -1 : 0 }}
        transition={t}
      />
      <motion.path
        d="M24 20 L38 20 L34 11 L24 20 Z"
        style={{ originX: "24px", originY: "20px" }}
        initial={false}
        animate={{ rotate: on ? 26 : 0, y: on ? -1 : 0 }}
        transition={t}
      />
    </>
  );
}

/** A map pin that drops in and settles, with the ground ring it lands on. */
function PinGlyph({ on, t, reduceMotion }: { on: boolean; t: Transition; reduceMotion: boolean }) {
  return (
    <>
      {/* The ring is the "within 10 km" idea, so it expands as the pin lands
          rather than simply appearing. */}
      <motion.ellipse
        cx={24}
        cy={40}
        rx={11}
        ry={3.5}
        strokeDasharray="3 3"
        initial={false}
        animate={{ scale: on ? 1 : 0.3, opacity: on ? 0.9 : 0 }}
        style={{ originX: "24px", originY: "40px" }}
        transition={reduceMotion ? t : { ...t, delay: 0.12 }}
      />
      <motion.g
        initial={false}
        animate={{ y: on ? 0 : -14, opacity: on ? 1 : 0 }}
        transition={reduceMotion ? t : { type: "spring", stiffness: 420, damping: 14, mass: 0.6 }}
      >
        <path d="M24 34 C24 34 34 24.5 34 18 A10 10 0 1 0 14 18 C14 24.5 24 34 24 34 Z" />
        <circle cx={24} cy={18} r={3.5} />
      </motion.g>
    </>
  );
}

/** Two hands closing the gap between them. */
function HandshakeGlyph({ on, t }: { on: boolean; t: Transition }) {
  return (
    <>
      <motion.path
        d="M6 26 L14 20 L22 24 L26 28"
        initial={false}
        animate={{ x: on ? 0 : -7, opacity: on ? 1 : 0.35 }}
        transition={t}
      />
      <motion.path
        d="M42 26 L34 20 L26 24 L22 28"
        initial={false}
        animate={{ x: on ? 0 : 7, opacity: on ? 1 : 0.35 }}
        transition={t}
      />
      {/* The clasp: only exists once the two sides have met, which is the whole
          point of the step. */}
      <motion.circle
        cx={24}
        cy={26}
        r={4.5}
        initial={false}
        animate={{ scale: on ? 1 : 0, opacity: on ? 1 : 0 }}
        style={{ originX: "24px", originY: "26px" }}
        transition={{ ...t, delay: on ? 0.1 : 0 }}
      />
    </>
  );
}

/** A rolled sheet that unrolls downward, leaving a seal. */
function CertificateGlyph({ on, t }: { on: boolean; t: Transition }) {
  return (
    <>
      {/* The roll at the top stays put; the sheet grows out from under it. */}
      <motion.g
        initial={false}
        animate={{ scaleY: on ? 1 : 0.06 }}
        style={{ originX: "24px", originY: "12px" }}
        transition={t}
      >
        <path d="M12 12 H36 V36 H12 Z" />
        <path d="M17 20 H31" opacity={0.55} />
        <path d="M17 26 H27" opacity={0.55} />
      </motion.g>
      <path d="M11 12 H37" />
      <motion.circle
        cx={32}
        cy={34}
        r={4}
        initial={false}
        animate={{ scale: on ? 1 : 0, rotate: on ? 0 : -90 }}
        style={{ originX: "32px", originY: "34px" }}
        transition={{ ...t, delay: on ? 0.16 : 0 }}
      />
    </>
  );
}
