"use client";

import { WizardField, controlClass } from "../components/WizardField";
import { CATEGORIES, subcategoriesFor, type WizardModel } from "../wizardModel";

/** Step 2 — what the item is. */
export function BasicsStep({
  model, errors, aiFilled, uncertain, onChange,
}: {
  model: WizardModel;
  errors: Record<string, string>;
  aiFilled: Set<string>;
  uncertain: Set<string>;
  onChange: <K extends keyof WizardModel>(key: K, value: WizardModel[K]) => void;
}) {
  const subs = subcategoriesFor(model.category);

  return (
    <div className="space-y-3">
      <WizardField label="Category" required error={errors.category} aiFilled={aiFilled.has("category")} uncertain={uncertain.has("category")}>
        {({ id, describedBy, invalid }) => (
          <select
            id={id} name="category" aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass}
            value={model.category}
            onChange={e => onChange("category", e.target.value)}
          >
            <option value="">Select a category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </WizardField>

      <WizardField
        label="Subcategory" required
        error={errors.subcategory}
        hint={!model.category ? "Choose a category first" : undefined}
        aiFilled={aiFilled.has("subcategory")} uncertain={uncertain.has("subcategory")}
      >
        {({ id, describedBy, invalid }) => (
          <select
            id={id} name="subcategory" aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass}
            value={model.subcategory}
            disabled={!model.category}
            onChange={e => onChange("subcategory", e.target.value)}
          >
            <option value="">{model.category ? "Select a subcategory" : "—"}</option>
            {subs.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </WizardField>

      <WizardField
        label="Title" required
        error={errors.title}
        hint={`${model.title.length}/120`}
        aiFilled={aiFilled.has("title")} uncertain={uncertain.has("title")}
      >
        {({ id, describedBy, invalid }) => (
          <input
            id={id} name="title" type="text" maxLength={120}
            aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass}
            placeholder="e.g. Wooden study desk with chair"
            value={model.title}
            onChange={e => onChange("title", e.target.value)}
          />
        )}
      </WizardField>

      <WizardField label="Quantity" required error={errors.quantity}>
        {({ id, describedBy, invalid }) => (
          <input
            id={id} name="quantity" type="number" min={1} inputMode="numeric"
            aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass}
            value={model.quantity}
            onChange={e => onChange("quantity", Number(e.target.value))}
          />
        )}
      </WizardField>

      <div className="grid gap-3 sm:grid-cols-2">
        <WizardField label="Brand" hint="Optional" error={errors.brand} aiFilled={aiFilled.has("brand")} uncertain={uncertain.has("brand")}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id} name="brand" type="text" aria-describedby={describedBy} aria-invalid={invalid}
              className={controlClass} value={model.brand}
              onChange={e => onChange("brand", e.target.value)}
            />
          )}
        </WizardField>

        <WizardField label="Model" hint="Optional" error={errors.model} aiFilled={aiFilled.has("model")} uncertain={uncertain.has("model")}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id} name="model" type="text" aria-describedby={describedBy} aria-invalid={invalid}
              className={controlClass} value={model.model}
              onChange={e => onChange("model", e.target.value)}
            />
          )}
        </WizardField>
      </div>
    </div>
  );
}
