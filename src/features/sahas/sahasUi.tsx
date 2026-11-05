"use client";

import { useCallback, useState } from "react";
import Link from "@/components/AppLink";
import { UiText, useUiText } from "@/components/UiText";
import { SahasDonateDialog } from "./SahasDonateDialog";
import type { SahasCampaignCard, SahasItemLine, SahasPhase } from "@/lib/api";

/** Sahas campaigns (2026-11-03): shared pieces for the hub, campaign page and home spotlight. */

export const SAHAS_NAME = "Sahas Charitable Trust";
export const serif = "font-[family-name:var(--font-source-serif-4)] font-semibold tracking-[-0.01em]";

/** Hub tab for a campaign: Active (open or paused), Upcoming, Completed (closed). */
export type SahasTab = "active" | "upcoming" | "completed";
export function tabOf(phase: SahasPhase): SahasTab {
  if (phase === "UPCOMING") return "upcoming";
  if (phase === "CLOSED") return "completed";
  return "active";
}

/** Totals across a campaign's item lines. Pledged is not received; each is shown as its own fact. */
export function itemTotals(items: SahasItemLine[]) {
  return items.reduce(
    (t, i) => ({ needed: t.needed + i.quantityNeeded, pledged: t.pledged + i.quantityPledged, received: t.received + i.quantityReceived }),
    { needed: 0, pledged: 0, received: 0 },
  );
}

export function usePhaseLabel() {
  const ui = useUiText();
  return (p: SahasPhase): string => ({
    OPEN: ui("Open", "sahas campaign status"),
    UPCOMING: ui("Opens soon", "sahas campaign status"),
    PAUSED: ui("Paused", "sahas campaign status"),
    CLOSED: ui("Closed", "sahas campaign status"),
  })[p];
}

export function PhaseChip({ phase }: { phase: SahasPhase }) {
  const label = usePhaseLabel()(phase);
  const tone = phase === "OPEN" ? "bg-[#E6F2EC] text-[#1E5B42]"
    : phase === "PAUSED" ? "bg-[#FFF1DB] text-[#7A4A0B]"
      : "bg-[#F3EEE8] text-[#4A3B30]";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>;
}

export function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-[#F3EEE8] px-2.5 py-0.5 text-xs font-semibold text-[#4A3B30] dark:bg-zinc-800 dark:text-stone-300">{children}</span>;
}

/** Received (dark) and pledged-not-yet-received (light) against needed. Never a combined money+items bar. */
export function ItemsBar({ needed, pledged, received, label }: { needed: number; pledged: number; received: number; label: string }) {
  const pct = (n: number) => (needed > 0 ? Math.min(100, (n / needed) * 100) : 0);
  return (
    <div role="img" aria-label={label} className="flex h-2 overflow-hidden rounded bg-[#F3EEE8] dark:bg-zinc-800">
      <i className="block h-full bg-[#b04a15]" style={{ width: `${pct(received)}%` }} />
      <i className="block h-full bg-[#f0b97a]" style={{ width: `${Math.min(100 - pct(received), pct(pledged))}%` }} />
    </div>
  );
}

export function formatDate(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d);
}

/** Money confirmed beyond the target is kept (owner decision D12f), and shown to everyone. */
export function SahasSurplus({ raised, target }: { raised: number; target: number }) {
  const surplus = target > 0 ? raised - target : 0;
  if (surplus <= 0) return null;
  return <div className="text-sm font-semibold text-[#7a3410] dark:text-[#e07b3a]"><UiText>Surplus</UiText> ₹{surplus.toLocaleString("en-IN")}</div>;
}

