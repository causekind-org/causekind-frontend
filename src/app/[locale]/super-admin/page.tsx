"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { StaffShell, StaffNavGroup, StaffNavItem, StaffTopbarTitle } from "@/components/staff/StaffShell";
import { PageHeader, GlassCard, CardTitle, MetricTile } from "@/components/staff/primitives";
import {
  superAdminOverview, type SuperAdminOverview,
  adminGetAllDonations, type SuperAdminRow,
} from "@/lib/api";
import { EntityTable, type Column, type TableFilter } from "@/components/super-admin/EntityTable";
import { SqlConsole } from "@/components/super-admin/SqlConsole";
import { AdminPermissionsPanel } from "@/components/super-admin/AdminPermissionsPanel";
import { DisputesPanel } from "@/components/super-admin/DisputesPanel";
import { AuditLogPanel } from "@/components/super-admin/AuditLogPanel";
import { GlobalSearchPanel } from "@/components/super-admin/GlobalSearchPanel";
import { UserDirectoryPanel } from "@/components/super-admin/UserDirectoryPanel";
import { TopbarSearch } from "@/components/super-admin/TopbarSearch";
import { CrmStaffPanel } from "@/features/crm/CrmStaffPanel";
import { SaLoadError } from "@/components/super-admin/SaLoadError";
import { OverviewInsights } from "@/components/super-admin/OverviewInsights";
import { CasesPanel } from "@/components/super-admin/CasesPanel";
import { InterventionsPanel } from "@/components/super-admin/InterventionsPanel";
import { CommunicationsPanel } from "@/components/super-admin/CommunicationsPanel";
import { GovernancePanel } from "@/components/super-admin/GovernancePanel";
import { OperationsPanel } from "@/components/super-admin/OperationsPanel";
import { FundraisersPanel } from "@/components/super-admin/fundraisers/FundraisersPanel";
import { MoneyPanel } from "@/components/super-admin/MoneyPanel";
import { MailCenterPanel } from "@/components/super-admin/MailCenterPanel";
import { DonationDetailModal } from "@/components/super-admin/DonationDetailModal";
import { ListingDetailModal } from "@/components/super-admin/ListingDetailModal";
import { RequestDetailModal } from "@/components/super-admin/RequestDetailModal";
import type { SaInterventionEntity } from "@/lib/api";
import {
  LayoutDashboard, Users, Megaphone, CreditCard, ClipboardList, Package, HandCoins,
  Handshake, Terminal, LogOut, ShieldAlert, Loader2, Database, TrendingUp,
  AlertTriangle, KeyRound, History, Scale, ChevronRight,
  Search, UserSearch, LifeBuoy, Send, ShieldCheck, SlidersHorizontal, Activity, Lock, Mail,
} from "lucide-react";

// ── Theme tokens ──────────────────────────────────────────────────────────────
type Th = {
  root: string; sidebar: string; topbar: string; divider: string; card: string;
  textPrimary: string; textMuted: string; textDim: string; textDimmer: string;
  navActive: string; navInactive: string; signout: string;
  accent: string; roleBar: string; toggleBtn: string; sqlLabel: string;
  roleText: string; barGradient: string;
  /** Positive/money figures. Neon greens read fine on #05070d and wash out on #faf7f2. */
  positive: string;
  /**
   * Per-tile accents for the overview stats. These were a single hardcoded set
   * of dark-mode neons (#4ade80, #60a5fa, #a78bfa, #f472b6) used in both
   * themes — on the light ground they sat around 2:1 against white and read as
   * pastel smudges. Light mode gets the 700-weight equivalents instead.
   */
  tone: Record<StatTone, string>;
};

type StatTone = "users" | "campaigns" | "donations" | "requests" | "listings" | "matches";

/** Console-local, deliberately not the app's `ck_theme` — this panel manages
 *  its own palette and should not be dragged around by the public site. */

const LIGHT: Th = {
  root:        "text-[#10233a]",
  sidebar:     "",
  topbar:      "",
  divider:     "border-[#e3edf8]",
  card:        "ck-glass-solid border-white/80",
  textPrimary: "text-[#10233a]",
  textMuted:   "text-[#4f6480]",
  textDim:     "text-[#4f6480]",
  textDimmer:  "text-[#6a7f99]",
  navActive:   "",
  navInactive: "",
  signout:     "",
  accent:      "#2d7fd6",
  roleBar:     "bg-[#c8d9ec]",
  toggleBtn:   "",
  sqlLabel:    "text-red-600/70",
  roleText:    "text-[#4f6480]",
  barGradient: "from-[#1f66b3] to-[#2d7fd6]",
  positive:    "text-[#1f66b3]",
  tone: {
    users: "#1f66b3", campaigns: "#8a5a10", donations: "#1f66b3",
    requests: "#1f5f6d", listings: "#1f5f6d", matches: "#1f66b3",
  },
};

