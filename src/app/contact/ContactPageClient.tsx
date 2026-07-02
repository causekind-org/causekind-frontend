"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CursorGlowHero } from "@/components/CursorGlowHero";
import { Reveal } from "@/components/Reveal";
import { ArrowLeft, ArrowRight, Copy, Check, ExternalLink } from "lucide-react";

const TERRACOTTA = "#b04a15";
const INK = "#1e3a60";

const SUPPORT_EMAIL = "support@causekind.com";
const SUPPORT_PHONE_DISPLAY = "+91 77199 38619";
const SUPPORT_PHONE_TEL = "+917719938619";
const WHATSAPP_URL = "https://wa.me/917719938619";

const ADDRESS_LINES = [
  "3rd Floor, Apoorva Bldg, Flat no. 19,",
  "Vartak School Road, Veer Savarkar Nagar,",
  "Anand Nagar, Vasai West, Vasai-Virar,",
  "Maharashtra 401202",
];

function CopyableChannel({
  label, display, href, copyValue, delay,
}: { label: string; display: string; href: string; copyValue?: string; delay: number }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    if (!copyValue) return;
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard permission denied — the row still works as a plain link
    }
  }

  return (
    <Reveal delay={delay}>
      <div className="group py-8 sm:py-10 border-b border-[#e5e2d5]/60 dark:border-zinc-800 first:border-t">
        <div className="flex items-center justify-between gap-6">
          <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="flex-1 min-w-0">
            <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 mb-2">{label}</p>
            <span className="relative inline-block text-2xl sm:text-4xl font-extrabold text-stone-900 dark:text-white group-hover:text-[#b04a15] dark:group-hover:text-[#e07b3a] transition-colors duration-300 break-all">
              {display}
              <span
                className="absolute left-0 -bottom-1 h-[2px] w-0 group-hover:w-full transition-all duration-300 ease-out"
                style={{ background: TERRACOTTA }}
              />
            </span>
          </a>

          {copyValue ? (
            <button
              onClick={handleCopy}
              aria-label={`Copy ${label.toLowerCase()}`}
              className="shrink-0 relative w-11 h-11 rounded-full border border-[#e5e2d5] dark:border-zinc-700 flex items-center justify-center hover:border-[#b04a15]/40 transition-colors"
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span key="check" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Check className="w-4 h-4 text-emerald-600" />
                  </motion.span>
                ) : (
                  <motion.span key="copy" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Copy className="w-4 h-4 text-stone-400" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          ) : (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${label.toLowerCase()}`}
              className="shrink-0 w-11 h-11 rounded-full border border-[#e5e2d5] dark:border-zinc-700 flex items-center justify-center hover:border-[#b04a15]/40 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-stone-400" />
            </a>
          )}
        </div>
        {copyValue && (
          <span className="text-[11px] text-stone-400 dark:text-stone-500">
            {copied ? "Copied to clipboard" : "Tap the address to email, or copy it"}
          </span>
        )}
      </div>
    </Reveal>
  );
}

function PulseDot() {
  return (
    <span className="relative inline-flex w-2.5 h-2.5 shrink-0 mt-1.5">
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ background: TERRACOTTA }}
        animate={{ scale: [1, 2.6], opacity: [0.5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
      />
      <span className="relative w-2.5 h-2.5 rounded-full" style={{ background: TERRACOTTA }} />
    </span>
  );
}

export function ContactPageClient() {
  return (
    <div className="bg-[#faf8f5] dark:bg-zinc-950 min-h-screen">
      {/* ── Hero ── */}
      <CursorGlowHero>
        <div className="relative mx-auto max-w-7xl px-6 sm:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-stone-400 hover:text-white text-xs font-semibold mb-8 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to home
          </Link>
          <div className="grid lg:grid-cols-[1fr_auto] items-end gap-8">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-[#f0b97a] mb-3">
                Get in touch
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.05]">
                No bots. No middlemen.<br />Just us.
              </h1>
            </div>
            <p className="text-sm text-stone-400 font-medium leading-relaxed max-w-xs lg:text-right lg:pb-1">
              Every message reaches our team directly — same principle as every donation on the platform.
            </p>
          </div>
        </div>
      </CursorGlowHero>

      {/* ── Direct channels — oversized typographic links, no cards ── */}
      <div className="mx-auto max-w-4xl px-6 sm:px-10 py-16 sm:py-20">
        <Reveal className="mb-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#b04a15]">Direct channels</span>
        </Reveal>

        <CopyableChannel
          label="Email"
          display={SUPPORT_EMAIL}
          href={`mailto:${SUPPORT_EMAIL}`}
          copyValue={SUPPORT_EMAIL}
          delay={0}
        />
        <CopyableChannel
          label="Phone"
          display={SUPPORT_PHONE_DISPLAY}
          href={`tel:${SUPPORT_PHONE_TEL}`}
          copyValue={SUPPORT_PHONE_TEL}
          delay={80}
        />
        <CopyableChannel
          label="WhatsApp"
          display="Chat with us"
          href={WHATSAPP_URL}
          delay={160}
        />
      </div>

      {/* ── Where to find us + grievance officer — asymmetric, no cards ── */}
      <div className="border-t border-[#e5e2d5]/60 dark:border-zinc-800">
        <div className="mx-auto max-w-4xl px-6 sm:px-10 py-16 sm:py-20 grid sm:grid-cols-2 gap-12 sm:gap-16">
          <Reveal>
            <span className="text-[11px] font-black uppercase tracking-widest text-[#b04a15] mb-4 block">Registered office</span>
            <div className="flex items-start gap-3">
              <PulseDot />
              <address className="not-italic text-lg text-stone-800 dark:text-stone-100 font-semibold leading-relaxed">
                {ADDRESS_LINES.map((line) => (
                  <span key={line} className="block">{line}</span>
                ))}
              </address>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <span className="text-[11px] font-black uppercase tracking-widest mb-4 block" style={{ color: INK }}>
              Grievance officer
            </span>
            <dl className="space-y-4">
              <div>
                <dt className="text-xs text-stone-400 font-semibold">Name</dt>
                <dd className="text-lg font-bold text-stone-800 dark:text-stone-100">Atharva Raorane</dd>
              </div>
              <div>
                <dt className="text-xs text-stone-400 font-semibold">Email</dt>
                <dd className="text-lg font-bold text-stone-800 dark:text-stone-100 break-all">Atharvaraorane147@gmail.com</dd>
              </div>
              <div>
                <dt className="text-xs text-stone-400 font-semibold">Response time</dt>
                <dd className="text-lg font-bold text-stone-800 dark:text-stone-100">Within 48 hours</dd>
              </div>
            </dl>
          </Reveal>
        </div>
      </div>

      {/* ── Closing CTA ── */}
      <Reveal className="border-t border-[#e5e2d5]/60 dark:border-zinc-800">
        <div className="mx-auto max-w-4xl px-6 sm:px-10 py-16 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-extrabold text-stone-900 dark:text-white">
              Prefer to just start giving?
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
              Skip the message — see what&apos;s needed near you right now.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              href="/requests"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-extrabold text-sm border border-[#e5e2d5] dark:border-zinc-700 text-stone-700 dark:text-stone-300 hover:border-[#b04a15]/40 hover:text-[#b04a15] transition-all duration-200"
            >
              Browse requests
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-extrabold text-sm text-white shadow-md hover:opacity-90 active:scale-95 transition-all duration-200"
              style={{ background: TERRACOTTA }}
            >
              Become a donor <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
