"use client";

import { useEffect, useRef, useState } from "react";
import { notFound, useParams } from "next/navigation";
import Link from "@/components/AppLink";
import { FEATURES } from "@/lib/features";
import { useAuth } from "@/hooks/useAuth";
import { ApiError, sahasCampaigns, uploadTrustDonationPanPhoto, type SahasCampaignDetail } from "@/lib/api";
import { UiText, useUiText } from "@/components/UiText";
import { PageSkeleton } from "@/components/skeletons";
import { serif } from "@/features/sahas/sahasUi";

const MIN = 100;
const PRESETS = [500, 1000, 2500];
const FEE_PERCENT = 5;
const field = "min-h-[44px] w-full rounded-lg border border-[#D9C9B8] bg-white px-3 text-[15px] font-normal dark:border-zinc-700 dark:bg-zinc-950";

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

/** /sahas/[slug]/donate — donate to a Sahas campaign; guests allowed (design board HF · Donate money). */
export default function SahasDonatePage() {
  if (!FEATURES.sahas) notFound();
  return <SahasDonate />;
}

type Result = "pending" | "success" | "failed";

function SahasDonate() {
  const ui = useUiText();
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<SahasCampaignDetail | null | undefined>(undefined);
  const [amount, setAmount] = useState("1000");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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

  useEffect(() => { sahasCampaigns.detail(slug).then(setData).catch(() => setData(null)); }, [slug]);
  useEffect(() => () => { if (poll.current) clearTimeout(poll.current); }, []);

  if (data === undefined) return <PageSkeleton><div className="h-96" /></PageSkeleton>;
  const shell = (body: React.ReactNode) => (
    <main className="min-h-[70vh] bg-[#FBF7F2] px-4 py-10 text-[#1F140D] dark:bg-zinc-950 dark:text-stone-100">
      <div className="mx-auto flex max-w-xl flex-col gap-5">{body}</div>
    </main>
  );
  if (!data || !data.moneyOpen) {
    return shell(<>
      <h1 className={`${serif} m-0 text-2xl`}><UiText>This campaign isn&apos;t taking donations right now</UiText></h1>
      <Link href={`/sahas/${slug}`} className="font-semibold text-[#b04a15]"><UiText>Back to the campaign</UiText></Link>
    </>);
  }

  const c = data.card;
  const remaining = Math.max(0, (c.targetAmount ?? 0) - (c.amountRaised ?? 0));
  const value = Number(amount);
  const fee = Math.round(value * FEE_PERCENT) / 100;
  const valid = Number.isFinite(value) && value >= MIN && value <= remaining;
  const detailsOk = user ? true : name.trim() !== "" && /.+@.+/.test(email);
  const taxOk = !wants80g || (/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/.test(pan.trim()) && address.trim() !== "" && panFile !== null);

  const watch = (id: number, token: string, tries = 0) => {
    sahasCampaigns.donationStatus(id, token).then((s) => {
      if (s.status === "COMPLETED") setResult("success");
      else if (s.status === "FAILED") setResult("failed");
      else if (tries < 20) poll.current = setTimeout(() => watch(id, token, tries + 1), 3000);
    }).catch(() => { if (tries < 20) poll.current = setTimeout(() => watch(id, token, tries + 1), 3000); });
  };

  const pay = async () => {
    setBusy(true); setError(null);
    try {
      if (!(await loadCheckout())) { setError(ui("Couldn't load the payment window. Check your connection.")); return; }
      const start = await sahasCampaigns.donate(data.campaignId, {
        amount: value, fullName: name.trim(), email: email.trim(), mobileNumber: phone.trim(), anonymous,
        panNumber: wants80g ? pan.trim() : undefined, address: wants80g ? address.trim() : undefined,
      });
      const token = start.panUploadToken ?? "";
      if (wants80g && panFile) await uploadTrustDonationPanPhoto(start.donationId, panFile, token);
      const order = await sahasCampaigns.donationCheckout(start.donationId, token);
      new window.Razorpay({
        key: order.razorpayKeyId, amount: order.amountInPaise, currency: order.currency,
        name: "Sahas Charitable Trust", description: c.title, order_id: order.razorpayOrderId,
        prefill: { email: user?.email ?? email.trim(), contact: phone.trim() }, theme: { color: "#b04a15" },
        handler: () => { setResult("pending"); watch(start.donationId, token); },
        modal: { ondismiss: () => setBusy(false) },
      }).open();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : ui("Something went wrong. Nothing was charged."));
      setBusy(false);
    }
  };

  if (result) {
    return shell(
      <div role="status" className={`flex flex-col gap-2 rounded-2xl border p-6 ${result === "success" ? "border-[#CFE5D8] bg-[#F2F8F4]" : result === "failed" ? "border-[#F0CFC8] bg-[#FDF1EF]" : "border-[#F1DDB8] bg-[#FFF8EC]"} dark:bg-zinc-900`}>
        <h1 className={`${serif} m-0 text-2xl`}>
          {result === "success" ? <UiText>Thank you. Your donation is confirmed.</UiText>
            : result === "failed" ? <UiText>Payment didn&apos;t go through</UiText>
              : <UiText>Waiting for confirmation</UiText>}
        </h1>
        <p className="m-0 text-sm">
          {result === "success" ? <UiText>Your documents will be emailed to you.</UiText>
            : result === "failed" ? <UiText>No money was taken. You can try again.</UiText>
              : <UiText>We&apos;re confirming your payment. You can leave this page; we&apos;ll email you.</UiText>}
        </p>
        <Link href={`/sahas/${slug}`} className="font-semibold text-[#b04a15]"><UiText>Back to the campaign</UiText></Link>
      </div>,
    );
  }

  return shell(<>
    <Link href={`/sahas/${slug}`} className="text-sm text-[#6B5A4E]">← {c.title}</Link>
    <h1 className={`${serif} m-0 text-3xl`}><UiText>Donate money</UiText></h1>

    <section className="flex flex-col gap-3 rounded-2xl border border-[#EADFD3] bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.filter((p) => p <= remaining).map((p) => (
          <button key={p} type="button" aria-pressed={value === p} onClick={() => setAmount(String(p))}
            className={`min-h-[48px] rounded-xl border font-semibold ${value === p ? "border-2 border-[#b04a15] bg-[#FFF8F2] dark:bg-zinc-800" : "border-[#D9C9B8]"}`}>₹{p.toLocaleString("en-IN")}</button>
        ))}
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-semibold"><UiText>Amount (₹)</UiText>
        <input type="number" inputMode="numeric" min={MIN} max={remaining} className={field} value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <p className="m-0 text-xs text-[#6B5A4E]">{ui("Minimum ₹100. This campaign still needs")} ₹{remaining.toLocaleString("en-IN")}.</p>
    </section>

    <section className="flex flex-col gap-3 rounded-2xl border border-[#EADFD3] bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      {!user && <>
        <label className="flex flex-col gap-1.5 text-sm font-semibold"><UiText>Full name</UiText><input className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold"><UiText>Email</UiText><input type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
      </>}
      <label className="flex flex-col gap-1.5 text-sm font-semibold"><UiText>Phone (optional)</UiText><input type="tel" className={field} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /> <UiText>Don&apos;t show my name publicly</UiText></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={wants80g} onChange={(e) => setWants80g(e.target.checked)} /> <UiText>I want an 80G receipt</UiText></label>
      {wants80g && <>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">PAN<input className={`${field} uppercase`} value={pan} maxLength={10} onChange={(e) => setPan(e.target.value)} /></label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold"><UiText>Address</UiText><input className={field} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" /></label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold"><UiText>PAN card photo or PDF</UiText><input type="file" accept="image/*,application/pdf" onChange={(e) => setPanFile(e.target.files?.[0] ?? null)} /></label>
      </>}
    </section>

    <section className="flex flex-col gap-2 rounded-2xl bg-[#F7F1EA] p-5 text-sm leading-relaxed dark:bg-zinc-900">
      <div className="flex justify-between font-semibold"><span><UiText>You pay</UiText></span><span>₹{valid ? value.toLocaleString("en-IN") : "—"}</span></div>
      <p className="m-0">{ui("Platform fee: 5% is deducted from your donation")}{valid ? ` (₹${fee.toLocaleString("en-IN")})` : ""}. <UiText>The rest goes to this campaign, through Sahas Charitable Trust.</UiText></p>
      <p className="m-0"><UiText>Donations can&apos;t be refunded. If a payment is confirmed after the campaign closes or fills up, it is kept and reported as surplus.</UiText></p>
      <label className="mt-1 flex items-start gap-2 font-semibold"><input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /> <UiText>I understand and agree</UiText></label>
    </section>

    {error && <p role="alert" className="m-0 text-sm text-red-700">{error}</p>}
    <button type="button" disabled={busy || !valid || !detailsOk || !taxOk || !agreed} onClick={() => void pay()}
      className="min-h-[52px] rounded-xl bg-[#b04a15] text-[15px] font-semibold text-white disabled:opacity-50">
      {valid ? `${ui("Pay")} ₹${value.toLocaleString("en-IN")}` : ui("Enter an amount")}
    </button>
    <p className="m-0 text-center text-xs text-[#6B5A4E]"><UiText>Secured by Razorpay</UiText></p>
  </>);
}
