"use client";

import Link from "next/link";
import Image from "next/image";
import type { Campaign } from "@/lib/api";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Target, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDynamicTranslations, TranslatedText } from "@/hooks/useDynamicTranslation";

type Props = { campaign: Campaign };

const CATEGORY_IMAGES: Record<string, string[]> = {
  Medical:    ["/images/medical-1.webp", "/images/medical-2.webp"],
  Education:  ["/images/hero-7.webp"],
  Livelihood: ["/images/hero-3.webp"],
  Community:  ["/images/hero-6.webp"],
};

function getCardImage(category: string, id: number): string {
  const imgs = CATEGORY_IMAGES[category];
  return imgs?.length ? imgs[id % imgs.length] : "/images/hero-1.webp";
}

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function CampaignCard({ campaign }: Props) {
  const t = useTranslations("campaigns");
  const [title, description] = useDynamicTranslations([campaign.title, campaign.description]);
  const pct = Math.min(100, Math.round((campaign.amountRaised / campaign.targetAmount) * 100));

  return (
    <Card className="card-3d card-shimmer card-glow flex flex-col h-full overflow-hidden glass-card rounded-2xl group border-stone-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all duration-300">
      {/* Top-Heavy Image Container (Flush with top/left/right) */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-stone-100 dark:bg-zinc-950 shrink-0">
        <Image src={campaign.imageUrl || getCardImage(campaign.category, campaign.id)} alt={campaign.title} fill
          sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
        
        {/* Netflix-style hover overlay */}
        <div className="absolute inset-0 bg-black/80 flex flex-col justify-center p-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none text-center">
          <p className="text-white text-sm line-clamp-6 font-medium mb-2 drop-shadow-md">
            {description ?? campaign.description}
          </p>
          <div className="text-xs text-stone-300 font-semibold drop-shadow-sm mt-2 border-t border-white/20 pt-2">
            Organized by: {campaign.doneeName}
          </div>
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        
        {/* Floating Category and Location Glassmorphic tags */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
          <Badge className="bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md text-[#006c49] dark:text-[#4edea3] border border-white/20 dark:border-white/10 font-bold hover:bg-white/80 text-[10px] px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
            <TranslatedText text={campaign.category} />
          </Badge>
          <span className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white font-bold border border-white/10 shadow-xs">
            <MapPin className="size-3 text-[#ffbe76] shrink-0" />
            <TranslatedText text={campaign.city} />
          </span>
        </div>
      </div>

      {/* Details Container with generous 24px (p-6) padding */}
      <div className="flex flex-col flex-1 p-6">
        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 leading-snug line-clamp-2 mb-2 group-hover:text-[#006c49] dark:group-hover:text-[#4edea3] transition-colors duration-200"
            style={{ fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif' }}>
          {title ?? campaign.title}
        </h3>
        <p className="text-sm text-stone-500 dark:text-stone-400 line-clamp-2 mb-5 leading-relaxed font-medium flex-1">
          {description ?? campaign.description}
        </p>

        {/* Progress & Fundraising Details */}
        <div className="mt-auto space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
              <span>{t("progress")}</span>
              <span className="text-stone-900 dark:text-stone-100 font-extrabold">{pct}%</span>
            </div>
            {/* Thick 12px Progress Bar track */}
            <div className="w-full bg-[#f3f4f6] dark:bg-zinc-800 rounded-full h-3 overflow-hidden border border-stone-100 dark:border-zinc-800/40">
              <div className="bg-gradient-to-r from-[#006c49] to-[#f0b97a] h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="flex justify-between text-xs items-center pt-1">
            <div className="flex flex-col">
              <span className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider">{t("raised")}</span>
              <span className="font-extrabold text-[#006c49] dark:text-[#4edea3] text-base">{formatINR(campaign.amountRaised)}</span>
            </div>
            
            <div className="flex items-center gap-1.5 bg-[#006c49]/10 dark:bg-[#4edea3]/10 text-[#006c49] dark:text-[#4edea3] font-black px-2.5 py-1 rounded-full text-[10px] tracking-wider uppercase">
              {pct}% Funded
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-wider">{t("goal")}</span>
              <span className="font-bold text-stone-700 dark:text-stone-300 text-sm">{formatINR(campaign.targetAmount)}</span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              className="btn-3d w-full bg-[#006c49] hover:bg-[#005236] text-white dark:bg-[#006c49] dark:hover:bg-[#005236] rounded-xl py-6 font-bold text-sm active:scale-98 transition-all duration-200 shadow-md"
              asChild>
              <Link href={`/campaigns/${campaign.id}`}>
                {t("donateNow")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
