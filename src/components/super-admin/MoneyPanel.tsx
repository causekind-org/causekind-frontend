"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { superAdminMoney, type SaMoneyKind, type SaMoneyRow } from "@/lib/api";
import { saTheme } from "@/components/super-admin/saTheme";
import { Card, ErrorLine, Pill, Spinner, Stat, dateTime, errorText, inr } from "./fundraisers/shared";

const SIZE = 50;

const KINDS: Record<SaMoneyKind, string> = {
  FUNDRAISER: "Fundraiser",
  SAHAS: "Sahas campaign",
  TRUST: "Sahas Trust donation",
  CAMPAIGN: "Other campaign",
  SUPPORT_ONLY: "Platform support only",
};

type Part = "" | "cause" | "platformFee" | "platformSupport";

const PARTS: { value: Part; label: string }[] = [
  { value: "", label: "All money" },
  { value: "cause", label: "For the cause" },
  { value: "platformFee", label: "Platform fee" },
  { value: "platformSupport", label: "Platform support" },
];

/** Sums in paise, so a long list of rupee decimals can't drift. */
const total = (rows: SaMoneyRow[], key: "cause" | "platformFee" | "platformSupport" | "paid") =>
  rows.reduce((sum, r) => sum + Math.round(Number(r[key]) * 100), 0) / 100;

/** Every completed payment, split into cause, platform fee and platform support. */
export function MoneyPanel({ isDark }: { isDark: boolean }) {
  const t = saTheme(isDark);
  const [rows, setRows] = useState<SaMoneyRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<SaMoneyKind | "">("");
  const [towards, setTowards] = useState("");
  const [part, setPart] = useState<Part>("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [shown, setShown] = useState(SIZE);

  const load = useCallback(() => {
    setError(null);
    superAdminMoney.rows().then(setRows).catch((e) => setError(errorText(e, "We couldn't load the money report.")));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setShown(SIZE); }, [kind, towards, part, q, from, to]);

  const causes = useMemo(() => Array.from(new Set((rows ?? []).filter((r) => !kind || r.kind === kind).map((r) => r.towards).filter((x): x is string => !!x))).sort(), [rows, kind]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      const day = r.at?.slice(0, 10) ?? "";
      return (!kind || r.kind === kind) && (!towards || r.towards === towards)
        && (!part || Number(r[part]) > 0)
        && (!from || day >= from) && (!to || day <= to)
        && (!needle || `${r.donorName ?? ""} ${r.donorEmail ?? ""} ${r.paymentId ?? ""}`.toLowerCase().includes(needle));
    });
  }, [rows, kind, towards, part, q, from, to]);

  if (error) return <ErrorLine message={error} onRetry={load} />;
  if (!rows) return <Spinner t={t} />;

  const sel = `min-h-9 rounded-lg border px-2 text-[13px] ${t.input}`;
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className={`text-[26px] font-extrabold ${t.heading}`}>Money</h1>
        <p className={`mt-1 text-sm ${t.muted}`}>Every completed payment. Payment provider charges aren&apos;t recorded, so they are still inside the cause figure.</p>
      </header>

      <section className="grid grid-cols-2 gap-3.5 xl:grid-cols-4" aria-label="Money totals">
        <Stat t={t} label="Total paid" value={inr(total(filtered, "paid"))} sub={`${filtered.length} payments`} />
        <Stat t={t} label="For the cause" value={inr(total(filtered, "cause"))} />
        <Stat t={t} label="Platform fee" value={inr(total(filtered, "platformFee"))} />
        <Stat t={t} label="Platform support" value={inr(total(filtered, "platformSupport"))} sub="Not part of donations" />
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Source" className={sel} value={kind} onChange={(e) => { setKind(e.target.value as SaMoneyKind | ""); setTowards(""); }}>
          <option value="">All sources</option>
          {Object.entries(KINDS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <select aria-label="Campaign or fundraiser" className={`${sel} max-w-[240px]`} value={towards} onChange={(e) => setTowards(e.target.value)}>
          <option value="">All campaigns and fundraisers</option>
          {causes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select aria-label="Money type" className={sel} value={part} onChange={(e) => setPart(e.target.value as Part)}>
          {PARTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <input aria-label="From date" type="date" className={sel} value={from} onChange={(e) => setFrom(e.target.value)} />
        <input aria-label="To date" type="date" className={sel} value={to} onChange={(e) => setTo(e.target.value)} />
        <input aria-label="Search donor" placeholder="Donor, email or payment ID" className={`${sel} min-w-0 flex-1 sm:max-w-[260px]`} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <Card t={t} className="overflow-x-auto">
        <table className={`w-full min-w-[920px] text-left text-[13px] ${t.text}`}>
          <thead className={`border-b ${t.tableHead}`}>
            <tr>{["Date", "Donor", "From", "For the cause", "Platform fee", "Platform support", "Paid"].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className={`divide-y ${t.divide}`}>
            {filtered.slice(0, shown).map((r) => (
              <tr key={r.id} className={t.rowHover}>
                <td className="whitespace-nowrap px-3 py-2.5">{dateTime(r.at)}</td>
                <td className="px-3 py-2.5">
                  <div className="font-semibold">{r.donorName ?? "—"} {r.anonymous && <Pill tone="muted">Anonymous</Pill>}</div>
                  <div className={t.muted}>{r.donorEmail ?? "—"}</div>
                </td>
                <td className="px-3 py-2.5"><div className="font-semibold">{r.towards ?? "—"}</div><div className={t.muted}>{KINDS[r.kind]}</div></td>
                <td className="px-3 py-2.5 tabular-nums">{inr(r.cause)}</td>
                <td className="px-3 py-2.5 tabular-nums">{inr(r.platformFee)}</td>
                <td className="px-3 py-2.5 tabular-nums">{inr(r.platformSupport)}</td>
                <td className="px-3 py-2.5 font-semibold tabular-nums">{inr(r.paid)}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className={`px-3 py-8 text-center ${t.muted}`}>No payments match these filters.</td></tr>}
          </tbody>
        </table>
      </Card>
      {filtered.length > shown && <button type="button" className={`min-h-9 self-center rounded-lg border px-3 text-[13px] ${t.btn}`} onClick={() => setShown(shown + SIZE)}>Show more</button>}
    </div>
  );
}
