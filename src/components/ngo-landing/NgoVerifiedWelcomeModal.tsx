"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ShieldCheck, X, Sparkles } from "lucide-react";
import { useNgoStatus } from "./useNgoStatus";

export function NgoVerifiedWelcomeModal() {
  const { isVerified, ngoName, hasShownWelcome, markWelcomeShown } = useNgoStatus();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isVerified && !hasShownWelcome) {
      setOpen(true);
      markWelcomeShown();

      const timer = setTimeout(() => {
        setOpen(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [isVerified, hasShownWelcome, markWelcomeShown]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="fixed top-20 right-4 sm:right-8 z-50 max-w-md w-[calc(100%-2rem)] rounded-2xl border-2 border-emerald-500 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-2xl text-stone-900 dark:text-stone-100"
      >
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Partner status verified</span>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 mt-0.5">
              {ngoName} is now verified ✓
            </h4>
            <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
              Your organization can now start drives, receive items from local donors within 10 km, and issue verified certificates.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close verified welcome notification"
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default NgoVerifiedWelcomeModal;
