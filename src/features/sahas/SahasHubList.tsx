"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "@/components/AppLink";
import { UiText, useUiText } from "@/components/UiText";
import type { SahasCampaignCard } from "@/lib/api";
import { SahasDonateDialog } from "./SahasDonateDialog";
import { Chip, ItemsBar, PhaseChip, SahasSurplus, formatDate, serif } from "./sahasUi";

/**
 * /sahas campaign list (owner choice, 2026-11-04): "The Register" ruled rows on desktop,
 * "Front Page" lead story and rows on phones. One is rendered, never both.
 */

const rule = "border-[#D9C9B8] dark:border-zinc-800";
const muted = "text-[#5c4a3d] dark:text-stone-400";
const solid = "inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#b04a15] px-5 text-sm font-semibold text-white no-underline hover:bg-[#9a3f10]";
const textLink = "inline-flex min-h-[44px] items-center text-sm font-semibold text-[#8f3a0e] underline underline-offset-2 dark:text-[#e07b3a]";

function useDesktop() {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const q = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesktop(q.matches);
    sync();
    q.addEventListener("change", sync);
    return () => q.removeEventListener("change", sync);
  }, []);
  return desktop;
}

function Photo({ c, className }: { c: SahasCampaignCard; className: string }) {
  return (
    <div className={`overflow-hidden bg-[#E6D5C3] dark:bg-zinc-800 ${className}`}>
      {c.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.imageUrl} alt={c.coverAltText ?? ""} className="h-full w-full object-cover" loading="lazy" />
      )}
    </div>
  );
}

/** Donate opens the popup; otherwise the campaign's next step is on its own page. */
function Action({ c, className, onDonate }: { c: SahasCampaignCard; className: string; onDonate: () => void }) {
  const canDonate = c.moneyOpen && (c.amountRaised ?? 0) < (c.targetAmount ?? 0);
  if (canDonate) return <button type="button" onClick={onDonate} className={`${className} cursor-pointer`}><UiText>Donate</UiText></button>;
  return (
    <Link href={`/sahas/${c.slug}`} className={className}>
      {c.collectsItems && c.phase === "OPEN" ? <UiText>Give items</UiText> : <UiText>See campaign</UiText>}
    </Link>
  );
}

function useDonate(slug: string) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const start = useCallback(() => setOpen(true), []);
  return { start, dialog: open ? <SahasDonateDialog slug={slug} onClose={close} /> : null };
}

function Facts({ c, locale }: { c: SahasCampaignCard; locale: string }) {
  const ui = useUiText();
  const ends = formatDate(c.endDate, locale);
  const place = [c.city, c.state].filter(Boolean).join(", ");
  return <>{[place, ends && `${ui("Ends")} ${ends}`].filter(Boolean).join(" · ")}</>;
}

function hasMoney(c: SahasCampaignCard) {
  return c.collectsMoney && (c.targetAmount ?? 0) > 0;
}

function RegisterRow({ c, no, locale }: { c: SahasCampaignCard; no: number; locale: string }) {
  const ui = useUiText();
  const donate = useDonate(c.slug);
  const raised = c.amountRaised ?? 0;
  const target = c.targetAmount ?? 0;
  return (
    <article className={`grid grid-cols-[44px_128px_minmax(0,1fr)_210px_150px] xl:grid-cols-[52px_200px_minmax(0,1fr)_300px_170px] items-center gap-6 border-b py-6 ${rule}`}>
      <span className={`text-sm tabular-nums ${muted}`}>{String(no).padStart(2, "0")}</span>
      <Photo c={c} className="h-24 xl:h-32" />
      <div className="min-w-0">
        <h2 className={`${serif} m-0 text-3xl leading-tight`}>
          <Link href={`/sahas/${c.slug}`} className="text-inherit no-underline hover:underline">{c.title}</Link>
        </h2>
        {c.summary && <p className="m-0 mt-1.5 line-clamp-2 text-sm text-[#4A3B30] dark:text-stone-300 ck-user-text">{c.summary}</p>}
        <p className={`m-0 mt-1 flex flex-wrap items-center gap-2 text-sm ${muted}`}>
          <Facts c={c} locale={locale} />{c.phase !== "OPEN" && <PhaseChip phase={c.phase} />}
        </p>
      </div>
      {hasMoney(c) ? (
        <div className="flex flex-col gap-1.5">
          <div className={`${serif} text-3xl leading-none tabular-nums`}>₹{Math.max(0, target - raised).toLocaleString("en-IN")}</div>
          <ItemsBar needed={target} pledged={0} received={raised} label={`₹${raised} / ₹${target}`} />
          <div className={`text-xs tabular-nums ${muted}`}>₹{raised.toLocaleString("en-IN")} {ui("of")} ₹{target.toLocaleString("en-IN")}</div>
          <SahasSurplus raised={raised} target={target} />
        </div>
      ) : <div><Chip><UiText>Items</UiText></Chip></div>}
      <div className="flex flex-col items-end">
        <Action c={c} className={solid} onDonate={donate.start} />
      </div>
      {donate.dialog}
    </article>
  );
}

