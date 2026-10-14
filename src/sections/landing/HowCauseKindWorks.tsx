"use client";

import { useCallback, useId, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";

import { TranslatedText } from "@/hooks/useDynamicTranslation";
import { StepMotifIcon } from "./StepMotifIcon";
import { SlotNumber } from "./SlotNumber";
import {
  JOURNEYS,
  type Audience,
} from "./howItWorksData";

const AUDIENCES: Audience[] = ["donor", "donee"];

export function HowCauseKindWorks() {
  const reduceMotion = useReducedMotion();
  const [audience, setAudience] = useState<Audience>("donor");
  const baseId = useId();

  const journey = JOURNEYS[audience];

  return (
    <section
      aria-labelledby={`${baseId}-heading`}
      className="ck-hiw relative isolate overflow-hidden bg-[var(--ck-hiw-bg,#fbf7f2)] py-16 md:py-24 dark:bg-zinc-950"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(176,74,21,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(176,74,21,0.055) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 45%, #000 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 50% 45%, #000 40%, transparent 100%)",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-4 sm:px-6">
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-3xs font-extrabold uppercase tracking-[0.2em] text-[var(--ck-home-ink,#b04a15)]">
            <TranslatedText text="How it works" />
          </p>
          <h2
            id={`${baseId}-heading`}
            className="mt-4 text-balance text-3xl font-black leading-[1.08] tracking-tight text-stone-900 sm:text-4xl lg:text-[3.1rem] dark:text-stone-50"
          >
            <TranslatedText text="From your shelf to someone's life —" />{" "}
            <span className="text-[var(--ck-home-accent,#c54805)]">
              <TranslatedText text="in 4 steps." />
            </span>
          </h2>
        </header>

        <AudienceToggle audience={audience} onChange={setAudience} baseId={baseId} />

        <div className="relative mt-16 md:mt-24 w-full">
          {/* Animated Connecting Line (Desktop) */}
          <div className="absolute top-24 left-0 right-0 hidden md:block" aria-hidden>
            <motion.div
              className="h-[2px] w-full bg-[var(--ck-home-accent,#c54805)] opacity-20 origin-left"
              style={{ borderBottom: "2px dashed var(--ck-home-accent)" }}
              initial={reduceMotion ? false : { scaleX: 0 }}
              whileInView={reduceMotion ? undefined : { scaleX: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-4 gap-6 md:gap-8 pb-12 pt-4 px-2 -mx-2 md:px-0 md:mx-0 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {journey.steps.map((step, i) => (
              <div key={`${audience}-${step.key}`} className="snap-center shrink-0 w-[85vw] sm:w-[60vw] md:w-auto relative group">
                <StepCard
                  step={step}
                  index={i}
                  active={true}
                  audience={audience}
                  reduceMotion={!!reduceMotion}
                  compact={false}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

function AudienceToggle({
  audience,
  onChange,
  baseId,
}: {
  audience: Audience;
  onChange: (a: Audience) => void;
  baseId: string;
}) {
  return (
    <div className="mt-8 flex justify-center">
      <LayoutGroup id={`${baseId}-toggle`}>
        <div
          role="radiogroup"
          aria-label="Choose which side you're on"
          className="relative inline-flex rounded-full border border-[var(--ck-home-soft,#fed7aa)] bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900"
        >
          {AUDIENCES.map((a) => {
            const selected = a === audience;
            return (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => onChange(a)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "ArrowDown") {
                    e.preventDefault();
                    onChange(a === "donor" ? "donee" : "donor");
                  }
                }}
                className={[
                  "relative z-10 min-h-11 cursor-pointer rounded-full px-5 text-sm font-bold transition-colors duration-200 sm:px-7",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ck-home-accent,#c54805)] focus-visible:ring-offset-2",
                  selected ? "text-white" : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100",
                ].join(" ")}
              >
                {selected && (
                  <motion.span
                    layoutId={`${baseId}-toggle-pill`}
                    className="absolute inset-0 -z-10 rounded-full bg-[var(--ck-home-accent,#c54805)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <TranslatedText text={JOURNEYS[a].toggleLabel} />
              </button>
            );
          })}
        </div>
      </LayoutGroup>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

function StepCard({
  step,
  index,
  active,
  audience,
  reduceMotion,
  compact = false,
}: {
  step: { key: string; title: string; body: string; motif: Parameters<typeof StepMotifIcon>[0]["motif"] };
  index: number;
  active: boolean;
  audience: Audience;
  reduceMotion: boolean;
  compact?: boolean;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={audience}
        initial={reduceMotion ? false : { rotateY: -75, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { rotateY: 75, opacity: 0 }}
        transition={
          reduceMotion
            ? { duration: 0.15 }
            : { type: "spring", stiffness: 210, damping: 22, delay: index * 0.07 }
        }
        style={{ transformPerspective: 900 }}
        className="relative h-full"
      >
        {!reduceMotion && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -inset-3 -z-10 rounded-[1.75rem] bg-[var(--ck-home-accent,#c54805)] opacity-0 group-hover:opacity-20"
            transition={{ duration: 0.3 }}
            style={{ filter: "blur(22px)" }}
          />
        )}

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.93, y: 15 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ type: "spring", stiffness: 280, damping: 20, mass: 0.8, delay: index * 0.15 }}
          className={[
            "rounded-3xl border bg-white transition-colors duration-300 dark:bg-zinc-900 h-full flex flex-col",
            compact ? "p-4" : "p-6",
            active
              ? "border-[var(--ck-home-accent,#c54805)] shadow-[0_18px_40px_-26px_rgba(176,74,21,0.65)]"
              : "border-stone-200 dark:border-zinc-800 hover:border-[var(--ck-home-accent,#c54805)] hover:shadow-[0_18px_40px_-26px_rgba(176,74,21,0.65)]",
          ].join(" ")}
        >
          <div className="flex items-start gap-3">
            <span
              className={[
                "grid shrink-0 place-items-center rounded-2xl transition-colors duration-300",
                compact ? "h-11 w-11" : "h-12 w-12",
                active
                  ? "bg-[var(--ck-home-surface,#fff7ed)] text-[var(--ck-home-accent,#c54805)] dark:bg-zinc-800"
                  : "bg-stone-100 text-stone-400 dark:bg-zinc-800 dark:text-zinc-600",
              ].join(" ")}
            >
              <StepMotifIcon motif={step.motif} active={active} className="h-7 w-7" />
            </span>

            <SlotNumber
              value={index + 1}
              active={active}
              className={[
                "ml-auto font-black tabular-nums leading-none transition-colors duration-300",
                compact ? "text-2xl" : "text-3xl",
                active ? "text-[var(--ck-home-accent,#c54805)]" : "text-stone-200 dark:text-zinc-700",
              ].join(" ")}
            />
          </div>

          <h3
            className={[
              "mt-4 font-extrabold leading-snug tracking-tight text-stone-900 dark:text-stone-50",
              compact ? "text-base" : "text-[1.0625rem]",
            ].join(" ")}
          >
            <TranslatedText text={step.title} />
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            <TranslatedText text={step.body} />
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
