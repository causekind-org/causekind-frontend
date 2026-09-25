"use client";

import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, ShoppingBag } from "lucide-react";
import type { StepAvailability } from "@/features/wizard-kit/WizardProgress";
import type { OfferStep } from "./offerModel";

type Props = {
  children: ReactNode;
  saveStatus: ReactNode;
  current: OfferStep;
  steps: readonly OfferStep[];
  labels: Record<OfferStep, string>;
  availability: Record<OfferStep, StepAvailability>;
  requestTitle: string | null;
  requestedQuantity: number | null;
  onJump: (step: OfferStep) => void;
  onExit: () => void;
  onSaveExit: () => void;
  onContinue: () => void;
  submitting: boolean;
  submitted: boolean;
  savingExit: boolean;
};

/** Guided presentation over the existing persisted purchase wizard. */
export function GuidedPurchaseLayout({
  children, saveStatus, current, steps, labels, availability, requestTitle,
  requestedQuantity, onJump, onExit, onSaveExit, onContinue,
  submitting, submitted, savingExit,
}: Props) {
  const index = steps.indexOf(current);
  const busy = submitting || submitted || savingExit;
  const last = current === "review";
  const title = requestTitle || "The requested item";
  const summary = (
    <>
      <p className="break-words text-base font-semibold text-stone-900 dark:text-stone-100">{title}</p>
      {requestedQuantity != null && <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">Quantity requested: {requestedQuantity}</p>}
      <p className="mt-4 border-t border-stone-200 pt-4 text-sm leading-relaxed text-stone-600 dark:border-zinc-700 dark:text-stone-300">
        Buy only after the recipient accepts your offer. No payment is taken by CauseKind.
      </p>
    </>
  );

  return (
    <div className="bg-[#fffaf5] text-stone-900 dark:bg-zinc-950 dark:text-stone-100">
      <div className="mx-auto max-w-[1120px] px-4 pb-[calc(var(--ck-bottom-chrome)+1.5rem)] pt-3 sm:px-6 lg:pb-10 lg:pt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={onExit} disabled={busy} className="flex min-h-11 items-center gap-2 rounded-lg text-sm text-stone-600 disabled:opacity-50 dark:text-stone-300">
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> Back to request
          </button>
          {saveStatus}
        </div>

        <nav aria-label="Purchase offer form progress" className="mb-7">
          <div className="mb-2 flex justify-between gap-3 text-xs lg:hidden">
            <span className="font-semibold text-[var(--ck-role-accent)]">{labels[current]}</span>
            <span className="shrink-0 text-stone-500">Step {index + 1} of {steps.length}</span>
          </div>
          <ol className="flex gap-2 lg:gap-6">
            {steps.map((step, i) => (
              <li key={step} className="min-w-0 flex-1 lg:flex-none">
                <button type="button" onClick={() => onJump(step)}
                  disabled={busy || (step !== current && !availability[step].canNavigate)}
                  aria-current={step === current ? "step" : undefined}
                  aria-label={`Step ${i + 1}: ${labels[step]}${availability[step].complete ? ", complete" : ""}`}
                  className="flex min-h-11 w-full items-center gap-2 rounded-lg text-xs disabled:cursor-default lg:w-auto">
                  <span aria-hidden className={`h-1 w-full rounded-full lg:hidden ${i <= index ? "bg-[var(--ck-role-accent)]" : "bg-stone-200 dark:bg-zinc-800"}`} />
                  <span aria-hidden className={`hidden size-7 shrink-0 items-center justify-center rounded-full border lg:flex ${step === current ? "border-[var(--ck-role-accent)] bg-[var(--ck-role-accent)] text-white" : "border-stone-300 text-stone-500 dark:border-zinc-700"}`}>
                    {availability[step].complete && step !== current ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  <span className={`hidden lg:inline ${step === current ? "font-semibold text-[var(--ck-role-accent)]" : "text-stone-500 dark:text-stone-400"}`}>{labels[step]}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mb-6 max-w-xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--ck-role-accent)]">Give something new</p>
          <h2 className="text-[28px] font-bold leading-tight tracking-tight sm:text-4xl">Turn a need into a delivery.</h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">Tell the recipient what you plan to buy. We save your progress as you go.</p>
        </div>

        <details className="mb-5 rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
          <summary className="cursor-pointer text-sm font-semibold">View the request you’re supporting</summary>
          <div className="mt-4">{summary}</div>
        </details>

        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            {children}
            <div className="mt-5 border-t border-stone-200 pt-4 dark:border-zinc-800">
              <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-between">
                <button type="button" onClick={onContinue} disabled={busy}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--ck-role-accent)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--ck-role-hover)] disabled:opacity-60 sm:w-auto">
                  {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : submitted ? <Check className="size-4" aria-hidden /> : null}
                  {submitted ? "Offer submitted" : submitting ? "Submitting…" : last ? "Send purchase offer" : "Continue"}
                  {!submitting && !submitted && <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />}
                </button>
                <div className="flex items-center justify-between gap-3">
                  {index > 0 && <button type="button" disabled={busy} onClick={() => onJump(steps[index - 1])} className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm disabled:opacity-50"><ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> Back</button>}
                  <button type="button" disabled={busy} onClick={onSaveExit} className="min-h-11 rounded-lg px-2 text-sm text-stone-500 underline underline-offset-4 disabled:opacity-50 dark:text-stone-400">{savingExit ? "Saving…" : "Save & exit"}</button>
                </div>
              </div>
            </div>
          </div>
          <aside aria-label="Request summary" className="hidden rounded-2xl border border-stone-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 lg:block">
            <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-orange-50 text-[var(--ck-role-accent)] dark:bg-orange-950/30"><ShoppingBag className="size-6" aria-hidden /></div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">The need you’re supporting</p>
            {summary}
          </aside>
        </div>
      </div>
    </div>
  );
}