// ── Enum option sets (mirror backend enums) ──────────────────────────────────
const ROLES = ["DONOR", "DONEE", "ADMIN", "SUPER_ADMIN"];
// Mirrors backend CampaignStatus (all 12 values).
const CAMPAIGN_STATUS = [
  "PENDING_APPROVAL", "APPROVED", "REJECTED", "DRAFT", "PUBLICATION_REVIEW",
  "CHANGES_REQUESTED", "PUBLICATION_DECLINED", "APPROVED_SETUP_INCOMPLETE",
  "CANCELLED", "COLLECTIONS_CLOSED", "PAUSED", "OUTCOME_REPORTING",
];

type Pill = { label: string; cls: string };
const PILL_BASE = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border";
const GREEN = "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
const AMBER = "bg-amber-500/15 text-amber-600 border-amber-500/30";
const RED = "bg-rose-500/15 text-rose-600 border-rose-500/30";
const GREY = "bg-slate-500/15 text-slate-500 border-slate-500/30";
const BLUE = "bg-sky-500/15 text-sky-600 border-sky-500/30";

/** Review result of the campaign (the stored status, in plain words). */
const APPROVAL_PILL: Record<string, Pill> = {
  PENDING_APPROVAL: { label: "Pending", cls: AMBER },
  PUBLICATION_REVIEW: { label: "In review", cls: AMBER },
  CHANGES_REQUESTED: { label: "Changes requested", cls: AMBER },
  DRAFT: { label: "Draft", cls: GREY },
  APPROVED_SETUP_INCOMPLETE: { label: "Setup incomplete", cls: BLUE },
  REJECTED: { label: "Rejected", cls: RED },
  PUBLICATION_DECLINED: { label: "Declined", cls: RED },
};

/** Today as YYYY-MM-DD in local time (endDate is a plain LocalDate). */
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtEndDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Whether the campaign is live — derived from status + end date, not stored. */
function liveState(status: string, endDate?: string): Pill {
  switch (status) {
    case "APPROVED":
      // End date is the last day donations are taken.
      return endDate && endDate < todayIso() ? { label: "Ended", cls: GREY } : { label: "Live", cls: GREEN };
    case "PAUSED": return { label: "Paused", cls: AMBER };
    case "COLLECTIONS_CLOSED":
    case "OUTCOME_REPORTING": return { label: "Closed", cls: GREY };
    case "CANCELLED": return { label: "Cancelled", cls: RED };
    default: return { label: "Not live", cls: GREY };
  }
}

function approvalPill(status: string): Pill {
  // Statuses past approval (live/paused/closed/cancelled) were all approved first,
  // except CANCELLED, which can happen before approval.
  if (APPROVAL_PILL[status]) return APPROVAL_PILL[status];
  if (status === "CANCELLED") return { label: "Cancelled", cls: RED };
  return { label: "Approved", cls: GREEN };
}

const renderPill = (p: Pill) => <span className={`${PILL_BASE} ${p.cls}`}>{p.label}</span>;
const DONATION_STATUS = ["INITIATED", "COMPLETED", "FAILED"];
const REQUEST_STATUS = ["DRAFT", "PENDING_VERIFICATION", "VERIFIED_PRIVATE_MATCHING", "POTENTIAL_MATCH_FOUND", "AWAITING_MATCH_APPROVAL", "PUBLICATION_CONSENT_REQUIRED", "PUBLIC_REQUEST", "RESERVED", "FULFILMENT_IN_PROGRESS", "FULFILLED", "EXPIRED", "REJECTED"];
const LISTING_STATUS = ["DRAFT", "PENDING_REVIEW", "AVAILABLE", "POTENTIAL_MATCH", "AWAITING_DONOR_CONFIRMATION", "RESERVED", "HANDOVER_SCHEDULED", "IN_TRANSIT", "FULFILLED", "EXPIRED", "WITHDRAWN", "REJECTED"];
const FULFILMENT_STATUS = ["PENDING_APPROVAL", "TRANSPORT_DISCUSSION", "ARRANGEMENT_AGREED", "PICKUP_SCHEDULED", "PICKED_UP", "IN_TRANSIT", "DELIVERY_ATTEMPTED", "DELIVERED_PENDING_CONFIRMATION", "FULFILLED", "RESCHEDULED", "FAILED", "CANCELLED", "REJECTED"];
const URGENCY = ["NORMAL", "HIGH", "CRITICAL"];

