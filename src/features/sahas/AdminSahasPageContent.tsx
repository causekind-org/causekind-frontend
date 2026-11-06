"use client";

import { useCallback, useEffect, useState } from "react";
import { sahasAdmin, type SahasPageContent, type SahasPageLink, type SahasPageMedia, type SahasPageStat } from "@/lib/api";

/**
 * Admin "Page content" tab: every section below the campaign's details on the public page.
 * An empty section is hidden there. The starter text is only a draft to edit; nothing shows
 * publicly until it is saved. Saving sends the campaign's version; a 409 means reload.
 */

const box = "rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900";
const field = "min-h-[42px] w-full rounded-lg border border-stone-300 bg-white px-3 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-950";
const btn = "inline-flex min-h-[40px] items-center justify-center rounded-lg px-4 text-sm font-semibold disabled:opacity-50";
const primary = `${btn} bg-[#b04a15] text-white hover:bg-[#9a3f10]`;
const secondary = `${btn} border border-stone-300 bg-white text-stone-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-100`;

const EMPTY: SahasPageContent = {
  heroBadge: null, heroStats: [], showDonors: true, proofEyebrow: null, proofTitle: null, proofIntro: null, stats: [], gallery: [],
  videosTitle: null, videos: [], helpTitle: null, tiers: [], helpNote: null, trustTitle: null, trustSubtitle: null, trust: [], trustClosing: null,
  moreTitle: null, moreSubtitle: null, showFundraisers: true, moreCards: [], shareTitle: null, shareSubtitle: null, shareText: null, faqTitle: null, faqs: [],
};

const link = (title: string, text: string, linkLabel: string | null = null, linkHref: string | null = null) => ({ title, text, linkLabel, linkHref });

/** A draft to start from, kept apart from what's public. */
const STARTER: Partial<SahasPageContent> = {
  heroBadge: "80G tax benefit",
  heroStats: [{ value: "₹101", label: "feeds one person" }, { value: "80G", label: "tax benefit" }],
  proofEyebrow: "Not our first meal",
  proofTitle: "What Sahas has already done on the ground",
  proofIntro: "For years, Sahas volunteers have gone out to feed local families, children and elders who have nothing to eat. These are real drives, in real neighbourhoods.",
  stats: [{ value: "100+", label: "food drives held" }, { value: "1000+", label: "people fed" }, { value: "2021", label: "feeding people since" }],
  videosTitle: "Watch the team at work",
  helpTitle: "How your contribution helps",
  tiers: [{ amount: "₹101", text: "feeds one hungry person" }, { amount: "₹501", text: "feeds five people" }, { amount: "Any amount", text: "whatever you can give helps" }],
  trustTitle: "Don’t worry.",
  trustSubtitle: "Your donation is safe with us.",
  trust: [
    link("Registered trust", "Sahas Charitable Trust is 12A and 80G certified."),
    link("Secure payment", "You pay through Razorpay, and only confirmed payments are counted on this page."),
    link("Proof you can keep", "Download your donation certificate, plus an 80G receipt if you ask for one."),
    link("Nothing hidden", "The 5% platform fee is shown upfront, and updates are posted on this page."),
  ],
  trustClosing: "At CauseKind, trust isn’t a promise. It’s a practice.",
  moreTitle: "More ways to help on CauseKind",
  moreSubtitle: "Running right now, or start one of your own.",
  moreCards: [
    link("Give to Sahas’s everyday work", "Support education, healthcare and relief through a general donation to the trust.", "Donate to Sahas", "/donate/money"),
    link("Start your own fundraiser", "Raise money for a cause you care about and share it with your friends and family.", "See fundraisers", "/fundraisers"),
  ],
  shareTitle: "Can’t donate today? Share this campaign.",
  shareSubtitle: "One message to your family group can feed someone this Diwali.",
  shareText: "Help feed a hungry person this Diwali.",
  faqTitle: "FAQs",
  faqs: [
    { question: "Who runs this campaign?", answer: "Sahas Charitable Trust, a registered non-profit based in Palghar, Maharashtra." },
    { question: "How is my donation used?", answer: "A 5% platform fee is deducted. The rest goes to this campaign, through Sahas Charitable Trust." },
    { question: "Will I get a tax receipt?", answer: "Sahas is 12A and 80G certified. Choose the 80G option when you donate, and you can download your receipt afterwards." },
    { question: "Can I donate without showing my name?", answer: "Yes. Tick “Don’t show my name publicly” and you’ll appear as Anonymous on this page." },
    { question: "Can I get a refund?", answer: "Donations can’t be refunded, so please check the amount before you pay." },
    { question: "How will I know what happened with the money?", answer: "Sahas posts updates on this campaign page." },
  ],
};

