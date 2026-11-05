"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import Link from "@/components/AppLink";
import { useAuth } from "@/hooks/useAuth";
import { ApiError, sahasCampaigns, uploadTrustDonationPanPhoto, type SahasCampaignDetail } from "@/lib/api";
import { UiText, useUiText } from "@/components/UiText";
import { PageSkeleton } from "@/components/skeletons";
import { SAHAS_NAME, formatDate, serif } from "@/features/sahas/sahasUi";

const MIN = 101;
const PRESETS = [101, 251, 501, 1001, 2001, 5001];
const TIPS = [0, 30, 50, 100];
const FEE_PERCENT = 5;
const MAX_PAN_FILE = 5 * 1024 * 1024;
const field = "min-h-[42px] w-full rounded-lg border border-[#D9C9B8] bg-white px-3 text-[15px] font-normal focus:border-[#b04a15] focus:outline-none dark:border-zinc-700 dark:bg-zinc-950";

function loadCheckout(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

type Result = "pending" | "success" | "failed";

/**
 * Donating to a Sahas campaign; guests allowed (design board HF · Donate money). Used in the
 * popup on campaign cards and on /sahas/[slug]/donate for direct links. With `onClose` it is
 * in the popup: no page chrome, and leaving closes the popup.
 */
export function SahasDonateForm({ slug, onClose }: { slug: string; onClose?: () => void }) {
  const ui = useUiText();
  const locale = useLocale();
  const { user } = useAuth();
  const [about, setAbout] = useState(false);
  const [data, setData] = useState<SahasCampaignDetail | null | undefined>(undefined);
  const [amount, setAmount] = useState("1001");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tip, setTip] = useState(30);
  const [customTip, setCustomTip] = useState<string | null>(null);
  const [anonymous, setAnonymous] = useState(false);
  const [wants80g, setWants80g] = useState(false);
  const [pan, setPan] = useState("");
  const [address, setAddress] = useState("");
  const [panFile, setPanFile] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const poll = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [docs, setDocs] = useState<{ id: number; token: string; certificate: boolean; receipt: boolean; receiptOwed: boolean } | null>(null);

  useEffect(() => { sahasCampaigns.detail(slug).then(setData).catch(() => setData(null)); }, [slug]);
  useEffect(() => () => { if (poll.current) clearTimeout(poll.current); }, []);

  if (data === undefined) return onClose ? <p className="m-0 p-6 text-sm"><UiText>Loading…</UiText></p> : <PageSkeleton><div className="h-96" /></PageSkeleton>;
  const leave = onClose
    ? <button type="button" onClick={() => { onClose(); if (result === "success") window.location.reload(); }} className="self-start font-semibold text-[#b04a15]"><UiText>Close</UiText></button>
    : <Link href={`/sahas/${slug}`} className="font-semibold text-[#b04a15]"><UiText>Back to the campaign</UiText></Link>;
  const shell = (body: React.ReactNode) => (
    onClose
      ? <div className="flex h-full flex-col gap-4 overflow-y-auto p-6 pe-14 text-[#1F140D] dark:text-stone-100">{body}</div>
      : <main className="min-h-[70vh] bg-[#FBF7F2] px-4 py-10 text-[#1F140D] dark:bg-zinc-950 dark:text-stone-100">
          <div className="mx-auto flex max-w-xl flex-col gap-5">{body}</div>
        </main>
  );
  if (!data || !data.moneyOpen) {
    return shell(<>
      <h1 className={`${serif} m-0 text-2xl`}><UiText>This campaign isn&apos;t taking donations right now</UiText></h1>
      {leave}
    </>);
  }

  const c = data.card;
  const remaining = Math.max(0, (c.targetAmount ?? 0) - (c.amountRaised ?? 0));
  const value = Number(amount);
  const fee = Math.round(value * FEE_PERCENT) / 100;
  const valid = Number.isFinite(value) && value >= MIN && value <= remaining;
  const nameOk = name.trim().length >= 2;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const cleanPhone = phone.replace(/[\s-]/g, "");
  const phoneOk = phone === "" || /^\+?[0-9]{7,15}$/.test(cleanPhone);
  const tipValue = customTip === null ? tip : Number(customTip) || 0;
  const total = value + tipValue;
  const panOk = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
  const fileOk = panFile !== null && panFile.size <= MAX_PAN_FILE;
  const detailsOk = (user ? true : nameOk && emailOk) && phoneOk;
  const taxOk = !wants80g || (panOk && address.trim().length >= 10 && fileOk);
  const amountError = amount === "" ? null : value < MIN ? ui("The minimum donation is ₹101.")
    : value > remaining ? `${ui("This campaign needs only")} ₹${remaining.toLocaleString("en-IN")}.` : null;
  // Says what's left to do, so a disabled button is never a mystery.
  const todo = !valid ? ui("Enter an amount") : !user && !nameOk ? ui("Add your full name") : !user && !emailOk ? ui("Add a valid email")
    : !phoneOk ? ui("Check your phone number") : wants80g && !panOk ? ui("Check your PAN") : wants80g && address.trim().length < 10 ? ui("Add your full address")
      : wants80g && !fileOk ? ui("Add your PAN photo, up to 5 MB") : !agreed ? ui("Tick the box to agree") : null;
  const hint = "m-0 text-xs font-normal text-red-700";

  const watch = (id: number, token: string, tries = 0) => {
    sahasCampaigns.donationStatus(id, token).then((s) => {
      if (s.status === "FAILED") { setResult("failed"); return; }
      if (s.status === "COMPLETED") {
        setResult("success");
        setDocs({ id, token, certificate: s.certificateReady, receipt: s.receiptReady, receiptOwed: s.receiptOwed });
        if (s.certificateReady && (s.receiptReady || !s.receiptOwed)) return;
      }
      if (tries < 40) poll.current = setTimeout(() => watch(id, token, tries + 1), 3000);
    }).catch(() => { if (tries < 20) poll.current = setTimeout(() => watch(id, token, tries + 1), 3000); });
  };

  const pay = async () => {
    setBusy(true); setError(null);
    try {
      if (!(await loadCheckout())) { setError(ui("Couldn't load the payment window. Check your connection.")); return; }
      const start = await sahasCampaigns.donate(data.campaignId, {
        amount: value, fullName: name.trim(), email: email.trim(), mobileNumber: cleanPhone, tipAmount: tipValue, anonymous,
        panNumber: wants80g ? pan.trim() : undefined, address: wants80g ? address.trim() : undefined,
      });
      const token = start.panUploadToken ?? "";
      if (wants80g && panFile) await uploadTrustDonationPanPhoto(start.donationId, panFile, token);
      const order = await sahasCampaigns.donationCheckout(start.donationId, token);
      new window.Razorpay({
        key: order.razorpayKeyId, amount: order.amountInPaise, currency: order.currency,
        name: "Sahas Charitable Trust", description: c.title, order_id: order.razorpayOrderId,
        prefill: { email: user?.email ?? email.trim(), contact: cleanPhone }, theme: { color: "#b04a15" },
        handler: () => { setResult("pending"); watch(start.donationId, token); },
        modal: { ondismiss: () => setBusy(false) },
      }).open();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : ui("Something went wrong. Nothing was charged."));
      setBusy(false);
    }
  };

  const download = async (kind: "certificate" | "receipt") => {
    if (!docs) return;
    try {
      const url = URL.createObjectURL(await sahasCampaigns.donationDocument(docs.id, docs.token, kind));
      const a = document.createElement("a");
      a.href = url; a.download = `${kind}-${docs.id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { setError(ui("The document isn't ready yet. It will reach you by email.")); }
  };
  const docButton = "flex min-h-[48px] items-center justify-center rounded-xl bg-[#b04a15] px-5 text-[15px] font-semibold text-white";

  if (result) {
    return shell(
      <div role="status" className={`flex flex-col gap-2 rounded-2xl border p-6 ${result === "success" ? "border-[#CFE5D8] bg-[#F2F8F4]" : result === "failed" ? "border-[#F0CFC8] bg-[#FDF1EF]" : "border-[#F1DDB8] bg-[#FFF8EC]"} dark:bg-zinc-900`}>
        <h1 className={`${serif} m-0 text-2xl`}>
          {result === "success" ? <UiText>Thank you. Your donation is confirmed.</UiText>
            : result === "failed" ? <UiText>Payment didn&apos;t go through</UiText>
              : <UiText>Waiting for confirmation</UiText>}
        </h1>
        <p className="m-0 text-sm">
          {result === "success" ? (docs?.certificate ? <UiText>Download your documents below. They are also emailed to you.</UiText> : <UiText>Preparing your documents. They will appear here and reach you by email.</UiText>)
            : result === "failed" ? <UiText>No money was taken. You can try again.</UiText>
              : <UiText>We&apos;re confirming your payment. You can leave this page; we&apos;ll email you.</UiText>}
        </p>
        {result === "success" && docs?.certificate && <button type="button" className={docButton} onClick={() => void download("certificate")}><UiText>Download certificate</UiText></button>}
        {result === "success" && docs?.receipt && <button type="button" className={docButton} onClick={() => void download("receipt")}><UiText>Download 80G receipt</UiText></button>}
        {result === "success" && docs?.receiptOwed && !docs.receipt && <p className="m-0 text-sm"><UiText>Your 80G receipt is being prepared.</UiText></p>}
        {error && <p role="alert" className="m-0 text-sm text-red-700">{error}</p>}
        {leave}
      </div>,
    );
  }

  const box = onClose ? "flex flex-col gap-3" : "flex flex-col gap-3 rounded-2xl border border-[#EADFD3] bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";
  const short = !!onClose && wants80g;
  const slid = !!onClose && agreed;
  const fields = <>
    <section className={box}>
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.filter((p) => p <= remaining).map((p) => (
          <button key={p} type="button" aria-pressed={value === p} onClick={() => setAmount(String(p))}
            className={`min-h-[44px] rounded-[10px] border font-semibold ${value === p ? "border-[#1F140D] bg-[#1F140D] text-white dark:border-stone-100 dark:bg-stone-100 dark:text-zinc-950" : "border-[#CDBBA8] bg-white dark:bg-zinc-900"}`}>₹{p.toLocaleString("en-IN")}</button>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-xs sm:text-sm font-semibold text-[#3a0716] dark:text-stone-200"><UiText>Amount (₹)</UiText>
        <input inputMode="numeric" className={field} value={amount} maxLength={9} onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").replace(/^0+/, ""))} />
      </label>
      {amountError && <p role="alert" className={hint}>{amountError}</p>}
      <p className="m-0 text-xs text-[#6B5A4E] dark:text-stone-400">{ui("Minimum ₹101. This campaign still needs")} ₹{remaining.toLocaleString("en-IN")}.</p>
    </section>

    <section className={box}>
      {!user && <>
        <label className="flex flex-col gap-1 text-xs sm:text-sm font-semibold text-[#3a0716] dark:text-stone-200"><UiText>Full name</UiText><input className={field} value={name} maxLength={150} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
        <label className="flex flex-col gap-1 text-xs sm:text-sm font-semibold text-[#3a0716] dark:text-stone-200"><UiText>Email</UiText><input type="email" className={field} value={email} maxLength={254} onChange={(e) => setEmail(e.target.value.trim())} autoComplete="email" /></label>
        {email !== "" && !emailOk && <p className={hint}><UiText>Enter a valid email, like name@example.com.</UiText></p>}
      </>}
      <label className="flex flex-col gap-1 text-xs sm:text-sm font-semibold text-[#3a0716] dark:text-stone-200"><UiText>Phone (optional)</UiText><input type="tel" inputMode="tel" className={field} value={phone} maxLength={20} placeholder="+91 98765 43210" onChange={(e) => setPhone(e.target.value.replace(/[^0-9+\s-]/g, ""))} autoComplete="tel" /></label>
      {!phoneOk && phone.length > 0 && <p className={hint}><UiText>Enter a valid phone number.</UiText></p>}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> <UiText>Don&apos;t show my name publicly</UiText></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={wants80g} onChange={(e) => setWants80g(e.target.checked)} /> <UiText>I want an 80G receipt</UiText></label>
      {wants80g && <div className={`flex flex-col gap-3 ${onClose ? "rounded-xl bg-[#FBF7F2] p-3.5 dark:bg-zinc-900" : ""}`}>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">PAN<input className={`${field} uppercase`} value={pan} maxLength={10} placeholder="ABCDE1234F" onChange={(e) => setPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} /></label>
        {pan.length === 10 && !panOk && <p className={hint}><UiText>That PAN doesn&apos;t look right. It should be like ABCDE1234F.</UiText></p>}
        <label className="flex flex-col gap-1 text-xs sm:text-sm font-semibold text-[#3a0716] dark:text-stone-200"><UiText>Address</UiText><input className={field} value={address} maxLength={300} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" /></label>
        <div className="flex flex-col gap-1 text-xs sm:text-sm font-semibold text-[#3a0716] dark:text-stone-200">
          <span><UiText>PAN card photo or PDF</UiText></span>
          <label className="flex min-h-[44px] w-fit cursor-pointer items-center justify-center rounded-xl border border-[#b04a15] bg-white px-5 text-sm font-semibold text-[#b04a15] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#b04a15] dark:bg-zinc-900">
            {panFile ? <UiText>Change file</UiText> : <UiText>Upload PAN card</UiText>}
            <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setPanFile(e.target.files?.[0] ?? null)} />
          </label>
          {panFile ? <span className="text-xs font-normal text-[#1E5B42]">✓ {panFile.name}</span> : <span className="text-xs font-normal text-[#6B5A4E]"><UiText>JPG, PNG or PDF, up to 5 MB</UiText></span>}
        </div>
        {panFile && !fileOk && <p className={hint}><UiText>That file is over 5 MB. Choose a smaller one.</UiText></p>}
      </div>}
    </section>
    <section className={box}>
      <div className="flex flex-col gap-0.5">
        <b className="text-sm"><UiText>Support CauseKind</UiText></b>
        <p className="m-0 text-xs text-[#6B5A4E] dark:text-stone-400"><UiText>Optional support for the CauseKind platform. It is separate from your donation and not covered by the 80G receipt.</UiText></p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {TIPS.map((t) => (
          <button key={t} type="button" aria-pressed={customTip === null && tip === t} onClick={() => { setTip(t); setCustomTip(null); }}
            className={`min-h-[44px] rounded-[10px] border text-sm font-semibold ${customTip === null && tip === t ? "border-[#1F140D] bg-[#1F140D] text-white dark:border-stone-100 dark:bg-stone-100 dark:text-zinc-950" : "border-[#CDBBA8] bg-white dark:bg-zinc-900"}`}>{t === 0 ? ui("No thanks") : `₹${t}`}</button>
        ))}
        <button type="button" aria-pressed={customTip !== null} onClick={() => setCustomTip("")}
          className={`min-h-[44px] rounded-[10px] border text-sm font-semibold ${customTip !== null ? "border-[#1F140D] bg-[#1F140D] text-white dark:border-stone-100 dark:bg-stone-100 dark:text-zinc-950" : "border-[#CDBBA8] bg-white dark:bg-zinc-900"}`}><UiText>Other</UiText></button>
      </div>
      {customTip !== null && <label className="flex flex-col gap-1.5 text-sm font-semibold"><UiText>Support amount (₹)</UiText><input inputMode="numeric" className={field} value={customTip} maxLength={5} onChange={(e) => setCustomTip(e.target.value.replace(/\D/g, ""))} /></label>}
    </section>
  </>;
  const footer = <>
    <section className={onClose ? "flex flex-col gap-2 text-xs leading-relaxed" : "flex flex-col gap-2 rounded-2xl bg-[#F7F1EA] p-5 text-sm leading-relaxed dark:bg-zinc-900"}>
      <div className={`flex justify-between font-semibold ${onClose ? "text-base font-bold" : ""}`}><span><UiText>You pay</UiText></span><span>₹{valid ? total.toLocaleString("en-IN") : "—"}</span></div>
      {valid && tipValue > 0 && <p className="m-0 text-xs text-[#6B5A4E] dark:text-stone-400">₹{value.toLocaleString("en-IN")} <UiText>donation</UiText> + ₹{tipValue.toLocaleString("en-IN")} <UiText>support to CauseKind</UiText></p>}
      {/* In the popup the terms slide away once agreed, leaving room for the form. */}
      <div aria-hidden={slid} className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${slid ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}>
        <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
                <p className={`m-0 ${short ? "lg:hidden" : ""}`}>{ui("Platform fee: 5% is deducted from your donation")}{valid ? ` (₹${fee.toLocaleString("en-IN")})` : ""}. <UiText>The rest goes to this campaign, through Sahas Charitable Trust.</UiText></p>
                <p className={`m-0 ${short ? "lg:hidden" : ""}`}><UiText>Donations can&apos;t be refunded. If a payment is confirmed after the campaign closes or fills up, it is kept and reported as surplus.</UiText></p>
        </div>
      </div>
      <label className="mt-1 flex items-start gap-2 font-semibold"><input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /> {short ? <UiText>I understand and agree to the fee and no-refund terms</UiText> : <UiText>I understand and agree</UiText>}</label>
    </section>

    {error && <p role="alert" className="m-0 text-sm text-red-700">{error}</p>}
    <button type="button" disabled={busy || !valid || !detailsOk || !taxOk || !agreed} onClick={() => void pay()}
      className="min-h-[48px] rounded-xl bg-gradient-to-r from-[#8e123c] via-[#a31a44] to-[#720d2d] hover:from-[#720d2d] hover:to-[#8e123c] text-[15px] font-bold text-white shadow-xs hover:shadow-md transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer">
      {todo ?? `${ui("Pay")} ₹${total.toLocaleString("en-IN")}`}
    </button>
    <p className="m-0 text-center text-xs text-[#6B5A4E]"><UiText>Secured by Razorpay</UiText></p>
  </>;

  if (!onClose) {
    return shell(<>
      <Link href={`/sahas/${slug}`} className="text-sm text-[#6B5A4E]">← {c.title}</Link>
      <h1 id="sahas-donate-title" className={`${serif} m-0 text-3xl`}><UiText>Donate money</UiText></h1>
      {fields}
      {footer}
    </>);
  }

  // The popup (design: Sahas Donate Window): campaign on the left, donating on the right;
  // on phones a short campaign summary sits above the form.
  const pct = `${Math.min(100, ((c.amountRaised ?? 0) / (c.targetAmount || 1)) * 100)}%`;
  const bar = <div className="h-1 bg-[#E3D6C8] dark:bg-zinc-800"><div className="h-1 bg-[#b04a15]" style={{ width: pct }} /></div>;
  const ends = formatDate(c.endDate, locale);
  const facts = [[c.city, c.state].filter(Boolean).join(", "), ends && `${ui("Ends")} ${ends}`].filter(Boolean).join(" · ");
  const story = data.description || c.summary;
  const left = `₹${remaining.toLocaleString("en-IN")}`;
  const raised = `₹${(c.amountRaised ?? 0).toLocaleString("en-IN")} ${ui("of")} ₹${(c.targetAmount ?? 0).toLocaleString("en-IN")}`;
  const cover = c.imageUrl
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={c.imageUrl} alt={c.coverAltText ?? ""} className="h-full w-full object-cover" />
    : null;
  return (
    <div className="grid text-[#1F140D] lg:h-full lg:grid-cols-[minmax(0,1fr)_480px] dark:text-stone-100">
      <article className="hidden min-h-0 flex-col overflow-y-auto bg-[#FBF7F2] lg:flex dark:bg-zinc-950">
        <div className="h-[270px] shrink-0 bg-[#E6D5C3] dark:bg-zinc-800">{cover}</div>
        <div className="flex flex-col gap-3 px-9 py-6">
          <p className="m-0 text-[13px] text-[#5c4a3d] dark:text-stone-400"><UiText>Organised by</UiText> {SAHAS_NAME}</p>
          <h2 className={`${serif} m-0 text-[38px] leading-[1.1]`}>{c.title}</h2>
          {facts && <p className="m-0 text-sm text-[#5c4a3d] dark:text-stone-400">{facts}</p>}
          <div className="flex items-baseline gap-2.5 pt-1.5">
            <b className={`${serif} text-3xl`}>{left}</b>
            <span className="text-sm text-[#4A3B30] dark:text-stone-300"><UiText>still needed</UiText></span>
            <span className="ms-auto text-sm text-[#4A3B30] dark:text-stone-300">{raised}</span>
          </div>
          {bar}
          {story && <p className="m-0 mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-[#2E2219] dark:text-stone-200 ck-user-text">{story}</p>}
          <Link href={`/sahas/${slug}`} className="text-sm font-semibold text-[#8f3a0e] underline dark:text-[#e07b3a]"><UiText>Open the full campaign page</UiText></Link>
        </div>
      </article>

      <div className="flex min-h-0 flex-col border-[#E3D6C8] bg-white lg:border-s dark:border-zinc-800 dark:bg-zinc-950">
        <section className="flex flex-col gap-2.5 bg-[#FBF7F2] px-4 pb-3 pt-4 lg:hidden dark:bg-zinc-900">
          <span className="pe-10 text-[13px] text-[#5c4a3d] dark:text-stone-400">{SAHAS_NAME}</span>
          <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3">
            <div className="h-[88px] bg-[#E6D5C3] dark:bg-zinc-800">{cover}</div>
            <div>
              <h2 className={`${serif} m-0 mb-1 text-[22px] leading-tight`}>{c.title}</h2>
              <p className="m-0 text-sm"><b>{left}</b> <UiText>still needed</UiText></p>
            </div>
          </div>
          {bar}
          {story && <button type="button" aria-expanded={about} onClick={() => setAbout((v) => !v)} className="min-h-[44px] cursor-pointer border-0 bg-transparent p-0 text-start text-sm font-semibold text-[#8f3a0e] underline dark:text-[#e07b3a]"><UiText>Read about this campaign</UiText></button>}
          {about && story && <p className="m-0 whitespace-pre-line text-sm leading-relaxed ck-user-text">{story}</p>}
        </section>
        <div className="flex min-h-0 flex-1 flex-col gap-3.5 px-4 pb-3 pt-4 lg:overflow-y-auto lg:px-8 lg:pt-6">
          <h1 id="sahas-donate-title" className={`${serif} m-0 text-[26px]`}>{short ? `${ui("Donate")} ₹${value.toLocaleString("en-IN")}` : <UiText>Donate</UiText>}</h1>
          {fields}
        </div>
        <div className="flex flex-col gap-2 border-t border-[#E3D6C8] px-4 pb-5 pt-3 lg:px-8 dark:border-zinc-800">{footer}</div>
      </div>
    </div>
  );
}
