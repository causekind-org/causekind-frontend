"use client";

import { serverDate } from "@/lib/serverTime";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import {
  adminGetCampaigns, approveCampaign, rejectCampaign, type Campaign,
  adminGetItemListings, adminApproveItemListing, adminRejectItemListing, adminMarkListingNeedsInformation, type ItemListing,
  adminGetItemRequests, adminApproveItemRequest, type ItemRequest,
  adminGetMatches, adminApproveMatch, adminRejectMatch, adminGetMatchHistory, type ItemMatch, type StatusHistoryEntry,
  adminGetAllOffers,
  adminGetAllAiAssessments, type AiAssessmentResponse,
  adminGetMyPermissions,
  adminGetNgoApplications,
  adminGetNgoDrives,
  adminGetNgoProfileChangesCount,
  adminGetPendingNgoDriveOffers,
  adminGetNgoDriveProofs,
  adminListIssues,
} from "@/lib/api";
import { displayReason } from "@/lib/rejectionReason";
import { useAuth } from "@/hooks/useAuth";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";
import { OffersQueuePanel } from "../offers/OffersQueuePanel";
import { HandoverPhotoLog } from "../HandoverPhotoLog";
import { IssueLinkWatcher, IssuesPanel } from "../issues/IssuesPanel";
import { NotificationBell } from "@/components/NotificationBell";
import { NgoReviewPanel } from "../ngos/NgoReviewPanel";
import { NgoActivityModerationPanel } from "../ngos/NgoActivityModerationPanel";
import { NgoProfileChangesPanel } from "../ngos/NgoProfileChangesPanel";
import { getPendingNgoActivities } from "@/lib/api";
import { writeUrlParams } from "@/components/admin/adminUrlState";
import { NgoDriveReviewPanel, NgoDriveOffersPanel, NgoDriveProofsPanel } from "../ngo-drives/NgoDriveAdminPanels";
import { VerificationQueuePanel } from "../verifications/VerificationQueuePanel";
import { AiReviewPanel } from "@/components/admin/AiReviewPanel";
import { UserJourneyPanel } from "@/components/admin/UserJourneyPanel";
import { PhotoStrip } from "@/components/admin/PhotoStrip";
import { AnalyticsPanel } from "@/components/admin/AnalyticsPanel";
import { CampaignHistoryList } from "@/components/admin/CampaignHistoryList";
import { ListingHistoryList } from "@/components/admin/ListingHistoryList";
import { MatchHistoryList } from "@/components/admin/MatchHistoryList";
import { AdminStatusTabs } from "@/components/admin/AdminStatusTabs";
import { AdminFundraisingNav } from "@/features/fundraising/AdminFundraisingNav";
import { AdminFundraisingPanel } from "@/features/fundraising/AdminFundraisingPanel";
import { AdminSahasPanel } from "@/features/sahas/AdminSahasPanel";
import { FEATURES } from "@/lib/features";
import { StaffShell, StaffNavGroup, StaffNavItem, StaffTopbarTitle } from "@/components/staff/StaffShell";
import { PageHeader } from "@/components/staff/primitives";
import {
  AlertTriangle, Bot, Building2, Check, ChevronDown, ChevronUp, ClipboardList, Clock, Gift, Handshake,
  Image as ImageIcon, Loader2, LogOut, MapPin, Megaphone, MessageSquare,
  Package, Phone, RefreshCw, Search, ShieldCheck, Tag, TrendingUp, Truck, UserRound, X,
  type LucideIcon,
  Camera,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/skeletons";

type TabKey = "campaigns" | "requests" | "ngo-applications" | "ngo-drives" | "drive-offers" | "drive-proofs" | "ngo-activities" | "ngo-profile-changes" | "listings" | "matches" | "offers" | "issues" | "match-history" | "handover-photos" | "ai-logs" | "user-journey" | "analytics" | "fundraising" | "sahas";

/** Which AdminCapability (see backend AdminCapability enum) gates each tab —
 * used to hide tabs an admin has had revoked rather than just 403ing on click. */
const TAB_CAPABILITY: Record<TabKey, string> = {
  campaigns: "CAMPAIGNS",
  requests: "REQUEST_REVIEW",
  // Same capability the backend checks on /api/v1/admin/ngo-applications.
  "ngo-applications": "REQUEST_REVIEW",
  // Same capabilities AdminCapabilityFilter maps for /admin/ngo-drives and /admin/ngo-drive-offers.
  "ngo-drives": "REQUEST_REVIEW",
  "drive-offers": "OFFER_REVIEW",
  "drive-proofs": "REQUEST_REVIEW",
  // Same capability the backend checks on /api/v1/admin/ngo-activities.
  "ngo-activities": "REQUEST_REVIEW",
  // Same capability the backend checks on /api/v1/admin/ngo-profile-changes.
  "ngo-profile-changes": "REQUEST_REVIEW",
  listings: "LISTING_REVIEW",
  matches: "MATCH_INTERVENE",
  offers: "OFFER_REVIEW",
  // Same capability AdminCapabilityFilter maps for /admin/issues.
  issues: "SUPPORT_CASE_MANAGE",
  "match-history": "MATCH_INTERVENE",
  "handover-photos": "MATCH_INTERVENE",
  "ai-logs": "LISTING_REVIEW",
  "user-journey": "USER_READ",
  analytics: "PAYMENT_REVIEW",
  // Fundraising pages render in the panel (2026-10-19); same capability as /admin/fundraising.
  fundraising: "CAMPAIGNS",
  // Sahas campaigns (2026-11-03): same capability as the backend's sahas-campaigns segment.
  sahas: "CAMPAIGNS",
};
/** ?tab= values that open an NGO tab (tab keys plus the longer names used in links). */
const NGO_TAB_LINKS: Record<string, TabKey> = {
  "ngo-drives": "ngo-drives",
  "drive-offers": "drive-offers", "ngo-drive-offers": "drive-offers",
  "drive-proofs": "drive-proofs", "ngo-proofs": "drive-proofs",
  "ngo-activities": "ngo-activities", "past-activity": "ngo-activities",
  "ngo-profile-changes": "ngo-profile-changes", "profile-changes": "ngo-profile-changes",
};
const NGO_TAB_KEYS: TabKey[] = ["ngo-applications", "ngo-drives", "drive-offers", "drive-proofs", "ngo-activities", "ngo-profile-changes"];

type RejectType = "campaign" | "listing" | "match";
type DetailSelection =
  | { type: "request"; item: ItemRequest }
  | { type: "listing"; item: ItemListing }
  | { type: "match"; item: ItemMatch };

const STATUS_COLORS: Record<string, string> = {
  DONOR_REVIEW: "bg-amber-100 text-amber-800",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
  AWAITING_DONEE_CONFIRMATION: "bg-blue-100 text-blue-800",
  DONEE_ACCEPTED: "bg-cyan-100 text-cyan-800",
  BOTH_PARTIES_ACCEPTED: "bg-indigo-100 text-indigo-800",
  LOGISTICS_CONFIRMED: "bg-violet-100 text-violet-800",
  TRANSPORT_DISCUSSION: "bg-purple-100 text-purple-800",
  PICKUP_SCHEDULED: "bg-orange-100 text-orange-800",
  PICKED_UP: "bg-lime-100 text-lime-800",
  IN_TRANSIT: "bg-teal-100 text-teal-800",
  DELIVERED_PENDING_CONFIRMATION: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-green-100 text-green-800",
  FULFILLED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-red-100 text-red-800",
  FAILED: "bg-red-100 text-red-800",
  DONOR_REJECTED: "bg-red-100 text-red-800",
};

const ALL_MATCH_STATUSES = [
  "ALL", "DONOR_REVIEW", "PENDING_APPROVAL", "AWAITING_DONEE_CONFIRMATION", "DONEE_ACCEPTED",
  "BOTH_PARTIES_ACCEPTED", "LOGISTICS_CONFIRMED", "HANDOVER_SCHEDULED", "IN_TRANSIT", "HANDOVER_AT_RISK",
  "COMPLETED", "CERTIFICATE_ISSUED", "FAILED", "REJECTED", "CANCELLED",
];
// Filter pills used to print raw enum names ("AWAITING DONEE CONFIRMATION").
const matchStatusLabel = (s: string) => s === "ALL" ? "All"
  : s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

const AI_REC_FILTERS = ["ALL", "APPROVE", "REJECT", "MANUAL_REVIEW", "REQUEST_INFORMATION"];
const REC_BADGE: Record<string, string> = {
  APPROVE: "bg-emerald-100 text-emerald-800 border-emerald-300",
  REJECT: "bg-red-100 text-red-800 border-red-300",
  MANUAL_REVIEW: "bg-orange-100 text-orange-800 border-orange-300",
  REQUEST_INFORMATION: "bg-amber-100 text-amber-800 border-amber-300",
};
const FRAUD_BADGE: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700 border-red-300",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-300",
  LOW: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n);
}

/** Enum → readable label: "HANDOVER_SCHEDULED" → "Handover scheduled". Mixed-case input is only de-underscored. */
function formatEnum(value?: string | null) {
  if (!value) return null;
  const spaced = value.replace(/[_|]/g, " ").replace(/\s+/g, " ").trim();
  if (spaced !== spaced.toUpperCase()) return spaced;
  const ACRONYMS = new Set(["OTP", "UPI", "NGO", "AI", "PAN", "ID", "QR", "SMS", "KYC"]);
  return spaced.split(" ").map((w, i) => {
    if (ACRONYMS.has(w)) return w;
    const lw = w.toLowerCase();
    return i === 0 ? lw.charAt(0).toUpperCase() + lw.slice(1) : lw;
  }).join(" ");
}

