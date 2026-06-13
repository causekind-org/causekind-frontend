"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Zap, Shield, ChevronRight, ChevronDown, Loader2, RefreshCw } from "lucide-react";
import { getCampaigns, type Campaign } from "@/lib/api";

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];
const TIP_PCTS = [5, 10, 15] as const;

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
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15] focus-visible:ring-offset-2
        ${checked ? "bg-[#b04a15]" : "bg-stone-200 dark:bg-zinc-700"}`}
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
}: {
  campaigns: Campaign[];
  selected: number | null;
  onSelect: (id: number) => void;
  loading: boolean;
  onOpen: () => void;
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

  // Close on outside click
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

  // Close on Escape
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
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-orange-100 dark:border-zinc-700 bg-orange-50/40 dark:bg-zinc-800 text-left transition-all duration-150 hover:border-[#b04a15]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15] focus-visible:ring-offset-1"
      >
        <div className="min-w-0 flex-1">
          {activeCampaign ? (
            <>
              <p className="text-xs font-bold text-stone-800 dark:text-stone-100 truncate">{activeCampaign.title}</p>
              <p className="text-[10px] text-stone-400 font-medium">{activeCampaign.city} · {activeCampaign.category}</p>
            </>
          ) : (
            <p className="text-sm font-medium text-stone-400 dark:text-zinc-500">Select a campaign…</p>
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
                Loading campaigns…
              </div>
            ) : campaigns.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-400">No campaigns available</div>
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
                      ? "bg-[#b04a15]/8 dark:bg-[#b04a15]/15"
                      : "hover:bg-orange-50/70 dark:hover:bg-zinc-800"
                    }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-stone-800 dark:text-stone-100 truncate">{c.title}</p>
                    <p className="text-[10px] text-stone-400 font-medium">{c.city} · {c.category}</p>
                  </div>
                  {c.urgency === "CRITICAL" && (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-500 shrink-0">
                      Urgent
                    </span>
                  )}
                  {selected === c.id && (
                    <span className="w-2 h-2 rounded-full bg-[#b04a15] shrink-0" />
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
  const [amount, setAmount] = useState<number | "">(100);
  const [custom, setCustom] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [step, setStep] = useState<"pick" | "confirm">("pick");

  // Tip state — mirrors campaign page: on by default, 10% default, chips 5/10/15
  const [addTip, setAddTip] = useState(true);
  const [tipPct, setTipPct] = useState<typeof TIP_PCTS[number]>(10);

  // Autopay/recurring state — mirrors campaign page: "Make it recurring" switch
  const [recurring, setRecurring] = useState(false);

  // Initial load
  useEffect(() => {
    getCampaigns()
      .then((c) => {
        setCampaigns(c);
        if (c.length > 0) setSelectedCampaign(c[0].id);
      })
      .catch(() => {})
      .finally(() => setCampaignsLoading(false));
  }, []);

  // Re-fetch when dropdown opens (dynamic refresh)
  const handleDropdownOpen = useCallback(() => {
    setCampaignsLoading(true);
    getCampaigns()
      .then((c) => {
        setCampaigns(c);
        // If currently selected campaign disappeared, pick first
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
    <div className="min-h-screen bg-[#faf8f5] dark:bg-zinc-950 pb-28 lg:pb-16">

      {/* ── Header ── */}
      <div className="relative overflow-hidden bg-[#120c04] border-b border-stone-800">
        <div className="pointer-events-none absolute -top-20 left-1/3 w-[360px] h-[360px] rounded-full bg-[#b04a15]/12 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-1/4 w-[280px] h-[280px] rounded-full bg-[#1e3a60]/10 blur-3xl" />
        <div className="relative mx-auto max-w-lg px-6 pt-12 pb-10 text-center">
          <Link
            href="/"
            className="absolute left-6 top-6 inline-flex items-center gap-1.5 text-stone-500 hover:text-white text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#b04a15]/15 border border-[#b04a15]/30 mb-4">
            <Heart className="w-5 h-5 text-[#e07b3a]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Give Directly
          </h1>
          <p className="text-sm text-stone-400 font-medium">
            100% reaches the cause. Zero platform fees.
          </p>
        </div>
      </div>

      {/* ── Card ── */}
      <div className="mx-auto max-w-lg px-5 pt-8">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-orange-100/70 dark:border-zinc-800 shadow-xl overflow-hidden">

          {step === "pick" ? (
            <div className="p-6 space-y-6">

              {/* Quick amounts */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-stone-400 dark:text-zinc-500 mb-3">Choose amount</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {QUICK_AMOUNTS.slice(0, 3).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleAmountClick(v)}
                      className={`py-3 rounded-2xl text-sm font-extrabold border-2 transition-all duration-150 active:scale-95
                        ${amount === v && !custom
                          ? "bg-[#b04a15] border-[#b04a15] text-white shadow-md shadow-[#b04a15]/25"
                          : "bg-orange-50/60 dark:bg-zinc-800 border-orange-100 dark:border-zinc-700 text-stone-700 dark:text-stone-200 hover:border-[#b04a15]/50"
                        }`}
                    >
                      ₹{v}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {QUICK_AMOUNTS.slice(3).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleAmountClick(v)}
                      className={`py-3 rounded-2xl text-sm font-extrabold border-2 transition-all duration-150 active:scale-95
                        ${amount === v && !custom
                          ? "bg-[#b04a15] border-[#b04a15] text-white shadow-md shadow-[#b04a15]/25"
                          : "bg-orange-50/60 dark:bg-zinc-800 border-orange-100 dark:border-zinc-700 text-stone-700 dark:text-stone-200 hover:border-[#b04a15]/50"
                        }`}
                    >
                      ₹{formatINR(v)}
                    </button>
                  ))}
                </div>

                {/* Custom amount */}
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm select-none">₹</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter custom amount"
                    value={custom}
                    onChange={(e) => { setCustom(e.target.value); setAmount(""); }}
                    className={`w-full pl-8 pr-4 py-3.5 rounded-2xl border-2 text-sm font-bold bg-orange-50/40 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 placeholder-stone-300 dark:placeholder-zinc-600 outline-none transition-all
                      ${custom ? "border-[#b04a15]" : "border-orange-100 dark:border-zinc-700 focus:border-[#b04a15]/60"}`}
                  />
                </div>
              </div>

              {/* Campaign picker — dropdown */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-stone-400 dark:text-zinc-500 mb-3">Give to</p>
                {campaigns.length === 0 && campaignsLoading ? (
                  <div className="h-14 rounded-2xl bg-stone-100 dark:bg-zinc-800 animate-pulse" />
                ) : (
                  <CampaignDropdown
                    campaigns={campaigns}
                    selected={selectedCampaign}
                    onSelect={setSelectedCampaign}
                    loading={campaignsLoading}
                    onOpen={handleDropdownOpen}
                  />
                )}
              </div>

              {/* ── Tip section (mirrors campaign page) ── */}
              <div className="rounded-xl border border-orange-100 dark:border-zinc-700 bg-orange-50/30 dark:bg-zinc-800/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Add a tip to CauseKind</p>
                    <p className="text-xs text-stone-400 dark:text-zinc-500 mt-0.5">Tips keep CauseKind free for everyone.</p>
                  </div>
                  <Switch checked={addTip} onCheckedChange={setAddTip} id="tip-switch" />
                </div>
                {addTip && (
                  <div className="mt-3 flex gap-2">
                    {TIP_PCTS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setTipPct(p)}
                        className={`flex-1 py-2 rounded-xl text-xs font-extrabold border-2 transition-all duration-150 active:scale-95
                          ${tipPct === p
                            ? "bg-[#b04a15] border-[#b04a15] text-white shadow-sm shadow-[#b04a15]/25"
                            : "bg-white dark:bg-zinc-900 border-orange-100 dark:border-zinc-700 text-stone-600 dark:text-stone-300 hover:border-[#b04a15]/50"
                          }`}
                      >
                        {p}%
                        {baseAmount > 0 && (
                          <span className="block text-[9px] font-bold opacity-70 mt-0.5">
                            ₹{formatINR(Math.round((baseAmount * p) / 100))}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Autopay/recurring section (mirrors campaign page) ── */}
              <div className="rounded-xl border border-orange-100 dark:border-zinc-700 bg-orange-50/30 dark:bg-zinc-800/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Make this monthly</p>
                    <p className="text-xs text-stone-400 dark:text-zinc-500 mt-0.5">Give a little, regularly. Cancel anytime.</p>
                  </div>
                  <Switch checked={recurring} onCheckedChange={setRecurring} id="recurring-switch" />
                </div>
                {recurring && (
                  <p className="mt-2 text-[10px] text-stone-400 dark:text-zinc-500 leading-relaxed">
                    Your card will be charged ₹{formatINR(finalAmount)} every month via Razorpay eMandate. You can cancel at any time from your profile.
                  </p>
                )}
              </div>

              {/* Amount summary line */}
              {baseAmount > 0 && addTip && tip > 0 && (
                <div className="rounded-xl border border-orange-100/80 dark:border-zinc-700 bg-orange-50/20 dark:bg-zinc-800/40 px-4 py-3 space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-stone-500 dark:text-zinc-400">
                    <span>Donation</span>
                    <span>₹{formatINR(baseAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium text-stone-500 dark:text-zinc-400">
                    <span>Tip ({tipPct}%)</span>
                    <span>₹{formatINR(tip)}</span>
                  </div>
                  <div className="border-t border-orange-100 dark:border-zinc-700 pt-1.5 flex justify-between text-sm font-extrabold text-stone-800 dark:text-stone-100">
                    <span>Total{recurring ? "/month" : ""}</span>
                    <span className="text-[#b04a15]">₹{formatINR(finalAmount)}{recurring ? "/mo" : ""}</span>
                  </div>
                </div>
              )}

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-6 pt-1 pb-2">
                {[
                  { icon: Shield, text: "Verified campaign" },
                  { icon: Zap,    text: "Instant transfer" },
                  { icon: Heart,  text: "Zero fees" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex flex-col items-center gap-1">
                    <Icon className="w-4 h-4 text-stone-300 dark:text-zinc-600" />
                    <span className="text-[9px] font-bold text-stone-400 dark:text-zinc-600 text-center whitespace-nowrap">{text}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                type="button"
                disabled={!baseAmount || baseAmount < 1 || !selectedCampaign}
                onClick={() => setStep("confirm")}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#b04a15] hover:bg-[#963c0d] disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm tracking-wide transition-all duration-200 shadow-lg shadow-[#b04a15]/30 active:scale-[0.98]"
              >
                {recurring ? "Set up monthly ₹" : "Donate ₹"}{finalAmount ? formatINR(finalAmount) : "–"}{recurring ? "/mo" : " Now"}
                <ChevronRight className="w-4 h-4" />
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
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>

              <div className="rounded-2xl bg-orange-50/60 dark:bg-zinc-800 border border-orange-100 dark:border-zinc-700 p-5 space-y-3">
                {/* Donation amount */}
                <div className="flex justify-between items-start">
                  <p className="text-xs font-black uppercase tracking-widest text-stone-400 dark:text-zinc-500">Donating</p>
                  <span className="text-2xl font-black text-[#b04a15]">₹{formatINR(baseAmount)}</span>
                </div>

                {/* Tip line */}
                {addTip && tip > 0 && (
                  <div className="flex justify-between items-center text-xs font-medium text-stone-500 dark:text-zinc-400">
                    <span>Tip to CauseKind ({tipPct}%)</span>
                    <span>+ ₹{formatINR(tip)}</span>
                  </div>
                )}

                {/* Total */}
                {addTip && tip > 0 && (
                  <div className="flex justify-between items-center text-sm font-extrabold text-stone-800 dark:text-stone-100 border-t border-orange-100 dark:border-zinc-700 pt-2">
                    <span>Total{recurring ? " / month" : ""}</span>
                    <span className="text-[#b04a15]">₹{formatINR(finalAmount)}{recurring ? "/mo" : ""}</span>
                  </div>
                )}

                {/* Monthly autopay badge */}
                {recurring && (
                  <div className="flex items-center gap-2 rounded-lg bg-[#1e3a60]/8 dark:bg-[#1e3a60]/20 border border-[#1e3a60]/20 dark:border-[#1e3a60]/30 px-3 py-2 mt-1">
                    <RefreshCw className="w-3.5 h-3.5 text-[#1e3a60] dark:text-blue-400 shrink-0" />
                    <p className="text-[10px] font-bold text-[#1e3a60] dark:text-blue-400">Monthly autopay via Razorpay eMandate · Cancel anytime</p>
                  </div>
                )}

                {/* Campaign */}
                <div className="border-t border-orange-100 dark:border-zinc-700 pt-3">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">To</p>
                  <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{activeCampaign?.title}</p>
                  <p className="text-xs text-stone-400 font-medium">{activeCampaign?.city} · {activeCampaign?.category}</p>
                </div>

                {/* Platform fee */}
                <div className="border-t border-orange-100 dark:border-zinc-700 pt-3 flex justify-between text-xs font-bold">
                  <span className="text-stone-400">Platform fee</span>
                  <span className="text-emerald-600 font-extrabold">₹0 — Free</span>
                </div>
              </div>

              <p className="text-xs text-stone-400 dark:text-zinc-600 text-center font-medium leading-relaxed">
                By donating you agree to our terms. Funds are transferred directly after campaign verification.
              </p>

              <Link
                href={activeCampaign ? `/campaigns/${activeCampaign.id}` : "/campaigns"}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#b04a15] hover:bg-[#963c0d] text-white font-extrabold text-sm tracking-wide transition-all duration-200 shadow-lg shadow-[#b04a15]/30 active:scale-[0.98]"
              >
                Confirm {recurring ? "Monthly " : ""}Donation
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
