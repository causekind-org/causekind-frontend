"use client";

import { useState, type ReactNode } from "react";
import { UiText } from "@/components/UiText";
import { Dialog, DialogBody, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * The /sahas intro card. On phones (below md) it shows the first four lines
 * (no fade) and a "Know more" button that opens the whole text in a
 * popup (with a close button; Escape and tapping outside close it too). The
 * full text is always in the server HTML, so nothing is lost for search; from
 * md up the card shows it in full, as before, and the button is hidden.
 *
 * Also used on /requests and /fundraisers: `heading` adds a visible h2 above
 * the text (and becomes the popup title); without it the popup is titled
 * "About Sahas Charitable Trust".
 */
export function SahasIntroCard({ children, heading }: { children: ReactNode; heading?: { id: string; text: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby={heading?.id} className="rounded-2xl border border-[#D9C9B8] bg-white p-4 text-left text-[15px] leading-[1.55] text-[#4A3B30] shadow-sm break-words sm:p-8 md:text-base md:leading-[1.6] dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-300">
      {heading && (
        <h2 id={heading.id} className="mb-3 text-lg font-bold text-[#1F140D] sm:text-xl dark:text-stone-100">{heading.text}</h2>
      )}
      {/* Phones: exactly 4 lines (4 x the 1.55em line height), cut on a line
          boundary, no fade; the rest is in the "Know more" popup. */}
      <div className="space-y-4 max-md:max-h-[6.2em] max-md:overflow-hidden">
        {children}
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
              {heading ? heading.text : <UiText>About Sahas Charitable Trust</UiText>}
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