// ── Column configs per entity ─────────────────────────────────────────────────
const USER_COLS: Column[] = [
  { key: "fullName", label: "Name", editable: true },
  { key: "email", label: "Email", editable: true },
  { key: "phone", label: "Phone", editable: true },
  { key: "city", label: "City", editable: true },
  { key: "role", label: "Role" },
  { key: "active", label: "Active", editable: true, type: "boolean" },
  { key: "createdAt", label: "Joined" },
  { key: "password", label: "Reset password", editable: true, type: "text", inTable: false },
];
const DAY = 86_400_000;
const joinedWithin = (days: number) => (r: Record<string, unknown>) => {
  const t = r.createdAt ? new Date(String(r.createdAt)).getTime() : NaN;
  return !Number.isNaN(t) && Date.now() - t <= days * DAY;
};
const USER_FILTERS: TableFilter[] = [
  { key: "role", label: "Role", options: [
    { value: "DONOR", label: "Donor" }, { value: "DONEE", label: "Donee" },
    { value: "NGO_PARTNER", label: "NGO" }, { value: "REPRESENTATIVE", label: "Representative" },
    { value: "ADMIN", label: "Admin" }, { value: "SUPER_ADMIN", label: "Super admin" },
  ].map(o => ({ ...o, match: (r: Record<string, unknown>) => r.role === o.value })) },
  { key: "active", label: "Status", options: [
    { value: "active", label: "Active", match: (r) => r.active === true },
    { value: "inactive", label: "Inactive", match: (r) => r.active !== true },
  ] },
  { key: "pan", label: "PAN", options: [
    { value: "given", label: "PAN given", match: (r) => r.hasPan === true },
    { value: "missing", label: "PAN not given", match: (r) => r.hasPan !== true },
  ] },
  { key: "joined", label: "Joined", options: [
    { value: "1", label: "Today", match: joinedWithin(1) },
    { value: "7", label: "Last 7 days", match: joinedWithin(7) },
    { value: "30", label: "Last 30 days", match: joinedWithin(30) },
  ] },
];
const DONATION_FILTERS: TableFilter[] = [
  { key: "pan", label: "PAN", options: [
    { value: "given", label: "PAN given", match: (r) => r.hasPan === true },
    { value: "missing", label: "PAN not given", match: (r) => r.hasPan !== true },
    { value: "80g-missing", label: "Wants 80G, no PAN", match: (r) => r.wants80g === true && r.hasPan !== true },
  ] },
];
const USER_CREATE_COLS: Column[] = [
  { key: "fullName", label: "Name", editable: true },
  { key: "email", label: "Email", editable: true },
  { key: "phone", label: "Phone", editable: true },
  { key: "password", label: "Password", editable: true },
  { key: "city", label: "City", editable: true },
  { key: "role", label: "Role", editable: true, type: "select", options: ROLES },
];
const CAMPAIGN_COLS: Column[] = [
  { key: "title", label: "Title", editable: true },
  { key: "doneeName", label: "Donee" },
  { key: "category", label: "Category", editable: true },
  { key: "city", label: "City", editable: true },
  { key: "state", label: "State", editable: true },
  { key: "targetAmount", label: "Target", editable: true, type: "number" },
  { key: "amountRaised", label: "Raised", editable: true, type: "number" },
  { key: "status", label: "Approval", editable: true, type: "select", options: CAMPAIGN_STATUS,
    render: row => renderPill(approvalPill(String(row.status ?? ""))) },
  { key: "liveState", label: "Live state",
    render: row => {
      const status = String(row.status ?? "");
      const end = typeof row.endDate === "string" && row.endDate ? row.endDate.slice(0, 10) : undefined;
      return (
        <div className="flex flex-col items-start gap-0.5">
          {renderPill(liveState(status, end))}
          {end && (
            <span className="text-[11px] opacity-60">
              {end < todayIso() ? "ended" : "ends"} {fmtEndDate(end)}
            </span>
          )}
        </div>
      );
    } },
  { key: "description", label: "Description", editable: true, type: "textarea", inTable: false },
  { key: "rejectionReason", label: "Rejection reason", editable: true, type: "text", inTable: false },
];
const DONATION_COLS: Column[] = [
  { key: "donorName", label: "Donor" },
  { key: "campaignTitle", label: "Campaign" },
  { key: "source", label: "Source" },
  { key: "donorMode", label: "Donor type" },
  { key: "guestName", label: "Guest name", inTable: false },
  { key: "guestEmail", label: "Guest email", inTable: false },
  { key: "amount", label: "Amount", editable: true, type: "number" },
  { key: "currency", label: "Cur", editable: true },
  { key: "status", label: "Status", editable: true, type: "select", options: DONATION_STATUS },
  { key: "razorpayOrderId", label: "Order ID" },
  { key: "razorpayPaymentId", label: "Payment ID", editable: true, type: "text", inTable: false },
];
const REQUEST_COLS: Column[] = [
  { key: "title", label: "Title", editable: true },
  { key: "doneeName", label: "Donee" },
  { key: "category", label: "Category", editable: true },
  { key: "quantity", label: "Qty", editable: true, type: "number" },
  { key: "urgency", label: "Urgency", editable: true, type: "select", options: URGENCY },
  { key: "city", label: "City", editable: true },
  { key: "pincode", label: "Pincode", editable: true },
  { key: "status", label: "Status", editable: true, type: "select", options: REQUEST_STATUS },
  { key: "description", label: "Description", editable: true, type: "textarea", inTable: false },
  { key: "rejectionReason", label: "Rejection reason", editable: true, type: "text", inTable: false },
];
const LISTING_COLS: Column[] = [
  { key: "title", label: "Title", editable: true },
  { key: "donorName", label: "Donor" },
  { key: "category", label: "Category", editable: true },
  { key: "quantity", label: "Qty", editable: true, type: "number" },
  { key: "condition", label: "Condition", editable: true },
  { key: "city", label: "City", editable: true },
  { key: "pincode", label: "Pincode", editable: true },
  { key: "status", label: "Status", editable: true, type: "select", options: LISTING_STATUS },
  { key: "description", label: "Description", editable: true, type: "textarea", inTable: false },
  { key: "rejectionReason", label: "Rejection reason", editable: true, type: "text", inTable: false },
];
/**
 * The raw `/super-admin/donations` rows carry `donorId`/`campaignId`, not
 * names — `donorName`/`campaignTitle` come from the purpose-built
 * `/admin/donations` endpoint instead. Module-level (not a component
 * function) so its identity is stable across renders; EntityTable's fetch
 * effect depends on this reference and would refetch every render otherwise.
 */
