"use client";

import React from "react";

interface InitialAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const COLOR_PALETTES = [
  "bg-ngo-100 text-ngo-950 dark:bg-ngo-950 dark:text-ngo-300 border-ngo-300 dark:border-ngo-800",
  "bg-stone-100 text-stone-700 dark:bg-zinc-800 dark:text-stone-300 border-stone-200 dark:border-zinc-700",
  "bg-teal-100 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  "bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 border-sky-200 dark:border-sky-800",
];

function getPaletteForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTES.length;
  return COLOR_PALETTES[index];
}

export function InitialAvatar({ name, size = "md", className = "" }: InitialAvatarProps) {
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  const palette = getPaletteForName(name);

  const sizeClasses =
    size === "sm"
      ? "w-8 h-8 text-xs"
      : size === "lg"
      ? "w-12 h-12 text-base font-bold"
      : "w-10 h-10 text-sm font-bold";

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full border shrink-0 select-none ${sizeClasses} ${palette} ${className}`}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

export default InitialAvatar;
