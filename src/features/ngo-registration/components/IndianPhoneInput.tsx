"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  cleanIndianMobileInput,
  extractIndianMobileDigits,
} from "@/features/ngo-registration/ngoRegistrationModel";

interface IndianPhoneInputProps {
  id?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
  hasError?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  onChange: (storedValue: string) => void;
  className?: string;
  placeholder?: string;
}

/**
 * Phone input for Indian mobile numbers (+91 prefix fixed, 10 digits max).
 * Strips non-digits, leading "+91", "91" or "0" on typing and paste.
 * Stores value as "+91XXXXXXXXXX" while displaying the 10 digits in the input.
 * Existing longer numbers are displayed without crashing or silent truncation,
 * allowing the user to see and fix the validation error.
 */
export function IndianPhoneInput({
  id,
  name,
  value = "",
  disabled,
  hasError,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  onChange,
  className,
  placeholder = "",
}: IndianPhoneInputProps) {
  const digits = extractIndianMobileDigits(value);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const cleaned = cleanIndianMobileInput(raw);
    const stored = cleaned ? `+91${cleaned}` : "";
    onChange(stored);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const cleaned = cleanIndianMobileInput(pasted);
    const stored = cleaned ? `+91${cleaned}` : "";
    onChange(stored);
  }

  return (
    <div
      className={cn(
        "relative flex items-center rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 overflow-hidden focus-within:ring-2 focus-within:ring-ngo-700/40 focus-within:border-ngo-700 transition-colors",
        (hasError || ariaInvalid) && "border-red-400 focus-within:border-red-400 focus-within:ring-red-400/40",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="select-none shrink-0 px-3 py-2 text-xs sm:text-sm font-bold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-zinc-700/60 border-r border-stone-200 dark:border-zinc-700 flex items-center justify-center min-h-[44px]"
      >
        +91
      </span>
      <input
        id={id}
        name={name}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={digits.length > 10 ? digits.length : 10}
        disabled={disabled}
        placeholder={placeholder}
        value={digits}
        aria-invalid={ariaInvalid || hasError}
        aria-describedby={ariaDescribedBy}
        onChange={handleChange}
        onPaste={handlePaste}
        className="w-full flex-1 bg-transparent px-3.5 py-2.5 text-sm font-medium text-stone-800 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none min-h-[44px]"
      />
    </div>
  );
}
