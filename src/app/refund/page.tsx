"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import {
  ArrowLeft,
  RefreshCw,
  Clock,
  AlertTriangle,
  FileText,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

const LAST_UPDATED = "24 June 2026";

const SECTIONS = [
  { id: "policy", num: "01", title: "General Refund Policy", icon: FileText },
  { id: "requests", num: "02", title: "Refund Requests", icon: Clock },
  { id: "failed", num: "03", title: "Failed or Pending Transactions", icon: AlertTriangle },
  { id: "disputes", num: "04", title: "Chargebacks and Disputes", icon: ShieldCheck },
] as const;

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">{children}</p>;
}

function Lead({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-stone-900 dark:text-stone-100">{children}</span>;
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-stone-600 dark:text-stone-300">
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#b04a15] dark:text-orange-400" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function SubHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="pt-1 text-sm font-extrabold uppercase tracking-wider text-[#b04a15] dark:text-orange-400">
      {children}
    </h3>
  );
}

function Section({
  id,
  num,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  num: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Reveal className="scroll-mt-28">
      <section id={id} className="scroll-mt-28">
        <div className="mb-5 flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#b04a15] to-[#e07b3a] text-white shadow-lg shadow-[#b04a15]/25">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <span className="block text-[11px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">
              Section {num}
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-stone-900 dark:text-white sm:text-2xl">
              {title}
            </h2>
          </div>
        </div>
        <div className="space-y-4 rounded-3xl border border-stone-200/70 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-8">
          {children}
        </div>
      </section>
    </Reveal>
  );
}

