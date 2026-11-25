"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 12 }, (_, i) => pad(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));
const PERIODS = ["AM", "PM"];
const FULL_ITEM_H = 44;
const VISIBLE = 5; // rows shown; the middle one is the selection

export type Parts = { hour: number; minute: number; pm: boolean };

/** "HH:mm" or "HH:mm:ss" → 12-hour parts; null when empty or malformed. */
export function parseTime(value: string): Parts | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(value || "");
  if (!m) return null;
  const h24 = Number(m[1]);
  return { hour: h24 % 12 || 12, minute: Number(m[2]), pm: h24 >= 12 };
}
export const toValue = (p: Parts) => `${pad((p.hour % 12) + (p.pm ? 12 : 0))}:${pad(p.minute)}`;

export function formatTime12(value: string) {
  const p = parseTime(value);
  return p ? `${pad(p.hour)}:${pad(p.minute)} ${p.pm ? "PM" : "AM"}` : "";
}

/** One scroll-snapping wheel column. */
export type WheelTone = "ngo" | "brand";
const TONE = {
  ngo: {
    sel: "text-ngo-800 dark:text-ngo-200", ring: "focus-visible:ring-ngo-600/40",
    band: "border-ngo-200 bg-ngo-50 dark:border-ngo-900 dark:bg-ngo-900/30", colon: "text-ngo-700 dark:text-ngo-300",
    save: "bg-ngo-700 hover:bg-ngo-800", icon: "text-ngo-700 dark:text-ngo-400",
    border: "hover:border-ngo-600", outline: "focus-visible:outline-ngo-700",
  },
  brand: {
    sel: "text-[#b04a15] dark:text-[#f0b97a]", ring: "focus-visible:ring-[#b04a15]/40",
    band: "border-[#b04a15]/25 bg-[#b04a15]/[0.06] dark:border-[#f0b97a]/25 dark:bg-[#f0b97a]/10", colon: "text-[#b04a15] dark:text-[#f0b97a]",
    save: "bg-[#b04a15] hover:bg-[#933d10]", icon: "text-[#b04a15] dark:text-[#f0b97a]",
    border: "hover:border-[#b04a15]", outline: "focus-visible:outline-[#b04a15]",
  },
} as const;
export const toneClasses = (t: WheelTone) => TONE[t];

function Wheel({ items, index, onIndex, label, tone, compact = false }: {
  items: string[]; index: number; onIndex: (i: number) => void; label: string; tone: WheelTone; compact?: boolean;
}) {
  const ITEM_H = compact ? 32 : FULL_ITEM_H;
  const ref = React.useRef<HTMLDivElement>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const indexRef = React.useRef(index);
  indexRef.current = index;

  // Start on the current value without animating.
  React.useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = index * ITEM_H;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (i: number) => {
    const n = Math.max(0, Math.min(items.length - 1, i));
    onIndex(n);
    ref.current?.scrollTo?.({ top: n * ITEM_H, behavior: "smooth" });
  };

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onScroll={() => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          const el = ref.current;
          if (!el) return;
          const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_H)));
          if (i !== indexRef.current) onIndex(i);
        }, 80);
      }}
      onKeyDown={e => {
        if (e.key === "ArrowDown") { e.preventDefault(); go(index + 1); }
        if (e.key === "ArrowUp") { e.preventDefault(); go(index - 1); }
      }}
      className={(compact ? "relative z-10 w-11 snap-y" : "relative z-10 w-16 snap-y") + " snap-mandatory overflow-y-auto overscroll-contain rounded-lg outline-none [scrollbar-width:none] focus-visible:ring-2 [&::-webkit-scrollbar]:hidden " + TONE[tone].ring}
      style={{
        height: ITEM_H * VISIBLE,
        paddingBlock: ITEM_H * Math.floor(VISIBLE / 2),
        maskImage: "linear-gradient(to bottom, transparent, #000 35%, #000 65%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 35%, #000 65%, transparent)",
      }}
    >
      {items.map((it, i) => {
        const d = Math.abs(i - index);
        return (
          <button
            key={it} type="button" role="option" aria-selected={i === index} tabIndex={-1}
            onClick={() => go(i)}
            className={cn(
              "flex w-full snap-center items-center justify-center tabular-nums transition-colors",
              compact ? "text-base" : "text-2xl",
              d === 0 ? cn("font-semibold", TONE[tone].sel)
                : d === 1 ? "text-stone-400 dark:text-zinc-500"
                : "text-stone-300 dark:text-zinc-600",
            )}
            style={{ height: ITEM_H }}
          >
            {it}
          </button>
        );
      })}
    </div>
  );
}

