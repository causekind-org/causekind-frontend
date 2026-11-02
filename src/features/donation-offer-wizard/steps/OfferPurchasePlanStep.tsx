"use client";

import { useEffect, useState } from "react";
import { Check, Handshake, Loader2, ShieldCheck, Truck, Wand2 } from "lucide-react";
import { WizardField, controlClass } from "@/features/wizard-kit/WizardField";
import { previewProductLink } from "@/lib/api";
import { isSafeWebLink } from "../offerSerializer";
import { PURCHASE_METHODS, PURCHASE_TIMELINES, type OfferModel } from "../offerModel";

import { UiText, useUiText } from "@/components/UiText";
import { useTranslations } from "next-intl";
import { useOfferCopy } from "../offerCopy";
const METHOD_ICON = { BUY_AND_HAND_OVER: Handshake, DIRECT_DELIVERY: Truck } as const;

/** What happens after acceptance, per method — shown under the chosen card. */
/** Display copy for METHOD_NEXT, translated (was a module constant). */
function useMethodNextCopy(): Record<string, string[]> {
  const ui = useUiText();
  return {
  BUY_AND_HAND_OVER: [
    ui("The recipient accepts your proposal and our team approves it."),
    ui("You buy the item and upload a real photo of it."),
    ui("Once the photo is approved, you arrange the handover with the handover code."),
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
  model, errors, onChange, requestTitle,
}: {
  model: OfferModel;
  errors: Record<string, string>;
  onChange: <K extends keyof OfferModel>(key: K, value: OfferModel[K]) => void;
  requestTitle: string | null;
}) {
  const wt = useTranslations("wizardFlow");
  const tr = useOfferCopy();
  const METHOD_NEXT = useMethodNextCopy();
  const ui = useUiText();
  const direct = model.fulfilmentMethod === "DIRECT_DELIVERY";
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

      <WizardField label={ui("Product link")} required hint={ui("The exact listing you plan to buy")} error={errors.productUrl}>
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
      </WizardField>
      {fill.kind !== "idle" && fill.kind !== "loading" && (
        <p role="status" className={`-mt-3 text-xs ${fill.kind === "filled" ? "text-green-700 dark:text-green-400" : "text-stone-600 dark:text-stone-400"}`}>
          {"message" in fill ? fill.message : null}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <WizardField label={ui("Brand")} required error={errors.proposedBrand}>
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
        <WizardField label={ui("Model or variant")} required error={errors.proposedModel}>
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
        <WizardField label={ui("Estimated cost")} required hint={ui("In rupees")} error={errors.estimatedCost}>
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
        <WizardField label={direct ? ui("Retailer") : ui("Store")} required error={errors.intendedStore}>
          {({ id, describedBy, invalid }) => (
            <input
              type="text" id={id} name="intendedStore" maxLength={200}
              value={model.intendedStore}
              onChange={e => onChange("intendedStore", e.target.value)}
              aria-describedby={describedBy} aria-invalid={invalid}
              className={controlClass}
              placeholder={direct ? ui("Amazon, Flipkart…") : ui("Local shop, market…")}
            />
          )}
        </WizardField>
      </div>

      <WizardField label={ui("Anything the recipient should know?")} hint={ui("Optional")} error={errors.purchaseNotes}>
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
    </div>
  );
}