function Register({ cards, locale }: { cards: SahasCampaignCard[]; locale: string }) {
  return (
    <div>
      <div className={`grid grid-cols-[44px_128px_minmax(0,1fr)_210px_150px] xl:grid-cols-[52px_200px_minmax(0,1fr)_300px_170px] gap-6 border-b py-3.5 text-xs ${rule} ${muted}`}>
        <span><UiText>No.</UiText></span><span /><span><UiText>Campaign</UiText></span><span><UiText>Still needed</UiText></span><span />
      </div>
      {cards.map((c, i) => <RegisterRow key={c.slug} c={c} no={i + 1} locale={locale} />)}
    </div>
  );
}

function PhoneMoney({ c }: { c: SahasCampaignCard }) {
  const ui = useUiText();
  const raised = c.amountRaised ?? 0;
  const target = c.targetAmount ?? 0;
  if (!hasMoney(c)) return null;
  return (
    <>
      <p className="m-0 text-[15px] tabular-nums"><b>₹{raised.toLocaleString("en-IN")}</b> {ui("of")} ₹{target.toLocaleString("en-IN")}</p>
      <SahasSurplus raised={raised} target={target} />
    </>
  );
}

function Lead({ c, locale }: { c: SahasCampaignCard; locale: string }) {
  const donate = useDonate(c.slug);
  return (
    <article className="flex flex-col gap-2">
      <Photo c={c} className="h-52" />
      <h2 className={`${serif} m-0 mt-1 text-3xl leading-tight`}>
        <Link href={`/sahas/${c.slug}`} className="text-inherit no-underline">{c.title}</Link>
      </h2>
      <p className={`m-0 flex flex-wrap items-center gap-2 text-sm ${muted}`}><Facts c={c} locale={locale} />{c.phase !== "OPEN" && <PhaseChip phase={c.phase} />}</p>
      <PhoneMoney c={c} />
      <Action c={c} className={`${solid} w-full`} onDonate={donate.start} />
      {donate.dialog}
    </article>
  );
}

function PhoneRow({ c }: { c: SahasCampaignCard }) {
  const donate = useDonate(c.slug);
  return (
    <article className={`grid grid-cols-[minmax(0,1fr)_84px] gap-3.5 border-b py-4 ${rule}`}>
      <div className="min-w-0">
        <h3 className={`${serif} m-0 text-lg leading-snug`}>
          <Link href={`/sahas/${c.slug}`} className="text-inherit no-underline">{c.title}</Link>
        </h3>
        <div className="mt-1 text-sm"><PhoneMoney c={c} /></div>
        <Action c={c} className={`${textLink} cursor-pointer border-0 bg-transparent p-0`} onDonate={donate.start} />
      </div>
      <Photo c={c} className="h-[84px]" />
      {donate.dialog}
    </article>
  );
}

function FrontPage({ cards, locale }: { cards: SahasCampaignCard[]; locale: string }) {
  const [lead, ...rest] = cards;
  return (
    <div className="flex flex-col gap-2">
      <Lead c={lead} locale={locale} />
      {rest.map((c) => <PhoneRow key={c.slug} c={c} />)}
    </div>
  );
}

export function SahasHubList({ cards, locale }: { cards: SahasCampaignCard[]; locale: string }) {
  return useDesktop() ? <Register cards={cards} locale={locale} /> : <FrontPage cards={cards} locale={locale} />;
}