/** Hour : minute and AM/PM wheels over a highlighted middle band. */
export function TimeWheels({ draft, setDraft, tone, compact = false }: {
  draft: Parts; setDraft: React.Dispatch<React.SetStateAction<Parts>>; tone: WheelTone; compact?: boolean;
}) {
  const t = TONE[tone];
  const ITEM_H = compact ? 32 : FULL_ITEM_H;
  return (
    <div className="relative flex items-center justify-center gap-1">
      {/* The selection band behind the middle row. */}
      <div
        aria-hidden
        className={cn("pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 border", compact ? "rounded-xl" : "rounded-2xl", t.band)}
        style={{ height: ITEM_H + 8 }}
      />
      <Wheel tone={tone} compact={compact} label="Hour" items={HOURS} index={draft.hour - 1} onIndex={i => setDraft(d => ({ ...d, hour: i + 1 }))} />
      <span aria-hidden className={cn("relative z-10 font-semibold", compact ? "text-base" : "text-2xl", t.colon)}>:</span>
      <Wheel tone={tone} compact={compact} label="Minute" items={MINUTES} index={draft.minute} onIndex={i => setDraft(d => ({ ...d, minute: i }))} />
      {/* AM / PM as two clear buttons, not a third wheel: on the wheel it was easy to leave
          "AM" and save night hours (1:00 AM - 6:00 AM) by mistake. */}
      <div role="radiogroup" aria-label="AM or PM" className={cn("relative z-10 ml-2 flex flex-col", compact ? "gap-1" : "gap-1.5")}>
        {PERIODS.map((p, i) => {
          const on = (i === 1) === draft.pm;
          return (
            <button key={p} type="button" role="radio" aria-checked={on}
              onClick={() => setDraft(d => ({ ...d, pm: i === 1 }))}
              className={cn(
                "rounded-xl border font-bold tabular-nums transition-colors",
                compact ? "h-8 w-12 text-sm" : "h-11 w-16 text-base",
                on ? cn("border-transparent text-white", tone === "ngo" ? "bg-ngo-700" : "bg-[#b04a15]")
                  : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-300",
              )}>
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A wheel-style replacement for `<input type="time">`, whose popup the browser
 * draws and CSS can't reach. Emits "HH:mm" (24-hour) like the native input.
 */
export function TimePicker({
  id, name, value, onChange, placeholder = "Select time", invalid, className, ...aria
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const has = !!parseTime(value);
  const [draft, setDraft] = React.useState<Parts>(() => parseTime(value) ?? { hour: 9, minute: 0, pm: false });

  const onOpenChange = (o: boolean) => {
    if (o) setDraft(parseTime(value) ?? { hour: 9, minute: 0, pm: false });
    setOpen(o);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button" id={id} aria-describedby={aria["aria-describedby"]} aria-invalid={aria["aria-invalid"]}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-md border bg-white px-3 text-left text-sm transition-colors dark:bg-zinc-900",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ngo-700",
            invalid ? "border-red-500" : "border-stone-300 hover:border-ngo-600 dark:border-zinc-700",
            className,
          )}
        >
          <span className={cn("tabular-nums", has ? "text-stone-900 dark:text-stone-100" : "text-stone-400")}>
            {has ? formatTime12(value) : placeholder}
          </span>
          <Clock className="h-4 w-4 shrink-0 text-ngo-700 dark:text-ngo-400" aria-hidden />
        </button>
      </PopoverTrigger>
      {name && <input type="hidden" name={name} value={value} />}
      <PopoverContent align="start" className="w-auto rounded-3xl px-5 pb-4 pt-5">
        <p className="mb-2 text-center text-base font-semibold text-stone-900 dark:text-stone-100">Select time</p>

        <TimeWheels draft={draft} setDraft={setDraft} tone="ngo" />

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button" onClick={() => setOpen(false)}
            className="h-10 rounded-full px-5 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button" onClick={() => { onChange(toValue(draft)); setOpen(false); }}
            className="h-10 rounded-full bg-ngo-700 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-ngo-800"
          >
            Save
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