async function enrichDonations(rows: SuperAdminRow[]): Promise<SuperAdminRow[]> {
  const joined = await adminGetAllDonations();
  const byId = new Map(joined.map(d => [d.id, d]));
  return rows.map(row => {
    const match = byId.get(Number(row.id));
    if (!match) return row;
    return {
      ...row,
      // A guest trust donation has no donor/campaign row to join against —
      // fall back to the name captured at donation time so the row isn't
      // just blank.
      donorName: match.donorName ?? match.guestName,
      donorEmail: match.donorEmail ?? match.guestEmail,
      campaignTitle: match.campaignTitle,
      source: match.source,
      donorMode: match.donorMode,
      guestName: match.guestName,
      guestEmail: match.guestEmail,
    };
  });
}

const MATCH_COLS: Column[] = [
  { key: "matchType", label: "Type" },
  { key: "donorName", label: "Donor" },
  { key: "doneeName", label: "Donee" },
  { key: "requestId", label: "Req" },
  { key: "listingId", label: "Lst" },
  { key: "status", label: "Status", editable: true, type: "select", options: FULFILMENT_STATUS },
  { key: "matchScore", label: "AI score", editable: true, type: "number", inTable: false },
  { key: "rejectionReason", label: "Rejection reason", editable: true, type: "text", inTable: false },
];

const NAV = [
  { key: "crm-staff",     label: "CRM staff logins", icon: KeyRound, group: "Work", hint: "Logins for CRM call staff" },
  { key: "overview",      label: "Overview",    icon: LayoutDashboard, group: "Work", hint: "Platform counts at a glance — click a number to open it" },
  { key: "search",        label: "Search",      icon: Search, group: "Work", hint: "Find any user, item or record" },
  { key: "directory",     label: "User 360",    icon: UserSearch, group: "Work", hint: "Everything about one user, plus restrictions" },
  { key: "cases",         label: "Support cases", icon: LifeBuoy, group: "Work", hint: "Support cases and information requests" },
  { key: "interventions", label: "Interventions", icon: SlidersHorizontal, group: "Work", hint: "Hold, resume or reassess a request, offer or match" },
  { key: "mail-center",   label: "Mail Center", icon: Mail, group: "People & access", hint: "Write, schedule and send email campaigns" },
  { key: "communications", label: "Communications", icon: Send, group: "People & access", hint: "Messages sent by staff, with delivery log" },
  { key: "governance",     label: "Governance",     icon: Lock, group: "Platform", hint: "Super-admin guard, permission history, reveal log" },
  { key: "operations",     label: "Operational health", icon: Activity, group: "Platform", hint: "Health checks and runtime config" },
  { key: "fundraisers",   label: "Fundraisers", icon: HandCoins, group: "Money", hint: "Fundraiser campaigns and payouts" },
  { key: "users",         label: "Users (raw)", icon: Users, group: "Records", hint: "Raw user table — edit fields directly" },
  { key: "campaigns",     label: "Campaigns",   icon: Megaphone, group: "Records", hint: "Raw campaign table" },
  { key: "donations",     label: "Donations",   icon: CreditCard, group: "Money", hint: "Every money donation record" },
  { key: "money",         label: "Money",       icon: HandCoins, group: "Money", hint: "Payments, refunds and payout status" },
  { key: "item-requests", label: "Requests",    icon: ClipboardList, group: "Records", hint: "Raw in-kind request table" },
  { key: "item-listings", label: "Listings",    icon: Package, group: "Records", hint: "Raw donor listing table" },
  { key: "matches",       label: "Matches",     icon: Handshake, group: "Records", hint: "Raw match table" },
  { key: "disputes",      label: "Disputes",    icon: Scale, group: "Records", hint: "Disputes raised on handovers" },
  { key: "admin-permissions", label: "Admin Access", icon: KeyRound, group: "People & access", hint: "What each admin is allowed to do" },
  { key: "audit-log",     label: "Audit Log",   icon: History, group: "Platform", hint: "Every staff action, who and when" },
  { key: "sql",           label: "SQL Console", icon: Terminal, group: "Platform", hint: "Raw SQL against the live database — careful" },
] as const;

/**
 * Areas of the target information architecture that are not built yet. Shown as
 * disabled rows rather than left out: the shape of the finished console should
 * be visible, so nobody goes hunting for a screen that simply does not exist
 * and no one rebuilds one of these by accident.
 *
 * Kept separate from NAV on purpose — SectionKey derives from NAV, so listing
 * these there would force the content switch to handle sections that render
 * nothing.
 */
