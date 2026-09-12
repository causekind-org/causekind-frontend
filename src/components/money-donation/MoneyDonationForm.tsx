'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Lock, ShieldCheck, Heart, Camera, ChevronDown, Search, Upload, CheckCircle, X } from 'lucide-react';
import { CameraCaptureModal } from './CameraCaptureModal';
import { initiateTrustDonation } from '@/lib/api';
import { COUNTRIES } from '@/lib/countries';

/**
 * Loads Razorpay's checkout script on demand.
 *
 * Same shape as the one in `DonateButton` rather than a shared helper: the two
 * live in different feature areas and a shared module here would be one import
 * cycle away from pulling the campaign donate flow into this page's bundle.
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
  
  // Support Sahas Section State
  const supportPresets = [50, 100, 200, 500];
  const [supportAmount, setSupportAmount] = useState<number | ''>('');
  const [isCustomSupport, setIsCustomSupport] = useState(false);
  const [customSupportAmountStr, setCustomSupportAmountStr] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
  });

  const [panFile, setPanFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPanFile(e.target.files[0]);
    }
  };
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [errors, setErrors] = useState({
    email: '',
    mobileNumber: '',
  });

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

    setSubmitting(true);
    try {
      // Script first: an order created against a checkout that then fails to
      // load leaves a stranded INITIATED row and a donor with no way to pay it.
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
        theme: { color: '#b04a15' },
        handler: () => {
          // The donation is only COMPLETED when Razorpay's webhook reaches the
          // backend, which is why nothing here marks it paid — this is purely
          // the donor's confirmation that checkout closed successfully.
          // Reuses /thank-you unchanged: it reads `campaign` as a display label
          // and falls back to a generic one when absent, so passing the trust's
          // name here makes the confirmation read correctly with no branch
          // added there for a second kind of donation.
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

  // text-base below sm is deliberate: iOS Safari zooms the viewport when a
  // focused input renders under 16px, which throws the donor out of the form
  // layout mid-entry. Desktop keeps the 14px it has always had.
  const inputClasses = "w-full px-4 py-3 rounded-lg border border-stone-200 dark:border-white/15 bg-white dark:bg-zinc-900 text-foreground placeholder:text-stone-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors text-base sm:text-sm";

  return (
    <section id="donate-form" className="scroll-mt-24 py-8 sm:py-12 lg:py-14 bg-stone-50 dark:bg-zinc-900/60 border-t border-stone-100">
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
            <div className="inline-flex items-center gap-3 text-xs font-bold tracking-wider uppercase text-brand-500 mb-4 bg-brand-50 dark:bg-brand-500/10 pr-4 pl-3 py-1.5 rounded-full w-max border border-brand-100">
              <Image
                src="/images/money-donation/sahas-logo-transparent.png"
                alt="Sahas Logo"
                width={24}
                height={24}
                className="object-contain"
              />
              Make a Contribution
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-tight mb-4 sm:mb-6">
              Empower communities with your generosity.
            </h2>
            <p className="text-base sm:text-lg text-stone-600 dark:text-stone-300 leading-relaxed mb-8 sm:mb-10 max-w-lg">
              Your contribution goes directly toward critical initiatives in education, healthcare, and community welfare managed by Sahas Charitable Trust.
            </p>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl border border-stone-100 dark:border-white/10 shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-600 flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">100% Secure & Transparent</h4>
                  <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Sahas Charitable Trust is a registered non-profit. All donations are secure and properly audited.</p>
                </div>
              </div>
              <hr className="border-stone-100 dark:border-white/10 my-4" />
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 flex-shrink-0">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">Zero Platform Fees</h4>
                  <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">CauseKind does not take a cut. Your entire donation supports the charitable programs.</p>
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
            className="bg-white dark:bg-zinc-900 p-4 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-stone-100"
          >
            <form onSubmit={handleSubmit} className="space-y-6">


              {/* Amount Selection */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">Select Donation Amount (₹)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  {predefinedAmounts.map((amt) => (
                    <motion.button
                      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      whileTap={{ scale: 0.98 }}
                      key={amt}
                      type="button"
                      onClick={() => handleAmountClick(amt)}
                      className={`py-3 px-4 rounded-xl text-sm font-bold transition-colors border cursor-pointer ${!isCustom && amount === amt
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-700'
                        : 'border-stone-200 dark:border-white/15 text-stone-700 dark:text-stone-200 hover:border-brand-200 bg-white'
                        }`}
                    >
                      ₹{amt.toLocaleString()}
                    </motion.button>
                  ))}
                  <motion.button
                    whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleCustomAmountClick}
                    className={`py-3 px-4 rounded-xl text-sm font-bold transition-colors border cursor-pointer sm:col-span-4 ${isCustom
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-700'
                      : 'border-stone-200 dark:border-white/15 text-stone-700 dark:text-stone-200 hover:border-brand-200 bg-white'
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
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 dark:text-stone-400 text-sm font-medium">₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                      placeholder="Enter amount"
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-stone-300 dark:border-white/20 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none text-base sm:text-sm bg-white dark:bg-zinc-900 transition-all shadow-inner"
                    />
                  </motion.div>
                )}
              </div>

              <hr className="border-stone-100 dark:border-white/10" />

              {/* Personal Details */}
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-foreground">Your Details</label>
                <div>
                  <label htmlFor="fullName" className="block text-xs text-stone-500 dark:text-stone-400 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs text-stone-500 dark:text-stone-400 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={`${inputClasses} ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="mobileNumber" className="block text-xs text-stone-500 dark:text-stone-400 mb-1.5">Mobile Number</label>
                  <div className="flex gap-2 relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center justify-between gap-2 px-3 py-3 rounded-lg border border-stone-200 dark:border-white/15 bg-white dark:bg-zinc-900 text-sm whitespace-nowrap min-w-[80px]"
                    >
                      <span className="font-medium text-foreground">{countryCode}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                    </button>

                    {isDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                        <div className="absolute top-[110%] left-0 w-72 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-white/15 rounded-xl shadow-xl z-50 p-3 overflow-hidden flex flex-col">
                          <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                            <input
                              type="text"
                              placeholder="Search country or code..."
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-zinc-800 border border-stone-200 dark:border-white/10 rounded-lg text-base sm:text-sm outline-none focus:border-brand-500"
                            />
                          </div>
                          <div className="max-h-60 overflow-y-auto scrollbar-hide pr-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {COUNTRIES.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.code.includes(searchQuery)).map(c => (
                              <button
                                type="button"
                                key={c.iso}
                                onClick={() => { setCountryCode(c.code); setIsDropdownOpen(false); setSearchQuery(''); }}
                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-stone-50 dark:hover:bg-zinc-800 rounded-lg flex justify-between items-center transition-colors"
                              >
                                <span className="text-foreground truncate pr-2">{c.name}</span>
                                <span className="text-stone-500 font-medium flex-shrink-0">{c.code}</span>
                              </button>
                            ))}
                            {COUNTRIES.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.code.includes(searchQuery)).length === 0 && (
                              <p className="text-sm text-stone-500 text-center py-4">No countries found</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    <div className="w-full">
                      <input
                        type="tel"
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
                        className={`${inputClasses} ${errors.mobileNumber ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                      />
                      {errors.mobileNumber && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.mobileNumber}</p>}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1.5">PAN Card (For 80G Tax Receipt)</label>
                  {!panFile ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input type="file" accept="image/*,.pdf" className="hidden" ref={fileInputRef} onChange={handleFileChange} />

                      <button
                        type="button"
                        onClick={() => setIsCameraOpen(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-brand-300 dark:border-brand-500/30 bg-brand-50/50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/20 transition-colors text-sm font-medium"
                      >
                        <Camera className="w-4 h-4" />
                        Scan Document
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-stone-300 dark:border-white/20 bg-stone-50 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-700 transition-colors text-sm font-medium"
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
                <hr className="border-stone-100 dark:border-white/10 mb-6" />
                <div className="mb-3">
                  <h3 className="text-base font-bold text-foreground">Support Sahas Charitable Trust <span className="text-stone-400 dark:text-stone-500 font-normal text-sm ml-1">(Optional)</span></h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Help us continue our charitable work.</p>
                </div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-2">Choose support amount</label>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {supportPresets.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleSupportClick(amt)}
                      className={`py-2 px-1 rounded-lg text-xs font-bold transition-colors border cursor-pointer ${!isCustomSupport && supportAmount === amt
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-700'
                          : 'border-stone-200 dark:border-white/15 text-stone-600 dark:text-stone-300 hover:border-brand-200 bg-white dark:bg-zinc-800'
                        }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleCustomSupportClick}
                    className={`py-2 px-1 rounded-lg text-xs font-bold transition-colors border cursor-pointer ${isCustomSupport
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-700'
                        : 'border-stone-200 dark:border-white/15 text-stone-600 dark:text-stone-300 hover:border-brand-200 bg-white dark:bg-zinc-800'
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
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 dark:text-stone-400 text-sm font-medium">₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={customSupportAmountStr}
                      onChange={handleCustomSupportChange}
                      placeholder="Enter amount"
                      className="w-full pl-7 pr-3 py-2 rounded-lg border border-stone-300 dark:border-white/20 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none text-base sm:text-sm bg-white dark:bg-zinc-900 transition-all shadow-inner"
                    />
                  </motion.div>
                )}
              </div>

              {/* Summary & Submit */}
              <div className="pt-2">
                <div className="mb-6 text-sm bg-stone-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-stone-100 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-stone-600 dark:text-stone-300">
                    <span>Donation</span>
                    <span className="font-semibold">₹{actualDonationAmount.toLocaleString()}</span>
                  </div>
                  {actualSupportAmount > 0 && (
                    <div className="flex justify-between items-center text-stone-600 dark:text-stone-300">
                      <span>Support Sahas</span>
                      <span className="font-semibold">₹{actualSupportAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {actualSupportAmount > 0 && (
                    <hr className="border-stone-200 dark:border-white/10 my-1" />
                  )}
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-stone-800 dark:text-stone-200 font-bold">Total Contribution</span>
                    <span className="text-xl font-extrabold text-brand-600">
                      ₹{totalContribution.toLocaleString()}
                    </span>
                  </div>
                </div>

                <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full cursor-pointer items-center justify-center rounded-full bg-brand-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-brand-500/20 transition-all duration-200 ease-out hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-brand-500"
                  >
                    {submitting ? 'Opening secure checkout…' : (
                      <>
                        Proceed to Donate <span className="ml-2">&rarr;</span>
                      </>
                    )}
                  </button>
                </motion.div>

                {/* Secure payment note */}
                <div className="flex items-center justify-center gap-2 mt-6 text-xs text-stone-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Secure payment &middot; UPI &middot; Cards &middot; Net Banking</span>
                </div>
                <p className="text-xs text-center text-stone-400 dark:text-stone-500 mt-2">
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
