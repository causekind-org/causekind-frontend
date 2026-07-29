"use client";

import { useState } from "react";
import { Loader2, Lock, PhoneCall } from "lucide-react";
import type { HandoverViewModel } from "./model";
import { Panel } from "./HandoverScheduleSummary";

/**
 * Direct contact between the two parties.
 *
 * <p><b>Deliberate wording change.</b> The old hubs said "numbers are never shown"
 * and "numbers stay private" next to a `tel:` link built from the counterpart's
 * actual phone number. There is no telephony proxy in this system — the donor
 * grants permission and the recipient then holds their real number, which any
 * phone will display in its call log. Calling that "masking" is a privacy promise
 * the code does not keep, so the copy now says what actually happens.
 */
export function HandoverContactPanel({ vm, onTogglePermission }: {
  vm: HandoverViewModel;
  onTogglePermission?: (next: boolean) => Promise<void>;
}) {
  const donor = vm.role === "DONOR";
  const label = donor ? `Call ${vm.counterpart.name ?? "the recipient"}` : `Call ${vm.counterpart.name ?? "the donor"}`;

  return (
    <Panel title="Contact">
      <div className="space-y-3">
        <CallAction
          phone={vm.counterpart.phone}
          label={label}
          lockedMessage={donor
            ? "Their number isn't available yet."
            : "The donor hasn't turned on calls yet. Use the chat for now — they'll see it straight away."}
        />
        {donor && onTogglePermission && !vm.closed && (
          <CallPermissionToggle allowed={vm.donorAllowsDoneeCall} onToggle={onTogglePermission} />
        )}
      </div>
    </Panel>
  );
}

function CallAction({ phone, label, lockedMessage }: {
  phone: string | null; label: string; lockedMessage: string;
}) {
  if (phone) {
    return (
      <a
        href={`tel:${phone}`}
        className="flex min-h-[44px] w-full items-center gap-3 rounded-lg border border-stone-200 px-3 py-2.5 transition-colors hover:bg-[var(--handover-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--handover-ring)] dark:border-zinc-700"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--handover-accent)] text-[var(--handover-on-accent)]">
          <PhoneCall className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-semibold text-stone-800 dark:text-stone-200">{label}</span>
          <span className="block text-xs text-stone-500 dark:text-stone-400">
            Opens your phone app. They&apos;ll see your number.
          </span>
        </span>
      </a>
    );
  }

  return (
    <div className="flex min-h-[44px] w-full items-center gap-3 rounded-lg border border-dashed border-stone-200 px-3 py-2.5 dark:border-zinc-700">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-400 dark:bg-zinc-800">
        <Lock className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-stone-500 dark:text-stone-400">{label}</span>
        <span className="block text-xs text-stone-400">{lockedMessage}</span>
      </span>
    </div>
  );
}

/** Reversible at any time, in both directions. */
function CallPermissionToggle({ allowed, onToggle }: {
  allowed: boolean; onToggle: (next: boolean) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try { await onToggle(!allowed); } catch { /* surfaced by the page's error slot */ }
    finally { setBusy(false); }
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-stone-50 px-3 py-2.5 dark:bg-zinc-800/60">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-stone-800 dark:text-stone-200">
          Let them call you
        </span>
        <span className="block text-xs text-stone-500 dark:text-stone-400">
          {allowed
            ? "On — they have your number. You can turn this off any time."
            : "Off — they can only message you. Turn on when you're ready for calls."}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={allowed}
        aria-label="Let the recipient call you"
        disabled={busy}
        onClick={toggle}
        className={`relative h-6 w-11 shrink-0 self-center rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--handover-ring)] disabled:opacity-50 ${
          allowed ? "bg-[var(--handover-accent)]" : "bg-stone-300 dark:bg-zinc-600"
        }`}
      >
        <span
          className={`absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform duration-200 ${
            allowed ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin text-stone-400" aria-hidden />}
        </span>
      </button>
    </div>
  );
}
