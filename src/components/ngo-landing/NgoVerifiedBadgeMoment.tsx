"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CheckCircle2, ShieldCheck, X } from "lucide-react";
import { useNgoStatus } from "./useNgoStatus";
import { Button } from "@/components/ui/button";

export function NgoVerifiedBadgeMoment() {
  const { isVerified, hasShownWelcome, markWelcomeShown } = useNgoStatus();
  const [open, setOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (isVerified && !hasShownWelcome) {
      setOpen(true);
      
      const timer = setTimeout(() => {
        handleClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVerified, hasShownWelcome]);

  const handleClose = () => {
    setOpen(false);
    markWelcomeShown();
  };

  useEffect(() => {
    if (open) {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === "Escape") handleClose();
      };
      window.addEventListener("keydown", handleEsc);
      
      // Simple focus trap
      const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const modal = document.querySelector('[role="dialog"]') as HTMLElement;
      if (modal) {
        const firstFocusableElement = modal.querySelectorAll(focusableElements)[0] as HTMLElement;
        const focusableContent = modal.querySelectorAll(focusableElements);
        const lastFocusableElement = focusableContent[focusableContent.length - 1] as HTMLElement;

        const handleTab = (e: KeyboardEvent) => {
          if (e.key === 'Tab') {
            if (e.shiftKey) {
              if (document.activeElement === firstFocusableElement) {
                lastFocusableElement.focus();
                e.preventDefault();
              }
            } else {
              if (document.activeElement === lastFocusableElement) {
                firstFocusableElement.focus();
                e.preventDefault();
              }
            }
          }
        };
        window.addEventListener('keydown', handleTab);
        if (firstFocusableElement) firstFocusableElement.focus();
        
        return () => {
          window.removeEventListener("keydown", handleEsc);
          window.removeEventListener('keydown', handleTab);
        };
      }
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div 
        role="dialog"
        aria-modal="true"
        data-state="open"
        data-lenis-prevent="true"
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#FBF9F4]/90 dark:bg-[#09090b]/90 backdrop-blur-sm"
      >
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 2, rotate: -15 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 15,
            opacity: { duration: 0.3 }
          }}
          className="relative flex flex-col items-center justify-center text-center p-8"
        >
          <div className="relative mb-6">
            <motion.div 
              initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
              className="absolute -inset-8 bg-[var(--color-ngo-500)]/20 rounded-full blur-2xl"
            />
            <div className="relative bg-white dark:bg-zinc-800 w-32 h-32 rounded-full shadow-[0_16px_40px_rgba(30,107,79,0.2)] flex items-center justify-center border-4 border-[var(--color-ngo-500)]">
              <ShieldCheck className="w-16 h-16 text-[var(--color-ngo-600)] dark:text-[var(--color-ngo-500)]" strokeWidth={1.5} />
            </div>
          </div>
          
          <motion.h2 
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-4xl md:text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-100 mb-4 font-display"
          >
            You&apos;re Verified.
          </motion.h2>
          
          <motion.p 
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-lg text-stone-600 dark:text-stone-400 max-w-md mx-auto"
          >
            Your organization has passed all checks. You can now start drives and receive goods from nearby donors.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-12"
        >
          <Button variant="ghost" className="text-stone-500 hover:text-stone-900 dark:hover:text-stone-100" onClick={handleClose}>
            Skip <X className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
