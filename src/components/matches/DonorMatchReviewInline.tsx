"use client";

import type { ItemMatch } from "@/lib/api";
import { MatchReviewBanner } from "@/components/matches/MatchReviewBanner";

function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
}

/**
 * A match waiting on the donor (DONOR_REVIEW), as the banner across the top of
 * the listing card (owner, 2026-10-09, design A). Same facts and actions as
 * DonorMatchReviewCard; laid out exactly like the donee's banner.
 */
export function DonorMatchReviewInline({ match, busy, onAccept, onDecline }: {
  match: ItemMatch;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const need = match.requestTitle || "a nearby need";
  const covered = match.allocatedQuantity ?? null;
  const needed = match.requestQuantity ?? null;
  const km = match.scoreDistanceKm;
  return (
    <MatchReviewBanner
      tone="donor"
      photos={match.requestImageUrl ? [match.requestImageUrl] : []}
      title={<>This item matches a need for &ldquo;{need}&rdquo;</>}
      time={`Matched ${timeAgo(match.createdAt)}`}
      facts={[
        { label: "Covers", value: covered != null && needed != null ? `${covered} of ${needed} needed` : covered != null ? `${covered}` : "—" },
        { label: "Distance", value: km != null ? `About ${km < 1 ? "<1" : Math.round(km)} km` : "Same city" },
        { label: "Recipient", value: `Verified${match.doneeCity ? `, ${match.doneeCity.split(",")[0]}` : ""}` },
      ]}
      details={[match.requestUrgency && `${match.requestUrgency.charAt(0)}${match.requestUrgency.slice(1).toLowerCase()} urgency`]}
      note="The recipient's details stay private until you confirm and an admin approves."
      acceptLabel="Yes, I still have it"
      declineLabel="Not available any more"
      busy={busy}
      onAccept={onAccept}
      onDecline={onDecline}
    />
  );
}
