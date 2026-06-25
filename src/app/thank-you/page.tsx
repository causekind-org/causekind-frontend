"use client";

import { FEATURES } from "@/lib/features";
import { ComingSoon } from "@/components/ComingSoon";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

function Confetti() {
  const colors = ["#b04a15", "#e07b3a", "#f0b97a", "#1e3a60", "#4a7fba", "#fcd34d"];
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    left: `${3 + (i * 3.4) % 94}%`,
    delay: `${(i * 0.07) % 1.4}s`,
    duration: `${0.85 + (i * 0.055) % 0.85}s`,
    color: colors[i % colors.length],
    size: `${5 + i % 5}px`,
    isCircle: i % 3 === 0,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {pieces.map(p => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            left: p.left,
            top: "-8px",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.isCircle ? "50%" : "2px",
            animation: `confetti-fall ${p.duration} ${p.delay} ease-in forwards`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

function ThankYouContent() {
  const t = useTranslations("thankYou");
  const params = useSearchParams();
  const campaign = params.get("campaign") ?? t("defaultCampaign");
  const amount = Number(params.get("amount") ?? 0);

  useEffect(() => {
    toast.success(t("toastSuccess"), { duration: 5000 });
  }, []);

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center bg-[#faf8f4] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 transition-colors duration-300 bg-grid-pattern px-6 py-12">
      <Confetti />
      <div className="mb-6 logo-icon-3d flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#b04a15] to-[#e07b3a] text-white shadow-md shadow-orange-900/18 shrink-0 anim-scale">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <Card className="anim-up anim-d1 w-full max-w-md glass-card card-shimmer rounded-2xl border-orange-100 dark:border-stone-850 shadow-xl dark:shadow-none text-center">
        <CardContent className="pt-8 pb-8 space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-[#963c0d] dark:text-white">{t("heading")}</h1>
            <p className="text-stone-500 dark:text-stone-400 font-medium">
              {t.rich("donationConfirmed", {
                amount: () => <span className="font-semibold text-stone-800 dark:text-stone-200">₹{amount.toLocaleString("en-IN")}</span>,
                campaign: () => <span className="font-semibold text-stone-800 dark:text-stone-200">{campaign}</span>,
              })}
            </p>
          </div>
          <div className="rounded-xl bg-orange-50 dark:bg-zinc-900/50 border border-orange-100 dark:border-stone-800 p-4 text-sm text-stone-500 dark:text-stone-400 flex items-start gap-2.5">
            <Heart className="h-4 w-4 mt-0.5 shrink-0 text-[#b04a15] dark:text-[#e07b3a]" />
            <span>{t("generosityNote")}</span>
          </div>
          <div className="flex flex-col gap-2.5">
            <Link href="/dashboard">
              <Button className="btn-3d btn-shine w-full bg-[#963c0d] hover:bg-[#963c0d] dark:bg-[#b04a15] dark:hover:bg-[#963c0d] text-white rounded-xl py-5 font-semibold text-sm">
                {t("viewDonations")}
              </Button>
            </Link>
            <Link href="/campaigns">
              <Button variant="outline" className="btn-3d w-full rounded-xl py-5 font-semibold text-sm border-orange-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-orange-50 dark:hover:bg-zinc-900 transition-all">
                {t("browseCampaigns")}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ThankYouPage() {
  if (!FEATURES.money) return <ComingSoon feature="donate" />;
  return <ThankYouPageInner />;
}

function ThankYouPageInner() {
  return <Suspense><ThankYouContent /></Suspense>;
}