function formatDateTime(value?: string | null) {
  if (!value) return null;
  const date = serverDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = serverDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatCoordinates(lat?: number | null, lng?: number | null) {
  if (lat == null || lng == null) return null;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function splitValues(value?: string | null, separator: "," | "|" = ",") {
  if (!value) return [];
  return value.split(separator).map(v => v.trim()).filter(Boolean);
}

function listingPhotos(listing: ItemListing) {
  if (listing.photoUrls?.length) return listing.photoUrls;
  return [listing.imageUrl, ...(listing.imageUrls ? listing.imageUrls.split("|") : [])]
    .filter(Boolean) as string[];
}

function matchListingPhotos(match: ItemMatch) {
  if (match.listingPhotoUrls?.length) return match.listingPhotoUrls;
  return [match.listingImageUrl, ...(match.listingImageUrls ? match.listingImageUrls.split("|") : [])]
    .filter(Boolean) as string[];
}

export default function AdminDashboardPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  // ── Approval queue state ──
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [listings, setListings] = useState<ItemListing[]>([]);
  const [matches, setMatches] = useState<ItemMatch[]>([]);
  const [offersNeedingAction, setOffersNeedingAction] = useState(0);
  const [ngoAwaiting, setNgoAwaiting] = useState(0);
  const [offersInFlight, setOffersInFlight] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rejectedListings, setRejectedListings] = useState<ItemListing[]>([]);
  const [rejectedRequests, setRejectedRequests] = useState<ItemRequest[]>([]);

  // ── Data loading ── (declared before the live-update subscription that calls it)
  const loadData = useCallback(() => {
    setLoading(true);
    // Queue tabs show no NGO work; it is reviewed only in the NGO tabs.
    const queue = { excludeNgo: true };
    Promise.all([
      adminGetCampaigns("PENDING_APPROVAL", queue),
      adminGetItemRequests("PENDING_VERIFICATION", queue),
      Promise.all([
        adminGetItemListings("SUBMITTED", queue),
        adminGetItemListings("MANUAL_REVIEW", queue),
      ]).then(([submitted, manual]) => [...submitted, ...manual]),
      adminGetMatches("PENDING_APPROVAL", queue),
      // Offers tab manages its own list/loading inside OffersQueuePanel — here we only
      // need counts: needs-action for the tab badge, plus open offers so the header
      // doesn't claim "all clear" while an offer is mid-pipeline with the parties.
      adminGetAllOffers(undefined, queue).then(all => ({
        needsAction: all.filter(o => ["DONOR_RECONFIRMED", "PENDING_ADMIN_APPROVAL"].includes(o.status)).length,
        open: all.filter(o => !["COMPLETED", "ADMIN_REJECTED", "WITHDRAWN", "DONEE_DECLINED", "CANCELLED", "DRAFT"].includes(o.status)).length,
      })),
      // Rejected items were previously fetched by nothing at all, so an AI
      // auto-reject was final AND invisible — no queue contained it and no admin
      // could act on it. These two make it reviewable.
      adminGetItemListings("REJECTED", queue),
      adminGetItemRequests("REJECTED", queue),
    ]).then(([c, r, l, m, offerCounts, rejL, rejR]) => {
      setCampaigns(c); setRequests(r); setListings(l as ItemListing[]); setMatches(m);
      setOffersNeedingAction(offerCounts.needsAction);
      setOffersInFlight(offerCounts.open);
      setRejectedListings(rejL as ItemListing[]);
      setRejectedRequests(rejR as ItemRequest[]);
    }).catch(() => toast.error("Failed to load approval queue"))
      .finally(() => setLoading(false));
  }, []);

  useEntityUpdates(["CAMPAIGN", "REQUEST", "LISTING", "MATCH", "OFFER"], () => {
    loadData();
  });


  const [tab, setTab] = useState<TabKey>("campaigns");
  // Campaigns tab: 0 = pending queue, 1 = approved, 2 = rejected (read-only history).
  const [campaignView, setCampaignView] = useState(0);
  // Listings tab: 0 = pending queue (+ rejected review), 1 = waiting on donor, 2 = approved.
  const [listingView, setListingView] = useState(0);
  // Matches tab: 0 = approval queue, 1 = in progress, 2 = completed, 3 = stopped.
  const [matchView, setMatchView] = useState(0);
  // Which fundraising page the panel shows when tab === "fundraising".
  const [frPath, setFrPath] = useState("/admin/fundraising");
  const openFundraising = useCallback((href: string) => { setFrPath(href); setTab("fundraising"); }, []);
  // NGO sidebar group: opens with its header, and always while one of its tabs is active.
  const [ngoExpanded, setNgoExpanded] = useState(false);
  const [journeyUserId, setJourneyUserId] = useState<number | null>(null);

  // Effective permissions — null while loading (treated as "everything granted"
  // to avoid a flash-hide before the response arrives; SUPER_ADMIN also always
  // resolves to all-true here since AdminPermissionService default-allows).
  const [myPermissions, setMyPermissions] = useState<Record<string, boolean> | null>(null);
  useEffect(() => {
    adminGetMyPermissions().then(setMyPermissions).catch(() => {});
  }, []);
  const canSeeTab = useCallback(
    (key: TabKey) => myPermissions === null || myPermissions[TAB_CAPABILITY[key]] !== false,
    [myPermissions]
  );
  // If the tab currently open gets revoked (or the default "campaigns" tab
  // itself is revoked), fall back to the first tab this admin can still see.
  useEffect(() => {
    if (myPermissions === null || canSeeTab(tab)) return;
    const fallback = (Object.keys(TAB_CAPABILITY) as TabKey[]).find(canSeeTab);
    if (fallback) setTab(fallback);
  }, [myPermissions, tab, canSeeTab]);

  // Elevate-on-scroll: the sticky header casts a shadow only once content
  // actually slides beneath it, fading in/out via transition-shadow.
  const [scrolled, setScrolled] = useState(false);

  // The below-lg nav strip scrolls horizontally and now holds ten destinations,
  // so the active one is frequently off-screen to the right — most obviously
  // when the page opens straight onto a report tab. Bring it into view.
  const navStripRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const active = navStripRef.current?.querySelector<HTMLElement>("[data-active]");
    // `inline` only — `block: "nearest"` would still let the browser scroll the
    // page vertically to reach a strip that is already sticky and in view.
    active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [tab]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Deep-link support: /admin/dashboard?journeyUser=<id> opens the User Journey
  // tab preloaded with that user (used by the approvals queue links).
  // window.location (not useSearchParams) — avoids the Suspense/CSR-bailout requirement.
  useEffect(() => {
    const ju = new URLSearchParams(window.location.search).get("journeyUser");
    if (ju && !Number.isNaN(Number(ju))) {
      setJourneyUserId(Number(ju));
      setTab("user-journey");
    }
  }, []);

  // NGO applications awaiting review — the sidebar badge and the header total.
  // Its own request, so an admin without REQUEST_REVIEW (a 403 here) still gets
  // the rest of the queue; the badge just stays at zero for them.
  const loadNgoCount = useCallback(() => {
    adminGetNgoApplications("UNDER_REVIEW", 0)
      .then(res => setNgoAwaiting(res.totalElements))
      .catch(() => setNgoAwaiting(0));
  }, []);
  useEffect(() => { loadNgoCount(); }, [loadNgoCount]);

  // NGO drive queues: pending drives, donor offers to drives, distribution proofs.
  // Separate requests for the same reason as above: a 403 only zeroes its own badge.
  const [drivesPending, setDrivesPending] = useState(0);
  const [driveOffersPending, setDriveOffersPending] = useState(0);
  const [driveProofsPending, setDriveProofsPending] = useState(0);
  const [activitiesPending, setActivitiesPending] = useState(0);
  /** A tab click: each tab has its own search, so ?q= (and an open item) never carries into the next tab. */
  const selectTab = useCallback((key: TabKey) => {
    setTab(current => {
      if (current !== key) writeUrlParams({ q: null, app: null, status: null });
      return key;
    });
  }, []);
  const [profileChangesPending, setProfileChangesPending] = useState(0);
  const loadDriveCounts = useCallback(() => {
    adminGetNgoDrives("PENDING_REVIEW").then(r => setDrivesPending(r.length)).catch(() => setDrivesPending(0));
    adminGetPendingNgoDriveOffers().then(r => setDriveOffersPending(r.length)).catch(() => setDriveOffersPending(0));
    adminGetNgoDriveProofs().then(r => setDriveProofsPending(r.length)).catch(() => setDriveProofsPending(0));
    getPendingNgoActivities().then(r => setActivitiesPending(r.length)).catch(() => setActivitiesPending(0));
    adminGetNgoProfileChangesCount().then(r => setProfileChangesPending(r.pending)).catch(() => setProfileChangesPending(0));
  }, []);
  // A new profile change request or a decision updates the badge live.
  useEntityUpdates(["NGO_PROFILE_CHANGE"], () => { loadDriveCounts(); });
  useEffect(() => { loadDriveCounts(); }, [loadDriveCounts]);

  // Issues: open count for the sidebar badge, and the issue a deep link asked for.
  // A 403 (SUPPORT_CASE_MANAGE revoked) only zeroes the badge.
  const [openIssues, setOpenIssues] = useState(0);
  const [issueDeepLink, setIssueDeepLink] = useState<string | null>(null);
  useEffect(() => {
    adminListIssues({ status: "open", size: 1 }).then(r => setOpenIssues(r.openCount)).catch(() => setOpenIssues(0));
  }, []);
  // ?tab=issues[&issue=<key>] — also when a notification link is clicked while
  // this page is already open, which does not remount it.
  const openIssueLink = useCallback((key: string | null) => {
    setTab("issues");
    setIssueDeepLink(key);
  }, []);

  // Deep link: /admin/dashboard?tab=ngo-applications[&application=<id>]
  const [ngoDeepLink, setNgoDeepLink] = useState<string | null>(null);
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const wanted = qs.get("tab");
    if (wanted === "ngo-applications") {
      setTab("ngo-applications");
      setNgoDeepLink(qs.get("application"));
    } else if (wanted && NGO_TAB_LINKS[wanted]) {
      setTab(NGO_TAB_LINKS[wanted]);
    } else if (wanted === "offers") {
      // ?tab=offers&view=purchases — the "Purchase to verify" bell.
      setTab("offers");
    }
  }, []);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectType, setRejectType] = useState<RejectType | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<number | null>(null);
  const [needsInfoId, setNeedsInfoId] = useState<number | null>(null);
  const [needsInfoNote, setNeedsInfoNote] = useState("");
  const [detailSelection, setDetailSelection] = useState<DetailSelection | null>(null);

  // ── Match History state ──
  const [allMatches, setAllMatches] = useState<ItemMatch[]>([]);
  const [allMatchesLoaded, setAllMatchesLoaded] = useState(false);
  const [allMatchesLoading, setAllMatchesLoading] = useState(false);
  // A failed load used to fall through to "No matches found for this filter" — a false empty.
  const [allMatchesError, setAllMatchesError] = useState(false);
  const [assessmentsError, setAssessmentsError] = useState(false);
  const [matchHistoryStatus, setMatchHistoryStatus] = useState("ALL");
  const [matchExpandedId, setMatchExpandedId] = useState<number | null>(null);
  const [matchStatusHistory, setMatchStatusHistory] = useState<Record<number, StatusHistoryEntry[]>>({});
  const [matchHistoryLoadingId, setMatchHistoryLoadingId] = useState<number | null>(null);

  // ── AI Logs state ──
  const [assessments, setAssessments] = useState<AiAssessmentResponse[]>([]);
  const [assessmentsLoaded, setAssessmentsLoaded] = useState(false);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);
  const [aiSearch, setAiSearch] = useState("");
  const [aiRecFilter, setAiRecFilter] = useState("ALL");
  const [aiFraudFilter, setAiFraudFilter] = useState("ALL");
  const [aiExpandedId, setAiExpandedId] = useState<number | null>(null);

  // Rejected queues + the pending reinstate confirmation. Reinstating republishes
  // something that was blocked for a stated safety reason, so it is never a
  // single click.
  const [reinstateTarget, setReinstateTarget] = useState<
    { kind: "listing" | "request"; id: number; title: string } | null
  >(null);
  const [reinstating, setReinstating] = useState(false);

  // ── Data loading ──

  async function loadAllMatches(status?: string) {
    setAllMatchesLoading(true);
    setAllMatchesError(false);
    try {
      const data = await adminGetMatches(status === "ALL" || !status ? undefined : status);
      setAllMatches(data);
      setAllMatchesLoaded(true);
    } catch { setAllMatchesError(true); toast.error("Failed to load match history"); }
    finally { setAllMatchesLoading(false); }
  }

  async function loadAiLogs() {
    setAssessmentsLoading(true);
    setAssessmentsError(false);
    try {
      const data = await adminGetAllAiAssessments();
      setAssessments(data);
      setAssessmentsLoaded(true);
    } catch { setAssessmentsError(true); toast.error("Failed to load AI assessment logs"); }
    finally { setAssessmentsLoading(false); }
  }

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    loadData();
  }, [user, isLoading, router, loadData]);

  useEffect(() => {
    if (tab === "match-history" && !allMatchesLoaded) loadAllMatches();
    if (tab === "ai-logs" && !assessmentsLoaded) loadAiLogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ── Match history helpers ──
  async function handleMatchHistoryFilter(status: string) {
    setMatchHistoryStatus(status);
    await loadAllMatches(status);
  }

  async function toggleMatchExpand(id: number) {
    if (matchExpandedId === id) { setMatchExpandedId(null); return; }
    setMatchExpandedId(id);
    if (!matchStatusHistory[id]) {
      setMatchHistoryLoadingId(id);
      try {
        const h = await adminGetMatchHistory(id);
        setMatchStatusHistory(prev => ({ ...prev, [id]: h }));
      } catch { toast.error("Failed to load history"); }
      finally { setMatchHistoryLoadingId(null); }
    }
  }

  // ── AI logs filtering ──
  const filteredAssessments = useMemo(() => {
    return assessments.filter(a => {
      if (aiRecFilter !== "ALL" && a.recommendation !== aiRecFilter) return false;
      if (aiFraudFilter !== "ALL" && a.fraudRisk !== aiFraudFilter) return false;
      if (aiSearch.trim()) {
        const q = aiSearch.toLowerCase();
        return (
          a.listingTitle?.toLowerCase().includes(q) ||
          a.recommendation?.toLowerCase().includes(q) ||
          a.evidenceNotes?.toLowerCase().includes(q) ||
          a.detectedLabels?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [assessments, aiRecFilter, aiFraudFilter, aiSearch]);

  // ── Approval queue handlers ──
  function openReject(id: number, type: RejectType) {
    setRejectId(id); setRejectType(type); setRejectReason("");
    setNeedsInfoId(null);
  }
  function cancelReject() { setRejectId(null); setRejectType(null); setRejectReason(""); }

  async function handleNeedsInformation(id: number) {
    if (!needsInfoNote.trim()) { toast.error("Please enter the information needed from the donor."); return; }
    setProcessing(id);
    try {
      await adminMarkListingNeedsInformation(id, needsInfoNote.trim());
      setListings(p => p.filter(l => l.id !== id));
      setNeedsInfoId(null); setNeedsInfoNote("");
      toast.success("Listing returned to donor for more information.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }

  async function handleApproveCampaign(id: number) {
    setProcessing(id);
    try {
      await approveCampaign(id);
      setCampaigns(p => p.filter(c => c.id !== id));
      toast.success("Campaign approved");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }
  async function handleRejectCampaign(id: number) {
    if (!rejectReason.trim()) { toast.error("Enter a rejection reason"); return; }
    setProcessing(id);
    try {
      await rejectCampaign(id, rejectReason.trim());
      setCampaigns(p => p.filter(c => c.id !== id));
      cancelReject(); toast.success("Campaign rejected");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }

  async function handleApproveListing(id: number) {
    setProcessing(id);
    try {
      await adminApproveItemListing(id);
      setListings(p => p.filter(l => l.id !== id));
      toast.success("Listing approved");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }
  async function handleRejectListing(id: number) {
    if (!rejectReason.trim()) { toast.error("Enter a rejection reason"); return; }
    setProcessing(id);
    try {
      await adminRejectItemListing(id, rejectReason.trim());
      setListings(p => p.filter(l => l.id !== id));
      cancelReject(); toast.success("Listing rejected");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }

  /**
   * Puts a rejected item back into circulation.
   *
   * <p>Reuses the existing admin approve endpoints — they already clear the
   * rejection reason and the `rejectedByAi` flag, notify the owner, and re-run
   * the matching engine, so nothing new is needed server-side.
   *
   * <p>The two sides differ and the difference matters: listing approve is
   * unguarded, but request approve throws BAD_REQUEST with a specific blocker
   * sentence when required verification is still outstanding. That message is
   * shown verbatim — an admin needs to know it is a missing document, not a
   * broken button, and a rejected request must NOT go live just because someone
   * disagrees with the AI.
   */
  async function handleReinstate() {
    if (!reinstateTarget) return;
    const { kind, id } = reinstateTarget;
    setReinstating(true);
    try {
      if (kind === "listing") {
        await adminApproveItemListing(id);
        setRejectedListings(p => p.filter(l => l.id !== id));
      } else {
        await adminApproveItemRequest(id);
        setRejectedRequests(p => p.filter(r => r.id !== id));
      }
      setReinstateTarget(null);
      toast.success("Back live — the owner has been notified.");
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reinstate this item");
    } finally {
      setReinstating(false);
    }
  }

  async function handleApproveMatch(id: number) {
    setProcessing(id);
    try {
      await adminApproveMatch(id);
      setMatches(p => p.filter(m => m.id !== id));
      toast.success("Match approved");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }
  async function handleRejectMatch(id: number) {
    if (!rejectReason.trim()) { toast.error("Enter a rejection reason"); return; }
    setProcessing(id);
    try {
      await adminRejectMatch(id, rejectReason.trim());
      setMatches(p => p.filter(m => m.id !== id));
      cancelReject(); toast.success("Match rejected");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setProcessing(null); }
  }

  if (isLoading) {
    return (
      // Admin runs on its own dark ground (#12101a), so the skeleton keeps that
      // background rather than the app's cream PageSkeleton.
      <div className="min-h-screen bg-[#12101a] px-4 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <DashboardSkeleton tiles={4} label="Loading the admin dashboard" />
        </div>
      </div>
    );
  }
  if (!user) return null;

  // Drive offers are monitor-only (the NGO accepts, the handover follows), so their
  // badge counts handovers under way and is not added to the admin's to-do total.
  const total = campaigns.length + requests.length + listings.length + matches.length + offersNeedingAction + ngoAwaiting
    + drivesPending + driveProofsPending;
  // "user-journey" belongs here too. Leaving it out meant that tab rendered its
  // own panel *and* the approval-queue feed underneath it, and put it on the
  // wrong side of the mobile nav split below.
  const isDriveTab = tab === "ngo-drives" || tab === "drive-offers" || tab === "drive-proofs";
  const isReportTab = tab === "match-history" || tab === "handover-photos" || tab === "ai-logs"
    || tab === "user-journey" || tab === "analytics" || tab === "fundraising" || tab === "sahas" || tab === "issues";
  const showIssues = canSeeTab("issues");

  const TABS = [
    { key: "campaigns" as TabKey, label: "Campaigns",    count: campaigns.length,   icon: Megaphone,     color: "#2f6fb0" },
    { key: "requests"  as TabKey, label: "Requests",     count: requests.length,    icon: ClipboardList,  color: "#60a5fa" },
    { key: "listings"  as TabKey, label: "Listings",     count: listings.length,    icon: Package,        color: "#a78bfa" },
    { key: "matches"   as TabKey, label: "Matches",      count: matches.length,     icon: Handshake,      color: "#34d399" },
    { key: "offers"    as TabKey, label: "Offers",       count: offersNeedingAction, icon: Gift,          color: "#f472b6" },
  ].filter(t => canSeeTab(t.key));

  // Everything NGO-related lives in its own group; capabilities still apply per tab.
  const NGO_TABS = [
    { key: "ngo-applications" as TabKey, label: "NGO Applications", count: ngoAwaiting, icon: Building2, color: "#34a578" },
    { key: "ngo-drives" as TabKey, label: "NGO Drives", count: drivesPending, icon: ClipboardList, color: "#2f8f6a" },
    { key: "drive-offers" as TabKey, label: "Drive Offers", count: driveOffersPending, icon: Gift, color: "#e05f9b" },
    { key: "drive-proofs" as TabKey, label: "Distribution Proofs", count: driveProofsPending, icon: Package, color: "#c98a1b" },
    { key: "ngo-activities" as TabKey, label: "Past activity", count: activitiesPending, icon: Camera, color: "#1e6b4f" },
    { key: "ngo-profile-changes" as TabKey, label: "Profile changes", count: profileChangesPending, icon: Building2, color: "#2f6f8f" },
  ].filter(t => canSeeTab(t.key));
  const ngoTotal = NGO_TABS.reduce((sum, t) => sum + t.count, 0);
  const ngoGroupOpen = ngoExpanded || NGO_TAB_KEYS.includes(tab);

  // Single source for the report destinations, consumed by both the desktop
  // sidebar and the mobile strip — the two were hand-duplicated before, which is
  // how "User Journey" ended up in one list and not the other.
  const REPORTS = [
    { key: "match-history" as TabKey, label: "Match History",     icon: Handshake,     color: "text-teal-400"   },
    { key: "handover-photos" as TabKey, label: "Handover Photo Log", icon: Camera,      color: "text-amber-400"  },
    { key: "ai-logs"       as TabKey, label: "AI Screening Logs", icon: Bot,           color: "text-violet-400" },
    { key: "user-journey"  as TabKey, label: "User Journey",      icon: UserRound,     color: "text-sky-400"    },
    { key: "analytics"     as TabKey, label: "Analytics",         icon: TrendingUp,    color: "text-amber-400"  },
  ].filter(t => canSeeTab(t.key));

  const headerTitle = tab === "issues" ? "Issues"
    : tab === "ngo-applications" ? "NGO Applications"
    : tab === "ngo-drives" ? "NGO Drives"
    : tab === "drive-offers" ? "Drive Offers"
    : tab === "drive-proofs" ? "Distribution Proofs"
    : tab === "ngo-activities" ? "Past activity"
    : tab === "ngo-profile-changes" ? "Profile changes"
    : tab === "match-history" ? "Match History"
    : tab === "handover-photos" ? "Handover Photo Log"
    : tab === "ai-logs" ? "AI Screening Logs"
    : tab === "user-journey" ? "User Journey"
    : tab === "analytics" ? "Analytics"
    : tab === "fundraising" ? "Fundraising"
    : tab === "sahas" ? "Sahas campaigns"
    : tab === "campaigns" ? "Campaigns"
    : tab === "requests" ? "Requests"
    : tab === "listings" ? "Listings"
    : tab === "matches" ? "Matches"
    : tab === "offers" ? "Offers"
    : "Approval Queue";

  const headerSubtitle = tab === "issues"
    ? `${openIssues} open · every problem report and support case, with its full story`
    : tab === "ngo-applications"
    ? `${ngoAwaiting} application${ngoAwaiting !== 1 ? "s" : ""} awaiting review · approval unlocks requests and drives`
    : tab === "ngo-drives"
    ? `${drivesPending} drive${drivesPending !== 1 ? "s" : ""} awaiting review · approval makes a drive live for donors`
    : tab === "drive-offers"
    ? `${driveOffersPending} donor offer${driveOffersPending !== 1 ? "s" : ""} to drives in handover · monitor only, the NGO accepts offers`
    : tab === "ngo-profile-changes"
    ? `${profileChangesPending} profile change${profileChangesPending !== 1 ? "s" : ""} awaiting review · approving updates the public page`
    : tab === "ngo-activities"
    ? `${activitiesPending} past-activit${activitiesPending !== 1 ? "ies" : "y"} awaiting review · approval shows it on the NGO's public page`
    : tab === "drive-proofs"
    ? `${driveProofsPending} distribution proof${driveProofsPending !== 1 ? "s" : ""} awaiting review · approval completes the drive`
    : tab === "handover-photos"
    ? "Every on-the-spot handover photo, with the full record of each donation"
    : tab === "match-history"
    ? `${allMatches.length} match${allMatches.length !== 1 ? "es" : ""} · complete lifecycle view`
    : tab === "user-journey"
    ? "One user's complete story — every step on record, from registration to today"
    : tab === "analytics"
    ? "Donation and campaign performance"
    : tab === "fundraising"
    ? "Applications, publication, updates and reports for donee fundraisers"
    : tab === "sahas"
    ? "Campaigns organised by Sahas Charitable Trust: items, publishing, offers and handovers"
    : tab === "ai-logs"
    ? `${assessments.length} assessment${assessments.length !== 1 ? "s" : ""} across all listings`
    : tab === "campaigns" && !loading
    ? (campaigns.length > 0 ? `${campaigns.length} campaign${campaigns.length !== 1 ? "s" : ""} waiting for approval` : "No campaigns waiting — switch to Approved or Rejected to see past decisions")
    : tab === "listings" && !loading
    ? (listings.length > 0 ? `${listings.length} donor listing${listings.length !== 1 ? "s" : ""} need review` : "No listings need review — switch view to see ones waiting on the donor or already approved")
    : tab === "matches" && !loading
    ? (matches.length > 0 ? `${matches.length} donor–donee match${matches.length !== 1 ? "es" : ""} waiting for approval` : "No matches waiting — switch view to follow ones in progress, completed or stopped")
    : tab === "offers" && !loading
    ? (offersNeedingAction > 0 ? `${offersNeedingAction} offer${offersNeedingAction !== 1 ? "s" : ""} waiting for your approval` : "Donor offers on requests — approve, follow and step in when a handover goes wrong")
    : tab === "requests" && !loading
    ? (requests.length > 0 ? `${requests.length} request${requests.length !== 1 ? "s" : ""} need verification` : "No requests need verification — use the filters to see held, verified or rejected ones")
    : loading ? "Loading..." : total > 0
      ? `${total} item${total !== 1 ? "s" : ""} awaiting your review`
      : offersInFlight > 0
      ? `Nothing needs action — ${offersInFlight} offer${offersInFlight !== 1 ? "s" : ""} in flight`
      : "All clear — nothing pending";

  // Sidebar content for StaffShell (desktop sidebar and the mobile drawer share it).
  // Groups: review queues, NGO operations, fundraising & Sahas, support, reports.
  const adminNav = (
    <div className="space-y-1">
      {TABS.length > 0 && (
        <StaffNavGroup title="Review queues">
          {TABS.map(({ key, label, count, icon }) => (
            <StaffNavItem key={key} label={label} icon={icon} count={count} active={tab === key} onClick={() => selectTab(key)} />
          ))}
        </StaffNavGroup>
      )}

      {showIssues && (
        <StaffNavGroup title="Support">
          <StaffNavItem label="Issues" icon={AlertTriangle} count={openIssues} countTone="danger" active={tab === "issues"}
            onClick={() => { selectTab("issues"); setIssueDeepLink(null); }} />
        </StaffNavGroup>
      )}

      {/* Always open (owner, 2026-11-20): no collapse toggle on the NGO group. */}
      {NGO_TABS.length > 0 && (
        <StaffNavGroup title="NGO operations">
          {NGO_TABS.map(({ key, label, count, icon }) => (
            <StaffNavItem key={key} label={label} icon={icon} count={count} active={tab === key} onClick={() => selectTab(key)} />
          ))}
        </StaffNavGroup>
      )}

      {(canSeeTab("fundraising") || (FEATURES.sahas && canSeeTab("sahas"))) && (
        <StaffNavGroup title="Fundraising &amp; Sahas">
          <AdminFundraisingNav variant="sidebar" allowed={canSeeTab("fundraising")} active={tab === "fundraising" ? frPath : null} onSelect={openFundraising} />
          {FEATURES.sahas && canSeeTab("sahas") && (
            <StaffNavItem label="Sahas campaigns" icon={Megaphone} active={tab === "sahas"} onClick={() => setTab("sahas")} />
          )}
        </StaffNavGroup>
      )}


      {REPORTS.length > 0 && (
        <StaffNavGroup title="Reports">
          {REPORTS.map(({ key, label, icon }) => (
            <StaffNavItem key={key} label={label} icon={icon} active={tab === key} onClick={() => selectTab(key)} />
          ))}
        </StaffNavGroup>
      )}
    </div>
  );


  return (
    <StaffShell
      consoleLabel="Admin"
      email={user.email ?? ""}
      onSignOut={() => { logout(); router.push("/login"); }}
      nav={adminNav}
      topbarStart={<StaffTopbarTitle label={headerTitle} hint={total > 0 ? `${total} waiting across your queues` : undefined} />}
      topbarEnd={
        <>
          {tab === "ai-logs" && (
            <button type="button" onClick={loadAiLogs} disabled={assessmentsLoading} className="ck-staff-icon-btn disabled:opacity-50" aria-label="Refresh AI screening logs">
              <RefreshCw className={`size-4 ${assessmentsLoading ? "animate-spin" : ""}`} aria-hidden />
            </button>
          )}
          {/* The site navbar (and its bell) is hidden on this page, so admins get the bell here. */}
          <span className="ck-staff-icon-btn !bg-white !text-[color:var(--st-text)]"><NotificationBell /></span>
        </>
      }
    >
        <PageHeader title={headerTitle} description={headerSubtitle} />

        {/* ── Cards feed ── */}
        <div className={`${tab === "ngo-applications" || tab === "ngo-drives" || tab === "issues" ? "max-w-6xl" : "max-w-5xl"} space-y-3 sm:space-y-4`}>

          {showIssues && (
            <Suspense fallback={null}><IssueLinkWatcher onOpen={openIssueLink} /></Suspense>
          )}

          {/* ── ISSUES — every problem report and support case, read-only ── */}
          {tab === "issues" && <IssuesPanel issueKey={issueDeepLink} onOpenCount={setOpenIssues} />}

          {/* ── DONATION OFFERS TAB — reuses the same panel as the standalone /admin/offers page ── */}
          {tab === "offers" && <OffersQueuePanel />}

          {/* ── NGO APPLICATIONS TAB — /admin/ngos redirects here. Approving
                 creates the NGO profile, which unlocks requests and drives. ── */}
          {tab === "ngo-applications" && <NgoReviewPanel initialApplicationId={ngoDeepLink} onDecision={loadNgoCount} />}
          {tab === "ngo-activities" && <NgoActivityModerationPanel onChange={loadDriveCounts} onCount={setActivitiesPending} />}
          {tab === "ngo-profile-changes" && <NgoProfileChangesPanel onChange={loadDriveCounts} />}

          {/* ── NGO DRIVE QUEUES ── */}
          {tab === "ngo-drives" && <NgoDriveReviewPanel onChange={loadDriveCounts} />}
{tab === "drive-offers" && <NgoDriveOffersPanel />}
          {tab === "drive-proofs" && <NgoDriveProofsPanel onChange={loadDriveCounts} />}

          {/* ── REQUESTS TAB — merged with Donee Verification: the tiered verification
                 queue (checklist, SLA, hold, documents) is the single review path,
                 so high-value requests can't be approved past the checklist. Same panel
                 as the standalone /admin/verifications page. ── */}
          {tab === "requests" && <VerificationQueuePanel />}

          {/* ── APPROVAL QUEUE TABS ── */}
          {!isReportTab && tab !== "offers" && tab !== "requests" && !isDriveTab && (
            loading ? (
              <div className="flex flex-col items-center justify-center py-28">
                <Loader2 className="w-8 h-8 animate-spin text-stone-300" />
                <p className="text-sm text-stone-400 mt-3">Loading queue...</p>
              </div>
            ) : (
              <>
                {tab === "campaigns" && (
                  <div className="mb-5 space-y-3">
                    <AdminStatusTabs label="Campaign status" selected={campaignView} onSelect={setCampaignView}
                      options={[{ label: `Pending (${campaigns.length})` }, { label: "Approved" }, { label: "Rejected" }]} />
                    <p className="text-xs text-stone-500">
                      Legacy money campaigns from donees. New fundraisers are reviewed under{" "}
                      <button type="button" className="font-semibold text-[#1f5592] underline underline-offset-2"
                        onClick={() => openFundraising("/admin/fundraising")}>Fundraising → Applications</button>.
                    </p>
                  </div>
                )}
                {tab === "campaigns" && campaignView === 1 && <CampaignHistoryList status="APPROVED" />}
                {tab === "campaigns" && campaignView === 2 && <CampaignHistoryList status="REJECTED" />}
                {tab === "campaigns" && campaignView === 0 && (
                  campaigns.length === 0
                    ? <AllClearState label="No pending campaigns" />
                    : campaigns.map(c => (
                      <ApprovalCard
                        key={c.id} id={c.id}
                        title={c.title}
                        meta={[c.doneeName, `${c.city}${c.state ? `, ${c.state}` : ""}`, c.category, `Goal ${formatINR(c.targetAmount)}`].filter(Boolean).join(" · ")}
                        description={c.description}
                        isRejecting={rejectId === c.id && rejectType === "campaign"}
                        rejectReason={rejectReason} setRejectReason={setRejectReason}
                        processing={processing}
                        onApprove={() => handleApproveCampaign(c.id)}
                        onOpenReject={() => openReject(c.id, "campaign")}
                        onConfirmReject={() => handleRejectCampaign(c.id)}
                        onCancelReject={cancelReject}
                      />
                    ))
                )}

                {tab === "listings" && (
                  <div className="mb-5">
                    <AdminStatusTabs label="Listing status" selected={listingView} onSelect={setListingView}
                      options={[{ label: `Needs review (${listings.length})` }, { label: "Waiting on donor" }, { label: "Approved" }]} />
                  </div>
                )}
                {tab === "listings" && listingView === 1 && <ListingHistoryList status="NEEDS_INFORMATION" />}
                {tab === "listings" && listingView === 2 && <ListingHistoryList status="ELIGIBLE_FOR_MATCHING" />}
                {tab === "listings" && listingView === 0 && (
                  <RejectedReviewSection
                    listings={rejectedListings}
                    requests={rejectedRequests}
                    onReinstate={(kind, id, title) => setReinstateTarget({ kind, id, title })}
                  />
                )}

                {tab === "listings" && listingView === 0 && (
                  listings.length === 0
                    ? <AllClearState label="No pending item listings" />
                    : listings.map(l => (
                      <ListingApprovalCard
                        key={l.id}
                        listing={l}
                        isRejecting={rejectId === l.id && rejectType === "listing"}
                        rejectReason={rejectReason} setRejectReason={setRejectReason}
                        processing={processing}
                        needsInfoId={needsInfoId} needsInfoNote={needsInfoNote}
                        setNeedsInfoNote={setNeedsInfoNote}
                        onApprove={() => handleApproveListing(l.id)}
                        onOpenReject={() => openReject(l.id, "listing")}
                        onConfirmReject={() => handleRejectListing(l.id)}
                        onCancelReject={cancelReject}
                        onOpenNeedsInfo={() => { setNeedsInfoId(l.id); setNeedsInfoNote(""); setRejectId(null); }}
                        onConfirmNeedsInfo={() => handleNeedsInformation(l.id)}
                        onCancelNeedsInfo={() => { setNeedsInfoId(null); setNeedsInfoNote(""); }}
                        onOpenDetails={() => setDetailSelection({ type: "listing", item: l })}
                        reviewSlot={
                          <AiReviewPanel
                            entity="listing"
                            id={l.id}
                            onUseReason={(reason) => {
                              setRejectId(l.id);
                              setRejectType("listing");
                              setRejectReason(reason);
                              setNeedsInfoId(null);
                            }}
                            onUseNeedsInfo={(reason) => {
                              setNeedsInfoId(l.id);
                              setNeedsInfoNote(reason);
                              setRejectId(null);
                              setRejectType(null);
                            }}
                          />
                        }
                      />
                    ))
                )}

                {tab === "matches" && (
                  <div className="mb-5">
                    <AdminStatusTabs label="Match status" selected={matchView} onSelect={setMatchView}
                      options={[{ label: `Needs approval (${matches.length})` }, { label: "In progress" }, { label: "Completed" }, { label: "Rejected / cancelled" }]} />
                  </div>
                )}
                {tab === "matches" && matchView === 1 && <MatchHistoryList view="ACTIVE" />}
                {tab === "matches" && matchView === 2 && <MatchHistoryList view="DONE" />}
                {tab === "matches" && matchView === 3 && <MatchHistoryList view="STOPPED" />}
                {tab === "matches" && matchView === 0 && (
                  matches.length === 0
                    ? <AllClearState label="No matches waiting for approval" />
                    : matches.map(m => (
                      <ApprovalCard
                        key={m.id} id={m.id}
                        title={
                          m.matchType === "DONATE_TO_REQUEST"
                            ? `${m.donorName} wants to donate for "${m.requestTitle ?? ""}"`
                            : `${m.doneeName ?? ""} requested "${m.listingTitle ?? ""}"`
                        }
                        meta={`Donor: ${m.donorName} (${m.donorCity ?? "—"}) · Donee: ${m.doneeName ?? "—"} (${m.doneeCity ?? "—"})`}
                        description={m.donorItemDescription ?? m.doneeReason}
                        badge={m.matchScore != null ? `AI ${m.matchScore.toFixed(0)}%` : undefined}
                        isRejecting={rejectId === m.id && rejectType === "match"}
                        rejectReason={rejectReason} setRejectReason={setRejectReason}
                        processing={processing}
                        onApprove={() => handleApproveMatch(m.id)}
                        onOpenReject={() => openReject(m.id, "match")}
                        onConfirmReject={() => handleRejectMatch(m.id)}
                        onCancelReject={cancelReject}
                        onOpenDetails={() => setDetailSelection({ type: "match", item: m })}
                      />
                    ))
                )}
              </>
            )
          )}

          {/* ── HANDOVER PHOTO LOG (2026-10-08) ── */}
          {tab === "handover-photos" && <HandoverPhotoLog />}

          {/* ── MATCH HISTORY TAB ── */}
          {tab === "match-history" && (
            <div className="space-y-3 sm:space-y-4">
              {/* Status filter */}
              <div className="flex flex-wrap gap-2">
                {ALL_MATCH_STATUSES.map(s => (
                  <button key={s} onClick={() => handleMatchHistoryFilter(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      matchHistoryStatus === s
                        ? "bg-[#1f5592] text-white border-[#1f5592]"
                        : "bg-white border-stone-200 text-stone-600 hover:border-[#1f5592]/50"
                    }`}>
                    {matchStatusLabel(s)}
                  </button>
                ))}
              </div>

              {allMatchesLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-stone-400" /></div>
              ) : allMatchesError ? (
                <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                  <p className="text-sm font-semibold text-red-700">Couldn&apos;t load match history.</p>
                  <button onClick={() => loadAllMatches(matchHistoryStatus)} className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white">Retry</button>
                </div>
              ) : allMatches.length === 0 ? (
                <p className="text-center py-20 text-stone-400">No matches found for this filter.</p>
              ) : (
                allMatches.map(m => (
                  <MatchHistoryCard
                    key={m.id}
                    match={m}
                    expanded={matchExpandedId === m.id}
                    onToggle={() => toggleMatchExpand(m.id)}
                    history={matchStatusHistory[m.id]}
                    historyLoading={matchHistoryLoadingId === m.id}
                  />
                ))
              )}
            </div>
          )}

          {/* ── AI LOGS TAB ── */}
          {tab === "ai-logs" && (
            <div className="space-y-3 sm:space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Approve", value: assessments.filter(a => a.recommendation === "APPROVE").length, color: "emerald", apply: () => { setAiRecFilter("APPROVE"); setAiFraudFilter("ALL"); } },
                  { label: "Reject", value: assessments.filter(a => a.recommendation === "REJECT").length, color: "red", apply: () => { setAiRecFilter("REJECT"); setAiFraudFilter("ALL"); } },
                  { label: "Manual Review", value: assessments.filter(a => a.recommendation === "MANUAL_REVIEW").length, color: "orange", apply: () => { setAiRecFilter("MANUAL_REVIEW"); setAiFraudFilter("ALL"); } },
                  { label: "High Fraud Risk", value: assessments.filter(a => a.fraudRisk === "HIGH").length, color: "rose", apply: () => { setAiRecFilter("ALL"); setAiFraudFilter("HIGH"); } },
                ].map(({ label, value, color, apply }) => (
                  // The cards were dead numbers; clicking one now applies the matching filter.
                  <button key={label} type="button" onClick={apply} className="text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f5592]/40">
                    <AiStatCard label={label} value={value} color={color} />
                  </button>
                ))}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                  <input
                    placeholder="Search listing, notes, labels…"
                    value={aiSearch}
                    onChange={e => setAiSearch(e.target.value)}
                    className="pl-8 pr-3 h-8 w-56 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1f5592]/30 focus:border-[#1f5592]/50"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {AI_REC_FILTERS.map(f => (
                    <button key={f} onClick={() => setAiRecFilter(f)}
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                        aiRecFilter === f ? "bg-[#1f5592] text-white border-[#1f5592]" : "border-stone-300 text-stone-600 hover:border-[#1f5592]/50"
                      }`}>
                      {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase().replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  {["ALL", "HIGH", "MEDIUM", "LOW"].map(f => (
                    <button key={f} onClick={() => setAiFraudFilter(f)}
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                        aiFraudFilter === f ? "bg-stone-800 text-white border-stone-800" : "border-stone-300 text-stone-600 hover:border-stone-500"
                      }`}>
                      {f === "ALL" ? "Any fraud risk" : `Fraud: ${f.charAt(0) + f.slice(1).toLowerCase()}`}
                    </button>
                  ))}
                </div>
                {(aiRecFilter !== "ALL" || aiFraudFilter !== "ALL" || aiSearch) && (
                  <button className="text-xs text-stone-400 hover:text-stone-600 underline"
                    onClick={() => { setAiRecFilter("ALL"); setAiFraudFilter("ALL"); setAiSearch(""); }}>
                    Clear filters
                  </button>
                )}
                <span className="ml-auto text-xs text-stone-400">{filteredAssessments.length} result{filteredAssessments.length !== 1 ? "s" : ""}</span>
              </div>

              {assessmentsLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-stone-400" /></div>
              ) : assessmentsError ? (
                <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                  <p className="text-sm font-semibold text-red-700">Couldn&apos;t load AI screening logs.</p>
                  <button onClick={loadAiLogs} className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white">Retry</button>
                </div>
              ) : filteredAssessments.length === 0 ? (
                <p className="py-20 text-center text-stone-400">No AI assessments found.</p>
              ) : (
                filteredAssessments.map(a => (
                  <AiLogCard
                    key={a.id}
                    assessment={a}
                    expanded={aiExpandedId === a.id}
                    onToggle={() => setAiExpandedId(id => id === a.id ? null : a.id)}
                  />
                ))
              )}
            </div>
          )}

          {/* ── USER JOURNEY TAB ── */}
          {tab === "user-journey" && (
            <UserJourneyPanel initialUserId={journeyUserId} />
          )}

          {/* ── ANALYTICS TAB — previously the standalone /admin/analytics page ── */}
          {tab === "analytics" && <AnalyticsPanel />}


          {/* ── FUNDRAISING — the /admin/fundraising pages, rendered in the panel ── */}
          {tab === "fundraising" && <AdminFundraisingPanel path={frPath} go={setFrPath} />}

          {/* ── SAHAS CAMPAIGNS (2026-11-03) ── */}
          {tab === "sahas" && <AdminSahasPanel />}
        </div>

        <ApprovalDetailDrawer
          selection={detailSelection}
          onClose={() => setDetailSelection(null)}
        />

        {/* Reinstate confirmation. Deliberately not a one-click action: this
            republishes something that was blocked for a stated safety reason. */}
        {reinstateTarget && (
          <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="reinstate-title">
            <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl dark:bg-zinc-900">
              <h2 id="reinstate-title" className="text-sm font-black text-stone-900 dark:text-stone-100">
                Put this back live?
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
                &ldquo;{reinstateTarget.title}&rdquo; will become visible to the matching engine again,
                its rejection will be cleared, and the owner will be notified.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setReinstateTarget(null)}
                  disabled={reinstating}
                  className="flex-1 rounded-xl border border-stone-300 py-2 text-xs font-bold text-stone-600 disabled:opacity-50 dark:border-zinc-700 dark:text-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReinstate}
                  disabled={reinstating}
                  className="flex-1 rounded-xl bg-green-600 py-2 text-xs font-black text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {reinstating ? "Working…" : "Make live again"}
                </button>
              </div>
            </div>
          </div>
        )}
    </StaffShell>
  );
}

// ── Match History Card ────────────────────────────────────────────────────────

function MatchHistoryCard({ match: m, expanded, onToggle, history, historyLoading }: {
  match: ItemMatch;
  expanded: boolean;
  onToggle: () => void;
  history?: StatusHistoryEntry[];
  historyLoading: boolean;
}) {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-3 sm:p-4 cursor-pointer hover:bg-stone-50 transition" onClick={onToggle}>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[m.status] ?? "bg-stone-100 text-stone-700"}`}>
              {formatEnum(m.status)}
            </span>
            {m.matchScore != null && <span className="text-xs text-stone-500">AI Score: <strong>{m.matchScore}%</strong></span>}
            <span className="text-xs text-stone-400">#{m.id}</span>
            {m.deliveryOtpVerified && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">OTP Verified</span>}
          </div>
          <p className="font-semibold text-sm">{m.requestTitle || m.listingTitle || "Unnamed match"}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-stone-500">
            <span>Donor: <strong className="text-stone-700">{m.donorName}</strong>{m.donorCity && ` · ${m.donorCity}`}</span>
            <span>Donee: <strong className="text-stone-700">{m.doneeName}</strong>{m.doneeCity && ` · ${m.doneeCity}`}</span>
            {/* en-IN numeric read "9/10/2026" — ambiguous between 9 Oct and 10 Sep. */}
            <span>Created: {serverDate(m.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            {m.donorId != null && m.donorId === m.doneeId && (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 font-bold text-rose-700 ring-1 ring-rose-200">⚑ Same account is donor and donee</span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-stone-400 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-stone-400 shrink-0 mt-1" />}
      </div>

      {expanded && (
        <div className="border-t p-3 sm:p-4 space-y-3 sm:space-y-4 bg-stone-50">
          {/* Contacts */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Donor Contact", name: m.donorName, contact: m.donorContact, city: m.donorCity },
              { label: "Donee Contact", name: m.doneeName, contact: m.doneeContact, city: m.doneeCity },
            ].map(({ label, name, contact, city }) => (
              <div key={label} className="bg-white rounded-xl p-3 text-xs space-y-1 border border-stone-100">
                <p className="font-bold text-stone-700 flex items-center gap-1"><Phone className="w-3 h-3" /> {label}</p>
                <p>{name}</p>
                <p className="font-semibold text-[#1f5592]">{contact ?? "—"}</p>
                <p className="text-stone-400">{city}</p>
              </div>
            ))}
          </div>

          {/* Item description */}
          {m.donorItemDescription && (
            <div className="bg-white rounded-xl p-3 text-xs border border-stone-100">
              <p className="font-bold mb-1 flex items-center gap-1"><Package className="w-3 h-3" /> Item Description</p>
              <p className="text-stone-600">{m.donorItemDescription}</p>
              {m.doneeReason && <p className="mt-2 text-stone-500"><span className="font-semibold">Donee reason:</span> {m.doneeReason}</p>}
            </div>
          )}

          {/* Logistics */}
          {m.handoverMethod && (
            <div className="bg-white rounded-xl p-3 text-xs border border-stone-100">
              <p className="font-bold mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> Logistics</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-stone-600">
                <div><span className="text-stone-400">Method: </span><strong>{formatEnum(m.handoverMethod)}</strong></div>
                {m.pickupDateTime && <div><span className="text-stone-400">Pickup: </span><strong>{serverDate(m.pickupDateTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</strong></div>}
                {m.handoverAddress && <div className="col-span-2"><span className="text-stone-400">Pickup address: </span><strong>{m.handoverAddress}</strong></div>}
                {m.deliveryAddress && <div className="col-span-2"><span className="text-stone-400">Delivery address: </span><strong>{m.deliveryAddress}</strong></div>}
                {m.allocatedQuantity && <div><span className="text-stone-400">Quantity: </span><strong>{m.allocatedQuantity}</strong></div>}
              </div>
            </div>
          )}

          {/* Status history timeline */}
          <div>
            <p className="text-xs font-bold mb-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Status History</p>
            {historyLoading ? (
              <div className="flex justify-center py-3 sm:py-4"><Loader2 className="w-4 h-4 animate-spin text-stone-400" /></div>
            ) : !history || history.length === 0 ? (
              <p className="text-xs text-stone-400">No history recorded yet.</p>
            ) : (
              <ol className="relative border-l border-stone-200 ml-2 space-y-3">
                {history.map((h, i) => (
                  <li key={i} className="ml-4">
                    <div className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-[#1f5592]" />
                    <p className="text-xs text-stone-400">{serverDate(h.changedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                    <p className="text-xs font-semibold">
                      <span className="text-stone-400">{formatEnum(h.fromStatus)} → </span>
                      <span className={`${STATUS_COLORS[h.toStatus] ?? ""} px-1.5 py-0.5 rounded`}>{formatEnum(h.toStatus)}</span>
                    </p>
                    <p className="text-xs text-stone-400">{h.changedByEmail}{h.note ? ` · ${h.note}` : ""}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ── AI Log Card ───────────────────────────────────────────────────────────────

function AiLogCard({ assessment: a, expanded, onToggle }: {
  assessment: AiAssessmentResponse;
  expanded: boolean;
  onToggle: () => void;
}) {
  const recBadge = REC_BADGE[a.recommendation] ?? "bg-stone-100 text-stone-700 border-stone-300";
  const fraudBadge = a.fraudRisk ? (FRAUD_BADGE[a.fraudRisk] ?? "") : "";

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      <button className="w-full text-left p-3 sm:p-4 hover:bg-stone-50 transition" onClick={onToggle}>
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Bot className="h-4 w-4 text-violet-400 shrink-0" />
            <span className="font-medium text-sm truncate">{a.listingTitle || `Listing #${a.listingId}`}</span>
            <span className="text-xs text-stone-400">#{a.listingId}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${recBadge}`}>
              {formatEnum(a.recommendation)}
            </span>
            {a.fraudRisk && (
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${fraudBadge}`}>
                Fraud: {a.fraudRisk}
              </span>
            )}
            <span className="text-2xs text-stone-400">{Math.round(a.confidence)}% conf</span>
            {/* Bare toLocaleDateString() printed "10/9/2026" — browser-locale and ambiguous. */}
            <span className="text-2xs text-stone-400">{serverDate(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
        </div>
        {a.evidenceNotes && (
          <p className="mt-1.5 text-xs text-stone-500 line-clamp-1 text-left">{a.evidenceNotes}</p>
        )}
      </button>

      {expanded && (
        <div className="border-t px-4 py-3 bg-stone-50 space-y-3">
          {/* Score bars */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <MiniBar label="Confidence" value={a.confidence} color="bg-violet-500" />
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {a.eligibilityResult && <InfoCell label="Eligibility" value={a.eligibilityResult} />}
            {a.conditionGrade && <InfoCell label="Condition Grade" value={a.conditionGrade} />}
            {a.modelVersion && <InfoCell label="Model" value={a.modelVersion} />}
            {a.listingStatus && <InfoCell label="Listing Status" value={formatEnum(a.listingStatus) ?? ""} />}
          </div>

          {/* Donor + origin */}
          <div className="rounded-xl border border-stone-200 bg-white p-3">
            <p className="text-3xs font-semibold uppercase tracking-wide text-stone-400 mb-1.5">Submitted by</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1f5592]/10 text-sm font-black text-[#1f5592]">
                  {a.donorName?.charAt(0)?.toUpperCase() ?? "?"}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">{a.donorName ?? "Unknown donor"}</span>
                  <span className="block truncate text-2xs text-stone-500">{a.donorEmail ?? "—"}</span>
                </span>
              </div>
              <div className="text-right text-2xs text-stone-500">
                <span className="block">{[a.locality, a.city].filter(Boolean).join(", ") || "Location not given"}</span>
                {a.pincode && <span className="block">PIN {a.pincode}</span>}
              </div>
            </div>
            {a.donorId && (
              <a
                href={`/admin/dashboard?journeyUser=${a.donorId}`}
                className="mt-2 inline-block text-2xs font-semibold text-[#1f5592] hover:underline"
              >
                View donor&apos;s full journey →
              </a>
            )}
          </div>

          {/* What the donor submitted */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {a.category && <InfoCell label="Category" value={a.subcategory ? `${a.category} / ${a.subcategory}` : a.category} />}
            {a.condition && <InfoCell label="Condition (stated)" value={a.condition} />}
            {a.workingStatus && <InfoCell label="Working Status" value={a.workingStatus} />}
          </div>
          {a.knownDefects && (
            <p className="text-xs text-stone-600"><span className="text-stone-400">Known defects: </span>{a.knownDefects}</p>
          )}
          {a.description && (
            <p className="text-xs text-stone-600"><span className="text-stone-400">Description: </span>{a.description}</p>
          )}

          {/* Photos the AI assessed — click any thumbnail for a full-size preview */}
          {a.images && a.images.length > 0 && <PhotoStrip images={a.images} label="Photos assessed" />}

          {a.evidenceNotes && <p className="text-xs italic text-stone-600">{a.evidenceNotes}</p>}

          {a.detectedLabels && (
            <div>
              <p className="text-3xs font-semibold uppercase tracking-wide text-stone-400 mb-1">Detected labels</p>
              <div className="flex flex-wrap gap-1">
                {a.detectedLabels.split(",").map((lbl, i) => (
                  <span key={i} className="rounded-full bg-white border border-stone-200 px-2 py-0.5 text-2xs text-stone-600">{lbl.trim()}</span>
                ))}
              </div>
            </div>
          )}

          {a.moderationLabels && (
            <div>
              <p className="text-3xs font-semibold uppercase tracking-wide text-red-400 mb-1">Moderation labels</p>
              <div className="flex flex-wrap gap-1">
                {a.moderationLabels.split(",").map((lbl, i) => (
                  <span key={i} className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-2xs text-red-600">{lbl.trim()}</span>
                ))}
              </div>
            </div>
          )}

          {a.missingInfoFlags && (
            <p className="text-xs text-amber-700"><span className="font-semibold">Missing info: </span>{a.missingInfoFlags}</p>
          )}
          {a.safetyWarnings && (
            <p className="text-xs text-red-700"><span className="font-semibold">Safety: </span>{a.safetyWarnings}</p>
          )}

          <p className="text-3xs text-stone-400 pt-1">Assessed {serverDate(a.createdAt).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="flex justify-between text-3xs text-stone-500 mb-0.5">
        <span>{label}</span><span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-stone-400">{label}: </span>
      <span className="font-medium text-stone-700">{value}</span>
    </div>
  );
}

function AiStatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const styles: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    red: "bg-red-50 border-red-200 text-red-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    rose: "bg-rose-50 border-rose-200 text-rose-700",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${styles[color] ?? ""}`}>
      <p className="text-lg sm:text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

// ── Reusable approval card ────────────────────────────────────────────────────

interface ApprovalCardProps {
  id: number;
  title: string;
  meta: string;
  description?: string | null;
  badge?: string;
  isRejecting: boolean;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  processing: number | null;
  onApprove: () => void;
  onOpenReject: () => void;
  onConfirmReject: () => void;
  onCancelReject: () => void;
  onOpenDetails?: () => void;
  reviewSlot?: ReactNode;
}

function ApprovalCard({
  id, title, meta, description, badge,
  isRejecting, rejectReason, setRejectReason,
  processing, onApprove, onOpenReject, onConfirmReject, onCancelReject,
  onOpenDetails, reviewSlot,
}: ApprovalCardProps) {
  const clickable = Boolean(onOpenDetails);

  return (
    <div
      className={`group bg-white rounded-xl sm:rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:-translate-y-px transition-all overflow-hidden ${
        clickable ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f5592]/40 focus-visible:ring-offset-2" : ""
      }`}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onOpenDetails}
      onKeyDown={clickable ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDetails?.();
        }
      } : undefined}
    >
      <div className="flex">
        <div className="flex-1 min-w-0 p-3.5 sm:p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-stone-900 leading-snug">{title}</p>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">{meta}</p>
            </div>
            {badge && (
              <span className="shrink-0 text-3xs font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                {badge}
              </span>
            )}
          </div>

          {description && <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed">{description}</p>}

          {reviewSlot}

          {isRejecting ? (
            <div className="space-y-2.5 pt-1" onClick={event => event.stopPropagation()}>
              <input
                autoFocus value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                onKeyDown={e => {
                  e.stopPropagation();
                  if (e.key === "Enter") onConfirmReject();
                }}
                placeholder="Reason for rejection..."
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 transition-all"
              />
              <div className="flex gap-2">
                <button onClick={onConfirmReject} disabled={processing === id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm">
                  {processing === id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4" /> Confirm Reject</>}
                </button>
                <button onClick={onCancelReject}
                  className="px-4 py-2 text-sm font-semibold text-stone-500 hover:text-stone-800 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-1" onClick={event => event.stopPropagation()}>
              <button onClick={onApprove} disabled={processing !== null}
                className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2 text-sm font-bold rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-sm text-white"
                style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
                {processing === id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Approve</>}
              </button>
              <button onClick={onOpenReject} disabled={processing !== null}
                className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2 bg-red-50 text-red-700 border border-red-200 text-sm font-bold rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors">
                <X className="w-4 h-4" /> Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Full listing card ─────────────────────────────────────────────────────────

interface ListingApprovalCardProps {
  listing: ItemListing;
  isRejecting: boolean;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  processing: number | null;
  needsInfoId: number | null;
  needsInfoNote: string;
  setNeedsInfoNote: (v: string) => void;
  onApprove: () => void;
  onOpenReject: () => void;
  onConfirmReject: () => void;
  onCancelReject: () => void;
  onOpenNeedsInfo: () => void;
  onConfirmNeedsInfo: () => void;
  onCancelNeedsInfo: () => void;
  onOpenDetails?: () => void;
  reviewSlot?: ReactNode;
}

function ListingApprovalCard({
  listing: l,
  isRejecting, rejectReason, setRejectReason,
  processing, needsInfoId, needsInfoNote, setNeedsInfoNote,
  onApprove, onOpenReject, onConfirmReject, onCancelReject,
  onOpenNeedsInfo, onConfirmNeedsInfo, onCancelNeedsInfo,
  onOpenDetails, reviewSlot,
}: ListingApprovalCardProps) {
  const photos = listingPhotos(l);
  const clickable = Boolean(onOpenDetails);

  return (
    <div
      className={`group bg-white rounded-xl sm:rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:-translate-y-px transition-all overflow-hidden ${
        clickable ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f5592]/40 focus-visible:ring-offset-2" : ""
      }`}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onOpenDetails}
      onKeyDown={clickable ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDetails?.();
        }
      } : undefined}
    >
      <div className="flex">
        <div className="flex-1 min-w-0 p-3.5 sm:p-5 space-y-3">

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-stone-900 leading-snug">{l.title}</p>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                {[l.donorName, l.city, l.category, l.subcategory && `/ ${l.subcategory}`, l.condition, l.brand, l.model && l.model, `Qty ${l.quantity}`].filter(Boolean).join(" · ")}
              </p>
            </div>
            <span className={`shrink-0 text-3xs font-black px-2.5 py-1 rounded-full whitespace-nowrap border ${
              l.status === "MANUAL_REVIEW"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-stone-100 text-stone-500 border-stone-200"
            }`}>
              {l.status === "MANUAL_REVIEW" ? "⚠ Manual Review" : "Submitted"}
            </span>
          </div>

          {photos.length > 0 && (
            <div onClick={event => event.stopPropagation()}>
              <PhotoStrip images={photos} />
            </div>
          )}

          {/* Submitted by */}
          <div className="rounded-xl border border-stone-200 bg-white p-3">
            <p className="text-3xs font-semibold uppercase tracking-wide text-stone-400 mb-1.5">Submitted by</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1f5592]/10 text-sm font-black text-[#1f5592]">
                  {l.donorName?.charAt(0)?.toUpperCase() ?? "?"}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">{l.donorName ?? "Unknown donor"}</span>
                  <span className="block truncate text-2xs text-stone-500">{l.donorEmail ?? "—"}</span>
                </span>
              </div>
              <div className="text-right text-2xs text-stone-500">
                <span className="block">{[l.locality, l.city].filter(Boolean).join(", ") || "Location not given"}</span>
                {l.pincode && <span className="block">PIN {l.pincode}</span>}
              </div>
            </div>
            {l.donorId && (
              <a
                href={`/admin/dashboard?journeyUser=${l.donorId}`}
                onClick={event => event.stopPropagation()}
                className="mt-2 inline-block text-2xs font-semibold text-[#1f5592] hover:underline"
              >
                View donor&apos;s full journey →
              </a>
            )}
          </div>

          {(l.approximateAge || l.workingStatus || l.dimensions || l.approximateWeight || l.locality || l.pincode) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-stone-50 rounded-xl p-3">
              {l.approximateAge    && <div><span className="text-stone-400">Item age: </span><span className="font-semibold text-stone-700">{l.approximateAge}</span></div>}
              {l.workingStatus     && <div><span className="text-stone-400">Working: </span><span className="font-semibold text-stone-700">{formatEnum(l.workingStatus)}</span></div>}
              {l.dimensions        && <div><span className="text-stone-400">Size: </span><span className="font-semibold text-stone-700">{l.dimensions}</span></div>}
              {l.approximateWeight && <div><span className="text-stone-400">Weight: </span><span className="font-semibold text-stone-700">{l.approximateWeight}</span></div>}
              {l.locality          && <div><span className="text-stone-400">Locality: </span><span className="font-semibold text-stone-700">{l.locality}</span></div>}
              {l.pincode           && <div><span className="text-stone-400">PIN: </span><span className="font-semibold text-stone-700">{l.pincode}</span></div>}
            </div>
          )}

          {l.knownDefects && l.knownDefects !== "NONE" && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm">
              <span className="font-bold text-amber-700">Known defects: </span>
              <span className="text-stone-700">{l.knownDefects}</span>
            </div>
          )}

          {l.description && <p className="text-sm text-stone-500 leading-relaxed">{l.description}</p>}

          {l.declarationsAccepted && (
            <p className="text-xs text-emerald-600 font-bold">✓ All mandatory declarations accepted by donor</p>
          )}

          {reviewSlot}

          {isRejecting ? (
            <div className="space-y-2.5 pt-1" onClick={event => event.stopPropagation()}>
              <input
                autoFocus value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                onKeyDown={e => {
                  e.stopPropagation();
                  if (e.key === "Enter") onConfirmReject();
                }}
                placeholder="Reason for rejection..."
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 transition-all"
              />
              <div className="flex gap-2">
                <button onClick={onConfirmReject} disabled={processing === l.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm">
                  {processing === l.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4" /> Confirm Reject</>}
                </button>
                <button onClick={onCancelReject}
                  className="px-4 py-2 text-sm font-semibold text-stone-500 hover:text-stone-800 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : needsInfoId === l.id ? (
            <div className="space-y-2.5 pt-1" onClick={event => event.stopPropagation()}>
              <input
                autoFocus value={needsInfoNote} onChange={e => setNeedsInfoNote(e.target.value)}
                onKeyDown={e => e.stopPropagation()}
                placeholder="e.g. Please upload clearer photos of the defect area"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-all"
              />
              <div className="flex gap-2">
                <button onClick={onConfirmNeedsInfo} disabled={processing === l.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm">
                  {processing === l.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><MessageSquare className="w-4 h-4" /> Send to Donor</>}
                </button>
                <button onClick={onCancelNeedsInfo}
                  className="px-4 py-2 text-sm font-semibold text-stone-500 hover:text-stone-800 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1" onClick={event => event.stopPropagation()}>
              <button onClick={onApprove} disabled={processing !== null}
                className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2 text-sm font-bold rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-sm text-white"
                style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
                {processing === l.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Approve</>}
              </button>
              <button onClick={onOpenNeedsInfo} disabled={processing !== null}
                className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2 bg-amber-50 text-amber-700 border border-amber-200 text-sm font-bold rounded-xl hover:bg-amber-100 disabled:opacity-50 transition-colors">
                <MessageSquare className="w-4 h-4" /> Needs Info
              </button>
              <button onClick={onOpenReject} disabled={processing !== null}
                className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2 bg-red-50 text-red-700 border border-red-200 text-sm font-bold rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors">
                <X className="w-4 h-4" /> Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Approval detail drawer ───────────────────────────────────────────────────

function ApprovalDetailDrawer({
  selection,
  onClose,
}: {
  selection: DetailSelection | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!selection) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handler);
    };
  }, [selection, onClose]);

  if (!selection) return null;

  const title = selection.type === "match"
    ? (selection.item.requestTitle ?? selection.item.listingTitle ?? `Match #${selection.item.id}`)
    : selection.item.title;
  const ownerLabel = selection.type === "request"
    ? selection.item.doneeName
    : selection.type === "listing"
      ? selection.item.donorName
      : `${selection.item.donorName ?? "Donor"} → ${selection.item.doneeName ?? "Donee"}`;
  const kindLabel = selection.type === "request"
    ? "Item Request"
    : selection.type === "listing"
      ? "Item Listing"
      : "Match Details";
  const drawerWidth = selection.type === "match" ? "sm:w-[680px]" : "sm:w-[520px]";

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" onClick={onClose}>
      <aside
        className={`absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:max-h-full ${drawerWidth} sm:rounded-none`}
        onClick={event => event.stopPropagation()}
        aria-modal="true"
        role="dialog"
        aria-labelledby="approval-detail-title"
      >
        <div className="flex items-start justify-between gap-3 sm:gap-4 border-b border-stone-100 px-3.5 sm:px-5 py-3 sm:py-4">
          <div className="min-w-0">
            <p className="text-3xs font-black uppercase tracking-widest text-[#1f5592]">{kindLabel}</p>
            <h2 id="approval-detail-title" className="mt-1 truncate text-base sm:text-lg font-black leading-tight text-stone-900">
              {title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill value={selection.item.status} />
              <span className="text-xs font-semibold text-stone-400">{ownerLabel}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition hover:bg-stone-200 hover:text-stone-800"
            aria-label="Close details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {selection.type === "request" && <RequestDetailContent request={selection.item} />}
          {selection.type === "listing" && <ListingDetailContent listing={selection.item} />}
          {selection.type === "match" && <MatchDetailContent match={selection.item} />}
        </div>
      </aside>
    </div>
  );
}

function RequestDetailContent({ request: r }: { request: ItemRequest }) {
  const photos = r.imageUrl ? [r.imageUrl] : [];

  return (
    <>
      <SectionPhotoStrip photos={photos} />

      <DetailSection icon={UserRound} title="Requester">
        <DetailGrid
          items={[
            { label: "Name", value: r.doneeName },
            { label: "Donee ID", value: r.doneeId },
            { label: "Created", value: formatDateTime(r.createdAt) },
          ]}
        />
      </DetailSection>

      <DetailSection icon={Package} title="Request Details">
        <DetailGrid
          items={[
            { label: "Category", value: r.category },
            { label: "Quantity", value: r.quantity },
            { label: "Urgency", value: formatEnum(r.urgency) },
            { label: "Status", value: formatEnum(r.status) },
          ]}
        />
        <DetailTextBlock label="Need description" value={r.description} />
      </DetailSection>

      <DetailSection icon={MapPin} title="Location">
        <DetailGrid
          items={[
            { label: "City", value: r.city },
            { label: "PIN Code", value: r.pincode },
            { label: "Pickup radius", value: r.pickupRadiusKm != null ? `${r.pickupRadiusKm} km` : null },
            { label: "Coordinates", value: formatCoordinates(r.latitude, r.longitude) },
          ]}
        />
      </DetailSection>

      <DetailSection icon={ShieldCheck} title="Review">
        <DetailGrid
          items={[
            { label: "Request ID", value: r.id },
            { label: "Rejection reason", value: r.rejectionReason },
          ]}
        />
      </DetailSection>
    </>
  );
}

function ListingDetailContent({ listing: l }: { listing: ItemListing }) {
  const photos = listingPhotos(l);

  return (
    <>
      <SectionPhotoStrip photos={photos} />

      <DetailSection icon={UserRound} title="Donor">
        <DetailGrid
          items={[
            { label: "Name", value: l.donorName },
            { label: "Donor ID", value: l.donorId },
            { label: "Created", value: formatDateTime(l.createdAt) },
            { label: "Submitted", value: formatDateTime(l.submittedAt) },
          ]}
        />
      </DetailSection>

      <DetailSection icon={Tag} title="Item Details">
        <DetailGrid
          items={[
            { label: "Category", value: l.category },
            { label: "Subcategory", value: l.subcategory },
            { label: "Quantity", value: l.quantity },
            { label: "Condition", value: l.condition },
            { label: "Brand", value: l.brand },
            { label: "Model", value: l.model },
            { label: "Item age", value: l.approximateAge },
            { label: "Working status", value: formatEnum(l.workingStatus) },
            { label: "Dimensions", value: l.dimensions },
            { label: "Weight", value: l.approximateWeight },
          ]}
        />
        <DetailTextBlock label="Description" value={l.description} />
        <DetailTextBlock
          label="Known defects"
          value={l.knownDefects === "NONE" ? "No known defects declared" : l.knownDefects}
          tone={l.knownDefects && l.knownDefects !== "NONE" ? "amber" : "neutral"}
        />
        <DetailTextBlock label="Accessories included" value={l.accessoriesIncluded} />
        <DetailTextBlock label="Recipient restrictions" value={l.recipientRestrictions} />
      </DetailSection>

      <DetailSection icon={MapPin} title="Location">
        <DetailGrid
          items={[
            { label: "City", value: l.city },
            { label: "Locality", value: l.locality },
            { label: "PIN Code", value: l.pincode },
            { label: "Coordinates", value: formatCoordinates(l.latitude, l.longitude) },
          ]}
        />
      </DetailSection>

      <DetailSection icon={Truck} title="Delivery">
        <DetailGrid
          items={[
            { label: "Pickup availability", value: l.pickupAvailability },
            { label: "Pickup days", value: splitValues(l.pickupDays).join(", ") },
            { label: "Pickup time slots", value: splitValues(l.pickupTimeSlots).join(", ") },
            { label: "Donor drop-off", value: l.donorDropOffAvailable },
            { label: "Max travel distance", value: l.maxTravelDistance != null ? `${l.maxTravelDistance} km` : null },
            { label: "Packaging", value: formatEnum(l.packagingAvailable) },
            { label: "Special handling", value: splitValues(l.specialHandling, "|").join(", ") },
            { label: "Preferred handover date", value: formatDate(l.preferredHandoverDate) },
            { label: "Preferred handover slots", value: splitValues(l.preferredHandoverSlots).join(", ") },
            { label: "Maximum delivery radius", value: l.maximumDeliveryRadius != null ? `${l.maximumDeliveryRadius} km` : null },
            { label: "Transport payer", value: formatEnum(l.transportPayerPreference) },
            { label: "Availability expiry", value: formatDateTime(l.availabilityExpiry) },
          ]}
        />
      </DetailSection>

      <DetailSection icon={ShieldCheck} title="Review">
        <DetailGrid
          items={[
            { label: "Listing ID", value: l.id },
            { label: "Status", value: formatEnum(l.status) },
            { label: "Declarations accepted", value: l.declarationsAccepted },
            { label: "Rejected by AI", value: l.rejectedByAi },
            { label: "Policy version", value: l.policyVersion },
            { label: "Rejection reason", value: l.rejectionReason },
          ]}
        />
      </DetailSection>
    </>
  );
}

function MatchDetailContent({ match: m }: { match: ItemMatch }) {
  const donorPhotos = m.donorImages ?? [];
  const requestPhotos = m.requestImageUrl ? [m.requestImageUrl] : [];
  const listingPhotos = matchListingPhotos(m);

  return (
    <>
      <DetailSection icon={Phone} title="People">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PersonInfoCard
            label="Donor"
            name={m.donorName}
            id={m.donorId}
            email={m.donorEmail}
            phone={m.donorContact}
            city={m.donorCity}
            coordinates={formatCoordinates(m.donorLatitude, m.donorLongitude)}
          />
          <PersonInfoCard
            label="Donee"
            name={m.doneeName}
            id={m.doneeId}
            email={m.doneeEmail}
            phone={m.doneeContact}
            city={m.doneeCity}
            coordinates={formatCoordinates(m.doneeLatitude, m.doneeLongitude)}
          />
        </div>
      </DetailSection>

      {m.requestId && (
        <>
          <SectionPhotoStrip photos={requestPhotos} title="Request Photo" />
          <DetailSection icon={ClipboardList} title="Donee Request Data">
            <DetailGrid
              items={[
                { label: "Request ID", value: m.requestId },
                { label: "Title", value: m.requestTitle },
                { label: "Category", value: m.requestCategory },
                { label: "Quantity", value: m.requestQuantity },
                { label: "Urgency", value: formatEnum(m.requestUrgency) },
                { label: "Status", value: formatEnum(m.requestStatus) },
                { label: "City", value: m.requestCity },
                { label: "PIN Code", value: m.requestPincode },
                { label: "Coordinates", value: formatCoordinates(m.requestLatitude, m.requestLongitude) },
                { label: "Created", value: formatDateTime(m.requestCreatedAt) },
              ]}
            />
            <DetailTextBlock label="Request description" value={m.requestDescription} />
          </DetailSection>
        </>
      )}

      {m.listingId && (
        <>
          <SectionPhotoStrip photos={listingPhotos} title="Listing Photos" />
          <DetailSection icon={Package} title="Donor Listing Data">
            <DetailGrid
              items={[
                { label: "Listing ID", value: m.listingId },
                { label: "Title", value: m.listingTitle },
                { label: "Category", value: m.listingCategory },
                { label: "Subcategory", value: m.listingSubcategory },
                { label: "Quantity", value: m.listingQuantity },
                { label: "Condition", value: m.listingCondition },
                { label: "Status", value: formatEnum(m.listingStatus) },
                { label: "Brand", value: m.listingBrand },
                { label: "Model", value: m.listingModel },
                { label: "Item age", value: m.listingApproximateAge },
                { label: "Working status", value: formatEnum(m.listingWorkingStatus) },
                { label: "Dimensions", value: m.listingDimensions },
                { label: "Weight", value: m.listingApproximateWeight },
                { label: "City", value: m.listingCity },
                { label: "Locality", value: m.listingLocality },
                { label: "PIN Code", value: m.listingPincode },
                { label: "Coordinates", value: formatCoordinates(m.listingLatitude, m.listingLongitude) },
                { label: "Created", value: formatDateTime(m.listingCreatedAt) },
              ]}
            />
            <DetailTextBlock label="Listing description" value={m.listingDescription} />
            <DetailTextBlock
              label="Known defects"
              value={m.listingKnownDefects === "NONE" ? "No known defects declared" : m.listingKnownDefects}
              tone={m.listingKnownDefects && m.listingKnownDefects !== "NONE" ? "amber" : "neutral"}
            />
            <DetailTextBlock label="Accessories included" value={m.listingAccessoriesIncluded} />
          </DetailSection>
        </>
      )}

      {(m.donorItemDescription || donorPhotos.length > 0 || m.doneeReason) && (
        <>
          <SectionPhotoStrip photos={donorPhotos} title="Donor Uploaded Match Photos" />
          <DetailSection icon={MessageSquare} title="Match Notes">
            <DetailTextBlock label="Donor item description" value={m.donorItemDescription} />
            <DetailTextBlock label="Donee reason" value={m.doneeReason} />
          </DetailSection>
        </>
      )}

      <DetailSection icon={Truck} title="Logistics and Delivery">
        <DetailGrid
          items={[
            { label: "Handover method", value: formatEnum(m.handoverMethod) },
            { label: "Transport arranged by", value: formatEnum(m.transportArrangedBy) },
            { label: "Transport cost by", value: formatEnum(m.transportCostBornBy) },
            { label: "Pickup date", value: formatDateTime(m.pickupDateTime) },
            { label: "Expected delivery", value: formatDateTime(m.expectedDeliveryDate) },
            { label: "Allocated quantity", value: m.allocatedQuantity },
            { label: "Delivery verified", value: m.deliveryOtpVerified },
            { label: "Verification method", value: formatEnum(m.deliveryVerificationMethod) },
            { label: "Call masking requested", value: m.callMaskingRequested },
          ]}
        />
        <DetailTextBlock label="Packaging responsibility" value={m.packagingResponsibility} />
        <DetailTextBlock label="Handover address" value={m.handoverAddress} />
        <DetailTextBlock label="Delivery address" value={m.deliveryAddress} />
        <DetailTextBlock label="Fulfilment notes" value={m.fulfilmentNotes} />
        {m.deliveryProofUrl && (
          <a href={m.deliveryProofUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-sm font-bold text-[#1f5592] hover:underline">
            Open delivery proof
          </a>
        )}
      </DetailSection>

      {/* Status and the AI score come last (round 2): staff read who and what first, then the record's state. */}
      <DetailSection icon={ShieldCheck} title="Status and decision">
        <DetailGrid
          items={[
            { label: "Match ID", value: m.id },
            { label: "Type", value: formatEnum(m.matchType) },
            { label: "Status", value: formatEnum(m.status) },
            { label: "AI score", value: m.matchScore != null ? `${m.matchScore.toFixed(0)}%` : null },
            { label: "Created", value: formatDateTime(m.createdAt) },
            { label: "Rejection reason", value: m.rejectionReason },
          ]}
        />
      </DetailSection>

      {m.scoreCategory != null && (
        <DetailSection icon={ShieldCheck} title="AI match score (advisory, not a staff decision)">
          <DetailGrid
            items={[
              { label: "Category match", value: `${m.scoreCategory}%` },
              { label: "Spec match", value: m.scoreSpec != null ? `${m.scoreSpec.toFixed(0)}%` : null },
              { label: "Distance", value: m.scoreDistanceKm != null ? `${m.scoreDistanceKm.toFixed(1)} km (stage ${m.scoreDistanceStage ?? "—"})` : null },
              { label: "Quantity penalty", value: m.scoreQuantity != null ? `-${m.scoreQuantity}` : null },
              { label: "Urgency boost", value: m.scoreUrgency != null ? `+${m.scoreUrgency}` : null },
            ]}
          />
        </DetailSection>
      )}
    </>
  );
}

function PersonInfoCard({
  label,
  name,
  id,
  email,
  phone,
  city,
  coordinates,
}: {
  label: string;
  name?: string | null;
  id?: number | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  coordinates?: string | null;
}) {
  return (
    <div className="rounded-xl sm:rounded-2xl border border-stone-100 bg-stone-50 p-3">
      <p className="text-3xs font-black uppercase tracking-widest text-[#1f5592]">{label}</p>
      <p className="mt-1 text-sm font-black text-stone-900">{name ?? "Unknown"}</p>
      <div className="mt-2 space-y-1 text-xs text-stone-500">
        {hasDetailValue(id) && <p><span className="font-bold text-stone-400">ID:</span> {id}</p>}
        {hasDetailValue(email) && <p><span className="font-bold text-stone-400">Email:</span> {email}</p>}
        {hasDetailValue(phone) && <p><span className="font-bold text-stone-400">Phone:</span> {phone}</p>}
        {hasDetailValue(city) && <p><span className="font-bold text-stone-400">City:</span> {city}</p>}
        {hasDetailValue(coordinates) && <p><span className="font-bold text-stone-400">GPS:</span> {coordinates}</p>}
      </div>
    </div>
  );
}

/** Section wrapper around the shared lightbox PhotoStrip (kept for the queue panels'
 * framed style). The old target=_blank links silently did nothing for base64
 * images — the shared component opens an in-app preview instead. */
function SectionPhotoStrip({ photos, title = "Photos" }: { photos: string[]; title?: string }) {
  if (photos.length === 0) return null;

  return (
    <div className="border-b border-stone-100 px-3.5 sm:px-5 py-3 sm:py-4">
      <div className="mb-3 flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-[#1f5592]" />
        <p className="text-3xs font-black uppercase tracking-widest text-stone-400">{title}</p>
      </div>
      <PhotoStrip images={photos} />
    </div>
  );
}

function DetailSection({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-stone-100 px-3.5 sm:px-5 py-3 sm:py-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#1f5592]" />
        <h3 className="text-3xs font-black uppercase tracking-widest text-stone-400">{title}</h3>
      </div>
      {children}
    </section>
  );
}

type DetailValue = string | number | boolean | null | undefined;

function hasDetailValue(value: DetailValue) {
  if (value == null) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  return true;
}

function renderDetailValue(value: DetailValue) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function DetailGrid({ items }: { items: Array<{ label: string; value: DetailValue }> }) {
  const visible = items.filter(item => hasDetailValue(item.value));

  if (visible.length === 0) {
    return <p className="text-sm text-stone-400">No details provided.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {visible.map(item => (
        <div key={item.label} className="rounded-xl bg-stone-50 px-3 py-2">
          <p className="text-3xs font-bold uppercase tracking-wide text-stone-400">{item.label}</p>
          <p className="mt-0.5 break-words text-sm font-semibold text-stone-800">{renderDetailValue(item.value)}</p>
        </div>
      ))}
    </div>
  );
}

function DetailTextBlock({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value?: string | null;
  tone?: "neutral" | "amber";
}) {
  if (!hasDetailValue(value)) return null;

  const color = tone === "amber"
    ? "border-amber-200 bg-amber-50 text-amber-900"
    : "border-stone-200 bg-white text-stone-700";

  return (
    <div className={`mt-3 rounded-xl border px-3 py-2 ${color}`}>
      <p className="text-3xs font-bold uppercase tracking-wide opacity-60">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{value}</p>
    </div>
  );
}

function StatusPill({ value }: { value?: string | null }) {
  const normalized = formatEnum(value) ?? "Unknown";
  const color = value === "MANUAL_REVIEW"
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : value === "PENDING_VERIFICATION" || value === "SUBMITTED"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-stone-200 bg-stone-100 text-stone-600";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-3xs font-black uppercase tracking-wide ${color}`}>
      {normalized}
    </span>
  );
}

/** One rejected listing or request in {@link RejectedReviewSection}. */
function RejectedRow({ id, title, subtitle, reason, kind, onReinstate }: {
  id: number; title: string; subtitle: string; reason: string | null; kind: "listing" | "request";
  onReinstate: (kind: "listing" | "request", id: number, title: string) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-stone-900 dark:text-stone-100">{title}</p>
        <p className="mt-0.5 truncate text-2xs text-stone-400">{subtitle}</p>
        {reason && (
          <p className="mt-1.5 rounded-lg bg-red-50 p-2 text-2xs font-semibold leading-relaxed text-red-700 dark:bg-red-950/20 dark:text-red-400">
            {displayReason(reason)}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onReinstate(kind, id, title)}
        className="shrink-0 rounded-full bg-green-600 px-3 py-1.5 text-2xs font-black text-white transition-colors hover:bg-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
      >
        Make live again
      </button>
    </div>
  );
}

/** A titled group of rows in {@link RejectedReviewSection}. */
function RejectedGroup({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-2xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">{title}</p>
        <p className="text-2xs text-stone-400">{note}</p>
      </div>
      {children}
    </div>
  );
}

/**
 * Rejected items an admin can put back live.
 *
 * <p>Split into two groups on purpose. An AI rejection is a machine call that can
 * be plain wrong — a first-aid kit was auto-rejected on a >70% Rekognition
 * "Weapons" label — whereas an admin rejection was a considered human decision.
 * Overriding those two things should not look identical, so the source of the
 * decision is stated rather than implied.
 */
function RejectedReviewSection({
  listings, requests, onReinstate,
}: {
  listings: ItemListing[];
  requests: ItemRequest[];
  onReinstate: (kind: "listing" | "request", id: number, title: string) => void;
}) {
  const byAi = listings.filter(l => l.rejectedByAi);
  const byAdmin = listings.filter(l => !l.rejectedByAi);
  if (listings.length === 0 && requests.length === 0) return null;

  return (
    <section className="mb-5 space-y-4 rounded-2xl border border-amber-300 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/10">
      <div>
        <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">Rejected — review</h3>
        <p className="text-2xs text-stone-500 dark:text-stone-400">
          Putting one back live clears its rejection, notifies the owner and re-runs matching.
        </p>
      </div>

      {byAi.length > 0 && (
        <RejectedGroup title={`Rejected by AI (${byAi.length})`} note="Automated decision — check before trusting it.">
          {byAi.map(l => (
            <RejectedRow onReinstate={onReinstate} key={l.id} kind="listing" id={l.id} title={l.title}
              subtitle={`${l.category}${l.subcategory ? ` · ${l.subcategory}` : ""} · ${l.donorName}`}
              reason={l.rejectionReason} />
          ))}
        </RejectedGroup>
      )}

      {byAdmin.length > 0 && (
        <RejectedGroup title={`Rejected by an admin (${byAdmin.length})`} note="A human decided this — override only with reason.">
          {byAdmin.map(l => (
            <RejectedRow onReinstate={onReinstate} key={l.id} kind="listing" id={l.id} title={l.title}
              subtitle={`${l.category}${l.subcategory ? ` · ${l.subcategory}` : ""} · ${l.donorName}`}
              reason={l.rejectionReason} />
          ))}
        </RejectedGroup>
      )}

      {requests.length > 0 && (
        <RejectedGroup title={`Rejected requests (${requests.length})`} note="Approval still requires verification to be satisfied.">
          {requests.map(r => (
            <RejectedRow onReinstate={onReinstate} key={r.id} kind="request" id={r.id} title={r.title}
              subtitle={`${r.category} · ${r.city}`} reason={r.rejectionReason} />
          ))}
        </RejectedGroup>
      )}
    </section>
  );
}

function AllClearState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 shadow-sm"
        style={{ background: "linear-gradient(135deg, #d1fae5, #a7f3d0)" }}>
        <Check className="w-8 h-8 text-emerald-600" />
      </div>
      <p className="text-stone-700 font-bold">{label}</p>
      <p className="text-sm text-stone-400 mt-1">All caught up — great work!</p>
    </div>
  );
}
