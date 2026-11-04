"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useUiText } from "@/components/UiText";
import { SahasDonateForm } from "./SahasDonateForm";

/**
 * The donate popup. Deliberately not the Radix dialog: it blocks pointer events outside itself,
 * which would make Razorpay's checkout (appended to the body) unclickable.
 */
export function SahasDonateDialog({ slug, onClose }: { slug: string; onClose: () => void }) {
  const ui = useUiText();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      opener?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-xs sm:items-center sm:p-4 overscroll-contain"
      onWheel={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sahas-donate-title"
        tabIndex={-1}
        className="relative max-h-[86vh] sm:max-h-[88vh] w-full max-w-xl overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-2xl bg-[#FBF7F2] p-5 pb-7 sm:p-6 sm:pb-8 dark:bg-zinc-950 border border-amber-500/25 shadow-2xl outline-none [scrollbar-width:thin] [scrollbar-color:rgba(176,74,21,0.35)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#b04a15]/30 hover:[&::-webkit-scrollbar-thumb]:bg-[#b04a15]/70 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={ui("Close")}
          className="sticky top-0 float-right z-20 -mb-9 flex size-9 items-center justify-center rounded-full text-[#4A3B30] hover:bg-black/5 dark:text-stone-300 dark:hover:bg-white/10 transition-colors"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <SahasDonateForm slug={slug} onClose={onClose} />
      </div>
    </div>,
    document.body,
  );
}
