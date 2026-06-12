"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Zap, Shield, ChevronRight } from "lucide-react";
import { getCampaigns, type Campaign } from "@/lib/api";

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

export default function DonatePage() {
  const [amount, setAmount] = useState<number | "">(100);
  const [custom, setCustom] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [step, setStep] = useState<"pick" | "confirm">("pick");

  useEffect(() => {
    getCampaigns().then(c => {
      setCampaigns(c.slice(0, 8));
      if (c.length > 0) setSelectedCampaign(c[0].id);
    }).catch(() => {});
  }, []);

  const finalAmount = custom ? parseInt(custom, 10) || 0 : (amount as number);
  const activeCampaign = campaigns.find(c => c.id === selectedCampaign);

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
          <Link href="/" className="absolute left-6 top-6 inline-flex items-center gap-1.5 text-stone-500 hover:text-white text-xs font-semibold transition-colors">
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
      <div className="mx-auto max-w-lg px-5 -mt-0 pt-8">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-orange-100/70 dark:border-zinc-800 shadow-xl overflow-hidden">

          {step === "pick" ? (
            <div className="p-6 space-y-6">

              {/* Quick amounts */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-stone-400 dark:text-zinc-500 mb-3">Choose amount</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {QUICK_AMOUNTS.slice(0, 3).map(v => (
                    <button
                      key={v}
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
                  {QUICK_AMOUNTS.slice(3).map(v => (
                    <button
                      key={v}
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
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter custom amount"
                    value={custom}
                    onChange={e => { setCustom(e.target.value); setAmount(""); }}
                    className={`w-full pl-8 pr-4 py-3.5 rounded-2xl border-2 text-sm font-bold bg-orange-50/40 dark:bg-zinc-800 text-stone-800 dark:text-stone-100 placeholder-stone-300 dark:placeholder-zinc-600 outline-none transition-all
                      ${custom ? "border-[#b04a15]" : "border-orange-100 dark:border-zinc-700 focus:border-[#b04a15]/60"}`}
                  />
                </div>
              </div>

              {/* Campaign picker */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-stone-400 dark:text-zinc-500 mb-3">Give to</p>
                {campaigns.length === 0 ? (
                  <div className="h-12 rounded-2xl bg-stone-100 dark:bg-zinc-800 animate-pulse" />
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {campaigns.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCampaign(c.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all duration-150 active:scale-[0.98]
                          ${selectedCampaign === c.id
                            ? "bg-[#b04a15]/5 border-[#b04a15]/40 dark:border-[#b04a15]/50"
                            : "bg-stone-50/60 dark:bg-zinc-800/60 border-stone-100 dark:border-zinc-700 hover:border-[#b04a15]/25"
                          }`}
                      >
                        <span className={`w-3 h-3 rounded-full shrink-0 border-2 flex items-center justify-center transition-all
                          ${selectedCampaign === c.id ? "bg-[#b04a15] border-[#b04a15]" : "border-stone-300 dark:border-zinc-600"}`}>
                          {selectedCampaign === c.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-stone-800 dark:text-stone-100 truncate">{c.title}</p>
                          <p className="text-[10px] text-stone-400 font-medium">{c.city} · {c.category}</p>
                        </div>
                        {c.urgency === "CRITICAL" && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-500 shrink-0">
                            Urgent
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

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
                disabled={!finalAmount || finalAmount < 1 || !selectedCampaign}
                onClick={() => setStep("confirm")}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#b04a15] hover:bg-[#963c0d] disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm tracking-wide transition-all duration-200 shadow-lg shadow-[#b04a15]/30 active:scale-[0.98]"
              >
                Donate ₹{finalAmount ? formatINR(finalAmount) : "–"} Now
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* ── Confirm step ── */
            <div className="p-6 space-y-5">
              <button onClick={() => setStep("pick")} className="flex items-center gap-1.5 text-xs font-bold text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>

              <div className="rounded-2xl bg-orange-50/60 dark:bg-zinc-800 border border-orange-100 dark:border-zinc-700 p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-black uppercase tracking-widest text-stone-400 dark:text-zinc-500">Donating</p>
                  <span className="text-2xl font-black text-[#b04a15]">₹{formatINR(finalAmount)}</span>
                </div>
                <div className="border-t border-orange-100 dark:border-zinc-700 pt-3">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">To</p>
                  <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{activeCampaign?.title}</p>
                  <p className="text-xs text-stone-400 font-medium">{activeCampaign?.city} · {activeCampaign?.category}</p>
                </div>
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
                Confirm Donation
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
