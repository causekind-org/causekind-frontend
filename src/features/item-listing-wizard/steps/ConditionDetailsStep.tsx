"use client";

import { ConditionalField, WizardField, controlClass } from "../components/WizardField";
import {
  AGE_RANGES, CONDITIONS, WORKING_STATUSES,
  needsDimensions, needsWorkingStatus, type WizardModel,
} from "../wizardModel";

/**
 * Step 3 — condition and details.
 *
 * <p>Conditional fields are revealed immediately below the choice that caused
 * them, not collected in a block at the bottom. Clearing of stale values when a
 * field stops being relevant happens in the wizard's change handler, so it is
 * persisted rather than merely hidden.
 */
export function ConditionDetailsStep({
  model, errors, aiFilled, uncertain, onChange,
}: {
  model: WizardModel;
  errors: Record<string, string>;
  aiFilled: Set<string>;
  uncertain: Set<string>;
  onChange: <K extends keyof WizardModel>(key: K, value: WizardModel[K]) => void;
}) {
  const showWorking = needsWorkingStatus(model.category);
  const showDims = needsDimensions(model.category);

  return (
    <div className="space-y-3">
      <WizardField label="Approximate age" required error={errors.approximateAge} aiFilled={aiFilled.has("approximateAge")} uncertain={uncertain.has("approximateAge")}>
        {({ id, describedBy, invalid }) => (
          <select
            id={id} name="approximateAge" aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass} value={model.approximateAge}
            onChange={e => onChange("approximateAge", e.target.value)}
          >
            <option value="">Select an age</option>
            {AGE_RANGES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
      </WizardField>

      <WizardField label="Condition" required error={errors.condition} aiFilled={aiFilled.has("condition")} uncertain={uncertain.has("condition")}>
        {({ id, describedBy, invalid }) => (
          <select
            id={id} name="condition" aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass} value={model.condition}
            onChange={e => onChange("condition", e.target.value)}
          >
            <option value="">Select a condition</option>
            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </WizardField>

      <ConditionalField show={showWorking}>
        <WizardField
          label="Working status" required
          error={errors.workingStatus}
          hint={`Needed for ${model.category || "this category"}`}
          aiFilled={aiFilled.has("workingStatus")} uncertain={uncertain.has("workingStatus")}
        >
          {({ id, describedBy, invalid }) => (
            <select
              id={id} name="workingStatus" aria-describedby={describedBy} aria-invalid={invalid}
              className={controlClass} value={model.workingStatus}
              onChange={e => onChange("workingStatus", e.target.value)}
            >
              <option value="">Select working status</option>
              {WORKING_STATUSES.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          )}
        </WizardField>
      </ConditionalField>

      {/* Defects — checkbox OR description, enforced by the schema. */}
      <fieldset className="space-y-2">
        <legend className="text-[13px] font-bold text-stone-700 dark:text-stone-200">
          Known defects <span className="text-[var(--ck-role-accent)]" aria-hidden>*</span>
          <span className="sr-only"> (required)</span>
        </legend>

        <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-3 dark:border-zinc-800 dark:bg-zinc-900">
          <input
            type="checkbox"
            checked={model.noDefects}
            onChange={e => onChange("noDefects", e.target.checked)}
            className="h-5 w-5 shrink-0 accent-[var(--ck-role-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ck-role-accent)]"
          />
          <span className="text-[13px] font-semibold text-stone-700 dark:text-stone-200">No known defects</span>
        </label>

        <ConditionalField show={!model.noDefects}>
          <WizardField label="Describe the defects" error={errors.knownDefects} aiFilled={aiFilled.has("knownDefects")} uncertain={uncertain.has("knownDefects")}>
            {({ id, describedBy, invalid }) => (
              <textarea
                id={id} name="knownDefects" rows={3}
                aria-describedby={describedBy} aria-invalid={invalid}
                className={`${controlClass} resize-none`}
                placeholder="e.g. Small scratch on the left side; one drawer sticks."
                value={model.knownDefects}
                onChange={e => onChange("knownDefects", e.target.value)}
              />
            )}
          </WizardField>
        </ConditionalField>
      </fieldset>

      <WizardField label="Accessories included" hint="Optional — cables, remote, manual…" error={errors.accessoriesIncluded}>
        {({ id, describedBy, invalid }) => (
          <input
            id={id} name="accessoriesIncluded" type="text"
            aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass} value={model.accessoriesIncluded}
            onChange={e => onChange("accessoriesIncluded", e.target.value)}
          />
        )}
      </WizardField>

      <ConditionalField show={showDims}>
        <div className="grid gap-3 sm:grid-cols-2">
          <WizardField label="Dimensions" hint="Optional — helps with transport" error={errors.dimensions} aiFilled={aiFilled.has("dimensions")} uncertain={uncertain.has("dimensions")}>
            {({ id, describedBy, invalid }) => (
              <input
                id={id} name="dimensions" type="text" placeholder="e.g. 120×60×75 cm"
                aria-describedby={describedBy} aria-invalid={invalid}
                className={controlClass} value={model.dimensions}
                onChange={e => onChange("dimensions", e.target.value)}
              />
            )}
          </WizardField>

          <WizardField label="Approximate weight" hint="Optional" error={errors.approximateWeight} aiFilled={aiFilled.has("approximateWeight")} uncertain={uncertain.has("approximateWeight")}>
            {({ id, describedBy, invalid }) => (
              <input
                id={id} name="approximateWeight" type="text" placeholder="e.g. 12 kg"
                aria-describedby={describedBy} aria-invalid={invalid}
                className={controlClass} value={model.approximateWeight}
                onChange={e => onChange("approximateWeight", e.target.value)}
              />
            )}
          </WizardField>
        </div>
      </ConditionalField>

      <WizardField
        label="Description" required
        error={errors.description}
        hint={`${model.description.length}/2000 — at least 30 characters`}
        aiFilled={aiFilled.has("description")} uncertain={uncertain.has("description")}
      >
        {({ id, describedBy, invalid }) => (
          <textarea
            id={id} name="description" rows={5} maxLength={2000}
            aria-describedby={describedBy} aria-invalid={invalid}
            className={`${controlClass} resize-none`}
            placeholder="Describe the item, how it was used, and anything a recipient should know."
            value={model.description}
            onChange={e => onChange("description", e.target.value)}
          />
        )}
      </WizardField>
    </div>
  );
}
