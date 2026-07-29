/**
 * The two adapters. Each maps ONE backend into the shared view model.
 *
 * <p>They are separate on purpose. The offer flow and match flow have different
 * entities, different endpoints, different method vocabularies and — critically —
 * different completion semantics. Merging them would mean either lying to one set
 * of users about what happens next, or carrying a `flow` conditional through every
 * component. Normalizing at the edge keeps the conditional in exactly two files.
 */

import type { DonationOffer, HandoverRecord, ItemMatch } from "@/lib/api";
import {
  resolveHandoverState, resolveRole,
  type HandoverMethodOption, type HandoverRole, type HandoverViewModel,
} from "./model";

const MAX_RESCHEDULES = 2;

/**
 * OFFER methods. CAUSEKIND_LOGISTICS is intentionally absent: old records may still
 * carry it and must display correctly (see methodLabel below), but it must never be
 * re-offered as a choice — CauseKind operates no logistics service.
 */
export const OFFER_METHODS: HandoverMethodOption[] = [
  { value: "PICKUP",   label: "Recipient picks up", hint: "They come to you." },
  { value: "DROP_OFF", label: "You deliver",        hint: "You take it to them." },
  { value: "COURIER",  label: "Courier",            hint: "A courier moves it between you." },
];

export const MATCH_METHODS: HandoverMethodOption[] = [
  { value: "IN_PERSON",   label: "In person",  hint: "You meet and hand it over." },
  { value: "COURIER",     label: "Courier",    hint: "A courier moves it between you." },
  { value: "THIRD_PARTY", label: "Third party", hint: "Someone else carries it for you." },
];

/** Human label for any stored method value, including retired ones. */
function methodLabel(value: string | null, options: HandoverMethodOption[]): string | null {
  if (!value) return null;
  const known = options.find((o) => o.value === value);
  if (known) return known.label;
  if (value === "CAUSEKIND_LOGISTICS") return "CauseKind logistics (no longer offered)";
  return value.replace(/_/g, " ").toLowerCase();
}

/** Courier and third-party handovers need extra fields; in-person ones don't. */
export function methodNeedsCourierFields(method: string): boolean {
  return method === "COURIER" || method === "THIRD_PARTY";
}

// ── OFFER ───────────────────────────────────────────────────────────────────

export function adaptOffer(
  offer: DonationOffer,
  handover: HandoverRecord | null,
  userEmail: string | null | undefined,
): HandoverViewModel | null {
  // viewerRole is computed server-side from participation. If the server didn't
  // say, we do NOT guess — an unresolved viewer gets the authorization screen.
  const role = normaliseViewerRole(offer.viewerRole);
  if (!role) return null;

  const confirmation = handover?.confirmation ?? null;
  const donorConfirmedAt = confirmation?.donorConfirmedAt ?? null;
  const doneeConfirmedAt = confirmation?.doneeConfirmedAt ?? null;

  const state = resolveHandoverState({
    flow: "OFFER",
    status: offer.status,
    hasSchedule: handover != null && handover.scheduledDateTime != null,
    atRisk: handover?.atRisk ?? false,
    donorConfirmedAt,
    doneeConfirmedAt,
  });

  return {
    flow: "OFFER",
    id: offer.id,
    role,
    state,
    rawStatus: offer.status,
    title: offer.requestTitle,
    imageUrl: offer.media?.[0]?.mediaUrl ?? null,
    transactionCode: `CK-${String(offer.id).padStart(5, "0")}`,
    counterpart: role === "DONOR"
      ? { name: offer.doneeName, phone: offer.doneePhone }
      : { name: offer.donorName, phone: offer.donorPhone },
    donorAllowsDoneeCall: offer.donorAllowsDoneeCall,
    schedule: handover
      ? {
          method: handover.method,
          methodLabel: methodLabel(handover.method, OFFER_METHODS),
          scheduledAt: handover.scheduledDateTime,
          address: handover.locationAddress,
          latitude: handover.locationLatitude,
          longitude: handover.locationLongitude,
          notes: null,
          rescheduleCount: handover.rescheduleCount,
          maxReschedules: MAX_RESCHEDULES,
          atRisk: handover.atRisk,
        }
      : null,
    confirmation: {
      donorConfirmedAt,
      donorConfirmedQty: confirmation?.donorConfirmedQty ?? null,
      doneeConfirmedAt,
      doneeConfirmedQty: confirmation?.doneeConfirmedQty ?? null,
      conditionRating: confirmation?.doneeConditionRating ?? null,
      partlyConfirmed: (donorConfirmedAt != null) !== (doneeConfirmedAt != null),
    },
    methodOptions: OFFER_METHODS,
    certificateCode: null,
    // Only donors get a giving certificate. A recipient must never be shown one.
    certificateHref: role === "DONOR" && offer.status === "COMPLETED"
      ? `/certificate?offerId=${offer.id}` : null,
    closed: state === "completed" || state === "cancelled_or_failed",
  };
}

