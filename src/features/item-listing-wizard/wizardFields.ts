/**
 * Which detail fields each donor category actually needs.
 *
 * <p>Every donor used to answer the same eight questions regardless of what they
 * were giving: a book was asked its working status, a sofa its model number, and
 * a first-aid kit its brand. Meanwhile a jacket — where size decides everything —
 * had nowhere to say what size it was.
 *
 * <p>This is the single source for that. The form, the validator, the API payload
 * and the review page all read it, so they cannot disagree about whether a field
 * applies.
 *
 * <p><b>Labels only ever narrow a meaning, never change it.</b> `dimensions`
 * becomes "Size" for clothing because both are physical measurements of the item.
 * Nothing is repurposed across meanings — `brand` is hard-labelled "Brand" in the
 * admin dashboard, the offers queue, the donee offers view and
 * ListingDetailPanel, so relabelling it "Publisher" for books would show a
 * recipient "Brand: Penguin". Hiding a field is safe; redefining one is not.
 */

export type OptionalFieldKey =
  | "brand"
  | "model"
  | "workingStatus"
  | "dimensions"
  | "approximateWeight"
  | "accessoriesIncluded";

type FieldSpec = {
  label: string;
  hint?: string;
  placeholder?: string;
};

type CategorySpec = {
  show: Partial<Record<OptionalFieldKey, FieldSpec>>;
  /** Narrow overrides for a subcategory whose needs differ from its category. */
  bySubcategory?: Record<string, Partial<Record<OptionalFieldKey, FieldSpec>>>;
};

const DEFAULTS: Record<OptionalFieldKey, FieldSpec> = {
  brand: { label: "Brand" },
  model: { label: "Model" },
  workingStatus: { label: "Working status" },
  dimensions: { label: "Dimensions", placeholder: "e.g. 120×60×75 cm" },
  approximateWeight: { label: "Approximate weight", placeholder: "e.g. 12 kg" },
  accessoriesIncluded: { label: "Accessories included" },
};

const SIZE: FieldSpec = { label: "Size", placeholder: "e.g. M / 40 / 8–10 years", hint: "What size is it?" };

/**
 * Keys must match DONOR_LISTING_CATEGORIES exactly — a typo silently degrades to
 * "show nothing extra", which looks like a working form. The verification script
 * asserts this.
 */
const CATEGORY_FIELDS: Record<string, CategorySpec> = {
  // Model earns its line here and nowhere else: "Galaxy A12" is what tells a
  // recipient whether their charger fits.
  Electronics: {
    show: {
      brand: { label: "Brand", placeholder: "e.g. Samsung" },
      model: { label: "Model", placeholder: "e.g. Galaxy A12" },
      workingStatus: DEFAULTS.workingStatus,
      accessoriesIncluded: { label: "What's included", hint: "Charger, cable, box…" },
    },
  },

  // Make matters for parts and sizing; a model number does not help a recipient
  // decide. Dropping model halves the noise on a first-aid kit.
  "Medical aid": {
    show: {
      brand: { label: "Brand", hint: "If it's on a label" },
      workingStatus: DEFAULTS.workingStatus,
      dimensions: DEFAULTS.dimensions,
      approximateWeight: DEFAULTS.approximateWeight,
      accessoriesIncluded: { label: "What's included", hint: "Cushion, footrest, manual…" },
    },
  },

  // Dimensions and weight decide whether it can be moved at all. Fittings are
  // exactly what goes missing from flat-pack, and a bed without them is a problem.
  Furniture: {
    show: {
      dimensions: DEFAULTS.dimensions,
      approximateWeight: DEFAULTS.approximateWeight,
      accessoriesIncluded: { label: "Fittings included", hint: "Screws, assembly key, shelves…" },
    },
  },

  // Size and condition decide everything; brand is vanity on donated clothing.
  Clothing: {
    show: { dimensions: SIZE },
  },

  Household: {
    show: {
      workingStatus: DEFAULTS.workingStatus,
      dimensions: { label: "Size or dimensions", hint: "e.g. double bedsheet, 6-litre pan" },
      accessoriesIncluded: { label: "What's included", hint: "Lids, attachments…" },
    },
  },

  // Weight IS the specification for dumbbells and plates.
  Sports: {
    show: {
      brand: { label: "Brand", hint: "If it's on a label" },
      workingStatus: DEFAULTS.workingStatus,
      dimensions: { ...SIZE, hint: "Frame size, shoe size…" },
      approximateWeight: DEFAULTS.approximateWeight,
      accessoriesIncluded: { label: "What's included", hint: "Pump, helmet, spare parts…" },
    },
  },

  // A book needs title, condition, defects and description. Nothing else — this
  // is the biggest simplification in the set.
  Education: {
    show: {},
    bySubcategory: {
      // A school uniform is a garment; the category rule would leave no way to
      // say what size it is.
      Uniforms: { dimensions: SIZE },
    },
  },
};

export type ResolvedFields = {
  visible: (key: OptionalFieldKey) => boolean;
  label: (key: OptionalFieldKey) => string;
  hint: (key: OptionalFieldKey) => string | undefined;
  placeholder: (key: OptionalFieldKey) => string | undefined;
  /** Everything hidden for this pair — used to clear stale values and blank the payload. */
  hiddenKeys: () => OptionalFieldKey[];
};

const ALL_KEYS: OptionalFieldKey[] = [
  "brand", "model", "workingStatus", "dimensions", "approximateWeight", "accessoriesIncluded",
];

/**
 * Resolves the field set for a category/subcategory pair. An unknown category
 * (including the empty string, before one is chosen) shows nothing extra, which
 * is the correct conservative default.
 */
export function fieldsFor(category: string, subcategory: string): ResolvedFields {
  const spec = CATEGORY_FIELDS[category];
  const resolved: Partial<Record<OptionalFieldKey, FieldSpec>> = {
    ...(spec?.show ?? {}),
    ...(subcategory ? spec?.bySubcategory?.[subcategory] ?? {} : {}),
  };

  return {
    visible: key => key in resolved,
    label: key => resolved[key]?.label ?? DEFAULTS[key].label,
    hint: key => resolved[key]?.hint,
    placeholder: key => resolved[key]?.placeholder,
    hiddenKeys: () => ALL_KEYS.filter(k => !(k in resolved)),
  };
}

/** Exposed for the verification script; not needed at runtime. */
export const __CATEGORY_FIELD_KEYS = Object.keys(CATEGORY_FIELDS);
export const __SUBCATEGORY_OVERRIDES = Object.entries(CATEGORY_FIELDS)
  .flatMap(([cat, spec]) => Object.keys(spec.bySubcategory ?? {}).map(sub => [cat, sub] as const));
