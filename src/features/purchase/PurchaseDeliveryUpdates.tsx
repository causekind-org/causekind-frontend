"use client";

import { useState } from "react";
import { CalendarClock, Check, Loader2, MessageSquare, PackageCheck } from "lucide-react";
import ChatWindow from "@/components/ChatWindow";
import type { PurchaseView } from "@/lib/api";

export type DeliveryChange = "DELAYED" | "EARLY";

// The viewer's local calendar date (YYYY-MM-DD).
const todayIso = () => new Date().toLocaleDateString("en-CA");

/** "Mon, 10 Nov" — the same shape the server uses in its notices. */
export function deliveryDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** The pre-filled message for each update; the donor may edit it before sending. */
export function deliveryTemplate(kind: DeliveryChange, iso: string): string {
  const date = deliveryDateLabel(iso);
  return kind === "DELAYED"
    ? `Hi! My order is running late. The seller now expects it to arrive by ${date}. Sorry for the wait, and thank you for your patience.`
    : `Good news! My order is arriving earlier than expected. It should reach you by ${date}. Please keep an eye out for the delivery.`;
}

/**
 * A sensible first date for each update: the day after the current expected date
 * for a delay, the day before it for an early arrival (never before today).
 */
export function suggestedDate(kind: DeliveryChange, expected: string | null | undefined): string {
  const today = todayIso();
  const current = expected ? expected.slice(0, 10) : today;
  const [y, m, d] = current.split("-").map(Number);
  const next = new Date(y, m - 1, d + (kind === "DELAYED" ? 1 : -1)).toLocaleDateString("en-CA");
  return next < today ? today : next;
}

/** True when the purchase still takes delivery updates from the donor. */
export function canUpdateDelivery(view: PurchaseView): boolean {
  return view.method === "DIRECT_DELIVERY" && !!view.orderedAt && !view.completedAt
    && !view.deliveryOutcome && view.status !== "RECEIPT_CONFIRMED" && view.status !== "CANCELLED" && view.status !== "EXPIRED";
}

const field = "w-full min-h-11 rounded-xl border border-[#C9D0DB] bg-white px-3 py-2 text-[15px] text-stone-900 focus:border-[var(--ck-role-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--ck-role-accent)] dark:border-zinc-700 dark:bg-zinc-950 dark:text-stone-100";
const primary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--ck-role-accent)] px-5 py-2 text-[15px] font-extrabold text-white hover:bg-[var(--ck-role-hover)] disabled:opacity-60";
const chip = "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-bold";

/**
 * "Delivery is delayed" / "Arriving earlier than expected": pick the new date, check
 * the message (the date is filled in, and kept in step if the donor edits around it),
 * send. The recipient gets a notification and the message lands in the chat.
 */
export function DeliveryDateUpdateForm({ view, initialKind, busy, onSend, onCancel }: {
  view: PurchaseView;
  initialKind: DeliveryChange;
  busy: boolean;
  onSend: (d: { kind: DeliveryChange; expectedOn: string; message: string }) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [kind, setKind] = useState<DeliveryChange>(initialKind);
  const [date, setDate] = useState(() => suggestedDate(initialKind, view.expectedDeliveryAt));
  const [message, setMessage] = useState(() => deliveryTemplate(initialKind, suggestedDate(initialKind, view.expectedDeliveryAt)));
  const [edited, setEdited] = useState(false);
  const current = view.expectedDeliveryAt?.slice(0, 10) ?? null;

  function retarget(nextKind: DeliveryChange, nextDate: string) {
    // Untouched: follow the template. Edited: swap only the date the donor kept.
    setMessage(m => (edited ? m.split(deliveryDateLabel(date)).join(deliveryDateLabel(nextDate)) : deliveryTemplate(nextKind, nextDate)));
    setKind(nextKind);
    setDate(nextDate);
  }

  let error: string | null = null;
  if (!date || date < todayIso()) error = "Pick today or a later date.";
  else if (current && kind === "DELAYED" && date <= current) error = `A delay needs a date after ${deliveryDateLabel(current)}.`;
  else if (current && kind === "EARLY" && date >= current) error = `An earlier arrival needs a date before ${deliveryDateLabel(current)}.`;
  else if (message.trim().length < 5) error = "Write a short message for the recipient.";

  return (
    <div className="space-y-3" data-testid="delivery-date-form">
      <div role="radiogroup" aria-label="Delivery date update" className="flex flex-wrap gap-2">
        {([["DELAYED", "Delivery is delayed"], ["EARLY", "Arriving earlier than expected"]] as const).map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k}
            onClick={() => retarget(k, suggestedDate(k, view.expectedDeliveryAt))}
            className={`${chip} ${kind === k ? "border-[var(--ck-role-accent)] bg-[var(--ck-role-soft)] text-[var(--ck-role-accent)]" : "border-stone-300 text-stone-700 dark:border-zinc-700 dark:text-stone-300"}`}>
            {label}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-[14px] font-bold text-stone-900 dark:text-stone-100">New expected date</span>
        <input type="date" className={field} value={date} min={todayIso()} onChange={e => retarget(kind, e.target.value)} />
        {current && <span className="text-[13px] text-stone-500 dark:text-stone-400">Currently expected {deliveryDateLabel(current)}</span>}
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[14px] font-bold text-stone-900 dark:text-stone-100">Message to the recipient</span>
        <textarea rows={3} maxLength={1000} className={field} value={message}
          onChange={e => { setMessage(e.target.value); setEdited(true); }} />
      </label>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primary} disabled={!!error || busy}
          onClick={() => void onSend({ kind, expectedOn: date, message: message.trim() }).then(ok => { if (ok) onCancel?.(); })}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Send update
        </button>
        {onCancel && (
          <button type="button" className="min-h-11 px-3 text-sm font-bold text-stone-600 hover:underline dark:text-stone-300" onClick={onCancel}>Cancel</button>
        )}
      </div>
    </div>
  );
}

