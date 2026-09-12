"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ModakIcon, LotusIcon } from "@/components/home/GanpatiVisuals";
import { Sparkles, X } from "lucide-react";

export function GanpatiWelcomeModal() {
  const [open, setOpen] = useState(false);

  const handleClose = useCallback(() => {
    setOpen(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("ganpati_welcome_shown", "true");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasShown = sessionStorage.getItem("ganpati_welcome_shown");
    if (!hasShown) {
      const timer = setTimeout(() => {
        setOpen(true);
        sessionStorage.setItem("ganpati_welcome_shown", "true");
      }, 800);

      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100%-2.5rem)] max-w-[440px] rounded-3xl p-0 border border-amber-500/40 bg-[#1a0802] text-white shadow-[0_25px_60px_rgba(0,0,0,0.6),0_0_40px_rgba(217,119,6,0.2)] overflow-hidden"
      >
        <div className="relative bg-gradient-to-br from-[#240c04] via-[#1a0802] to-[#120501] p-6 sm:p-8 flex flex-col items-center text-center">
          {/* Ambient golden and vermilion decorative glows */}
          <div className="pointer-events-none absolute -top-16 -left-16 w-52 h-52 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 w-52 h-52 rounded-full bg-orange-600/15 blur-3xl" />

          {/* Top-right close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 p-2 rounded-full text-amber-200/70 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer z-10"
            aria-label="Close welcome message"
          >
            <X className="size-4.5" />
          </button>

          {/* Festive Eyebrow */}
          <div className="inline-flex items-center gap-2 mb-3">
            <ModakIcon className="size-4 text-amber-400" />
            <span className="text-[0.68rem] font-black uppercase tracking-widest text-[#f0b97a]">
              Ganeshotsav 2026
            </span>
            <ModakIcon className="size-4 text-amber-400" />
          </div>

          {/* Festive Lotus / Blessing Icon Accent */}
          <div className="mb-4 size-13 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-400/30 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <LotusIcon className="size-6 text-amber-300" />
          </div>

          {/* Headline */}
          <DialogTitle className="font-serif text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
            Ganpati Bappa Morya
          </DialogTitle>

          {/* Subline */}
          <DialogDescription className="mt-3 text-amber-100/80 text-xs sm:text-sm font-medium leading-relaxed max-w-[340px]">
            May Bappa bless your home with joy, health and prosperity this Ganesh Chaturthi.
          </DialogDescription>

          {/* Primary Action Button */}
          <div className="w-full mt-6">
            <Button
              type="button"
              onClick={handleClose}
              className="w-full min-h-12 rounded-full bg-gradient-to-r from-[#c2410c] via-[#ea580c] to-[#d97706] hover:from-[#b45309] hover:to-[#c2410c] text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-[0_6px_20px_rgba(234,88,12,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(234,88,12,0.55)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
            >
              <Sparkles className="size-4 mr-2 text-amber-200" />
              Ganpati Bappa Morya!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
