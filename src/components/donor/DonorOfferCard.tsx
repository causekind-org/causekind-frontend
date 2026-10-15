"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { Check, ShoppingBag, Truck } from "lucide-react";
import Link from "@/components/AppLink";
import { OfferJourneyDrawer } from "@/components/OfferJourney";
import type { DonationOffer } from "@/lib/api";
import { purchaseTimelineLabel } from "@/features/donation-offer-wizard/offerModel";

/**
 * One request offer on the donor dashboard (redesign approved 2026-10-15,
 * canvas "Donor Offer Card") — the donor-side twin of `DoneeOfferCard`.
 *
 * <p>Photo / what was offered / a decision panel, stacking on a phone. Four
 * plain stages; the full seven-step journey opens from "See every step".
 * Exactly one "no" control while reconfirming, and a purchase offer is asked
 * "Still planning to buy it?" — never whether an item it has not bought yet
 * "is still available".
 */

type Stage = { label: string; statuses: string[] };

const BASE: Stage[] = [
  { label: "Recipient reviews", statuses: ["DRAFT", "SUBMITTED", "AI_ELIGIBILITY_SCREENING", "AI_COMPATIBILITY_SCREENING", "COMPATIBILITY_CHECKED", "NEEDS_INFORMATION", "SOFT_RESERVED_PRIMARY", "SOFT_RESERVED_BACKUP", "PENDING_DONEE_REVIEW"] },
  { label: "You reconfirm", statuses: ["DONEE_ACCEPTED", "DONOR_RECONFIRMATION_REQUIRED", "CONDITION_CHANGED_RESCREENING"] },
  { label: "Team approves", statuses: ["DONOR_RECONFIRMED", "PENDING_ADMIN_APPROVAL"] },
  { label: "Handover", statuses: ["ADMIN_APPROVED", "HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK", "ISSUE_WINDOW_OPEN", "ISSUE_RAISED", "COMPLETED"] },
];

function stagesFor(offer: DonationOffer): Stage[] {
  if (offer.flowType !== "WILL_PURCHASE") return BASE;
  const direct = offer.purchaseCommitment?.fulfilmentMethod === "DIRECT_DELIVERY";
  return BASE.map((s, i) => i === 3 ? { ...s, label: direct ? "You buy & it's delivered" : "You buy & hand over" } : s);
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-[#FBF7F3] px-3.5 py-3 dark:bg-zinc-800/70">
      <dt className="text-[12px] font-bold uppercase tracking-[0.04em] text-[#6B5E55] dark:text-stone-400">{label}</dt>
      <dd className="mt-1 break-words text-[15px] font-bold text-[#1F1A17] dark:text-stone-100">{value}</dd>
    </div>
  );
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  const day = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return days > 0 ? `${day} · ${days} day${days === 1 ? "" : "s"} left` : day;
}

