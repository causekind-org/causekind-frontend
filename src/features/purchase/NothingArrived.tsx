"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import type { PurchaseView } from "@/lib/api";
import { PhotoDropzone, Stepper } from "./DamageReport";
import { deliveryDateLabel } from "./PurchaseDeliveryUpdates";

export type NotReceivedMode = "NOT_YET" | "CONFIRM" | "NO_UPDATE";

const CHECKS = [
  ["checkedNeighbours", "Checked with neighbours / building security"],
  ["checkedFamily", "Checked with family members at the address"],
  ["checkedTracking", "Checked the courier tracking / delivery OTP, if any"],
] as const;

const field = "w-full min-h-12 rounded-xl border border-[#C9D0DB] bg-white px-3.5 py-2 text-base text-stone-900 focus:border-[var(--ck-role-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--ck-role-accent)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-stone-100 sm:text-[15px]";
const primary = "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] bg-[var(--ck-role-accent)] px-7 py-2 text-[16px] font-extrabold text-white hover:bg-[var(--ck-role-hover)] disabled:opacity-60";

/**
 * "Nothing arrived" in two steps: the checklist first, then either the 48-hour
 * "not received yet" (the purchase stays open and every other answer still works)
 * or a final report with the declaration. The final report needs the donor's
 * delivery proof, or opens without it three days after the latest expected date.
 */
