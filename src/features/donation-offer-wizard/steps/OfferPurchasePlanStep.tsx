"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Handshake, ImagePlus, Info, Loader2, ShieldCheck, ShoppingCart, Store, Truck, Wand2, X } from "lucide-react";
import type { WizardPhoto } from "@/features/wizard-kit/types";
import { WizardPhotoImage } from "@/features/wizard-kit/WizardPhotoImage";
import { WizardField, controlClass } from "@/features/wizard-kit/WizardField";
import { previewProductLink } from "@/lib/api";
import { isSafeWebLink } from "../offerSerializer";
import { PURCHASE_CHANNELS, PURCHASE_METHODS, PURCHASE_TIMELINES, planNeedsListing, type OfferModel } from "../offerModel";

import { UiText, useUiText } from "@/components/UiText";
import { useTranslations } from "next-intl";
import { useOfferCopy } from "../offerCopy";
const METHOD_ICON = { BUY_AND_HAND_OVER: Handshake, DIRECT_DELIVERY: Truck } as const;
const CHANNEL_ICON = { ONLINE: ShoppingCart, OFFLINE: Store } as const;

/** What happens after acceptance, per method — shown under the chosen card. */
/** Display copy for METHOD_NEXT, translated (was a module constant). */
function useMethodNextCopy(): Record<string, string[]> {
  const ui = useUiText();
  return {
  BUY_AND_HAND_OVER: [
    ui("The recipient accepts your offer, which reserves the quantity for you."),
    ui("You confirm you can still buy it, then buy it and tell us what you bought, with a photo."),
    ui("Once our team verifies it, you arrange the handover with the handover code."),
  ],
  DIRECT_DELIVERY: [
    ui("The recipient accepts and chooses to share a delivery address with you."),
    ui("You place a prepaid order and upload the order confirmation (payment details hidden)."),
    ui("The recipient confirms in CauseKind what actually arrived."),
  ],
};
}

/**
 * Step 1 of the WILL_PURCHASE flow (rebuilt 2026-10-15).
 *
 * <p>The donor proposes *how* the item will reach the recipient before anything
 * else, because the method decides every step after acceptance: a physical
 * handover with an item photo and handover code, or a prepaid retailer order
 * shipped to an address the recipient shares only after accepting.
 *
 * <p>No photo upload here: the item does not exist yet. Evidence is collected in
 * the purchase hub (`/offers/[id]/purchase`) once the offer is ready to buy.
 */
