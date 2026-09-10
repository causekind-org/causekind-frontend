"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Clock } from "lucide-react";

interface NgoWelcomeModalProps {
  userId: string;
  isProfileComplete: boolean;
  onDismiss?: () => void;
}

/**
 * Welcome popup shown to NGO users on /dashboard/ngo when their profile is incomplete.
 * Dismissing closes the modal for the current session only (using sessionStorage),
 * reappearing on next login if still incomplete.
 */
export function NgoWelcomeModal({ userId, isProfileComplete, onDismiss }: NgoWelcomeModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isProfileComplete || !userId) {
      setOpen(false);
      return;
    }

    // Small delay for natural appearance after page load
    const timer = setTimeout(() => {
      setOpen(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [userId, isProfileComplete]);

  function handleDismiss() {
    setOpen(false);
    onDismiss?.();
  }

  if (isProfileComplete) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleDismiss(); }}>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-md sm:max-w-lg rounded-2xl sm:rounded-3xl border border-[#b04a15]/30 bg-[#faf8f5] dark:bg-zinc-950 p-0 shadow-2xl overflow-hidden"
        showCloseButton={true}
      >
        {/* Top brand header bar */}
        <div className="bg-gradient-to-r from-[#b04a15] to-[#d4652f] px-6 py-4 text-white">
          <div className="flex items-center gap-2 text-3xs font-black uppercase tracking-widest text-amber-200">
            <Sparkles className="h-3.5 w-3.5" /> Next Step for Your Organization
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
            Complete Your Profile
          </DialogTitle>
        </div>

        <DialogBody className="px-6 py-5 space-y-4 text-stone-700 dark:text-stone-300">
          <DialogDescription className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            Your lightweight account has been created! To unlock verified partner status, receive donor item matches, and run public charity campaigns, finish submitting your legal verification details.
          </DialogDescription>

          {/* Value props checklist */}
          <div className="rounded-xl border border-stone-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-4 space-y-2.5 text-xs text-stone-600 dark:text-stone-400">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-[#b04a15] shrink-0" />
              <span className="font-medium text-stone-800 dark:text-stone-200">
                Unlock donor item match notifications & in-kind needs
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-[#b04a15] shrink-0" />
              <span className="font-medium text-stone-800 dark:text-stone-200">
                Launch public verified donation campaigns
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-[#b04a15] shrink-0" />
              <span className="font-medium text-stone-800 dark:text-stone-200">
                Upload legal documents (Trust / Society / Section 8) & photos
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-3xs text-stone-400 pt-1">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-[#b04a15]" /> Takes ~3-5 minutes
            </span>
            <span>Progress is auto-saved as you go</span>
          </div>
        </DialogBody>

        <DialogFooter className="px-6 py-4 border-t border-stone-200/80 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-900/40 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={handleDismiss}
            className="w-full sm:w-auto text-xs font-bold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
          >
            Maybe later
          </Button>

          <Link href="/dashboard/ngo/profile" className="w-full sm:w-auto" onClick={handleDismiss}>
            <Button
              className="w-full sm:w-auto bg-[#b04a15] hover:bg-[#963c0d] text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-[#b04a15]/20 flex items-center justify-center gap-2 text-sm transition-all"
            >
              Complete Profile Now
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
