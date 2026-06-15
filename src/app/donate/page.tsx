"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Heart, Zap, Shield, ChevronRight, ChevronDown, Loader2, RefreshCw } from "lucide-react";
import { getCampaigns, type Campaign } from "@/lib/api";
import { TranslatedText } from "@/hooks/useDynamicTranslation";

const QUICK_AMOUNTS = [500, 1000, 2500, 5000];
const TIP_PCTS = [5, 10, 15] as const;

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", desc: "PhonePe · GPay · Paytm · BHIM" },
  { id: "card", label: "Credit / Debit Card", desc: "Visa · Mastercard · RuPay" },
  { id: "netbanking", label: "Net Banking", desc: "All major banks" },
] as const;

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

// ── Accessible Switch ──────────────────────────────────────────────────────────
function Switch({
  checked,
  onCheckedChange,
  id,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C17A3A] focus-visible:ring-offset-2
        ${checked ? "bg-[#C17A3A]" : "bg-stone-200 dark:bg-zinc-700"}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200
          ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

// ── Campaign Dropdown ──────────────────────────────────────────────────────────
function CampaignDropdown({
  campaigns,
  selected,
  onSelect,
  loading,
  onOpen,
  placeholder,
  loadingText,
  noCampaignsText,
  urgentText,
}: {
  campaigns: Campaign[];
  selected: number | null;
  onSelect: (id: number) => void;
  loading: boolean;
  onOpen: () => void;
  placeholder: string;
  loadingText: string;
  noCampaignsText: string;
  urgentText: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const activeCampaign = campaigns.find((c) => c.id === selected);

  const handleOpen = () => {
    setOpen(true);
    onOpen();
  };

  const handleSelect = (id: number) => {
    onSelect(id);
    setOpen(false);
    buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={open ? () => setOpen(false) : handleOpen}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-orange-100 dark:border-zinc-700 bg-orange-50/40 dark:bg-zinc-800 text-left transition-all duration-150 hover:border-[#C17A3A]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C17A3A] focus-visible:ring-offset-1"
      >
        <div className="min-w-0 flex-1">
          {activeCampaign ? (
            <>
              <p className="text-xs font-bold text-stone-800 dark:text-stone-100 truncate"><TranslatedText text={activeCampaign.title} /></p>
              <p className="text-[10px] text-stone-400 font-medium"><TranslatedText text={activeCampaign.city} /> · <TranslatedText text={activeCampaign.category} /></p>
            </>
          ) : (
            <p className="text-sm font-medium text-stone-400 dark:text-zinc-500">{placeholder}</p>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-stone-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select campaign"
          className="absolute z-50 mt-2 w-full rounded-xl border border-orange-100 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden"
        >
          <div className="max-h-64 overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-stone-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                {loadingText}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-400">{noCampaignsText}</div>
            ) : (
              campaigns.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={selected === c.id}
                  onClick={() => handleSelect(c.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-100
                    ${selected === c.id
                      ? "bg-[#C17A3A]/8 dark:bg-[#C17A3A]/15"
                      : "hover:bg-orange-50/70 dark:hover:bg-zinc-800"
                    }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-stone-800 dark:text-stone-100 truncate"><TranslatedText text={c.title} /></p>
                    <p className="text-[10px] text-stone-400 font-medium"><TranslatedText text={c.city} /> · <TranslatedText text={c.category} /></p>
                  </div>
                  {c.urgency === "CRITICAL" && (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-500 shrink-0">
                      {urgentText}
                    </span>
                  )}
                  {selected === c.id && (
                    <span className="w-2 h-2 rounded-full bg-[#C17A3A] shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function DonatePage() {
  const t = useTranslations("donate_page");
  const [amount, setAmount] = useState<number | "">(1000);
  const [custom, setCustom] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [step, setStep] = useState<"pick" | "confirm">("pick");

  const [addTip, setAddTip] = useState(true);
  const [tipPct, setTipPct] = useState<typeof TIP_PCTS[number]>(10);
  const [recurring, setRecurring] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi");

  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCampaigns()
      .then((c) => {
        setCampaigns(c);
        if (c.length > 0) setSelectedCampaign(c[0].id);
      })
      .catch(() => {})
      .finally(() => setCampaignsLoading(false));
  }, []);

  const handleDropdownOpen = useCallback(() => {
    setCampaignsLoading(true);
    getCampaigns()
      .then((c) => {
        setCampaigns(c);
        setCampaigns((prev) => {
          const ids = new Set(c.map((x) => x.id));
          if (selectedCampaign && !ids.has(selectedCampaign) && c.length > 0) {
            setSelectedCampaign(c[0].id);
          }
          return c;
        });
      })
      .catch(() => {})
      .finally(() => setCampaignsLoading(false));
  }, [selectedCampaign]);

  const baseAmount = custom ? parseInt(custom, 10) || 0 : (amount as number);
  const tip = addTip ? Math.round((baseAmount * tipPct) / 100) : 0;
  const finalAmount = baseAmount + tip;
  const activeCampaign = campaigns.find((c) => c.id === selectedCampaign);

  const handleAmountClick = (v: number) => {
    setAmount(v);
    setCustom("");
  };

  return (
    <div className="min-h-screen bg-[#F7F0E8] dark:bg-zinc-950 pb-28 lg:pb-16">

      {/* ── Header ── */}
      <div className="relative overflow-hidden border-b border-stone-100 dark:border-zinc-800 bg-[#F7F0E8] dark:bg-zinc-900">
        <div className="relative mx-auto max-w-lg px-6 pt-10 pb-8 text-center">
          <Link
            href="/"
            className="absolute left-6 top-6 flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-zinc-800 shadow-sm text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#C17A3A]/15 border border-[#C17A3A]/25 mb-4">
            <Heart className="w-5 h-5 text-[#C17A3A]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 mb-1.5">
            {t("heading")}
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* ── Card ── */}
      <div className="mx-auto max-w-lg px-5 pt-8">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-stone-200/80 dark:border-zinc-800 shadow-lg overflow-hidden">

          {step === "pick" ? (
            <div className="p-6 space-y-6">

              {/* Quick amounts */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-stone-400 dark:text-zinc-500 mb-3">{t("chooseAmount")}</p>
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_AMOUNTS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleAmountClick(v)}
                      className={`py-3 rounded-xl text-sm font-bold border-2 transition-all active:scale-95
                        ${amount === v && !custom
                          ? "bg-[#C17A3A] border-[#C17A3A] text-white shadow"
                          : "bg-white border-stone-200 text-stone-700 hover:border-[#C17A3A]/50"
                        }`}
                    >
                      ₹{v >= 1000 ? (v / 1000) + "k" : v}
                    </button>
                  ))}
                </div>

                {/* Custom amount row */}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAmount("");
                      setCustom("");
                      setTimeout(() => customInputRef.current?.focus(), 0);
                    }}
                    className="px-4 py-2.5 rounded-xl border-2 border-stone-200 text-sm font-bold text-stone-600 bg-white hover:border-[#C17A3A]/50"
                  >
                    Custom
                  </button>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">₹</span>
                    <input
                      ref={customInputRef}
                      type="number"
                      placeholder="Enter amount"
                      value={custom}
                      onChange={(e) => { setCustom(e.target.value); setAmount(""); }}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border-2 border-stone-200 focus:border-[#C17A3A]/60 outline-none text-sm font-bold bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Campaign picker */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-stone-400 dark:text-zinc-500 mb-3">Select Campaign</p>
                {campaigns.length === 0 && campaignsLoading ? (
                  <div className="h-14 rounded-2xl bg-stone-100 dark:bg-zinc-800 animate-pulse" />
                ) : (
                  <CampaignDropdown
                    campaigns={campaigns}
                    selected={selectedCampaign}
                    onSelect={setSelectedCampaign}
                    loading={campaignsLoading}
                    onOpen={handleDropdownOpen}
                    placeholder={t("selectCampaign")}
                    loadingText={t("loadingCampaigns")}
                    noCampaignsText={t("noCampaigns")}
                    urgentText={t("urgent")}
                  />
                )}
              </div>

              {/* Donate Anonymously toggle */}
              <div className="flex items-center justify-between py-3 border-b border-stone-100">
                <span className="text-sm font-semibold text-stone-700">Donate Anonymously</span>
                <Switch checked={anonymous} onCheckedChange={setAnonymous} id="anon-switch" />
              </div>

              {/* Payment Method */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3">Payment Method</p>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as "upi" | "card" | "netbanking")}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 text-left transition-all
                        ${paymentMethod === m.id
                          ? "border-[#C17A3A] bg-[#C17A3A]/5"
                          : "border-stone-200 bg-white hover:border-[#C17A3A]/30"
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                        ${m.id === "upi" ? "bg-orange-50" : m.id === "card" ? "bg-blue-50" : "bg-green-50"}`}>
                        {m.id === "upi" ? "💳" : m.id === "card" ? "🏦" : "🏛️"}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-stone-800">{m.label}</p>
                        <p className="text-xs text-stone-400 font-medium">{m.desc}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                        ${paymentMethod === m.id ? "border-[#C17A3A]" : "border-stone-300"}`}>
                        {paymentMethod === m.id && <div className="w-2.5 h-2.5 rounded-full bg-[#C17A3A]" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Total amount row */}
              <div className="flex justify-between items-center py-3 border-t border-stone-100">
                <span className="text-sm font-semibold text-stone-600">Total amount</span>
                <span className="text-lg font-black text-stone-900">₹{formatINR(finalAmount || 0)}</span>
              </div>

              {/* CTA */}
              <button
                type="button"
                disabled={!baseAmount || baseAmount < 1 || !selectedCampaign}
                onClick={() => setStep("confirm")}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#C17A3A] hover:bg-[#a86430] disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm tracking-wide transition-all duration-200 shadow-lg shadow-[#C17A3A]/30 active:scale-[0.98]"
              >
                <Shield className="w-4 h-4" /> Proceed to Pay
              </button>
            </div>
          ) : (
            /* ── Confirm step ── */
            <div className="p-6 space-y-5">
              <button
                type="button"
                onClick={() => setStep("pick")}
                className="flex items-center gap-1.5 text-xs font-bold text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> {t("back")}
              </button>

              <div className="rounded-2xl bg-orange-50/60 dark:bg-zinc-800 border border-orange-100 dark:border-zinc-700 p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-black uppercase tracking-widest text-stone-400 dark:text-zinc-500">{t("donating")}</p>
                  <span className="text-2xl font-black text-[#C17A3A]">₹{formatINR(baseAmount)}</span>
                </div>

                {addTip && tip > 0 && (
                  <div className="flex justify-between items-center text-xs font-medium text-stone-500 dark:text-zinc-400">
                    <span>{t("tipTo")} ({tipPct}%)</span>
                    <span>+ ₹{formatINR(tip)}</span>
                  </div>
                )}

                {addTip && tip > 0 && (
                  <div className="flex justify-between items-center text-sm font-extrabold text-stone-800 dark:text-stone-100 border-t border-orange-100 dark:border-zinc-700 pt-2">
                    <span>{t("total")}{recurring ? " / month" : ""}</span>
                    <span className="text-[#C17A3A]">₹{formatINR(finalAmount)}{recurring ? t("perMo") : ""}</span>
                  </div>
                )}

                {recurring && (
                  <div className="flex items-center gap-2 rounded-lg bg-[#1e3a60]/8 dark:bg-[#1e3a60]/20 border border-[#1e3a60]/20 dark:border-[#1e3a60]/30 px-3 py-2 mt-1">
                    <RefreshCw className="w-3.5 h-3.5 text-[#1e3a60] dark:text-blue-400 shrink-0" />
                    <p className="text-[10px] font-bold text-[#1e3a60] dark:text-blue-400">{t("monthlyAutopay")}</p>
                  </div>
                )}

                <div className="border-t border-orange-100 dark:border-zinc-700 pt-3">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">To</p>
                  <p className="text-sm font-bold text-stone-800 dark:text-stone-100"><TranslatedText text={activeCampaign?.title} /></p>
                  <p className="text-xs text-stone-400 font-medium"><TranslatedText text={activeCampaign?.city} /> · <TranslatedText text={activeCampaign?.category} /></p>
                </div>

                <div className="border-t border-orange-100 dark:border-zinc-700 pt-3 flex justify-between text-xs font-bold">
                  <span className="text-stone-400">{t("platformFee")}</span>
                  <span className="text-emerald-600 font-extrabold">₹0 — {t("platformFeeValue")}</span>
                </div>
              </div>

              <p className="text-xs text-stone-400 dark:text-zinc-600 text-center font-medium leading-relaxed">
                {t("confirmTerms")}
              </p>

              <Link
                href={activeCampaign ? `/campaigns/${activeCampaign.id}` : "/campaigns"}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#C17A3A] hover:bg-[#a86430] text-white font-extrabold text-sm tracking-wide transition-all duration-200 shadow-lg shadow-[#C17A3A]/30 active:scale-[0.98]"
              >
                {recurring ? t("confirmMonthly") : t("confirmDonation")}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
