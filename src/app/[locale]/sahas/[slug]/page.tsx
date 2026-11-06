"use client";

import { useCallback, useEffect, useState } from "react";
import { captureUtm } from "@/features/scan-donation/tracking";
import { notFound, useParams } from "next/navigation";
import { useLocale } from "next-intl";
import Link from "@/components/AppLink";
import { FEATURES } from "@/lib/features";
import { ApiError, sahasCampaigns, type SahasCampaignDetail, type SahasItemLine } from "@/lib/api";
import { UiText, useUiText } from "@/components/UiText";
import { PageSkeleton } from "@/components/skeletons";
import { MAIN_DONATE_ID, SahasDonors, SahasFloatingDonate, SahasGallery, SahasHeroTiles, SahasPageSections, SahasStory } from "@/features/sahas/SahasCampaignSections";
import { Chip, ItemsBar, PhaseChip, SAHAS_NAME, SahasSurplus, formatDate, itemTotals, serif } from "@/features/sahas/sahasUi";

/** /sahas/[slug] — a Sahas campaign page (design board HF · Campaign detail). Items only until phase C3. */
export default function SahasCampaignPage() {
  // Keeps the ad's UTMs for this tab: the donate page opens without them in the URL.
  useEffect(() => { captureUtm(window.location.search); }, []);
  if (!FEATURES.sahas) notFound();
  return <SahasCampaign />;
}