const PLANNED_NAV = [
  // Restrictions shipped in Phase 4 but is a tab inside User 360 rather than a
  // section of its own, so it stays listed here as a destination that exists
  // elsewhere rather than one that does not exist yet.
  { label: "Restrictions",      icon: ShieldCheck,       phase: "in User 360" },
] as const;

type SectionKey = (typeof NAV)[number]["key"];

/** Panels that render no page title themselves (round 2 audit, 2026-11-19). */
const UNTITLED_SECTIONS = new Set<SectionKey>(["search", "directory", "cases", "mail-center", "admin-permissions", "audit-log"]);

/** Sidebar headings, in display order. Every NAV entry carries one of these. */
const NAV_GROUPS = ["Work", "People & access", "Money", "Records", "Platform"] as const;

// ── Count-up tile ─────────────────────────────────────────────────────────────
function useCountUp(target: number, ms = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return val;
}

/**
 * A count from the overview, optionally a way into the panel behind it.
 *
 * <p>Given `onOpen` the root renders as a real `<button>` rather than a div
 * carrying `role="button"` and a hand-written key handler. The sidebar nav below
 * is already built from real buttons and is keyboard-operable for free; the one
 * click-handler-on-a-`<li>` elsewhere in this console (`GlobalSearchPanel`) is
 * not reachable by keyboard at all, and is not a pattern to copy.
 *
 * <p>Without `onOpen` this is exactly the static tile it has always been, so it
 * stays usable for any count that has nothing to open.
 */
