"use client";

import { Download, Heart, Loader2, MailCheck, MessageCircle } from "lucide-react";
import { UiText, useUiText } from "@/components/UiText";
import { SAHAS_NAME, serif } from "@/features/sahas/sahasUi";

export type SahasDocs = { certificate: string | null; receipt: string | null; receiptOwed: boolean };

const COLORS = ["#b04a15", "#e07b3a", "#f0b97a", "#1e3a60", "#4a7fba", "#fcd34d"];
/** Fixed positions, so a re-render (the documents arriving) never reshuffles the confetti. */
const CONFETTI = Array.from({ length: 36 }, (_, i) => ({
  left: `${2 + ((i * 37) % 96)}%`,
  size: 6 + (i % 5),
  color: COLORS[i % COLORS.length],
  round: i % 3 === 0,
  delay: `${((i * 0.09) % 1.2).toFixed(2)}s`,
  duration: `${(1.8 + ((i * 0.13) % 1.4)).toFixed(2)}s`,
}));

const action = "flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold no-underline";
const rise = (seconds: number) => ({ animationDelay: `${seconds}s` });

/** The screen a donor sees once the payment is confirmed. */
export function SahasThankYou({ donorName, amount, tip, title, imageUrl, imageAlt, shareUrl, docs, popup, leave }: {
  donorName: string;
  amount: number;
  tip: number;
  title: string;
  imageUrl: string | null;
  imageAlt: string;
  shareUrl: string;
  /** Null until the first status answer arrives. */
  docs: SahasDocs | null;
  popup: boolean;
  leave: React.ReactNode;
}) {
  const ui = useUiText();
  const first = donorName.trim().split(/\s+/)[0];
  const share = `https://wa.me/?text=${encodeURIComponent(`${ui("I just donated on CauseKind. Join me in supporting")} “${title}”: ${shareUrl}`)}`;
  const inApp = typeof navigator !== "undefined" && /FBAN|FBAV|Instagram/.test(navigator.userAgent);

  return (
    <div className={`relative flex flex-col overflow-x-hidden overflow-y-auto bg-gradient-to-b from-[#FFF3E6] via-[#FFFBF6] to-white text-[#1F140D] dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-950 dark:text-stone-100 ${popup ? "h-full min-h-[560px] lg:col-span-2 lg:min-h-0" : "min-h-[70vh]"}`}>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {CONFETTI.map((p, i) => (
          <span key={i} className="ck-thanks-confetti absolute -top-3"
            style={{ left: p.left, width: p.size, height: p.round ? p.size : p.size * 1.6, background: p.color, borderRadius: p.round ? "50%" : 2, animationDelay: p.delay, animationDuration: p.duration }} />
        ))}
      </div>

      <div className="relative m-auto flex w-full max-w-md flex-col items-center gap-4 px-6 py-8 text-center">
        <div className="relative flex size-24 items-center justify-center">
          <span aria-hidden className="ck-thanks-ring absolute inset-0 rounded-full bg-[#e07b3a]/30" />
          <span aria-hidden className="ck-thanks-pop relative flex size-20 items-center justify-center rounded-full bg-gradient-to-tr from-[#b04a15] to-[#ea7a2e] text-white shadow-lg shadow-orange-900/25">
            <Heart className="ck-thanks-beat size-10 fill-current" />
          </span>
        </div>

        <div role="status" className="ck-thanks-rise flex flex-col gap-2" style={rise(0.15)}>
          <h1 id="sahas-donate-title" className={`${serif} m-0 text-[34px] leading-tight sm:text-[40px]`}>
            {first ? `${ui("Thank you")}, ${first}!` : <UiText>Thank you!</UiText>}
          </h1>
          <p className="m-0 text-base text-[#4A3B30] dark:text-stone-300"><UiText>Your donation is confirmed. Your kindness makes a real difference.</UiText></p>
        </div>

        <div className="ck-thanks-rise flex w-full items-center gap-4 rounded-2xl border border-[#F1DFCC] bg-white p-3 text-start shadow-sm dark:border-zinc-800 dark:bg-zinc-900" style={rise(0.3)}>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={imageAlt} className="size-20 shrink-0 rounded-xl object-cover" />
          )}
          <div className="min-w-0">
            <p className={`${serif} m-0 text-[28px] leading-none text-[#b04a15] dark:text-[#e07b3a]`}>₹{amount.toLocaleString("en-IN")}</p>
            <p className="m-0 mt-1.5 text-sm font-semibold leading-snug">{title}</p>
            <p className="m-0 mt-0.5 text-xs text-[#6B5A4E] dark:text-stone-400">{SAHAS_NAME}</p>
            {tip > 0 && <p className="m-0 mt-0.5 text-xs text-[#6B5A4E] dark:text-stone-400">+ ₹{tip.toLocaleString("en-IN")} <UiText>support to CauseKind</UiText></p>}
          </div>
        </div>

        <div className="ck-thanks-rise flex w-full flex-col gap-2" style={rise(0.45)}>
          {docs?.certificate ? <>
            <a href={docs.certificate} className={`${action} bg-[#b04a15] text-white`}><Download className="size-4" aria-hidden /><UiText>Download certificate</UiText></a>
            {docs.receipt && <a href={docs.receipt} className={`${action} bg-[#b04a15] text-white`}><Download className="size-4" aria-hidden /><UiText>Download 80G receipt</UiText></a>}
            {docs.receiptOwed && !docs.receipt && <p className="m-0 text-sm"><UiText>Your 80G receipt is being prepared.</UiText></p>}
            <p className="m-0 flex items-center justify-center gap-1.5 text-xs text-[#6B5A4E] dark:text-stone-400"><MailCheck className="size-3.5 shrink-0" aria-hidden /><UiText>Your documents are also emailed to you.</UiText></p>
            {inApp && <p className="m-0 text-xs"><UiText>Trouble downloading? Your documents are in your email, or open this page in Chrome.</UiText></p>}
          </> : (
            <p className="m-0 flex items-center justify-center gap-2 rounded-xl bg-[#FBF1E6] px-4 py-3 text-sm text-[#4A3B30] dark:bg-zinc-900 dark:text-stone-300">
              <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />
              <UiText>Preparing your documents. They will appear here and reach you by email.</UiText>
            </p>
          )}
        </div>

        <div className="ck-thanks-rise flex w-full flex-col items-center gap-3" style={rise(0.6)}>
          <a href={share} target="_blank" rel="noopener noreferrer" className={`${action} w-full border border-[#CDBBA8] bg-white text-[#1F140D] dark:border-zinc-700 dark:bg-zinc-900 dark:text-stone-100`}>
            <MessageCircle className="size-4" aria-hidden /><UiText>Invite friends on WhatsApp</UiText>
          </a>
          <div className="flex min-h-[44px] items-center justify-center [&>*]:self-center">{leave}</div>
        </div>
      </div>
    </div>
  );
}
