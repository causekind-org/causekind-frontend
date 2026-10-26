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
        "flex flex-col items-start gap-1.5 rounded-xl border p-3 min-h-[44px] text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700/40 focus-visible:ring-offset-1",
        selected
          ? "border-ngo-700 bg-ngo-50 dark:bg-ngo-900/20 ring-2 ring-ngo-700/20"
          : "border-[#EADBCE] dark:border-emerald-950/80 bg-[#FAF7F2] dark:bg-[#141E18] hover:bg-[#F5EFE6] dark:hover:bg-[#121c17]"
      )}
    >
      <span className="text-xl leading-none" aria-hidden>
        {structure.icon}
      </span>
      <span
        className={cn(
          "text-sm font-bold",
          selected ? "text-ngo-700 dark:text-ngo-300" : "text-stone-700 dark:text-stone-300"
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
