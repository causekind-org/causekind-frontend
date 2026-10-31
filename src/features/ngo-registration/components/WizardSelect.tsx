"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { controlClass } from "@/features/wizard-kit/WizardField";

interface WizardSelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  "aria-label"?: string;
  hasError?: boolean;
}

/**
 * Designation / role combobox dropdown styled with the wizard design tokens.
 * Closed state: same height and radius as other inputs (h-11, rounded-xl), neat chevron, clear focus ring.
 * Open list: rounded-xl panel with soft shadow (shadow-xl) and 1px border, 6-8px padding (p-1.5),
 * items with rounded-lg hover/focus, comfortable 40px row height, selected item shown with tinted
 * background and bold text (no tick icon), max height with styled thin scrollbar, trigger-matching width.
 */
export function WizardSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "",
  "aria-label": ariaLabel,
  hasError,
}: WizardSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement | undefined;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [isOpen, activeIndex]);

  function handleSelect(option: string) {
    onChange(option);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(0);
      } else {
        setActiveIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(options.length - 1);
      } else {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      }
    } else if (e.key === "Enter") {
      if (isOpen && activeIndex >= 0 && activeIndex < options.length) {
        e.preventDefault();
        handleSelect(options[activeIndex]);
      }
    } else if (e.key === "Escape") {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
          aria-label={ariaLabel}
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            controlClass,
            "pr-10 cursor-text",
            hasError && "border-red-400 focus-visible:border-red-400 focus-visible:outline-red-400"
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Toggle options"
          onClick={() => {
            setIsOpen((prev) => !prev);
            inputRef.current?.focus();
          }}
          className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 cursor-pointer"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")}
            aria-hidden
          />
        </button>
      </div>

      {isOpen && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          tabIndex={-1}
          className="absolute z-50 mt-1.5 w-full max-h-60 overflow-y-auto rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl transition-all dark:border-zinc-800 dark:bg-zinc-900 scrollbar-thin"
        >
          {options.map((opt, index) => {
            const isSelected = value.trim().toLowerCase() === opt.trim().toLowerCase();
            const isActive = activeIndex === index;
            return (
              <li
                key={opt}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "flex h-10 min-h-[40px] w-full cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm outline-none transition-colors",
                  "text-stone-800 dark:text-stone-200",
                  isActive && "bg-stone-100 text-stone-900 dark:bg-zinc-800 dark:text-stone-50",
                  isSelected &&
                    "bg-ngo-50 text-ngo-800 font-bold dark:bg-ngo-950/40 dark:text-ngo-300"
                )}
              >
                <span className="truncate">{opt}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
