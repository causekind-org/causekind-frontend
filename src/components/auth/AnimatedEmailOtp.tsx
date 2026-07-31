"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { OTPInput, REGEXP_ONLY_DIGITS } from "input-otp";
import { Check, Loader2, Mail } from "lucide-react";

/**
 * The six-digit email-verification step, with its animation.
 *
 * <p>Animation behaviour is a from-scratch recreation of a React Native
 * reference (Reanimated + Skia) — behaviour only, no code, and none of its
 * purple. Everything here is the stack CauseKind already ships: framer-motion,
 * input-otp, Tailwind, Lucide.
 *
 * <p><b>One real input.</b> `input-otp` renders a single invisible `<input>`
 * behind the cells, which is what keeps paste, `one-time-code` autofill, the
 * mobile numeric keypad and Backspace working. Six separate inputs would look
 * identical and break all four.
 *
 * <p><b>Success is owned here, but its consequences are not.</b> The caller's
 * `onVerified` fires only after the success animation has played. That ordering
 * is load-bearing: the register page redirects the moment `setUser` runs, so
 * calling it on the API response would unmount this component mid-animation and
 * the user would never see the confirmation.
 */

type Phase = "idle" | "verifying" | "success" | "error";

const SUCCESS_HOLD_MS = 800;   // long enough to read, short enough not to nag
const SHAKE_MS = 420;
const CELLS = 6;

