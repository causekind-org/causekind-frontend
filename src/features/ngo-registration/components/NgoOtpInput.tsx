"use client";

import { forwardRef } from "react";
import { OTPInput, REGEXP_ONLY_DIGITS } from "input-otp";
import { cn } from "@/lib/utils";

interface NgoOtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called once all digits are entered. */
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  "aria-label"?: string;
  id?: string;
}

/** The 6-box code input used by the NGO wizard (final email step and representative emails). */
export const NgoOtpInput = forwardRef<HTMLInputElement, NgoOtpInputProps>(function NgoOtpInput(
  { value, onChange, onComplete, length = 6, disabled, id, ...rest }, ref) {
  return (
    <OTPInput
      ref={ref}
      id={id}
      aria-label={rest["aria-label"]}
      maxLength={length}
      value={value}
      disabled={disabled}
      onChange={(val) => {
        onChange(val);
        if (val.length === length) onComplete?.(val);
      }}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      autoComplete="one-time-code"
      render={({ slots }) => (
        <div className="flex items-center gap-2 sm:gap-2.5">
          {slots.map((slot, i) => (
            <div
              key={i}
              className={cn(
                "flex h-12 w-10 sm:h-14 sm:w-12 items-center justify-center rounded-xl border bg-white dark:bg-zinc-900 font-mono text-lg sm:text-xl font-bold transition-all",
                slot.isActive
                  ? "border-ngo-700 ring-2 ring-ngo-700/25 shadow-sm"
                  : slot.char
                  ? "border-ngo-300/40 bg-ngo-50/40"
                  : "border-stone-200 dark:border-zinc-700 text-stone-400"
              )}
            >
              {slot.char || ""}
            </div>
          ))}
        </div>
      )}
    />
  );
});