export function DonorOfferCard({
  offer, statusLabel, needsYou, explanation, actionHref, actionLabel, busy, onReconfirm, noButton, exit, extra,
}: {
  offer: DonationOffer;
  statusLabel: string;
  /** The donor has to act now — amber "your turn" pill. */
  needsYou: boolean;
  /** What happens next, for states without a decision to make. */
  explanation?: string;
  actionHref?: string | null;
  actionLabel?: string;
  busy?: boolean;
  onReconfirm: () => void;
  /** The single "no" control while reconfirming (opens the cancellation dialog). */
  noButton?: ReactNode;
  /** Withdraw/cancel when not reconfirming. */
  exit?: ReactNode;
  /** Anything state-specific below the actions (e.g. withdraw a reported issue). */
  extra?: ReactNode;
}) {
  const purchase = offer.flowType === "WILL_PURCHASE";
  const plan = offer.purchaseCommitment;
  const direct = plan?.fulfilmentMethod === "DIRECT_DELIVERY";
  const reconfirm = offer.status === "DONOR_RECONFIRMATION_REQUIRED" || offer.status === "DONEE_ACCEPTED";
  const stages = stagesFor(offer);
  const found = stages.findIndex(s => s.statuses.includes(offer.status));
  const idx = found < 0 ? 0 : found;
  const photo = offer.media?.find(m => m.mediaType === "IMAGE");
  const photoCount = offer.media?.filter(m => m.mediaType === "IMAGE").length ?? 0;
  const qty = offer.itemDetails?.quantity;
  // Purchase offers live on the purchase page once accepted, not the handover hub.
  const href = purchase && plan?.acceptedAt && !reconfirm ? `/offers/${offer.id}/purchase` : actionHref;
  const label = purchase && plan?.acceptedAt && !reconfirm ? "Open purchase" : actionLabel;
  const pillText = reconfirm ? "Your turn: reconfirm" : needsYou ? `Your turn: ${statusLabel.toLowerCase()}` : statusLabel;

  return (
    <article className="grid grid-cols-1 gap-5 rounded-2xl border border-[#EADFD6] bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6 lg:grid-cols-[132px_minmax(0,1fr)_280px] lg:gap-7"
      style={{ fontFamily: "var(--font-nunito), system-ui, sans-serif" }}>
      {/* Photo — or, for a purchase, an honest "not bought yet" tile */}
      <div className="flex items-start gap-4 lg:flex-col lg:items-center lg:gap-2">
        {purchase ? (
          <div aria-hidden className="flex size-22 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#E0A985] bg-[#FBE7DA] text-[var(--ck-role-accent)] lg:size-33 lg:gap-2 lg:rounded-[14px]">
            <ShoppingBag className="size-7 lg:size-10" strokeWidth={1.6} />
            <span className="text-[10px] font-bold lg:text-[12px]">Not bought yet</span>
          </div>
        ) : photo ? (
          <div className="relative size-22 shrink-0 overflow-hidden rounded-xl border border-[#EADFD6] bg-[#F4EEE9] lg:size-33 lg:rounded-[14px]">
            <Image src={photo.mediaUrl} alt="Your photo of the item" fill sizes="132px" className="object-cover" />
          </div>
        ) : (
          <div aria-hidden className="size-22 shrink-0 rounded-xl bg-[#F4EEE9] dark:bg-zinc-800 lg:size-33 lg:rounded-[14px]" />
        )}
        {!purchase && photoCount > 1 && <span className="hidden text-[12px] text-[#6B5E55] lg:block">{photoCount} photos</span>}

        <div className="min-w-0 space-y-1.5 lg:hidden">
          <Pills text={pillText} needsYou={needsYou} purchase={purchase} direct={direct} />
          <h3 className="break-words text-[22px] font-extrabold leading-tight text-[#1F1A17] dark:text-stone-100">{offer.requestTitle}</h3>
          <p className="text-[13px] text-[#6B5E55] dark:text-stone-400">{[offer.requestCategory, offer.requestCity].filter(Boolean).join(" · ")}</p>
        </div>
      </div>

      {/* What was offered */}
      <div className="min-w-0 space-y-4">
        <div className="hidden space-y-3 lg:block">
          <Pills text={pillText} needsYou={needsYou} purchase={purchase} direct={direct} />
          <div>
            <h3 className="mb-1.5 break-words text-[26px] font-extrabold leading-[1.2] text-[#1F1A17] dark:text-stone-100">{offer.requestTitle}</h3>
            {reconfirm && (
              <p className="text-[15px] text-[#4A4039] dark:text-stone-300">
                {purchase
                  ? "The recipient said yes to your plan. Confirm you're still going to buy it so our team can approve."
                  : "The recipient accepted your offer. Check the item is still available and in the same condition."}
              </p>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Fact label="For" value={[offer.requestCategory, offer.requestCity].filter(Boolean).join(" · ") || "—"} />
          {purchase ? (
            <>
              <Fact label="You'll buy" value={[qty, [plan?.proposedBrand, plan?.proposedModel].filter(Boolean).join(" ") || "Brand not decided"].filter(v => v != null && v !== "").join(" · ")} />
              <Fact label={direct ? "Order by" : "Buy by"} value={plan?.purchaseDeadline
                ? shortDate(plan.purchaseDeadline)
                : plan ? `${purchaseTimelineLabel(plan.purchaseTimeline)} of acceptance` : "—"} />
            </>
          ) : (
            <>
              <Fact label="You offered" value={[qty, offer.itemDetails?.condition].filter(v => v != null && v !== "").join(" · ") || "—"} />
              {(offer.itemDetails?.pickupLocality || offer.itemDetails?.pickupCity) && (
                <Fact label="Pickup from" value={[offer.itemDetails?.pickupLocality, offer.itemDetails?.pickupCity].filter(Boolean).join(", ")} />
              )}
            </>
          )}
        </dl>

        <nav aria-label="Where this offer is" className="space-y-2">
          <ol className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {stages.map((s, i) => (
              <li key={s.label} aria-current={i === idx ? "step" : undefined} className="flex min-w-0 flex-col gap-2">
                <span aria-hidden className={`h-1.5 rounded-full ${i <= idx ? "bg-[var(--ck-role-accent)]" : "bg-[#EADFD6] dark:bg-zinc-700"}`} />
                <span className={`hidden items-center gap-1 text-[13px] sm:flex ${i === idx ? "font-extrabold text-[var(--ck-role-accent)]" : i < idx ? "font-bold text-[#1F1A17] dark:text-stone-200" : "font-semibold text-[#6B5E55] dark:text-stone-400"}`}>
                  {i < idx && <Check className="size-3.5 shrink-0 text-green-700" strokeWidth={2.5} aria-hidden />}
                  {s.label}{i === idx && needsYou ? " · now" : ""}
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-x-3">
            <p className="text-[13px] font-extrabold text-[var(--ck-role-accent)] sm:hidden">Step {idx + 1} of 4 · {stages[idx].label}</p>
            <OfferJourneyDrawer status={offer.status} role="donor">
              <button type="button" className="inline-flex min-h-11 items-center text-[14px] font-bold text-[var(--ck-role-accent)] hover:underline">
                See every step
              </button>
            </OfferJourneyDrawer>
          </div>
        </nav>
      </div>

      {/* Decision panel */}
      <aside aria-label={reconfirm ? "Your decision" : "What's next"}
        className="flex flex-col gap-3 rounded-2xl border border-[#EADFD6] bg-[#FBF7F3] p-4 dark:border-zinc-700 dark:bg-zinc-800/60 sm:p-5">
        <p className="text-[15px] font-extrabold text-[#1F1A17] dark:text-stone-100">
          {reconfirm ? (purchase ? "Still planning to buy it?" : "Is it still available?") : "What's next"}
        </p>
        <p className="text-[13px] leading-relaxed text-[#4A4039] dark:text-stone-300">
          {reconfirm
            ? purchase
              ? <>Don&apos;t buy yet — wait until our team approves and the offer shows <strong>Ready to buy</strong>.</>
              : "Once you confirm, our team approves and you plan the handover together."
            : explanation}
        </p>
        {reconfirm && (
          <>
            <button type="button" onClick={onReconfirm} disabled={busy}
              className="min-h-12 rounded-xl bg-[var(--ck-role-accent)] text-[16px] font-extrabold text-white transition-colors hover:bg-[var(--ck-role-hover)] disabled:opacity-60">
              {purchase ? "Yes, I'll buy it" : "Yes, still available"}
            </button>
            {noButton}
            <p className="text-center text-[12px] text-[#6B5E55] dark:text-stone-400">
              Saying {purchase ? "you can't" : "it isn't"} withdraws the offer so another donor can help.
            </p>
          </>
        )}
        {!reconfirm && href && label && (
          <Link href={href}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--ck-role-accent)] px-4 text-[15px] font-extrabold text-white hover:bg-[var(--ck-role-hover)]">
            {label}
          </Link>
        )}
        {!reconfirm && exit}
        {extra}
      </aside>
    </article>
  );
}

function Pills({ text, needsYou, purchase, direct }: { text: string; needsYou: boolean; purchase: boolean; direct: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`rounded-full px-2.5 py-1 text-[13px] font-bold ${needsYou ? "bg-[#FFF3E0] text-[#8A4B00]" : "bg-[#F4EEE9] text-[#4A4039] dark:bg-zinc-800 dark:text-stone-300"}`}>
        {text}
      </span>
      {purchase ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FBE7DA] px-2.5 py-1 text-[13px] font-bold text-[var(--ck-role-accent)]">
          {direct ? <Truck className="size-3.5" aria-hidden /> : <ShoppingBag className="size-3.5" aria-hidden />}
          Promise to buy · {direct ? "Deliver directly" : "Hand over"}
        </span>
      ) : (
        <span className="rounded-full bg-[#F4EEE9] px-2.5 py-1 text-[13px] font-bold text-[#4A4039] dark:bg-zinc-800 dark:text-stone-300">Item you own</span>
      )}
    </div>
  );
}
