"use client";

import { useRef } from "react";

/**
 * The status filter as a segmented pill row in the staff-console style
 * (2026-11-19; used to borrow the fundraising canvas tab classes, which the
 * fundraising pages still use themselves). role="tablist" with arrow/Home/End keys.
 */
export function AdminStatusTabs({ options, selected, onSelect, label, disabled }: {
  options: { label: string }[]; selected: number; onSelect: (index: number) => void; label: string; disabled?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function key(e: React.KeyboardEvent, i: number) {
    const last = options.length - 1;
    const next = e.key === "ArrowRight" ? (i === last ? 0 : i + 1)
      : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1)
      : e.key === "Home" ? 0 : e.key === "End" ? last : -1;
    if (next < 0) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onSelect(next);
  }
  return (
    <div role="tablist" aria-label={label}
      className="mb-4 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-white/80 bg-white/55 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      {options.map((o, i) => (
        <button key={`${o.label}-${i}`} ref={(el) => { refs.current[i] = el; }} type="button" role="tab"
          aria-selected={i === selected} tabIndex={i === selected ? 0 : -1} disabled={disabled}
          className={`h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-[13px] font-medium transition-colors duration-150 disabled:opacity-50 ${
            i === selected ? "bg-[#10233a] text-white" : "text-[#3a5070] hover:bg-white/70"}`}
          onClick={() => onSelect(i)} onKeyDown={(e) => key(e, i)}>{o.label}</button>
      ))}
    </div>
  );
}
