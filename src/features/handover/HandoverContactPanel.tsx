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
 * Who handles the handover (NGO drives can list up to 5 people, first = primary) and the Call
 * button: it dials the primary, or whoever is picked when there are several. Phones are only
 * there once calls are allowed; names and roles always show.
 */
export function HandoverContactsCall({ contacts, phone, label, lockedMessage }: {
  contacts?: { name: string; phone: string | null; role?: string | null }[] | null;
  phone: string | null; label: string; lockedMessage: string;
}) {
  const [picked, setPicked] = useState(0);
  const list = contacts ?? [];
  if (list.length <= 1) return <CallAction phone={(list[0]?.phone ?? phone)?.replace(/[^\d+]/g, "") || null} label={label} lockedMessage={lockedMessage} />;
  const who = list[Math.min(picked, list.length - 1)];
  return (
    <div className="space-y-2" data-testid="handover-contacts">
      <ul className="space-y-1 text-sm text-stone-700 dark:text-stone-300">
        {list.map((c, i) => (
          <li key={`${c.name}-${i}`}>{c.name}{c.role ? ` · ${c.role}` : ""}{i === 0 && <span className="ml-1.5 text-2xs font-bold text-emerald-700">Primary</span>}</li>
        ))}
      </ul>
      {list.some((c) => c.phone) && (
        <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300">
          Who to call
          <select aria-label="Who to call" value={picked} onChange={(e) => setPicked(Number(e.target.value))}
            className="mt-1 block w-full min-h-[40px] rounded-lg border border-stone-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            {list.map((c, i) => <option key={i} value={i}>{c.name}{c.role ? ` (${c.role})` : ""}{i === 0 ? " · primary" : ""}</option>)}
          </select>
        </label>
      )}
      <CallAction phone={who.phone?.replace(/[^\d+]/g, "") || null} label={`Call ${who.name}`} lockedMessage={lockedMessage} />
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
