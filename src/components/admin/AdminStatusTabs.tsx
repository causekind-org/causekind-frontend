"use client";

import { useRef } from "react";
import a from "@/features/fundraising/admin.module.css";

/**
 * The status filter as a tab row — same classes as the admin "Fundraising applications"
 * tabs (admin.module.css .tabs/.tab/.tabOn). role="tablist" with arrow/Home/End keys.
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
    <div className={a.tabs} role="tablist" aria-label={label} style={{ overflowX: "auto" }}>
      {options.map((o, i) => (
        <button key={`${o.label}-${i}`} ref={(el) => { refs.current[i] = el; }} type="button" role="tab"
          aria-selected={i === selected} tabIndex={i === selected ? 0 : -1} disabled={disabled}
          className={`${a.tab} ${i === selected ? a.tabOn : ""}`} style={{ whiteSpace: "nowrap" }}
          onClick={() => onSelect(i)} onKeyDown={(e) => key(e, i)}>{o.label}</button>
      ))}
    </div>
  );
}