function SahasCampaign() {
  const ui = useUiText();
  const locale = useLocale();
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<SahasCampaignDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");

  const load = useCallback(() => {
    setState("loading");
    sahasCampaigns.detail(slug)
      .then((d) => { setData(d); setState("ready"); })
      .catch((e) => setState(e instanceof ApiError && e.status === 404 ? "missing" : "error"));
  }, [slug]);
  useEffect(load, [load]);

  if (state === "loading") return <PageSkeleton><div className="h-96" /></PageSkeleton>;
  if (state === "missing" || (state === "ready" && !data)) {
    return (
      <main className="min-h-[60vh] bg-[#FBF7F2] px-4 py-16 dark:bg-zinc-950">
        <div className="mx-auto max-w-md text-center">
          <h1 className={`${serif} text-2xl`}><UiText>Campaign not found</UiText></h1>
          <Link href="/sahas" className="mt-4 inline-block font-semibold text-[#b04a15]"><UiText>See all Sahas campaigns</UiText></Link>
        </div>
      </main>
    );
  }
  if (state === "error" || !data) {
    return (
      <main className="min-h-[60vh] bg-[#FBF7F2] px-4 py-16 dark:bg-zinc-950">
        <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
          <b><UiText>Couldn&apos;t load this campaign</UiText></b>
          <button type="button" onClick={load} className="min-h-[44px] rounded-xl border border-[#b04a15] px-4 text-sm font-semibold text-[#b04a15]"><UiText>Try again</UiText></button>
        </div>
      </main>
    );
  }

  const c = data.card;
  const items = data.items;
  const t = itemTotals(items);
  const open = c.phase === "OPEN";
  const dates = [formatDate(c.startDate, locale), formatDate(c.endDate, locale)].filter(Boolean).join(" – ");
  const firstOpen = items.find((i) => i.quantityLeft > 0);

  return (
    <main className="min-h-screen bg-[#FBF7F2] pb-[calc(var(--ck-bottom-chrome)+2rem)] text-[#1F140D] lg:pb-16 dark:bg-zinc-950 dark:text-stone-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 pt-6 sm:px-6 sm:pt-8">
        <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-9">
          <SahasGallery cover={c.imageUrl} coverAlt={c.coverAltText} page={data.page} />
          <div className="flex min-w-0 flex-col gap-4">
          <div className="flex min-w-0 flex-col gap-3">
            <nav aria-label={ui("Breadcrumb")} className="text-sm text-[#6B5A4E] dark:text-stone-400">
              <Link href="/sahas" className="text-inherit hover:underline"><UiText>Sahas Campaigns</UiText></Link> › {c.title}
            </nav>
            <div className="flex flex-wrap items-center gap-2">
              <PhaseChip phase={c.phase} />
              {c.collectsItems && <Chip><UiText context="sahas contribution type">Items</UiText></Chip>}
              {c.collectsMoney && <Chip><UiText context="sahas contribution type">Money</UiText></Chip>}
              <span className="text-sm text-[#4A3B30] dark:text-stone-300"><UiText>Organised by</UiText> <b>{SAHAS_NAME}</b></span>
            </div>
            <h1 className={`${serif} m-0 text-3xl leading-[1.1] sm:text-[44px]`}>{c.title}</h1>
            <span className="text-base text-[#4A3B30] dark:text-stone-300">{[[c.city, c.state].filter(Boolean).join(", "), dates].filter(Boolean).join(" · ")}</span>
          </div>

          <aside aria-label={ui("Choose how to help")} className="flex w-full flex-col gap-4">
            {c.collectsMoney && (
              <div className="flex flex-col gap-3">
                <h2 className="sr-only"><UiText>Donate money</UiText></h2>
                <div className="flex items-baseline justify-between gap-3">
                  <b className="text-[26px] text-[#1F140D] dark:text-stone-100">₹{(c.amountRaised ?? 0).toLocaleString("en-IN")}</b>
                  <span className="text-sm text-[#4A3B30] dark:text-stone-300">{ui("of")} ₹{(c.targetAmount ?? 0).toLocaleString("en-IN")}</span>
                </div>
                <SahasSurplus raised={c.amountRaised ?? 0} target={c.targetAmount ?? 0} />
                <ItemsBar needed={c.targetAmount ?? 0} pledged={0} received={c.amountRaised ?? 0} label={`₹${c.amountRaised ?? 0} / ₹${c.targetAmount ?? 0}`} />
                <SahasHeroTiles endDate={c.endDate} open={open} page={data.page} />
                {data.moneyOpen && (c.amountRaised ?? 0) < (c.targetAmount ?? 0) ? (
                  <div id={MAIN_DONATE_ID}><Link href={`/sahas/${c.slug}/donate`} className="flex min-h-[48px] items-center justify-center rounded-xl bg-[#b04a15] px-5 text-[15px] font-semibold text-white no-underline hover:bg-[#9a3f10]"><UiText>Donate money</UiText></Link></div>
                ) : <p className="m-0 rounded-xl bg-[#F7F1EA] p-3 text-sm dark:bg-zinc-800">{(c.targetAmount ?? 0) > 0 && (c.amountRaised ?? 0) >= (c.targetAmount ?? 0) ? <UiText>Target reached. Thank you.</UiText> : <UiText>Donations aren&apos;t open right now.</UiText>}</p>}
                <p className="m-0 text-xs text-[#6B5A4E] dark:text-stone-400"><UiText>Counts confirmed payments only.</UiText> {ui("Platform fee: 5% is deducted from your donation")}. <UiText>The rest goes to this campaign, through Sahas Charitable Trust.</UiText> <UiText>Donations can&apos;t be refunded.</UiText></p>
              </div>
            )}
            {c.collectsItems && <>
            <h2 className={`${serif} m-0 text-2xl`}><UiText>Give items</UiText></h2>
            <div className="text-sm text-[#4A3B30] dark:text-stone-300">
              <b className="text-[#1F140D] dark:text-stone-100">{t.received} {ui("received")}</b> · {t.pledged} {ui("pledged")} · {t.needed} {ui("needed")}
            </div>
            <ItemsBar needed={t.needed} pledged={t.pledged} received={t.received}
              label={`${t.received} ${ui("received")}, ${t.pledged} ${ui("pledged")}, ${t.needed} ${ui("needed")}`} />
            <p className="m-0 text-xs text-[#6B5A4E] dark:text-stone-400"><UiText>Light segment: pledged, not yet received.</UiText></p>
            {open && firstOpen ? (
              <Link href={`/sahas/${c.slug}/give/${firstOpen.driveId}`}
                className="flex min-h-[48px] items-center justify-center rounded-xl bg-[#b04a15] px-5 text-[15px] font-semibold text-white no-underline hover:bg-[#9a3f10]">
                <UiText>Give items</UiText>
              </Link>
            ) : (
              <p className="m-0 rounded-xl bg-[#F7F1EA] p-3 text-sm text-[#4A3B30] dark:bg-zinc-800 dark:text-stone-300">
                {c.phase === "UPCOMING" ? <UiText>This campaign isn&apos;t open yet.</UiText>
                  : c.phase === "PAUSED" ? <UiText>This campaign is paused. New offers are on hold.</UiText>
                    : c.phase === "CLOSED" ? <UiText>This campaign has closed.</UiText>
                      : <UiText>Everything on the list is pledged. Thank you.</UiText>}
              </p>
            )}
            </>}
          </aside>
          </div>
        </section>

        <div className={`grid grid-cols-1 items-start gap-10 ${data.donors ? "lg:grid-cols-[minmax(0,1fr)_320px]" : ""}`}>
          <div className="flex min-w-0 flex-col gap-9">
            {data.description && (
              <section className="flex flex-col gap-3">
                <h2 className={`${serif} m-0 text-2xl`}><UiText>The need</UiText></h2>
                <SahasStory text={data.description} />
              </section>
            )}

            {items.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className={`${serif} m-0 text-2xl`}><UiText>Items needed</UiText></h2>
                <div className="overflow-x-auto rounded-xl border border-[#EADFD3] bg-white dark:border-zinc-800 dark:bg-zinc-900">
                  <table className="w-full min-w-[520px] border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-[0.05em] text-[#6B5A4E]">
                        <th className="p-3 font-semibold"><UiText>Item</UiText></th>
                        <th className="p-3 font-semibold"><UiText>Needed</UiText></th>
                        <th className="p-3 font-semibold"><UiText>Pledged</UiText></th>
                        <th className="p-3 font-semibold"><UiText>Received</UiText></th>
                        <th className="p-3"><span className="sr-only"><UiText>Still needed</UiText></span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(itemRow)}
                    </tbody>
                  </table>
                </div>
                <Handover items={items} />
              </section>
            )}

            {data.outcome && (
              <section className="flex flex-col gap-3 rounded-2xl border border-[#CFE5D8] bg-[#F2F8F4] p-6 dark:border-emerald-900 dark:bg-emerald-950/30">
                <h2 className={`${serif} m-0 text-2xl`}><UiText>What was delivered</UiText></h2>
                {data.outcome.summary && <p className="m-0 whitespace-pre-line text-[16px] leading-relaxed ck-user-text">{data.outcome.summary}</p>}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] border-collapse text-sm">
                    <thead><tr className="text-left text-xs uppercase tracking-[0.05em] text-[#24402F]">
                      <th className="py-2 pe-3 font-semibold"><UiText>Item</UiText></th>
                      <th className="py-2 pe-3 font-semibold"><UiText>Received</UiText></th>
                      <th className="py-2 pe-3 font-semibold"><UiText>Handed out</UiText></th>
                      <th className="py-2 font-semibold"><UiText>Left over</UiText></th>
                    </tr></thead>
                    <tbody>
                      {data.outcome.lines.map((l) => (
                        <tr key={l.driveId} className="border-t border-[#CFE5D8] dark:border-emerald-900">
                          <td className="py-2 pe-3 font-semibold">{l.itemName}</td>
                          <td className="py-2 pe-3">{l.received}</td>
                          <td className="py-2 pe-3">{l.distributed ?? "—"}</td>
                          <td className="py-2">{l.distributed == null ? "—" : l.received - l.distributed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.outcome.leftoverNote && <p className="m-0 text-sm text-[#24402F] dark:text-emerald-200 ck-user-text">{data.outcome.leftoverNote}</p>}
                {data.outcome.approvedAt && <p className="m-0 text-xs text-[#24402F] dark:text-emerald-300"><UiText>Checked and published by Sahas on</UiText> {new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(data.outcome.approvedAt))}</p>}
              </section>
            )}

            {data.updates.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className={`${serif} m-0 text-2xl`}><UiText>Updates</UiText></h2>
                {data.updates.map((u) => (
                  <article key={u.id} className="flex flex-col gap-1 rounded-xl border border-[#EADFD3] bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <span className="text-xs text-[#6B5A4E] dark:text-stone-400">
                      {u.publishedAt && new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(u.publishedAt))}
                      {u.correctedAt && <> · <UiText>corrected</UiText> {new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(u.correctedAt))}</>}
                    </span>
                    <b className="ck-user-text">{u.title}</b>
                    <p className="m-0 whitespace-pre-line text-sm text-[#4A3B30] dark:text-stone-300 ck-user-text">{u.body}</p>
                  </article>
                ))}
              </section>
            )}
          </div>

          {data.donors && <SahasDonors donors={data.donors} />}
        </div>

        <SahasPageSections page={data.page} slug={c.slug} title={c.title} />
      </div>
      {c.collectsMoney && data.moneyOpen && (c.amountRaised ?? 0) < (c.targetAmount ?? 0) && <SahasFloatingDonate slug={c.slug} />}

    </main>
  );

  function itemRow(i: SahasItemLine) {
    return (
      <tr key={i.driveId} className="border-t border-[#EADFD3] align-top dark:border-zinc-800">
        <td className="p-3">
          {open && i.quantityLeft > 0
            ? <Link href={`/sahas/${c.slug}/give/${i.driveId}`} className="font-semibold text-[#1F140D] underline-offset-2 hover:underline dark:text-stone-100">{i.itemName}</Link>
            : <b>{i.itemName}</b>}
          {(i.itemCondition || i.unit) && <div className="text-xs text-[#6B5A4E] dark:text-stone-400">{[i.itemCondition, i.unit].filter(Boolean).join(" · ")}</div>}
        </td>
        <td className="p-3">{i.quantityNeeded}</td>
        <td className="p-3">{i.quantityPledged}</td>
        <td className="p-3">{i.quantityReceived}</td>
        <td className="p-3">
          <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${i.quantityLeft > 0 ? "bg-[#F3EEE8] text-[#4A3B30]" : "bg-[#E6F2EC] text-[#1E5B42]"}`}>
            {i.quantityLeft > 0 ? `${i.quantityLeft} ${ui("left")}` : ui("Fully pledged")}
          </span>
        </td>
      </tr>
    );
  }
}

/** Drop-off points and pickup areas, one card per distinct arrangement. */
function Handover({ items }: { items: SahasItemLine[] }) {
  const ui = useUiText();
  const drops = [...new Set(items.filter((i) => i.handoverMode !== "PICKUP" && i.dropOffAddress).map((i) => `${i.dropOffAddress}${i.availableDays ? ` · ${i.availableDays}` : ""}`))];
  const pickups = items.filter((i) => i.handoverMode !== "DROP_OFF" && i.pickupRadiusKm);
  if (!drops.length && !pickups.length) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {drops.length > 0 && (
        <div className="rounded-xl border border-[#EADFD3] bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <b><UiText>Drop off</UiText></b>
          {drops.map((d) => <p key={d} className="m-0 mt-1 text-sm text-[#4A3B30] dark:text-stone-300">{d}</p>)}
        </div>
      )}
      {pickups.length > 0 && (
        <div className="rounded-xl border border-[#EADFD3] bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <b><UiText>Pickup</UiText></b>
          {pickups.map((i) => (
            <p key={i.driveId} className="m-0 mt-1 text-sm text-[#4A3B30] dark:text-stone-300">
              {i.itemName}: {ui("within")} {i.pickupRadiusKm} km{i.locationCity ? ` ${ui("of")} ${i.locationCity}` : ""}. <UiText>Sahas confirms a slot after review.</UiText>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
