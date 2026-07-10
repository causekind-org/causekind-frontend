"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getMyItemListings, type ItemListing } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ArrowLeft, Loader2, MapPin, Package, ShieldCheck, Navigation, Truck, Lock, Pencil } from "lucide-react";
import { useDynamicTranslations, TranslatedText } from "@/hooks/useDynamicTranslation";
import { useTranslations } from "next-intl";

// Need-first privacy: listings are private donor inventory. This page is the
// donor's own listing detail — there is no cross-user listing browsing anymore,
// so it loads from /items/mine only.
export default function ItemDetailPage() {
  const t = useTranslations("itemDetail");
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();

  const [item, setItem] = useState<ItemListing | null>(null);
  const [translatedTitle, translatedDescription] = useDynamicTranslations([
    item?.title ?? null,
    item?.description ?? null,
  ]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    const numId = Number(id);
    getMyItemListings()
      .then((listings) => {
        const found = listings.find((l) => l.id === numId);
        if (found) {
          setItem(found);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, user, authLoading]);

  if (loading || authLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin text-[#b04a15]" />
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Package className="mx-auto mb-4 h-12 w-12 text-orange-300 dark:text-zinc-600" />
        <p className="mb-2 text-lg font-semibold text-stone-700 dark:text-stone-300">{t("listingNotFound")}</p>
        <p className="mb-6 text-sm text-stone-400 dark:text-stone-500">
          {t("listingNotFoundSubtext")}
        </p>
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-1 size-4" /> {t("backToListings")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative bg-[#faf8f4] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 min-h-screen transition-colors duration-300 pb-20">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-10 w-[400px] h-[400px] rounded-full bg-[#b04a15]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-[450px] h-[450px] rounded-full bg-[#1e3a60]/5 blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-6xl px-4 py-8 relative z-10">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-bold text-stone-500 dark:text-stone-400 hover:text-[#b04a15] dark:hover:text-[#e07b3a] transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> {t("backToListings")}
        </Link>

        {/* Asymmetric layout grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8 items-start">
          {/* LEFT: Item Image and Info */}
          <div className="space-y-6">
            {/* Image Container with premium border/glow */}
            <div className="relative overflow-hidden rounded-3xl border-2 border-orange-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-md">
              <div className="relative h-72 w-full bg-gradient-to-br from-orange-50 to-orange-100 dark:from-zinc-800 dark:to-zinc-900 overflow-hidden md:h-[400px] group">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width:768px) 100vw, 768px"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    priority
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3">
                    <Package className="h-20 w-20 text-orange-200 dark:text-zinc-700" />
                    <span className="text-xs font-black text-orange-300 dark:text-zinc-600 uppercase tracking-widest">
                      {t("noPhoto")}
                    </span>
                  </div>
                )}
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>

            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-orange-100 dark:bg-zinc-900 text-[#b04a15] dark:text-[#ff8a65] border-0 font-bold px-3 py-1 rounded-lg">
                <TranslatedText text={item.category} />
              </Badge>
              {item.condition && (
                <Badge variant="outline" className="border-orange-200 dark:border-zinc-800 text-stone-600 dark:text-stone-305 font-bold px-3 py-1 rounded-lg bg-orange-50/20 dark:bg-zinc-950/20">
                  <TranslatedText text={item.condition} />
                </Badge>
              )}
              <Badge className="bg-gradient-to-r from-[#b04a15] to-[#e07b3a] text-white border-0 text-xs font-bold px-3 py-1 rounded-lg">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" /> {item.status.replaceAll("_", " ")}
              </Badge>
            </div>

            {/* Title & Description Container */}
            <div className="rounded-3xl border border-stone-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-sm space-y-6 relative overflow-hidden">
              {/* Left accent stripe */}
              <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#b04a15]" />

              <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-white leading-tight">
                {translatedTitle ?? item.title}
              </h1>

              {item.description && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#b04a15] dark:text-[#ff8a65]">
                    {t("description")}
                  </h4>
                  <p className="text-base leading-relaxed text-stone-600 dark:text-stone-300 whitespace-pre-line">
                    {translatedDescription ?? item.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Listing details & owner actions (Sticky) */}
          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="rounded-3xl border border-orange-200/80 dark:border-zinc-805/80 bg-white dark:bg-zinc-900 p-6 shadow-md relative overflow-hidden">
              {/* Warm decorative background blur inside card */}
              <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-[#b04a15]/5 rounded-full pointer-events-none" />

              <div className="space-y-5">
                {/* Quantity */}
                <div className="border-b border-stone-100 dark:border-zinc-850 pb-4">
                  <p className="text-[10px] font-black text-stone-400 dark:text-zinc-500 uppercase tracking-widest">
                    Quantity Listed
                  </p>
                  <p className="text-4xl font-black text-stone-900 dark:text-white tracking-tight mt-1">
                    {item.quantity} <span className="text-lg font-bold text-stone-400">units</span>
                  </p>
                </div>

                {/* Location & delivery details list */}
                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-[#b04a15] dark:text-[#ff8a65] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-stone-850 dark:text-stone-200">Location</p>
                      <p className="text-stone-500 dark:text-stone-400 text-xs mt-0.5">
                        <TranslatedText text={item.city ?? ""} />
                        {item.pincode ? ` – ${item.pincode}` : ""}
                      </p>
                    </div>
                  </div>

                  {item.maximumDeliveryRadius !== null && (
                    <div className="flex items-start gap-3">
                      <Navigation className="h-5 w-5 text-[#b04a15] dark:text-[#ff8a65] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-stone-850 dark:text-stone-200">Delivery Range</p>
                        <p className="text-stone-500 dark:text-stone-400 text-xs mt-0.5">
                          Up to {item.maximumDeliveryRadius} km
                        </p>
                      </div>
                    </div>
                  )}

                  {item.transportPayerPreference && (
                    <div className="flex items-start gap-3">
                      <Truck className="h-5 w-5 text-[#b04a15] dark:text-[#ff8a65] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-stone-850 dark:text-stone-200">Transport Payer</p>
                        <p className="text-[#b04a15] dark:text-[#ff8a65] text-xs mt-0.5 uppercase tracking-wide font-black">
                          {item.transportPayerPreference}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Owner action */}
                <Button
                  size="lg"
                  asChild
                  className="w-full btn-3d btn-shine bg-[#120c04] hover:bg-[#251b0d] dark:bg-[#b04a15] dark:hover:bg-[#a03d0d] text-white rounded-2xl py-6 font-bold text-sm tracking-wide shadow-md transition-all"
                >
                  <Link href={`/items/${item.id}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit Listing
                  </Link>
                </Button>
              </div>
            </div>

            {/* Privacy banner */}
            <div className="rounded-3xl border border-stone-200/50 dark:border-zinc-800/80 bg-stone-50/50 dark:bg-zinc-950/20 p-5 text-xs text-stone-500 dark:text-stone-400 leading-relaxed space-y-2">
              <p className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> Private inventory
              </p>
              <p>
                Your listing is never shown publicly. When a verified request matches it,
                we&apos;ll ask you to confirm the item is still available — only then does the
                recipient hear about it.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