// ── MATCH ───────────────────────────────────────────────────────────────────

export function adaptMatch(
  match: ItemMatch,
  userEmail: string | null | undefined,
): HandoverViewModel | null {
  // MatchResponse does carry participant emails, so role comes from comparing them
  // — still participation, never the account's own role.
  const role = resolveRole(userEmail, match.donorEmail, match.doneeEmail);
  if (!role) return null;

  const state = resolveHandoverState({
    flow: "MATCH",
    status: match.status,
    hasSchedule: match.handoverMethod != null,
    atRisk: match.logisticsAtRisk,
    donorConfirmedAt: match.donorConfirmedAt,
    doneeConfirmedAt: match.doneeConfirmedAt,
  });

  const title = match.listingTitle || match.requestTitle || "Item";

  return {
    flow: "MATCH",
    id: match.id,
    role,
    state,
    rawStatus: match.status,
    title,
    imageUrl: match.donorImages?.[0] ?? match.listingImageUrl ?? null,
    transactionCode: `CK-M${String(match.id).padStart(5, "0")}`,
    counterpart: role === "DONOR"
      ? { name: match.doneeName, phone: match.doneeContact }
      : { name: match.donorName, phone: match.donorContact },
    donorAllowsDoneeCall: match.donorAllowsDoneeCall,
    schedule: match.handoverMethod
      ? {
          method: match.handoverMethod,
          methodLabel: methodLabel(match.handoverMethod, MATCH_METHODS),
          scheduledAt: match.pickupDateTime,
          address: match.handoverAddress,
          latitude: match.handoverLatitude,
          longitude: match.handoverLongitude,
          notes: match.fulfilmentNotes,
          rescheduleCount: match.logisticsRescheduleCount ?? 0,
          maxReschedules: MAX_RESCHEDULES,
          atRisk: match.logisticsAtRisk,
        }
      : null,
    confirmation: {
      donorConfirmedAt: match.donorConfirmedAt,
      donorConfirmedQty: match.donorConfirmedQty,
      doneeConfirmedAt: match.doneeConfirmedAt,
      doneeConfirmedQty: match.doneeConfirmedQty,
      conditionRating: match.doneeConditionRating,
      // Server-computed. Trusted over a local re-derivation because the server is
      // what the cancellation policy actually consults.
      partlyConfirmed: match.handoverPartlyConfirmed
        ?? ((match.donorConfirmedAt != null) !== (match.doneeConfirmedAt != null)),
    },
    methodOptions: MATCH_METHODS,
    // The match flow mints its certificate code at dual confirmation — there is no
    // issue window in between. This is the user-visible half of the domain
    // difference the two flows must not paper over.
    certificateCode: match.verifiedDeliveryCertificate ?? null,
    certificateHref: null,
    closed: state === "completed" || state === "cancelled_or_failed",
  };
}

function normaliseViewerRole(value: string | null | undefined): HandoverRole | null {
  if (value === "DONOR" || value === "DONEE") return value;
  // ADMIN and null both fall here: an admin is not a participant in the handover
  // and must not be handed a participant's controls.
  return null;
}

/**
 * Whether a map link is worth showing. Explicitly tolerates 0 — the equator and
 * the prime meridian are valid coordinates, and `lat && lng` would drop them.
 */
export function hasCoordinates(lat: number | null, lng: number | null): boolean {
  return lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
}

export function mapsHref(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
