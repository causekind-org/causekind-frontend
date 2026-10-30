"use client";

import type { ItemMatch } from "@/lib/api";
import { MatchReviewBanner } from "@/components/matches/MatchReviewBanner";

import { useUiText } from "@/components/UiText";
import { useDashCopy, useTimeAgo } from "@/lib/dashboardCopy";
import { useTranslations } from "next-intl";

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
  const ui = useUiText();
  const dt = useTranslations("dashFlow");
  const dc = useDashCopy();
  const timeAgo = useTimeAgo();
  const covered = match.allocatedQuantity ?? null;
  const needed = match.requestQuantity ?? null;
  const km = match.scoreDistanceKm;
  return (
    <MatchReviewBanner
      tone="donee"
      photos={((match.listingPhotoUrls?.length ? match.listingPhotoUrls : match.donorImages) ?? []).slice(0, 3)}
      title={dt("itemMatchesYourNeed", { item: match.listingTitle || ui("A donated item") })}
      time={dt("matchedAgo", { ago: timeAgo(match.createdAt) })}
      facts={[
        { label: ui("Covers"), value: covered != null && needed != null ? dt("coversOfYouNeed", { covered, needed }) : covered != null ? `${covered}` : "—" },
        { label: ui("Distance"), value: km != null ? dt("aboutKm", { km: km < 1 ? "<1" : Math.round(km) }) : ui("Same city") },
        { label: ui("Donor"), value: match.donorCity ? dt("verifiedIn", { city: match.donorCity.split(",")[0] }) : ui("Verified") },
      ]}
      details={[
        match.listingCondition && dt("conditionIs", { condition: dc(match.listingCondition) }),
        match.listingWorkingStatus && dt("workingIs", { status: dc(match.listingWorkingStatus.replace(/_/g, " ").toLowerCase()) }),
        match.listingApproximateAge && dt("ageIs", { age: match.listingApproximateAge }),
        match.listingKnownDefects && dt("defectsIs", { defects: match.listingKnownDefects }),
      ]}
      note={ui("The donor confirmed and our team approved it.")}
      acceptLabel={ui("Yes, I want this item")}
      declineLabel={ui("This won't work for me")}
      busy={busy}
      onAccept={onAccept}
      onDecline={onDecline}
    />
  );
}
