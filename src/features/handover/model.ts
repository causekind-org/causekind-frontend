/**
 * The normalized Handover view model.
 *
 * <p>CauseKind has two handover backends that must not be merged: the OFFER flow
 * (DonationOffer + HandoverRecord + HandoverConfirmation) and the MATCH flow
 * (logistics and confirmation fields directly on ItemMatch). They differ in a way
 * that is visible to users, not just internally:
 *
 * - OFFER: dual confirmation → ISSUE_WINDOW_OPEN → COMPLETED (after the donee
 *   confirms no issue, or the window expires).
 * - MATCH: dual confirmation → COMPLETED immediately, with a certificate code.
 *
 * <p>So this file defines a shared *shape*, not a shared lifecycle. Adapters map
 * each backend into it and the UI renders the shape; the `flow` discriminator is
 * what lets the UI tell the truth about which of the two the user is in.
 */

export type HandoverFlow = "OFFER" | "MATCH";

/** Resolved from participation, never from the account's role. See resolveRole. */
export type HandoverRole = "DONOR" | "DONEE";

/**
 * Where this handover actually is, independent of either backend's status enum.
 *
 * <p>`partially_confirmed` is the one that cannot be derived from status in either
 * flow — it lives only in the XOR of the two confirmation timestamps. Treating it
 * as a first-class state is what stops the UI offering "cancel" in a window where
 * the server will only allow "dispute".
 */
export type HandoverState =
  | "awaiting_schedule"
  | "scheduled"
  | "ready_to_handover"
  | "partially_confirmed"
  | "at_risk"
  | "issue_window"
  | "issue_raised"
  | "completed"
  | "cancelled_or_failed";

/**
 * The CSS class carrying this role's `--handover-*` tokens.
 *
 * <p><b>Every portalled surface must apply this itself.</b> Radix Dialog/Select
 * and vaul render into `<body>`, outside the scoped element, so a dialog that
 * doesn't carry the class resolves `var(--handover-accent)` to nothing and comes
 * out colourless. See the note in styles.css.
 */
export function handoverScope(role: HandoverRole): string {
  return role === "DONOR" ? "handover-donor" : "handover-donee";
}

export type HandoverMethodOption = { value: string; label: string; hint?: string };

export type HandoverSchedule = {
  method: string | null;
  methodLabel: string | null;
  scheduledAt: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  rescheduleCount: number;
  maxReschedules: number;
  atRisk: boolean;
};

export type HandoverConfirmationState = {
  donorConfirmedAt: string | null;
  donorConfirmedQty: number | null;
  doneeConfirmedAt: string | null;
  doneeConfirmedQty: number | null;
  conditionRating: string | null;
  /** Server-computed where available. Never guessed from status. */
  partlyConfirmed: boolean;
};

export type HandoverParticipant = {
  name: string | null;
  /** Present only when the counterpart has permitted contact. Never rendered as text. */
  phone: string | null;
};

export type HandoverViewModel = {
  flow: HandoverFlow;
  /** Offer id or match id — whichever this hub is for. */
  id: number;
  role: HandoverRole;
  state: HandoverState;
  /** The raw backend status, shown only in the history section for support. */
  rawStatus: string;
  title: string;
  imageUrl: string | null;
  transactionCode: string;
  counterpart: HandoverParticipant;
  /** Donor-side switch letting the donee call them. Reversible at any time. */
  donorAllowsDoneeCall: boolean;
  schedule: HandoverSchedule | null;
  confirmation: HandoverConfirmationState;
  methodOptions: HandoverMethodOption[];
  /** MATCH only — the certificate code minted at dual confirmation. */
  certificateCode: string | null;
  /** OFFER only — donors get a downloadable certificate at /certificate. */
  certificateHref: string | null;
  closed: boolean;
};

// ── Journey rail ────────────────────────────────────────────────────────────

export type JourneyStepKey = "connected" | "scheduled" | "handover" | "confirmation" | "complete";

export const JOURNEY_STEPS: { key: JourneyStepKey; label: string }[] = [
  { key: "connected", label: "Approved" },
  { key: "scheduled", label: "Scheduled" },
  { key: "handover", label: "Handover" },
  { key: "confirmation", label: "Confirmation" },
  { key: "complete", label: "Complete" },
];

/**
 * How far along the rail we are. Returns -1 for cancelled/failed so the rail can
 * render as halted rather than pretending to be at step 0.
 */
export function journeyIndex(state: HandoverState): number {
  switch (state) {
    case "cancelled_or_failed": return -1;
    case "awaiting_schedule":   return 0;
    case "scheduled":           return 1;
    case "ready_to_handover":   return 2;
    case "at_risk":             return 2;
    case "partially_confirmed": return 3;
    case "issue_window":        return 3;
    case "issue_raised":        return 3;
    case "completed":           return 4;
  }
}

// ── The resolver ────────────────────────────────────────────────────────────

/**
 * Maps a backend status + role + confirmation timestamps to a HandoverState.
 *
 * <p>Pure and exhaustively switched so it can be unit-tested without a server, and
 * so the two flows cannot drift into disagreeing about what "ready" means.
 *
 * <p><b>Order matters.</b> The XOR check runs before any status mapping, because
 * neither backend has a status for the half-confirmed window — an offer sits at
 * HANDOVER_IN_PROGRESS and a match at HANDOVER_SCHEDULED whether zero or one side
 * has confirmed. Reading status first would silently lose the distinction.
 */
