import { createContext, useContext } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

/** Per-item "request corrections": field key (e.g. "registrationNumber", "documents.trust-deed") → reviewer's note. */
export type NgoCorrections = Record<string, string>;

/** Resubmission mode: flagged keys the NGO has already changed (shown as "Updated"). */
export const CorrectionStatusContext = createContext<Set<string> | null>(null);

/**
 * The reviewer's note next to a field or file they asked the NGO to fix. Amber until the
 * item is changed, then green "Updated" with the note still visible.
 */
export function CorrectionNote({ note, field }: { note?: string; field?: string }) {
  const changed = useContext(CorrectionStatusContext);
  if (!note) return null;
  const updated = !!field && !!changed?.has(field);
  return (
    <p
      role="note"
      data-testid="correction-note"
      data-correction-field={field}
      data-updated={updated ? "true" : undefined}
      className={`mt-1.5 flex items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold data-[pulse=true]:animate-pulse data-[pulse=true]:ring-2 data-[pulse=true]:ring-amber-400 ${updated
        ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-200"
        : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200"}`}
    >
      {updated
        ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        : <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />}
      <span>
        {updated && <span className="mr-1 font-black">Updated ·</span>}
        <span className="font-black">Admin note:</span> {note}
      </span>
    </p>
  );
}
