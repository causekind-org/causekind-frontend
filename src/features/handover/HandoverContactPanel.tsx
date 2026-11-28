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
  const isNgoDrive = vm.flow === "NGO_OFFER";
  const donor = vm.role === "DONOR";
  // The pickup card says the NGO will assign someone; "calls aren't on" would only confuse.
  if (vm.awaitingPickupPerson) return null;
  const label = donor
    ? `Call ${vm.counterpart.name ?? (isNgoDrive ? "the NGO" : "the recipient")}`
    : `Call ${vm.counterpart.name ?? "the donor"}`;

  const lockedMessage = isNgoDrive
    ? (donor
        ? "The NGO hasn't turned on calls yet. Use the chat for now — they'll see it straight away."
        : "Their number isn't available yet.")
    : (donor
        ? "Their number isn't available yet."
        : "The donor hasn't turned on calls yet. Use the chat for now — they'll see it straight away.");

  const showToggle = isNgoDrive
    ? (!donor && Boolean(onTogglePermission) && !vm.closed)
    : (donor && Boolean(onTogglePermission) && !vm.closed);

  // Once the handover is complete (or cancelled) there is nothing left to arrange,
  // so the call button is switched off for both sides (owner, 24 Nov 2026).
  if (vm.closed) {
    return (
      <Panel title="Contact">
        <CallAction phone={null} label={label}
          lockedMessage={vm.state === "completed"
            ? "Calls are off — this donation is complete."
            : "Calls are off — this handover is closed."} />
      </Panel>
    );
  }

  return (
    <Panel title="Contact">
      <div className="space-y-3">
        <HandoverContactsCall contacts={vm.counterpart.contacts} phone={vm.counterpart.phone} label={label} lockedMessage={lockedMessage} />
        {showToggle && onTogglePermission && (
          <CallPermissionToggle allowed={vm.donorAllowsDoneeCall} onToggle={onTogglePermission} />
        )}
      </div>
    </Panel>
  );
}

/**
 * Who handles the handover (NGO drives can list up to 5 people, first = primary): one row per
 * person with their initials, name, role / Primary tag and their own Call button. Phones are
 * only there once calls are allowed; names and roles always show.
 */
export function HandoverContactsCall({ contacts, phone, label, lockedMessage }: {
  contacts?: { name: string; phone: string | null; role?: string | null }[] | null;
  phone: string | null; label: string; lockedMessage: string;
}) {
  const list = contacts ?? [];
  if (list.length <= 1) return <CallAction phone={(list[0]?.phone ?? phone)?.replace(/[^\d+]/g, "") || null} label={label} lockedMessage={lockedMessage} />;
  const anyPhone = list.some((c) => c.phone);
  return (
    <div className="space-y-3" data-testid="handover-contacts">
      <p className="text-xs text-stone-500 dark:text-stone-400">
        {anyPhone ? "Call whoever is easiest. Your number shows on their phone." : lockedMessage}
      </p>
      <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 dark:divide-zinc-800 dark:border-zinc-700">
        {list.map((c, i) => {
          const tel = c.phone?.replace(/[^\d+]/g, "") || null;
          const initials = c.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
          return (
            <li key={`${c.name}-${i}`} data-testid="handover-contact-row" className="flex items-center gap-3 bg-white px-3 py-2.5 dark:bg-zinc-900">
              <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--handover-soft)] text-xs font-bold text-[var(--handover-accent)]">{initials}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-stone-800 dark:text-stone-100">{c.name}</span>
                <span className="block truncate text-xs text-stone-500 dark:text-stone-400">
                  {i === 0 ? <span className="font-bold text-emerald-700 dark:text-emerald-400">Primary contact</span> : (c.role || "Handover contact")}
                </span>
              </span>
              {tel ? (
                <a href={`tel:${tel}`} aria-label={`Call ${c.name}`}
                  className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full bg-[var(--handover-accent)] px-3 text-xs font-bold text-[var(--handover-on-accent)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--handover-ring)]">
                  <PhoneCall className="h-3.5 w-3.5" aria-hidden /> Call
                </a>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 text-2xs font-semibold text-stone-400" title={lockedMessage}>
                  <Lock className="h-3 w-3" aria-hidden /> Chat only
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CallAction({ phone, label, lockedMessage }: {
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
