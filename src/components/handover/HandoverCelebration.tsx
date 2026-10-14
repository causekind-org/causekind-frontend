"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "@/lib/toast";
import { useAuth } from "@/hooks/useAuth";
import {
  initiatePlatformTip,
  submitHandoverFeedback,
  type HandoverFeedbackContextType,
} from "@/lib/api";
import { handoverScope, type HandoverRole } from "@/features/handover/model";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

type Step = "celebrate" | "feedback" | "tip" | "done";

type Props = {
  contextType: HandoverFeedbackContextType;
  contextId: number;
  open: boolean;
  onClose: () => void;
  /**
   * Which side of THIS transaction the viewer is on.
   *
   * <p>Deliberately not the account role: a donor viewing a handover where they
   * happen to be the recipient must see the recipient's colour here. That is why
   * this screen uses `--handover-*` and never `--ck-role-*`.
   *
   * <p>Optional so the celebration still renders (in the donor palette, the
   * historical default) if a caller has no view model to hand.
   */
  role?: HandoverRole;
};

const TIP_PRESETS = [20, 50, 100];

/**
 * The five-point mood scale.
 *
 * <p>Emoji rather than the hand-drawn SVG arcs this used to carry. They read
 * instantly and need no styling, at the cost of looking slightly different on
 * every platform — Apple, Google and Microsoft each draw these differently.
 * That is acceptable here because the emoji is decorative: the visible text
 * label underneath is what actually names the choice, so nothing depends on a
 * user reading the glyph correctly.
 *
 * <p>Deliberately restrained faces. 😍 or 🤩 at the top of a scale about giving
 * away a possession would strike the wrong note; this is quiet satisfaction,
 * not excitement.
 */
const RATING_FACES: { value: number; label: string; emoji: string }[] = [
  { value: 1, label: "Not great", emoji: "😕" },
  { value: 2, label: "Okay", emoji: "🙂" },
  { value: 3, label: "Good", emoji: "😊" },
  { value: 4, label: "Great", emoji: "😄" },
  { value: 5, label: "Amazing", emoji: "🥰" },
];

