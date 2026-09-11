"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * Swaps one short string for another, a character at a time, on a 3D flip.
 *
 * <p>Built here rather than installed. The obvious route was
 * `npx shadcn@latest add` from a component registry, and that command is
 * forbidden in this repo — `src/components/ui/` are hand-maintained copies and
 * the CLI overwrites local customisations (see CLAUDE.md). The effect is a
 * dozen lines of `framer-motion`, which is already a dependency.
 *
 * <p><b>For short labels only.</b> Per-character motion is legible on two or
 * three words and becomes unreadable on a sentence — every letter arrives at a
 * different moment, so the eye never gets a whole word to land on. Body copy
 * and cards should cross-fade as blocks instead.
 *
 * <p><b>Accessibility.</b> The characters are decorative: the whole run is
 * `aria-hidden` and the real string is exposed once to assistive tech, so a
 * screen reader reads "I have something" and not eighteen separate letters.
 * Under `prefers-reduced-motion` the text simply changes, with no motion at all.
 */
/**
 * The whole cascade, first letter to last, is capped at this.
 *
 * <p>A flat per-character delay does not survive a long string: at 22ms a
 * six-word heading takes three quarters of a second to finish arriving, which
 * stops reading as a flourish and starts reading as a slow page. The per-letter
 * delay is derived from the text length instead, so a two-word label and a
 * seven-word heading both land in about the same time — the longer one simply
 * moves in tighter succession.
 */
const MAX_CASCADE_MS = 300;

export function LetterSwap({
  text,
  className = "",
}: {
  /** The current string. Changing it is what triggers the swap. */
  text: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <span className={className}>{text}</span>;

  const perLetter = text.length > 1
    ? Math.min(0.022, MAX_CASCADE_MS / 1000 / (text.length - 1))
    : 0;

  return (
    <span className={`relative inline-block ${className}`}>
      {/* The accessible copy — one string, not a pile of glyphs. */}
      <span className="sr-only">{text}</span>

      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={text}
          aria-hidden
          className="inline-block whitespace-pre [transform-style:preserve-3d]"
        >
          {Array.from(text).map((char, i) => (
            <motion.span
              key={`${char}-${i}`}
              className="inline-block [backface-visibility:hidden]"
              initial={{ rotateX: -90, opacity: 0, y: "0.25em" }}
              animate={{ rotateX: 0, opacity: 1, y: 0 }}
              exit={{ rotateX: 90, opacity: 0, y: "-0.25em" }}
              transition={{
                duration: 0.26,
                delay: i * perLetter,
                ease: [0.22, 0.61, 0.36, 1],
              }}
            >
              {/* A plain space collapses in an inline-block; this keeps the
                  word gaps at their real width while still animating. */}
              {char === " " ? " " : char}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default LetterSwap;
