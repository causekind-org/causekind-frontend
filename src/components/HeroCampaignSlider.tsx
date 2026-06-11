"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Heart, MapPin, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Campaign } from "@/lib/api";
import { initiateDonation } from "@/lib/api";

const TIMER_MS = 2600;

const CATEGORY_IMAGES: Record<string, string[]> = {
  Medical:    ["/images/medical-1.png", "/images/medical-2.png"],
  Education:  ["/images/hero-7.jpg"],
  Livelihood: ["/images/hero-3.jpg"],
  Community:  ["/images/hero-6.jpg"],
};

function getCardImage(category: string, id: number): string {
  const imgs = CATEGORY_IMAGES[category];
  return imgs?.length ? imgs[id % imgs.length] : "/images/hero-1.jpg";
}

/* ─── circular slot distance (−1 = left, 0 = center, +1 = right) ─── */
function slotOf(i: number, idx: number, total: number): number {
  if (total <= 1) return i === idx ? 0 : 99;
  let d = ((i - idx) % total + total) % total;
  if (d > total / 2) d -= total;
  return d;
}

/* ─── Glassmorphism arrow (No scale popup animation on hover) ─── */
function GlassArrow({
  dir,
  onClick,
}: {
  dir: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={dir === "left" ? "Previous campaign" : "Next campaign"}
      className={[
        "group absolute top-1/2 -translate-y-1/2 z-40",
        dir === "left" ? "-left-5 sm:-left-6" : "-right-5 sm:-right-6",
        "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center",
        "bg-white border border-stone-200/80 text-stone-700 shadow-md",
        "hover:bg-orange-50 hover:text-[#e07b3a] hover:border-[#e07b3a]/30",
        "transition-all duration-300 ease-out",
      ].join(" ")}
    >
      {dir === "left" ? (
        <ChevronLeft className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
      ) : (
        <ChevronRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
      )}
    </button>
  );
}

