"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

/**
 * Animated category picker for the blog.
 *
 * <p><b>Why this is hand-built rather than the repo's Radix dropdown.</b> Radix
 * unmounts its content the instant `open` flips, so `AnimatePresence` never gets
 * to play an exit — a long-standing, well-documented friction point
 * (radix-ui/primitives discussion #1115). A staggered open AND a graceful close
 * is the whole point here, so the menu owns its own open state and lets
 * `AnimatePresence` control the unmount.
 *
 * <p>Animation is the staggered-dropdown pattern popularised by hover.dev /
 * ogblocks: the panel scales up from `originY: 0` so it appears to grow out from
 * under the trigger, while `staggerChildren` deals the rows in one after another.
 * Written from the technique, not copied — the markup, tokens and a11y here are
 * CauseKind's.
 *
 * <p>Accessibility is hand-rolled for the same reason: `listbox`/`option` roles,
 * `aria-expanded`, Escape-to-close with focus returned to the trigger, arrow-key
 * navigation, and an outside-pointer close.
 */

const panelVariants = {
  open: {
    scaleY: 1,
    opacity: 1,
    transition: { when: "beforeChildren" as const, staggerChildren: 0.035, duration: 0.18 },
  },
  closed: {
    scaleY: 0.85,
    opacity: 0,
    transition: { when: "afterChildren" as const, staggerChildren: 0.015, staggerDirection: -1, duration: 0.14 },
  },
};

const rowVariants = {
  open: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 420, damping: 32 } },
  closed: { opacity: 0, y: -8 },
};

export function CategoryDropdown({
  categories,
  selected,
  onSelect,
  renderLabel,
  label,
}: {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
  /** The page owns translation, so labels come in already localised. */
  renderLabel: (category: string) => string;
  /** Visible heading, e.g. "Categories". */
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const reduceMotion = useReducedMotion();

  // Opening should start from what is currently selected, not from the top.
  useEffect(() => {
    if (open) setCursor(Math.max(0, categories.indexOf(selected)));
  }, [open, categories, selected]);

  // `pointerdown`, not `click`: closing on click would fire after the page had
  // already handled the press, so a tap on another control read as two actions.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const choose = (category: string) => {
    onSelect(category);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(categories.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(categories[cursor]);
    }
  };

  return (
    <div ref={rootRef} className="relative w-full" onKeyDown={onKeyDown}>
      <p className="pb-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
        {label}
      </p>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-sm font-bold text-stone-800 shadow-sm transition-colors hover:border-[#b04a15]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]/30 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
      >
        <span className="min-w-0 truncate">{renderLabel(selected)}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 30 }}
          className="shrink-0 text-stone-400"
        >
          <ChevronDown className="size-4" aria-hidden />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            role="listbox"
            aria-label={label}
            initial="closed"
            animate="open"
            exit="closed"
            variants={reduceMotion ? undefined : panelVariants}
            // Grows out from under the trigger rather than fading in place.
            style={{ originY: 0 }}
            className="absolute z-30 mt-2 max-h-[min(60vh,22rem)] w-full overflow-y-auto overscroll-contain rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl dark:border-stone-800 dark:bg-stone-900"
          >
            {categories.map((category, i) => {
              const isSelected = category === selected;
              return (
                <motion.li key={category} variants={reduceMotion ? undefined : rowVariants}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => choose(category)}
                    onPointerEnter={() => setCursor(i)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold transition-colors ${
                      isSelected
                        ? "text-[#b04a15] dark:text-orange-400"
                        : "text-stone-600 dark:text-stone-300"
                    } ${i === cursor ? "bg-stone-100 dark:bg-stone-800" : ""}`}
                  >
                    <span className="min-w-0 truncate">{renderLabel(category)}</span>
                    {isSelected && <Check className="size-4 shrink-0" aria-hidden />}
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