export function resolveHandoverState(input: {
  flow: HandoverFlow;
  status: string;
  hasSchedule: boolean;
  atRisk: boolean;
  donorConfirmedAt: string | null;
  doneeConfirmedAt: string | null;
}): HandoverState {
  const { flow, status, hasSchedule, atRisk, donorConfirmedAt, doneeConfirmedAt } = input;

  if (TERMINAL_STATUSES.has(status)) return "cancelled_or_failed";
  if (COMPLETED_STATUSES.has(status)) return "completed";
  if (status === "ISSUE_RAISED") return "issue_raised";
  if (status === "ISSUE_WINDOW_OPEN") {
    // OFFER only: a real state with actions (confirm no issue / report issue).
    // MATCH has no equivalent — it completes straight from dual confirmation.
    return flow === "OFFER" ? "issue_window" : "completed";
  }

  // Before status: the half-confirmed window has no status in either flow.
  const partly = (donorConfirmedAt != null) !== (doneeConfirmedAt != null);
  if (partly) return "partially_confirmed";

  if (atRisk || status === "HANDOVER_AT_RISK") return "at_risk";
  if (!hasSchedule) return "awaiting_schedule";

  return READY_STATUSES.has(status) ? "ready_to_handover" : "scheduled";
}

const TERMINAL_STATUSES = new Set([
  "CANCELLED", "WITHDRAWN", "FAILED", "REJECTED", "DONOR_REJECTED", "ADMIN_REJECTED", "DONEE_DECLINED",
]);

const COMPLETED_STATUSES = new Set(["COMPLETED", "FULFILLED", "CERTIFICATE_ISSUED"]);

/**
 * Statuses at which the handover can physically happen now — OTP and confirmation
 * become available. Deliberately a union across both flows: the resolver is shared,
 * and a status name from one flow never appears in the other.
 */
const READY_STATUSES = new Set([
  // OFFER
  "HANDOVER_IN_PROGRESS",
  // MATCH
  "LOGISTICS_CONFIRMED", "PICKUP_SCHEDULED", "PICKED_UP", "IN_TRANSIT",
  "DELIVERY_ATTEMPTED", "DELIVERED_PENDING_CONFIRMATION", "HANDOVER_SCHEDULED",
  "RESCHEDULED", "ARRANGEMENT_AGREED", "TRANSPORT_DISCUSSION",
]);

/**
 * Resolves which side of this transaction the signed-in user is on.
 *
 * <p><b>Returns null for anyone who is not a participant.</b> The old hubs did
 * `user.role === "DONEE"` and treated everyone else as the donor, so a DONOR-role
 * user opening someone else's handover saw the donor's controls — including
 * Generate OTP. Participation, never account role, and never a default.
 */
export function resolveRole(
  userEmail: string | null | undefined,
  donorEmail: string | null | undefined,
  doneeEmail: string | null | undefined,
): HandoverRole | null {
  if (!userEmail) return null;
  if (donorEmail && userEmail === donorEmail) return "DONOR";
  if (doneeEmail && userEmail === doneeEmail) return "DONEE";
  return null;
}

// ── Copy ────────────────────────────────────────────────────────────────────

/**
 * Headline + explanation for the "Your next step" panel.
 *
 * <p>Role-specific throughout. The donee must never be shown donor completion copy
 * — a recipient did not "perform an act of kindness" by receiving help, and telling
 * them so is the kind of thing that makes a person feel like a case file.
 */
export function nextStepCopy(vm: HandoverViewModel): { title: string; body: string } {
  const donor = vm.role === "DONOR";
  const them = donor ? "the recipient" : "the donor";

  switch (vm.state) {
    case "awaiting_schedule":
      return donor
        ? { title: "Schedule the handover",
            body: "Pick a time and place that works for both of you. It's your item, so the schedule is yours to set." }
        : { title: "Waiting for a time to be set",
            body: `The donor picks the date and place. You'll be notified the moment it's fixed — message ${them} if you'd like to suggest something.` };

    case "scheduled":
      return donor
        ? { title: "Handover scheduled",
            body: "Nothing to do right now. When you meet, generate the code below and confirm what you handed over." }
        : { title: "Handover scheduled",
            body: "Check the time and place below. Need a different time? Ask in the chat — only the donor can reschedule." };

    case "ready_to_handover":
      return donor
        ? { title: "Confirm the handover",
            body: "Generate a code for the recipient, then record how many items you handed over." }
        : { title: "Confirm what you received",
            body: "Enter the 6-digit code the donor gives you, then record the quantity and condition." };

    case "partially_confirmed": {
      const youConfirmed = donor ? vm.confirmation.donorConfirmedAt : vm.confirmation.doneeConfirmedAt;
      return youConfirmed
        ? { title: "Waiting for the other side",
            body: `You've confirmed. Once ${them} confirms too, this handover closes. Message them if it's taking a while.` }
        : donor
          ? { title: "The recipient has confirmed",
              body: "They've recorded receiving the item. Confirm the quantity you handed over to close this." }
          : { title: "The donor has confirmed",
              body: "They've recorded handing the item over. Confirm what you received to close this." };
    }

    case "at_risk":
      return { title: "This handover needs attention",
               body: "It's been rescheduled the maximum number of times. Our team will step in — you can still message each other below." };

    case "issue_window":
      return donor
        ? { title: "Delivery confirmed",
            body: "Both sides confirmed. There's a short window for the recipient to flag any problem, then this completes automatically." }
        : { title: "Is everything alright with the item?",
            body: "You have a short window to tell us if something's wrong. If it's all fine, you can close this now." };

    case "issue_raised":
      return { title: "An issue is being reviewed",
               body: "Our team has this and will contact both of you. Nothing further is needed from you right now." };

    case "completed":
      return donor
        ? { title: "Donation complete",
            body: "Thank you — this item reached someone who needed it." }
        : { title: "Item received",
            body: "This handover is complete and closed. Your record of it is below." };

    case "cancelled_or_failed":
      return { title: "This handover is closed",
               body: "It didn't go ahead. The record stays here for reference and support." };
  }
}
