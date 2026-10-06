import { AlertCircle } from "lucide-react";

/** Per-item "request corrections": field key (e.g. "registrationNumber", "documents.trust-deed") → reviewer's note. */
export type NgoCorrections = Record<string, string>;

/** The reviewer's note next to a field or file they asked the NGO to fix. */
export function CorrectionNote({ note }: { note?: string }) {
  if (!note) return null;
  return (
    <p
      role="note"
      data-testid="correction-note"
      className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        <span className="font-black">Needs a fix:</span> {note}
      </span>
    </p>
  );
}
