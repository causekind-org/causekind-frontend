"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "@/components/AppLink";
import { useAuth } from "@/hooks/useAuth";
import { FEATURES } from "@/lib/features";
import { loginUrlFor } from "@/lib/safeRedirect";
import { fundraisers, ApiError, type FundraiserDetail } from "@/lib/api";
import { Icon, formatINR } from "@/features/fundraising/ui";
import s from "@/features/fundraising/fundraising.module.css";

type RazorpayCtor = new (opts: Record<string, unknown>) => { open: () => void };
const rzpCtor = () => (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;

const EXAMPLES = [500, 1000, 2500, 5000];
/** Razorpay standard rate incl. GST (2% + 18%), shown as an estimate only. */
const GATEWAY_PERCENT = 2.36;

/** F23–F25 — donation amount, details and review, then provider checkout (D4). */
export default function DonatePage() {
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

  useEffect(() => { if (FEATURES.fundraising) fundraisers.detail(Number(id)).then(setD).catch(() => setError("This fundraiser isn't available.")); }, [id]);
  useEffect(() => {
    if (!isLoading && !isRestoring && !user) router.replace(loginUrlFor(`/fundraisers/${id}/donate`));
  }, [isLoading, isRestoring, user, router, id]);

  if (!FEATURES.fundraising) return null;
  if (!d || !user) return <div className={`${s.root} ${s.publicTheme}`} aria-busy="true">{error && <p role="alert" className={s.errText} style={{ padding: 32 }}>{error}</p>}</div>;
  if (!d.acceptingDonations) {
    return <div className={`${s.root} ${s.publicTheme}`}><main className={s.wrap} style={{ paddingTop: 48 }}><p><strong>This fundraiser isn&apos;t accepting donations right now.</strong> Nothing was charged.</p><Link href={`/fundraisers/${id}`}>Back to fundraiser</Link></main></div>;
  }

  const value = amount ?? (custom.trim() ? Number(custom.replace(/,/g, "")) : NaN);
  const invalid = !Number.isFinite(value) || value < 1;
  const fee = Number.isFinite(value) ? Math.round(value * d.platformFeePercent) / 100 : 0;
  const gateway = Number.isFinite(value) ? Math.round(value * GATEWAY_PERCENT) / 100 : 0;

  async function pay() {
    setBusy(true); setError(null);
    try {
      const ok = await loadRazorpay();
      const Rzp = rzpCtor();
      if (!ok || !Rzp) { setError("We couldn't open payment right now. Nothing was charged. Try again in a moment."); setBusy(false); return; }
      const order = await fundraisers.donate(Number(id), value, anonymous);
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
      setError(e instanceof ApiError ? e.message : "We couldn't start the payment. Nothing was charged.");
      setBusy(false);
    }
  }

  const steps = ["Amount", "Your details", "Review"];
  return (
    <div className={`${s.root} ${s.publicTheme}`}>
      <main className={s.wrap} style={{ paddingTop: 32, paddingBottom: 64, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(240px,320px)", gap: 32, alignItems: "start", maxWidth: 1080 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, minWidth: 0 }}>
          <ol aria-label="Donation steps" style={{ listStyle: "none", padding: 0, display: "flex", gap: 6, fontSize: 14, fontWeight: 600, color: "#6b5d52", flexWrap: "wrap" }}>
            {steps.map((label, i) => <li key={label} aria-current={i === step ? "step" : undefined} style={{ color: i === step ? "#7a3410" : undefined }}>{i + 1} {label}{i < step ? " ✓" : ""}{i < steps.length - 1 ? " ·" : ""}</li>)}
          </ol>

          {step === 0 && (
            <>
              <h1 className={s.serif} style={{ fontSize: 32 }}>How much would you like to give?</h1>
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className={`${s.small} ${s.muted}`} style={{ marginBottom: 8 }}>Example amounts</legend>
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
                <label htmlFor="cu" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>Or enter an amount (₹)</label>
                <input id="cu" className={s.in} inputMode="decimal" value={custom} aria-invalid={tried && invalid ? true : undefined} aria-describedby={tried && invalid ? "er" : undefined}
                  onChange={(e) => { setCustom(e.target.value); setAmount(null); }} style={{ fontSize: 20, fontWeight: 700 }} />
                {tried && invalid && <p id="er" role="alert" className={s.errText}><Icon name="alert" />Enter an amount of ₹1 or more.</p>}
              </div>
              <p className={`${s.small} ${s.muted}`}>One-time donation in INR.</p>
              <div><button type="button" className={`${s.btn} ${s.bp}`} onClick={() => { setTried(true); if (!invalid) setStep(1); }}>Continue</button></div>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className={s.serif} style={{ fontSize: 32 }}>Your details</h1>
              <div className={s.grid2}>
                <div><label className={s.lbl} htmlFor="n">Full name <span className={`${s.chip} ${s.cM}`}>From your account</span></label><input id="n" className={s.in} value={user.fullName ?? ""} readOnly /></div>
                <div><label className={s.lbl} htmlFor="e">Email <span className={`${s.chip} ${s.cM}`}>From your account</span></label><input id="e" className={s.in} value={user.email} readOnly style={{ background: "#f7f3ee" }} /></div>
              </div>
              <p className={`${s.small} ${s.muted}`}>We&apos;ll send your payment confirmation here. No PAN is needed for fundraiser donations.</p>
              <label style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: 16, border: "2px solid #b04a15", borderRadius: 12, background: "#fdf6f1" }}>
                <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} style={{ width: 22, height: 22, marginTop: 1, accentColor: "#b04a15", flex: "none" }} />
                <span><strong>Hide my name</strong><br /><span className={s.small}>You&apos;ll appear as &ldquo;Anonymous&rdquo; on the fundraiser page and to the organiser. CauseKind staff can still see it, and your payment record is kept.</span></span>
              </label>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}><button type="button" className={`${s.btn} ${s.bs}`} onClick={() => setStep(0)}>Back</button><button type="button" className={`${s.btn} ${s.bp}`} onClick={() => setStep(2)}>Continue</button></div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className={s.serif} style={{ fontSize: 32 }}>Check and pay</h1>
              <section className={s.card} style={{ padding: "8px 22px" }} aria-label="Summary">
                {[
                  ["To", <strong key="t">{d.card.title}</strong>],
                  ["Your donation", formatINR(value)],
                  [`CauseKind platform fee (${d.platformFeePercent}%)`, `− ${formatINR(fee)}`],
                  ["Payment provider charges (about)", `− ${formatINR(gateway)}`],
                  ["Reaches the beneficiary (about)", <strong key="r">{formatINR(Math.max(0, value - fee - gateway))}</strong>],
                  ["Shown publicly as", anonymous ? "Anonymous" : (user.fullName ?? "Your name")],
                ].map(([k, v], i) => (
                  <div key={i} className={s.tabular} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "12px 0", borderTop: i ? "1px solid #efe7de" : 0 }}><span>{k}</span><span style={{ textAlign: "right" }}>{v}</span></div>
                ))}
                <div className={s.tabular} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid #efe7de", fontWeight: 700, fontSize: 18 }}><span>You pay</span><span>{formatINR(value)}</span></div>
              </section>
              <section className={s.card} style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6, borderColor: "#e8c98a", background: "#fffbf3" }} aria-labelledby="pt">
                <h2 id="pt" style={{ fontSize: 15, fontWeight: 700 }}>Before you pay</h2>
                <p className={s.small}>Your donation is received by <strong>Sahas Charitable Trust</strong>, which transfers it to the beneficiary.</p>
                <p className={s.small}><strong>Donations are not refundable.</strong></p>
                <p className={s.small}>You&apos;ll get a payment confirmation. Fundraiser donations do not get an 80G tax receipt.</p>
              </section>
              {error && <p role="alert" className={s.errText}><Icon name="alert" />{error}</p>}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <button type="button" className={`${s.btn} ${s.bs}`} onClick={() => setStep(1)}>Back</button>
                <button type="button" className={`${s.btn} ${s.bp}`} onClick={pay} disabled={busy}>{busy ? "Opening checkout…" : `Pay ${formatINR(value)}`}</button>
              </div>
            </>
          )}
        </div>

        <aside className={s.card} style={{ overflow: "hidden" }} aria-label="You are donating to">
          {d.card.coverUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={d.card.coverUrl} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover" }} />
            : <div style={{ aspectRatio: "16 / 9", background: "#e4dbd0" }} />}
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
            <p className={`${s.small} ${s.muted}`}>You&apos;re donating to</p>
            <strong>{d.card.title}</strong>
            {d.card.organiser && <p className={`${s.small} ${s.muted}`}>Organised by {d.card.organiser}{d.card.location ? ` · ${d.card.location}` : ""}</p>}
            <Link href={`/fundraisers/${id}`} className={s.small}>Back to fundraiser</Link>
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
