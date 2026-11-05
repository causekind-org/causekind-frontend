"use client";
import { useTranslations } from "next-intl";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "@/components/AppLink";
import { useAuth } from "@/hooks/useAuth";
import { FEATURES } from "@/lib/features";
import { loginUrlFor } from "@/lib/safeRedirect";
import { fundraisers, ApiError, readPanCard, uploadDonationPanPhoto, type FundraiserDetail } from "@/lib/api";

/** Same lenient rule as /donate/money: one shared name part of 2+ letters (owner, 2026-10-08). */
function panNameMatches(formName: string, cardName: string): boolean {
  const parts = (s: string) => s.toUpperCase().replace(/[^A-Z\s]/g, " ").split(/\s+/).filter((p) => p.length >= 2);
  const card = new Set(parts(cardName));
  return parts(formName).some((p) => card.has(p));
}
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The server takes only JPEG, PNG and WebP (415 otherwise — HEIC, AVIF, GIF… failed at "Pay", 2026-10-31).
 * Anything else the browser can decode is re-encoded as JPEG here; null when it can't be read at all.
 */
async function toAcceptedImage(file: File): Promise<File | null> {
  // PDFs (e-PAN, scans) are accepted as they are (owner, 2026-11-02).
  if (["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bmp.width; canvas.height = bmp.height;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    return blob ? new File([blob], file.name.replace(/\.[^.]*$/, "") + ".jpg", { type: "image/jpeg" }) : null;
  } catch { return null; }
}
import { Icon, formatINR } from "@/features/fundraising/ui";
import { guestTokenFor, rememberGuestToken } from "@/features/fundraising/guestDonation";
import s from "@/features/fundraising/fundraising.module.css";

import { UiText, useUiText } from "@/components/UiText";
type RazorpayCtor = new (opts: Record<string, unknown>) => { open: () => void };
const rzpCtor = () => (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;

const EXAMPLES = [500, 1000, 2500, 5000];
const SUPPORT_AMOUNTS = [0, 20, 50, 100];
/** Razorpay standard rate incl. GST (2% + 18%), shown as an estimate only. */
const GATEWAY_PERCENT = 2.36;

/** F23–F25 — donation amount, details and review, then provider checkout (D4). */
const ERR_UNAVAILABLE = "\u0000unavailable";
const ERR_OPEN = "\u0000open";
const ERR_START = "\u0000start";

const pendingKey = (campaignId: number) => `ck:fundraiser-pending:${campaignId}`;

/** What happened to a donation this browser started earlier, when it can't be checked out again. */
type Prior =
  | { kind: "failed"; donationId: number }      // explicit "Start a new payment"
  | { kind: "unknown"; donationId: number }     // status couldn't be recovered — explicit new payment only
  | { kind: "lookupFailed"; donationId: number }; // keep it, offer retry

type CheckoutResult =
  | { order: Awaited<ReturnType<typeof fundraisers.checkout>> }
  | { redirect: number }
  | { prior: Prior }
  /** The PAN photo didn't upload; checkout hasn't started, so retry or continue without 80G. */
  | { photoFailed: number; reason: string | null };

/**
 * Starts or resumes the donation, then asks the server for the payment details (server checkout is idempotent:
 * same order every time). A retry with the same amount and name choice reuses the donation already started.
 * If the server won't check that donation out again, its status decides — never an automatic second donation:
 * paid or still confirming → its result page; failed → an explicit "Start a new payment"; status unknown or
 * unreadable → explained, and a new payment needs an explicit click. {@code fresh} is that explicit click.
 */
/** 80G details for this donation; the photo must be on the server before checkout or the donation is certificate-only. */
type Tax = { panNumber: string; address: string; photo: File };
/** Someone donating without an account (2026-11-04); null for a signed-in donor. */
type Guest = { fullName: string; email: string; mobileNumber: string };

async function checkoutReusingDonation(campaignId: number, amount: number, support: number, anonymous: boolean, fresh: boolean,
                                       tax: Tax | null, guest: Guest | null, skipPhoto = false): Promise<CheckoutResult> {
  const key = pendingKey(campaignId);
  // The details are frozen on the donation, so different ones (or a different kind of donor) need a new donation.
  const who = guest ? JSON.stringify(guest) : null;
  type Saved = { donationId: number; amount: number; support?: number; anonymous: boolean; pan: string | null; photo: boolean; who?: string | null };
  let saved: Saved | null = null;
  try { saved = JSON.parse(sessionStorage.getItem(key) ?? "null"); } catch { /* storage unavailable */ }
  const remember = (s: Saved) => { try { sessionStorage.setItem(key, JSON.stringify(s)); } catch { /* fine */ } };
  /** Upload the PAN photo (once) before checkout fixes the documents. */
  const ensurePhoto = async (s: Saved): Promise<CheckoutResult | null> => {
    if (!tax || s.photo || skipPhoto) return null;
    try { await uploadDonationPanPhoto(s.donationId, tax.photo, guestTokenFor(s.donationId) ?? undefined); }
    catch (e) {
      // 409 = already uploaded on an earlier try; anything else stops before checkout.
      if (!(e instanceof ApiError) || e.status !== 409) return { photoFailed: s.donationId, reason: e instanceof ApiError ? e.message : null };
    }
    remember({ ...s, photo: true });
    return null;
  };
  if (!fresh && saved && saved.amount === amount && (saved.support ?? 0) === support && saved.anonymous === anonymous && saved.pan === (tax?.panNumber ?? null) && (saved.who ?? null) === who) {
    const stop = await ensurePhoto(saved);
    if (stop) return stop;
    try { return { order: await fundraisers.checkout(saved.donationId, guestTokenFor(saved.donationId)) }; }
    catch (e) {
      if (!(e instanceof ApiError) || (e.status !== 404 && e.status !== 409)) throw e;
      if (e.status === 404) return { prior: { kind: "unknown", donationId: saved.donationId } };
      try {
        const status = (await fundraisers.checkDonation(saved.donationId, guestTokenFor(saved.donationId))).status;
        if (status === "COMPLETED" || status === "INITIATED") return { redirect: saved.donationId };
        if (status === "FAILED") return { prior: { kind: "failed", donationId: saved.donationId } };
        return { prior: { kind: "unknown", donationId: saved.donationId } };
      } catch (inner) {
        if (inner instanceof ApiError && inner.status === 404) return { prior: { kind: "unknown", donationId: saved.donationId } };
        return { prior: { kind: "lookupFailed", donationId: saved.donationId } };
      }
    }
  }
  const taxDetails = tax ? { panNumber: tax.panNumber, address: tax.address } : undefined;
  const started = guest
    ? await fundraisers.donateAsGuest(campaignId, amount, anonymous, guest, taxDetails, support)
    : await fundraisers.donate(campaignId, amount, anonymous, taxDetails, support);
  if (started.guestToken) rememberGuestToken(started.donationId, started.guestToken);
  const fresh_: Saved = { donationId: started.donationId, amount, support, anonymous, pan: tax?.panNumber ?? null, photo: false, who };
  remember(fresh_);
  const stop = await ensurePhoto(fresh_);
  if (stop) return stop;
  return { order: await fundraisers.checkout(started.donationId, started.guestToken) };
}

export default function DonatePage() {
  const ui = useUiText();
  const t = useTranslations("fundraiserFlow");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading, isRestoring } = useAuth();
  const [d, setD] = useState<FundraiserDetail | null>(null);
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [tried, setTried] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [detailsTried, setDetailsTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prior, setPrior] = useState<Prior | null>(null);
  // Optional support to CauseKind: off until the donor chooses it, and never part of the donation.
  const [support, setSupport] = useState(0);
  const [customSupport, setCustomSupport] = useState<string | null>(null);
  // 80G (CA approved, 2026-10-30): only when the server offers it.
  const [want80G, setWant80G] = useState(false);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [panPreview, setPanPreview] = useState<string | null>(null);
  const [panTypeError, setPanTypeError] = useState(false);
  useEffect(() => () => { if (panPreview) URL.revokeObjectURL(panPreview); }, [panPreview]);
  const [pan, setPan] = useState("");
  const [panName, setPanName] = useState<string | null>(null);
  const [panReading, setPanReading] = useState(false);
  const [panReadNote, setPanReadNote] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [taxTried, setTaxTried] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [photoReason, setPhotoReason] = useState<string | null>(null);
  // Fallback errors are stored as markers and translated here, at render; server messages show as sent.
  const errorText = error === ERR_UNAVAILABLE ? ui("This fundraiser isn't available.")
    : error === ERR_OPEN ? ui("We couldn't open payment right now. Nothing was charged. Try again in a moment.")
    : error === ERR_START ? ui("We couldn't start the payment. Nothing was charged.") : error;

  useEffect(() => { if (FEATURES.fundraising) fundraisers.detail(Number(id)).then(setD).catch(() => setError(ERR_UNAVAILABLE)); }, [id]);

  if (!FEATURES.fundraising) return null;
  if (!d || isLoading || isRestoring) return <div className={`${s.root} ${s.publicTheme}`} aria-busy="true">{error && <p role="alert" className={s.errText} style={{ padding: 32 }}>{errorText}</p>}</div>;
  if (!d.acceptingDonations) {
    return <div className={`${s.root} ${s.publicTheme}`}><main className={s.wrap} style={{ paddingTop: 48 }}><p><strong><UiText>This fundraiser isn&apos;t accepting donations right now.</UiText></strong> <UiText>Nothing was charged.</UiText></p><Link href={`/fundraisers/${id}`}><UiText>Back to fundraiser</UiText></Link></main></div>;
  }

  const value = amount ?? (custom.trim() ? Number(custom.replace(/,/g, "")) : NaN);
  // Never above the target (owner, 2026-10-31); the server enforces it too.
  const remaining = d.remaining ?? null;
  const tooMuch = remaining != null && Number.isFinite(value) && value > remaining;
  const invalid = !Number.isFinite(value) || value < 1 || tooMuch;
  const fee = Number.isFinite(value) ? Math.round(value * d.platformFeePercent) / 100 : 0;
  const gateway = Number.isFinite(value) ? Math.round(value * GATEWAY_PERCENT) / 100 : 0;
  const supportValue = customSupport === null ? support : Number(customSupport) || 0;
  const offer80G = !!d.taxReceiptOffered;
  const panClean = pan.replace(/\s/g, "").toUpperCase();
  const donorName = user ? user.fullName ?? "" : guestName.trim();
  const donorEmail = user ? user.email : guestEmail.trim();
  const guest: Guest | null = user ? null : { fullName: donorName, email: donorEmail, mobileNumber: guestPhone.trim() };
  const nameInvalid = !user && !donorName;
  const emailInvalid = !user && !EMAIL_RE.test(donorEmail);
  const nameMismatch = !!panName && !panNameMatches(donorName, panName);
  const taxProblems = !offer80G || !want80G ? [] : [
    ...(!panFile ? [ui("Add a photo of your PAN card")] : []),
    ...(!PAN_RE.test(panClean) ? [ui("Enter a valid PAN, like ABCDE1234F")] : []),
    ...(!address.trim() ? [ui("Enter your address")] : []),
    ...(nameMismatch ? [user ? ui("The name on the PAN card doesn't match your account name") : ui("The name on the PAN card doesn't match the name you entered")] : []),
  ];
  const tax: Tax | null = offer80G && want80G && panFile && taxProblems.length === 0
    ? { panNumber: panClean, address: address.trim(), photo: panFile } : null;

  async function choosePanPhoto(picked: File | null) {
    if (!picked) return; // cancelled the picker: keep the photo already chosen
    const file = await toAcceptedImage(picked);
    if (!file) {
      setPanFile(null); setPanPreview(null); setPanName(null);
      setPanTypeError(true);
      return;
    }
    setPanTypeError(false);
    setPanFile(file); setPanName(null); setPanReadNote(null);
    setPanPreview(file.type === "application/pdf" ? null : URL.createObjectURL(file));
    setPanReading(true);
    try {
      const r = await readPanCard(file);
      if (r.panNumber) setPan(r.panNumber);
      if (r.nameOnCard) setPanName(r.nameOnCard);
      if (!r.read) setPanReadNote(ui("We couldn't read the card. Type your PAN below."));
    } catch {
      setPanReadNote(ui("We couldn't read the card. Type your PAN below."));
    } finally { setPanReading(false); }
  }

  async function pay(fresh = false, skipPhoto = false) {
    setBusy(true); setError(null); setPrior(null); setPhotoFailed(false);
    try {
      const ok = await loadRazorpay();
      const Rzp = rzpCtor();
      if (!ok || !Rzp) { setError(ERR_OPEN); setBusy(false); return; }
      const result = await checkoutReusingDonation(Number(id), value, supportValue, anonymous, fresh, tax, guest, skipPhoto);
      if ("redirect" in result) { router.push(`/fundraisers/donations/${result.redirect}`); return; }
      if ("prior" in result) { setPrior(result.prior); setBusy(false); return; }
      if ("photoFailed" in result) { setPhotoFailed(true); setPhotoReason(result.reason); setBusy(false); return; }
      const order = result.order;
      const rzp = new Rzp({
        key: order.razorpayKeyId, amount: order.amountInPaise, currency: order.currency,
        name: "CauseKind", description: d!.card.title ?? "Fundraiser", order_id: order.razorpayOrderId,
        prefill: { email: donorEmail, name: donorName },
        theme: { color: "#b04a15" },
        // The browser callback is never proof of payment: the result page asks the server.
        handler: () => router.push(`/fundraisers/donations/${order.donationId}`),
        modal: { ondismiss: () => router.push(`/fundraisers/donations/${order.donationId}?left=1`) },
      });
      rzp.open();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : ERR_START);
      setBusy(false);
    }
  }

  const steps = [ui("Amount", "donate step"), ui("Your details", "donate step"), ui("Review", "donate step")];
  return (
    <div className={`${s.root} ${s.publicTheme}`}>
      <main className={`${s.wrap} ${s.donateLayout}`} style={{ paddingTop: 32, paddingBottom: 64, alignItems: "start", maxWidth: 1080 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, minWidth: 0 }}>
          <ol aria-label={ui("Donation steps")} style={{ listStyle: "none", padding: 0, display: "flex", gap: 6, fontSize: 14, fontWeight: 600, color: "#6b5d52", flexWrap: "wrap" }}>
            {steps.map((label, i) => <li key={label} aria-current={i === step ? "step" : undefined} style={{ color: i === step ? "#7a3410" : undefined }}>{i + 1} {label}{i < step ? " ✓" : ""}{i < steps.length - 1 ? " ·" : ""}</li>)}
          </ol>

          {step === 0 && (
            <>
              <h1 className={s.serif} style={{ fontSize: 32 }}><UiText>How much would you like to give?</UiText></h1>
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className={`${s.small} ${s.muted}`} style={{ marginBottom: 8 }}><UiText>Example amounts</UiText></legend>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
                  {EXAMPLES.filter((v) => remaining == null || v <= remaining).map((v) => (
                    <button key={v} type="button" aria-pressed={amount === v} onClick={() => { setAmount(v); setCustom(""); }}
                      style={{ minHeight: 56, borderRadius: 10, fontWeight: 700, fontSize: 18, cursor: "pointer", font: "inherit",
                        border: amount === v ? "2px solid #b04a15" : "1px solid #cfc3b6", background: amount === v ? "#fdf6f1" : "#fff", color: amount === v ? "#7a3410" : "#1f140c" }}>
                      {formatINR(v)}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div style={{ maxWidth: 360 }}>
                <label htmlFor="cu" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}><UiText>Or enter an amount (₹)</UiText></label>
                <input id="cu" className={s.in} inputMode="decimal" value={custom} aria-invalid={tried && invalid ? true : undefined} aria-describedby={tried && invalid ? "er" : undefined}
                  onChange={(e) => { setCustom(e.target.value); setAmount(null); }} style={{ fontSize: 20, fontWeight: 700 }} />
                {tried && invalid && <p id="er" role="alert" className={s.errText}><Icon name="alert" />{tooMuch
                  ? <>{ui("This fundraiser needs only")} {formatINR(remaining)} {ui("more. You can give up to that amount.")}</>
                  : <UiText>Enter an amount of ₹1 or more.</UiText>}</p>}
              </div>
              {remaining != null && <p className={s.small}><strong>{formatINR(remaining)}</strong> {ui("still needed to reach the target. You can give up to this amount.")}</p>}
              <p className={`${s.small} ${s.muted}`}><UiText>One-time donation in INR.</UiText></p>
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend style={{ fontWeight: 600, marginBottom: 4 }}><UiText>Support the CauseKind platform (optional)</UiText></legend>
                <p className={`${s.small} ${s.muted}`} style={{ marginBottom: 8 }}><UiText>This helps us keep CauseKind running. It is separate from your donation, does not go to the fundraiser, and is not covered by the 80G receipt.</UiText></p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {SUPPORT_AMOUNTS.map((v) => {
                    const on = customSupport === null && support === v;
                    return <button key={v} type="button" aria-pressed={on} onClick={() => { setSupport(v); setCustomSupport(null); }}
                      style={{ minHeight: 44, padding: "0 14px", borderRadius: 10, fontWeight: 600, cursor: "pointer", border: on ? "2px solid #b04a15" : "1px solid #cfc3b6", background: on ? "#fdf6f1" : "#fff", color: on ? "#7a3410" : "#1f140c" }}>{v === 0 ? ui("No thanks") : formatINR(v)}</button>;
                  })}
                  <button type="button" aria-pressed={customSupport !== null} onClick={() => setCustomSupport("")}
                    style={{ minHeight: 44, padding: "0 14px", borderRadius: 10, fontWeight: 600, cursor: "pointer", border: customSupport !== null ? "2px solid #b04a15" : "1px solid #cfc3b6", background: customSupport !== null ? "#fdf6f1" : "#fff", color: customSupport !== null ? "#7a3410" : "#1f140c" }}><UiText>Other</UiText></button>
                </div>
                {customSupport !== null && <label style={{ display: "block", marginTop: 10, fontWeight: 600 }}><UiText>Support amount (₹)</UiText><input className={s.in} inputMode="numeric" maxLength={5} value={customSupport} onChange={(e) => setCustomSupport(e.target.value.replace(/\D/g, ""))} style={{ display: "block", marginTop: 6 }} /></label>}
              </fieldset>
              <div><button type="button" className={`${s.btn} ${s.bp}`} onClick={() => { setTried(true); if (!invalid) { setStep(1); window.scrollTo({ top: 0 }); } else document.getElementById("cu")?.focus(); }}><UiText>Continue</UiText></button></div>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className={s.serif} style={{ fontSize: 32 }}><UiText>Your details</UiText></h1>
              {user ? (
                <div className={s.grid2}>
                  <div><label className={s.lbl} htmlFor="n"><UiText>Full name</UiText> <span className={`${s.chip} ${s.cM}`}><UiText>From your account</UiText></span></label><input id="n" className={s.in} value={user.fullName ?? ""} readOnly /></div>
                  <div><label className={s.lbl} htmlFor="e"><UiText>Email</UiText> <span className={`${s.chip} ${s.cM}`}><UiText>From your account</UiText></span></label><input id="e" className={s.in} value={user.email} readOnly style={{ background: "#f7f3ee" }} /></div>
                </div>
              ) : (
                <>
                  <p className={s.small}><UiText>No account needed.</UiText> <Link href={loginUrlFor(`/fundraisers/${id}/donate`)}><UiText>Log in</UiText></Link> <UiText>if you have one.</UiText></p>
                  <div className={s.grid2}>
                    <div><label className={s.lbl} htmlFor="n"><UiText>Full name</UiText></label><input id="n" className={s.in} value={guestName} maxLength={150} autoComplete="name" aria-invalid={detailsTried && nameInvalid ? true : undefined} onChange={(e) => setGuestName(e.target.value)} />
                      {detailsTried && nameInvalid && <p role="alert" className={s.errText}><Icon name="alert" /><UiText>Enter your full name.</UiText></p>}</div>
                    <div><label className={s.lbl} htmlFor="e"><UiText>Email</UiText></label><input id="e" className={s.in} type="email" value={guestEmail} maxLength={320} autoComplete="email" aria-invalid={detailsTried && emailInvalid ? true : undefined} onChange={(e) => setGuestEmail(e.target.value)} />
                      {detailsTried && emailInvalid && <p role="alert" className={s.errText}><Icon name="alert" /><UiText>Enter a valid email address.</UiText></p>}</div>
                    <div><label className={s.lbl} htmlFor="ph"><UiText>Phone</UiText> <span className={s.muted} style={{ fontWeight: 500 }}><UiText>(optional)</UiText></span></label><input id="ph" className={s.in} type="tel" value={guestPhone} maxLength={30} autoComplete="tel" onChange={(e) => setGuestPhone(e.target.value)} /></div>
                  </div>
                </>
              )}
              <p className={`${s.small} ${s.muted}`}><UiText>We&apos;ll send your donation certificate here.</UiText></p>
              {offer80G && (
                <section className={s.card} aria-labelledby="t80" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                  <h2 id="t80" style={{ fontSize: 17, fontWeight: 700 }}><UiText>80G tax receipt</UiText> <span className={s.muted} style={{ fontWeight: 500 }}><UiText>(optional)</UiText></span></h2>
                  <p className={s.small}><strong><UiText>You&apos;ll get an 80G tax receipt only if you add a photo of your PAN card before paying.</UiText></strong> <UiText>Without it, you still get a donation certificate.</UiText></p>
                  {/* 80G rules shown where the PAN is given (owner, 2026-10-31). Factual only — no deduction promises. */}
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "#fdf6f1", border: "1px solid #ecd9cb" }}>
                    <p className={s.small} style={{ fontWeight: 700, marginBottom: 6 }}><UiText>How the 80G receipt works</UiText></p>
                    <ul className={s.small} style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                      <li>{user ? <UiText>The name on your PAN card must match the name on your CauseKind account.</UiText> : <UiText>The name on your PAN card must match the name you entered above.</UiText>}</li>
                      <li><UiText>The receipt is issued in the PAN holder&apos;s name, for the amount you donate.</UiText></li>
                      <li><UiText>Sahas Charitable Trust reports your donation, PAN and address to the Income Tax Department (Form 10BD).</UiText></li>
                      <li><UiText>After the financial year ends, the Trust sends your Form 10BE certificate, by 31 May.</UiText></li>
                      <li><UiText>You must add your PAN before paying. It can&apos;t be added to a donation later.</UiText></li>
                      <li><UiText>We check that the photo is a PAN card. A card we can&apos;t match is reviewed by our team before the receipt is issued.</UiText></li>
                    </ul>
                  </div>
                  <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <input type="checkbox" checked={want80G} onChange={(e) => setWant80G(e.target.checked)} style={{ width: 20, height: 20, marginTop: 2, accentColor: "#b04a15", flex: "none" }} />
                    <span><UiText>I want an 80G tax receipt</UiText></span>
                  </label>
                  {want80G && (
                    <>
                      {/* Upload card instead of the bare file input (owner, 2026-10-31). */}
                      <div>
                        <span className={s.lbl}><UiText>Photo of your PAN card</UiText></span>
                        <input id="panph" type="file" accept="image/*,application/pdf" style={{ display: "none" }}
                          onChange={(e) => { const f = e.target.files?.[0] ?? null; e.target.value = ""; void choosePanPhoto(f); }} />
                        {!panFile ? (
                          <label htmlFor="panph" style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 20px", border: "2px dashed #d9b9a3", borderRadius: 12, background: "#fffaf6", cursor: "pointer" }}>
                            <svg width="52" height="36" viewBox="0 0 52 36" aria-hidden="true" style={{ flex: "none" }}>
                              <rect x="1" y="1" width="50" height="34" rx="5" fill="#fff" stroke="#b04a15" strokeWidth="2" />
                              <rect x="7" y="9" width="11" height="14" rx="2" fill="#f3dccd" />
                              <rect x="22" y="10" width="22" height="3" rx="1.5" fill="#d9b9a3" /><rect x="22" y="16" width="16" height="3" rx="1.5" fill="#d9b9a3" />
                              <rect x="7" y="27" width="30" height="3" rx="1.5" fill="#b04a15" />
                            </svg>
                            <span style={{ flex: 1 }}>
                              <strong style={{ color: "#7a3410" }}><UiText>Upload a photo or PDF of your PAN card</UiText></strong><br />
                              <span className={`${s.small} ${s.muted}`}><UiText>A photo of the front side, a scan, or your e-PAN PDF. JPG, PNG or PDF. We read the PAN for you.</UiText></span>
                            </span>
                            <span className={`${s.btn} ${s.bp}`} style={{ flex: "none" }}><UiText>Choose photo</UiText></span>
                          </label>
                        ) : null}
                        {!panFile && panTypeError && (
                          <p role="alert" className={s.errText}><Icon name="alert" /><UiText>We can&apos;t use that file. Please choose a JPG, PNG or PDF of your PAN card (on iPhone: Settings → Camera → Formats → Most Compatible).</UiText></p>
                        )}
                        {panFile && (
                          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 12, borderRadius: 12, flexWrap: "wrap",
                            border: `1px solid ${panReading ? "#e4d6ca" : panName ? "#a9d3b8" : "#e8c98a"}`, background: panReading ? "#fff" : panName ? "#f1f8f3" : "#fffbf3" }}>
                            {!panPreview && (
                              <div aria-hidden="true" style={{ width: 96, height: 62, borderRadius: 6, border: "1px solid #e4d6ca", background: "#fff", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#b04a15" }}>PDF</div>
                            )}
                            {panPreview && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={panPreview} alt={ui("Your PAN card photo")} style={{ width: 96, height: 62, objectFit: "cover", borderRadius: 6, border: "1px solid #e4d6ca", flex: "none" }} />
                            )}
                            <div style={{ flex: "1 1 200px", minWidth: 0 }} role="status">
                              {panReading
                                ? <strong><UiText>Checking your card…</UiText></strong>
                                : panName
                                  ? <><strong style={{ color: "#1d5b3a" }}><Icon name="check" /> <UiText>PAN card read</UiText></strong><br /><span className={s.small}><UiText>Name on card:</UiText> <strong>{panName}</strong></span></>
                                  : <><strong style={{ color: "#7a4a00" }}><Icon name="alert" /> {panReadNote ?? ui("We couldn't read the card. Type your PAN below.")}</strong></>}
                            </div>
                            <label htmlFor="panph" className={`${s.btn} ${s.bs}`} style={{ flex: "none", cursor: "pointer" }}><UiText>Change photo</UiText></label>
                          </div>
                        )}
                      </div>
                      <div><label className={s.lbl} htmlFor="pan"><UiText>PAN</UiText></label>
                        <input id="pan" className={s.in} value={pan} maxLength={10} autoComplete="off" onChange={(e) => setPan(e.target.value.toUpperCase())} style={{ textTransform: "uppercase" }} /></div>
                      <div><label className={s.lbl} htmlFor="addr"><UiText>Your address</UiText></label>
                        <textarea id="addr" className={s.in} rows={3} maxLength={500} value={address} onChange={(e) => setAddress(e.target.value)} style={{ resize: "vertical" }} />
                        <p className={`${s.small} ${s.muted}`}><UiText>Printed on the receipt and reported by the Trust to the Income Tax Department.</UiText></p></div>
                      {taxTried && taxProblems.length > 0 && (
                        <ul role="alert" className={s.errText} style={{ margin: 0, paddingLeft: 18 }}>{taxProblems.map((p) => <li key={p}>{p}</li>)}</ul>
                      )}
                    </>
                  )}
                </section>
              )}
              <label style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: 16, border: "2px solid #b04a15", borderRadius: 12, background: "#fdf6f1" }}>
                <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} style={{ width: 22, height: 22, marginTop: 1, accentColor: "#b04a15", flex: "none" }} />
                <span><strong><UiText>Hide my name</UiText></strong><br /><span className={s.small}><UiText>You&apos;ll appear as &ldquo;Anonymous&rdquo; on the fundraiser page and to the organiser. CauseKind staff can still see it, and your payment record is kept.</UiText></span></span>
              </label>
              {/* A blocked Continue must say why next to the button, not only inside the 80G box above (2026-11-02). */}
              {taxTried && taxProblems.length > 0 && (
                <div role="alert" style={{ padding: "12px 14px", borderRadius: 10, background: "#fdf3e1", color: "#4a3000" }} className={s.small}>
                  <strong><UiText>To continue with an 80G receipt:</UiText></strong> {taxProblems.join(" · ")}.{" "}
                  <UiText>Or untick &ldquo;I want an 80G tax receipt&rdquo; to continue without it.</UiText>
                </div>
              )}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}><button type="button" className={`${s.btn} ${s.bs}`} onClick={() => setStep(0)}><UiText>Back</UiText></button><button type="button" className={`${s.btn} ${s.bp}`} onClick={() => {
                setTaxTried(true); setDetailsTried(true);
                if (nameInvalid || emailInvalid) document.getElementById(nameInvalid ? "n" : "e")?.focus();
                else if (taxProblems.length === 0) { setStep(2); window.scrollTo({ top: 0 }); }
                else document.getElementById("t80")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}><UiText>Continue</UiText></button></div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className={s.serif} style={{ fontSize: 32 }}><UiText>Check and pay</UiText></h1>
              <section className={s.card} style={{ padding: "8px 22px" }} aria-label={ui("Summary")}>
                {[
                  ["To", <strong key="t">{d.card.title}</strong>],
                  [ui("Your donation"), formatINR(value)],
                  [t("platformFee", { pct: d.platformFeePercent }), `− ${formatINR(fee)}`],
                  [ui("Payment provider charges (about)"), `− ${formatINR(gateway)}`],
                  [ui("Reaches the beneficiary (about)"), <strong key="r">{formatINR(Math.max(0, value - fee - gateway))}</strong>],
                  ...(supportValue > 0 ? [[ui("Support to CauseKind (not part of your donation)"), formatINR(supportValue)] as [string, string]] : []),
                  [ui("Shown publicly as"), anonymous ? ui("Anonymous") : (donorName || ui("Your name"))],
                  ...(user ? [] : [[ui("Documents sent to"), donorEmail] as [string, string]]),
                  ...(offer80G ? [[ui("80G receipt"), tax ? `${ui("Yes")} (PAN ${tax.panNumber})` : ui("No — donation certificate only")] as [string, string]] : []),
                ].map(([k, v], i) => (
                  <div key={i} className={s.tabular} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "12px 0", borderTop: i ? "1px solid #efe7de" : 0 }}><span>{k}</span><span style={{ textAlign: "right" }}>{v}</span></div>
                ))}
                <div className={s.tabular} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid #efe7de", fontWeight: 700, fontSize: 18 }}><span><UiText>You pay</UiText></span><span>{formatINR(value + supportValue)}</span></div>
              </section>
              <section className={s.card} style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6, borderColor: "#e8c98a", background: "#fffbf3" }} aria-labelledby="pt">
                <h2 id="pt" style={{ fontSize: 15, fontWeight: 700 }}><UiText>Before you pay</UiText></h2>
                <p className={s.small}><UiText>Your donation is received by</UiText> <strong><UiText>Sahas Charitable Trust</UiText></strong><UiText>, which transfers it to the beneficiary.</UiText></p>
                <p className={s.small}><strong><UiText>Donations are not refundable.</UiText></strong></p>
                {tax
                  ? <p className={s.small}><UiText>You&apos;ll get your 80G receipt and donation certificate by email.</UiText></p>
                  : <p className={s.small}><UiText>You&apos;ll get a donation certificate by email.</UiText>{!offer80G && <> <UiText>80G receipts aren&apos;t available right now.</UiText></>}</p>}
              </section>
              {error && <p role="alert" className={s.errText}><Icon name="alert" />{errorText}</p>}
              {photoFailed && (
                <div role="alert" style={{ padding: "14px 16px", borderRadius: 10, background: "#fdf3e1", color: "#4a3000", display: "flex", flexDirection: "column", gap: 10 }}>
                  <p><strong><UiText>Your PAN photo didn&apos;t upload.</UiText></strong> <UiText>Nothing has been charged. Try again, or pay without an 80G receipt — you can&apos;t add it later.</UiText></p>
                  {photoReason && photoReason !== "The PAN photo didn't upload." && <p className={s.small}><UiText>Reason:</UiText> {photoReason}</p>}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button type="button" className={`${s.btn} ${s.bp}`} onClick={() => void pay()} disabled={busy}><UiText>Try again</UiText></button>
                    <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => void pay(false, true)} disabled={busy}><UiText>Continue without 80G</UiText></button>
                  </div>
                </div>
              )}
              {prior && (
                <div role="status" style={{ padding: "14px 16px", borderRadius: 10, background: "#fdf3e1", color: "#4a3000", display: "flex", flexDirection: "column", gap: 10 }}>
                  {prior.kind === "failed" && <p><strong><UiText>Your last payment for this fundraiser didn&apos;t go through.</UiText></strong> <UiText>You weren&apos;t charged for it.</UiText></p>}
                  {prior.kind === "unknown" && <p><strong><UiText>We couldn&apos;t find the status of your earlier payment.</UiText></strong> <UiText>If you were charged, it will still be confirmed — check your donations before paying again.</UiText></p>}
                  {prior.kind === "lookupFailed" && <p><strong><UiText>We couldn&apos;t check your earlier payment just now.</UiText></strong> <UiText>Try again in a moment — please don&apos;t pay twice.</UiText></p>}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {prior.kind === "lookupFailed"
                      ? <button type="button" className={`${s.btn} ${s.bp}`} onClick={() => void pay()} disabled={busy}><UiText>Try again</UiText></button>
                      : <button type="button" className={`${s.btn} ${s.bp}`} onClick={() => void pay(true)} disabled={busy}><UiText>Start a new payment</UiText></button>}
                    <Link href={`/fundraisers/donations/${prior.donationId}`} className={`${s.btn} ${s.bs}`}><UiText>See the earlier payment</UiText></Link>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => setStep(1)}><UiText>Back</UiText></button>
                <button type="button" className={`${s.btn} ${s.bp}`} onClick={() => void pay()} disabled={busy || prior !== null || photoFailed}>{busy ? ui("Opening checkout…") : t("payAmount", { amount: formatINR(value + supportValue) })}</button>
              </div>
            </>
          )}
        </div>

        <aside className={s.card} style={{ overflow: "hidden" }} aria-label={ui("You are donating to")}>
          {d.card.coverUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={d.card.coverUrl} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover" }} />
            : <div style={{ aspectRatio: "16 / 9", background: "#e4dbd0" }} />}
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
            <p className={`${s.small} ${s.muted}`}><UiText>You&apos;re donating to</UiText></p>
            <strong>{d.card.title}</strong>
            {d.card.organiser && <p className={`${s.small} ${s.muted}`}>{t("organisedBy", { organiser: d.card.organiser })}{d.card.location ? ` · ${d.card.location}` : ""}</p>}
            <Link href={`/fundraisers/${id}`} className={s.small}><UiText>Back to fundraiser</UiText></Link>
          </div>
        </aside>
      </main>
    </div>
  );
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (rzpCtor()) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
