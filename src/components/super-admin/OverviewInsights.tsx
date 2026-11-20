"use client";

import { useMemo, useState, type ComponentType } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  LifeBuoy, Scale, SlidersHorizontal, HandCoins, Activity, AlertTriangle, ShieldAlert, Mail,
  ChevronRight, Clock, Bot, Ban, Flag, Inbox, ExternalLink,
} from "lucide-react";
import type { SuperAdminInsights, SaTrendPoint } from "@/lib/api";
import { GlassCard, CardTitle } from "@/components/staff/primitives";

/**
 * Super Admin Overview insights (2026-11-20). Renders only what
 * GET /super-admin/overview → `insights` returns. Rules:
 *  - a null figure shows as "—" with an "unavailable" label, never as 0;
 *  - percentages appear only where both numbers are real totals (AI overrule
 *    rate, bounce rate) and the denominator is above zero;
 *  - no trend arrows, targets or "vs last period" — the backend has no baseline.
 */

type SectionKey = "cases" | "interventions" | "disputes" | "money" | "operations" | "mail-center" | "directory";

const C = {
  primary: "#2d7fd6",
  deep: "#1f66b3",
  pale: "#d9ebff",
  grid: "#dbe6f2",
  axis: "#4f6480",
  ink: "#10233a",
  amber: "#b7791f",
};

const nf = new Intl.NumberFormat("en-IN");
const money = (v: number | null | undefined) => (v == null ? "—" : `₹${nf.format(Math.round(Number(v)))}`);
const num = (v: number | null | undefined) => (v == null ? "—" : nf.format(Number(v)));
const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const ROLE_LABELS: Record<string, string> = {
  DONOR: "Donors", DONEE: "Donees", NGO_PARTNER: "NGO partners", ADMIN: "Admins", SUPER_ADMIN: "Super admins",
};

