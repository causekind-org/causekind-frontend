'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Lock, ShieldCheck, Heart, Check, Receipt, ArrowRight } from 'lucide-react';
import { initiateTrustDonation } from '@/lib/api';
import { SearchableSelect, type SelectOption } from '@/components/profile/SearchableSelect';
import { getDialCodes } from '@/app/actions/locations';
import { PHONE_LENGTHS, getDialCode } from '@/lib/phone';
import { useAuth } from '@/hooks/useAuth';

/**
 * Loads Razorpay's checkout script on demand.
 */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const PRESET_AMOUNTS = [500, 1000, 2500, 5000];

/**
 * Tip options, in rupees. Zero is a first-class choice rather than something the
 * donor has to hunt for — the platform's whole trust claim is that giving is
 * free, so declining has to be as easy as accepting.
 *
 * <p>Five presets plus a custom cell fit on ONE row, which is the constraint
 * that matters: the section has a ~690px budget so it sits inside one browser
 * window, and a second row of chips would spend 54px of it. Any further option
 * added here has to replace one, not extend the row.
 */
const TIP_OPTIONS = [0, 50, 100, 200, 500];

/**
 * Deliberately the LOWEST non-zero option, not the middle one.
 *
 * <p>When the ladder started at ₹25 this sat in the middle of it; raising the
 * ladder moved it to the bottom, and it was left there on purpose. Pre-selecting
 * a larger tip nudges people into paying more by default, which is the opposite
 * of the "we take nothing from your donation" claim two lines above it. Raising
 * this is a revenue decision for Sushil to make explicitly, not a side effect of
 * changing the ladder.
 */
const DEFAULT_TIP = 50;

const money = (n: number) => (n || 0).toLocaleString('en-IN');

/** One numbered step heading. */
function StepLabel({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-full border border-amber-300/70 bg-amber-100 text-[11px] font-black text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/70 dark:text-amber-300">
        {n}
      </span>
      <span className="text-sm font-bold text-foreground">{title}</span>
      {hint && <span className="text-xs font-semibold text-stone-400 dark:text-stone-500">{hint}</span>}
    </div>
  );
}