type Col<T> = { key: keyof T & string; label: string; area?: boolean };

function Rows<T extends object>({ title, rows, cols, blank, max, onChange }: { title: string; rows: T[]; cols: Col<T>[]; blank: T; max: number; onChange: (r: T[]) => void }) {
  const set = (i: number, k: keyof T, val: string) => onChange(rows.map((r, n) => (n === i ? { ...r, [k]: val } : r)));
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-1 p-0 text-sm font-semibold">{title}</legend>
      {rows.map((r, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg bg-stone-50 p-2.5 dark:bg-zinc-950">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {cols.map((c) => (
              <label key={c.key} className={`flex flex-col gap-1 text-xs font-semibold ${c.area ? "sm:col-span-2" : ""}`}>{c.label}
                {c.area
                  ? <textarea className={`${field} min-h-[72px] py-2`} value={(r[c.key] as string | null) ?? ""} onChange={(e) => set(i, c.key, e.target.value)} />
                  : <input className={field} value={(r[c.key] as string | null) ?? ""} onChange={(e) => set(i, c.key, e.target.value)} />}
              </label>
            ))}
          </div>
          <button type="button" className="self-start text-xs font-semibold text-red-800" onClick={() => onChange(rows.filter((_, n) => n !== i))}>Remove</button>
        </div>
      ))}
      {rows.length < max && <button type="button" className={`${secondary} self-start`} onClick={() => onChange([...rows, blank])}>Add</button>}
    </fieldset>
  );
}

