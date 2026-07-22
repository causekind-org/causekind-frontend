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
};

const TIP_PRESETS = [20, 50, 100];

// Five soft, hand-drawn-feeling faces instead of clip-art icons — built from
// simple SVG arcs so the "face" reads as bespoke rather than a stock glyph.
const RATING_FACES: { value: number; label: string; mouth: string; brow: number }[] = [
  { value: 1, label: "Not great", mouth: "M9 17 Q16 12 23 17", brow: 4 },
  { value: 2, label: "Okay", mouth: "M9 16 Q16 14 23 16", brow: 2 },
  { value: 3, label: "Good", mouth: "M9 15 L23 15", brow: 0 },
  { value: 4, label: "Great", mouth: "M9 14 Q16 18 23 14", brow: -1 },
  { value: 5, label: "Amazing", mouth: "M8 13 Q16 21 24 13", brow: -3 },
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
            ? "border-[#b04a15] bg-gradient-to-br from-orange-100 to-amber-50 dark:from-orange-900/40 dark:to-amber-900/20"
            : "border-gray-200 bg-white/70 dark:border-gray-700 dark:bg-white/5"
        }`}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="12" cy={12 + face.brow * 0.3} r="1.6" className={selected ? "fill-[#b04a15]" : "fill-gray-400 dark:fill-gray-500"} />
          <circle cx="20" cy={12 + face.brow * 0.3} r="1.6" className={selected ? "fill-[#b04a15]" : "fill-gray-400 dark:fill-gray-500"} />
          <path
            d={face.mouth}
            stroke={selected ? "#b04a15" : "currentColor"}
            className={selected ? "" : "text-gray-400 dark:text-gray-500"}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
      <span className={`text-[11px] font-medium ${selected ? "text-[#b04a15]" : "text-gray-400"}`}>
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
          className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-300/40 via-amber-200/30 to-transparent dark:from-orange-500/20 dark:via-amber-400/10"
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
              <stop stopColor="#e07b3a" />
              <stop offset="1" stopColor="#b04a15" />
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

export default function HandoverCelebration({ contextType, contextId, open, onClose }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("celebrate");
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [tipAmount, setTipAmount] = useState<number | ''>(50);
  const [customTip, setCustomTip] = useState("");
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
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
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
              className="absolute right-4 top-4 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Close
            </button>
          )}

          <AnimatePresence mode="wait">
            {step === "celebrate" && (
              <motion.div key="celebrate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <WarmthMotif />
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  You just did something kind
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  This handover is complete — thank you for being part of it.
                </p>
                <button
                  onClick={() => setStep("feedback")}
                  className="mt-6 w-full rounded-xl bg-[#b04a15] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#943c10]"
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
                  className="mt-5 w-full resize-none rounded-xl border border-gray-200 bg-white/70 p-3 text-sm text-gray-800 outline-none focus:border-[#b04a15]/60 dark:border-gray-700 dark:bg-white/5 dark:text-gray-100"
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
                    className="flex-[2] rounded-xl bg-[#b04a15] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#943c10] disabled:opacity-60"
                  >
                    {submittingFeedback ? "Saving…" : "Submit"}
                  </button>
                </div>
              </motion.div>
            )}

            {step === "tip" && (
              <motion.div key="tip" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }}>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Enjoyed doing kindness?
                </h2>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  If you'd like, you can support CauseKind so we can keep connecting people like you. Totally optional.
                </p>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {TIP_PRESETS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => { setTipAmount(amt); setCustomTip(""); }}
                      className={`rounded-xl border-2 py-2.5 text-sm font-semibold transition-colors ${
                        tipAmount === amt && !customTip
                          ? "border-[#b04a15] bg-orange-50 text-[#b04a15] dark:bg-orange-950/30"
                          : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                  <input
                    value={customTip}
                    onChange={(e) => setCustomTip(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Other"
                    className="rounded-xl border-2 border-gray-200 py-2.5 text-center text-sm font-semibold text-gray-700 outline-none focus:border-[#b04a15]/60 dark:border-gray-700 dark:text-gray-200"
                  />
                </div>
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={handleSkipTip}
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    No thanks
                  </button>
                  <button
                    onClick={handleTip}
                    disabled={tipLoading || !effectiveTipAmount}
                    className="flex-[2] rounded-xl bg-[#b04a15] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#943c10] disabled:opacity-60"
                  >
                    {tipLoading ? "Opening checkout…" : `Tip ₹${effectiveTipAmount ?? ""}`}
                  </button>
                </div>
              </motion.div>
            )}

            {step === "done" && (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-300/50 to-amber-200/40 dark:from-orange-500/25 dark:to-amber-400/15"
                >
                  <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                    <motion.path
                      d="M6 15 L12 21 L24 8"
                      stroke="#b04a15"
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
                  className="mt-6 w-full rounded-xl bg-[#b04a15] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#943c10]"
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
