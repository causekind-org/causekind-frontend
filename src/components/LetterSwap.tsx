"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

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

/**
 * Swaps one string for another, a character at a time, on a 3D flip.
 *
 * <p>Built here rather than installed. The obvious route was
 * `npx shadcn@latest add` from a component registry, and that command is
 * forbidden in this repo — `src/components/ui/` are hand-maintained copies and
 * the CLI overwrites local customisations (see CLAUDE.md). The effect is a
 * few dozen lines of `framer-motion`, which is already a dependency.
 *
 * <p><b>It wraps like ordinary text, and that took two goes.</b> The first
 * version laid every character out in one `whitespace-pre` run, which preserved
 * the spaces and also removed every break opportunity in the line — a heading
 * longer than its column ran straight off the right of the screen. Words are the
 * wrap unit now: each word is an `inline-block` so it cannot break mid-word, and
 * the spaces between them sit in normal flow, so the line breaks exactly where
 * the untouched text would have.
 *
 * <p><b>Accessibility.</b> The characters are decorative: the whole run is
 * `aria-hidden` and the real string is exposed once to assistive tech, so a
 * screen reader reads the sentence and not a pile of letters. Under
 * `prefers-reduced-motion` the text simply changes, with no motion at all.
 */
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

  const words = text.split(" ");

  // Where each word starts in the overall character count, so the cascade runs
  // continuously across the line rather than restarting at every word.
  const offsets: number[] = [];
  let running = 0;
  for (const word of words) {
    offsets.push(running);
    running += word.length + 1; // the space counts, so the rhythm stays even
  }

  const perLetter =
    text.length > 1 ? Math.min(0.022, MAX_CASCADE_MS / 1000 / (text.length - 1)) : 0;

  return (
    <span className={className}>
      {/* The accessible copy — one string, not a pile of glyphs. */}
      <span className="sr-only">{text}</span>

      {/*
        `initial` is left on, and that is the whole reason the headings move.

        With `initial={false}` a mount produces no animation — only a change of
        `text` does. The switcher label changes text, so it flipped; the headings
        never change theirs, they only mount when the door remounts the slot, so
        they silently did nothing at all. Structure was there, motion was not.
      */}
      <AnimatePresence mode="wait">
        <motion.span key={text} aria-hidden className="[transform-style:preserve-3d]">
          {words.map((word, w) => (
            <span key={`${word}-${w}`}>
              <span className="inline-block">
                {Array.from(word).map((char, c) => (
                  <motion.span
                    key={`${char}-${c}`}
                    className="inline-block [backface-visibility:hidden]"
                    initial={{ rotateX: -90, opacity: 0, y: "0.25em" }}
                    animate={{ rotateX: 0, opacity: 1, y: 0 }}
                    exit={{ rotateX: 90, opacity: 0, y: "-0.25em" }}
                    transition={{
                      duration: 0.26,
                      delay: (offsets[w] + c) * perLetter,
                      ease: [0.22, 0.61, 0.36, 1],
                    }}
                  >
                    {char}
                  </motion.span>
                ))}
              </span>
              {/* Outside the inline-block on purpose: a space inside one is not
                  a break opportunity, which is the bug this replaces. */}
              {w < words.length - 1 ? " " : null}
            </span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default LetterSwap;
