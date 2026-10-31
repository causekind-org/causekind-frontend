"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { Check, ExternalLink, ShoppingBag, Truck } from "lucide-react";
import Link from "@/components/AppLink";
import { OfferJourneyDrawer } from "@/components/OfferJourney";
import type { DonationOffer } from "@/lib/api";
import { purchaseTimelineLabel } from "@/features/donation-offer-wizard/offerModel";

import { UiText, useUiText } from "@/components/UiText";
import { useTranslations } from "next-intl";
/**
 * One donation offer on the donee dashboard (redesign approved 2026-10-15,
 * canvas "Donation Offers Card").
 *
 * <p>Three columns on desktop — photo, what is offered, and a decision panel —
 * stacking to one column on a phone. Progress is four plain stages instead of
 * the seven-dot rail; the full seven-step journey still opens from "See every
 * step". Exactly one decline control while the offer awaits review.
 *
 * <p>Purchase offers ("promise to buy") show what the donor plans to buy and how
 * it will arrive, never a condition: the item does not exist yet.
 */

type Stage = { label: string; statuses: string[] };

const OWNED_STAGES: Stage[] = [
  { label: "You review", statuses: ["SUBMITTED", "AI_ELIGIBILITY_SCREENING", "AI_COMPATIBILITY_SCREENING", "COMPATIBILITY_CHECKED", "NEEDS_INFORMATION", "SOFT_RESERVED_PRIMARY", "SOFT_RESERVED_BACKUP", "PENDING_DONEE_REVIEW"] },
  { label: "Team approves", statuses: ["DONEE_ACCEPTED", "DONOR_RECONFIRMATION_REQUIRED", "DONOR_RECONFIRMED", "CONDITION_CHANGED_RESCREENING", "PENDING_ADMIN_APPROVAL"] },
  { label: "Plan handover", statuses: ["ADMIN_APPROVED", "HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK"] },
  { label: "You receive it", statuses: ["ISSUE_WINDOW_OPEN", "ISSUE_RAISED", "COMPLETED"] },
];

function stagesFor(offer: DonationOffer): Stage[] {
  if (offer.flowType !== "WILL_PURCHASE") return OWNED_STAGES;
  const direct = offer.purchaseCommitment?.fulfilmentMethod === "DIRECT_DELIVERY";
  const labels = direct
    ? ["You review", "Share address", "Donor orders", "You confirm it arrived"]
    : ["You review", "Team approves", "Donor buys it", "You receive it"];
  return OWNED_STAGES.map((s, i) => ({ ...s, label: labels[i] }));
}

/** One sentence: what happens after the stage the offer is on. */
function nextSentence(offer: DonationOffer, idx: number): string {
  const purchase = offer.flowType === "WILL_PURCHASE";
  const direct = offer.purchaseCommitment?.fulfilmentMethod === "DIRECT_DELIVERY";
  if (offer.status === "NEEDS_INFORMATION") return "The donor is adding details our team asked for.";
  if (offer.status === "ISSUE_RAISED") return "Our team is reviewing the problem you reported.";
  switch (idx) {
    case 0:
      return purchase
        ? direct
          ? "If you accept, you'll be asked for a delivery address to share with this donor only. It's prepaid — you pay nothing on delivery."
          : "If you accept, our team checks the offer. Then the donor buys it and you plan the handover."
        : "If you accept, our team checks the offer. Then you and the donor plan the handover.";
    case 1:
      return purchase && direct
        ? "Share your delivery address on the purchase page so the donor can order."
        : "Our team is checking the offer. You'll hear from us when it's approved.";
    case 2:
      return purchase
        ? direct ? "The donor is ordering. Track it on the purchase page." : "The donor is buying the item. You'll plan the handover once it's ready."
        : "Plan the handover with the donor.";
    default:
      return purchase && direct
        ? "Confirm what arrived, or report a problem."
        : "Check the item. Tell us if anything is wrong.";
  }
}

type OfferedT = (key: "offeredJustNow" | "offeredMinutesAgo" | "offeredHoursAgo" | "offeredDaysAgo", values?: { count: number }) => string;
function timeAgo(iso: string | null | undefined, t: OfferedT): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  const mins = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (mins < 60) return mins <= 1 ? t("offeredJustNow") : t("offeredMinutesAgo", { count: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t("offeredHoursAgo", { count: hours });
  return t("offeredDaysAgo", { count: Math.round(hours / 24) });
}

function Fact({ label, value, wide = false }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div className={`rounded-xl bg-stone-50 px-3.5 py-3 dark:bg-zinc-800/70 ${wide ? "col-span-2 sm:col-span-1" : ""}`}>
      <dt className="text-3xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-bold text-stone-900 dark:text-stone-100">{value}</dd>
    </div>
  );
}

