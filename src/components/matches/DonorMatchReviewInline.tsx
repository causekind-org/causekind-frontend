"use client";

import type { ItemMatch } from "@/lib/api";
import { MatchReviewBanner } from "@/components/matches/MatchReviewBanner";

import { useUiText } from "@/components/UiText";
import { useDashCopy, useTimeAgo } from "@/lib/dashboardCopy";
import { useTranslations } from "next-intl";

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
  const ui = useUiText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
  const timeAgo = useTimeAgo();
  const need = match.requestTitle || ui("a nearby need");
  const covered = match.allocatedQuantity ?? null;
  const needed = match.requestQuantity ?? null;
  const km = match.scoreDistanceKm;
  return (
    <MatchReviewBanner
      tone="donor"
      photos={match.requestImageUrl ? [match.requestImageUrl] : []}
      title={dt("thisItemMatchesNeed", { need })}
      time={dt("matchedAgo", { ago: timeAgo(match.createdAt) })}
      facts={[
        { label: ui("Covers"), value: covered != null && needed != null ? dt("coversOfNeeded", { covered, needed }) : covered != null ? `${covered}` : "—" },
        { label: ui("Distance"), value: km != null ? dt("aboutKm", { km: km < 1 ? "<1" : Math.round(km) }) : ui("Same city") },
        { label: ui("Recipient"), value: match.doneeCity ? dt("verifiedIn", { city: match.doneeCity.split(",")[0] }) : ui("Verified") },
      ]}
      details={[match.requestUrgency && dt("urgencyLevel", { level: dc(`${match.requestUrgency.charAt(0)}${match.requestUrgency.slice(1).toLowerCase()}`) })]}
      note={ui("The recipient's details stay private until you confirm and an admin approves.")}
      acceptLabel={ui("Yes, I still have it")}
      declineLabel={ui("Not available any more")}
      busy={busy}
      onAccept={onAccept}
      onDecline={onDecline}
    />
  );
}