/**
 * The donor's side of the delivery step, next to the delivery-proof upload:
 * tell the recipient it shows delivered, or that the date moved.
 */
export function DeliveryActionsPanel({ view, busy, onNotifyDelivered, onUpdateDate }: {
  view: PurchaseView;
  busy: string | null;
  onNotifyDelivered: () => Promise<boolean>;
  onUpdateDate: (d: { kind: DeliveryChange; expectedOn: string; message: string }) => Promise<boolean>;
}) {
  const [form, setForm] = useState<DeliveryChange | null>(null);
  const noticeAt = view.deliveredNoticeAt ? new Date(view.deliveredNoticeAt) : null;
  const canNudge = !noticeAt || Date.now() - noticeAt.getTime() >= 24 * 60 * 60 * 1000;
  return (
    <section className="rounded-[20px] border border-[#E3E7EE] bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
      <h2 className="mb-3 flex items-center gap-2 text-[22px] font-extrabold text-stone-900 dark:text-stone-100">
        <PackageCheck className="size-5 text-[var(--ck-role-accent)]" aria-hidden /> Delivery status
      </h2>
      <div className="space-y-5">
        <div>
          <button type="button" className={primary} disabled={!canNudge || !!busy} onClick={() => void onNotifyDelivered()}>
            {busy === "delivered" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
            It shows Delivered on my end, notify the recipient
          </button>
          <p className="mt-1.5 text-[13px] text-stone-500 dark:text-stone-400">
            {noticeAt
              ? canNudge
                ? `You let the recipient know on ${noticeAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}. You can remind them again.`
                : "Sent. The recipient has been asked to confirm what arrived. You can remind them again after 24 hours."
              : "We'll ask the recipient to confirm what arrived. They decide what counts, so nothing is marked received yet."}
          </p>
        </div>
        <div className="border-t border-stone-100 pt-4 dark:border-zinc-800">
          <p className="mb-2 flex items-center gap-2 text-[15px] font-bold text-stone-900 dark:text-stone-100">
            <CalendarClock className="size-4 text-[var(--ck-role-accent)]" aria-hidden /> Delivery date update
          </p>
          {form ? (
            <DeliveryDateUpdateForm view={view} initialKind={form} busy={busy === "date"} onSend={onUpdateDate} onCancel={() => setForm(null)} />
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={`${chip} border-stone-300 text-stone-700 dark:border-zinc-700 dark:text-stone-300`} onClick={() => setForm("DELAYED")}>Delivery is delayed</button>
              <button type="button" className={`${chip} border-stone-300 text-stone-700 dark:border-zinc-700 dark:text-stone-300`} onClick={() => setForm("EARLY")}>Arriving earlier than expected</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * One chat thread per purchase. Donor and recipient talk here; platform notices
 * ("Donor marked as delivered") appear as system lines and delivery-date updates as
 * cards. No phone number or email is ever shown, and the thread turns read-only
 * once the purchase closes.
 */
export function PurchaseChatPanel({ offerId, view, isDonor, closed, busy, refreshKey, onUpdateDate }: {
  offerId: number;
  view: PurchaseView;
  isDonor: boolean;
  closed: boolean;
  busy: string | null;
  refreshKey: number;
  onUpdateDate: (d: { kind: DeliveryChange; expectedOn: string; message: string }) => Promise<boolean>;
}) {
  const [form, setForm] = useState<DeliveryChange | null>(null);
  const quick = isDonor && !closed && canUpdateDelivery(view);
  return (
    <section className="rounded-[20px] border border-[#E3E7EE] bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="flex items-center gap-2 px-5 pt-5 text-[17px] font-extrabold text-stone-900 dark:text-stone-100 sm:px-6">
        <MessageSquare className="size-4 text-[var(--ck-role-accent)]" aria-hidden /> Chat with the {isDonor ? "recipient" : "donor"}
      </h2>
      <p className="px-5 pb-2 text-[13px] text-stone-500 dark:text-stone-400 sm:px-6">
        Keep it to this delivery. Never share phone numbers or payment details here; our team can read this chat.
      </p>
      <ChatWindow embedded offerId={offerId} currentUserEmail="" locked={closed} refreshKey={refreshKey}
        className="h-[420px] border-t border-stone-100 dark:border-zinc-800"
        emptyText={isDonor ? "No messages yet. Say hello, or send a delivery update." : "No messages yet."}
        lockedText="This purchase is closed, so the chat is read-only. Our team follows up on anything still open."
        quickActions={quick ? (form
          ? <DeliveryDateUpdateForm view={view} initialKind={form} busy={busy === "date"} onSend={onUpdateDate} onCancel={() => setForm(null)} />
          : (
            <div className="flex flex-wrap gap-2" aria-label="Quick actions">
              <button type="button" className={`${chip} border-stone-300 text-stone-700 dark:border-zinc-700 dark:text-stone-300`} onClick={() => setForm("DELAYED")}>Delivery is delayed</button>
              <button type="button" className={`${chip} border-stone-300 text-stone-700 dark:border-zinc-700 dark:text-stone-300`} onClick={() => setForm("EARLY")}>Arriving earlier</button>
            </div>
          )) : undefined} />
    </section>
  );
}