export function MoneyDonationForm() {
  const router = useRouter();
  // A signed-in donor is never asked for their email, because the backend
  // ignores anything typed: initiateTrustDonation overwrites donorEmail with the
  // account's, so that a signed-in user cannot file a donation — and an 80G
  // receipt — under someone else's identity. Asking for a value and then
  // discarding it is worse than not asking.
  //
  // Guests keep the field. They have no account, so the address they type is the
  // only way their receipt can reach them.
  const { user } = useAuth();
  const donorEmail = user?.email ?? '';

  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState<number | ''>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [presetTip, setPresetTip] = useState<number>(DEFAULT_TIP);
  const [customTip, setCustomTip] = useState<string>('');
  const [isCustomTip, setIsCustomTip] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    panNumber: '',
    address: '',
  });

  // Dial code, same plumbing the registration form uses: the option list comes
  // from the `getDialCodes` server action (country-state-city data, no network)
  // and the per-country digit count from PHONE_LENGTHS, so a number entered here
  // is bounded exactly as it is at sign-up rather than by a second set of rules.
  const [dialCodes, setDialCodes] = useState<(SelectOption & { phonecode?: string })[]>([]);
  const [dialCountry, setDialCountry] = useState('IN');

  useEffect(() => {
    let alive = true;
    getDialCodes()
      .then((codes) => { if (alive) setDialCodes(codes); })
      // A failure here must not block a donation: the field still accepts a
      // number, it just loses the country prefix.
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const maxPhoneLength = PHONE_LENGTHS[dialCountry] ?? 15;

  // What actually reaches Sahas. The tip is deliberately NOT part of this —
  // see the payload comment in api.ts and Donation.platformTip on the backend:
  // the 80G receipt is issued against this number alone.
  const donation = isCustom ? (parseInt(customAmount, 10) || 0) : (amount || 0);
  const tip = isCustomTip ? (parseInt(customTip, 10) || 0) : presetTip;
  const total = donation + tip;

  const handleAmountClick = (value: number) => {
    setAmount(value);
    setIsCustom(false);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setCustomAmount(val);
    setIsCustom(true);
    setAmount('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!donation || donation < 1) {
      toast.error('Please select or enter a valid donation amount.');
      return;
    }
    if (!formData.fullName) {
      toast.error('Please enter your name.');
      return;
    }
    if (!user && !formData.email) {
      toast.error('Please enter your email so we can send your receipt.');
      return;
    }
    // Required since 2026-09-18. The trust reports every donor's PAN in Form
    // 10BD, so a donation taken without one cannot be included in that return.
    // The same rule is enforced on the DTO — this check only saves a round trip.
    if (!formData.panNumber) {
      toast.error('Please enter your PAN — it is required for your 80G receipt.');
      return;
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(formData.panNumber)) {
      toast.error('PAN must be five letters, four digits and one letter, e.g. ABCDE1234F.');
      return;
    }

    setSubmitting(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Could not load Razorpay. Check your connection and try again.');
        return;
      }

      // The dial code lives outside the text field, so recombine it here — the
      // backend stores one `donorPhone` string and the receipt needs the country.
      const dial = getDialCode(dialCountry, dialCodes);
      const fullPhone = formData.mobileNumber
        ? `${dial}${formData.mobileNumber}`
        : '';

      const order = await initiateTrustDonation({
        amount: donation,
        tipAmount: tip,
        fullName: formData.fullName,
        // The DTO requires a non-blank, well-formed address, so a signed-in
        // donor sends their account's rather than an empty string. The backend
        // overwrites it with the same value, making this consistent rather than
        // load-bearing — but omitting it would fail validation before it got there.
        email: donorEmail || formData.email,
        mobileNumber: fullPhone || undefined,
        // Sent as-is, never coerced to undefined: it is validated non-blank just
        // above, and the DTO now rejects a missing one.
        panNumber: formData.panNumber,
        address: formData.address.trim() || undefined,
      });

      const rzp = new window.Razorpay({
        key: order.razorpayKeyId,
        // The gateway charges donation + tip; the backend computed this and is
        // the authority on it. Never recompute the paise here.
        amount: order.amountInPaise,
        currency: order.currency,
        name: 'CauseKind',
        description: tip > 0
          ? 'Donation to Sahas Charitable Trust + CauseKind support'
          : 'Donation to Sahas Charitable Trust',
        order_id: order.razorpayOrderId,
        prefill: {
          name: formData.fullName,
          email: donorEmail || formData.email,
          // Razorpay wants the dialled form too, not the bare national number.
          contact: fullPhone || undefined,
        },
        theme: { color: '#ea580c' },
        handler: () => {
          // The donation, not the total: this is what the thank-you page and the
          // 80G receipt are about.
          // First name only. The thank-you page greets the donor by it, and a
          // full name in a URL lingers in browser history and referrer headers
          // for no gain. The email is never put in the URL at all.
          const firstName = formData.fullName.trim().split(/\s+/)[0] ?? '';
          router.push(
            `/thank-you?campaign=${encodeURIComponent('Sahas Charitable Trust')}` +
              `&amount=${encodeURIComponent(String(donation))}` +
              (firstName ? `&name=${encodeURIComponent(firstName)}` : '')
          );
        },
        modal: { ondismiss: () => toast.info('Payment cancelled. Nothing was charged.') },
      });
      rzp.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClasses =
    'w-full px-3.5 py-2 rounded-lg border border-amber-200/80 dark:border-amber-800/60 bg-[#fffdfa] dark:bg-[#221008] text-foreground placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 outline-none transition-colors text-sm shadow-xs';

  const chipClasses = (selected: boolean) =>
    `py-3 px-3 rounded-xl text-sm font-bold tabular-nums transition-all border cursor-pointer ${
      selected
        ? 'border-amber-500 bg-gradient-to-r from-[#ea580c] via-[#d97706] to-[#ea580c] text-white shadow-[0_0_20px_rgba(234,88,12,0.35)] ring-2 ring-amber-400/40'
        : 'border-amber-200/80 dark:border-amber-800/60 text-stone-800 dark:text-amber-100 hover:border-amber-400 hover:bg-amber-50/60 dark:hover:bg-amber-950/40 bg-[#fffefb] dark:bg-[#25130b]'
    }`;

  const trustPill =
    'flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#fffdfa] dark:bg-[#23120a] border border-amber-200/80 dark:border-amber-800/50 shadow-[0_2px_10px_rgba(217,119,6,0.06)]';

  return (
    <section
      id="donate-form"
      // Sized to sit inside one browser window rather than overflow it: the
      // sticky nav takes ~113px, so the section has to come in around 690px on a
      // 800px viewport. Every padding, gap and type size below is set with that
      // budget in mind — see the two structural savings in step 1 and step 2.
      className="scroll-mt-24 py-6 bg-[#fff9f2] dark:bg-[#1a0b04]"
    >
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[78rem] flex-col gap-3">

          {/* ── Header row ───────────────────────────────────────────────────
              The two trust claims used to sit in a tall box in a left-hand
              column, far from the button they were meant to reassure. They are
              compact pills up here now, and the one that matters most is
              restated inside the receipt, next to the CTA. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
          >
            <div className="flex max-w-3xl flex-col gap-2">
              <div className="inline-flex w-max items-center gap-2.5 rounded-full border border-amber-300/60 bg-amber-100/90 py-1 pl-2.5 pr-3.5 text-[11px] font-bold uppercase tracking-wider text-amber-900 shadow-[0_0_12px_rgba(217,119,6,0.15)] dark:border-amber-700/50 dark:bg-amber-950/60 dark:text-amber-200">
                <Image
                  src="/images/money-donation/sahas-logo-transparent.png"
                  alt=""
                  width={20}
                  height={20}
                  className="object-contain"
                />
                Make a Contribution
              </div>
              <h2 className="text-[28px] font-extrabold leading-[1.1] tracking-tight text-foreground text-pretty sm:text-[34px]">
                Empower communities with your generosity.
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                Goes directly toward education, healthcare and community welfare run by Sahas
                Charitable Trust.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 lg:pb-1">
              <div className={trustPill}>
                <ShieldCheck className="size-4 shrink-0 text-amber-700 dark:text-amber-400" />
                <span className="text-[13px] font-bold text-foreground">
                  Registered non-profit &middot; 80G eligible
                </span>
              </div>
              <div className={trustPill}>
                <Heart className="size-4 shrink-0 text-amber-700 dark:text-amber-400" />
                <span className="text-[13px] font-bold text-foreground">
                  Zero platform fees &middot; funded by supporters
                </span>
              </div>
            </div>
          </motion.div>

          {/* ── The contribution console ─────────────────────────────────────
              One card: the three choices on the left, a live receipt on the
              right. The <form> is the grid itself, because the fields and the
              submit button live in different columns. */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, type: 'spring', bounce: 0.28 }}
          >
            <form
              onSubmit={handleSubmit}
              // No `overflow-hidden` here, deliberately: it would clip the
              // rounded corners neatly but it also breaks `position: sticky` on
              // everything inside, and the receipt needs to stick. The corners
              // are rounded on the panels themselves instead.
              className="grid grid-cols-1 rounded-3xl border border-amber-200/80 bg-[#fffdfa] shadow-[0_8px_35px_rgba(217,119,6,0.12)] dark:border-amber-800/50 dark:bg-[#23120a] lg:grid-cols-[1.5fr_1fr]"
            >
              {/* LEFT — the choices */}
              <div className="flex flex-col gap-4 p-5 sm:p-6">

                {/* Step 1 — amount.
                    The Custom control shares the preset row as a fifth cell and
                    SWAPS IN PLACE into an input when chosen, rather than sitting
                    on a second row with a permanently-visible field. That is one
                    whole 44px row plus its gap saved, and the block never changes
                    height when the donor switches to a custom amount. */}
                <div className="flex flex-col gap-3">
                  <StepLabel n={1} title="Choose your donation" hint="to Sahas Charitable Trust" />

                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                    {PRESET_AMOUNTS.map((amt) => (
                      <motion.button
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        key={amt}
                        type="button"
                        aria-pressed={!isCustom && amount === amt}
                        onClick={() => handleAmountClick(amt)}
                        className={chipClasses(!isCustom && amount === amt)}
                      >
                        ₹{money(amt)}
                      </motion.button>
                    ))}

                    {isCustom ? (
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-700 dark:text-amber-300">
                          ₹
                        </span>
                        <label htmlFor="customAmount" className="sr-only">
                          Custom donation amount in rupees
                        </label>
                        <input
                          id="customAmount"
                          type="text"
                          inputMode="numeric"
                          autoFocus
                          value={customAmount}
                          onChange={handleCustomAmountChange}
                          placeholder="Amount"
                          className="h-11 w-full rounded-xl border border-amber-500 bg-[#fffdfa] pl-6 pr-2 text-sm font-bold tabular-nums text-foreground shadow-xs outline-none ring-2 ring-amber-400/40 placeholder:font-semibold placeholder:text-stone-400 dark:bg-[#221008] dark:placeholder:text-stone-500"
                        />
                      </div>
                    ) : (
                      <motion.button
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        aria-pressed={false}
                        onClick={() => {
                          setIsCustom(true);
                          setAmount('');
                        }}
                        className={chipClasses(false)}
                      >
                        Custom
                      </motion.button>
                    )}
                  </div>
                </div>

                <hr className="border-amber-200/60 dark:border-amber-900/40" />

                {/* Step 2 — the tip.
                    Placed here, between the amount and the details, rather than
                    beside the total. A charge that appears at the end of a form
                    reads as a surprise fee however it is worded. */}
                <div className="flex flex-col gap-3">
                  <StepLabel n={2} title="Support the platform" hint="optional" />
                  {/* One line, not a paragraph. The reason to tip still has to be
                      stated — it is the whole ask — but at three lines it cost
                      more vertical space than the chips it was introducing. */}
                  <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                    We take nothing from your donation — this is what keeps CauseKind running.
                  </p>
                  {/* Same shape as step 1: the custom control is the last cell
                      of the SAME row and swaps in place, so adding it costs no
                      height and the block does not jump when it is chosen. */}
                  <div
                    role="group"
                    aria-label="Support for CauseKind"
                    className="grid grid-cols-3 gap-2.5 sm:grid-cols-6"
                  >
                    {TIP_OPTIONS.map((t) => (
                      <motion.button
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        key={t}
                        type="button"
                        aria-pressed={!isCustomTip && presetTip === t}
                        onClick={() => {
                          setPresetTip(t);
                          setIsCustomTip(false);
                          setCustomTip('');
                        }}
                        className={`${chipClasses(!isCustomTip && presetTip === t)} px-1.5`}
                      >
                        {t === 0 ? 'No thanks' : `₹${money(t)}`}
                      </motion.button>
                    ))}

                    {isCustomTip ? (
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-700 dark:text-amber-300">
                          ₹
                        </span>
                        <label htmlFor="customTip" className="sr-only">
                          Custom support for CauseKind, in rupees
                        </label>
                        <input
                          id="customTip"
                          type="text"
                          inputMode="numeric"
                          autoFocus
                          value={customTip}
                          onChange={(e) => {
                            setCustomTip(e.target.value.replace(/[^0-9]/g, ''));
                            setIsCustomTip(true);
                          }}
                          placeholder="Any"
                          className="h-11 w-full rounded-xl border border-amber-500 bg-[#fffdfa] pl-5 pr-1.5 text-sm font-bold tabular-nums text-foreground shadow-xs outline-none ring-2 ring-amber-400/40 placeholder:font-semibold placeholder:text-stone-400 dark:bg-[#221008] dark:placeholder:text-stone-500"
                        />
                      </div>
                    ) : (
                      <motion.button
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        aria-pressed={false}
                        onClick={() => setIsCustomTip(true)}
                        className={`${chipClasses(false)} px-1.5`}
                      >
                        Custom
                      </motion.button>
                    )}
                  </div>
                </div>

                <hr className="border-amber-200/60 dark:border-amber-900/40" />

                {/* Step 3 — details */}
                <div className="flex flex-col gap-3">
                  <StepLabel n={3} title="Your details" />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="fullName" className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
                        Full name
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        required
                        value={formData.fullName}
                        onChange={handleChange}
                        className={inputClasses}
                        placeholder="Enter your full name"
                      />
                    </div>
                    {/* Guests only — see the useAuth comment at the top of the
                        component for why a signed-in donor is never asked. */}
                    {!user && (
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="email" className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
                          Email address
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className={inputClasses}
                          placeholder="Enter your email address"
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="mobileNumber" className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
                        Mobile number
                      </label>
                      {/* `min-w-0` on the input is load-bearing, same reason the
                          registration form carries it: a flex item defaults to
                          min-width:auto and an <input> has an implicit size=20,
                          so flex-1 can grow it but never shrink it, and the row
                          overflows its column. */}
                      <div className="flex gap-2">
                        <div className="ck-dial w-[84px] shrink-0">
                          <SearchableSelect
                            options={dialCodes}
                            value={dialCountry}
                            onChange={setDialCountry}
                            placeholder="+–"
                            searchPlaceholder="Search country"
                            renderSelectedLabel={(opt) => getDialCode(opt.value, dialCodes)}
                          />
                        </div>
                        <input
                          type="tel"
                          inputMode="numeric"
                          id="mobileNumber"
                          name="mobileNumber"
                          required
                          value={formData.mobileNumber}
                          maxLength={maxPhoneLength}
                          autoComplete="tel"
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              // Digits only, bounded by the selected country's
                              // national-number length — the dial code is held
                              // separately and prepended at submit.
                              mobileNumber: e.target.value.replace(/\D/g, '').slice(0, maxPhoneLength),
                            })
                          }
                          className={`${inputClasses} flex-1 min-w-0`}
                          placeholder="Enter your mobile number"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="panNumber" className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
                        PAN{' '}
                        <span className="font-semibold text-stone-400 dark:text-stone-500">
                          · required for your 80G receipt
                        </span>
                      </label>
                      <input
                        type="text"
                        id="panNumber"
                        name="panNumber"
                        required
                        value={formData.panNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })
                        }
                        className={inputClasses}
                        placeholder="Enter your 10-character PAN"
                        maxLength={10}
                      />
                    </div>
                    {/* Spans both columns so it costs exactly one grid row.
                        Deliberately NOT required and deliberately a single line:
                        this sits on the last screen before a payment, and an 80G
                        receipt is valid without an address — refusing a donation
                        over a blank box would trade money for a tidier document. */}
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <label htmlFor="address" className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
                        Address{' '}
                        <span className="font-semibold text-stone-400 dark:text-stone-500">
                          · optional, printed on the receipt
                        </span>
                      </label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className={inputClasses}
                        placeholder="Enter your address — flat, street, city, PIN"
                        maxLength={300}
                        autoComplete="street-address"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT — the receipt.
                  Donation and tip stay on separate lines so "all of it reaches
                  Sahas" is literally true and visible at the moment of paying.
                  The dashed edge is the tear line of a paper receipt. */}
              <div className="rounded-b-3xl border-t-2 border-dashed border-amber-600/30 bg-amber-50/90 p-5 dark:border-amber-700/40 dark:bg-amber-950/40 sm:p-6 lg:rounded-bl-none lg:rounded-r-3xl lg:border-l-2 lg:border-t-0">
                {/* Sticky so the running total stays in view while the donor
                    works down the form — which is also why the CTA no longer
                    needs a spacer pinning it to the bottom of a much taller
                    column, where it left an obvious dead gap. */}
                <div className="flex flex-col gap-4 lg:sticky lg:top-24">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-black uppercase tracking-[0.1em] text-amber-800 dark:text-amber-300">
                    Your contribution
                  </span>
                  <Receipt className="size-[18px] text-amber-600 dark:text-amber-400" aria-hidden="true" />
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] font-semibold text-stone-600 dark:text-stone-300">
                      Donation to Sahas
                    </span>
                    <span className="text-[15px] font-bold tabular-nums text-foreground">
                      ₹{money(donation)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] font-semibold text-stone-600 dark:text-stone-300">
                      Support for CauseKind
                    </span>
                    <span className="text-[15px] font-bold tabular-nums text-foreground">
                      ₹{money(tip)}
                    </span>
                  </div>
                </div>

                <hr className="border-amber-600/25 dark:border-amber-700/40" />

                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-black text-amber-950 dark:text-amber-100">
                    Total today
                  </span>
                  <span className="text-3xl font-extrabold tracking-tight tabular-nums text-amber-700 dark:text-amber-300">
                    ₹{money(total)}
                  </span>
                </div>

                <div className="flex gap-2.5 rounded-xl border border-amber-300/55 bg-[#fffdfa]/90 p-3.5 dark:border-amber-700/50 dark:bg-[#23120a]/80">
                  <Check className="mt-px size-4 shrink-0 text-green-700 dark:text-green-500" aria-hidden="true" />
                  <p className="text-xs leading-relaxed text-stone-700 dark:text-stone-300">
                    All <span className="font-bold tabular-nums text-foreground">₹{money(donation)}</span>{' '}
                    reaches Sahas. CauseKind takes no cut — only the support you choose to add.
                  </p>
                </div>

                <motion.div whileHover={{ scale: 1.015, y: -2 }} whileTap={{ scale: 0.98 }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ea580c] via-[#d97706] to-[#ea580c] px-8 py-3.5 text-[15px] font-extrabold text-white shadow-[0_0_25px_rgba(217,119,6,0.35)] transition-all duration-200 ease-out hover:from-[#c2410c] hover:to-[#b45309] hover:shadow-[0_0_35px_rgba(217,119,6,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      'Opening secure checkout…'
                    ) : (
                      <>
                        Proceed to donate
                        <ArrowRight className="size-[17px]" aria-hidden="true" />
                      </>
                    )}
                  </button>
                </motion.div>

                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                    <Lock className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                    <span>Secure payment · UPI · Cards · Net Banking</span>
                  </div>
                  <p className="text-center text-[11px] leading-snug text-stone-400 dark:text-stone-500">
                    Nothing is charged on this page. You will be taken to a secure payment gateway.
                  </p>
                </div>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
