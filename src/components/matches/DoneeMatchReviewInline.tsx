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
 * An item waiting on the donee's yes/no (AWAITING_DONEE_CONFIRMATION), as the
 * banner across the top of the request card (owner, 2026-10-09, design A). Same
 * facts and actions as DoneeMatchReviewCard; laid out exactly like the donor's banner.
 */
export function DoneeMatchReviewInline({ match, busy, onAccept, onDecline }: {
  match: ItemMatch;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const covered = match.allocatedQuantity ?? null;
  const needed = match.requestQuantity ?? null;
  const km = match.scoreDistanceKm;
  return (
    <MatchReviewBanner
      tone="donee"
      photos={((match.listingPhotoUrls?.length ? match.listingPhotoUrls : match.donorImages) ?? []).slice(0, 3)}
      title={<>&ldquo;{match.listingTitle || "A donated item"}&rdquo; matches your need</>}
      time={`Matched ${timeAgo(match.createdAt)}`}
      facts={[
        { label: "Covers", value: covered != null && needed != null ? `${covered} of ${needed} you need` : covered != null ? `${covered}` : "—" },
        { label: "Distance", value: km != null ? `About ${km < 1 ? "<1" : Math.round(km)} km` : "Same city" },
        { label: "Donor", value: `Verified${match.donorCity ? `, ${match.donorCity.split(",")[0]}` : ""}` },
      ]}
      details={[
        match.listingCondition && `Condition: ${match.listingCondition}`,
        match.listingWorkingStatus && `Working: ${match.listingWorkingStatus.replace(/_/g, " ").toLowerCase()}`,
        match.listingApproximateAge && `Age: ${match.listingApproximateAge}`,
        match.listingKnownDefects && `Defects: ${match.listingKnownDefects}`,
      ]}
      note="The donor confirmed and our team approved it."
      acceptLabel="Yes, I want this item"
      declineLabel="This won't work for me"
      busy={busy}
      onAccept={onAccept}
      onDecline={onDecline}
    />
  );
}
