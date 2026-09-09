"use client";

import { cn } from "@/lib/utils";
import type { LegalStructureInfo } from "@/features/ngo-registration/ngoRegistrationModel";

interface LegalStructureCardProps {
  structure: LegalStructureInfo;
  selected: boolean;
  onSelect: () => void;
}

/**
 * Selectable card for Trust / Society / Section 8 Company.
 * Matches the existing Donor / Donee role-button visual language.
 */
export function LegalStructureCard({ structure, selected, onSelect }: LegalStructureCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]/40 focus-visible:ring-offset-1",
        selected
          ? "border-[#b04a15] bg-[#b04a15]/5 dark:bg-[#b04a15]/10 ring-2 ring-[#b04a15]/20"
          : "border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 hover:bg-stone-100/55 dark:hover:bg-zinc-800/50"
      )}
    >
      <span className="text-xl leading-none" aria-hidden>
        {structure.icon}
      </span>
      <span
        className={cn(
          "text-sm font-bold",
          selected ? "text-[#b04a15]" : "text-stone-700 dark:text-stone-300"
        )}
      >
        {structure.label}
      </span>
      <span className="text-3xs leading-relaxed text-stone-500 dark:text-stone-400 font-normal">
        {structure.description}
      </span>
    </button>
  );
}
