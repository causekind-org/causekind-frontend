"use client";

import { Loader2 } from "lucide-react";
import { ConditionalField, WizardField, controlClass } from "@/features/wizard-kit/WizardField";
import type { CompatibilityCheck } from "@/lib/api";
import { OFFER_CONDITIONS, type OfferModel } from "../offerModel";

export type CompatState =
  | { kind: "incomplete" }
  | { kind: "saving" }
  | { kind: "checking" }
  | { kind: "result"; check: CompatibilityCheck }
  | { kind: "unavailable" };

/**
 * Condition, defects, and the compatibility preview.
 *
 * <p>`workingStatus` is intentionally not rendered. It exists in the API and the
 * backend reads it for a few subcategories, but this form has never shown it and
 * adding it here would be a new required-feeling field, not a redesign.
 */
export function OfferConditionStep({
  model, errors, onChange, compat,
}: {
  model: OfferModel;
  errors: Record<string, string>;
  onChange: <K extends keyof OfferModel>(key: K, value: OfferModel[K]) => void;
  compat: CompatState;
}) {
  return (
    <div className="space-y-3">
      <WizardField label="Condition" required error={errors.condition}>
        {({ id, describedBy, invalid }) => (
          <select
            id={id} name="condition" value={model.condition}
            onChange={e => onChange("condition", e.target.value)}
            aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass}
          >
            <option value="">Select…</option>
            {OFFER_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </WizardField>

      <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
        <input
          type="checkbox" name="hasKnownDefects"
          checked={model.hasKnownDefects}
          onChange={e => onChange("hasKnownDefects", e.target.checked)}
          className="h-5 w-5 shrink-0 accent-[var(--ck-role-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
        />
        <span className="text-sm font-bold text-stone-800 dark:text-stone-100">
          This item has known defects
        </span>
      </label>

      <ConditionalField show={model.hasKnownDefects}>
        <WizardField
          label="What should the recipient know?"
          required
          hint="Scratches, a worn part, something that only half works — say it plainly."
          error={errors.knownDefects}
        >
          {({ id, describedBy, invalid }) => (
            <textarea
              id={id} name="knownDefects" rows={3}
              value={model.knownDefects}
              onChange={e => onChange("knownDefects", e.target.value)}
              aria-describedby={describedBy} aria-invalid={invalid}
              className={controlClass}
            />
          )}
        </WizardField>
      </ConditionalField>

      {/* Compatibility preview. Guidance only — it never blocks Continue, because
          the real decision belongs to the donee and the admin, and a preview
          that quietly became a gate would be a new business rule. */}
      <div aria-live="polite" className="rounded-xl border border-stone-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-2xs font-black uppercase tracking-wider text-stone-400">Fit with this request</p>

        {compat.kind === "incomplete" && (
          <p className="mt-1 text-2xs text-stone-500 dark:text-stone-400">
            Add a quantity and condition and we&apos;ll check how well this matches.
          </p>
        )}
        {compat.kind === "saving" && (
          <p className="mt-1 flex items-center gap-2 text-2xs text-stone-500 dark:text-stone-400">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Saving your answers…
          </p>
        )}
        {compat.kind === "checking" && (
          <p className="mt-1 flex items-center gap-2 text-2xs text-stone-500 dark:text-stone-400">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Checking the fit…
          </p>
        )}
        {compat.kind === "unavailable" && (
          <p className="mt-1 text-2xs text-stone-500 dark:text-stone-400">
            We couldn&apos;t check the fit just now. You can still continue.
          </p>
        )}
        {compat.kind === "result" && (
          <>
            <p className={`mt-1 text-sm font-bold ${
              compat.check.indicator === "STRONG_MATCH" ? "text-green-700 dark:text-green-400"
                : compat.check.indicator === "NOT_ELIGIBLE" ? "text-red-700 dark:text-red-400"
                : "text-amber-700 dark:text-amber-400"}`}>
              {compat.check.indicator === "STRONG_MATCH" ? "Strong match"
                : compat.check.indicator === "NOT_ELIGIBLE" ? "This may not match the request"
                : "Possible match"}
            </p>
            {compat.check.explanation && (
              <p className="mt-0.5 text-2xs text-stone-600 dark:text-stone-300">{compat.check.explanation}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