function MediaRows({ title, kind, rows, max, campaignId, onChange, onError }: { title: string; kind: "photo" | "video"; rows: SahasPageMedia[]; max: number; campaignId: number; onChange: (r: SahasPageMedia[]) => void; onError: (m: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const upload = async (files: File[]) => {
    setBusy(true); onError(null);
    let next = rows;
    try {
      for (const f of files.slice(0, max - rows.length)) { next = [...next, await sahasAdmin.uploadPageMedia(campaignId, f)]; onChange(next); }
    } catch (e) { onError(e instanceof Error ? e.message : "Upload failed. Try again."); } finally { setBusy(false); }
  };
  const set = (i: number, k: "caption" | "altText", val: string) => onChange(rows.map((r, n) => (n === i ? { ...r, [k]: val } : r)));
  const move = (i: number, by: number) => { const r = [...rows]; const [x] = r.splice(i, 1); r.splice(i + by, 0, x); onChange(r); };
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold">{title}</span>
      {rows.map((m, i) => (
        <div key={m.file ?? i} className="flex flex-wrap gap-3 rounded-lg bg-stone-50 p-2.5 dark:bg-zinc-950">
          {kind === "photo"
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={m.url ?? ""} alt="" className="h-20 w-20 rounded-lg object-cover" />
            : <video src={m.url ?? ""} preload="metadata" muted className="h-20 w-20 rounded-lg bg-black object-cover" />}
          <div className="flex min-w-[200px] flex-1 flex-col gap-2">
            <input aria-label="Caption" placeholder="Caption" className={field} value={m.caption ?? ""} onChange={(e) => set(i, "caption", e.target.value)} />
            <input aria-label="Description for screen readers" placeholder="Description for screen readers" className={field} value={m.altText ?? ""} onChange={(e) => set(i, "altText", e.target.value)} />
            <div className="flex gap-3 text-xs font-semibold">
              <button type="button" disabled={i === 0} className="disabled:opacity-40" onClick={() => move(i, -1)}>Move up</button>
              <button type="button" disabled={i === rows.length - 1} className="disabled:opacity-40" onClick={() => move(i, 1)}>Move down</button>
              <button type="button" className="text-red-800" onClick={() => onChange(rows.filter((_, n) => n !== i))}>Remove</button>
            </div>
          </div>
        </div>
      ))}
      {rows.length < max && (
        <label className={`${secondary} w-fit cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}>
          {busy ? "Uploading…" : kind === "photo" ? "Upload photos" : "Upload videos"}
          <input type="file" multiple accept={kind === "photo" ? "image/jpeg,image/png,image/webp" : "video/mp4"} className="sr-only" disabled={busy}
            onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; if (f.length) void upload(f); }} />
        </label>
      )}
      <span className="text-xs text-stone-500">{kind === "photo" ? "JPG, PNG or WebP, up to 5 MB each." : "MP4, up to 10 MB each."} Save the page to publish them.</span>
    </div>
  );
}

export function AdminSahasPageContent({ campaignId, onChanged, onError }: { campaignId: number; onChanged: () => void; onError: (m: string | null) => void }) {
  const [p, setP] = useState<SahasPageContent | null>(null);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    sahasAdmin.page(campaignId).then((r) => { setP({ ...EMPTY, ...r.content }); setVersion(r.version); })
      .catch((e) => onError(e instanceof Error ? e.message : "Couldn't load the page content."));
  }, [campaignId, onError]);

  const patch = useCallback((x: Partial<SahasPageContent>) => { setSaved(false); setP((c) => (c ? { ...c, ...x } : c)); }, []);

  if (!p) return <p className="text-sm text-stone-500">Loading…</p>;

  const line = (k: keyof SahasPageContent, label: string, area = false) => (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">{label}
      {area
        ? <textarea className={`${field} min-h-[88px] py-2`} value={(p[k] as string | null) ?? ""} onChange={(e) => patch({ [k]: e.target.value })} />
        : <input className={field} value={(p[k] as string | null) ?? ""} onChange={(e) => patch({ [k]: e.target.value })} />}
    </label>
  );
  const section = (title: string, children: React.ReactNode) => <section className={`${box} flex flex-col gap-4`}><h3 className="m-0 text-base font-bold">{title}</h3>{children}</section>;
  const stat: SahasPageStat = { value: null, label: null };
  const statCols: Col<SahasPageStat>[] = [{ key: "value", label: "Number or short text" }, { key: "label", label: "Label" }];
  const linkBlank: SahasPageLink = { title: null, text: null, linkLabel: null, linkHref: null };
  const linkCols: Col<SahasPageLink>[] = [{ key: "title", label: "Title" }, { key: "linkLabel", label: "Link text (optional)" }, { key: "text", label: "Text", area: true }, { key: "linkHref", label: "Link, starting with / or https:// (optional)" }];

  const save = async () => {
    setBusy(true); onError(null); setSaved(false);
    try {
      const r = await sahasAdmin.savePage(campaignId, version, p);
      setP({ ...EMPTY, ...r.content }); setVersion(r.version); setSaved(true); onChanged();
    } catch (e) { onError(e instanceof Error ? e.message : "Couldn't save. Try again."); } finally { setBusy(false); }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className={`${box} flex flex-wrap items-center justify-between gap-3`}>
        <p className="m-0 max-w-md text-sm text-stone-600 dark:text-stone-300">Leave a section empty to hide it on the public page. The campaign story and cover photo are on the Details tab.</p>
        <button type="button" className={secondary} onClick={() => { if (window.confirm("Fill empty sections with starter text? Nothing goes public until you save.")) {
          const next = { ...p } as Record<string, unknown>;
          for (const [k, val] of Object.entries(STARTER)) { const cur = next[k]; if (cur == null || cur === "" || (Array.isArray(cur) && cur.length === 0)) next[k] = val; }
          patch(next as Partial<SahasPageContent>);
        } }}>Fill empty sections with starter text</button>
      </div>
      {section("Top of the page", <>
        {line("heroBadge", "Badge on the photo")}
        <Rows title="Tiles beside the days-left count (up to 2)" rows={p.heroStats ?? []} cols={statCols} blank={stat} max={2} onChange={(heroStats) => patch({ heroStats })} />
        <MediaRows title="Photos (shown after the cover, and in the gallery below)" kind="photo" rows={p.gallery ?? []} max={20} campaignId={campaignId} onChange={(gallery) => patch({ gallery })} onError={onError} />
      </>)}
      {section("Donors", <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.showDonors !== false} onChange={(e) => patch({ showDonors: e.target.checked })} /> Show top and recent donors. Anonymous donors never show a name.</label>)}
      {section("What Sahas has done", <>
        {line("proofEyebrow", "Small line above the heading")}
        {line("proofTitle", "Heading")}
        {line("proofIntro", "Intro", true)}
        <Rows title="Stats (up to 6)" rows={p.stats ?? []} cols={statCols} blank={stat} max={6} onChange={(stats) => patch({ stats })} />
        {line("videosTitle", "Videos heading")}
        <MediaRows title="Videos" kind="video" rows={p.videos ?? []} max={8} campaignId={campaignId} onChange={(videos) => patch({ videos })} onError={onError} />
      </>)}
      {section("How your contribution helps", <>
        {line("helpTitle", "Heading")}
        <Rows<{ amount: string | null; text: string | null }> title="Amounts (up to 6)" rows={p.tiers ?? []} cols={[{ key: "amount", label: "Amount" }, { key: "text", label: "What it does" }]} blank={{ amount: null, text: null }} max={6} onChange={(tiers) => patch({ tiers })} />
        {line("helpNote", "Note below", true)}
      </>)}
      {section("Your donation is safe", <>
        {line("trustTitle", "Heading")}
        {line("trustSubtitle", "Line below the heading")}
        <Rows title="Points (up to 8)" rows={p.trust ?? []} cols={linkCols} blank={linkBlank} max={8} onChange={(trust) => patch({ trust })} />
        {line("trustClosing", "Closing line")}
      </>)}
      {section("More ways to help", <>
        {line("moreTitle", "Heading")}
        {line("moreSubtitle", "Line below the heading")}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.showFundraisers !== false} onChange={(e) => patch({ showFundraisers: e.target.checked })} /> Show other campaigns and fundraisers running now (updates by itself)</label>
        <Rows title="Extra cards (up to 6)" rows={p.moreCards ?? []} cols={linkCols} blank={linkBlank} max={6} onChange={(moreCards) => patch({ moreCards })} />
      </>)}
      {section("Share", <>
        {line("shareTitle", "Heading")}
        {line("shareSubtitle", "Line below the heading")}
        {line("shareText", "Message sent with the link", true)}
      </>)}
      {section("FAQs", <>
        {line("faqTitle", "Heading")}
        <Rows<{ question: string | null; answer: string | null }> title="Questions (up to 20)" rows={p.faqs ?? []} cols={[{ key: "question", label: "Question", area: true }, { key: "answer", label: "Answer", area: true }]} blank={{ question: null, answer: null }} max={20} onChange={(faqs) => patch({ faqs })} />
      </>)}
      <div className="sticky bottom-3 flex items-center gap-3">
        <button type="button" className={primary} disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save page content"}</button>
        {saved && <span role="status" className="text-sm font-semibold text-emerald-800">Saved</span>}
      </div>
    </div>
  );
}