function RatingFace({
  value, selected, onSelect,
}: {
  value: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const face = RATING_FACES[value - 1];
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.08 }}
      animate={selected ? { scale: 1.12, y: -4 } : { scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 15 }}
      className="flex flex-col items-center gap-1.5"
      aria-label={face.label}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-colors duration-300 ${
          selected
            ? "border-[var(--handover-accent)] bg-[var(--handover-soft)] dark:bg-[var(--handover-accent)]/15"
            : "border-gray-200 bg-white/70 dark:border-gray-700 dark:bg-white/5"
        }`}
      >
        {/* aria-hidden: the <span> below already names the choice, and the
            button carries aria-label. Without this a screen reader would
            announce the emoji's own name too — "slightly smiling face,
            Okay" — saying the same thing twice in two vocabularies.

            Grayscale until chosen, so the row reads as one calm scale rather
            than five competing colours, and picking one is a visible commitment
            rather than a subtle border change. */}
        <span
          aria-hidden
          className={`text-2xl leading-none transition-all duration-300 ${
            selected ? "grayscale-0 opacity-100" : "grayscale opacity-60"
          }`}
        >
          {face.emoji}
        </span>
      </div>
      <span className={`text-2xs font-medium ${selected ? "text-[var(--handover-accent)]" : "text-gray-400"}`}>
        {face.label}
      </span>
    </motion.button>
  );
}

// Gentle radiating warmth motif behind the celebration copy — soft concentric
// gradient rings plus a few drifting "sparks", no boxed icon.
function WarmthMotif() {
  return (
    <div className="relative mx-auto mb-6 h-32 w-32">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--handover-accent)]/35 via-amber-200/25 to-transparent dark:from-[var(--handover-accent)]/25 dark:via-amber-400/10"
          initial={{ scale: 0.6, opacity: 0.6 }}
          animate={{ scale: [0.6, 1.4, 0.6], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.9, ease: "easeInOut" }}
        />
      ))}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.15 }}
      >
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <motion.path
            d="M28 46C28 46 8 34 8 20.5C8 13 13.5 8 20 8C23.8 8 27 10 28 13C29 10 32.2 8 36 8C42.5 8 48 13 48 20.5C48 34 28 46 28 46Z"
            fill="url(#warmGrad)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1, scale: [1, 1.06, 1] }}
            transition={{ pathLength: { duration: 0.8, ease: "easeOut" }, scale: { duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.8 } }}
          />
          <defs>
            <linearGradient id="warmGrad" x1="8" y1="8" x2="48" y2="46" gradientUnits="userSpaceOnUse">
              <stop stopColor="var(--handover-secondary, var(--handover-accent))" />
              <stop offset="1" stopColor="var(--handover-accent)" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
      {/* drifting sparks */}
      {[...Array(5)].map((_, i) => (
        <motion.span
          key={`spark-${i}`}
          className="absolute h-1 w-1 rounded-full bg-amber-400/80 dark:bg-amber-300/70"
          style={{ left: `${18 + i * 15}%`, top: "55%" }}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 1, 0], y: -70 - i * 6, x: (i % 2 === 0 ? 1 : -1) * (8 + i * 4) }}
          transition={{ duration: 2.6, repeat: Infinity, delay: 0.3 + i * 0.35, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export default function HandoverCelebration({ contextType, contextId, open, onClose, role }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("celebrate");
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [tipAmount, setTipAmount] = useState<number | ''>(50);
  const [customTip, setCustomTip] = useState("");
  // "Other" opens a typed amount; the slider and presets close it (2026-10-08).
  const [otherOpen, setOtherOpen] = useState(false);
  const [tipLoading, setTipLoading] = useState(false);
  const [tipDone, setTipDone] = useState(false);

  const effectiveTipAmount = useMemo(() => {
    if (customTip.trim()) {
      const n = Number(customTip);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    return typeof tipAmount === "number" ? tipAmount : null;
  }, [customTip, tipAmount]);

  async function handleFeedbackSubmit() {
    setSubmittingFeedback(true);
    try {
      if (rating) {
        await submitHandoverFeedback({
          contextType,
          contextId,
          rating,
          note: note.trim() || undefined,
        });
      }
      setStep("tip");
    } catch {
      // Never block the user on a feedback failure — move on regardless.
      toast.error("Couldn't save your feedback, but thanks anyway!");
      setStep("tip");
    } finally {
      setSubmittingFeedback(false);
    }
  }

  async function handleTip() {
    if (!effectiveTipAmount) {
      toast.error("Enter a valid tip amount");
      return;
    }
    setTipLoading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Could not load Razorpay. Check your connection.");
        return;
      }
      const order = await initiatePlatformTip(effectiveTipAmount, contextType, contextId);
      const rzp = new window.Razorpay({
        key: order.razorpayKeyId,
        amount: order.amountInPaise,
        currency: order.currency,
        name: "CauseKind",
        description: "Supporting the platform",
        order_id: order.razorpayOrderId,
        prefill: { email: user?.email },
        theme: { color: "#0f172a" },
        handler: () => {
          setTipDone(true);
          setStep("done");
        },
        modal: { ondismiss: () => toast.info("Tip cancelled.") },
      });
      rzp.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start the tip checkout");
    } finally {
      setTipLoading(false);
    }
  }

  function handleSkipTip() {
    setStep("done");
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        /* handoverScope on the overlay ROOT: this is a fixed-position layer
           rendered outside the hub's own scoped element, so without the class
           every var(--handover-*) below resolves to nothing. Defaults to the
           donor palette when no role is supplied. */
        className={`${handoverScope(role ?? "DONOR")} fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget && step !== "celebrate") onClose(); }}
      >
        <motion.div
          className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-[#fdf6ef] p-7 text-center shadow-2xl dark:bg-gray-950"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          {step !== "celebrate" && (
            <button
              onClick={onClose}
              className={`absolute right-4 top-4 z-10 text-xs font-medium ${step === "tip" ? "text-white/80 hover:text-white" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
            >
              Close
            </button>
          )}

          <AnimatePresence mode="wait">
            {step === "celebrate" && (
              <motion.div key="celebrate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <WarmthMotif />
                {/* Worded for whoever is looking (2026-10-08): the recipient was told
                    "You just did something kind", which only fits the giver. */}
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {role === "DONEE" ? "Your item has arrived" : "You just did something kind"}
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {role === "DONEE"
                    ? "This handover is complete. We hope it helps — someone nearby chose to give it to you."
                    : "This handover is complete — thank you for giving."}
                </p>
                <button
                  onClick={() => setStep("feedback")}
                  className="mt-6 w-full rounded-xl bg-[var(--handover-accent)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#943c10]"
                >
                  Continue
                </button>
              </motion.div>
            )}

            {step === "feedback" && (
              <motion.div key="feedback" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }}>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  How did doing this act of kindness feel?
                </h2>
                <div className="mt-5 flex justify-center gap-2.5">
                  {RATING_FACES.map((f) => (
                    <RatingFace
                      key={f.value}
                      value={f.value}
                      selected={rating === f.value}
                      onSelect={() => setRating(f.value)}
                    />
                  ))}
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything you'd like to share? (optional)"
                  rows={3}
                  className="mt-5 w-full resize-none rounded-xl border border-gray-200 bg-white/70 p-3 text-sm text-gray-800 outline-none focus:border-[var(--handover-accent)]/60 dark:border-gray-700 dark:bg-white/5 dark:text-gray-100"
                />
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => setStep("tip")}
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleFeedbackSubmit}
                    disabled={submittingFeedback}
                    className="flex-[2] rounded-xl bg-[var(--handover-accent)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#943c10] disabled:opacity-60"
                  >
                    {submittingFeedback ? "Saving…" : "Submit"}
                  </button>
                </div>
              </motion.div>
            )}

            {step === "tip" && (
              <motion.div key="tip" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }}>
                {/* Thank-you note design + slider (owner, 2026-10-08,
                    https://claude.ai/artifact/Ref3xfQpRJP28c3d99K5zZ). The header
                    bleeds to the card edges; colours follow the viewer's role. */}
                <div className="-mx-7 -mt-7 mb-5 flex h-32 items-center justify-center bg-[var(--handover-accent)]">
                  <svg width="190" height="96" viewBox="0 0 210 110" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M40 92c16-20 40-30 65-30s49 10 65 30" />
                    <path d="M105 58c-8-14-28-12-28 4 0 13 28 28 28 28s28-15 28-28c0-16-20-18-28-4z" fill="rgba(255,255,255,0.18)" />
                    <path d="M44 34c-3-5-11-3-9 3 1 4 9 9 9 9s8-5 9-9c2-6-6-8-9-3z" fill="#fff" stroke="none" opacity="0.7" />
                    <path d="M168 24c-2-4-8-2-7 2 1 3 7 7 7 7s6-4 7-7c1-4-5-6-7-2z" fill="#fff" stroke="none" opacity="0.6" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100" style={{ fontFamily: "var(--font-source-serif-4), serif" }}>
                  One small thing more?
                </h2>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  CauseKind is free for everyone. A tip keeps it that way — it never comes out of a donation.
                </p>

                <p aria-live="polite" className="mt-4 text-5xl font-black tracking-tight text-[var(--handover-accent)]">
                  ₹{effectiveTipAmount ?? 0}
                </p>
                <label className="mt-3 block">
                  <span className="sr-only">Tip amount</span>
                  <input
                    type="range"
                    min={10}
                    max={500}
                    step={10}
                    value={typeof tipAmount === "number" && !customTip ? tipAmount : Math.min(500, Math.max(10, effectiveTipAmount ?? 50))}
                    onChange={(e) => { setTipAmount(Number(e.target.value)); setCustomTip(""); setOtherOpen(false); }}
                    className="h-7 w-full cursor-pointer accent-[var(--handover-accent)]"
                  />
                  <span className="flex justify-between text-xs text-gray-400"><span>₹10</span><span>₹500</span></span>
                </label>

                <div role="radiogroup" aria-label="Quick amounts" className="mt-3 grid grid-cols-4 gap-1 rounded-2xl bg-[#f3e9df] p-1 dark:bg-white/10">
                  {TIP_PRESETS.map((amt) => {
                    const on = tipAmount === amt && !customTip && !otherOpen;
                    return (
                      <button
                        key={amt}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => { setTipAmount(amt); setCustomTip(""); setOtherOpen(false); }}
                        className={`min-h-[44px] rounded-xl text-base font-bold transition-colors ${on ? "bg-white text-[var(--handover-accent)] shadow-sm dark:bg-gray-900" : "text-gray-600 dark:text-gray-300"}`}
                      >
                        ₹{amt}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={otherOpen}
                    onClick={() => setOtherOpen(true)}
                    className={`min-h-[44px] rounded-xl text-base font-bold transition-colors ${otherOpen ? "bg-white text-[var(--handover-accent)] shadow-sm dark:bg-gray-900" : "text-gray-600 dark:text-gray-300"}`}
                  >
                    Other
                  </button>
                </div>
                {otherOpen && (
                  <input
                    autoFocus
                    inputMode="numeric"
                    value={customTip}
                    onChange={(e) => setCustomTip(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Enter an amount in ₹"
                    aria-label="Other tip amount in rupees"
                    className="mt-2 w-full rounded-xl border-2 border-gray-200 py-2.5 text-center text-base font-semibold text-gray-800 outline-none focus:border-[var(--handover-accent)]/60 dark:border-gray-700 dark:bg-transparent dark:text-gray-100"
                  />
                )}

                <button
                  onClick={handleTip}
                  disabled={tipLoading || !effectiveTipAmount}
                  className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 text-base font-bold text-white transition-colors hover:bg-black disabled:opacity-60 dark:bg-white dark:text-gray-900"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#f0a477" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9C.9 8.6 3 5 6.6 5c2.1 0 3.6 1.2 4.3 2.5h.2C11.8 6.2 13.3 5 15.4 5 19 5 21.1 8.6 19.6 12c-2.1 4.4-7.6 9-7.6 9z" /></svg>
                  {tipLoading ? "Opening checkout…" : effectiveTipAmount ? `Send ₹${effectiveTipAmount} tip` : "Choose an amount"}
                </button>
                <div className="mt-2 flex items-center justify-between">
                  <button
                    onClick={handleSkipTip}
                    className="min-h-[44px] text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Not this time
                  </button>
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                    Secure payment
                  </span>
                </div>
              </motion.div>
            )}

            {step === "done" && (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--handover-accent)]/40 to-amber-200/35 dark:from-[var(--handover-accent)]/25 dark:to-amber-400/15"
                >
                  <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                    <motion.path
                      d="M6 15 L12 21 L24 8"
                      stroke="var(--handover-accent)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    />
                  </svg>
                </motion.div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {tipDone ? "Thank you for your support!" : "Thanks for being part of this"}
                </h2>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  {tipDone
                    ? "Your tip helps keep CauseKind running for everyone."
                    : "Wishing you many more moments like this."}
                </p>
                <button
                  onClick={onClose}
                  className="mt-6 w-full rounded-xl bg-[var(--handover-accent)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#943c10]"
                >
                  Done
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
