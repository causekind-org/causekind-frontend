"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "@/components/AppLink";
import { CheckCircle2, Heart, Mail, ArrowRight, HandHeart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";

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
  const { user, isRestoring } = useAuth();

  const campaign = params.get("campaign") ?? t("defaultCampaign");
  const amount = Number(params.get("amount") ?? 0);
  // First name only. The form sends just that — a full name in a URL ends up in
  // browser history and any referrer header, and the greeting does not need it.
  const name = (params.get("name") ?? "").trim();

  useEffect(() => {
    toast.success(t("toastSuccess"), { duration: 5000 });
    // The copy is stable for the life of the page; re-firing the toast on every
    // render of the translator would stack duplicates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // `isRestoring` rather than `isLoading`: this only swaps a CTA's label and
  // href, which is exactly the presentational case the hook's own docs point at.
  // A guest CTA shown to a signed-in donor for one frame corrects itself; a
  // redirect would not.
  const signedIn = !isRestoring && !!user;

  // Sized to fit the fold rather than to a fixed rhythm. Everything vertical
  // here steps down on a short viewport — the page is one card with a CTA at the
  // bottom, and a CTA below the fold on a confirmation screen is the one thing
  // this layout cannot afford. `min-h` (not `h`) with padding means a viewport
  // too short even for the compact sizes scrolls normally instead of clipping.
  //
  // The subtracted 7.5rem is the site header, measured at 113px — NOT the 3.5rem
  // this used to subtract, which is what pushed the CTA below the fold: the
  // container was reserving a full viewport of height *below* a 113px header, so
  // it always overshot by ~57px. Over-subtracting is the safe direction (the
  // card simply centres in slightly less room); under-subtracting is not.
  //
  // `dvh`, not `vh`, so a mobile browser's collapsing URL bar does not do the
  // same thing again on a phone.
  return (
    <div className="relative min-h-[calc(100dvh-7.5rem)] flex flex-col items-center justify-center bg-[#faf8f4] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 transition-colors duration-300 bg-grid-pattern px-6 py-6 sm:py-10 [@media(max-height:760px)]:py-3">
      <Confetti />

      <div className="mb-3 sm:mb-5 [@media(max-height:760px)]:mb-2 logo-icon-3d flex h-12 w-12 sm:h-14 sm:w-14 [@media(max-height:760px)]:h-10 [@media(max-height:760px)]:w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#b04a15] to-[#e07b3a] text-white shadow-md shadow-orange-900/18 shrink-0 anim-scale">
        <CheckCircle2 className="h-6 w-6 sm:h-7 sm:w-7 [@media(max-height:760px)]:h-5 [@media(max-height:760px)]:w-5" />
      </div>

      <Card className="anim-up anim-d1 w-full max-w-md glass-card card-shimmer rounded-2xl border-orange-100 dark:border-stone-850 shadow-xl dark:shadow-none text-center">
        <CardContent className="pt-6 pb-6 sm:pt-7 sm:pb-7 space-y-4 sm:space-y-5 [@media(max-height:760px)]:pt-5 [@media(max-height:760px)]:pb-5 [@media(max-height:760px)]:space-y-3">
          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#963c0d] dark:text-white">
              {name ? t("headingNamed", { name }) : t("headingPlain")}
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">
              {t.rich("trustConfirmed", {
                amount: () => (
                  <span className="font-semibold text-stone-800 dark:text-stone-200">
                    ₹{amount.toLocaleString("en-IN")}
                  </span>
                ),
                campaign: () => (
                  <span className="font-semibold text-stone-800 dark:text-stone-200">{campaign}</span>
                ),
              })}
            </p>
          </div>

          {/* What happens next. This is the single most useful thing on the page:
              the receipt and certificate arrive by email, not on this screen, and
              a donor who does not know that reads the silence as a failure. */}
          <div className="rounded-xl bg-orange-50 dark:bg-zinc-900/50 border border-orange-100 dark:border-stone-800 p-3.5 text-left flex items-start gap-2.5">
            <Mail className="h-4 w-4 mt-0.5 shrink-0 text-[#b04a15] dark:text-[#e07b3a]" />
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-stone-700 dark:text-stone-200">{t("receiptTitle")}</p>
              <p className="text-[13px] text-stone-500 dark:text-stone-400 leading-snug">
                {/* The donor's address is never put in the URL, so it can only be
                    named when we already hold it from the session. */}
                {signedIn && user?.email
                  ? t("receiptToEmail", { email: user.email })
                  : t("receiptToYou")}
              </p>
            </div>
          </div>

          {/* Guests get the invitation; signed-in donors get their donation
              history. Neither is sent to /campaigns, which is still behind
              FEATURES.money.

              Plain text rather than a second bordered box: two stacked panels
              above the buttons pushed the CTA off the fold, and the invitation is
              the less important of the two, so it carries less weight. */}
          {!signedIn && (
            <p className="flex items-start justify-center gap-2 px-1 text-[13px] leading-snug text-stone-500 dark:text-stone-400">
              <Heart className="h-3.5 w-3.5 mt-[3px] shrink-0 text-[#b04a15] dark:text-[#e07b3a]" />
              <span className="text-left">{t("guestInvite")}</span>
            </p>
          )}

          <div className="flex flex-col gap-2">
            {signedIn ? (
              <Link href="/dashboard">
                <Button className="btn-3d btn-shine w-full bg-[#963c0d] hover:bg-[#963c0d] dark:bg-[#b04a15] dark:hover:bg-[#963c0d] text-white rounded-xl py-4 font-semibold text-sm">
                  {t("viewMyDonations")}
                </Button>
              </Link>
            ) : (
              <Link href="/register">
                <Button className="btn-3d btn-shine w-full bg-[#963c0d] hover:bg-[#963c0d] dark:bg-[#b04a15] dark:hover:bg-[#963c0d] text-white rounded-xl py-4 font-semibold text-sm">
                  <HandHeart className="h-4 w-4" />
                  {t("joinCauseKind")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Link href="/">
              <Button
                variant="outline"
                className="btn-3d w-full rounded-xl py-4 font-semibold text-sm border-orange-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-orange-50 dark:hover:bg-zinc-900 transition-all"
              >
                {t("backHome")}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Deliberately NOT behind `FEATURES.money`.
 *
 * It used to be, and the result was that every donor who completed a real
 * payment at /donate/money landed on the "Online Donations — Coming Soon"
 * screen. That flag postpones monetary CAMPAIGNS and the old /donate page; the
 * trust donation flow shipped separately and is live, so gating its one
 * confirmation screen on the same flag told paying donors the feature did not
 * exist yet.
 *
 * /campaigns and /donate stay gated, so nothing else reaches this page.
 */
export default function ThankYouPage() {
  return (
    <Suspense>
      <ThankYouContent />
    </Suspense>
  );
}
