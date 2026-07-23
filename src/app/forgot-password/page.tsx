"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { forgotPassword } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/Reveal";

export default function ForgotPasswordPage() {
  const t = useTranslations("forgotPassword");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100svh-4rem)] flex flex-col lg:flex-row bg-[#faf8f5] dark:bg-zinc-950">

      {/* ── LEFT: Asymmetric Brand/Image panel (hidden on mobile) ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-[40%] relative p-8 flex-col justify-between overflow-hidden bg-[#120c04] border-r border-stone-850 shrink-0">
        {/* Warmth glows */}
        <div className="absolute -top-24 left-1/4 h-[350px] w-[350px] rounded-full bg-[#b04a15]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 right-1/4 h-[350px] w-[350px] rounded-full bg-[#1e3a60]/15 blur-3xl pointer-events-none" />
        
        {/* Dot pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.05] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-2 mb-8">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#f0b97a] bg-[#b04a15]/25 border border-[#b04a15]/40 rounded-full px-3 py-1">
            Verified In-Kind
          </span>
        </div>

        <div className="relative z-10 space-y-6">
          <blockquote className="space-y-4">
            <p className="text-white text-3xl font-extrabold leading-tight tracking-tight font-serif">
              &ldquo;The smallest act of kindness is worth more than the grandest intention.&rdquo;
            </p>
            <footer className="flex items-center gap-2">
              <span className="block h-px w-8 bg-[#e07b3a]" />
              <cite className="text-[#f0b97a] text-sm not-italic font-bold">Oscar Wilde</cite>
            </footer>
          </blockquote>
        </div>

        {/* Decorative graphic / background image */}
        <div className="absolute inset-0 opacity-[0.25] pointer-events-none mix-blend-luminosity">
          <Image
            src="/Change_stories.webp"
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#120c04] via-transparent to-[#120c04]" />
        </div>

        <div className="relative z-10 text-[10px] font-bold text-white/30 uppercase tracking-widest">
          CauseKind India · 2026
        </div>
      </div>

      {/* ── RIGHT: Form panel ───────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-between bg-white dark:bg-zinc-950 px-6 py-10 lg:px-16 overflow-y-auto relative overflow-hidden">
        {/* Breathing warmth glows */}
        <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-[#b04a15]/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 rounded-full bg-[#1e3a60]/5 blur-3xl pointer-events-none" />

        <div />

        <div className="w-full max-w-[400px] mx-auto space-y-7 relative z-10">
          {/* Back button */}
          <Reveal>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to login
            </Link>
          </Reveal>

          {/* Heading */}
          <Reveal delay={40}>
            <div className="space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#b04a15]">Recovery</span>
              <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
                {t("title")}
              </h1>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {t("description")}
              </p>
            </div>
          </Reveal>

          {sent ? (
            <Reveal delay={80}>
              <div className="space-y-4 rounded-2xl bg-orange-50/50 dark:bg-zinc-900/50 border border-orange-100 dark:border-stone-800 p-6 text-center">
                <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">
                  {t.rich("sentMessage", {
                    email: () => <span className="font-semibold text-stone-800 dark:text-stone-200">{email}</span>,
                  })}
                </p>
                <Link href="/login" className="inline-block text-sm font-semibold text-[#b04a15] dark:text-[#e07b3a] hover:underline underline-offset-2">
                  {t("backToLogin")}
                </Link>
              </div>
            </Reveal>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <Reveal delay={80}>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
                    {t("emailLabel")}
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 px-4 py-3 text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-[#b04a15] focus:ring-2 focus:ring-[#b04a15]/20 transition"
                  />
                </div>
              </Reveal>

              <Reveal delay={120}>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-6 rounded-xl bg-[#b04a15] hover:bg-[#963c0d] dark:bg-[#b04a15] dark:hover:bg-[#963c0d] text-white font-extrabold text-sm transition-all shadow-md shadow-[#b04a15]/20 active:scale-[0.98]"
                >
                  {loading ? t("sending") : t("sendButton")}
                </Button>
              </Reveal>
            </form>
          )}
        </div>

        <div />
      </div>
    </div>
  );
}