export function DoneeOfferCard({
  offer, statusLabel, statusClassName, busy, onAccept, onDecline, actions,
}: {
  offer: DonationOffer;
  statusLabel: string;
  /** Tailwind colour classes for the status pill (amber = needs you, green = good, …). */
  statusClassName: string;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  /** State-specific actions below the main one: issue window, report, cancel. */
  actions?: ReactNode;
}) {
  const ui = useUiText();
  const dt = useTranslations("dashFlow");
  const st = useDoneeStageText();
  const purchase = offer.flowType === "WILL_PURCHASE";
  const commitment = offer.purchaseCommitment;
  const direct = commitment?.fulfilmentMethod === "DIRECT_DELIVERY";
  const pending = offer.status === "PENDING_DONEE_REVIEW";
  const stages = stagesFor(offer);
  const found = stages.findIndex(s => s.statuses.includes(offer.status));
  const idx = found < 0 ? 0 : found;
  const photos = offer.media?.filter(m => m.mediaType === "IMAGE") ?? [];
  const qty = offer.itemDetails?.quantity;
  const quantity = offer.receivedQuantity != null && qty != null
    ? dt("receivedXOfY", { x: offer.receivedQuantity, y: qty })
    : qty != null ? dt("qtyOfYouNeed", { qty, needed: offer.requestQuantity ?? "" }) : null;
  const compat =
    offer.compatibilityIndicator === "STRONG_MATCH" ? ui("Strong match") :
    offer.compatibilityIndicator === "POSSIBLE_MATCH" ? ui("Possible match") : null;
  const defects = offer.itemDetails?.knownDefects;
  const hasDefects = !!defects && defects.trim() !== "" && defects.trim().toLowerCase() !== "none";
  const offered = timeAgo(offer.submittedAt ?? offer.createdAt, (k, v) => dt(k, v));

  const primary =
    purchase && commitment?.acceptedAt && !pending
      ? { href: `/offers/${offer.id}/purchase`, label: ui("Open purchase") }
      : !purchase && ["ADMIN_APPROVED", "HANDOVER_IN_PROGRESS", "HANDOVER_AT_RISK"].includes(offer.status)
        ? { href: `/offers/${offer.id}/handover`, label: ui("Open handover") }
        : null;

  return (
    <article className="grid grid-cols-1 gap-5 rounded-2xl border border-stone-200 p-4 dark:border-zinc-800 sm:p-6 lg:grid-cols-[132px_minmax(0,1fr)_260px] lg:gap-7">
      {/* Photo — or, for a purchase, an honest "not bought yet" tile */}
      <div className="flex items-start gap-4 lg:flex-col lg:items-center lg:gap-2">
        {purchase ? (
          <div aria-hidden className="flex size-22 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--ck-role-accent)]/40 bg-[var(--ck-role-soft)] text-[var(--ck-role-accent)] lg:size-33 lg:rounded-2xl">
            <ShoppingBag className="size-7 lg:size-10" strokeWidth={1.6} />
            <span className="text-3xs font-bold"><UiText>Not bought yet</UiText></span>
          </div>
        ) : photos[0] ? (
          <Link href={`/donee/offers?offerId=${offer.id}`} aria-label={dt("seeDonorPhotos", { count: photos.length })}
            className="relative block size-22 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100 dark:border-zinc-700 dark:bg-zinc-800 lg:size-33 lg:rounded-2xl">
            <Image src={photos[0].mediaUrl} alt="" fill sizes="132px" className="object-cover" />
          </Link>
        ) : (
          <div aria-hidden className="size-22 shrink-0 rounded-xl bg-stone-100 dark:bg-zinc-800 lg:size-33 lg:rounded-2xl" />
        )}
        {!purchase && photos.length > 1 && (
          <span className="hidden text-xs text-stone-500 dark:text-stone-400 lg:block">{dt("photosCount", { count: photos.length })}</span>
        )}

        {/* On a phone the title sits beside the photo */}
        <div className="min-w-0 space-y-1.5 lg:hidden">
          <StatusRow statusLabel={statusLabel} statusClassName={statusClassName} compat={compat} purchase={purchase} direct={direct} />
          <h3 className="break-words text-xl font-extrabold leading-tight text-stone-900 dark:text-stone-100">{offer.requestTitle}</h3>
          {offered && <p className="text-xs text-stone-500 dark:text-stone-400">{offered}</p>}
        </div>
      </div>

      {/* What is offered */}
      <div className="min-w-0 space-y-4">
        <div className="hidden space-y-3 lg:block">
          <div className="flex flex-wrap items-center gap-2">
            <StatusRow statusLabel={statusLabel} statusClassName={statusClassName} compat={compat} purchase={purchase} direct={direct} />
            {offered && <span className="text-xs text-stone-500 dark:text-stone-400">{offered}</span>}
          </div>
          <div>
            <h3 className="mb-1.5 break-words text-2xl font-extrabold leading-tight text-stone-900 dark:text-stone-100">{offer.requestTitle}</h3>
            <p className="text-sm text-stone-600 dark:text-stone-300">
              {purchase
                ? direct
                  ? ui("A donor will buy a new one for you and have it shipped straight to your address.")
                  : ui("A donor will buy a new one for you and hand it over in person.")
                : ui("A donor has an item they already own and is ready to give it to you.")}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {purchase ? (
            <>
              <Fact label={ui("They plan to buy")} value={[commitment?.proposedBrand, commitment?.proposedModel].filter(Boolean).join(" ") || "Brand not decided"} wide />
              {quantity && <Fact label={ui("Quantity")} value={quantity} />}
              <Fact label={direct ? ui("Ordered within") : ui("Bought within")}
                value={commitment ? `${purchaseTimelineLabel(commitment.purchaseTimeline).replace(/^Within /, "")} of your yes` : "—"} />
            </>
          ) : (
            <>
              {quantity && <Fact label={ui("Quantity")} value={quantity} />}
              <Fact label={ui("Condition")} value={offer.itemDetails?.condition ?? "Not given"} />
              {offer.itemDetails?.pickupCity && <Fact label={ui("Donor is in")} value={offer.itemDetails.pickupCity} wide />}
            </>
          )}
        </dl>

        {!purchase && pending && (hasDefects || offer.itemDetails?.accessoriesIncluded) && (
          <div className="space-y-1 text-xs text-stone-600 dark:text-stone-300">
            {hasDefects && <p className="font-semibold text-amber-800 dark:text-amber-300"><UiText>Disclosed defects:</UiText> {defects}</p>}
            {offer.itemDetails?.accessoriesIncluded && <p><UiText>Comes with:</UiText> {offer.itemDetails.accessoriesIncluded}</p>}
          </div>
        )}

        {purchase && commitment?.productUrl && /^https?:\/\//i.test(commitment.productUrl) && (
          <a href={commitment.productUrl} target="_blank" rel="noopener noreferrer nofollow"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-[var(--ck-role-accent)] hover:underline">
            <ExternalLink className="size-4" aria-hidden /> <UiText>View the product they chose</UiText>
          </a>
        )}

        {/* Four plain stages; the full seven-step journey opens from the link */}
        <nav aria-label={ui("Where this offer is")} className="space-y-2">
          <ol className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {stages.map((s, i) => (
              <li key={s.label} aria-current={i === idx ? "step" : undefined} className="flex min-w-0 flex-col gap-2">
                <span aria-hidden className={`h-1.5 rounded-full ${i <= idx ? "bg-[var(--ck-role-accent)]" : "bg-stone-200 dark:bg-zinc-700"}`} />
                <span className={`hidden text-xs sm:block ${i === idx ? "font-extrabold text-[var(--ck-role-accent)]" : i < idx ? "font-semibold text-stone-700 dark:text-stone-300" : "font-semibold text-stone-500 dark:text-stone-400"}`}>
                  {i + 1} · {st(s.label)}
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-x-3">
            <p className="text-xs font-extrabold text-[var(--ck-role-accent)] sm:hidden">{dt("stepOfFour", { n: idx + 1 })} · {st(stages[idx].label)}</p>
            <OfferJourneyDrawer status={offer.status} role="donee">
              <button type="button" className="inline-flex min-h-11 items-center text-sm font-bold text-[var(--ck-role-accent)] hover:underline">
                <UiText>See every step</UiText>
              </button>
            </OfferJourneyDrawer>
          </div>
        </nav>
      </div>

      {/* Decision panel */}
      <aside aria-label={pending ? ui("Your decision") : ui("What's next")}
        className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/60 sm:p-5">
        <p className="text-sm font-extrabold text-stone-900 dark:text-stone-100">{pending ? ui("Does this suit you?") : ui("What's next")}</p>
        <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">{st(nextSentence(offer, idx))}</p>
        {pending && (
          <>
            {purchase && <p className="text-xs font-semibold text-amber-800 dark:text-amber-300"><UiText>Please respond within 3 days.</UiText></p>}
            <button type="button" onClick={onAccept} disabled={busy}
              className="min-h-12 rounded-xl bg-[var(--ck-role-accent)] text-base font-extrabold text-white transition-colors hover:bg-[var(--ck-role-hover)] disabled:opacity-60">
              {busy ? ui("Saving…") : ui("Accept offer")}
            </button>
            <button type="button" onClick={onDecline} disabled={busy}
              className="min-h-12 rounded-xl border border-stone-300 bg-white text-sm font-bold text-stone-800 transition-colors hover:bg-stone-100 disabled:opacity-60 dark:border-zinc-600 dark:bg-transparent dark:text-stone-200 dark:hover:bg-zinc-700">
              <UiText>Decline</UiText>
            </button>
            <Link href={`/donee/offers?offerId=${offer.id}`} className="inline-flex min-h-11 items-center justify-center text-sm font-bold text-[var(--ck-role-accent)] hover:underline">
              <UiText>View full offer details</UiText>
            </Link>
          </>
        )}
        {primary && (
          <Link href={primary.href}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--ck-role-accent)] text-sm font-extrabold text-white hover:bg-[var(--ck-role-hover)]">
            {primary.label}
          </Link>
        )}
        {actions}
      </aside>
    </article>
  );
}