/* ─── Main hero carousel ─── */
export function HeroCampaignSlider({
  campaigns,
  loading,
}: {
  campaigns: Campaign[];
  loading: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [donatingId, setDonatingId] = useState<number | null>(null);
  const router = useRouter();

  const go = useCallback(
    (next: number) =>
      setIdx(((next % campaigns.length) + campaigns.length) % campaigns.length),
    [campaigns.length]
  );
  const prev = useCallback(() => go(idx - 1), [idx, go]);
  const next = useCallback(() => go(idx + 1), [idx, go]);

  /* reset on campaign list change */
  useEffect(() => { setIdx(0); }, [campaigns.length]);

  /* auto-rotate */
  useEffect(() => {
    if (paused || campaigns.length <= 1) return;
    const t = setInterval(next, TIMER_MS);
    return () => clearInterval(t);
  }, [paused, next, campaigns.length]);

  async function handleDonate(e: React.MouseEvent, campaign: Campaign) {
    e.preventDefault();
    e.stopPropagation();
    const token =
      typeof window !== "undefined" ? localStorage.getItem("ck_token") : null;
    if (!token) { router.push("/login"); return; }

    const pct = Math.min(100, Math.round((campaign.amountRaised / campaign.targetAmount) * 100));
    if (pct >= 100) { toast.info("Goal already reached!"); return; }

    const amount = Math.min(500, Math.max(1, campaign.targetAmount - campaign.amountRaised));
    setDonatingId(campaign.id);
    try {
      await new Promise<void>((resolve, reject) => {
        if ((window as any).Razorpay) return resolve();
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Could not load Razorpay"));
        document.body.appendChild(s);
      });
      const order = await initiateDonation(campaign.id, amount);
      const rzp = new (window as any).Razorpay({
        key: order.razorpayKeyId,
        amount: order.amountInPaise,
        currency: order.currency,
        name: "CauseKind",
        description: campaign.title,
        order_id: order.razorpayOrderId,
        theme: { color: "#b04a15" },
        handler: () =>
          router.push(
            `/thank-you?campaign=${encodeURIComponent(campaign.title)}&amount=${amount}&campaignId=${campaign.id}`
          ),
        modal: { ondismiss: () => toast.info("Payment cancelled.") },
      });
      rzp.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDonatingId(null);
    }
  }

  /* ── loading skeleton ── */
  if (loading)
    return (
      <div className="flex items-center justify-center h-[220px] sm:h-[260px] md:h-[320px] w-full max-w-[95%] sm:max-w-[540px] md:max-w-[760px] lg:max-w-[1100px] xl:max-w-[1240px]">
        <div className="h-5 w-5 rounded-full border-2 border-white/25 border-t-white/75 animate-spin" />
      </div>
    );

  if (!campaigns.length) return null;

  return (
    <div
      className="relative w-full max-w-[95%] sm:max-w-[540px] md:max-w-[760px] lg:max-w-[1100px] xl:max-w-[1240px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Card track — overflow visible so side cards peek ── */}
      <div className="relative h-[220px] sm:h-[260px] md:h-[320px] overflow-visible">
        {campaigns.map((c, i) => {
          const slot = slotOf(i, idx, campaigns.length);
          const isCenter = slot === 0;
          const isLeft = slot === -1;
          const isRight = slot === 1;
          const nearby = Math.abs(slot) <= 1;

          const pct = Math.min(100, Math.round((c.amountRaised / c.targetAmount) * 100));
          const isLoading = donatingId === c.id;

          /* transform values */
          const translateX = isCenter ? "0%"
            : isLeft ? "-81%"
              : isRight ? "81%"
                : `${slot > 0 ? 120 : -120}%`;

          const scale = isCenter ? 1 : nearby ? 0.85 : 0.65;
          const opacity = isCenter ? 1 : nearby ? 0.16 : 0;
          const blur = isCenter ? "0px" : nearby ? "1px" : "5px";
          const zIndex = isCenter ? 10 : nearby ? 5 : 0;

          /* split title on first comma if exists to style dynamically */
          const parts = c.title.split(",");
          const firstPart = parts[0];
          const secondPart = parts.slice(1).join(",");

          return (
            <div
              key={c.id}
              aria-hidden={!isCenter}
              className="absolute inset-0 will-change-transform"
              style={{
                transform: `translateX(${translateX}) scale(${scale})`,
                opacity,
                filter: `blur(${blur})`,
                zIndex,
                pointerEvents: isCenter ? "auto" : "none",
                transition:
                  "transform 0.65s cubic-bezier(0.16,1,0.3,1), opacity 0.60s ease, filter 0.60s ease",
              }}
            >
              {/* ── Light cream card ── */}
              <div className="h-full rounded-[24px] sm:rounded-[32px] flex flex-row text-stone-900 overflow-hidden shadow-xl"
                style={{
                  background: "#fffbf7",
                  border: "1px solid rgba(240,185,122,0.25)",
                  boxShadow: "0 15px 35px rgba(28,16,8,0.12), 0 2px 0 rgba(255,255,255,0.8) inset",
                }}
              >
                {/* Left text details */}
                <div className="flex-1 flex flex-col justify-between p-5 sm:p-7 md:p-9 overflow-hidden">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[9px] sm:text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-md border border-[#e07b3a]/20"
                        style={{ background: "rgba(255,87,34,0.08)", color: "#e07b3a" }}
                      >
                        {c.category}
                      </span>
                      <span className="text-[10px] text-stone-500 font-bold flex items-center gap-0.5">
                        <MapPin className="h-3 w-3 text-[#e07b3a]" />
                        {c.city}
                      </span>
                    </div>

                    <h3 className="font-black text-stone-900 text-sm sm:text-lg md:text-xl lg:text-[1.65rem] leading-tight tracking-tight line-clamp-2">
                      {secondPart ? (
                        <>
                          <span className="text-[#e07b3a]">{firstPart},</span>
                          <span className="text-stone-900">{secondPart}</span>
                        </>
                      ) : (
                        c.title
                      )}
                    </h3>
                    
                    <p className="text-stone-500 text-xs sm:text-sm font-semibold leading-relaxed line-clamp-2">
                      {c.description}
                    </p>
                  </div>

                  {/* Progress bar & Actions row (aligned vertically/horizontally) */}
                  <div className="space-y-3">
                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] sm:text-[11px] font-bold text-stone-600">
                        <span>₹{new Intl.NumberFormat("en-IN").format(c.amountRaised)} raised</span>
                        <span>Target: ₹{new Intl.NumberFormat("en-IN").format(c.targetAmount)}</span>
                        <span className="text-[#e07b3a]">{pct}%</span>
                      </div>
                      <div className="h-[5px] rounded-full overflow-hidden bg-stone-200/60">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background: "linear-gradient(90deg, #e07b3a, #e07b3a)",
                          }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => handleDonate(e, c)}
                        disabled={isLoading || pct >= 100}
                        className="hero-donate-btn flex items-center justify-center gap-1.5 px-6 py-2 sm:py-2.5 rounded-lg text-white text-xs font-black uppercase tracking-wider transition-all duration-200 hover:brightness-105 active:scale-95 disabled:opacity-55 disabled:cursor-not-allowed"
                        style={{
                          background: "#e07b3a",
                          boxShadow: "0 4px 12px rgba(255,87,34,0.25)",
                        }}
                      >
                        {isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Donate Now"
                        )}
                      </button>

                      <Link
                        href={`/campaigns/${c.id}`}
                        className="px-3.5 py-2 rounded-lg text-stone-600 text-xs font-extrabold uppercase tracking-wider transition-all duration-200 hover:text-stone-900 border border-stone-300 hover:bg-stone-50"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Right image part */}
                <div className="w-[35%] sm:w-[42%] md:w-[46%] h-full relative shrink-0 overflow-hidden">
                  <Image
                    src={getCardImage(c.category, c.id)}
                    alt={c.title}
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 640px) 35vw, (max-width: 1024px) 42vw, 46vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#fffbf7]/20 via-transparent to-transparent" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Glassmorphism arrows ── */}
      {campaigns.length > 1 && (
        <>
          <GlassArrow dir="left" onClick={prev} />
          <GlassArrow dir="right" onClick={next} />
        </>
      )}

      {/* ── Dot indicators ── */}
      {campaigns.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {campaigns.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={`Go to campaign ${i + 1}`}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === idx ? "1.5rem" : "0.375rem",
                height: "0.375rem",
                background: i === idx ? "#e07b3a" : "rgba(255,255,255,0.32)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
