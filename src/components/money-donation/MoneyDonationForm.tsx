'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Lock, ShieldCheck, Heart } from 'lucide-react';
import { initiateTrustDonation } from '@/lib/api';
import { DiyaIcon } from '@/components/home/GanpatiVisuals';

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

export function MoneyDonationForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const predefinedAmounts = [500, 1000, 2500, 5000];
  const [amount, setAmount] = useState<number | ''>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    panNumber: '',
  });

  const handleAmountClick = (value: number) => {
    setAmount(value);
    setIsCustom(false);
    setCustomAmount('');
  };

  const handleCustomAmountClick = () => {
    setIsCustom(true);
    setAmount('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setCustomAmount(val);
    setAmount(val ? parseInt(val) : '');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || amount < 1) {
      toast.error('Please select or enter a valid donation amount.');
      return;
    }
    if (!formData.fullName || !formData.email) {
      toast.error('Please fill out your name and email.');
      return;
    }
    if (formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(formData.panNumber)) {
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

      const order = await initiateTrustDonation({
        amount: Number(amount),
        fullName: formData.fullName,
        email: formData.email,
        mobileNumber: formData.mobileNumber || undefined,
        panNumber: formData.panNumber || undefined,
      });

      const rzp = new window.Razorpay({
        key: order.razorpayKeyId,
        amount: order.amountInPaise,
        currency: order.currency,
        name: 'CauseKind',
        description: 'Donation to Sahas Charitable Trust',
        order_id: order.razorpayOrderId,
        prefill: {
          name: formData.fullName,
          email: formData.email,
          contact: formData.mobileNumber || undefined,
        },
        theme: { color: '#ea580c' },
        handler: () => {
          router.push(
            `/thank-you?campaign=${encodeURIComponent('Sahas Charitable Trust')}` +
              `&amount=${encodeURIComponent(String(amount))}`
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

  const inputClasses = "w-full px-4 py-3 rounded-lg border border-amber-200/80 dark:border-amber-800/60 bg-[#fffdfa] dark:bg-[#221008] text-foreground placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 outline-none transition-colors text-sm shadow-xs";

  return (
    <section id="donate-form" className="scroll-mt-24 py-10 sm:py-12 lg:py-14 bg-[#fff9f2] dark:bg-[#1a0b04]">
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">

          {/* Left Column: Supporting Visual & Message */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col"
          >
            <div className="inline-flex items-center gap-3 text-xs font-bold tracking-wider uppercase text-amber-900 dark:text-amber-200 mb-4 bg-amber-100/90 dark:bg-amber-950/60 border border-amber-300/60 dark:border-amber-700/50 pr-4 pl-3 py-1.5 rounded-full w-max shadow-[0_0_12px_rgba(217,119,6,0.15)]">
              <Image 
                src="/images/money-donation/sahas-logo-transparent.png"
                alt="Sahas Logo" 
                width={24} 
                height={24}
                className="object-contain"
              />
              Make a Contribution
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-foreground leading-tight mb-6">
              Empower communities with your generosity.
            </h2>
            <p className="text-lg text-stone-600 dark:text-stone-300 leading-relaxed mb-10 max-w-lg">
              Your contribution goes directly toward critical initiatives in education, healthcare, and community welfare managed by Sahas Charitable Trust.
            </p>

            <div className="bg-[#fffdfa] dark:bg-[#23120a] p-6 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950 dark:to-orange-950 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-300 flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">100% Secure & Transparent</h4>
                  <p className="text-sm text-stone-600 dark:text-stone-300 mt-1">Sahas Charitable Trust is a registered non-profit. All donations are secure and properly audited.</p>
                </div>
              </div>
              <hr className="border-amber-200/60 dark:border-amber-900/40 my-4" />
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950 dark:to-orange-950 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-300 flex-shrink-0">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">Zero Platform Fees</h4>
                  <p className="text-sm text-stone-600 dark:text-stone-300 mt-1">CauseKind does not take a cut. Your entire donation supports the charitable programs.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: The Donation Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, type: 'spring', bounce: 0.4 }}
            className="relative bg-[#fffdfa] dark:bg-[#23120a] p-6 sm:p-8 rounded-3xl shadow-[0_8px_35px_rgba(217,119,6,0.12)] border border-amber-200/80 dark:border-amber-800/50"
          >
            {/* Small decorative Diya accent in top corner (pointer-events: none, aria-hidden: true, non-overlapping) */}
            <div className="pointer-events-none absolute top-4 right-5 opacity-80 z-10 select-none" aria-hidden="true">
              <DiyaIcon className="w-6 h-6 text-amber-500 drop-shadow-[0_2px_8px_rgba(234,88,12,0.4)]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Amount Selection */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-3">Select Amount (₹)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  {predefinedAmounts.map((amt) => (
                    <motion.button
                      whileHover={{ y: -2, boxShadow: '0 6px 16px rgba(234,88,12,0.15)' }}
                      whileTap={{ scale: 0.98 }}
                      key={amt}
                      type="button"
                      onClick={() => handleAmountClick(amt)}
                      className={`py-3 px-4 rounded-xl text-sm font-bold transition-all border cursor-pointer ${!isCustom && amount === amt
                          ? 'border-amber-500 bg-gradient-to-r from-[#ea580c] via-[#d97706] to-[#ea580c] text-white shadow-[0_0_20px_rgba(234,88,12,0.35)] ring-2 ring-amber-400/40'
                          : 'border-amber-200/80 dark:border-amber-800/60 text-stone-800 dark:text-amber-100 hover:border-amber-400 hover:bg-amber-50/60 bg-[#fffefb] dark:bg-[#25130b]'
                        }`}
                    >
                      ₹{amt.toLocaleString()}
                    </motion.button>
                  ))}
                  <motion.button
                    whileHover={{ y: -2, boxShadow: '0 6px 16px rgba(234,88,12,0.15)' }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleCustomAmountClick}
                    className={`py-3 px-4 rounded-xl text-sm font-bold transition-all border cursor-pointer sm:col-span-4 ${isCustom
                        ? 'border-amber-500 bg-gradient-to-r from-[#ea580c] via-[#d97706] to-[#ea580c] text-white shadow-[0_0_20px_rgba(234,88,12,0.35)] ring-2 ring-amber-400/40'
                        : 'border-amber-200/80 dark:border-amber-800/60 text-stone-800 dark:text-amber-100 hover:border-amber-400 hover:bg-amber-50/60 bg-[#fffefb] dark:bg-[#25130b]'
                      }`}
                  >
                    Custom Amount
                  </motion.button>
                </div>

                {isCustom && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="relative mt-3"
                  >
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-700 dark:text-amber-300 text-sm font-bold">₹</span>
                    <input
                      type="text"
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                      placeholder="Enter amount"
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-amber-200/80 dark:border-amber-800/60 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 outline-none text-sm bg-[#fffdfa] dark:bg-[#221008] text-foreground transition-all shadow-inner"
                    />
                  </motion.div>
                )}
              </div>

              <hr className="border-amber-200/60 dark:border-amber-900/40" />

              {/* Personal Details */}
              <div className="space-y-4">
                <label className="block text-sm font-bold text-foreground">Your Details</label>
                <div>
                  <label htmlFor="fullName" className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    className={inputClasses}
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={inputClasses}
                    placeholder="jane@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="mobileNumber" className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">Mobile Number</label>
                  <input
                    type="tel"
                    id="mobileNumber"
                    name="mobileNumber"
                    required
                    value={formData.mobileNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9+-\s]/g, '');
                      setFormData({ ...formData, mobileNumber: val });
                    }}
                    className={inputClasses}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label htmlFor="panNumber" className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">PAN Number (For 80G Tax Receipt)</label>
                  <input
                    type="text"
                    id="panNumber"
                    name="panNumber"
                    value={formData.panNumber}
                    onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                    className={inputClasses}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Summary & Submit */}
              <div className="pt-4">
                <div className="flex justify-between items-center mb-6 text-sm bg-amber-50/90 dark:bg-amber-950/50 p-4 rounded-xl border border-amber-300/60 dark:border-amber-700/50 shadow-xs">
                  <span className="text-amber-950 dark:text-amber-100 font-semibold">Total Contribution</span>
                  <span className="text-xl font-extrabold text-amber-700 dark:text-amber-300">
                    ₹{amount ? amount.toLocaleString() : '0'}
                  </span>
                </div>

                <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-[#ea580c] via-[#d97706] to-[#ea580c] hover:from-[#c2410c] hover:to-[#b45309] px-8 py-3.5 text-base font-extrabold text-white shadow-lg shadow-orange-900/30 shadow-[0_0_25px_rgba(217,119,6,0.35)] hover:shadow-[0_0_35px_rgba(217,119,6,0.5)] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? 'Opening secure checkout…' : (
                      <>
                        Proceed to Donate <span className="ml-2">&rarr;</span>
                      </>
                    )}
                  </button>
                </motion.div>

                {/* Secure payment note */}
                <div className="flex items-center justify-center gap-2 mt-6 text-xs font-medium text-stone-500 dark:text-stone-400">
                  <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Secure payment &middot; UPI &middot; Cards &middot; Net Banking</span>
                </div>
                <p className="text-xs text-center text-stone-500 dark:text-stone-400 mt-2">
                  No payment is collected on this page. You will be redirected to a secure payment gateway.
                </p>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