/** A hub / spotlight card: the whole campaign and its action, with no need to open another page. */
export function SahasCard({ c, locale, compact = false }: { c: SahasCampaignCard; locale: string; compact?: boolean }) {
  const ui = useUiText();
  const ends = formatDate(c.endDate, locale);
  const starts = formatDate(c.startDate, locale);
  const raised = c.amountRaised ?? 0;
  const target = c.targetAmount ?? 0;
  const canDonate = c.moneyOpen && raised < target;
  const [donating, setDonating] = useState(false);
  const closeDonate = useCallback(() => setDonating(false), []);
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[#EADFD3] bg-white text-[#1F140D] dark:border-zinc-800 dark:bg-zinc-900 dark:text-stone-100">
      <div className={`${compact ? "h-36" : "h-52"} bg-[#EFE4D8] dark:bg-zinc-800`}>
        {c.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.imageUrl} alt={c.coverAltText ?? ""} className="h-full w-full object-cover" loading="lazy" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {c.featured && <span className="rounded-full bg-[#FBEBDD] px-2.5 py-0.5 text-xs font-semibold text-[#7a3410]"><UiText context="sahas card">Featured</UiText></span>}
          {c.collectsItems && <Chip><UiText context="sahas contribution type">Items</UiText></Chip>}
          {c.collectsMoney && <Chip><UiText context="sahas contribution type">Money</UiText></Chip>}
          {c.phase !== "OPEN" && <PhaseChip phase={c.phase} />}
          <span className="ms-auto text-xs text-[#6B5A4E] dark:text-stone-400">
            {c.phase === "UPCOMING" && starts ? `${ui("Opens")} ${starts}` : ends ? `${ui("Ends")} ${ends}` : null}
          </span>
        </div>
        <h3 className={`${serif} m-0 text-xl leading-snug`}>{c.title}</h3>
        {c.summary && <p className="m-0 text-sm font-medium text-[#4A3B30] dark:text-stone-300">{c.summary}</p>}
        {c.city && <span className="text-sm text-[#6B5A4E] dark:text-stone-400">{[c.city, c.state].filter(Boolean).join(", ")}</span>}
        {c.description && <p className="m-0 whitespace-pre-line text-sm leading-relaxed text-[#2E2219] dark:text-stone-200 ck-user-text">{c.description}</p>}
        {c.collectsMoney && target > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="text-sm"><b>₹{raised.toLocaleString("en-IN")}</b> {ui("of")} ₹{target.toLocaleString("en-IN")}</div>
            <SahasSurplus raised={raised} target={target} />
            <ItemsBar needed={target} pledged={0} received={raised} label={`₹${raised} / ₹${target}`} />
          </div>
        )}
        <div className="mt-auto flex flex-col gap-2 pt-2">
          {canDonate && (
            <button type="button" onClick={() => setDonating(true)} className="flex min-h-[48px] items-center justify-center rounded-xl bg-[#b04a15] px-5 text-[15px] font-semibold text-white hover:bg-[#9a3f10]">
              <UiText>Donate</UiText>
            </button>
          )}
          {(c.collectsItems || c.phase === "CLOSED") && (
            <Link href={`/sahas/${c.slug}`} className="flex min-h-[44px] items-center justify-center rounded-xl border border-[#b04a15] px-5 text-sm font-semibold text-[#b04a15] no-underline">
              {c.phase === "CLOSED" ? ui("See what was delivered") : ui("Give items")}
            </Link>
          )}
        </div>
      </div>
      {donating && <SahasDonateDialog slug={c.slug} onClose={closeDonate} />}
    </article>
  );
}

function Money({ c }: { c: SahasCampaignCard }) {
  const ui = useUiText();
  const raised = c.amountRaised ?? 0;
  const target = c.targetAmount ?? 0;
  if (!c.collectsMoney || target <= 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-sm"><b>₹{raised.toLocaleString("en-IN")}</b> {ui("of")} ₹{target.toLocaleString("en-IN")}</div>
      <SahasSurplus raised={raised} target={target} />
      <ItemsBar needed={target} pledged={0} received={raised} label={`₹${raised} / ₹${target}`} />
    </div>
  );
}

