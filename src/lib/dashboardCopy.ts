import { useTranslations } from "next-intl";
import { useUiText } from "@/components/UiText";
import { serverDate } from "@/lib/serverTime";

/**
 * Display text for fixed English labels used on the donor and donee dashboards
 * (journey stations, status words, tiers, humanised enum values). The labels
 * stay English where they are also keys or compared values; screens show them
 * through this lookup. Unknown text is returned unchanged.
 */
export function useDashCopy(): (text: string | null | undefined) => string {
  const ui = useUiText();
  const map = new Map<string, string>([
    ["Pending", ui("Pending")],
    ["Partially Fulfilled", ui("Partially Fulfilled")],
    ["Drafts", ui("Drafts")],
    ["Under Review", ui("Under Review")],
    ["Live & Matching", ui("Live & Matching")],
    ["Closed", ui("Closed")],
    ["Recipient reviews", ui("Recipient reviews")],
    ["You reconfirm", ui("You reconfirm")],
    ["Team approves", ui("Team approves")],
    ["You buy & it's delivered", ui("You buy & it's delivered")],
    ["You buy & hand over", ui("You buy & hand over")],
    ["Offer sent", ui("Offer sent")],
    ["Accepted, arrange handover", ui("Accepted, arrange handover")],
    ["Handover scheduled", ui("Handover scheduled")],
    ["Received by NGO", ui("Received by NGO")],
    ["Handover needs attention", ui("Handover needs attention")],
    ["An issue is being reviewed", ui("An issue is being reviewed")],
    ["Completed. The NGO's distribution proof shows here once approved.", ui("Completed. The NGO's distribution proof shows here once approved.")],
    // journey stations
    ["Listed", ui("Listed")],
    ["Verified", ui("Verified")],
    ["Matching", ui("Matching")],
    ["Matched", ui("Matched")],
    ["Donated", ui("Donated")],
    ["Posted", ui("Posted")],
    ["Partial", ui("Partial")],
    ["Received", ui("Received")],
    // station dates
    ["Stopped here", ui("Stopped here")],
    ["Now", ui("Now")],
    ["Upcoming", ui("Upcoming")],
    ["Need found", ui("Need found")],
    // verification tiers
    ["Basic", ui("Basic")],
    ["Moderate", ui("Moderate")],
    ["High value", ui("High value")],
    ["Emergency", ui("Emergency")],
    // urgency words
    ["Normal", ui("Normal")],
    ["Low", ui("Low")],
    ["Medium", ui("Medium")],
    ["High", ui("High")],
    ["Urgent", ui("Urgent")],
    ["Critical", ui("Critical")],
    // humanised listing fields
    ["Fully working", ui("Fully working")],
    ["Partially working", ui("Partially working")],
    ["Not working", ui("Not working")],
    ["Donor", ui("Donor")],
    ["Recipient", ui("Recipient")],
    ["Shared", ui("Shared")],
    ["fully working", ui("fully working")],
    ["partially working", ui("partially working")],
    ["not working", ui("not working")],
    // item conditions
    ["Unused", ui("Unused")],
    ["Like New", ui("Like New")],
    ["Good", ui("Good")],
    ["Fair", ui("Fair")],
    ["Needs Minor Repair", ui("Needs Minor Repair")],
    ["Not Working", ui("Not Working")],
  ]);
  return (text) => (text ? map.get(text) ?? text : "");
}

/** "5 min ago" / "3 h ago" / "2 d ago", translated. */
export function useTimeAgo(): (iso: string | null | undefined) => string {
  const dt = useTranslations("dashFlow");
  return (iso) => {
    if (!iso) return dt("recently");
    const mins = Math.max(0, Math.round((Date.now() - serverDate(iso).getTime()) / 60000));
    if (mins < 1) return dt("justNow");
    if (mins < 60) return dt("minAgo", { count: mins });
    const hours = Math.round(mins / 60);
    return hours < 24 ? dt("hoursAgo", { count: hours }) : dt("daysAgo", { count: Math.round(hours / 24) });
  };
}
