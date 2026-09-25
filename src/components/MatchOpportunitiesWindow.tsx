"use client";

import { useState, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import type { ItemMatch } from "@/lib/api";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogBody,
} from "@/components/ui/dialog";

const CLOSED_STATUSES = new Set([
  "DONOR_REJECTED", "REJECTED", "CANCELLED", "COMPLETED", "FULFILLED", "FAILED",
]);

export function MatchOpportunitiesWindow({ matches, emptyState, renderMatch }: {
  matches: ItemMatch[];
  emptyState: ReactNode;
  renderMatch: (match: ItemMatch, close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const active = matches.filter(match => !CLOSED_STATUSES.has(match.status));
  const previous = matches.filter(match => CLOSED_STATUSES.has(match.status));
  const needsAction = active.filter(match => ["DONOR_REVIEW", "DONEE_ACCEPTED"].includes(match.status)).length;
  const close = () => setOpen(false);

  return (
    <section data-tour="matches" className="rounded-2xl border border-stone-200 bg-white/80 p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">Match opportunities</p>
      <h2 className="mt-2 text-lg font-bold text-stone-900 dark:text-stone-100">Your items could help someone.</h2>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">See the needs matched to your donated items.</p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button type="button" className="mt-5 flex min-h-11 w-full flex-wrap items-center justify-center gap-2 rounded-xl bg-[var(--ck-role-accent)] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--ck-role-hover)] sm:w-auto">
            View match opportunities
            {needsAction > 0 && <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{needsAction} to review</span>}
            <ArrowUpRight className="size-4 shrink-0" aria-hidden />
          </button>
        </DialogTrigger>
        <DialogContent className="bottom-0 top-auto w-full max-w-2xl translate-y-0 rounded-t-2xl rounded-b-none bg-[#fffcf8] dark:bg-zinc-900 sm:bottom-auto sm:top-1/2 sm:w-[calc(100%-2rem)] sm:-translate-y-1/2 sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Match opportunities</DialogTitle>
            <DialogDescription>Needs your items could fulfil.</DialogDescription>
          </DialogHeader>
          <DialogBody className="overscroll-contain [&_button]:min-h-11 [&_input:not([type=checkbox])]:text-base">
            {matches.length === 0 ? emptyState : (
              <>
                <div className="mb-3 flex items-center justify-between gap-3 text-xs font-semibold text-stone-500 dark:text-stone-400">
                  <span>Current matches</span><span>{active.length}</span>
                </div>
                {active.length ? <div className="space-y-4">{active.map(match => renderMatch(match, close))}</div> : <p className="py-4 text-sm text-stone-500 dark:text-stone-400">No current opportunities. Your previous matches are below.</p>}
                {previous.length > 0 && (
                  <details className="mt-5 border-t border-stone-200 pt-2 dark:border-zinc-700">
                    <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-stone-600 dark:text-stone-300">Previous matches · {previous.length}</summary>
                    <div className="space-y-4 pt-2">{previous.map(match => renderMatch(match, close))}</div>
                  </details>
                )}
              </>
            )}
          </DialogBody>
          <p className="shrink-0 border-t border-stone-200 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-xs text-stone-500 dark:border-zinc-700 dark:text-stone-400">AI scores suggest compatibility. They do not guarantee suitability.</p>
        </DialogContent>
      </Dialog>
    </section>
  );
}
