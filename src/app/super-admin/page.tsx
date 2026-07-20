"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { superAdminOverview, type SuperAdminOverview } from "@/lib/api";
import { EntityTable, type Column } from "@/components/super-admin/EntityTable";
import { SqlConsole } from "@/components/super-admin/SqlConsole";
import { WhatsAppPanel } from "@/components/admin/WhatsAppPanel";
import { AdminPermissionsPanel } from "@/components/super-admin/AdminPermissionsPanel";
import { DisputesPanel } from "@/components/super-admin/DisputesPanel";
import { AuditLogPanel } from "@/components/super-admin/AuditLogPanel";
import {
  LayoutDashboard, Users, Megaphone, CreditCard, ClipboardList, Package,
  Handshake, Terminal, LogOut, ShieldAlert, Loader2, Database, TrendingUp,
  Sun, Moon, AlertTriangle, MessageCircle, KeyRound, Flag, History,
} from "lucide-react";

// ── Theme tokens ──────────────────────────────────────────────────────────────
type Th = {
  root: string; sidebar: string; topbar: string; divider: string; card: string;
  textPrimary: string; textMuted: string; textDim: string; textDimmer: string;
  navActive: string; navInactive: string; signout: string;
  accent: string; roleBar: string; toggleBtn: string; sqlLabel: string;
  roleText: string; barGradient: string;
};

const DARK: Th = {
  root:        "bg-[#05070d] text-white",
  sidebar:     "bg-[#080b14]/80 backdrop-blur-sm",
  topbar:      "bg-[#05070d]/80 backdrop-blur-md",
  divider:     "border-white/10",
  card:        "bg-white/[0.03] border-white/10",
  textPrimary: "text-white",
  textMuted:   "text-stone-400",
  textDim:     "text-stone-500",
  textDimmer:  "text-stone-600",
  navActive:   "bg-[#f0b97a]/10 text-[#f0b97a] border-[#f0b97a]/20",
  navInactive: "text-stone-400 hover:text-white hover:bg-white/5 border-transparent",
  signout:     "text-stone-400 hover:text-red-400 hover:bg-red-500/10",
  accent:      "#f0b97a",
  roleBar:     "bg-white/5",
  toggleBtn:   "bg-white/10 hover:bg-white/15 text-[#f0b97a]",
  sqlLabel:    "text-red-400/70",
  roleText:    "text-stone-400",
  barGradient: "from-[#b04a15] to-[#f0b97a]",
};

const LIGHT: Th = {
  root:        "bg-[#faf7f2] text-stone-900",
  sidebar:     "bg-white",
  topbar:      "bg-white/95 backdrop-blur-md",
  divider:     "border-stone-200",
  card:        "bg-white border-stone-200 shadow-sm",
  textPrimary: "text-stone-900",
  textMuted:   "text-stone-500",
  textDim:     "text-stone-500",
  textDimmer:  "text-stone-400",
  navActive:   "bg-[#b04a15]/10 text-[#b04a15] border-[#b04a15]/20",
  navInactive: "text-stone-600 hover:text-stone-900 hover:bg-stone-100 border-transparent",
  signout:     "text-stone-500 hover:text-red-600 hover:bg-red-50",
  accent:      "#b04a15",
  roleBar:     "bg-stone-100",
  toggleBtn:   "bg-stone-100 hover:bg-stone-200 text-stone-600",
  sqlLabel:    "text-red-600/70",
  roleText:    "text-stone-500",
  barGradient: "from-[#b04a15] to-[#e07b3a]",
};

// ── Enum option sets (mirror backend enums) ──────────────────────────────────
const ROLES = ["DONOR", "DONEE", "ADMIN", "SUPER_ADMIN"];
const CAMPAIGN_STATUS = ["PENDING_APPROVAL", "APPROVED", "REJECTED"];
const DONATION_STATUS = ["INITIATED", "COMPLETED", "FAILED"];
const REQUEST_STATUS = ["DRAFT", "PENDING_VERIFICATION", "VERIFIED_PRIVATE_MATCHING", "POTENTIAL_MATCH_FOUND", "AWAITING_MATCH_APPROVAL", "PUBLICATION_CONSENT_REQUIRED", "PUBLIC_REQUEST", "RESERVED", "FULFILMENT_IN_PROGRESS", "FULFILLED", "EXPIRED", "REJECTED"];
const LISTING_STATUS = ["DRAFT", "PENDING_REVIEW", "AVAILABLE", "POTENTIAL_MATCH", "AWAITING_DONOR_CONFIRMATION", "RESERVED", "HANDOVER_SCHEDULED", "IN_TRANSIT", "FULFILLED", "EXPIRED", "WITHDRAWN", "REJECTED"];
const FULFILMENT_STATUS = ["PENDING_APPROVAL", "TRANSPORT_DISCUSSION", "ARRANGEMENT_AGREED", "PICKUP_SCHEDULED", "PICKED_UP", "IN_TRANSIT", "DELIVERY_ATTEMPTED", "DELIVERED_PENDING_CONFIRMATION", "FULFILLED", "RESCHEDULED", "FAILED", "CANCELLED", "REJECTED"];
const URGENCY = ["NORMAL", "HIGH", "CRITICAL"];