export function OfferPurchasePlanStep({
  model, errors, onChange, requestTitle, reference,
}: {
  model: OfferModel;
  errors: Record<string, string>;
  onChange: <K extends keyof OfferModel>(key: K, value: OfferModel[K]) => void;
  requestTitle: string | null;
  /** Optional reference image (buy and hand over): what the donor has in mind, never proof of purchase. */
  reference?: { photos: WizardPhoto[]; onAdd: (files: File[]) => void; onRemove: (id: string) => void };
}) {
  const wt = useTranslations("wizardFlow");
  const tr = useOfferCopy();
  const METHOD_NEXT = useMethodNextCopy();
  const ui = useUiText();
  const direct = model.fulfilmentMethod === "DIRECT_DELIVERY";
  const handOver = model.fulfilmentMethod === "BUY_AND_HAND_OVER";
  const offline = handOver && model.purchaseChannel === "OFFLINE";
  // The listing fields show for direct delivery and an online purchase; a shop
  // purchase shows them too, but every one is optional there.
  const listing = planNeedsListing(model);
  const showDetails = direct || (handOver && !!model.purchaseChannel);
  const [fill, setFill] = useState<{ kind: "idle" | "loading" } | { kind: "filled" | "empty"; message: string }>({ kind: "idle" });

  useEffect(() => {
    const url = model.productUrl.trim();
    if (!url || !isSafeWebLink(url)) return;
    if (model.proposedBrand.trim() && model.proposedModel.trim() && model.estimatedCost.trim() && model.intendedStore.trim()) {
      return;
    }
    const timer = setTimeout(() => {
      void fillFromLink();
    }, 700);
    return () => clearTimeout(timer);
  }, [model.productUrl]);

  /**
   * Reads the pasted product page on the server and fills only the fields the
   * donor left empty — never overwrites what they typed. Suggestions, not facts:
   * the donor reviews them before sending.
   */
  async function fillFromLink() {
    setFill({ kind: "loading" });
    try {
      const p = await previewProductLink(model.productUrl.trim());
      const filled: string[] = [];
      const put = <K extends "proposedBrand" | "proposedModel" | "estimatedCost" | "intendedStore">(key: K, value: string | null | undefined, label: string) => {
        if (value && !model[key].trim()) { onChange(key, value.slice(0, key === "intendedStore" ? 200 : 100)); filled.push(label); }
      };
      if (p.found) {
        put("proposedBrand", p.brand, "brand");
        put("proposedModel", p.model ?? p.productName, "model");
        put("estimatedCost", p.priceInr != null ? String(Math.round(p.priceInr)) : null, "cost");
      }
      put("intendedStore", p.retailer, direct ? "retailer" : "store");
      setFill(filled.length
        ? { kind: "filled", message: `Filled ${filled.join(", ")} from the link — please check before sending.` }
        : p.found
          ? { kind: "empty", message: ui("Nothing new to fill — your fields already have values.") }
          : { kind: "empty", message: ui("Couldn't read this page. Please fill in the details yourself.") });
    } catch (e) {
      setFill({ kind: "empty", message: e instanceof Error ? e.message : ui("Couldn't read this page. Please fill in the details yourself.") });
    }
  }

  return (
    <div className="space-y-6">
      <fieldset data-field="fulfilmentMethod">
        <legend className="mb-1 text-sm font-semibold text-stone-900 dark:text-stone-100">
          <UiText>How will the item reach the recipient?</UiText> <span className="text-red-600" aria-hidden>*</span>
        </legend>
        <p className="mb-3 text-xs text-stone-500 dark:text-stone-400"><UiText>The recipient accepts this together with the item.</UiText></p>
        <div role="radiogroup" aria-label={ui("Fulfilment method")} className="grid gap-3 sm:grid-cols-2">
          {PURCHASE_METHODS.map(m => {
            const Icon = METHOD_ICON[m.value];
            const selected = model.fulfilmentMethod === m.value;
            return (
              <button
                key={m.value} type="button" role="radio" aria-checked={selected}
                onClick={() => onChange("fulfilmentMethod", m.value)}
                className={`relative flex min-h-11 flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors ${
                  selected
                    ? "border-[var(--ck-role-accent)] bg-orange-50/70 ring-1 ring-[var(--ck-role-accent)] dark:bg-orange-950/20"
                    : "border-stone-200 bg-white hover:border-stone-300 dark:border-zinc-700 dark:bg-zinc-900"
                }`}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-orange-100 text-[var(--ck-role-accent)] dark:bg-orange-950/40">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {selected && <Check className="size-4 text-[var(--ck-role-accent)]" aria-hidden />}
                </span>
                <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{tr(m.label)}</span>
                <span className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">{tr(m.desc)}</span>
              </button>
            );
          })}
        </div>
        {errors.fulfilmentMethod && (
          <p role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">{errors.fulfilmentMethod}</p>
        )}
        {model.fulfilmentMethod && (
          <ol className="mt-3 space-y-1.5 rounded-xl bg-stone-50 p-3 text-xs leading-relaxed text-stone-600 dark:bg-zinc-950/40 dark:text-stone-300">
            {METHOD_NEXT[model.fulfilmentMethod].map((line, i) => (
              <li key={i} className="flex gap-2"><span className="font-semibold text-[var(--ck-role-accent)]">{i + 1}.</span>{line}</li>
            ))}
          </ol>
        )}
      </fieldset>

      {handOver && (
        <fieldset data-field="purchaseChannel">
          <legend className="mb-1 text-sm font-semibold text-stone-900 dark:text-stone-100">
            <UiText>How will you purchase the item?</UiText> <span className="text-red-600" aria-hidden>*</span>
          </legend>
          <div role="radiogroup" aria-label={ui("Purchasing method")} className="mt-2 grid gap-3 sm:grid-cols-2">
            {PURCHASE_CHANNELS.map(c => {
              const Icon = CHANNEL_ICON[c.value];
              const selected = model.purchaseChannel === c.value;
              return (
                <button
                  key={c.value} type="button" role="radio" aria-checked={selected}
                  onClick={() => onChange("purchaseChannel", c.value)}
                  className={`relative flex min-h-11 flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors ${
                    selected
                      ? "border-[var(--ck-role-accent)] bg-orange-50/70 ring-1 ring-[var(--ck-role-accent)] dark:bg-orange-950/20"
                      : "border-stone-200 bg-white hover:border-stone-300 dark:border-zinc-700 dark:bg-zinc-900"
                  }`}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-orange-100 text-[var(--ck-role-accent)] dark:bg-orange-950/40">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    {selected && <Check className="size-4 text-[var(--ck-role-accent)]" aria-hidden />}
                  </span>
                  <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{ui(c.label)}</span>
                  <span className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">{ui(c.desc)}</span>
                </button>
              );
            })}
          </div>
          {errors.purchaseChannel && (
            <p role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">{errors.purchaseChannel}</p>
          )}
        </fieldset>
      )}

      <WizardField
        label={direct ? ui("How soon can you place the order?") : ui("How soon can you buy it?")}
        required
        hint={ui("Counted from the day the recipient accepts, not from today.")}
        error={errors.purchaseTimeline}
      >
        {({ id, describedBy, invalid }) => (
          <select
            id={id} name="purchaseTimeline" data-field="purchaseTimeline"
            value={model.purchaseTimeline}
            onChange={e => onChange("purchaseTimeline", e.target.value)}
            aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass}
          >
            <option value="" disabled hidden><UiText>Choose your timeline</UiText></option>
            {PURCHASE_TIMELINES.map(opt => <option key={opt.value} value={opt.value}>{wt("timelineAfterAcceptance", { timeline: tr(opt.label) })}</option>)}
          </select>
        )}
      </WizardField>

      <div className="flex items-start gap-2 rounded-xl bg-orange-50 p-3 text-sm leading-relaxed text-stone-700 dark:bg-orange-950/30 dark:text-stone-300">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--ck-role-accent)]" aria-hidden />
        <p>
          {requestTitle
            ? wt.rich("waitBeforePurchasingTitle", { title: requestTitle, strong: (chunks) => <strong>{chunks}</strong>, b: (chunks) => <b>{chunks}</b> })
            : wt.rich("waitBeforePurchasing", { item: ui("the item"), strong: (chunks) => <strong>{chunks}</strong> })}
          {direct && <> <UiText>Direct delivery must be prepaid — the recipient must never pay on delivery.</UiText></>}
        </p>
      </div>

      {offline && (
        <div role="note" className="flex items-start gap-2 rounded-xl border border-stone-200 bg-white p-3 text-sm leading-relaxed text-stone-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-300">
          <Info className="mt-0.5 size-4 shrink-0 text-[var(--ck-role-accent)]" aria-hidden />
          <p><UiText>You can purchase this item from any physical store. If you haven&apos;t decided on the exact brand, model or shop yet, that&apos;s completely okay. You can provide the actual purchase details later.</UiText></p>
        </div>
      )}

      {showDetails && <>
      {offline && <p className="text-sm font-semibold text-stone-900 dark:text-stone-100"><UiText>Where are you planning to buy this item?</UiText> <span className="font-normal text-stone-500"><UiText>(all optional)</UiText></span></p>}
      {!offline && <WizardField label={ui("Product link")} required hint={ui("The exact listing you plan to buy")} error={errors.productUrl}>
        {({ id, describedBy, invalid }) => (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url" inputMode="url" id={id} name="productUrl" data-field="productUrl" maxLength={2000}
              value={model.productUrl}
              onChange={e => { onChange("productUrl", e.target.value); setFill({ kind: "idle" }); }}
              aria-describedby={describedBy} aria-invalid={invalid}
              className={`${controlClass} sm:flex-1`}
              placeholder={ui("https://")}
            />
            <button
              type="button" onClick={() => void fillFromLink()}
              disabled={!/^https:\/\//i.test(model.productUrl.trim()) || !isSafeWebLink(model.productUrl) || fill.kind === "loading"}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--ck-role-accent)] px-4 text-sm font-semibold text-[var(--ck-role-accent)] hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-orange-950/30"
            >
              {fill.kind === "loading" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Wand2 className="size-4" aria-hidden />}
              <UiText>Fill from link</UiText>
            </button>
          </div>
        )}
      </WizardField>}
      {fill.kind !== "idle" && fill.kind !== "loading" && (
        <p role="status" className={`-mt-3 text-xs ${fill.kind === "filled" ? "text-green-700 dark:text-green-400" : "text-stone-600 dark:text-stone-400"}`}>
          {"message" in fill ? fill.message : null}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <WizardField label={ui("Brand")} required={listing} hint={listing ? undefined : ui("Optional")} error={errors.proposedBrand}>
          {({ id, describedBy, invalid }) => (
            <input
              type="text" id={id} name="proposedBrand" maxLength={100}
              value={model.proposedBrand}
              onChange={e => onChange("proposedBrand", e.target.value)}
              aria-describedby={describedBy} aria-invalid={invalid}
              className={controlClass} placeholder={ui("Brand name")}
            />
          )}
        </WizardField>
        <WizardField label={ui("Model or variant")} required={listing} hint={listing ? undefined : ui("Optional")} error={errors.proposedModel}>
          {({ id, describedBy, invalid }) => (
            <input
              type="text" id={id} name="proposedModel" maxLength={100}
              value={model.proposedModel}
              onChange={e => onChange("proposedModel", e.target.value)}
              aria-describedby={describedBy} aria-invalid={invalid}
              className={controlClass} placeholder={ui("Model or variant")}
            />
          )}
        </WizardField>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <WizardField label={ui("Estimated cost")} required={listing} hint={listing ? ui("In rupees") : ui("Optional, in rupees")} error={errors.estimatedCost}>
          {({ id, describedBy, invalid }) => (
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400">₹</span>
              <input
                type="text" inputMode="decimal" id={id} name="estimatedCost"
                value={model.estimatedCost}
                onChange={e => onChange("estimatedCost", e.target.value)}
                aria-describedby={describedBy} aria-invalid={invalid}
                className={`${controlClass} pl-7`} placeholder="0"
              />
            </div>
          )}
        </WizardField>
        <WizardField label={direct ? ui("Retailer") : offline ? ui("Shop or store") : ui("Store")} required={listing} hint={listing ? undefined : ui("Optional")} error={errors.intendedStore}>
          {({ id, describedBy, invalid }) => (
            <input
              type="text" id={id} name="intendedStore" maxLength={200}
              value={model.intendedStore}
              onChange={e => onChange("intendedStore", e.target.value)}
              aria-describedby={describedBy} aria-invalid={invalid}
              className={controlClass}
              placeholder={offline ? ui("Local shop, market…") : ui("Amazon, Flipkart…")}
            />
          )}
        </WizardField>
      </div>

      <WizardField label={handOver ? ui("Additional item details") : ui("Anything the recipient should know?")} hint={ui("Optional")} error={errors.purchaseNotes}>
        {({ id, describedBy, invalid }) => (
          <textarea
            id={id} name="purchaseNotes" rows={2} maxLength={2000}
            value={model.purchaseNotes}
            onChange={e => onChange("purchaseNotes", e.target.value)}
            aria-describedby={describedBy} aria-invalid={invalid}
            className={controlClass}
            placeholder={ui("Colour, size, why you chose this one…")}
          />
        )}
      </WizardField>

      {handOver && reference && <ReferenceImage {...reference} />}
      </>}
    </div>
  );
}

/**
 * One optional picture of what the donor has in mind. It is only a reference:
 * the photo our team checks is taken of the real item after it is bought.
 */
function ReferenceImage({ photos, onAdd, onRemove }: { photos: WizardPhoto[]; onAdd: (files: File[]) => void; onRemove: (id: string) => void }) {
  const ui = useUiText();
  const input = useRef<HTMLInputElement>(null);
  const photo = photos[0];
  const src = photo ? photo.remoteUrl ?? photo.localUrl : null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100"><UiText>Reference image</UiText> <span className="font-normal text-stone-500"><UiText>(optional)</UiText></span></p>
      <p className="text-xs text-stone-500 dark:text-stone-400"><UiText>A picture of the kind of item you plan to buy. It is only a reference, not proof of purchase.</UiText></p>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
        onChange={e => { const f = Array.from(e.target.files ?? []).slice(0, 1); e.target.value = ""; if (f.length) onAdd(f); }} />
      {photo && src ? (
        <div className="relative h-28 w-28 overflow-hidden rounded-xl border border-stone-200 dark:border-zinc-700">
          <WizardPhotoImage src={src} alt={ui("Reference image")} className="object-cover" />
          {photo.status !== "uploaded" && photo.status !== "failed" && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/40"><Loader2 className="size-5 animate-spin" aria-hidden /></span>
          )}
          <button type="button" onClick={() => onRemove(photo.id)} aria-label={ui("Remove reference image")}
            className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow dark:bg-zinc-900/90 dark:text-stone-200">
            <X className="size-4" aria-hidden />
          </button>
          {photo.status === "failed" && <p className="absolute inset-x-0 bottom-0 bg-red-600 px-1 text-center text-3xs font-bold text-white"><UiText>Upload failed</UiText></p>}
        </div>
      ) : (
        <button type="button" onClick={() => input.current?.click()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-stone-300 px-4 text-sm font-semibold text-stone-700 hover:border-[var(--ck-role-accent)] dark:border-zinc-600 dark:text-stone-200">
          <ImagePlus className="size-4" aria-hidden /> <UiText>Add a reference image</UiText>
        </button>
      )}
    </div>
  );
}
