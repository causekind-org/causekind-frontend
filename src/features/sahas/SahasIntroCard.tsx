"use client";

import { useState, type ReactNode } from "react";
import { UiText } from "@/components/UiText";
import { Dialog, DialogBody, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * The /sahas intro card. On phones (below md) it shows the first four lines
 * with a soft fade and a "Know more" button that opens the whole text in a
 * popup (with a close button; Escape and tapping outside close it too). The
 * full text is always in the server HTML, so nothing is lost for search; from
 * md up the card shows it in full, as before, and the button is hidden.
 */
export function SahasIntroCard({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-[#D9C9B8] bg-white p-4 text-left text-[15px] leading-[1.55] text-[#4A3B30] shadow-sm break-words sm:p-8 md:text-base md:leading-[1.6] dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-300">
      <div className="relative space-y-4 max-md:max-h-[6.3rem] max-md:overflow-hidden">
        {children}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent md:hidden dark:from-zinc-900"
        />
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="mt-2 inline-flex min-h-[44px] cursor-pointer items-center border-0 bg-transparent p-0 text-sm font-semibold text-[#6f2c0a] underline underline-offset-2 md:hidden dark:text-[#e07b3a]"
      >
        <UiText>Know more</UiText>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white dark:bg-zinc-900" aria-describedby={undefined}>
          <div className="px-5 pt-5 pr-14">
            <DialogTitle className="text-lg font-bold text-[#1F140D] dark:text-stone-100">
              <UiText>About Sahas Charitable Trust</UiText>
            </DialogTitle>
          </div>
          <DialogBody className="space-y-4 px-5 pb-6 pt-3 text-[15px] leading-[1.6] text-[#4A3B30] dark:text-stone-300">
            {children}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </section>
  );
}
