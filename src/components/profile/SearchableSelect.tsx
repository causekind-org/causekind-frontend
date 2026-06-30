"use client";

import { useEffect, useRef, useState, useCallback, KeyboardEvent } from "react";
import { ChevronDown, Search } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  /** Optional prefix rendered before label (e.g. flag emoji) */
  prefix?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Shown inside the trigger when disabled */
  disabledPlaceholder?: string;
  searchPlaceholder?: string;
  id?: string;
  /** Override what's shown in the closed trigger button (dropdown list always shows full label). */
  renderSelectedLabel?: (option: SelectOption) => React.ReactNode;
  /** Called when the dropdown opens (before any selection). */
  onOpen?: () => void;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  disabledPlaceholder,
  searchPlaceholder = "Search...",
  id,
  renderSelectedLabel,
  onOpen,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = query.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          o.value.toLowerCase().includes(query.toLowerCase()) ||
          (o.prefix && o.prefix.toLowerCase().includes(query.toLowerCase()))
      )
    : options;

  const selected = options.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search on open
  useEffect(() => {
    if (open) {
      setHighlighted(0);
      setTimeout(() => searchRef.current?.focus(), 30);
    }
  }, [open]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[highlighted] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[highlighted]) {
          onChange(filtered[highlighted].value);
          setOpen(false);
          setQuery("");
        }
      } else if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    },
    [filtered, highlighted, onChange]
  );

  return (
    <div ref={containerRef} className={`relative ${open ? "searchable-select-open z-50" : ""}`} id={id}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { if (!open) onOpen?.(); setOpen((o) => !o); } }}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={[
          "w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-colors",
          "bg-white dark:bg-zinc-900 text-stone-800 dark:text-stone-100",
          "border-orange-200 dark:border-stone-800",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]/30",
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:border-[#b04a15]/60",
        ].join(" ")}
      >
        <span className="flex items-center gap-2 truncate min-w-0">
          {selected ? (
            renderSelectedLabel ? (
              <span className="truncate">{renderSelectedLabel(selected)}</span>
            ) : (
              <>
                {selected.prefix && <span>{selected.prefix}</span>}
                <span className="truncate">{selected.label}</span>
              </>
            )
          ) : (
            <span className="text-stone-400">
              {disabled && disabledPlaceholder ? disabledPlaceholder : placeholder}
            </span>
          )}
        </span>
        <ChevronDown
          className={`shrink-0 h-4 w-4 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={[
            "absolute z-[100] mt-1 w-full min-w-[200px]",
            "rounded-xl border border-orange-100 dark:border-stone-700",
            "bg-white dark:bg-zinc-900 shadow-lg",
          ].join(" ")}
        >
          {/* Search */}
          <div className="p-2 border-b border-orange-50 dark:border-stone-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlighted(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-1 focus:ring-[#b04a15]/40 text-stone-800 dark:text-stone-100 placeholder:text-stone-400"
              />
            </div>
          </div>

          {/* Options list */}
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-64 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-stone-400 text-center">No results</li>
            ) : (
              filtered.map((opt, i) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === value}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={[
                    "flex items-center gap-2 px-3 cursor-pointer select-none text-sm",
                    "min-h-[44px]", // mobile-friendly touch target
                    i === highlighted
                      ? "bg-orange-50 dark:bg-zinc-800 text-[#b04a15] dark:text-amber-400"
                      : "hover:bg-orange-50 dark:hover:bg-zinc-800 text-stone-700 dark:text-stone-200",
                    opt.value === value ? "font-semibold" : "",
                  ].join(" ")}
                  onMouseEnter={() => setHighlighted(i)}
                >
                  {opt.prefix && <span className="shrink-0">{opt.prefix}</span>}
                  <span className="truncate">{opt.label}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
