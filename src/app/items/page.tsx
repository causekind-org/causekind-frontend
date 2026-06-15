"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useDynamicTranslation, useDynamicTranslations, TranslatedText } from "@/hooks/useDynamicTranslation";
import { getItemListings, requestListing, getMyProfile, type ItemListing, type UserProfile } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Reveal } from "@/components/Reveal";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { Loader2, MapPin, PackageOpen, Search, SearchX, Package, X } from "lucide-react";
import Link from "next/link";

const CATEGORIES = ["All", "Education", "Clothing", "Furniture", "Electronics", "Household", "Sports", "Medical aid"];

function ItemCardSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-stone-100 dark:border-zinc-800">
      <div className="w-14 h-14 rounded-xl bg-stone-100 dark:bg-zinc-800 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="h-3 w-1/3 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
      </div>
      <div className="w-20 h-8 bg-stone-100 dark:bg-zinc-800 rounded-xl animate-pulse shrink-0" />
    </div>
  );
}

function ItemCard({ item, onRequest }: { item: ItemListing; onRequest: (item: ItemListing) => void }) {
  const t = useTranslations("listings");
  const [title] = useDynamicTranslations([item.title]);
  return (
    <div className="flex items-center gap-4 px-4 py-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-stone-100 dark:border-zinc-800 transition-shadow hover:shadow-md">
      <Link href={`/items/${item.id}`} className="relative w-14 h-14 rounded-xl overflow-hidden bg-orange-50 dark:bg-zinc-800 shrink-0">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.title} fill sizes="56px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-6 w-6 text-orange-200 dark:text-zinc-600" />
          </div>
        )}
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/items/${item.id}`}>
          <p className="font-bold text-stone-900 dark:text-stone-100 text-sm leading-tight line-clamp-1 hover:text-[#C17A3A] transition-colors">{title ?? item.title}</p>
        </Link>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
          {t("by")} {item.donorName}, <TranslatedText text={item.city} />
        </p>
        <p className="text-xs text-stone-400 dark:text-stone-500">{t("qty")}: {item.quantity}</p>
      </div>
      <button
        onClick={() => onRequest(item)}
        className="shrink-0 px-4 py-1.5 bg-[#C17A3A] hover:bg-[#a86430] dark:bg-[#C17A3A] dark:hover:bg-[#a86430] text-white text-sm font-semibold rounded-xl transition-colors active:scale-95"
      >
        {t("requestItem").split(" ")[0]}
      </button>
    </div>
  );
}

export default function ItemsPage() {
  const t = useTranslations("listings");
  const { user } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<ItemListing[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [requestTarget, setRequestTarget] = useState<ItemListing | null>(null);
  const modalTitle = useDynamicTranslation(requestTarget?.title ?? null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetches: Promise<unknown>[] = [
      getItemListings().then(setItems).catch(() => toast.error("Failed to load item listings")),
    ];
    if (user) {
      fetches.push(getMyProfile().then(setMyProfile).catch(() => {}));
    }
    Promise.all(fetches).finally(() => setLoading(false));
  }, [user]);

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    return (!q || i.title.toLowerCase().includes(q) || i.city.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
      && (category === "All" || i.category === category);
  });

  function openRequestModal(item: ItemListing) {
    if (!user) { router.push("/login"); return; }
    if (!myProfile?.latitude || !myProfile?.longitude) {
      toast.error("Please set your location in your profile before requesting items.", {
        action: { label: "Set location", onClick: () => router.push("/profile") },
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
    if (reason.trim().length < 20) { toast.error("Please explain in at least 20 characters why you need this item"); return; }
    setSubmitting(true);
    try {
      await requestListing(requestTarget.id, reason.trim());
      toast.success("Request submitted! Admin will review and connect you with the donor if approved.");
      closeRequestModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative bg-[#F7F0E8] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 min-h-screen overflow-hidden transition-colors duration-300">
      <ParticleBackground className="z-0" />
      <div className="relative z-10">
      <div className="border-b border-stone-200/60 dark:border-stone-850/50 bg-gradient-to-b from-[#F7F0E8] dark:from-zinc-900/10 to-transparent">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <Reveal>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-7 w-7 rounded-xl bg-gradient-to-tr from-[#C17A3A] to-[#e0975a] flex items-center justify-center shadow-sm">
                <Package className="h-3.5 w-3.5 text-white" />
              </span>
              <span className="text-xs font-bold text-[#C17A3A] dark:text-[#e0975a] uppercase tracking-widest">Donor Offerings</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 dark:text-white sm:text-3xl">{t("title")}</h1>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400 font-medium">{t("subtitle")}</p>
          </Reveal>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
              <Input className="pl-9 rounded-xl border-stone-200 dark:border-stone-800 focus-visible:ring-[#C17A3A]/20 bg-white dark:bg-zinc-900 dark:text-stone-100" placeholder={t("searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Link href="/items/new">
              <Button className="btn-3d btn-shine bg-[#C17A3A] hover:bg-[#a86430] text-white rounded-xl font-semibold">{t("new")}</Button>
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                  category === c
                    ? "bg-[#C17A3A] border-[#C17A3A] text-white shadow-sm shadow-stone-900/20"
                    : "border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-[#C17A3A]/60 hover:text-[#C17A3A] bg-white dark:bg-zinc-900"
                }`}><TranslatedText text={c} />
              </button>
            ))}
          </div>
        </div>
      </div>

        <div className="mx-auto max-w-7xl px-4 py-8">
          {loading ? (
            <div className="flex flex-col gap-3 max-w-2xl mx-auto">
              {Array.from({ length: 6 }).map((_, i) => <ItemCardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 bg-white dark:bg-zinc-900 rounded-2xl border border-stone-200 dark:border-stone-800">
              {items.length === 0 ? (
                <>
                  <div className="mb-4 w-16 h-16 rounded-2xl bg-stone-50 dark:bg-zinc-800 flex items-center justify-center">
                    <PackageOpen className="w-8 h-8 text-[#C17A3A]/40 dark:text-orange-400/30" />
                  </div>
                  <p className="font-bold text-stone-700 dark:text-stone-300 text-base">{t("noListings")}</p>
                  <p className="mt-1 text-sm text-stone-400 dark:text-stone-500 font-medium text-center max-w-xs">{t("noListingsSubtext")}</p>
                </>
              ) : (
                <>
                  <div className="mb-4 w-16 h-16 rounded-2xl bg-orange-50 dark:bg-zinc-800 flex items-center justify-center">
                    <SearchX className="w-8 h-8 text-stone-300 dark:text-zinc-600" />
                  </div>
                  <p className="font-bold text-stone-700 dark:text-stone-300 text-base">{t("noMatches")}</p>
                  <p className="mt-1 text-sm text-stone-400 dark:text-stone-500 font-medium text-center max-w-xs">{t("noMatchesSubtext")}</p>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-w-2xl mx-auto">
              {filtered.map((item, i) => (
                <Reveal key={item.id} delay={i * 50}>
                  <ItemCard item={item} onRequest={openRequestModal} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>

      {requestTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-[#faf8f4] dark:bg-zinc-900 shadow-2xl">
            <div className="relative border-b border-stone-100 dark:border-stone-800 bg-gradient-to-r from-[#C17A3A]/10 to-transparent px-5 py-4">
              <div className="pr-8">
                <p className="text-xs font-bold uppercase tracking-wider text-[#C17A3A] dark:text-[#e0975a]">{t("requestItem")}</p>
                <h2 className="mt-0.5 text-lg font-extrabold text-[#1c1108] dark:text-white leading-tight">{modalTitle ?? requestTarget.title}</h2>
                <p className="text-sm text-stone-500 dark:text-stone-400"><TranslatedText text={requestTarget.category} /> · <TranslatedText text={requestTarget.condition} /> · Qty {requestTarget.quantity} · <TranslatedText text={requestTarget.city} /></p>
              </div>
              <button onClick={closeRequestModal}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-stone-400 hover:bg-orange-50 dark:hover:bg-zinc-800 hover:text-stone-600 transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <Label htmlFor="reason" className="mb-2 block font-semibold text-stone-700 dark:text-stone-300">
                  Why do you need this item? <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Explain your situation and why this item would help you. E.g. I am a student who recently lost my bag and urgently need a replacement for school…"
                  rows={4}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="rounded-xl border-stone-200 dark:border-stone-700 focus-visible:ring-[#C17A3A]/20 resize-none"
                />
                <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">{reason.length}/1000 characters (min 20)</p>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-[#C17A3A]/20 bg-[#C17A3A]/5 px-4 py-3">
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  Admin will review your reason and approve if valid. Contact details are shared only after approval.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-800 bg-stone-50/30 dark:bg-zinc-950/30 px-5 py-4">
              <Button variant="ghost" onClick={closeRequestModal} disabled={submitting}>Cancel</Button>
              <Button onClick={handleSubmitRequest} disabled={submitting}
                className="btn-3d btn-shine bg-[#C17A3A] hover:bg-[#a86430] text-white rounded-xl px-6 font-semibold">
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : "Submit request"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
