"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useDynamicTranslation, useDynamicTranslations, TranslatedText } from "@/hooks/useDynamicTranslation";
import { getItemRequests, donateToRequest, getMyProfile, analyzeItemImage, type ItemRequest, type UserProfile } from "@/lib/api";
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
import { ImagePlus, Loader2, MapPin, PackageOpen, RefreshCw, Search, SearchX, Sparkles, Upload, X, HandCoins, Package } from "lucide-react";
import Link from "next/link";

const CATEGORIES = ["All", "Medical aid", "Education", "Livelihood", "Relief", "Household"];

function urgencyVariant(u: string) {
  return (u === "CRITICAL" || u === "HIGH") ? "destructive" as const : "outline" as const;
}

function RequestCardSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-stone-100 dark:border-zinc-800">
      <div className="w-14 h-14 rounded-xl bg-stone-100 dark:bg-zinc-800 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="h-3 w-1/3 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
      </div>
      <div className="w-16 h-8 bg-stone-100 dark:bg-zinc-800 rounded-xl animate-pulse shrink-0" />
    </div>
  );
}

function RequestItem({ r, onDonate }: { r: ItemRequest; onDonate: (r: ItemRequest) => void }) {
  const t = useTranslations("requests");
  const [title] = useDynamicTranslations([r.title]);
  return (
    <div className="flex items-center gap-4 px-4 py-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-stone-100 dark:border-zinc-800 transition-shadow hover:shadow-md">
      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-orange-50 dark:bg-zinc-800 shrink-0">
        {r.imageUrl ? (
          <Image src={r.imageUrl} alt={r.title} fill sizes="56px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="h-6 w-6 text-orange-200 dark:text-zinc-600" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-stone-900 dark:text-stone-100 text-sm leading-tight line-clamp-1">{title ?? r.title}</p>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
          {t("by")} {r.doneeName}, <TranslatedText text={r.city} />
        </p>
        <p className="text-xs text-stone-400 dark:text-stone-500">{t("qty")}: {r.quantity}</p>
      </div>
      <button
        onClick={() => onDonate(r)}
        className="shrink-0 px-4 py-1.5 bg-[#C17A3A] hover:bg-[#a86430] dark:bg-[#C17A3A] dark:hover:bg-[#a86430] text-white text-sm font-semibold rounded-xl transition-colors active:scale-95"
      >
        Give
      </button>
    </div>
  );
}

export default function RequestsPage() {
  const t = useTranslations("requests");
  const tCommon = useTranslations("common");
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  // Donate modal state
  const [donateTarget, setDonateTarget] = useState<ItemRequest | null>(null);
  const modalTitle = useDynamicTranslation(donateTarget?.title ?? null);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  useEffect(() => {
    const fetches: Promise<unknown>[] = [
      getItemRequests().then(setRequests).catch(() => toast.error("Failed to load item requests")),
    ];
    if (user) {
      fetches.push(getMyProfile().then(setMyProfile).catch(() => {}));
    }
    Promise.all(fetches).finally(() => setLoading(false));
  }, [user]);

  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    return (!q || r.title.toLowerCase().includes(q) || r.city.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
      && (category === "All" || r.category === category);
  });

  function openDonateModal(request: ItemRequest) {
    if (!user) { router.push("/login"); return; }
    if (!myProfile?.latitude || !myProfile?.longitude) {
      toast.error("Please set your location in your profile before donating.", {
        action: { label: "Set location", onClick: () => router.push("/profile") },
      });
      return;
    }
    setDonateTarget(request);
    setDescription("");
    setImages([]);
    setImagePreviews([]);
    setAnalyzing(false);
    setAiGenerated(false);
  }

  function closeDonateModal() {
    setDonateTarget(null);
    setDescription("");
    setImages([]);
    setImagePreviews([]);
    setAnalyzing(false);
    setAiGenerated(false);
  }

  async function runAnalysis(file: File) {
    setAnalyzing(true);
    setAiGenerated(false);
    setDescription("");
    try {
      const { description: aiDesc } = await analyzeItemImage(file);
      if (aiDesc) { setDescription(aiDesc); setAiGenerated(true); }
    } catch {
      toast.error("AI analysis failed — please describe the item manually.");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (images.length + files.length > 3) { toast.error("Maximum 3 images allowed"); return; }
    const newImages = [...images, ...files];
    setImages(newImages);
    setImagePreviews(newImages.map(f => URL.createObjectURL(f)));
    if (newImages.length > 0) runAnalysis(newImages[0]);
  }

  function removeImage(index: number) {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    setImagePreviews(newImages.map(f => URL.createObjectURL(f)));
  }

  async function handleSubmitDonate() {
    if (!donateTarget) return;
    if (images.length === 0) { toast.error("Please upload at least one photo of the item"); return; }
    if (description.trim().length < 20) { toast.error("Please describe your item in at least 20 characters"); return; }
    setSubmitting(true);
    try {
      await donateToRequest(donateTarget.id, images, description.trim());
      toast.success("Donation request sent! Admin will review and share contact details if approved.");
      closeDonateModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit donation");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative bg-[#faf8f4] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 min-h-screen overflow-hidden transition-colors duration-300">
      <ParticleBackground className="z-0" />
      <div className="relative z-10">
      <div className="border-b border-orange-100/50 dark:border-stone-850/50 bg-gradient-to-b from-orange-50/60 dark:from-zinc-900/10 to-transparent">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <Reveal>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-7 w-7 rounded-xl bg-gradient-to-tr from-[#b04a15] to-[#e07b3a] flex items-center justify-center shadow-sm">
                <HandCoins className="h-3.5 w-3.5 text-white" />
              </span>
              <span className="text-xs font-bold text-[#b04a15] dark:text-[#e07b3a] uppercase tracking-widest">In-Kind Giving</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#963c0d] dark:text-white sm:text-3xl">{t("title")}</h1>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400 font-medium">{t("subtitle")}</p>
          </Reveal>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
              <Input className="pl-9 rounded-xl border-orange-100 dark:border-stone-800 focus-visible:ring-[#b04a15]/20 bg-white dark:bg-zinc-900 dark:text-stone-100" placeholder={t("searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Link href="/requests/new">
              <Button variant="outline" className="btn-3d rounded-xl border-orange-200 dark:border-stone-800 text-[#b04a15] dark:text-[#e07b3a] hover:bg-orange-50 dark:hover:bg-zinc-900 font-semibold">{t("new")}</Button>
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                  category === c
                    ? "bg-[#b04a15] border-[#b04a15] text-white shadow-sm shadow-orange-900/20"
                    : "border-orange-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-[#b04a15] dark:hover:border-[#e07b3a] hover:text-[#b04a15] dark:hover:text-[#e07b3a] bg-white dark:bg-zinc-900"
                }`}><TranslatedText text={c} />
              </button>
            ))}
          </div>
        </div>
      </div>

        <div className="mx-auto max-w-7xl px-4 py-8">
          {loading ? (
            <div className="flex flex-col gap-3 max-w-2xl mx-auto">
              {Array.from({ length: 6 }).map((_, i) => <RequestCardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 bg-white dark:bg-zinc-900 rounded-2xl border border-orange-100 dark:border-stone-800">
              {requests.length === 0 ? (
                <>
                  <div className="mb-4 w-16 h-16 rounded-2xl bg-orange-50 dark:bg-zinc-800 flex items-center justify-center">
                    <PackageOpen className="w-8 h-8 text-[#b04a15]/40 dark:text-orange-400/30" />
                  </div>
                  <p className="font-bold text-stone-700 dark:text-stone-300 text-base">{t("noRequests")}</p>
                  <p className="mt-1 text-sm text-stone-400 dark:text-stone-500 font-medium text-center max-w-xs">{t("noRequestsSubtext")}</p>
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
              {filtered.map((r, i) => (
                <Reveal key={r.id} delay={i * 50}>
                  <RequestItem r={r} onDonate={openDonateModal} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Donate Modal */}
      {donateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-[#faf8f4] dark:bg-zinc-900 shadow-2xl">

            {/* Header */}
            <div className="relative border-b border-orange-100 dark:border-stone-800 bg-gradient-to-r from-[#b04a15]/10 to-transparent px-5 py-4">
              <div className="pr-8">
                <p className="text-xs font-bold uppercase tracking-wider text-[#b04a15] dark:text-[#ff8a65]">{t("donatingTo")}</p>
                <h2 className="mt-0.5 text-lg font-extrabold text-[#1c1108] dark:text-white leading-tight">{modalTitle ?? donateTarget.title}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-stone-500"><MapPin className="h-3 w-3" /> <TranslatedText text={donateTarget.city} /></span>
                  <Badge className="bg-orange-100 dark:bg-zinc-800 text-[#b04a15] dark:text-[#ff8a65] border-0 text-xs"><TranslatedText text={donateTarget.category} /></Badge>
                  <Badge variant={urgencyVariant(donateTarget.urgency)} className="text-xs">
                    {tCommon("urgency" + donateTarget.urgency.charAt(0) + donateTarget.urgency.slice(1).toLowerCase())}
                  </Badge>
                </div>
              </div>
              <button onClick={closeDonateModal}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-stone-400 hover:bg-orange-50 dark:hover:bg-zinc-800 hover:text-stone-600 transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {/* Step 1 — Photos */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#b04a15] text-xs font-bold text-white">1</span>
                  <Label className="font-semibold text-stone-700 dark:text-stone-300">Upload item photos <span className="text-red-500">*</span></Label>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded-xl border-2 border-orange-100 dark:border-stone-700 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button onClick={() => removeImage(i)}
                        className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white hover:bg-black transition">
                        <X className="h-3 w-3" />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          AI scans this
                        </span>
                      )}
                    </div>
                  ))}
                  {images.length < 3 && (
                    <button onClick={() => fileInputRef.current?.click()}
                      className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-orange-200 dark:border-stone-700 text-stone-400 transition hover:border-[#b04a15] hover:bg-orange-50/50 dark:hover:bg-zinc-800 hover:text-[#b04a15]">
                      <ImagePlus className="h-7 w-7" />
                      <span className="text-xs font-medium">Add photo</span>
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">
                  Up to 3 photos · AI analyses the first photo to generate the description below
                </p>
              </div>

              {/* Step 2 — AI Description */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#b04a15] text-xs font-bold text-white">2</span>
                    <Label htmlFor="desc" className="font-semibold text-stone-700 dark:text-stone-300">Item description <span className="text-red-500">*</span></Label>
                  </div>
                  <div className="flex items-center gap-2">
                    {aiGenerated && !analyzing && (
                      <span className="flex items-center gap-1 rounded-full bg-[#b04a15]/10 px-2 py-0.5 text-xs font-medium text-[#b04a15] dark:text-[#ff8a65]">
                        <Sparkles className="h-3 w-3" /> AI generated
                      </span>
                    )}
                    {images.length > 0 && !analyzing && (
                      <button onClick={() => runAnalysis(images[0])}
                        className="flex items-center gap-1 text-xs text-stone-400 transition hover:text-[#b04a15]">
                        <RefreshCw className="h-3 w-3" /> Re-analyse
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  {analyzing && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-[#faf8f4]/90 dark:bg-zinc-900/90 backdrop-blur-sm">
                      <div className="flex items-center gap-2 font-medium text-[#b04a15]">
                        <Sparkles className="h-4 w-4 animate-pulse" />
                        <span className="text-sm">AI is reading your photo…</span>
                      </div>
                      <p className="text-xs text-stone-400">Detecting item type, condition &amp; material</p>
                    </div>
                  )}
                  <Textarea
                    id="desc"
                    rows={6}
                    value={description}
                    onChange={e => { setDescription(e.target.value); setAiGenerated(false); }}
                    disabled={analyzing}
                    placeholder={
                      images.length === 0
                        ? "Add a photo above — AI will auto-generate a full description instantly"
                        : "Waiting for photo analysis…"
                    }
                    className={`resize-none rounded-xl transition border-orange-200 dark:border-stone-700 focus-visible:ring-[#b04a15]/20 ${aiGenerated ? "border-[#b04a15]/40 bg-[#b04a15]/5 focus-visible:ring-[#b04a15]/20" : ""}`}
                  />
                </div>

                <div className="mt-1.5 flex items-center justify-between">
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    {aiGenerated
                      ? "✨ Auto-filled from photo — edit anything you'd like to change"
                      : `${description.length} characters (min 20)`}
                  </p>
                  <p className="text-xs text-stone-400 dark:text-stone-500">{description.length}/1000</p>
                </div>
              </div>

              {/* Info banner */}
              <div className="flex items-start gap-3 rounded-xl border border-[#b04a15]/20 bg-[#b04a15]/5 px-4 py-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#b04a15]" />
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  AI analyses your photo for item type, condition, and material. Admin reviews before sharing contact details with both parties.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-orange-100 dark:border-stone-800 bg-orange-50/30 dark:bg-zinc-950/30 px-5 py-4">
              <Button variant="ghost" onClick={closeDonateModal} disabled={submitting || analyzing}>Cancel</Button>
              <Button onClick={handleSubmitDonate} disabled={submitting || analyzing}
                className="btn-3d btn-shine bg-[#1c1108] hover:bg-[#2d1f0a] dark:bg-[#b04a15] dark:hover:bg-[#8f3b10] text-white rounded-xl px-6 font-semibold gap-2">
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                  : <><Upload className="h-4 w-4" /> Submit donation</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
