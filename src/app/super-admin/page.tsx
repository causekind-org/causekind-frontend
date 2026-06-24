"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { superAdminOverview, type SuperAdminOverview } from "@/lib/api";
import { EntityTable, type Column } from "@/components/super-admin/EntityTable";
import { SqlConsole } from "@/components/super-admin/SqlConsole";
import {
  LayoutDashboard, Users, Megaphone, CreditCard, ClipboardList, Package,
  Handshake, Terminal, LogOut, ShieldAlert, Loader2, Database, TrendingUp,
} from "lucide-react";

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
  { key: "overview",      label: "Overview",   icon: LayoutDashboard },
  { key: "users",         label: "Users",      icon: Users },
  { key: "campaigns",     label: "Campaigns",  icon: Megaphone },
  { key: "donations",     label: "Donations",  icon: CreditCard },
  { key: "item-requests", label: "Requests",   icon: ClipboardList },
  { key: "item-listings", label: "Listings",   icon: Package },
  { key: "matches",       label: "Matches",    icon: Handshake },
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

function StatTile({ label, value, icon: Icon, delay, accent = "#f0b97a" }: { label: string; value: number; icon: React.ElementType; delay: number; accent?: string }) {
  const v = useCountUp(value);
  return (
    <div className="sa-count-glow relative rounded-2xl border border-white/10 bg-white/[0.03] p-5 overflow-hidden" style={{ animationDelay: `${delay}ms` }}>
      <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full blur-2xl pointer-events-none" style={{ background: `${accent}22` }} />
      <div className="flex items-center justify-between mb-3 relative z-10">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}1a`, color: accent }}>
          <Icon className="w-5 h-5" />
        </span>
      </div>
      <p className="text-3xl font-black text-white tabular-nums leading-none relative z-10">{v.toLocaleString("en-IN")}</p>
      <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mt-1.5 relative z-10">{label}</p>
    </div>
  );
}

function OverviewSection() {
  const [data, setData] = useState<SuperAdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superAdminOverview().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-[#f0b97a]" /></div>;
  if (!data) return <p className="text-stone-500 text-sm">Failed to load overview.</p>;

  const c = data.counts;
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-black text-white tracking-tight">Database Overview</h2>
        <p className="text-xs text-stone-500">Live snapshot of every table.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatTile label="Users"        value={c["users"] ?? 0}          icon={Users}        delay={0}   accent="#f0b97a" />
        <StatTile label="Campaigns"    value={c["campaigns"] ?? 0}      icon={Megaphone}    delay={60}  accent="#e07b3a" />
        <StatTile label="Donations"    value={c["donations"] ?? 0}      icon={CreditCard}   delay={120} accent="#4ade80" />
        <StatTile label="Requests"     value={c["item-requests"] ?? 0}  icon={ClipboardList} delay={180} accent="#60a5fa" />
        <StatTile label="Listings"     value={c["item-listings"] ?? 0}  icon={Package}      delay={240} accent="#a78bfa" />
        <StatTile label="Matches"      value={c["matches"] ?? 0}        icon={Handshake}    delay={300} accent="#f472b6" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Role breakdown */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-[#f0b97a]" />
            <h3 className="text-sm font-bold text-white">Users by role</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(data.roleBreakdown).map(([role, count]) => {
              const total = Object.values(data.roleBreakdown).reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={role}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-mono text-stone-400">{role}</span>
                    <span className="font-bold text-white">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#b04a15] to-[#f0b97a] transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Total raised */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Total raised (completed)</h3>
          </div>
          <p className="text-4xl font-black text-emerald-400 tabular-nums">
            ₹{new Intl.NumberFormat("en-IN").format(Number(data.totalRaised ?? 0))}
          </p>
          <p className="text-xs text-stone-500 mt-1">Across all completed donations.</p>
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

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "SUPER_ADMIN") { router.replace("/"); }
  }, [user, isLoading, router]);

  const content = useMemo(() => {
    switch (section) {
      case "overview":      return <OverviewSection />;
      case "users":         return <EntityTable entity="users"         title="Users"        columns={USER_COLS} canCreate createColumns={USER_CREATE_COLS} />;
      case "campaigns":     return <EntityTable entity="campaigns"     title="Campaigns"    columns={CAMPAIGN_COLS} />;
      case "donations":     return <EntityTable entity="donations"     title="Donations"    columns={DONATION_COLS} />;
      case "item-requests": return <EntityTable entity="item-requests" title="Item Requests" columns={REQUEST_COLS} />;
      case "item-listings": return <EntityTable entity="item-listings" title="Item Listings" columns={LISTING_COLS} />;
      case "matches":       return <EntityTable entity="matches"       title="Matches"      columns={MATCH_COLS} />;
      case "sql":           return <SqlConsole />;
    }
  }, [section]);

  if (isLoading || !user || user.role !== "SUPER_ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05070d]">
        <Loader2 className="w-7 h-7 animate-spin text-[#f0b97a]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-white relative">
      {/* Animated grid backdrop */}
      <div className="fixed inset-0 sa-grid-bg opacity-40 pointer-events-none" />
      <div className="fixed top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-[#b04a15]/10 blur-[150px] pointer-events-none" />

      <div className="relative z-10 flex min-h-screen">
        {/* ── Sidebar (desktop) ── */}
        <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-white/10 bg-[#080b14]/80 backdrop-blur-sm">
          <div className="px-5 py-5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#b04a15] to-[#f0b97a] flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4.5 h-4.5 text-white" />
              </span>
              <div>
                <p className="text-sm font-black tracking-tight leading-none">Command Center</p>
                <p className="text-[10px] text-stone-500 mt-0.5">Super Admin</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSection(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  section === key
                    ? "bg-[#f0b97a]/10 text-[#f0b97a] border border-[#f0b97a]/20"
                    : "text-stone-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
                {key === "sql" && <span className="ml-auto text-[9px] font-black uppercase text-red-400/70">danger</span>}
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-white/10">
            <p className="text-[10px] text-stone-600 px-3 mb-2 truncate font-mono">{user.email}</p>
            <button onClick={() => { logout(); router.push("/login"); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-stone-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </aside>

        {/* ── Main column ── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-5 py-3.5 border-b border-white/10 bg-[#05070d]/80 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono text-stone-400">root@causekind</span>
            </div>
            <button onClick={() => { logout(); router.push("/login"); }} className="lg:hidden flex items-center gap-1.5 text-xs font-semibold text-stone-400 hover:text-red-400 transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </header>

          {/* Mobile nav strip */}
          <div className="lg:hidden flex gap-1.5 overflow-x-auto scrollbar-hide px-4 py-3 border-b border-white/10">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSection(key)}
                className={`flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  section === key ? "bg-[#f0b97a]/10 text-[#f0b97a]" : "text-stone-400 hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <main className="flex-1 p-5 sm:p-7 max-w-6xl w-full">
            {content}
          </main>
        </div>
      </div>
    </div>
  );
}
