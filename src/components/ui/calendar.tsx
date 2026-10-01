"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayButtonProps } from "react-day-picker";

import { cn } from "@/lib/utils";

/**
 * CauseKind's calendar chrome: a raised, rounded card with circular nav
 * buttons and terracotta-filled selected/today days — matching the warm
 * palette used across the rest of the site rather than react-day-picker's
 * default blue.
 */
export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      weekStartsOn={1}
      className={cn(
        "p-4 sm:p-5 rounded-3xl bg-[#faf8f5] dark:bg-zinc-950 border border-[#e5e2d5] dark:border-zinc-800 shadow-[0_8px_30px_rgba(0,0,0,0.08)]",
        className
      )}
      classNames={{
        months: "flex flex-col gap-4",
        month: "flex flex-col gap-3",
        month_caption: "flex items-center justify-center px-9",
        caption_label: "text-base font-black text-stone-900 dark:text-stone-100",
        nav: "flex items-center justify-between absolute inset-x-0 top-4 sm:top-5 px-4 sm:px-5",
        button_previous: cn(
          "size-9 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800",
          "border border-[#e5e2d5] dark:border-zinc-700 text-stone-600 dark:text-stone-300",
          "hover:bg-stone-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:pointer-events-none"
        ),
        button_next: cn(
          "size-9 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800",
          "border border-[#e5e2d5] dark:border-zinc-700 text-stone-600 dark:text-stone-300",
          "hover:bg-stone-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:pointer-events-none"
        ),
        month_grid: "w-full border-collapse mt-3",
        weekdays: "flex",
        weekday: "w-9 sm:w-10 text-2xs font-bold uppercase text-stone-400 dark:text-stone-500",
        weeks: "flex flex-col gap-1",
        week: "flex gap-1",
        day: "size-9 sm:size-10 p-0 text-center",
        day_button: cn(
          "size-9 sm:size-10 rounded-xl text-sm font-semibold text-stone-700 dark:text-stone-200",
          "hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]/50"
        ),
        today: "[&>button]:border [&>button]:border-[#b04a15]/50 [&>button]:font-black",
        selected: "[&>button]:bg-[#b04a15] [&>button]:text-white [&>button]:hover:bg-[#b04a15] [&>button]:shadow-md",
        outside: "[&>button]:text-stone-300 dark:[&>button]:text-zinc-700",
        disabled: "[&>button]:text-stone-300 dark:[&>button]:text-zinc-700 [&>button]:pointer-events-none",
        range_start: "[&>button]:bg-[#b04a15] [&>button]:text-white [&>button]:rounded-r-none",
        range_end: "[&>button]:bg-[#b04a15] [&>button]:text-white [&>button]:rounded-l-none",
        range_middle: "[&>button]:bg-[#b04a15]/15 [&>button]:text-[#b04a15] dark:[&>button]:text-[#f0b97a] [&>button]:rounded-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          ),
        DayButton: CalendarDayButton,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({ className, day, modifiers, ...props }: DayButtonProps) {
  return (
    <button
      type="button"
      data-day={day.date.toLocaleDateString()}
      data-selected={modifiers.selected}
      data-today={modifiers.today}
      className={className}
      {...props}
    />
  );
}

export { Calendar };
