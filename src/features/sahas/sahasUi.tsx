"use client";

import Link from "@/components/AppLink";
import { UiText, useUiText } from "@/components/UiText";
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

/** A hub / spotlight card. Items-only for now: money stays hidden until phase C3. */
export function SahasCard({ c, locale, compact = false }: { c: SahasCampaignCard; locale: string; compact?: boolean }) {
  const ui = useUiText();
  const ends = formatDate(c.endDate, locale);
  const starts = formatDate(c.startDate, locale);
  return (
    <Link href={`/sahas/${c.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#EADFD3] bg-white text-[#1F140D] no-underline transition-colors hover:border-[#D9C9B8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b04a15] dark:border-zinc-800 dark:bg-zinc-900 dark:text-stone-100">
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
          {c.phase !== "OPEN" && <PhaseChip phase={c.phase} />}
          <span className="ms-auto text-xs text-[#6B5A4E] dark:text-stone-400">
            {c.phase === "UPCOMING" && starts ? `${ui("Opens")} ${starts}` : ends ? `${ui("Ends")} ${ends}` : null}
          </span>
        </div>
        <h3 className={`${serif} m-0 text-xl leading-snug`}>{c.title}</h3>
        {c.summary && <p className="m-0 text-sm text-[#4A3B30] dark:text-stone-300">{c.summary}</p>}
        {c.city && <span className="text-sm text-[#6B5A4E] dark:text-stone-400">{[c.city, c.state].filter(Boolean).join(", ")}</span>}
        <span className="mt-auto pt-1 text-sm font-semibold text-[#b04a15] group-hover:underline dark:text-[#e07b3a]">
          {c.phase === "CLOSED" ? ui("See what was delivered") : ui("See campaign")} →
        </span>
      </div>
    </Link>
  );
}
