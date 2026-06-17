"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { getItemListings, requestListing, getMyProfile, type ItemListing, type UserProfile } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { ArrowLeft, Loader2, MapPin, Package, ShieldCheck, X } from "lucide-react";
import { useDynamicTranslations, TranslatedText } from "@/hooks/useDynamicTranslation";
import { useTranslations } from "next-intl";

export default function ItemDetailPage() {
  const t = useTranslations("itemDetail");
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [item, setItem] = useState<ItemListing | null>(null);
  const [translatedTitle, translatedDescription] = useDynamicTranslations([
    item?.title ?? null,
    item?.description ?? null,
  ]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [requestTarget, setRequestTarget] = useState<ItemListing | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const numId = Number(id);
    const fetches: Promise<unknown>[] = [
      getItemListings()
        .then((listings) => {
          const found = listings.find((l) => l.id === numId);
          if (found) {
            setItem(found);
          } else {
            setNotFound(true);
          }
        })
        .catch(() => setNotFound(true)),
    ];
    if (user) {
      fetches.push(getMyProfile().then(setMyProfile).catch(() => {}));
    }
    Promise.all(fetches).finally(() => setLoading(false));
  }, [id, user]);

  function openRequestModal() {
    if (!item) return;
    if (!user) { router.push("/login"); return; }
    if (!myProfile?.latitude || !myProfile?.longitude) {
      toast.error(t("setLocationToast"), {
        action: { label: t("setLocation"), onClick: () => router.push("/profile") },
      });
      return;
    }
    setRequestTarget(item);
    setReason("");
  }

  function closeRequestModal() {
    setRequestTarget(null);
    setReason("");
  }

  async function handleSubmitRequest() {
    if (!requestTarget) return;
    if (reason.trim().length < 20) {
      toast.error(t("toastReasonTooShort"));
      return;
    }
    setSubmitting(true);
    try {
      await requestListing(requestTarget.id, reason.trim());
      toast.success(t("toastSuccess"));
      closeRequestModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toastError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
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
          <Link href="/items">
            <ArrowLeft className="mr-1 size-4" /> {t("backToListings")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative bg-[#faf8f4] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 min-h-screen transition-colors duration-300">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Back link */}
        <Link
          href="/items"
          className="mb-6 inline-flex items-center gap-1 text-sm text-stone-500 dark:text-stone-400 hover:text-[#b04a15] dark:hover:text-[#e07b3a] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {t("backToListings")}
        </Link>

        <div className="overflow-hidden rounded-2xl border-2 border-orange-200 dark:border-orange-900/60 bg-white dark:bg-zinc-900 shadow-sm">
          {/* Image */}
          <div className="relative h-64 w-full bg-gradient-to-br from-orange-50 to-orange-100 dark:from-zinc-800 dark:to-zinc-900 overflow-hidden sm:h-80">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                sizes="(max-width:768px) 100vw, 768px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <Package className="h-16 w-16 text-orange-300 dark:text-zinc-600" />
                <span className="text-xs font-semibold text-orange-300 dark:text-zinc-600 uppercase tracking-wider">
                  {t("noPhoto")}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </div>

          {/* Content */}
          <div className="space-y-5 p-6">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-orange-100 dark:bg-zinc-800 text-[#b04a15] dark:text-[#e07b3a] border-0 font-semibold">
                <TranslatedText text={item.category} />
              </Badge>
              <Badge variant="outline" className="border-orange-200 dark:border-stone-800 text-stone-600 dark:text-stone-400">
                <TranslatedText text={item.condition} />
              </Badge>
              <Badge className="bg-[#b04a15] text-white border-0 text-xs">
                <ShieldCheck className="mr-1 h-3 w-3" /> {t("verified")}
              </Badge>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-extrabold tracking-tight text-[#963c0d] dark:text-white sm:text-3xl leading-tight">
              {translatedTitle ?? item.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-500 dark:text-stone-400">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-[#b04a15] dark:text-[#e07b3a]" />
                <TranslatedText text={item.city} />
                {item.pincode ? ` – ${item.pincode}` : ""}
              </span>
              <span>{t("qty")} <span className="font-semibold text-stone-700 dark:text-stone-200">{item.quantity}</span></span>
              <span>
                {t("by")}{" "}
                <span className="font-semibold text-stone-700 dark:text-stone-200">{item.donorName}</span>
              </span>
            </div>

            {/* Description */}
            {item.description && (
              <div className="rounded-xl border border-orange-100 dark:border-stone-800 bg-orange-50/40 dark:bg-zinc-950/40 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#b04a15] dark:text-[#e07b3a] mb-2">
                  {t("description")}
                </p>
                <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400 whitespace-pre-line">
                  {translatedDescription ?? item.description}
                </p>
              </div>
            )}

            {/* CTA */}
            <Button
              size="lg"
              className="btn-3d btn-shine w-full bg-[#1c1108] hover:bg-[#2d1f0a] dark:bg-[#b04a15] dark:hover:bg-[#8f3b10] text-white rounded-xl font-semibold"
              onClick={openRequestModal}
            >
              {t("requestThisItem")}
            </Button>
          </div>
        </div>
      </div>

      {/* Request modal — same flow as /items */}
      {requestTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-[#faf8f4] dark:bg-zinc-900 shadow-2xl">
            <div className="relative border-b border-orange-100 dark:border-stone-800 bg-gradient-to-r from-[#b04a15]/10 to-transparent px-5 py-4">
              <div className="pr-8">
                <p className="text-xs font-bold uppercase tracking-wider text-[#b04a15] dark:text-[#ff8a65]">
                  {t("requesting")}
                </p>
                <h2 className="mt-0.5 text-lg font-extrabold text-[#1c1108] dark:text-white leading-tight">
                  <TranslatedText text={requestTarget.title} />
                </h2>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  <TranslatedText text={requestTarget.category} /> · <TranslatedText text={requestTarget.condition} /> · Qty {requestTarget.quantity} · <TranslatedText text={requestTarget.city} />
                </p>
              </div>
              <button
                onClick={closeRequestModal}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-stone-400 hover:bg-orange-50 dark:hover:bg-zinc-800 hover:text-stone-600 transition"
                aria-label={t("closeModal")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <Label htmlFor="reason" className="mb-2 block font-semibold text-stone-700 dark:text-stone-300">
                  {t("whyNeedLabel")} <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder={t("reasonPlaceholder")}
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="rounded-xl border-orange-200 dark:border-stone-700 focus-visible:ring-[#b04a15]/20 resize-none"
                />
                <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
                  {t("reasonCharCount", { count: reason.length })}
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-[#b04a15]/20 bg-[#b04a15]/5 px-4 py-3">
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  {t("adminReviewNotice")}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-orange-100 dark:border-stone-800 bg-orange-50/30 dark:bg-zinc-950/30 px-5 py-4">
              <Button variant="ghost" onClick={closeRequestModal} disabled={submitting}>
                {t("cancel")}
              </Button>
              <Button
                onClick={handleSubmitRequest}
                disabled={submitting}
                className="btn-3d btn-shine bg-[#1c1108] hover:bg-[#2d1f0a] dark:bg-[#b04a15] dark:hover:bg-[#8f3b10] text-white rounded-xl px-6 font-semibold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("submitting")}
                  </>
                ) : (
                  t("submitRequest")
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