/** Spotlight lead campaign (option B): photo beside the details on desktop, stacked on phones. */
export function SahasFeaturedCard({ c, locale }: { c: SahasCampaignCard; locale: string }) {
  const ui = useUiText();
  const [donating, setDonating] = useState(false);
  const close = useCallback(() => setDonating(false), []);
  const ends = formatDate(c.endDate, locale);
  const canDonate = c.moneyOpen && (c.amountRaised ?? 0) < (c.targetAmount ?? 0);
  return (
    <article className="grid grid-cols-1 overflow-hidden rounded-2xl border border-[#EADFD3] bg-white text-[#1F140D] md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] dark:border-zinc-800 dark:bg-zinc-900 dark:text-stone-100">
      <div className="h-28 bg-[#EFE4D8] md:h-auto md:min-h-[170px] dark:bg-zinc-800">
        {c.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.imageUrl} alt={c.coverAltText ?? ""} className="h-full w-full object-cover" loading="lazy" />
        )}
      </div>
      <div className="flex flex-col gap-1.5 p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {c.featured && <span className="rounded-full bg-[#FBEBDD] px-2.5 py-0.5 text-xs font-semibold text-[#7a3410]"><UiText context="sahas card">Featured</UiText></span>}
          {c.phase !== "OPEN" && <PhaseChip phase={c.phase} />}
          {ends && <span className="ms-auto text-xs text-[#6B5A4E] dark:text-stone-400">{ui("Ends")} {ends}</span>}
        </div>
        <h3 className={`${serif} m-0 text-lg leading-snug md:text-xl`}>{c.title}</h3>
        {c.city && <span className="text-sm text-[#6B5A4E] dark:text-stone-400">{[c.city, c.state].filter(Boolean).join(", ")}</span>}
        {(c.description || c.summary) && <p className="m-0 line-clamp-1 whitespace-pre-line text-sm leading-relaxed text-[#2E2219] dark:text-stone-200 ck-user-text">{c.description || c.summary}</p>}
        <Link href={`/sahas/${c.slug}`} className="text-sm font-semibold text-[#b04a15] underline underline-offset-2"><UiText>Read more</UiText></Link>
        <div className="mt-auto flex flex-col gap-2 pt-1">
          <Money c={c} />
          {canDonate && <button type="button" onClick={() => setDonating(true)} className="flex min-h-[44px] items-center justify-center rounded-xl bg-[#b04a15] px-5 text-sm font-semibold text-white hover:bg-[#9a3f10]"><UiText>Donate</UiText></button>}
          {!canDonate && c.collectsItems && <Link href={`/sahas/${c.slug}`} className="flex min-h-[48px] items-center justify-center rounded-xl bg-[#b04a15] px-5 text-[15px] font-semibold text-white no-underline"><UiText>Give items</UiText></Link>}
        </div>
      </div>
      {donating && <SahasDonateDialog slug={c.slug} onClose={close} />}
    </article>
  );
}

/** Spotlight's other campaigns: a compact row, photo beside name, progress and action. */
export function SahasMiniCard({ c }: { c: SahasCampaignCard }) {
  const [donating, setDonating] = useState(false);
  const close = useCallback(() => setDonating(false), []);
  const canDonate = c.moneyOpen && (c.amountRaised ?? 0) < (c.targetAmount ?? 0);
  const action = "flex min-h-[44px] items-center justify-center rounded-xl bg-[#b04a15] px-4 text-sm font-semibold text-white no-underline";
  return (
    <article className="grid flex-1 grid-cols-[72px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-[#EADFD3] bg-white text-[#1F140D] sm:grid-cols-[88px_minmax(0,1fr)] dark:border-zinc-800 dark:bg-zinc-900 dark:text-stone-100">
      <div className="bg-[#EFE4D8] dark:bg-zinc-800">
        {c.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.imageUrl} alt={c.coverAltText ?? ""} className="h-full w-full object-cover" loading="lazy" />
        )}
      </div>
      <div className="flex flex-col gap-1 p-2.5">
        <Link href={`/sahas/${c.slug}`} className={`${serif} text-[15px] leading-snug text-inherit no-underline hover:underline`}>{c.title}</Link>
        <Money c={c} />
        {canDonate
          ? <button type="button" onClick={() => setDonating(true)} className={`${action} mt-auto`}><UiText>Donate</UiText></button>
          : <Link href={`/sahas/${c.slug}`} className={`${action} mt-auto`}>{c.collectsItems && c.phase === "OPEN" ? <UiText>Give items</UiText> : <UiText>See campaign</UiText>}</Link>}
      </div>
      {donating && <SahasDonateDialog slug={c.slug} onClose={close} />}
    </article>
  );
}