export function AnimatedEmailOtp<T>({
  email,
  verify,
  onVerified,
  onResend,
  onEditDetails,
  labels,
}: {
  email: string;
  /** The API call. Must reject on failure — its message is shown verbatim. */
  verify: (code: string) => Promise<T>;
  /** Fires AFTER the success animation. Do auth/navigation here, not in `verify`. */
  onVerified: (result: T) => void;
  onResend: () => Promise<void>;
  onEditDetails: () => void;
  labels: {
    eyebrow: string; title: string; subtitle: string;
    verify: string; verifying: string; verified: string;
    resend: string; resending: string; editDetails: string;
    /** Inbox guidance shown under the subtitle. Copy lives with the caller. */
    spamFolderHint: string;
  };
}) {
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  /** Per-cell x/y needed to reach the row's centre. Measured, not assumed. */
  const [converge, setConverge] = useState<{ x: number; y: number }[]>([]);

  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  /** Guards the Verify button racing `onComplete` — both call submit(). */
  const inFlight = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  // Every timeout is tracked and cleared — a success hold that fires after
  // unmount would call onVerified on a dead component.
  useEffect(() => () => { timers.current.forEach(clearTimeout); timers.current = []; }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  /**
   * Where each cell must travel to land on the row's centre.
   *
   * <p>Measured from the live boxes rather than computed from a hardcoded cell
   * width, because the grid is responsive — at 320px the cells are narrower and
   * an assumed offset would overshoot.
   */
  const measureConverge = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const r = row.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    setConverge(
      cellRefs.current.slice(0, CELLS).map((el) => {
        if (!el) return { x: 0, y: 0 };
        const b = el.getBoundingClientRect();
        return { x: cx - (b.left + b.width / 2), y: cy - (b.top + b.height / 2) };
      })
    );
  }, []);

  const submit = useCallback(async (value: string) => {
    if (value.length !== CELLS || inFlight.current) return;
    inFlight.current = true;
    setError("");
    setPhase("verifying");
    try {
      const result = await verify(value);
      measureConverge();
      setPhase("success");
      // Hold the moment, THEN hand off. See the class comment.
      later(() => onVerified(result), SUCCESS_HOLD_MS);
    } catch (e) {
      // The backend's own message, never a generic substitute — "expired" and
      // "incorrect" mean different things to someone waiting on an email.
      setError(e instanceof Error ? e.message : "That code didn't work. Please try again.");
      setPhase("error");
      // Released only on the failure path. On success the component is about to
      // unmount, and a late keystroke must not start a second verification.
      inFlight.current = false;
      later(() => {
        setCode("");
        setPhase("idle");
        inputRef.current?.focus();
      }, reduceMotion ? 0 : SHAKE_MS);
    }
  }, [verify, onVerified, measureConverge, later, reduceMotion]);

  async function handleResend() {
    if (resending || cooldown > 0 || phase === "verifying" || phase === "success") return;
    setResending(true);
    try {
      await onResend();
      // Reset value, error and animation state — without remounting anything.
      setCode("");
      setError("");
      setPhase("idle");
      inFlight.current = false;
      setCooldown(60);
      inputRef.current?.focus();
    } finally {
      setResending(false);
    }
  }

  const locked = phase === "verifying" || phase === "success";

  return (
    <div className="w-full max-w-[460px] mx-auto space-y-6 relative z-10 rounded-3xl border border-white/60 bg-white/85 px-8 py-10 shadow-xl backdrop-blur-sm dark:border-zinc-700/30 dark:bg-zinc-900/75">
      {/* ── Heading: crossfades to the verified state ─────────────────────── */}
      <div className="min-h-[104px] space-y-1.5">
        <span className="text-[11px] font-black uppercase tracking-widest text-[#b04a15] dark:text-[#e07b3a]">
          {labels.eyebrow}
        </span>
        <div className="relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={phase === "success" ? "done" : "ask"}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            >
              <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50 sm:text-4xl">
                {phase === "success" ? labels.verified : labels.title}
              </h1>
              {phase !== "success" && (
                <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
                  {labels.subtitle}{" "}
                  <span className="font-semibold text-stone-700 dark:text-stone-300">{email}</span>
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Inbox guidance ────────────────────────────────────────────────
             Deliberately NOT inside the aria-live region further down: that
             region announces verifying / success / failure, and this is
             standing guidance, not a status change. `role="note"` instead.

             It collapses its own height on success rather than being dropped
             by the heading's AnimatePresence. Unmounting outright would take
             ~50px out of the layout the instant the success state begins and
             visibly jerk the cells upward, right as the check animates in. */}
        <AnimatePresence initial={false}>
          {phase !== "success" && (
            <motion.div
              key="spam-hint"
              role="note"
              className="overflow-hidden"
              initial={reduceMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            >
              <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200/70 bg-amber-50/70 px-3 py-2.5 text-[12.5px] leading-relaxed text-stone-600 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-stone-300">
                <Mail className="mt-px size-4 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden />
                <span className="min-w-0">{labels.spamFolderHint}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── The cells ─────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <motion.div
          // Shake lives on this wrapper, so it never fights the per-cell
          // convergence transform (rule: one system per property).
          animate={phase === "error" && !reduceMotion ? { x: [0, -9, 8, -6, 4, 0] } : { x: 0 }}
          transition={{ duration: SHAKE_MS / 1000, ease: "easeInOut" }}
        >
          <OTPInput
            ref={inputRef}
            maxLength={CELLS}
            value={code}
            onChange={(v) => { setCode(v); if (error) { setError(""); setPhase("idle"); } }}
            onComplete={submit}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label={`Six digit verification code sent to ${email}`}
            disabled={locked}
            containerClassName="w-full"
            render={({ slots }) => (
              <div
                ref={rowRef}
                // Grid, not flex: six equal columns that shrink together, so
                // there is no overflow at 320px and no reflow as digits land.
                className="relative grid grid-cols-6 gap-1.5 sm:gap-2"
              >
                {slots.map((slot, i) => (
                  <Cell
                    key={i}
                    index={i}
                    ref={(el) => { cellRefs.current[i] = el; }}
                    slot={slot}
                    phase={phase}
                    converge={converge[i]}
                    reduceMotion={!!reduceMotion}
                  />
                ))}

                {/* Success mark sits above the converged cells, centred in the
                    same box they collapse into. */}
                <AnimatePresence>
                  {phase === "success" && (
                    <motion.div
                      className="pointer-events-none absolute inset-0 flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: reduceMotion ? 0 : 0.18 }}
                    >
                      <motion.span
                        className="flex size-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg"
                        initial={reduceMotion ? false : { scale: 0.4 }}
                        animate={{ scale: 1 }}
                        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 18, delay: 0.2 }}
                      >
                        <Check className="size-7" strokeWidth={3} aria-hidden />
                      </motion.span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          />
        </motion.div>

        {/* One live region for every status change — verifying, success, error. */}
        <p aria-live="polite" className="sr-only">
          {phase === "verifying" ? labels.verifying : phase === "success" ? labels.verified : ""}
        </p>

        <div className="min-h-[20px] text-center">
          <AnimatePresence mode="wait" initial={false}>
            {phase === "verifying" && (
              <motion.p
                key="v"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400"
              >
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                {labels.verifying}
              </motion.p>
            )}
            {error && phase !== "verifying" && (
              <motion.p
                key="e"
                role="alert"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-xs font-medium text-red-600 dark:text-red-400"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => submit(code)}
        disabled={locked || code.length !== CELLS}
        className="w-full rounded-xl bg-[#b04a15] py-3.5 text-sm font-semibold tracking-wide text-white transition-all duration-300 hover:bg-[#963c0d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
      >
        {phase === "verifying" ? labels.verifying : phase === "success" ? labels.verified : labels.verify}
      </button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onEditDetails}
          disabled={locked}
          className="min-h-[44px] text-stone-500 underline-offset-2 hover:underline disabled:opacity-50 dark:text-stone-400"
        >
          ← {labels.editDetails}
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || cooldown > 0 || locked}
          className="min-h-[44px] font-semibold text-[#b04a15] underline-offset-2 hover:underline disabled:no-underline disabled:opacity-50 dark:text-[#e07b3a]"
        >
          {cooldown > 0 ? `${labels.resend} (${cooldown}s)` : resending ? labels.resending : labels.resend}
        </button>
      </div>
    </div>
  );
}

// ── One cell ────────────────────────────────────────────────────────────────

type Slot = { char: string | null; isActive: boolean; hasFakeCaret: boolean };

/**
 * Border/glow are CSS class transitions; transform and opacity are framer-motion.
 * Splitting them that way is deliberate — two systems animating one property
 * fight over the exit and strand it mid-transition.
 */
const Cell = ({ ref, index, slot, phase, converge, reduceMotion }: {
  ref: (el: HTMLDivElement | null) => void;
  index: number;
  slot: Slot;
  phase: Phase;
  converge?: { x: number; y: number };
  reduceMotion: boolean;
}) => {
  const filled = slot.char != null;
  const sweeping = phase === "verifying" && !reduceMotion;
  const success = phase === "success";

  return (
    <motion.div
      ref={ref}
      animate={
        success && converge && !reduceMotion
          ? { x: converge.x, y: converge.y, scale: 0.55, opacity: 0 }
          : { x: 0, y: 0, scale: 1, opacity: success && reduceMotion ? 0 : 1 }
      }
      transition={
        success
          ? { type: "spring", stiffness: 260, damping: 26, delay: reduceMotion ? 0 : index * 0.02 }
          : { duration: 0.2 }
      }
      className={[
        "relative flex h-14 items-center justify-center rounded-xl border bg-stone-50 font-mono text-xl font-bold",
        "text-stone-900 transition-[border-color,box-shadow,background-color] duration-200",
        "dark:bg-zinc-900 dark:text-stone-100",
        phase === "error"
          ? "border-red-500 ring-2 ring-red-500/25"
          : slot.isActive
            ? "border-[#b04a15] ring-2 ring-[#b04a15]/25 dark:border-[#e07b3a]"
            : filled
              // Completed cells keep a quiet copper tint — progress you can see
              // without it competing with the active cell.
              ? "border-[#e07b3a]/50 bg-[#b04a15]/[0.04] dark:bg-[#e07b3a]/[0.06]"
              : "border-stone-200 dark:border-zinc-800",
      ].join(" ")}
    >
      {/* Digit springs in on change. Keyed on the char so re-entering the same
          digit still replays it. */}
      <AnimatePresence mode="popLayout" initial={false}>
        {filled && (
          <motion.span
            key={slot.char}
            initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 24 }}
          >
            {slot.char}
          </motion.span>
        )}
      </AnimatePresence>

      {slot.hasFakeCaret && !reduceMotion && (
        <span className="absolute h-6 w-px animate-pulse bg-[#b04a15] dark:bg-[#e07b3a]" />
      )}

      {/* Verifying sweep: an illuminated border travelling cell to cell.
          Copper, with a navy tail — restrained, and never the reference's purple. */}
      {sweeping && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl border-2"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 1, 0],
            borderColor: ["#1e3a60", "#e07b3a", "#1e3a60"],
            boxShadow: [
              "0 0 0 0 rgba(224,123,58,0)",
              "0 0 12px 2px rgba(224,123,58,0.45)",
              "0 0 0 0 rgba(224,123,58,0)",
            ],
          }}
          transition={{
            duration: 1.1,
            times: [0, 0.5, 1],
            repeat: Infinity,
            delay: index * 0.11,   // the sweep
            ease: "easeInOut",
          }}
        />
      )}
    </motion.div>
  );
};
