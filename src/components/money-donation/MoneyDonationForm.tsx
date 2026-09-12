'use client';

import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Lock, ShieldCheck, Heart, Camera, ChevronDown, Search, Upload, CheckCircle, X } from 'lucide-react';
import { initiateTrustDonation } from '@/lib/api';
import { COUNTRIES } from '@/lib/countries';
import { CameraCaptureModal } from './CameraCaptureModal';
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
  const [countryCode, setCountryCode] = useState('+91');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Optional top-up for the trust's own running costs, added onto the donation.
  const supportPresets = [50, 100, 200, 500];
  const [supportAmount, setSupportAmount] = useState<number | ''>('');
  const [isCustomSupport, setIsCustomSupport] = useState(false);
  const [customSupportAmountStr, setCustomSupportAmountStr] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
  });

  /* PAN is collected as a photograph rather than a typed number. Note that
     `initiateTrustDonation` takes only `panNumber?: string` and there is no
     endpoint that accepts a document, so this file is held in state and never
     leaves the browser — restored deliberately to match 3ec5056, and the 80G
     receipt stays unserved until the backend grows an upload. */
  const [panFile, setPanFile] = useState<File | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState({ email: '', mobileNumber: '' });

  const validateEmail = (email: string) => {
    if (!email) return '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address (e.g. name@gmail.com)';
    return '';
  };

  const validatePhone = (phone: string) => {
    if (!phone) return '';
    if (phone.length !== 10) return 'Phone number must be exactly 10 digits';
    return '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPanFile(e.target.files[0]);
    }
  };

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

  const handleSupportClick = (value: number) => {
    // Tapping the selected chip again clears the top-up rather than trapping
    // the donor with no way back to a bare donation.
    if (supportAmount === value && !isCustomSupport) {
      setSupportAmount(0);
    } else {
      setSupportAmount(value);
      setIsCustomSupport(false);
      setCustomSupportAmountStr('');
    }
  };

  const handleCustomSupportClick = () => {
    setIsCustomSupport(true);
    setSupportAmount('');
  };

  const handleCustomSupportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setCustomSupportAmountStr(val);
    setSupportAmount(val ? parseInt(val) : '');
  };

  /* Memoised: the list is 135 entries and the predicate ran twice per render
     in the original (once to map, once to test for the empty state). */
  const filteredCountries = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.includes(searchQuery));
  }, [searchQuery]);

  const actualDonationAmount = Number(amount) || 0;
  const actualSupportAmount = Number(supportAmount) || 0;
  const totalContribution = actualDonationAmount + actualSupportAmount;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === 'email') {
      setErrors(prev => ({ ...prev, email: validateEmail(value) }));
    }
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
    if (formData.mobileNumber && validatePhone(formData.mobileNumber)) {
      toast.error('Phone number must be exactly 10 digits.');
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
        amount: totalContribution,
        fullName: formData.fullName,
        email: formData.email,
        mobileNumber: formData.mobileNumber ? `${countryCode} ${formData.mobileNumber}` : undefined,
        panNumber: undefined, // Will be updated when backend supports file uploads
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
              `&amount=${encodeURIComponent(String(totalContribution))}`
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
      {/* `min-w-0 w-full` guards the same phone overflow the flow-story
          section hit: the `whitespace-nowrap` chips below carry a min-content
          width far wider than a 390px screen, and without the floor removed
          they push this wrapper past the viewport. */}
      <div className="min-w-0 w-full max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
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
            <h2 className="text-2xl sm:text-5xl font-extrabold text-foreground leading-tight mb-3 sm:mb-6">
              Empower communities with your generosity.
            </h2>
            {/* `hidden sm:block`: this names the same three programmes the
                allocation bars name further down the page, and on a phone it is
                one more paragraph between the reader and the amount buttons —
                the only thing this section is actually asking them to do. */}
            <p className="hidden sm:block text-lg text-stone-600 dark:text-stone-300 leading-relaxed mb-10 max-w-lg">
              Your contribution goes directly toward critical initiatives in education, healthcare, and community welfare managed by Sahas Charitable Trust.
            </p>

            {/* Phone: the same two promises as one row of chips. Both
                descriptions restate the trust's registration and the zero-fee
                line, which TrustCredibility carries in full; the headlines are
                the part that has to survive above the form. */}
            <div className="sm:hidden flex gap-2">
              <span className="flex flex-1 items-center gap-2 rounded-xl border border-amber-200/70 bg-[#fffdfa] px-3 py-2.5 shadow-sm dark:border-amber-900/40 dark:bg-[#23120a]">
                <ShieldCheck className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                <span className="text-[0.75rem] font-bold leading-tight text-foreground">100% Secure</span>
              </span>
              <span className="flex flex-1 items-center gap-2 rounded-xl border border-amber-200/70 bg-[#fffdfa] px-3 py-2.5 shadow-sm dark:border-amber-900/40 dark:bg-[#23120a]">
                <Heart className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                <span className="text-[0.75rem] font-bold leading-tight text-foreground">Zero Fees</span>
              </span>
            </div>

            <div className="hidden sm:block bg-[#fffdfa] dark:bg-[#23120a] p-6 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 shadow-sm">
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
                    className={`${inputClasses} ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                    placeholder="jane@example.com"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="mobileNumber" className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">Mobile Number</label>
                  <div className="flex gap-2 relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center justify-between gap-1.5 px-2.5 sm:px-3 py-3 rounded-lg border border-amber-200/80 dark:border-amber-800/60 bg-[#fffdfa] dark:bg-[#221008] text-sm whitespace-nowrap shadow-xs"
                    >
                      <span className="font-medium text-foreground">{countryCode}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    </button>

                    {isDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                        {/* `w-full sm:w-72`: a fixed 18rem panel overhangs the
                            card's right edge on a 390px phone, where the card
                            itself is only about 342px wide inside its padding. */}
                        <div className="absolute top-[110%] left-0 w-full sm:w-72 bg-[#fffdfa] dark:bg-[#23120a] border border-amber-200/80 dark:border-amber-800/60 rounded-xl shadow-xl z-50 p-3 overflow-hidden flex flex-col">
                          <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <input
                              type="text"
                              placeholder="Search country or code..."
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 bg-amber-50/60 dark:bg-[#2b170d] border border-amber-200/80 dark:border-amber-800/60 rounded-lg text-base sm:text-sm outline-none focus:border-amber-500 text-foreground"
                            />
                          </div>
                          <div className="max-h-60 overflow-y-auto scrollbar-hide pr-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {filteredCountries.map(c => (
                              <button
                                type="button"
                                key={c.iso}
                                onClick={() => { setCountryCode(c.code); setIsDropdownOpen(false); setSearchQuery(''); }}
                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg flex justify-between items-center transition-colors"
                              >
                                <span className="text-foreground truncate pr-2">{c.name}</span>
                                <span className="text-stone-500 dark:text-stone-400 font-medium flex-shrink-0">{c.code}</span>
                              </button>
                            ))}
                            {filteredCountries.length === 0 && (
                              <p className="text-sm text-stone-500 text-center py-4">No countries found</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    <div className="min-w-0 flex-1">
                      <input
                        type="tel"
                        inputMode="numeric"
                        id="mobileNumber"
                        name="mobileNumber"
                        required
                        value={formData.mobileNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          if (val.length <= 10) {
                            setFormData({ ...formData, mobileNumber: val });
                            setErrors(prev => ({ ...prev, mobileNumber: validatePhone(val) }));
                          }
                        }}
                        className={`${inputClasses} ${errors.mobileNumber ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                        placeholder="98765 43210"
                      />
                    </div>
                  </div>
                  {errors.mobileNumber && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.mobileNumber}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">PAN Card (For 80G Tax Receipt)</label>
                  {!panFile ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input type="file" accept="image/*,.pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />

                      <button
                        type="button"
                        onClick={() => setIsCameraOpen(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-amber-400/70 dark:border-amber-600/50 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100/70 dark:hover:bg-amber-950/50 transition-colors text-sm font-semibold"
                      >
                        <Camera className="w-4 h-4" />
                        Scan Document
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-amber-300/70 dark:border-amber-800/60 bg-[#fffefb] dark:bg-[#25130b] text-stone-700 dark:text-stone-300 hover:bg-amber-50/60 dark:hover:bg-amber-950/30 transition-colors text-sm font-semibold"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Photo
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <CheckCircle className="w-5 h-5 flex-shrink-0 text-green-500" />
                        <span className="text-sm font-medium truncate">{panFile.name}</span>
                      </div>
                      <button type="button" onClick={() => setPanFile(null)} className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition-colors text-green-600 dark:text-green-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Support Sahas Option */}
              <div className="pt-2">
                <hr className="border-amber-200/60 dark:border-amber-900/40 mb-6" />
                <div className="mb-3">
                  <h3 className="text-base font-bold text-foreground">Support Sahas Charitable Trust <span className="text-stone-400 dark:text-stone-500 font-normal text-sm ml-1">(Optional)</span></h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Help us continue our charitable work.</p>
                </div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-2">Choose support amount</label>
                {/* `grid-cols-3 sm:grid-cols-5`: five chips across a 390px
                    phone leaves each about 55px, which "Custom" cannot sit in
                    without wrapping mid-word. */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                  {supportPresets.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleSupportClick(amt)}
                      className={`py-2 px-1 rounded-lg text-xs font-bold transition-colors border cursor-pointer ${!isCustomSupport && supportAmount === amt
                          ? 'border-amber-500 bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200'
                          : 'border-amber-200/80 dark:border-amber-800/60 text-stone-600 dark:text-stone-300 hover:border-amber-400 bg-[#fffefb] dark:bg-[#25130b]'
                        }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleCustomSupportClick}
                    className={`py-2 px-1 rounded-lg text-xs font-bold transition-colors border cursor-pointer ${isCustomSupport
                        ? 'border-amber-500 bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200'
                        : 'border-amber-200/80 dark:border-amber-800/60 text-stone-600 dark:text-stone-300 hover:border-amber-400 bg-[#fffefb] dark:bg-[#25130b]'
                      }`}
                  >
                    Custom
                  </button>
                </div>

                {isCustomSupport && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="relative mt-2"
                  >
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-700 dark:text-amber-300 text-sm font-bold">₹</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={customSupportAmountStr}
                      onChange={handleCustomSupportChange}
                      placeholder="Enter amount"
                      className="w-full pl-7 pr-3 py-2 rounded-lg border border-amber-200/80 dark:border-amber-800/60 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 outline-none text-base sm:text-sm bg-[#fffdfa] dark:bg-[#221008] text-foreground transition-all shadow-inner"
                    />
                  </motion.div>
                )}
              </div>

              {/* Summary & Submit */}
              <div className="pt-4">
                <div className="mb-6 text-sm bg-amber-50/90 dark:bg-amber-950/50 p-4 rounded-xl border border-amber-300/60 dark:border-amber-700/50 shadow-xs flex flex-col gap-2">
                  <div className="flex justify-between items-center text-stone-600 dark:text-stone-300">
                    <span>Donation</span>
                    <span className="font-semibold">₹{actualDonationAmount.toLocaleString()}</span>
                  </div>
                  {actualSupportAmount > 0 && (
                    <>
                      <div className="flex justify-between items-center text-stone-600 dark:text-stone-300">
                        <span>Support Sahas</span>
                        <span className="font-semibold">₹{actualSupportAmount.toLocaleString()}</span>
                      </div>
                      <hr className="border-amber-300/50 dark:border-amber-800/50 my-1" />
                    </>
                  )}
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-amber-950 dark:text-amber-100 font-semibold">Total Contribution</span>
                    <span className="text-xl font-extrabold text-amber-700 dark:text-amber-300">
                      ₹{totalContribution.toLocaleString()}
                    </span>
                  </div>
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

            <CameraCaptureModal
              isOpen={isCameraOpen}
              onClose={() => setIsCameraOpen(false)}
              onCapture={(file) => setPanFile(file)}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