// ── Column configs per entity ─────────────────────────────────────────────────
const USER_COLS: Column[] = [
  { key: "id", label: "ID" },
  { key: "fullName", label: "Name", editable: true },
  { key: "email", label: "Email", editable: true },
  { key: "phone", label: "Phone", editable: true },
  { key: "city", label: "City", editable: true },
  { key: "role", label: "Role", editable: true, type: "select", options: ROLES },
  { key: "active", label: "Active", editable: true, type: "boolean" },
  { key: "createdAt", label: "Joined" },
  { key: "password", label: "Reset password", editable: true, type: "text", inTable: false },
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
  { key: "id", label: "ID" },
  { key: "title", label: "Title", editable: true },
  { key: "doneeName", label: "Donee" },
  { key: "category", label: "Category", editable: true },
  { key: "city", label: "City", editable: true },
  { key: "state", label: "State", editable: true },
  { key: "targetAmount", label: "Target", editable: true, type: "number" },
  { key: "amountRaised", label: "Raised", editable: true, type: "number" },
  { key: "status", label: "Status", editable: true, type: "select", options: CAMPAIGN_STATUS },
  { key: "description", label: "Description", editable: true, type: "textarea", inTable: false },
  { key: "rejectionReason", label: "Rejection reason", editable: true, type: "text", inTable: false },
];
const DONATION_COLS: Column[] = [
  { key: "id", label: "ID" },
  { key: "donorName", label: "Donor" },
  { key: "campaignTitle", label: "Campaign" },
  { key: "amount", label: "Amount", editable: true, type: "number" },
  { key: "currency", label: "Cur", editable: true },
  { key: "status", label: "Status", editable: true, type: "select", options: DONATION_STATUS },
  { key: "razorpayOrderId", label: "Order ID" },
  { key: "razorpayPaymentId", label: "Payment ID", editable: true, type: "text", inTable: false },
];
const REQUEST_COLS: Column[] = [
  { key: "id", label: "ID" },
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
  { key: "id", label: "ID" },
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
const MATCH_COLS: Column[] = [
  { key: "id", label: "ID" },
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
  { key: "overview",      label: "Overview",    icon: LayoutDashboard },
  { key: "users",         label: "Users",       icon: Users },
  { key: "campaigns",     label: "Campaigns",   icon: Megaphone },
  { key: "donations",     label: "Donations",   icon: CreditCard },
  { key: "item-requests", label: "Requests",    icon: ClipboardList },
  { key: "item-listings", label: "Listings",    icon: Package },
  { key: "matches",       label: "Matches",     icon: Handshake },
  { key: "whatsapp",      label: "WhatsApp",    icon: MessageCircle },
  { key: "admin-permissions", label: "Admin Access", icon: KeyRound },
  { key: "disputes",      label: "Disputes",    icon: Flag },
  { key: "audit-log",     label: "Audit Log",   icon: History },
  { key: "sql",           label: "SQL Console", icon: Terminal },
] as const;

type SectionKey = (typeof NAV)[number]["key"];

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

function StatTile({
  label, value, icon: Icon, delay, accent = "#f0b97a", th,
}: {
  label: string; value: number; icon: React.ElementType; delay: number; accent?: string; th: Th;
}) {
  const v = useCountUp(value);
  return (
    <div
      className={`sa-count-glow relative rounded-2xl border p-5 overflow-hidden ${th.card}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full blur-2xl pointer-events-none"
        style={{ background: `${accent}22` }}
      />
      <div className="flex items-center justify-between mb-3 relative z-10">
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}1a`, color: accent }}
        >
          <Icon className="w-5 h-5" />
        </span>
      </div>
      <p className={`text-3xl font-black tabular-nums leading-none relative z-10 ${th.textPrimary}`}>
        {v.toLocaleString("en-IN")}
      </p>
      <p className={`text-[11px] font-bold uppercase tracking-wider mt-1.5 relative z-10 ${th.textDim}`}>
        {label}
      </p>
    </div>
  );
}