function StatusRow({ statusLabel, statusClassName, compat, purchase, direct }: {
  statusLabel: string; statusClassName: string; compat: string | null; purchase: boolean; direct: boolean;
}) {
  const ui = useUiText();
  const dt = useTranslations("dashFlow");
  const st = useDoneeStageText();
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusClassName}`}>{statusLabel}</span>
      {purchase ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ck-role-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--ck-role-accent)]">
          {direct ? <Truck className="size-3.5" aria-hidden /> : <ShoppingBag className="size-3.5" aria-hidden />}
          <UiText>Promise to buy</UiText> · {direct ? ui("Delivered to you") : ui("Handed over in person")}
        </span>
      ) : compat && (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-800 dark:bg-green-950/40 dark:text-green-300">
          <Check className="size-3.5" aria-hidden strokeWidth={2.5} /> {compat}
        </span>
      )}
    </div>
  );
}


/** Display text for the English stage labels and next-step sentences above. */
function useDoneeStageText(): (text: string) => string {
  const ui = useUiText();
  const map = new Map<string, string>([
    ["You review", ui("You review")],
    ["Team approves", ui("Team approves")],
    ["Plan handover", ui("Plan handover")],
    ["You receive it", ui("You receive it")],
    ["Share address", ui("Share address")],
    ["Donor orders", ui("Donor orders")],
    ["You confirm it arrived", ui("You confirm it arrived")],
    ["Donor buys it", ui("Donor buys it")],
    ["The donor is adding details our team asked for.", ui("The donor is adding details our team asked for.")],
    ["Our team is reviewing the problem you reported.", ui("Our team is reviewing the problem you reported.")],
    ["If you accept, you'll be asked for a delivery address to share with this donor only. It's prepaid — you pay nothing on delivery.", ui("If you accept, you'll be asked for a delivery address to share with this donor only. It's prepaid — you pay nothing on delivery.")],
    ["If you accept, our team checks the offer. Then the donor buys it and you plan the handover.", ui("If you accept, our team checks the offer. Then the donor buys it and you plan the handover.")],
    ["If you accept, our team checks the offer. Then you and the donor plan the handover.", ui("If you accept, our team checks the offer. Then you and the donor plan the handover.")],
    ["Share your delivery address on the purchase page so the donor can order.", ui("Share your delivery address on the purchase page so the donor can order.")],
    ["Our team is checking the offer. You'll hear from us when it's approved.", ui("Our team is checking the offer. You'll hear from us when it's approved.")],
    ["The donor is ordering. Track it on the purchase page.", ui("The donor is ordering. Track it on the purchase page.")],
    ["The donor is buying the item. You'll plan the handover once it's ready.", ui("The donor is buying the item. You'll plan the handover once it's ready.")],
    ["Plan the handover with the donor.", ui("Plan the handover with the donor.")],
    ["Confirm what arrived, or report a problem.", ui("Confirm what arrived, or report a problem.")],
    ["Check the item. Tell us if anything is wrong.", ui("Check the item. Tell us if anything is wrong.")],
  ]);
  return (text) => map.get(text) ?? text;
}