function StatTile({
  label, value, icon: Icon, delay, tone, th, onOpen,
}: {
  label: string; value: number; icon: React.ElementType; delay: number; tone: StatTone; th: Th;
  onOpen?: () => void;
}) {
  const v = useCountUp(value);
  const accent = th.tone[tone];

  const shell = `sa-count-glow relative rounded-xl sm:rounded-2xl border p-3.5 sm:p-5 overflow-hidden ${th.card}`;
  // `text-left` and `w-full` only matter on the button: a <button> centres its
  // content and shrink-wraps by default, which would silently re-layout the
  // whole grid.
  const interactive =
    " w-full text-left cursor-pointer transition-transform transition-shadow duration-200" +
    " hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none" +
    " focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

  const body = (
    <>
      <div
        className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full blur-2xl pointer-events-none"
        style={{ background: `${accent}22` }}
      />
      <div className="flex items-center justify-between mb-2 sm:mb-3 relative z-10">
        <span
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center"
          style={{ background: `${accent}1a`, color: accent }}
        >
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </span>
      </div>
      <p className={`text-xl sm:text-3xl font-black tabular-nums leading-none relative z-10 ${th.textPrimary}`}>
        {v.toLocaleString("en-IN")}
      </p>
      <p className={`text-3xs sm:text-2xs font-bold uppercase tracking-wider mt-1 sm:mt-1.5 relative z-10 ${th.textDim}`}>
        {label}
      </p>
    </>
  );

  if (!onOpen) {
    return (
      <div className={shell} style={{ animationDelay: `${delay}ms` }}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      // The visible text is a bare number and a noun; on its own that reads as
      // "5 Users", which says nothing about what pressing it does.
      aria-label={`Open ${label}`}
      className={shell + interactive}
      // The ring colour is per-tile rather than a utility class so it tracks the
      // tone accent and stays visible against both themes' card backgrounds.
      style={{ animationDelay: `${delay}ms`, ["--tw-ring-color" as string]: accent }}
    >
      {body}
    </button>
  );
}

const ROLE_LABELS: Record<string, string> = {
  DONOR: "Donors", DONEE: "Donees", NGO_PARTNER: "NGO partners", ADMIN: "Admins", SUPER_ADMIN: "Super admins",
};
const roleLabel = (r: string) => ROLE_LABELS[r] ?? r.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const fmtCount = (n: number) => new Intl.NumberFormat("en-IN").format(n);

/**
 * Overview in the staff-console style. Shows only what
 * GET /super-admin/overview actually returns — all-time table counts, users by
 * role, total raised. No trends, percentages or "pending" figures: the endpoint
 * has none, and inventing them is out of scope until a new endpoint is approved.
 */
function OverviewSection({ th, onOpen }: { th: Th; onOpen: (key: SectionKey) => void }) {
  const [data, setData] = useState<SuperAdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    superAdminOverview().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [reloadKey]);

  const header = (
    <PageHeader
      title="Overview"
      description="All-time totals across the platform. Open a number to work with the records behind it."
    />
  );

  if (loading) return (
    <>{header}
      <div className="flex justify-center py-20" role="status" aria-label="Loading overview">
        <Loader2 className="size-7 animate-spin" style={{ color: th.accent }} />
      </div>
    </>
  );
  if (!data) return <>{header}<SaLoadError what="the overview" onRetry={() => setReloadKey((k) => k + 1)} /></>;

  const c = data.counts;
  const roles = Object.entries(data.roleBreakdown).sort((x, y) => y[1] - x[1]);
  const roleTotal = roles.reduce((sum, [, n]) => sum + n, 0) || 1;

  return (
    <div>
      {header}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {/* Users opens User 360, not the raw table — that is where user work happens. */}
        <MetricTile label="Users" value={fmtCount(c["users"] ?? 0)} icon={Users} tone="green" hint="All time" onOpen={() => onOpen("directory")} />
        <MetricTile label="Requests" value={fmtCount(c["item-requests"] ?? 0)} icon={ClipboardList} tone="teal" hint="All time" onOpen={() => onOpen("item-requests")} />
        <MetricTile label="Listings" value={fmtCount(c["item-listings"] ?? 0)} icon={Package} tone="teal" hint="All time" onOpen={() => onOpen("item-listings")} />
        <MetricTile label="Matches" value={fmtCount(c["matches"] ?? 0)} icon={Handshake} tone="green" hint="All time" onOpen={() => onOpen("matches")} />
        <MetricTile label="Campaigns" value={fmtCount(c["campaigns"] ?? 0)} icon={Megaphone} tone="amber" hint="All time" onOpen={() => onOpen("campaigns")} />
        <MetricTile label="Donations" value={fmtCount(c["donations"] ?? 0)} icon={CreditCard} tone="amber" hint="All time" onOpen={() => onOpen("donations")} />
      </div>

      <OverviewInsights data={data.insights} onOpen={onOpen} />

      <div className="mt-5 grid grid-cols-1 gap-5">
        <GlassCard>
          <CardTitle title="Users by role" description={`${fmtCount(roleTotal)} accounts in total`} icon={Database} />
          <ul className="space-y-3.5">
            {roles.map(([role, count]) => {
              const pct = Math.round((count / roleTotal) * 100);
              return (
                <li key={role}>
                  <div className="mb-1.5 flex justify-between text-[13px]">
                    <span className="font-medium">{roleLabel(role)}</span>
                    <span className="font-semibold tabular-nums">{fmtCount(count)} <span className="font-normal text-[color:var(--st-text-2)]">· {pct}%</span></span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#c8d9ec]" aria-hidden>
                    <div className="h-full rounded-full bg-[color:var(--st-primary)]" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>

          <button type="button" onClick={() => onOpen("money")}
            className="mt-6 flex w-full flex-col items-start gap-2 rounded-2xl bg-white/70 px-4 py-4 text-left transition-colors duration-150 hover:bg-white sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span>
              <span className="flex items-center gap-2 text-[13px] font-semibold"><TrendingUp className="size-4 text-[color:var(--st-primary)]" /> Total raised</span>
              <span className="block text-xs text-[color:var(--st-text-2)]">Completed money donations, all time</span>
            </span>
            <span className="whitespace-nowrap text-2xl font-bold tabular-nums sm:text-right sm:text-[28px]">
              ₹{new Intl.NumberFormat("en-IN").format(Number(data.totalRaised ?? 0))}
            </span>
          </button>
        </GlassCard>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SuperAdminPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<SectionKey>("overview");

  // Keep the open panel in ?section= so refresh and shared links land on it.
  // window.location instead of useSearchParams: avoids a Suspense boundary
  // for a page that is client-only anyway.
  // `urlRead` gates the writer: without it the writer stamps "overview" into
  // the URL before the reader's state lands, and StrictMode's second mount
  // pass then reads that back — every refresh returned to Overview.
  const [urlRead, setUrlRead] = useState(false);
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("section");
    if (wanted && NAV.some((n) => n.key === wanted)) setSection(wanted as SectionKey);
    setUrlRead(true);
  }, []);
  useEffect(() => {
    if (!urlRead) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("section") === section) return;
    url.searchParams.set("section", section);
    window.history.replaceState(window.history.state, "", url);
  }, [section, urlRead]);
  // Set when a user is chosen from search or ⌘K, so the directory opens straight
  // into their 360 instead of making the agent find them a second time.
  const [focusUserId, setFocusUserId] = useState<number | undefined>(undefined);

  // Same idea for offers and matches: search knows which record the agent meant,
  // so Interventions should open on it rather than asking for the id again.
  const [focusIntervention, setFocusIntervention] =
    useState<{ entity: SaInterventionEntity; id: number } | undefined>(undefined);

  // Theme. Light is the default; the console used to open dark regardless of
  // preference. Read from storage in an effect rather than in the useState
  // initialiser — localStorage does not exist on the server, and seeding state
  // from it during render makes the first client paint disagree with the
  // server HTML.
  // One theme: the staff console's light-on-forest look (2026-11-19). The old
  // dark/light toggle (ck_sa_theme) is retired; panels still take `isDark`,
  // which is now always false.
  const isDark = false;
  const th = LIGHT;

  // SQL warning modal
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [sqlAck, setSqlAck] = useState(false);

  // Donation details modal — opened by clicking a row in the Donations table.
  const [viewingDonation, setViewingDonation] = useState<SuperAdminRow | null>(null);
  // Listing details modal — opened by clicking a row in the Listings table.
  const [viewingListing, setViewingListing] = useState<SuperAdminRow | null>(null);
  const [viewingRequest, setViewingRequest] = useState<SuperAdminRow | null>(null);

  function handleNavClick(key: SectionKey) {
    if (key === "sql" && !sqlAck) {
      setSqlModalOpen(true);
      return;
    }
    // Leaving the directory by the nav should not silently reopen the last user
    // the next time it's entered.
    if (key !== "directory") setFocusUserId(undefined);
    // Same for Interventions: arriving via the nav is "I want to look something
    // up", not "reopen the record I acted on earlier".
    if (key !== "interventions") setFocusIntervention(undefined);
    setSection(key);
  }

  /**
   * Opening a panel from a Database Overview count.
   *
   * <p>Must be a useCallback: the `content` memo below has a hand-pinned dep
   * array with an eslint-disable over it, so a fresh identity each render would
   * be stale-captured there and the cards would silently stop working.
   *
   * <p>The Users card cannot go through handleNavClick, which deliberately
   * *preserves* focusUserId for the directory (see there). A card reading
   * “5 USERS” means “show me the five”, not “reopen whoever I last inspected”,
   * so this clears the focus first.
   */
  const openFromOverview = useCallback((key: SectionKey) => {
    if (key === "directory") {
      setFocusUserId(undefined);
      setSection("directory");
      return;
    }
    setFocusUserId(undefined);
    setFocusIntervention(undefined);
    setSection(key);
  }, []);

  /** Search and ⌘K both land on the same User 360 workspace. */
  function openUser(id: number) {
    setFocusUserId(id);
    setSection("directory");
  }

  /** Offers and matches land in Interventions, already looked up. */
  function openIntervention(entity: SaInterventionEntity, id: number) {
    setFocusIntervention({ entity, id });
    setSection("interventions");
  }

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "SUPER_ADMIN") { router.replace("/"); }
  }, [user, isLoading, router]);

  const content = useMemo(() => {
    switch (section) {
      case "overview":      return <OverviewSection th={th} onOpen={openFromOverview} />;
      case "crm-staff":     return <CrmStaffPanel />;
      case "search":        return <GlobalSearchPanel onOpenUser={openUser} onOpenIntervention={openIntervention} isDark={isDark} />;
      case "directory":     return <UserDirectoryPanel initialUserId={focusUserId} isDark={isDark} />;
      case "cases":         return <CasesPanel isDark={isDark} />;
      case "interventions": return <InterventionsPanel initialTarget={focusIntervention} isDark={isDark} />;
      case "mail-center":    return <MailCenterPanel isDark={isDark} />;
      case "communications": return <CommunicationsPanel isDark={isDark} />;
      case "governance": return <GovernancePanel isDark={isDark} />;
      case "operations": return <OperationsPanel isDark={isDark} />;
      case "fundraisers": return <FundraisersPanel isDark={isDark} />;
      case "money":       return <MoneyPanel isDark={isDark} />;
      case "users":         return <EntityTable entity="users"         title="Users"         columns={USER_COLS}    filters={USER_FILTERS} canCreate createColumns={USER_CREATE_COLS} isDark={isDark}
                              onView={(row) => router.push(`/admin/dashboard?journeyUser=${row.id}`)}
                              onRowClick={(row) => openUser(Number(row.id))} />;
      case "campaigns":     return <EntityTable entity="campaigns"     title="Campaigns"     columns={CAMPAIGN_COLS} isDark={isDark} />;
      case "donations":     return <EntityTable entity="donations"     title="Donations"     columns={DONATION_COLS} filters={DONATION_FILTERS} isDark={isDark} enrich={enrichDonations}
                              onRowClick={(row) => setViewingDonation(row)} />;
      case "item-requests": return <EntityTable entity="item-requests" title="Item Requests" columns={REQUEST_COLS}   isDark={isDark}
                              onRowClick={(row) => setViewingRequest(row)} />;
      case "item-listings": return <EntityTable entity="item-listings" title="Item Listings" columns={LISTING_COLS}   isDark={isDark}
                              onRowClick={(row) => setViewingListing(row)} />;
      case "matches":       return <EntityTable entity="matches"       title="Matches"       columns={MATCH_COLS}    isDark={isDark} />;
      case "admin-permissions": return <AdminPermissionsPanel />;
      case "disputes":      return <DisputesPanel isDark={isDark} />;
      case "audit-log":     return <AuditLogPanel />;
      case "sql":           return <SqlConsole isDark={isDark} />;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, isDark, focusUserId, focusIntervention, openFromOverview]);

  if (isLoading || !user || user.role !== "SUPER_ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#12355c]">
        <Loader2 className="w-7 h-7 animate-spin text-[#c4e2ff]" />
      </div>
    );
  }

  const current = NAV.find((n) => n.key === section);
  const saNav = (
    <div className="space-y-1">
      {NAV_GROUPS.map((group) => (
        <StaffNavGroup key={group} title={group}>
          {NAV.filter((n) => n.group === group).map(({ key, label, icon, hint }) => (
            <StaffNavItem key={key} label={label} icon={icon} title={hint} active={section === key} onClick={() => handleNavClick(key)}
              trailing={key === "sql" ? <span className="ml-auto rounded-full bg-red-500/25 px-2 py-0.5 text-[10px] font-bold uppercase text-red-100">Danger</span> : undefined} />
          ))}
        </StaffNavGroup>
      ))}
      <StaffNavGroup title="Lives elsewhere">
        {PLANNED_NAV.map(({ label, icon: Icon, phase }) => (
          <div key={label} title={`Built — find it ${phase}`} className="ck-staff-nav-item cursor-default opacity-60 hover:!bg-transparent">
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="flex-1 truncate">{label}</span>
            <span className="text-[10px]">{phase}</span>
          </div>
        ))}
      </StaffNavGroup>
    </div>
  );


  return (
    <>
      <StaffShell
        consoleLabel="Super Admin"
        email={user.email ?? ""}
        onSignOut={() => { logout(); router.push("/login"); }}
        nav={saNav}
        topbarStart={
          <div className="flex min-w-0 items-center gap-4">
            <span className="hidden shrink-0 text-sm font-semibold sm:inline">{current?.label ?? "Super Admin"}</span>
            {/* Inline search with a suggestion dropdown (Ctrl K focuses it). */}
            <TopbarSearch onOpenUser={openUser} onOpenIntervention={openIntervention}
              sections={NAV.map(({ key, label, hint }) => ({ key, label, hint }))}
              onOpenSection={(k) => handleNavClick(k as SectionKey)} />
          </div>
        }
        topbarEnd={
          <span className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs sm:inline-flex">
            <ShieldAlert className="size-3.5" aria-hidden /> Super Admin
          </span>
        }
      >
        <div className="w-full max-w-6xl">
          {/* Sections whose panel prints no title of its own get one here, from
              NAV; the rest carry `ck-page-title` inside the panel. */}
          {current && UNTITLED_SECTIONS.has(current.key) && <PageHeader title={current.label} description={current.hint} />}
          {content}
        </div>
      </StaffShell>

      {viewingDonation && (
        <DonationDetailModal
          row={viewingDonation}
          isDark={isDark}
          onClose={() => setViewingDonation(null)}
          onOpenProfile={(donorId) => { setViewingDonation(null); openUser(donorId); }}
        />
      )}

      {viewingRequest && (
        <RequestDetailModal
          requestId={Number(viewingRequest.id)}
          status={typeof viewingRequest.status === "string" ? viewingRequest.status : null}
          title={typeof viewingRequest.title === "string" ? viewingRequest.title : null}
          isDark={isDark}
          onClose={() => setViewingRequest(null)}
        />
      )}

      {viewingListing && (
        <ListingDetailModal
          row={viewingListing}
          isDark={isDark}
          onClose={() => setViewingListing(null)}
          onOpenProfile={(donorId) => { setViewingListing(null); openUser(donorId); }}
        />
      )}

      {/* ── SQL Warning Modal ─────────────────────────────────────────────── */}
      {sqlModalOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-stone-900/45`}
          onClick={() => setSqlModalOpen(false)}
        >
          {/* This modal was written dark-only. In light mode it rendered as a
              near-black card on a cream page — legible, but plainly a different
              product. It keeps its red danger identity in both themes; only the
              ground and the text weights change. */}
          <div
            className={`w-full max-w-md mx-4 rounded-2xl border shadow-2xl p-6 space-y-5 border-red-300 bg-white`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-3.5">
              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-red-50 border-red-200`}>
                <AlertTriangle className={`w-5.5 h-5.5 text-red-600`} />
              </div>
              <div>
                <h2 className={`text-base font-black leading-tight ${th.textPrimary}`}>SQL Console — Danger Zone</h2>
                <p className={`text-xs mt-0.5 ${th.textDim}`}>Direct production database access</p>
              </div>
            </div>

            {/* Warning body */}
            <div className={`rounded-xl border px-4 py-3.5 space-y-2 border-red-200 bg-red-50`}>
              <p className={`text-sm leading-relaxed text-stone-700`}>
                <span className={`font-black text-red-700`}>Warning:</span> Changes made here are{" "}
                <span className={`font-bold underline text-stone-900 decoration-red-400`}>permanent and cannot be undone</span>.
              </p>
              <p className={`text-sm leading-relaxed text-stone-600`}>
                Queries run directly against the live database. Destructive operations such as{" "}
                <code className={`text-2xs font-mono px-1.5 py-0.5 rounded bg-white text-red-700 border border-red-200`}>
                  UPDATE
                </code>{" "}
                <code className={`text-2xs font-mono px-1.5 py-0.5 rounded bg-white text-red-700 border border-red-200`}>
                  DELETE
                </code>{" "}
                <code className={`text-2xs font-mono px-1.5 py-0.5 rounded bg-white text-red-700 border border-red-200`}>
                  DROP
                </code>{" "}
                bypass all application safeguards.
              </p>
            </div>

            <p className={`text-xs leading-relaxed ${th.textDimmer}`}>
              Only proceed if you fully understand the consequences. This action has been logged.
            </p>

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => {
                  setSqlAck(true);
                  setSqlModalOpen(false);
                  setSection("sql");
                }}
                className={`flex-1 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors bg-red-600 hover:bg-red-700`}
              >
                I understand — proceed
              </button>
              <button
                onClick={() => setSqlModalOpen(false)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors text-stone-600 hover:text-stone-900 border-stone-300 hover:bg-stone-100`}
              >
                Go back
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
