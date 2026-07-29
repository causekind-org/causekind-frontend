"use client";

import { isMeaningfulReason, MAX_REASON_LENGTH, REASON_HINT } from "@/lib/rejectionReason";

/**
 * A rejection/cancellation reason box that tells the admin the rule before the
 * server does.
 *
 * <p>An admin typed "." here during testing. The old `.trim()` check accepted it,
 * so did `@NotBlank` on the server, and the donor's dashboard rendered
 * "Reason: ." — a rejection with no information in it.
 *
 * <p>The hint and the disabled button are a courtesy, not a control: the server
 * validates every reject independently. Use {@link isMeaningfulReason} to drive
 * the submit button's `disabled` in the parent.
 */
export function ReasonField({
  value, onChange, placeholder, disabled, rows = 3,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}) {
  const touched = value.trim().length > 0;
  const invalid = touched && !isMeaningfulReason(value);
  const overLength = value.trim().length > MAX_REASON_LENGTH;

  return (
    <div className="space-y-1.5">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        disabled={disabled}
        aria-invalid={invalid || overLength}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-stone-50 px-3 py-2 text-sm outline-none dark:bg-zinc-800 ${
          invalid || overLength
            ? "border-red-400 focus:border-red-500"
            : "border-stone-200 focus:border-red-400 dark:border-zinc-700"
        }`}
      />
      <div className="flex items-start justify-between gap-3">
        <p className={`text-xs ${invalid ? "text-red-600 dark:text-red-400" : "text-transparent"}`}>
          {/* Rendered transparent rather than removed so the dialog doesn't jump
              height as the admin types. */}
          {REASON_HINT}
        </p>
        <span className={`shrink-0 text-[10px] tabular-nums ${overLength ? "text-red-600" : "text-stone-400"}`}>
          {value.trim().length}/{MAX_REASON_LENGTH}
        </span>
      </div>
    </div>
  );
}