export function OverviewInsights({ data, onOpen }: { data: SuperAdminInsights | undefined; onOpen: (key: SectionKey) => void }) {
  if (!data) {
    return (
      <GlassCard className="mt-5">
        <p className="text-sm text-[#4f6480]">
          Insights are not available from this server yet. Counts above are still live.
        </p>
      </GlassCard>
    );
  }
  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-5 lg:grid-cols-5">
        <NeedsAttention data={data} onOpen={onOpen} />
        <AdminQueues q={data.adminQueues} />
      </div>
      <ActivityAndTrends data={data} />
      <div className="grid gap-5 lg:grid-cols-3">
        <Stuck s={data.stuck} onOpen={onOpen} />
        <Trust t={data.trust} onOpen={onOpen} />
        <MailHealth m={data.mail} onOpen={onOpen} />
      </div>
      <p className="text-right text-[11px] text-[#4f6480]">
        Figures as of {new Date(data.generatedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );
}

// ── Needs attention ──────────────────────────────────────────────────────────

function NeedsAttention({ data, onOpen }: { data: SuperAdminInsights; onOpen: (k: SectionKey) => void }) {
  const a = data.attention;
  const rows: { key: SectionKey; label: string; hint: string; icon: ComponentType<{ className?: string }>; count: number | null; warn?: boolean }[] = [
    { key: "cases", label: "Support cases", icon: LifeBuoy, count: a.openCases,
      hint: a.overdueCases ? `${num(a.overdueCases)} past their deadline` : "Open cases and information requests", warn: !!a.overdueCases },
    { key: "disputes", label: "Disputes", icon: Scale, count: a.openDisputes, hint: "Problems raised after handover still open" },
    { key: "interventions", label: "Requests on hold", icon: SlidersHorizontal, count: a.requestsOnHold, hint: "Held requests waiting to be resumed or decided" },
  ];
  return (
    <GlassCard className="lg:col-span-3">
      <CardTitle title="Needs attention" description="Work a super admin settles, as of now." icon={AlertTriangle} />
      <ul className="-mx-3 space-y-0.5">
        {rows.map((r) => (
          <li key={r.key}>
            <button type="button" onClick={() => onOpen(r.key)}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors duration-150 hover:bg-white/70">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${r.warn ? "bg-[#fbefd5] text-[#8a5a10]" : "bg-[#d9ebff] text-[#1f66b3]"}`}>
                <r.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{r.label}</span>
                <span className={`block truncate text-xs ${r.warn ? "font-semibold text-[#8a5a10]" : "text-[#4f6480]"}`}>{r.hint}</span>
              </span>
              <Count value={r.count} />
              <ChevronRight className="size-4 text-[#4f6480]" aria-hidden />
            </button>
          </li>
        ))}
        {([
          ["money", "Money", "Payments, refunds and payout status", HandCoins],
          ["operations", "Operational health", "Health checks and runtime config", Activity],
        ] as const).map(([key, label, hint, Icon]) => (
          <li key={key}>
            <button type="button" onClick={() => onOpen(key)}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors duration-150 hover:bg-white/70">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e6eef8] text-[#41567a]"><Icon className="size-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block truncate text-xs text-[#4f6480]">{hint}</span>
              </span>
              <ChevronRight className="size-4 text-[#4f6480]" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

function Count({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-[#4f6480]" title="This figure could not be loaded">unavailable</span>;
  return <span className="text-xl font-bold tabular-nums">{nf.format(value)}</span>;
}

// ── Admin queues (bar chart) ─────────────────────────────────────────────────

function AdminQueues({ q }: { q: SuperAdminInsights["adminQueues"] }) {
  const rows = [
    { name: "Requests", value: q.requests },
    { name: "Listings", value: q.listings },
    { name: "Offers", value: q.offers },
    { name: "Matches", value: q.matches },
    { name: "NGO applications", value: q.ngoApplications },
    { name: "Fundraisers", value: q.fundraisingApplications },
  ];
  const total = rows.reduce((s, r) => s + (r.value ?? 0), 0);
  const missing = rows.filter((r) => r.value == null).map((r) => r.name);
  return (
    <GlassCard className="lg:col-span-2">
      <CardTitle title="Admin queues" description={`${nf.format(total)} items waiting for an admin decision`} icon={Inbox}
        action={<a href="/admin/dashboard" className="inline-flex items-center gap-1 text-xs font-semibold text-[#1f66b3] hover:underline">Admin console <ExternalLink className="size-3" aria-hidden /></a>} />
      <ul className="space-y-2.5" aria-label="Items waiting in each admin queue">
        {rows.map((r) => {
          const max = Math.max(1, ...rows.map((x) => x.value ?? 0));
          const pct = r.value == null ? 0 : Math.round((r.value / max) * 100);
          return (
            <li key={r.name}>
              <div className="mb-1 flex justify-between text-[13px]">
                <span className="font-medium">{r.name}</span>
                <span className="font-semibold tabular-nums">{r.value == null ? "unavailable" : nf.format(r.value)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#dbe6f2]" aria-hidden>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: C.primary }} />
              </div>
            </li>
          );
        })}
      </ul>
      {missing.length > 0 && <p className="mt-3 text-xs text-[#8a5a10]">Could not load: {missing.join(", ")}.</p>}
    </GlassCard>
  );
}

// ── Activity tiles + 30-day trends ───────────────────────────────────────────

const TREND_SERIES = [
  { key: "signups", label: "Sign-ups" },
  { key: "requests", label: "Requests" },
  { key: "listings", label: "Listings" },
  { key: "certificates", label: "Certificates" },
] as const;
type TrendKey = (typeof TREND_SERIES)[number]["key"];

function ActivityAndTrends({ data }: { data: SuperAdminInsights }) {
  const [period, setPeriod] = useState<"last7Days" | "last30Days">("last7Days");
  const [series, setSeries] = useState<TrendKey>("signups");
  const act = data.activity[period];
  const points = data.trends[series];
  const moneyPoints = data.trends.moneyReceived;

  const chartData = useMemo(() => (points ?? []).map((p) => ({ ...p, label: dayLabel(p.date), value: Number(p.value) })), [points]);
  const moneyData = useMemo(() => (moneyPoints ?? []).map((p) => ({ ...p, label: dayLabel(p.date), value: Number(p.value) })), [moneyPoints]);
  const seriesTotal = sumPoints(points);
  const moneyTotal = sumPoints(moneyPoints);
  const roles = act.signupsByRole ? Object.entries(act.signupsByRole).sort((x, y) => y[1] - x[1]) : null;

  const tiles: { label: string; value: string }[] = [
    { label: "New sign-ups", value: num(act.signups) },
    { label: "New requests", value: num(act.requests) },
    { label: "New listings", value: num(act.listings) },
    { label: "Certificates issued", value: num(act.certificatesIssued) },
    { label: "Money donations", value: num(act.moneyDonations) },
    { label: "Money received", value: money(act.moneyReceived) },
  ];

  return (
    <GlassCard>
      <CardTitle title="Activity" description={period === "last7Days" ? "Last 7 days" : "Last 30 days"}
        action={<Segmented value={period} onChange={setPeriod} label="Period"
          options={[{ value: "last7Days", label: "7 days" }, { value: "last30Days", label: "30 days" }]} />} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl bg-white/80 px-4 py-3">
            <p className="text-[22px] font-bold leading-tight tabular-nums">{t.value}</p>
            <p className="mt-1 text-xs text-[#4f6480]">{t.label}</p>
          </div>
        ))}
      </div>

      {roles && roles.length > 0 && (
        <p className="mt-3 text-xs text-[#4f6480]">
          Sign-ups by role: {roles.map(([r, n]) => `${ROLE_LABELS[r] ?? r} ${nf.format(n)}`).join(" · ")}
        </p>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[15px] font-semibold">Daily, last {data.trends.days} days</h3>
            <Segmented value={series} onChange={setSeries} label="Series"
              options={TREND_SERIES.map((s) => ({ value: s.key, label: s.label }))} />
          </div>
          {points == null ? <Unavailable /> : (
            <figure aria-label={`${labelOf(series)} per day for the last ${data.trends.days} days, ${nf.format(seriesTotal)} in total`}>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ovFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.primary} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={C.primary} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={C.grid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: C.axis, fontSize: 11 }} tickLine={false} axisLine={false} interval={6} />
                    <YAxis allowDecimals={false} tick={{ fill: C.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                    <Tooltip formatter={(v: number) => [nf.format(v), labelOf(series)]} labelFormatter={(l) => String(l)} />
                    <Area type="monotone" dataKey="value" stroke={C.primary} strokeWidth={2} fill="url(#ovFill)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <figcaption className="mt-1 text-xs text-[#4f6480]">{nf.format(seriesTotal)} {labelOf(series).toLowerCase()} in {data.trends.days} days</figcaption>
            </figure>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="mb-3 text-[15px] font-semibold">Money received per day</h3>
          {moneyPoints == null ? <Unavailable /> : (
            <figure aria-label={`Completed money donations per day for the last ${data.trends.days} days, ${money(moneyTotal)} in total`}>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  {/* Bars, not a line: each day is a separate amount (same rule as Analytics' monthly volume). */}
                  <BarChart data={moneyData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={C.grid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: C.axis, fontSize: 11 }} tickLine={false} axisLine={false} interval={6} />
                    <YAxis tick={{ fill: C.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={56}
                      tickFormatter={(v: number) => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)} />
                    <Tooltip formatter={(v: number) => [money(v), "Received"]} />
                    <Bar dataKey="value" fill={C.deep} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <figcaption className="mt-1 text-xs text-[#4f6480]">{money(moneyTotal)} from completed donations in {data.trends.days} days</figcaption>
            </figure>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

const labelOf = (k: TrendKey) => TREND_SERIES.find((s) => s.key === k)?.label ?? k;
const sumPoints = (p: SaTrendPoint[] | null) => (p ?? []).reduce((s, x) => s + Number(x.value), 0);

function Unavailable() {
  return <p className="flex h-56 items-center justify-center rounded-2xl bg-white/60 text-sm text-[#4f6480]">This chart could not be loaded.</p>;
}

function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-white/80 bg-white/55 p-1">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}
          className={`h-8 shrink-0 rounded-full px-3 text-xs font-medium transition-colors duration-150 ${value === o.value ? "bg-[#10233a] text-white" : "text-[#3a5070] hover:bg-white/70"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Stuck / Trust / Mail ─────────────────────────────────────────────────────

function StatRow({ icon: Icon, label, hint, value, warn, onClick }: {
  icon: ComponentType<{ className?: string }>; label: string; hint?: string; value: string; warn?: boolean; onClick?: () => void;
}) {
  const body = (
    <>
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${warn ? "bg-[#fbefd5] text-[#8a5a10]" : "bg-[#e6eef8] text-[#41567a]"}`}><Icon className="size-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold">{label}</span>
        {hint && <span className="block text-[11.5px] text-[#4f6480]">{hint}</span>}
      </span>
      <span className={`text-lg font-bold tabular-nums ${warn ? "text-[#8a5a10]" : ""}`}>{value}</span>
    </>
  );
  return (
    <li>
      {onClick ? (
        <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors duration-150 hover:bg-white/70">{body}</button>
      ) : (
        <div className="flex items-center gap-3 px-2 py-2.5">{body}</div>
      )}
    </li>
  );
}

function Stuck({ s, onOpen }: { s: SuperAdminInsights["stuck"]; onOpen: (k: SectionKey) => void }) {
  return (
    <GlassCard>
      <CardTitle title="Looks stuck" description="Early warnings worth a look." icon={Clock} />
      <ul className="-mx-2">
        <StatRow icon={AlertTriangle} label="Matches at risk" hint="Handover flagged at risk" value={num(s.matchesAtRisk)} warn={!!s.matchesAtRisk} onClick={() => onOpen("interventions")} />
        <StatRow icon={AlertTriangle} label="Offers at risk" hint="Handover flagged at risk" value={num(s.offersAtRisk)} warn={!!s.offersAtRisk} onClick={() => onOpen("interventions")} />
        <StatRow icon={Bot} label="Offers stuck in AI screening" hint="Submitted over an hour ago" value={num(s.offersStuckInScreening)} warn={!!s.offersStuckInScreening} onClick={() => onOpen("operations")} />
        <StatRow icon={Clock} label="Requests past verification deadline" hint="Still waiting for review" value={num(s.requestsPastVerificationDeadline)} warn={!!s.requestsPastVerificationDeadline} />
      </ul>
    </GlassCard>
  );
}

function Trust({ t, onOpen }: { t: SuperAdminInsights["trust"]; onOpen: (k: SectionKey) => void }) {
  const reviewed = t.aiDecisionsReviewed30d;
  const overruled = t.aiDecisionsOverruled30d;
  const rate = reviewed && overruled != null && reviewed > 0 ? Math.round((overruled / reviewed) * 100) : null;
  return (
    <GlassCard>
      <CardTitle title="Safety and trust" description="Signals from the last 30 days and right now." icon={ShieldAlert} />
      <ul className="-mx-2">
        <StatRow icon={Flag} label="Fraud flags raised" hint="Last 30 days" value={num(t.fraudFlags30d)} warn={!!t.fraudFlags30d} />
        <StatRow icon={Ban} label="Users suspended" hint="Suspension still running" value={num(t.usersSuspended)} onClick={() => onOpen("directory")} />
        <StatRow icon={ShieldAlert} label="Active restrictions" hint="Not expired or revoked" value={num(t.activeRestrictions)} onClick={() => onOpen("directory")} />
        <StatRow icon={Bot} label="AI decisions overruled"
          hint={reviewed == null ? "Unavailable" : rate == null ? "No AI decisions reviewed by staff in 30 days" : `${rate}% of ${nf.format(reviewed)} reviewed by staff`}
          value={num(overruled)} />
      </ul>
    </GlassCard>
  );
}

function MailHealth({ m, onOpen }: { m: SuperAdminInsights["mail"]; onOpen: (k: SectionKey) => void }) {
  const bounceRate = m.sent7d && m.bounced7d != null && m.sent7d > 0 ? Math.round((m.bounced7d / m.sent7d) * 1000) / 10 : null;
  return (
    <GlassCard>
      <CardTitle title="Mail health" description="Mail Center, last 7 days." icon={Mail}
        action={<button type="button" onClick={() => onOpen("mail-center")} className="text-xs font-semibold text-[#1f66b3] hover:underline">Open</button>} />
      <ul className="-mx-2">
        <StatRow icon={Mail} label="Sent" value={num(m.sent7d)} />
        <StatRow icon={Mail} label="Delivered" value={num(m.delivered7d)} />
        <StatRow icon={AlertTriangle} label="Bounced" hint={bounceRate == null ? undefined : `${bounceRate}% of sent`} value={num(m.bounced7d)} warn={!!m.bounced7d} />
        <StatRow icon={Ban} label="Blocked addresses" hint="Suppressed, all time" value={num(m.suppressedTotal)} />
      </ul>
    </GlassCard>
  );
}
