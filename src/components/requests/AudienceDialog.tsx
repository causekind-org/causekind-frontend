"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, Pause, Play } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AUDIENCE_OPTIONS, type RequestAudience } from "@/lib/requestAudience";
import AudienceIllustration from "./AudienceIllustration";

/**
 * "Who would you like to help?" prompt for the guest board.
 *
 * Purely presentational: the board owns the audience state and decides when
 * this opens. One tap on an option chooses and closes — there is no Continue
 * step. Nothing is saved; the board opens this on every visit. Built on the
 * shared Radix dialog, which supplies the focus trap, inert background, scroll
 * lock and Escape.
 */
export default function AudienceDialog({
  open,
  current,
  returnFocusId,
  onChoose,
  onDismiss,
}: {
  open: boolean;
  current: RequestAudience;
  /** Id of the page control to focus once the dialog closes. */
  returnFocusId: (audience: RequestAudience) => string;
  onChoose: (audience: RequestAudience) => void;
  onDismiss: () => void;
}) {
  const [userPaused, setUserPaused] = useState(false);
  const [docHidden, setDocHidden] = useState(false);
  const closingRef = useRef(false);
  const chosenRef = useRef<RequestAudience | null>(null);
  // The option just tapped: its illustration settles to rest while the dialog exits.
  const [chosen, setChosen] = useState<RequestAudience | null>(null);
  // One modal-level switch for all three illustrations. Reduced motion is
  // handled in CSS, so it also reacts if the OS setting changes while open.
  const [reducedMotion, setReducedMotion] = useState(false);
  const playing = open && !userPaused && !docHidden;

  // Tracked only to explain the stillness: the CSS already stops the loops
  // under reduced motion, and this follows the setting live.
  useEffect(() => {
    if (!open || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    closingRef.current = false;
    setChosen(null);
    const sync = () => setDocHidden(document.visibilityState === "hidden");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [open]);

  const choose = (a: RequestAudience) => {
    if (closingRef.current) return;
    closingRef.current = true;
    chosenRef.current = a;
    setChosen(a);
    onChoose(a);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (next || closingRef.current) return;
        closingRef.current = true;
        chosenRef.current = null;
        onDismiss();
      }}
    >
      <DialogContent
        onCloseAutoFocus={e => {
          const el = document.getElementById(returnFocusId(chosenRef.current ?? current));
          if (el) {
            e.preventDefault();
            el.focus();
          }
        }}
        className={`max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-[calc(100%-2rem)] max-w-[680px] overflow-y-auto bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] dark:bg-zinc-900 sm:p-7`}
      >
        <div className="pe-10">
          <DialogTitle className="text-[1.4rem] font-semibold leading-tight tracking-tight">
            Who would you like to help?
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-sm text-stone-600 dark:text-stone-300">
            Choose what you see first. You can change this anytime.
          </DialogDescription>
        </div>

        <div role="group" aria-label="Whose requests to show" className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
          {AUDIENCE_OPTIONS.map(o => {
            const selected = o.value === current;
            const vars = {
              "--aud-a": o.light.accent, "--aud-t": o.light.tint,
              "--aud-ad": o.dark.accent, "--aud-td": o.dark.tint,
              "--aud-ts": `color-mix(in srgb, ${o.light.accent} 18%, transparent)`,
              "--aud-tsd": `color-mix(in srgb, ${o.dark.accent} 26%, transparent)`,
            } as CSSProperties;
            return (
              <button
                key={o.value}
                type="button"
                style={vars}
                aria-pressed={selected}
                onClick={() => choose(o.value)}
                className={`group relative flex min-h-[72px] w-full items-center gap-3 rounded-xl border bg-white p-3 text-start transition-[color,background-color,border-color,translate,scale] duration-150 hover:-translate-y-px active:scale-[0.97] motion-reduce:transition-colors motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aud-a)] focus-visible:ring-offset-2 dark:bg-zinc-900 dark:focus-visible:ring-[var(--aud-ad)] dark:focus-visible:ring-offset-zinc-900 sm:min-h-[232px] sm:flex-col sm:items-center sm:justify-start sm:gap-4 sm:px-4 sm:pb-5 sm:pt-8 sm:text-center ${
                  selected
                    ? "border-2 border-[var(--aud-a)] dark:border-[var(--aud-ad)]"
                    : "border-stone-200 hover:border-[var(--aud-a)] dark:border-white/10 dark:hover:border-[var(--aud-ad)]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--aud-t)] text-[var(--aud-a)] transition-colors group-hover:bg-[var(--aud-ts)] dark:bg-[var(--aud-td)] dark:text-[var(--aud-ad)] dark:group-hover:bg-[var(--aud-tsd)] sm:h-20 sm:w-20 sm:rounded-2xl"
                >
                  <span className="block h-8 w-8 sm:h-14 sm:w-14">
                    <AudienceIllustration audience={o.value} playing={playing} settled={chosen === o.value} />
                  </span>
                </span>
                <span className="min-w-0 flex-1 sm:flex-none">
                  <span className="block text-[15px] font-semibold leading-snug text-stone-900 dark:text-stone-50 sm:text-base">
                    {o.label}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-stone-600 dark:text-stone-300 sm:text-sm">
                    {o.description}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 shrink-0 sm:absolute sm:end-3 sm:top-3 items-center justify-center rounded-full border ${
                    selected
                      ? "border-[var(--aud-a)] bg-[var(--aud-a)] text-white dark:border-[var(--aud-ad)] dark:bg-[var(--aud-ad)] dark:text-zinc-900"
                      : "border-stone-300 dark:border-white/20"
                  }`}
                >
                  {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                {selected && <span className="sr-only">(current)</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500 dark:text-stone-400">
          <span>You can switch anytime with the buttons above the requests.</span>
          {reducedMotion ? (
            <span>Animations are off because reduced motion is on for this device.</span>
          ) : (
          <button
            type="button"
            onClick={() => setUserPaused(p => !p)}
            aria-pressed={userPaused}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 font-medium hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 motion-reduce:hidden dark:hover:text-stone-200"
          >
            {userPaused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
            {userPaused ? "Play animations" : "Pause animations"}
          </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