export function NothingArrivedFlow({ view, busy, onSubmit }: {
  view: PurchaseView; busy: boolean;
  onSubmit: (mode: NotReceivedMode, declaration: boolean, note: string) => Promise<boolean>;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState<"checklist" | "options">("checklist");
  const [mode, setMode] = useState<NotReceivedMode | "">("");
  const [declared, setDeclared] = useState(false);
  const [note, setNote] = useState("");
  const allChecked = CHECKS.every(([k]) => checked[k]);
  const canNotYet = !view.notReceivedYetAt;
  const final: NotReceivedMode | null = view.nothingArrivedConfirmable ? "CONFIRM" : view.noUpdateOptionOpen ? "NO_UPDATE" : null;
  const expected = view.expectedDeliveryAt?.slice(0, 10);

  if (step === "checklist") {
    return (
      <div className="space-y-3" data-testid="nothing-arrived-checklist">
        <p className="text-[14px] font-bold text-stone-900 dark:text-stone-100">Before you report it, please check:</p>
        {CHECKS.map(([k, label]) => (
          <label key={k} className="flex min-h-11 items-center gap-3 rounded-xl border border-stone-200 px-3.5 text-[15px] dark:border-zinc-800">
            <input type="checkbox" className="size-5 shrink-0" checked={!!checked[k]} onChange={e => setChecked(c => ({ ...c, [k]: e.target.checked }))} />
            {label}
          </label>
        ))}
        <button type="button" className={primary} disabled={!allChecked} onClick={() => setStep("options")}>
          <Check className="size-4" aria-hidden /> Continue
        </button>
      </div>
    );
  }

  const option = (value: NotReceivedMode, title: string, hint: string) => (
    <button type="button" role="radio" aria-checked={mode === value} onClick={() => setMode(value)}
      className={`min-h-14 rounded-xl border px-3.5 py-2.5 text-left ${mode === value ? "border-[var(--ck-role-accent)] bg-[var(--ck-role-soft)] ring-1 ring-[var(--ck-role-accent)]" : "border-stone-300 dark:border-zinc-700"}`}>
      <span className="block text-[15px] font-bold text-stone-900 dark:text-stone-100">{title}</span>
      <span className="block text-[13px] text-stone-500 dark:text-stone-400">{hint}</span>
    </button>
  );
  const finalChosen = mode === "CONFIRM" || mode === "NO_UPDATE";

  return (
    <div className="space-y-4" data-testid="nothing-arrived-options">
      <div role="radiogroup" aria-label="What would you like to do?" className="grid gap-2 sm:grid-cols-2">
        {canNotYet && option("NOT_YET", "Not received yet",
          "We'll ask the donor to check tracking. You can still tell us what arrived; after 48 hours we'll check with you again.")}
        {final === "CONFIRM" && option("CONFIRM", "Confirm nothing arrived", "Final: this purchase closes and our team follows up.")}
        {final === "NO_UPDATE" && option("NO_UPDATE", "Not arrived — no update from donor",
          "The expected date passed 3 days ago without delivery proof. Final: this purchase closes and our team follows up.")}
      </div>
      {!final && (
        <p className="text-[13px] text-stone-600 dark:text-stone-300">
          You can confirm nothing arrived once the donor adds delivery proof
          {expected ? `, or from 3 days after the expected date (${deliveryDateLabel(expected)}) if they don't` : ""}.
        </p>
      )}
      {finalChosen && (
        <div className="space-y-3 rounded-2xl bg-stone-50 p-4 dark:bg-zinc-800/60">
          <label className="flex items-start gap-3 text-[15px]">
            <input type="checkbox" className="mt-1 size-5 shrink-0" checked={declared} onChange={e => setDeclared(e.target.checked)} />
            <span className="font-bold">I confirm I have not received any of these items.</span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-bold text-stone-900 dark:text-stone-100">Anything to add? (optional)</span>
            <textarea rows={2} className={field} value={note} maxLength={1000} onChange={e => setNote(e.target.value)} />
          </label>
          <p className="text-[13px] text-stone-600 dark:text-stone-300">
            Nothing is counted as received, and the items go back on your request for other donors. Nobody is blamed automatically.
          </p>
        </div>
      )}
      {mode && (
        <button type="button" className={primary} disabled={busy || (finalChosen && !declared)}
          onClick={() => void onSubmit(mode, declared, note.trim())}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {mode === "NOT_YET" ? "Tell the donor it hasn't arrived yet" : "Report nothing arrived"}
        </button>
      )}
    </div>
  );
}

/**
 * The package turned up after the issue closed: how many, in what condition (with
 * photos if damaged). Our team confirms before anything is counted.
 */
export function LateArrivalForm({ max, busy, onSubmit }: {
  max: number; busy: boolean;
  onSubmit: (data: { quantity: number; condition: "GOOD" | "DAMAGED"; note: string }, photos: File[]) => Promise<boolean>;
}) {
  const [quantity, setQuantity] = useState(Math.min(1, max) || 1);
  const [condition, setCondition] = useState<"GOOD" | "DAMAGED">("GOOD");
  const [photos, setPhotos] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const blocked = condition === "DAMAGED" && photos.length === 0;
  return (
    <div className="space-y-3" data-testid="late-arrival-form">
      <Stepper label="How many arrived?" hint={`Up to ${max} not yet counted.`} value={quantity} min={1} max={Math.max(1, max)} onChange={setQuantity} />
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-1 w-full text-[14px] font-bold text-stone-900 dark:text-stone-100">Condition</legend>
        {([["GOOD", "Good"], ["DAMAGED", "Damaged"]] as const).map(([v, l]) => (
          <button key={v} type="button" aria-pressed={condition === v} onClick={() => setCondition(v)}
            className={`min-h-11 rounded-xl border px-3.5 text-sm font-bold ${condition === v ? "border-[var(--ck-role-accent)] ring-1 ring-[var(--ck-role-accent)]" : "border-stone-300 dark:border-zinc-700"}`}>{l}</button>
        ))}
      </fieldset>
      {condition === "DAMAGED" && <PhotoDropzone files={photos} onChange={setPhotos} />}
      <label className="flex flex-col gap-1.5">
        <span className="text-[14px] font-bold text-stone-900 dark:text-stone-100">Anything to add? (optional)</span>
        <textarea rows={2} className={field} value={note} maxLength={1000} onChange={e => setNote(e.target.value)} />
      </label>
      {blocked && <p role="alert" className="text-sm text-red-700 dark:text-red-400">Add at least one photo of the damage.</p>}
      <button type="button" className={primary} disabled={busy || blocked}
        onClick={() => void onSubmit({ quantity, condition, note: note.trim() }, photos)}>
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Tell our team
      </button>
    </div>
  );
}
