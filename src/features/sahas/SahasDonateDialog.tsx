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
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-4 overscroll-contain"
      onWheel={(e) => e.stopPropagation()}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="sahas-donate-title" tabIndex={-1}
        className="relative max-h-[92dvh] w-full max-w-xl overflow-y-auto overscroll-contain rounded-t-2xl bg-white outline-none sm:rounded-2xl lg:h-[min(760px,92dvh)] lg:max-w-[1120px] lg:overflow-hidden dark:bg-zinc-950">
        <button type="button" onClick={onClose} aria-label={ui("Close")}
          className="absolute end-3 top-3 flex size-11 items-center justify-center rounded-full text-[#4A3B30] hover:bg-black/5 dark:text-stone-300">
          <X className="size-5" aria-hidden />
        </button>

        <SahasDonateForm slug={slug} onClose={onClose} />
      </div>
    </div>,
    document.body,
  );
}
