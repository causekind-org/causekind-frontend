"use client";
import { useTranslations } from "next-intl";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "@/components/AppLink";
import { useAuth } from "@/hooks/useAuth";
import { FEATURES } from "@/lib/features";
import { loginUrlFor } from "@/lib/safeRedirect";
import { fundraisers, ApiError, type FundraiserDetail } from "@/lib/api";
import { Icon, formatINR } from "@/features/fundraising/ui";
import s from "@/features/fundraising/fundraising.module.css";

import { UiText, useUiText } from "@/components/UiText";
type RazorpayCtor = new (opts: Record<string, unknown>) => { open: () => void };
const rzpCtor = () => (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;

const EXAMPLES = [500, 1000, 2500, 5000];
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
  | { prior: Prior };

/**
 * Starts or resumes the donation, then asks the server for the payment details (server checkout is idempotent:
 * same order every time). A retry with the same amount and name choice reuses the donation already started.
 * If the server won't check that donation out again, its status decides — never an automatic second donation:
 * paid or still confirming → its result page; failed → an explicit "Start a new payment"; status unknown or
 * unreadable → explained, and a new payment needs an explicit click. {@code fresh} is that explicit click.
 */
async function checkoutReusingDonation(campaignId: number, amount: number, anonymous: boolean, fresh: boolean): Promise<CheckoutResult> {
  const key = pendingKey(campaignId);
  let saved: { donationId: number; amount: number; anonymous: boolean } | null = null;
  try { saved = JSON.parse(sessionStorage.getItem(key) ?? "null"); } catch { /* storage unavailable */ }
  if (!fresh && saved && saved.amount === amount && saved.anonymous === anonymous) {
    try { return { order: await fundraisers.checkout(saved.donationId) }; }
    catch (e) {
      if (!(e instanceof ApiError) || (e.status !== 404 && e.status !== 409)) throw e;
      if (e.status === 404) return { prior: { kind: "unknown", donationId: saved.donationId } };
      try {
        const status = (await fundraisers.checkDonation(saved.donationId)).status;
        if (status === "COMPLETED" || status === "INITIATED") return { redirect: saved.donationId };
        if (status === "FAILED") return { prior: { kind: "failed", donationId: saved.donationId } };
        return { prior: { kind: "unknown", donationId: saved.donationId } };
      } catch (inner) {
        if (inner instanceof ApiError && inner.status === 404) return { prior: { kind: "unknown", donationId: saved.donationId } };
        return { prior: { kind: "lookupFailed", donationId: saved.donationId } };
      }
    }
  }
  const started = await fundraisers.donate(campaignId, amount, anonymous);
  try { sessionStorage.setItem(key, JSON.stringify({ donationId: started.donationId, amount, anonymous })); } catch { /* fine */ }
  return { order: await fundraisers.checkout(started.donationId) };
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prior, setPrior] = useState<Prior | null>(null);
  // Fallback errors are stored as markers and translated here, at render; server messages show as sent.
  const errorText = error === ERR_UNAVAILABLE ? ui("This fundraiser isn't available.")
    : error === ERR_OPEN ? ui("We couldn't open payment right now. Nothing was charged. Try again in a moment.")
    : error === ERR_START ? ui("We couldn't start the payment. Nothing was charged.") : error;

  useEffect(() => { if (FEATURES.fundraising) fundraisers.detail(Number(id)).then(setD).catch(() => setError(ERR_UNAVAILABLE)); }, [id]);
  useEffect(() => {
    if (!isLoading && !isRestoring && !user) router.replace(loginUrlFor(`/fundraisers/${id}/donate`));
  }, [isLoading, isRestoring, user, router, id]);

  if (!FEATURES.fundraising) return null;
  if (!d || !user) return <div className={`${s.root} ${s.publicTheme}`} aria-busy="true">{error && <p role="alert" className={s.errText} style={{ padding: 32 }}>{errorText}</p>}</div>;
  if (!d.acceptingDonations) {
    return <div className={`${s.root} ${s.publicTheme}`}><main className={s.wrap} style={{ paddingTop: 48 }}><p><strong><UiText>This fundraiser isn&apos;t accepting donations right now.</UiText></strong> <UiText>Nothing was charged.</UiText></p><Link href={`/fundraisers/${id}`}><UiText>Back to fundraiser</UiText></Link></main></div>;
  }

  const value = amount ?? (custom.trim() ? Number(custom.replace(/,/g, "")) : NaN);
  const invalid = !Number.isFinite(value) || value < 1;
  const fee = Number.isFinite(value) ? Math.round(value * d.platformFeePercent) / 100 : 0;
  const gateway = Number.isFinite(value) ? Math.round(value * GATEWAY_PERCENT) / 100 : 0;

  async function pay(fresh = false) {
    setBusy(true); setError(null); setPrior(null);
    try {
      const ok = await loadRazorpay();
      const Rzp = rzpCtor();
      if (!ok || !Rzp) { setError(ERR_OPEN); setBusy(false); return; }
      const result = await checkoutReusingDonation(Number(id), value, anonymous, fresh);
      if ("redirect" in result) { router.push(`/fundraisers/donations/${result.redirect}`); return; }
      if ("prior" in result) { setPrior(result.prior); setBusy(false); return; }
      const order = result.order;
      const rzp = new Rzp({
        key: order.razorpayKeyId, amount: order.amountInPaise, currency: order.currency,
        name: "CauseKind", description: d!.card.title ?? "Fundraiser", order_id: order.razorpayOrderId,
        prefill: { email: user!.email, name: user!.fullName },
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
      <main className={s.wrap} style={{ paddingTop: 32, paddingBottom: 64, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(240px,320px)", gap: 32, alignItems: "start", maxWidth: 1080 }}>
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
                  {EXAMPLES.map((v) => (
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
                {tried && invalid && <p id="er" role="alert" className={s.errText}><Icon name="alert" /><UiText>Enter an amount of ₹1 or more.</UiText></p>}
              </div>
              <p className={`${s.small} ${s.muted}`}><UiText>One-time donation in INR.</UiText></p>
              <div><button type="button" className={`${s.btn} ${s.bp}`} onClick={() => { setTried(true); if (!invalid) setStep(1); }}><UiText>Continue</UiText></button></div>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className={s.serif} style={{ fontSize: 32 }}><UiText>Your details</UiText></h1>
              <div className={s.grid2}>
                <div><label className={s.lbl} htmlFor="n"><UiText>Full name</UiText> <span className={`${s.chip} ${s.cM}`}><UiText>From your account</UiText></span></label><input id="n" className={s.in} value={user.fullName ?? ""} readOnly /></div>
                <div><label className={s.lbl} htmlFor="e"><UiText>Email</UiText> <span className={`${s.chip} ${s.cM}`}><UiText>From your account</UiText></span></label><input id="e" className={s.in} value={user.email} readOnly style={{ background: "#f7f3ee" }} /></div>
              </div>
              <p className={`${s.small} ${s.muted}`}><UiText>We&apos;ll send your payment confirmation here. No PAN is needed for fundraiser donations.</UiText></p>
              <label style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: 16, border: "2px solid #b04a15", borderRadius: 12, background: "#fdf6f1" }}>
                <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} style={{ width: 22, height: 22, marginTop: 1, accentColor: "#b04a15", flex: "none" }} />
                <span><strong><UiText>Hide my name</UiText></strong><br /><span className={s.small}><UiText>You&apos;ll appear as &ldquo;Anonymous&rdquo; on the fundraiser page and to the organiser. CauseKind staff can still see it, and your payment record is kept.</UiText></span></span>
              </label>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}><button type="button" className={`${s.btn} ${s.bs}`} onClick={() => setStep(0)}><UiText>Back</UiText></button><button type="button" className={`${s.btn} ${s.bp}`} onClick={() => setStep(2)}><UiText>Continue</UiText></button></div>
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
                  [ui("Shown publicly as"), anonymous ? ui("Anonymous") : (user.fullName ?? ui("Your name"))],
                ].map(([k, v], i) => (
                  <div key={i} className={s.tabular} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "12px 0", borderTop: i ? "1px solid #efe7de" : 0 }}><span>{k}</span><span style={{ textAlign: "right" }}>{v}</span></div>
                ))}
                <div className={s.tabular} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid #efe7de", fontWeight: 700, fontSize: 18 }}><span><UiText>You pay</UiText></span><span>{formatINR(value)}</span></div>
              </section>
              <section className={s.card} style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6, borderColor: "#e8c98a", background: "#fffbf3" }} aria-labelledby="pt">
                <h2 id="pt" style={{ fontSize: 15, fontWeight: 700 }}><UiText>Before you pay</UiText></h2>
                <p className={s.small}><UiText>Your donation is received by</UiText> <strong><UiText>Sahas Charitable Trust</UiText></strong><UiText>, which transfers it to the beneficiary.</UiText></p>
                <p className={s.small}><strong><UiText>Donations are not refundable.</UiText></strong></p>
                <p className={s.small}><UiText>You&apos;ll get a donation certificate by email. Fundraiser donations don&apos;t get an 80G tax receipt yet.</UiText></p>
              </section>
              {error && <p role="alert" className={s.errText}><Icon name="alert" />{errorText}</p>}
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
                <button type="button" className={`${s.btn} ${s.bp}`} onClick={() => void pay()} disabled={busy || prior !== null}>{busy ? ui("Opening checkout…") : t("payAmount", { amount: formatINR(value) })}</button>
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
