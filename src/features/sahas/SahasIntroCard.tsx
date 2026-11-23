"use client";

import { useState, type ReactNode } from "react";
import { UiText } from "@/components/UiText";

/**
 * The /sahas intro card. On phones (below md) it starts short: about four
 * lines, a soft fade and a "Read more" button that opens the rest. The full
 * text is always in the HTML (server-rendered children), so nothing is lost
 * for search; from md up it is shown in full, as before.
 */
export function SahasIntroCard({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-[#D9C9B8] bg-white p-4 text-left text-[15px] leading-[1.55] text-[#4A3B30] shadow-sm break-words sm:p-8 md:text-base md:leading-[1.6] dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-300">
      <div
        id="sahas-intro-text"
        className={`relative space-y-4 ${open ? "" : "max-md:max-h-[6.3rem] max-md:overflow-hidden"}`}
      >
        {children}
        {!open && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent md:hidden dark:from-zinc-900"
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="sahas-intro-text"
        className="mt-2 inline-flex min-h-[44px] cursor-pointer items-center border-0 bg-transparent p-0 text-sm font-semibold text-[#8f3a0e] underline underline-offset-2 md:hidden dark:text-[#e07b3a]"
      >
        {open ? <UiText>Show less</UiText> : <UiText>Read more</UiText>}
      </button>
    </section>
  );
}