export default function RefundPolicyPage() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      const line = 140;
      let current: string = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }
      setActive(current);

      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  function jumpTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(id);
    }
  }

  return (
    <div className="bg-[#faf8f5] dark:bg-zinc-950">
      <style>{`
        @keyframes pp-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes pp-blob  { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(28px,-22px) scale(1.12)} 66%{transform:translate(-20px,14px) scale(0.94)} }
        @keyframes pp-shimmer { to { background-position: -200% center } }
        @keyframes pp-ring { 0%{transform:scale(.85);opacity:.55} 100%{transform:scale(1.6);opacity:0} }
        .pp-shimmer-text {
          background-image: linear-gradient(110deg,#f0b97a 20%,#ffffff 40%,#ffffff 50%,#e07b3a 70%);
          background-size: 200% auto;
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          animation: pp-shimmer 4.5s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .pp-float,.pp-blob,.pp-shimmer-text,.pp-ring { animation: none !important; }
        }
      `}</style>

      <header className="relative overflow-hidden bg-[#120c04] border-b border-stone-800">
        <div className="pp-blob pointer-events-none absolute -top-24 left-1/4 h-[420px] w-[420px] rounded-full bg-[#b04a15]/20 blur-3xl" style={{ animation: "pp-blob 14s ease-in-out infinite" }} />
        <div className="pp-blob pointer-events-none absolute -bottom-20 right-1/5 h-[340px] w-[340px] rounded-full bg-[#1e3a60]/25 blur-3xl" style={{ animation: "pp-blob 18s ease-in-out infinite reverse" }} />
        <div className="pp-blob pointer-events-none absolute top-1/3 right-1/3 h-[260px] w-[260px] rounded-full bg-[#f0b97a]/10 blur-3xl" style={{ animation: "pp-blob 22s ease-in-out infinite" }} />

        <div className="relative mx-auto max-w-3xl px-6 pt-14 pb-16 text-center">
          <Link
            href="/"
            className="mb-9 inline-flex items-center gap-1.5 text-xs font-semibold text-stone-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>

          <div className="relative mx-auto mb-7 h-20 w-20">
            <span className="pp-ring absolute inset-0 rounded-3xl bg-[#b04a15]/40" style={{ animation: "pp-ring 2.6s ease-out infinite" }} />
            <div
              className="pp-float relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#b04a15] to-[#e07b3a] shadow-2xl shadow-[#b04a15]/40"
              style={{ animation: "pp-float 4s ease-in-out infinite" }}
            >
              <RefreshCw className="h-10 w-10 text-white" />
            </div>
          </div>

          <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[#e07b3a]">
            Cancellations & Refunds
          </p>
          <h1 className="pp-shimmer-text text-4xl font-extrabold tracking-tight sm:text-5xl">
            Refund Policy
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base font-medium leading-relaxed text-stone-400">
            Details on our refund and cancellation practices for donations made through CauseKind.
          </p>

          <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-stone-700 bg-stone-900/60 px-4 py-2 text-xs font-semibold text-stone-300 backdrop-blur-sm">
            <Clock className="h-3.5 w-3.5 text-[#e07b3a]" />
            Last updated {LAST_UPDATED}
            <span className="mx-1 h-3 w-px bg-stone-700" />
            Version 1.0
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-16">
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-12">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="mb-4 text-[11px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">
                On this page
              </p>
              <div className="relative">
                <span className="absolute left-0 top-0 h-full w-0.5 rounded-full bg-stone-200 dark:bg-zinc-800" />
                <span
                  className="absolute left-0 top-0 w-0.5 rounded-full bg-gradient-to-b from-[#b04a15] to-[#e07b3a] transition-[height] duration-150"
                  style={{ height: `${progress}%` }}
                />
                <nav className="flex flex-col gap-0.5 pl-4">
                  {SECTIONS.map((s) => {
                    const on = active === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => jumpTo(s.id)}
                        className={`group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-semibold transition-all duration-200 ${
                          on
                            ? "bg-[#b04a15]/10 text-[#b04a15] dark:bg-orange-400/10 dark:text-orange-400"
                            : "text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-200 ${
                            on ? "scale-125 bg-[#f0b97a]" : "bg-stone-300 group-hover:bg-stone-400 dark:bg-zinc-700"
                          }`}
                        />
                        {s.title}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <details className="mb-8 rounded-2xl border border-stone-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
              <summary className="cursor-pointer text-sm font-bold text-stone-800 dark:text-stone-100">
                On this page
              </summary>
              <div className="mt-3 grid grid-cols-1 gap-1">
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => jumpTo(s.id)}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] font-semibold text-stone-600 dark:text-stone-300"
                  >
                    <span className="text-[11px] font-black text-stone-400">{s.num}</span>
                    {s.title}
                  </button>
                ))}
              </div>
            </details>

            <div className="space-y-14">
              <Section id="policy" num="01" title="General Refund Policy" icon={FileText}>
                <P>
                  Donations made through CauseKind are generally voluntary and may be non-refundable once successfully processed, unless:
                </P>
                <Bullets
                  items={[
                    "the donation was made by mistake;",
                    "there was a duplicate transaction;",
                    "the transaction failed but the amount was debited;",
                    "the campaign is cancelled before funds are utilised;",
                    "the donation cannot be legally or operationally accepted;",
                    "CauseKind, the beneficiary organisation, or the payment gateway determines that refund is necessary due to fraud, dispute, compliance, or regulatory reasons."
                  ]}
                />
              </Section>

              <Section id="requests" num="02" title="Refund Requests" icon={Clock}>
                <P>
                  Refund requests must be submitted to CauseKind at <a href="mailto:support@causekind.com" className="font-semibold text-[#b04a15] underline-offset-2 hover:underline dark:text-orange-400">support@causekind.com</a> within 7 days from the date of payment, along with transaction ID, donor name, amount, payment date, and reason for refund.
                </P>
                <P>
                  All refund requests will be reviewed by CauseKind. Approval of refund is at CauseKind’s discretion, subject to campaign status, utilisation of funds, payment gateway rules, legal requirements, and availability of funds.
                </P>
                <P>
                  Razorpay’s terms state that refunds are processed only when initiated by the merchant on the Razorpay platform and routed to the same payment method through which the original transaction was processed. Razorpay’s terms also state that Razorpay fees may remain applicable even if a transaction is refunded.
                </P>
                <P>
                  If a refund is approved, the amount will be refunded to the original payment method used for the transaction. Refund timelines may depend on Razorpay, banks, UPI, card networks, wallet providers, and other payment partners.
                </P>
              </Section>

              <Section id="failed" num="03" title="Failed or Pending Transactions" icon={AlertTriangle}>
                <P>
                  If your transaction fails, remains pending, or the amount is debited but not credited to CauseKind, we will verify the transaction status with Razorpay/payment gateway. If the payment is not captured or is reversed by the bank/payment partner, the amount may be automatically refunded as per the payment gateway and bank timelines.
                </P>
              </Section>

              <Section id="disputes" num="04" title="Chargebacks and Disputes" icon={ShieldCheck}>
                <P>
                  If a donor raises a chargeback, dispute, unauthorised transaction claim, or refund claim with their bank/payment provider, CauseKind may be required to share transaction records, receipts, campaign details, communication logs, and other supporting documents with Razorpay, banks, card networks, UPI, regulators, or law enforcement authorities.
                </P>
                <P>
                  Razorpay’s terms state that chargeback liability rests with the merchant and that Razorpay may deduct chargeback amounts from settlement amounts or other funds held by Razorpay. Razorpay may also require documents to prove transaction completion or delivery of goods/services.
                </P>
                <P>
                  CauseKind reserves the right to suspend, block, cancel, or investigate any user account, campaign, or transaction if there is suspected fraud, misuse, chargeback abuse, illegal activity, or violation of platform terms.
                </P>
              </Section>
            </div>

            <Reveal className="mt-14">
              <div className="rounded-3xl border border-stone-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
                <RefreshCw className="mx-auto mb-3 h-8 w-8 text-[#b04a15] dark:text-orange-400" />
                <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
                  This Refund Policy is effective as of {LAST_UPDATED}.
                </p>
                <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
                  © {new Date().getFullYear()} CauseKind. All rights reserved. · Version 1.0
                </p>
              </div>
            </Reveal>
          </main>
        </div>
      </div>
    </div>
  );
}
