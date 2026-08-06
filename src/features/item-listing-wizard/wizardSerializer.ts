import type { CreateListingPayload } from "@/lib/api";
import { encodeCity } from "./wizardLocation";
import { fieldsFor } from "./wizardFields";
import { uploadedUrls, type WizardModel } from "./wizardModel";

/**
 * The one and only model -> API mapper.
 *
 * <p>Two rules that are easy to get wrong and impossible to see in the UI:
 *
 * <p>1. **Cleared fields send `""`, not `undefined`.** The endpoint is a PATCH,
 * so an omitted key leaves the previous server value in place. A donor who
 * switches category away from Electronics — clearing working status — would
 * otherwise keep the old value on the server and see it reappear on the next
 * load. Conditional fields are therefore explicitly blanked, not dropped.
 *
 * <p>2. **Legacy logistics fields are omitted entirely** (pickupDays,
 * donorDropOffAvailable, transportPayerPreference, ...). Omission is what
 * preserves whatever the server already holds; sending `""` would wipe values
 * that now belong to the Handover Hub. This is the one place where omission is
 * the correct choice, which is exactly why it is documented here.
 */
export function serialize(model: WizardModel): Partial<CreateListingPayload> {
  const urls = uploadedUrls(model.photos);
  // The manifest decides what this category asks for; anything it hides is sent
  // blank rather than omitted, so a value the donor can no longer see cannot
  // survive on the server. See the PATCH note above for why "" and not undefined.
  const fields = fieldsFor(model.category, model.subcategory);
  const keep = (key: Parameters<typeof fields.visible>[0], value: string) =>
    fields.visible(key) ? value.trim() : "";

  return {
    title: model.title.trim(),
    category: model.category,
    subcategory: model.subcategory,
    quantity: model.quantity,
    condition: model.condition,
    approximateAge: model.approximateAge,

    // Every optional field goes through the manifest — blanked, not omitted,
    // when this category does not ask for it.
    brand: keep("brand", model.brand),
    model: keep("model", model.model),
    workingStatus: keep("workingStatus", model.workingStatus),
    dimensions: keep("dimensions", model.dimensions),
    approximateWeight: keep("approximateWeight", model.approximateWeight),
    accessoriesIncluded: keep("accessoriesIncluded", model.accessoriesIncluded),

    knownDefects: model.noDefects ? "NONE" : model.knownDefects.trim(),
    description: model.description.trim(),

    // First uploaded photo is the main image; the rest ride in a `|`-joined tail.
    imageUrl: urls[0] ?? null,
    imageUrls: urls.length > 1 ? urls.slice(1).join("|") : "",

    city: encodeCity({ countryIso: model.countryIso, stateIso: model.stateIso, city: model.city.trim() }),
    pincode: model.pincode.trim(),
    locality: model.locality.trim(),
    ...(model.latitude != null ? { latitude: model.latitude } : {}),
    ...(model.longitude != null ? { longitude: model.longitude } : {}),

    policyVersion: "1.0",
    declarationsAccepted: model.declarationsConfirmed,
  };
}

/**
 * A stable digest of everything that would be sent. The autosave queue compares
 * digests so identical snapshots (a focus change, a no-op blur) do not each cost
 * a PATCH.
 */
export function snapshotKey(model: WizardModel): string {
  return JSON.stringify(serialize(model));
}

/**
 * Fields whose change invalidates a prior declarations confirmation. Ticking the
 * box then editing the item must not submit content the donor never agreed to,
 * and the server's stored `true` from an earlier save must not paper over it.
 */
export function materialDigest(model: WizardModel): string {
  return JSON.stringify([
    uploadedUrls(model.photos),
    model.category, model.subcategory, model.title, model.quantity,
    model.brand, model.model, model.approximateAge, model.condition,
    model.workingStatus, model.noDefects, model.knownDefects,
    model.accessoriesIncluded, model.dimensions, model.approximateWeight,
    model.description, model.countryIso, model.stateIso, model.city,
    model.locality, model.pincode,
  ]);
}
