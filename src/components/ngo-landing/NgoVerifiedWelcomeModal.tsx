"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import { useNgoStatus } from "./useNgoStatus";

export function NgoVerifiedWelcomeModal() {
  const { isVerified, hasShownWelcome, markWelcomeShown } = useNgoStatus();
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
        role="status"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="fixed top-20 right-4 sm:right-8 z-50 w-max max-w-[calc(100vw-2rem)] rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_0_1px_rgba(30,107,79,0.2)] dark:border-zinc-800 dark:bg-zinc-900 dark:text-stone-100"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-bold leading-tight">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-ngo-700 dark:text-ngo-300" aria-hidden />
              <span>You&apos;re verified</span>
            </p>
            <p className="mt-1 pl-6 text-xs text-stone-600 dark:text-stone-300">You can now start drives.</p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close verified welcome notification"
            className="-mr-1 -mt-0.5 p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default NgoVerifiedWelcomeModal;