function OverviewSection({ th }: { th: Th }) {
  const [data, setData] = useState<SuperAdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superAdminOverview().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: th.accent }} />
    </div>
  );
  if (!data) return <p className={`text-sm ${th.textDim}`}>Failed to load overview.</p>;

  const c = data.counts;
  return (
    <div className="space-y-8">
      <div>
        <h2 className={`text-lg font-black tracking-tight ${th.textPrimary}`}>Database Overview</h2>
        <p className={`text-xs ${th.textDim}`}>Live snapshot of every table.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatTile label="Users"     value={c["users"] ?? 0}         icon={Users}        delay={0}   accent="#f0b97a" th={th} />
        <StatTile label="Campaigns" value={c["campaigns"] ?? 0}     icon={Megaphone}    delay={60}  accent="#e07b3a" th={th} />
        <StatTile label="Donations" value={c["donations"] ?? 0}     icon={CreditCard}   delay={120} accent="#4ade80" th={th} />
        <StatTile label="Requests"  value={c["item-requests"] ?? 0} icon={ClipboardList} delay={180} accent="#60a5fa" th={th} />
        <StatTile label="Listings"  value={c["item-listings"] ?? 0} icon={Package}      delay={240} accent="#a78bfa" th={th} />
        <StatTile label="Matches"   value={c["matches"] ?? 0}       icon={Handshake}    delay={300} accent="#f472b6" th={th} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Role breakdown */}
        <div className={`rounded-2xl border p-5 ${th.card}`}>
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4" style={{ color: th.accent }} />
            <h3 className={`text-sm font-bold ${th.textPrimary}`}>Users by role</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(data.roleBreakdown).map(([role, count]) => {
              const total = Object.values(data.roleBreakdown).reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={role}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`font-mono ${th.roleText}`}>{role}</span>
                    <span className={`font-bold ${th.textPrimary}`}>{count}</span>
                  </div>
                  <div className={`h-1.5 rounded-full overflow-hidden ${th.roleBar}`}>
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${th.barGradient} transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Total raised */}
        <div className={`rounded-2xl border p-5 flex flex-col justify-center ${th.card}`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className={`text-sm font-bold ${th.textPrimary}`}>Total raised (completed)</h3>
          </div>
          <p className="text-4xl font-black text-emerald-400 tabular-nums">
            ₹{new Intl.NumberFormat("en-IN").format(Number(data.totalRaised ?? 0))}
          </p>
          <p className={`text-xs mt-1 ${th.textDim}`}>Across all completed donations.</p>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SuperAdminPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<SectionKey>("overview");

  // Theme
  const [isDark, setIsDark] = useState(true);
  const th = isDark ? DARK : LIGHT;

  // SQL warning modal
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [sqlAck, setSqlAck] = useState(false);

  function handleNavClick(key: SectionKey) {
    if (key === "sql" && !sqlAck) {
      setSqlModalOpen(true);
      return;
    }
    setSection(key);
  }

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "SUPER_ADMIN") { router.replace("/"); }
  }, [user, isLoading, router]);

  const content = useMemo(() => {
    switch (section) {
      case "overview":      return <OverviewSection th={th} />;
      case "users":         return <EntityTable entity="users"         title="Users"         columns={USER_COLS}    canCreate createColumns={USER_CREATE_COLS} isDark={isDark}
                              onView={(row) => router.push(`/admin/dashboard?journeyUser=${row.id}`)} />;
      case "campaigns":     return <EntityTable entity="campaigns"     title="Campaigns"     columns={CAMPAIGN_COLS} isDark={isDark} />;
      case "donations":     return <EntityTable entity="donations"     title="Donations"     columns={DONATION_COLS} isDark={isDark} />;
      case "item-requests": return <EntityTable entity="item-requests" title="Item Requests" columns={REQUEST_COLS}   isDark={isDark} />;
      case "item-listings": return <EntityTable entity="item-listings" title="Item Listings" columns={LISTING_COLS}   isDark={isDark} />;
      case "matches":       return <EntityTable entity="matches"       title="Matches"       columns={MATCH_COLS}    isDark={isDark} />;
      case "whatsapp":      return <WhatsAppPanel />;
      case "admin-permissions": return <AdminPermissionsPanel />;
      case "disputes":      return <DisputesPanel />;
      case "audit-log":     return <AuditLogPanel />;
      case "sql":           return <SqlConsole isDark={isDark} />;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, isDark]);

  // Theme toggle button (reused in sidebar + topbar)
  const ThemeToggle = (
    <button
      onClick={() => setIsDark(d => !d)}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${th.toggleBtn}`}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );

  if (isLoading || !user || user.role !== "SUPER_ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05070d]">
        <Loader2 className="w-7 h-7 animate-spin text-[#f0b97a]" />
      </div>
    );
  }

  return (
    <div className={`h-screen overflow-hidden relative ${th.root}`}>
      {/* Animated grid backdrop (dark only) */}
      {isDark && (
        <>
          <div className="fixed inset-0 sa-grid-bg opacity-40 pointer-events-none" />
          <div className="fixed top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-[#b04a15]/10 blur-[150px] pointer-events-none" />
        </>
      )}
      {/* Light mode subtle warm glow */}
      {!isDark && (
        <div className="fixed top-0 right-0 w-[600px] h-[400px] rounded-full bg-[#b04a15]/5 blur-[120px] pointer-events-none" />
      )}

      <div className="relative z-10 flex h-screen">
        {/* ── Sidebar (desktop) ── */}
        <aside className={`hidden lg:flex w-60 shrink-0 flex-col h-screen border-r ${th.divider} ${th.sidebar}`}>
          <div className={`shrink-0 px-5 py-5 border-b ${th.divider}`}>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#b04a15] to-[#f0b97a] flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4 text-white" />
              </span>
              <div>
                <p className={`text-sm font-black tracking-tight leading-none ${th.textPrimary}`}>Command Center</p>
                <p className={`text-[10px] mt-0.5 ${th.textDim}`}>Super Admin</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleNavClick(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                  section === key ? th.navActive : th.navInactive
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
                {key === "sql" && (
                  <span className={`ml-auto text-[9px] font-black uppercase ${th.sqlLabel}`}>danger</span>
                )}
              </button>
            ))}
          </nav>

          <div className={`shrink-0 p-3 border-t ${th.divider}`}>
            <p className={`text-[10px] px-3 mb-2 truncate font-mono ${th.textDimmer}`}>{user.email}</p>
            <div className="flex items-center gap-1.5">
              {ThemeToggle}
              <button
                onClick={() => { logout(); router.push("/login"); }}
                className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${th.signout}`}
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main column ── */}
        <div className="flex-1 min-w-0 h-screen flex flex-col">
          {/* Topbar */}
          <header className={`shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 border-b ${th.divider} ${th.topbar}`}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className={`text-xs font-mono ${th.textMuted}`}>root@causekind</span>
            </div>
            <div className="flex items-center gap-2">
              {ThemeToggle}
              <button
                onClick={() => { logout(); router.push("/login"); }}
                className={`lg:hidden flex items-center gap-1.5 text-xs font-semibold transition-colors ${th.signout}`}
              >
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </div>
          </header>

          {/* Mobile nav strip */}
          <div className={`shrink-0 lg:hidden flex gap-1.5 overflow-x-auto scrollbar-hide px-4 py-3 border-b ${th.divider}`}>
            {NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleNavClick(key)}
                className={`flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  section === key
                    ? isDark ? "bg-[#f0b97a]/10 text-[#f0b97a]" : "bg-[#b04a15]/10 text-[#b04a15]"
                    : th.textMuted + " hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <main className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 max-w-6xl w-full">
            {content}
          </main>
        </div>
      </div>

      {/* ── SQL Warning Modal ─────────────────────────────────────────────── */}
      {sqlModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setSqlModalOpen(false)}
        >
          <div
            className="w-full max-w-md mx-4 rounded-2xl border border-red-500/40 bg-[#0f0a0d] shadow-2xl p-6 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5.5 h-5.5 text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-black text-white leading-tight">SQL Console — Danger Zone</h2>
                <p className="text-xs text-stone-500 mt-0.5">Direct production database access</p>
              </div>
            </div>

            {/* Warning body */}
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3.5 space-y-2">
              <p className="text-sm text-stone-200 leading-relaxed">
                <span className="font-black text-red-400">Warning:</span> Changes made here are{" "}
                <span className="font-bold text-white underline decoration-red-500/50">permanent and cannot be undone</span>.
              </p>
              <p className="text-sm text-stone-400 leading-relaxed">
                Queries run directly against the live database. Destructive operations such as{" "}
                <code className="text-[11px] font-mono bg-white/5 px-1.5 py-0.5 rounded text-red-300">
                  UPDATE
                </code>{" "}
                <code className="text-[11px] font-mono bg-white/5 px-1.5 py-0.5 rounded text-red-300">
                  DELETE
                </code>{" "}
                <code className="text-[11px] font-mono bg-white/5 px-1.5 py-0.5 rounded text-red-300">
                  DROP
                </code>{" "}
                bypass all application safeguards.
              </p>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
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
                className="flex-1 bg-red-700/80 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors"
              >
                I understand — proceed
              </button>
              <button
                onClick={() => setSqlModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors"
              >
                Go back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
