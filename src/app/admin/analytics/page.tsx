"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  adminGetAllDonations,
  adminGetCampaigns,
  adminGetDonationStats,
  type AdminDonation,
  type Campaign,
  type DonationStats,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  HandCoins,
  Loader2,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";

const CHART_COLORS = ["#b04a15", "#e07b3a", "#1e3a60", "#f0b97a", "#4a7fba", "#6b7280"];

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatINRShort(n: number) {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
}

export default function AdminAnalyticsPage() {
  const t = useTranslations("adminAnalytics");
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [donations, setDonations] = useState<AdminDonation[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<DonationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }

    Promise.all([
      adminGetAllDonations(),
      adminGetCampaigns(),
      adminGetDonationStats(),
    ])
      .then(([d, c, s]) => {
        setDonations(d);
        setCampaigns(c);
        setStats(s);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [user, isLoading, router]);

  // ── Derived data ──────────────────────────────────────────────────────────────

  const completedDonations = useMemo(
    () => donations.filter((d) => d.status === "COMPLETED"),
    [donations]
  );

  const monthlyTrend = useMemo(() => {
    const map: Record<string, { key: string; month: string; amount: number; count: number }> = {};
    completedDonations.forEach((d) => {
      const date = new Date(d.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      if (!map[key]) map[key] = { key, month: label, amount: 0, count: 0 };
      map[key].amount += Number(d.amount);
      map[key].count += 1;
    });
    return Object.values(map)
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-12);
  }, [completedDonations]);

  const categoryPie = useMemo(() => {
    const map: Record<string, number> = {};
    campaigns
      .filter((c) => c.status === "APPROVED")
      .forEach((c) => {
        map[c.category] = (map[c.category] || 0) + 1;
      });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  }, [campaigns]);

  const topCampaigns = useMemo(() => {
    const map: Record<string, number> = {};
    completedDonations.forEach((d) => {
      map[d.campaignTitle] = (map[d.campaignTitle] || 0) + Number(d.amount);
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([title, amount]) => ({
        name: title.length > 26 ? title.slice(0, 26) + "…" : title,
        amount,
      }));
  }, [completedDonations]);

  const avgDonation =
    completedDonations.length > 0
      ? completedDonations.reduce((s, d) => s + Number(d.amount), 0) / completedDonations.length
      : 0;

  const approvedCount = campaigns.filter((c) => c.status === "APPROVED").length;
  const pendingCount = campaigns.filter((c) => c.status === "PENDING_APPROVAL").length;
  const rejectedCount = campaigns.filter((c) => c.status === "REJECTED").length;
  const reviewed = approvedCount + rejectedCount;
  const approvalRate = reviewed > 0 ? Math.round((approvedCount / reviewed) * 100) : 0;

  const successRate =
    stats && stats.totalTransactions > 0
      ? Math.round((stats.completedTransactions / stats.totalTransactions) * 100)
      : 0;

  if (isLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="size-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center px-4">
        <XCircle className="size-8 text-red-400" />
        <p className="text-sm text-stone-600 dark:text-stone-400">Couldn't load analytics data — the server may be having an issue. Try refreshing.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="border-b bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("backToDashboard")}
            </Link>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          <Badge variant="secondary" className="w-fit h-fit text-xs">
            {t("summaryBadge", { donations: completedDonations.length, campaigns: campaigns.length })}
          </Badge>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">

        {/* KPI cards */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#b04a15]/10 text-[#b04a15]">
                  <HandCoins className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("totalRaised")}</p>
                  <p className="text-xl font-bold">{formatINR(Number(stats.totalCollected))}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/30 text-sky-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("uniqueDonors")}</p>
                  <p className="text-xl font-bold">{stats.uniqueDonors}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/20 text-amber-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("avgDonation")}</p>
                  <p className="text-xl font-bold">{formatINR(Math.round(avgDonation))}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/20 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("paymentSuccess")}</p>
                  <p className="text-xl font-bold">{successRate}%</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Monthly trend + Category donut */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("monthlyDonationVolume")}</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyTrend.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  {t("noCompletedDonations")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={monthlyTrend}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      tickFormatter={formatINRShort}
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      width={64}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatINR(value), t("tooltipAmount")]}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "13px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#b04a15"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#b04a15", strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: "#b04a15" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("campaignCategories")}</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryPie.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  {t("noApprovedCampaigns")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categoryPie}
                      cx="50%"
                      cy="42%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryPie.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "13px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top campaigns bar + Campaign pipeline */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("topCampaigns")}</CardTitle>
            </CardHeader>
            <CardContent>
              {topCampaigns.length === 0 ? (
                <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
                  {t("noDonationData")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={topCampaigns}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      type="number"
                      tickFormatter={formatINRShort}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={140}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      formatter={(v: number) => [formatINR(v), t("tooltipRaised")]}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "13px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                      {topCampaigns.map((_, i) => (
                        <Cell
                          key={i}
                          fill={i === 0 ? "#b04a15" : i === 1 ? "#e07b3a" : "#f0b97a"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("campaignPipeline")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="flex items-center justify-between rounded-xl border border-green-100 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/10 p-4">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">{t("approved")}</span>
                </div>
                <span className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {approvedCount}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10 p-4">
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium">{t("pendingReview")}</span>
                </div>
                <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {pendingCount}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 p-4">
                <div className="flex items-center gap-2.5">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">{t("rejected")}</span>
                </div>
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {rejectedCount}
                </span>
              </div>

              <div className="rounded-xl border p-4 text-center">
                <p className="text-xs text-muted-foreground">{t("approvalRate")}</p>
                <p className="mt-0.5 text-3xl font-extrabold text-[#b04a15]">{approvalRate}%</p>
                <p className="text-xs text-muted-foreground">{t("ofReviewedCampaigns")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent transactions table */}
        <Card>
          <CardHeader>
            <CardTitle>{t("recentTransactions")}</CardTitle>
          </CardHeader>
          <CardContent>
            {donations.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t("noTransactions")}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        {t("colDate")}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        {t("colDonor")}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        {t("colCampaign")}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                        {t("colAmount")}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">
                        {t("colStatus")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {donations.slice(0, 20).map((d) => (
                      <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                          {new Date(d.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium leading-tight">{d.donorName}</p>
                          <p className="text-xs text-muted-foreground">{d.donorEmail}</p>
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-3 text-sm">
                          {d.campaignTitle}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                          {formatINR(Number(d.amount))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={
                              d.status === "COMPLETED"
                                ? "default"
                                : d.status === "FAILED"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {d.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {donations.length > 20 && (
                  <p className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
                    {t("showingTransactions", { shown: 20, total: donations.length })}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
