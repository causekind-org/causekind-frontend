"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function ThankYouContent() {
  const params = useSearchParams();
  const campaign = params.get("campaign") ?? "this campaign";
  const amount = Number(params.get("amount") ?? 0);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center bg-[#faf8f4] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 transition-colors duration-300 bg-grid-pattern px-6 py-12">
      <div className="mb-6 logo-icon-3d flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#b04a15] to-[#e07b3a] text-white shadow-md shadow-orange-900/18 shrink-0 anim-scale">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <Card className="anim-up anim-d1 w-full max-w-md glass-card card-shimmer rounded-2xl border-orange-100 dark:border-stone-850 shadow-xl dark:shadow-none text-center">
        <CardContent className="pt-8 pb-8 space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1c1108] dark:text-white">Thank you for your donation!</h1>
            <p className="text-stone-500 dark:text-stone-400 font-medium">
              Your donation of{" "}
              <span className="font-semibold text-stone-800 dark:text-stone-200">₹{amount.toLocaleString("en-IN")}</span>{" "}
              to <span className="font-semibold text-stone-800 dark:text-stone-200">{campaign}</span> is confirmed.
            </p>
          </div>
          <div className="rounded-xl bg-orange-50 dark:bg-zinc-900/50 border border-orange-100 dark:border-stone-800 p-4 text-sm text-stone-500 dark:text-stone-400 flex items-start gap-2.5">
            <Heart className="h-4 w-4 mt-0.5 shrink-0 text-[#b04a15] dark:text-[#ff8a65]" />
            <span>Your generosity makes a real difference. The campaign organiser has been notified of your donation.</span>
          </div>
          <div className="flex flex-col gap-2.5">
            <Link href="/dashboard">
              <Button className="btn-3d btn-shine w-full bg-[#1c1108] hover:bg-[#2d1f0a] dark:bg-[#b04a15] dark:hover:bg-[#8f3b10] text-white rounded-xl py-5 font-semibold text-sm">
                View my donations
              </Button>
            </Link>
            <Link href="/campaigns">
              <Button variant="outline" className="btn-3d w-full rounded-xl py-5 font-semibold text-sm border-orange-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-orange-50 dark:hover:bg-zinc-900 transition-all">
                Browse more campaigns
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ThankYouPage() {
  return <Suspense><ThankYouContent /></Suspense>;
}
