"use client";

import { otherTextError } from "@/features/ngo-registration/ngoRegistrationModel";

/**
 * The required "Please specify" box shown when an NGO picks "Other" in a dropdown.
 * Letters, spaces and . , - & only (2–60); the error shows as soon as the box is touched.
 */
export function OtherSpecifyField({ id, value, onChange, label = "Please specify", className = "" }: {
  id: string; value: string; onChange: (text: string) => void; label?: string; className?: string;
}) {
  const typed = value === "Other" ? "" : value;
  const error = typed ? otherTextError(typed) : "";
  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={id} className="text-xs font-bold text-stone-700 dark:text-stone-200">{label} <span className="text-red-500">*</span></label>
      <input
        id={id} name={id} type="text" maxLength={60} required value={typed}
        aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value.replace(/[^A-Za-z .,&-]/g, ""))}
        className={`w-full min-h-[44px] rounded-lg border px-3 text-sm bg-white dark:bg-zinc-900 ${error ? "border-red-500" : "border-stone-300 dark:border-zinc-700"}`}
      />
      {error && <p id={`${id}-error`} role="alert" className="text-3xs font-semibold text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
