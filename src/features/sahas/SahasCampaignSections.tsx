"use client";

import { useEffect, useState } from "react";
import Link from "@/components/AppLink";
import { UiText, useUiText } from "@/components/UiText";
import { fundraisers, sahasCampaigns, type FundraiserCard, type SahasCampaignCard, type SahasCampaignDetail, type SahasPageContent, type SahasPageLink, type SahasPublicDonor } from "@/lib/api";
import { ItemsBar, serif } from "./sahasUi";

/** The admin-edited sections of a Sahas campaign page. Every section hides itself when it has no content. */

type Page = SahasPageContent | null | undefined;
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const card = "rounded-2xl border border-[#EADFD3] bg-white dark:border-zinc-800 dark:bg-zinc-900";
const heading = `${serif} m-0 text-[25px] leading-tight sm:text-[32px]`;
const outline = "flex min-h-[44px] items-center justify-center rounded-xl border border-[#b04a15] px-5 text-sm font-semibold text-[#b04a15] no-underline";

function daysLeft(endDate: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(`${endDate}T23:59:59`).getTime();
  return Number.isNaN(end) ? null : Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}

/** The cover first, then the admin's gallery photos. */
export function SahasGallery({ cover, coverAlt, page }: { cover: string | null; coverAlt: string | null; page: Page }) {
  const ui = useUiText();
  const photos = [
    ...(cover ? [{ url: cover, alt: coverAlt ?? "" }] : []),
    ...(page?.gallery ?? []).filter((g) => g.url).map((g) => ({ url: g.url as string, alt: g.altText ?? g.caption ?? "" })),
  ];
  const [shown, setShown] = useState(0);
  const photo = photos[shown] ?? photos[0];
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <div className="relative h-[260px] overflow-hidden rounded-[20px] bg-[#EFE4D8] sm:h-[400px] dark:bg-zinc-800">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt={photo.alt} className="h-full w-full object-cover" />
        )}
        {page?.heroBadge && <span className="absolute start-3 top-3 rounded-full bg-white px-3 py-1 text-[13px] font-semibold text-[#1E5B42]">{page.heroBadge}</span>}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-0.5">
          {photos.map((p, i) => (
            <button key={p.url} type="button" onClick={() => setShown(i)} aria-pressed={i === shown} aria-label={`${ui("Show photo")} ${i + 1}`}
              className={`h-[72px] w-[72px] shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 p-0 ${i === shown ? "border-[#b04a15]" : "border-[#EADFD3] dark:border-zinc-700"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Admin tiles beside a days-left count worked out from the end date. */
export function SahasHeroTiles({ endDate, open, page }: { endDate: string | null; open: boolean; page: Page }) {
  const ui = useUiText();
  const left = open ? daysLeft(endDate) : null;
  const tiles = (page?.heroStats ?? []).filter((s) => s.value).map((s) => ({ value: s.value as string, label: s.label ?? "" }));
  if (left !== null) tiles.splice(Math.min(1, tiles.length), 0, { value: String(left), label: ui("days left") });
  if (tiles.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      {tiles.map((t) => (
        <div key={`${t.value}${t.label}`} className="rounded-xl border border-[#EADFD3] bg-white px-1.5 py-3 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <b className="text-lg">{t.value}</b>
          <div className="text-xs text-[#4A3B30] dark:text-stone-300">{t.label}</div>
        </div>
      ))}
    </div>
  );
}

export function SahasDonors({ donors }: { donors: NonNullable<SahasCampaignDetail["donors"]> }) {
  const ui = useUiText();
  const name = (d: SahasPublicDonor) => d.name ?? ui("Anonymous");
  return (
    <aside aria-label={ui("Donors")} className="flex min-w-0 flex-col gap-4">
      {donors.count === 0 ? (
        <section className={`${card} flex flex-col gap-1.5 p-6 text-center`}>
          <b><UiText>Be the first to support this campaign</UiText></b>
          <span className="text-sm text-[#4A3B30] dark:text-stone-300"><UiText>Your name appears here once your payment is confirmed.</UiText></span>
        </section>
      ) : <>
        <section className={`${card} p-5`}>
          <h2 className={`${serif} m-0 mb-2.5 text-xl`}><UiText>Top donors</UiText></h2>
          <ol className="m-0 list-none p-0">
            {donors.top.map((d, i) => (
              <li key={i} className="flex items-center gap-2.5 py-1.5">
                <span aria-hidden="true" className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#FBEBDD] text-[13px] font-bold text-[#7a3410]">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm ck-user-text">{name(d)}</span>
                <b className="text-sm">{rupees(d.amount)}</b>
              </li>
            ))}
          </ol>
        </section>
        <section className={`${card} p-5`}>
          <h2 className={`${serif} m-0 mb-2.5 text-xl`}><UiText>Recent donors</UiText></h2>
          <ul className="m-0 list-none p-0">
            {donors.recent.map((d, i) => (
              <li key={i} className="flex justify-between gap-2.5 py-1.5 text-sm">
                <span className="min-w-0 truncate ck-user-text">{name(d)}</span><b className="text-[#b04a15]">{rupees(d.amount)}</b>
              </li>
            ))}
          </ul>
        </section>
      </>}
      <p className="m-0 text-[13px] leading-normal text-[#6B5A4E] dark:text-stone-400"><UiText>Only confirmed donations appear here. Tick “Don’t show my name publicly” when donating and you’ll show as Anonymous.</UiText></p>
    </aside>
  );
}

function LinkOut({ l, className }: { l: SahasPageLink; className?: string }) {
  if (!l.linkHref || !l.linkLabel) return null;
  return l.linkHref.startsWith("/")
    ? <Link href={l.linkHref} className={className}>{l.linkLabel}</Link>
    : <a href={l.linkHref} target="_blank" rel="noreferrer" className={className}>{l.linkLabel}</a>;
}

function Proof({ page }: { page: SahasPageContent }) {
  const stats = (page.stats ?? []).filter((s) => s.value);
  const gallery = (page.gallery ?? []).filter((g) => g.url);
  const videos = (page.videos ?? []).filter((v) => v.url);
  if (!page.proofTitle && !stats.length && !gallery.length && !videos.length) return null;
  return (
    <section className="flex flex-col gap-5">
      <div className="flex max-w-[680px] flex-col gap-2">
        {page.proofEyebrow && <div className="text-sm font-semibold text-[#b04a15]">{page.proofEyebrow}</div>}
        {page.proofTitle && <h2 className={heading}>{page.proofTitle}</h2>}
        {page.proofIntro && <p className="m-0 whitespace-pre-line text-[17px] leading-relaxed text-[#2E2219] dark:text-stone-200">{page.proofIntro}</p>}
      </div>
      {stats.length > 0 && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-4">
          {stats.map((s) => <div key={`${s.value}${s.label}`} className={`${card} px-4 py-4`}><b className="text-2xl text-[#b04a15]">{s.value}</b><div className="text-sm text-[#4A3B30] dark:text-stone-300">{s.label}</div></div>)}
        </div>
      )}
      {gallery.length > 0 && (
        <div className="grid auto-rows-[170px] grid-cols-2 gap-2.5 sm:auto-rows-[220px] lg:grid-cols-4 lg:gap-4">
          {gallery.map((g, i) => (
            <figure key={g.url} className={`relative m-0 overflow-hidden rounded-[14px] ${i % 5 === 0 || i % 5 === 3 ? "row-span-2" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.url as string} alt={g.altText ?? g.caption ?? ""} loading="lazy" className="h-full w-full object-cover" />
              {g.caption && <figcaption className="absolute inset-x-2 bottom-2 rounded-lg bg-[#1F140D]/80 px-2.5 py-1.5 text-[13px] text-white">{g.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}
      {videos.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {page.videosTitle && <h3 className="m-0 text-[17px] font-semibold">{page.videosTitle}</h3>}
          <div className="grid grid-cols-3 gap-2 lg:gap-4">
            {videos.map((v) => <video key={v.url} src={`${v.url}#t=0.1`} controls playsInline preload="metadata" aria-label={v.altText ?? v.caption ?? undefined} className="aspect-[3/4] w-full rounded-[14px] bg-[#1F140D] object-cover" />)}
          </div>
        </div>
      )}
    </section>
  );
}

function Help({ page }: { page: SahasPageContent }) {
  const tiers = (page.tiers ?? []).filter((t) => t.amount);
  if (!tiers.length) return null;
  return (
    <section className="flex flex-col gap-5">
      {page.helpTitle && <h2 className={heading}>{page.helpTitle}</h2>}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-4">
        {tiers.map((t) => <div key={t.amount} className={`${card} p-5`}><b className="text-[28px] text-[#b04a15]">{t.amount}</b><p className="m-0 mt-1.5 text-[#2E2219] dark:text-stone-200">{t.text}</p></div>)}
      </div>
      {page.helpNote && <p className="m-0 text-sm text-[#4A3B30] dark:text-stone-300">{page.helpNote}</p>}
    </section>
  );
}

function Trust({ page }: { page: SahasPageContent }) {
  const items = (page.trust ?? []).filter((t) => t.title);
  if (!items.length) return null;
  return (
    <section className={`${card} flex flex-col gap-6 p-5 sm:p-8`}>
      <div>
        {page.trustTitle && <h2 className={heading}>{page.trustTitle}</h2>}
        {page.trustSubtitle && <p className="m-0 mt-1 text-lg text-[#2E2219] dark:text-stone-200">{page.trustSubtitle}</p>}
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4 lg:gap-7">
        {items.map((t) => (
          <div key={t.title} className="flex gap-3">
            <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1E5B42" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></svg>
            <div className="text-sm leading-normal text-[#2E2219] dark:text-stone-200"><b className="block">{t.title}</b>{t.text} <LinkOut l={t} className="text-[#b04a15]" /></div>
          </div>
        ))}
      </div>
      {page.trustClosing && <p className="m-0 text-[17px] font-semibold">{page.trustClosing}</p>}
    </section>
  );
}

/** Other live Sahas campaigns and fundraisers, fetched fresh; plus the admin's link cards. */
function More({ page, slug }: { page: SahasPageContent; slug: string }) {
  const ui = useUiText();
  const [running, setRunning] = useState<FundraiserCard[]>([]);
  const [others, setOthers] = useState<SahasCampaignCard[]>([]);
  const show = page.showFundraisers !== false;
  useEffect(() => {
    if (!show) return;
    Promise.resolve().then(() => fundraisers.live()).then((r) => setRunning(r ?? [])).catch(() => setRunning([]));
    Promise.resolve().then(() => sahasCampaigns.live()).then((r) => setOthers((r ?? []).filter((c) => c.slug !== slug && c.phase === "OPEN"))).catch(() => setOthers([]));
  }, [show, slug]);
  const cards = (page.moreCards ?? []).filter((c) => c.title);
  if (!running.length && !others.length && !cards.length) return null;
  const item = (key: string, href: string, title: string | null, image: string | null, alt: string | null, meta: string, raised: number, target: number | null, label: string) => (
    <article key={key} className={`${card} flex flex-col overflow-hidden`}>
      <div className="h-[170px] bg-[#EFE4D8] dark:bg-zinc-800">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={alt ?? ""} loading="lazy" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-[18px]">
        {meta && <span className="text-xs text-[#6B5A4E] dark:text-stone-400">{meta}</span>}
        <h3 className={`${serif} m-0 text-[19px] leading-tight`}>{title}</h3>
        {target != null && target > 0 && <>
          <div className="mt-auto text-sm"><b>{rupees(raised)}</b> {ui("of")} {rupees(target)}</div>
          <ItemsBar needed={target} pledged={0} received={raised} label={`${rupees(raised)} / ${rupees(target)}`} />
        </>}
        <Link href={href} className={`${outline} mt-1`}>{label}</Link>
      </div>
    </article>
  );
  return (
    <section className="flex flex-col gap-5">
      <div>
        {page.moreTitle && <h2 className={heading}>{page.moreTitle}</h2>}
        {page.moreSubtitle && <p className="m-0 mt-1.5 text-[#4A3B30] dark:text-stone-300">{page.moreSubtitle}</p>}
      </div>
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {others.map((c) => item(`s${c.slug}`, `/sahas/${c.slug}`, c.title, c.imageUrl, c.coverAltText, c.city ?? "", c.amountRaised ?? 0, c.targetAmount, ui("View campaign")))}
        {running.map((f) => item(`f${f.id}`, `/fundraisers/${f.id}`, f.title, f.coverUrl, f.coverAltText, [f.organiser, f.location].filter(Boolean).join(" · "), f.raised, f.target, ui("View fundraiser")))}
        {cards.map((c) => (
          <article key={c.title} className="flex flex-col gap-2.5 rounded-2xl border border-[#EADFD3] bg-[#F7F1EA] p-[22px] dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className={`${serif} m-0 text-[21px]`}>{c.title}</h3>
            {c.text && <p className="m-0 text-sm leading-normal text-[#4A3B30] dark:text-stone-300">{c.text}</p>}
            <LinkOut l={c} className={`${outline} mt-auto`} />
          </article>
        ))}
      </div>
    </section>
  );
}

function Share({ page, title }: { page: SahasPageContent; title: string | null }) {
  const ui = useUiText();
  const [copied, setCopied] = useState(false);
  if (!page.shareTitle) return null;
  const url = () => window.location.href.split("?")[0];
  const open = (to: (link: string, words: string) => string) => {
    const link = url();
    window.open(to(encodeURIComponent(link), encodeURIComponent(page.shareText ?? title ?? "")), "_blank", "noopener");
  };
  const btn = `${outline} cursor-pointer bg-transparent`;
  return (
    <section className="flex flex-col items-center gap-3 text-center">
      <h2 className={heading}>{page.shareTitle}</h2>
      {page.shareSubtitle && <p className="m-0 text-[#4A3B30] dark:text-stone-300">{page.shareSubtitle}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="flex min-h-[44px] cursor-pointer items-center rounded-xl border-0 bg-[#b04a15] px-5 text-sm font-semibold text-white" onClick={() => open((l, w) => `https://wa.me/?text=${w}%20${l}`)}>WhatsApp</button>
        <button type="button" className={btn} onClick={() => open((l) => `https://www.facebook.com/sharer/sharer.php?u=${l}`)}>Facebook</button>
        <button type="button" className={btn} onClick={() => open((l, w) => `https://x.com/intent/post?text=${w}&url=${l}`)}>X</button>
        <button type="button" className={btn} onClick={() => { void navigator.clipboard?.writeText(url()).then(() => setCopied(true)); }}>{copied ? ui("Link copied") : ui("Copy link")}</button>
      </div>
    </section>
  );
}

function Faqs({ page }: { page: SahasPageContent }) {
  const faqs = (page.faqs ?? []).filter((f) => f.question && f.answer);
  if (!faqs.length) return null;
  return (
    <section className="mx-auto flex w-full max-w-[720px] flex-col gap-2.5">
      {page.faqTitle && <h2 className={`${heading} mb-2 text-center`}>{page.faqTitle}</h2>}
      {faqs.map((f, i) => (
        <details key={f.question} open={i === 0} className="group rounded-[14px] border border-[#EADFD3] bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-[18px] py-3 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
            <span>{f.question}</span><span aria-hidden="true" className="group-open:hidden">+</span><span aria-hidden="true" className="hidden group-open:inline">−</span>
          </summary>
          <p className="m-0 whitespace-pre-line px-[18px] pb-4 text-sm leading-normal text-[#4A3B30] dark:text-stone-300">{f.answer}</p>
        </details>
      ))}
    </section>
  );
}

/** Phones see the first part of a long story with Read more; larger screens always see all of it. */
export function SahasStory({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 500;
  return <>
    <p className={`m-0 whitespace-pre-line text-[17px] leading-relaxed text-[#2E2219] dark:text-stone-200 ck-user-text ${long && !open ? "max-sm:line-clamp-[12]" : ""}`}>{text}</p>
    {long && (
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="min-h-[44px] cursor-pointer self-start border-0 bg-transparent p-0 text-[15px] font-semibold text-[#b04a15] sm:hidden">
        {open ? <UiText>Read less</UiText> : <UiText>Read more</UiText>}
      </button>
    )}
  </>;
}

export const MAIN_DONATE_ID = "sahas-main-donate";

/** A small Donate button, only once the main one has scrolled off the top. Sits left of the chat button's corner. */
export function SahasFloatingDonate({ slug }: { slug: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const main = document.getElementById(MAIN_DONATE_ID);
    if (!main || typeof IntersectionObserver === "undefined") return;
    const seen = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0));
    seen.observe(main);
    return () => seen.disconnect();
  }, []);
  if (!show) return null;
  return (
    <Link href={`/sahas/${slug}/donate`} className="fixed bottom-[calc(var(--ck-bottom-chrome,0px)+1rem)] start-4 z-40 flex min-h-[44px] items-center rounded-full bg-[#b04a15] px-5 text-sm font-semibold text-white no-underline shadow-lg hover:bg-[#9a3f10]">
      <UiText>Donate</UiText>
    </Link>
  );
}

export function SahasPageSections({ page, slug, title }: { page: Page; slug: string; title: string | null }) {
  if (!page) return null;
  return <>
    <Proof page={page} />
    <Help page={page} />
    <Trust page={page} />
    <More page={page} slug={slug} />
    <Share page={page} title={title} />
    <Faqs page={page} />
  </>;
}
