"use client";

import * as React from "react";
import { CalendarClock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TimeWheels, parseTime, toValue, toneClasses, type Parts, type WheelTone } from "@/components/ui/time-picker";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** "YYYY-MM-DD" → a local Date at midnight. */
const toDate = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function split(value: string): { date: string; time: Parts } | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value || "");
  const time = m && parseTime(m[2]);
  return m && time ? { date: m[1], time } : null;
}

export function formatDateTime(value: string) {
  const p = split(value);
  if (!p) return "";
  const d = toDate(p.date);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(p.time.hour)}:${pad(p.time.minute)} ${p.time.pm ? "PM" : "AM"}`;
}

/**
 * A styled replacement for `<input type="datetime-local">`: a calendar beside
 * the time wheels. Emits "YYYY-MM-DDTHH:mm" like the native input; `min`/`max`
 * (same format) limit the days that can be picked.
 */
export function DateTimePicker({
  id, value, onChange, min, max, disabled, tone = "brand", placeholder = "Pick a date and time", className, ...aria
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  tone?: WheelTone;
  placeholder?: string;
  className?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const t = toneClasses(tone);
  const [open, setOpen] = React.useState(false);
  const minDate = min?.slice(0, 10);
  const maxDate = max?.slice(0, 10);
  const fresh = () => split(value) ?? { date: minDate && minDate > ymd(new Date()) ? minDate : ymd(new Date()), time: { hour: 10, minute: 0, pm: false } };
  const [date, setDate] = React.useState(() => fresh().date);
  const [time, setTime] = React.useState<Parts>(() => fresh().time);

  const onOpenChange = (o: boolean) => {
    if (o) { const f = fresh(); setDate(f.date); setTime(f.time); }
    setOpen(o);
  };

  const disabledDays = [
    ...(minDate ? [{ before: toDate(minDate) }] : []),
    ...(maxDate ? [{ after: toDate(maxDate) }] : []),
  ];

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button" id={id} disabled={disabled}
          aria-describedby={aria["aria-describedby"]} aria-invalid={aria["aria-invalid"]}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-md border border-stone-300 bg-white px-3 text-left text-sm transition-colors disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900",
            "focus-visible:outline-2 focus-visible:outline-offset-2", t.border, t.outline,
            className,
          )}
        >
          <span className={cn("tabular-nums", value ? "text-stone-900 dark:text-stone-100" : "text-stone-400")}>
            {formatDateTime(value) || placeholder}
          </span>
          <CalendarClock className={cn("h-4 w-4 shrink-0", t.icon)} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" collisionPadding={8} className="w-auto max-w-[calc(100vw-24px)] rounded-2xl p-3">
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Calendar
            mode="single"
            selected={toDate(date)}
            defaultMonth={toDate(date)}
            onSelect={(d) => d && setDate(ymd(d))}
            disabled={disabledDays}
            className="relative border-0 bg-transparent p-0 shadow-none sm:p-0 dark:bg-transparent"
            classNames={{
              month: "flex flex-col gap-1",
              month_caption: "flex h-7 items-center justify-center px-8",
              caption_label: "text-sm font-black text-stone-900 dark:text-stone-100",
              nav: "absolute inset-x-0 top-0 flex items-center justify-between",
              button_previous: "size-7 flex items-center justify-center rounded-full border border-[#e5e2d5] bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-stone-300",
              button_next: "size-7 flex items-center justify-center rounded-full border border-[#e5e2d5] bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-stone-300",
              month_grid: "w-full border-collapse mt-1",
              weekday: "w-8 text-[10px] font-bold uppercase text-stone-400 dark:text-stone-500",
              weeks: "flex flex-col gap-0.5",
              week: "flex gap-0.5",
              day: "size-8 p-0 text-center",
              day_button: "size-8 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]/50 dark:text-stone-200 dark:hover:bg-zinc-800",
            }}
          />
          <div className="hidden h-40 w-px bg-stone-200 sm:block dark:bg-zinc-800" aria-hidden />
          <TimeWheels draft={time} setDraft={setTime} tone={tone} compact />
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button" onClick={() => setOpen(false)}
            className="h-8 rounded-full px-4 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button" onClick={() => { onChange(`${date}T${toValue(time)}`); setOpen(false); }}
            className={cn("h-8 rounded-full px-5 text-sm font-semibold text-white shadow-sm transition-colors", t.save)}
          >
            Set time
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
