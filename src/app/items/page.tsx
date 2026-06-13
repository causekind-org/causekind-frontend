"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
    <div className="rounded-2xl border-2 border-orange-200/50 dark:border-orange-900/30 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
      <div className="h-40 bg-stone-100 dark:bg-zinc-800 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-20 bg-stone-100 dark:bg-zinc-800 rounded-full animate-pulse" />
          <div className="h-5 w-16 bg-stone-100 dark:bg-zinc-800 rounded-full animate-pulse" />
        </div>
        <div className="h-5 w-3/4 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="h-4 w-full bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="flex justify-between items-center">
          <div className="h-4 w-16 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-5 w-14 bg-stone-100 dark:bg-zinc-800 rounded-full animate-pulse" />
        </div>
        <div className="h-9 w-full bg-stone-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

export default function ItemsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<ItemListing[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [requestTarget, setRequestTarget] = useState<ItemListing | null>(null);
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
    <div className="relative bg-[#faf8f4] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 min-h-screen overflow-hidden transition-colors duration-300">
      <ParticleBackground className="z-0" />
      <div className="relative z-10">
      <div className="border-b border-orange-100/50 dark:border-stone-850/50 bg-gradient-to-b from-orange-50/60 dark:from-zinc-900/10 to-transparent">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <Reveal>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-7 w-7 rounded-xl bg-gradient-to-tr from-[#b04a15] to-[#e07b3a] flex items-center justify-center shadow-sm">
                <Package className="h-3.5 w-3.5 text-white" />
              </span>
              <span className="text-xs font-bold text-[#b04a15] dark:text-[#e07b3a] uppercase tracking-widest">Donor Offerings</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#963c0d] dark:text-white sm:text-3xl">Item Listings</h1>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400 font-medium">Browse items donors are offering. Contact details shared after admin approves your match.</p>
          </Reveal>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
              <Input className="pl-9 rounded-xl border-orange-100 dark:border-stone-800 focus-visible:ring-[#b04a15]/20 bg-white dark:bg-zinc-900 dark:text-stone-100" placeholder="Search by item, city, category…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Link href="/items/new">
              <Button className="btn-3d btn-shine bg-[#963c0d] hover:bg-[#963c0d] dark:bg-[#b04a15] dark:hover:bg-[#963c0d] text-white rounded-xl font-semibold">List an item</Button>
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                  category === c
                    ? "bg-[#b04a15] border-[#b04a15] text-white shadow-sm shadow-orange-900/20"
                    : "border-orange-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-[#b04a15] dark:hover:border-[#e07b3a] hover:text-[#b04a15] dark:hover:text-[#e07b3a] bg-white dark:bg-zinc-900"
                }`}>{c}
              </button>
            ))}
          </div>
        </div>
      </div>

        <div className="mx-auto max-w-7xl px-4 py-8">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <ItemCardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 bg-white dark:bg-zinc-900 rounded-2xl border border-orange-100 dark:border-stone-800">
              {items.length === 0 ? (
                <>
                  <div className="mb-4 w-16 h-16 rounded-2xl bg-orange-50 dark:bg-zinc-800 flex items-center justify-center">
                    <PackageOpen className="w-8 h-8 text-[#b04a15]/40 dark:text-orange-400/30" />
                  </div>
                  <p className="font-bold text-stone-700 dark:text-stone-300 text-base">No listings yet</p>
                  <p className="mt-1 text-sm text-stone-400 dark:text-stone-500 font-medium text-center max-w-xs">No items have been listed for donation yet. Be the first to give.</p>
                </>
              ) : (
                <>
                  <div className="mb-4 w-16 h-16 rounded-2xl bg-orange-50 dark:bg-zinc-800 flex items-center justify-center">
                    <SearchX className="w-8 h-8 text-stone-300 dark:text-zinc-600" />
                  </div>
                  <p className="font-bold text-stone-700 dark:text-stone-300 text-base">No matches found</p>
                  <p className="mt-1 text-sm text-stone-400 dark:text-stone-500 font-medium text-center max-w-xs">Try a different search term or category.</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((item, i) => (
                <Reveal key={item.id} delay={i * 70}>
                  <Card className="card-3d card-shimmer card-glow overflow-hidden rounded-2xl border-2 border-orange-200 dark:border-orange-900/60 bg-white dark:bg-zinc-900 shadow-sm h-full">
                    <Link href={`/items/${item.id}`} className="block group">
                      <div className="relative h-40 w-full bg-gradient-to-br from-orange-50 to-orange-100 dark:from-zinc-800 dark:to-zinc-900 overflow-hidden">
                        {item.imageUrl ? (
                          <Image src={item.imageUrl} alt={item.title} fill sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw" className="object-cover" />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-2">
                            <Package className="h-10 w-10 text-orange-300 dark:text-zinc-600" />
                            <span className="text-xs font-semibold text-orange-300 dark:text-zinc-600 uppercase tracking-wider">No photo</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                      </div>
                    </Link>
                    <CardContent className="space-y-3 p-5">
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-orange-100 dark:bg-zinc-800 text-[#b04a15] dark:text-[#e07b3a] border-0 font-semibold">{item.category}</Badge>
                        <Badge variant="outline" className="border-orange-200 dark:border-stone-800 text-stone-600 dark:text-stone-400">{item.condition}</Badge>
                      </div>
                      <Link href={`/items/${item.id}`} className="block">
                        <p className="font-bold text-stone-900 dark:text-stone-100 leading-tight hover:text-[#b04a15] dark:hover:text-[#e07b3a] transition-colors">{item.title}</p>
                      </Link>
                      {item.description && <p className="line-clamp-2 text-sm text-stone-500 dark:text-stone-400">{item.description}</p>}
                      <p className="text-sm text-stone-500 dark:text-stone-400">Qty: {item.quantity} · by {item.donorName}</p>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs text-stone-400 dark:text-stone-500"><MapPin className="h-3 w-3 text-[#b04a15] dark:text-[#e07b3a]" /> {item.city}</span>
                        <Badge className="bg-[#b04a15] text-white border-0 text-xs">Verified</Badge>
                      </div>
                      <Button size="sm" className="btn-3d btn-shine w-full bg-[#1c1108] hover:bg-[#2d1f0a] dark:bg-[#b04a15] dark:hover:bg-[#8f3b10] text-white rounded-xl font-semibold"
                        onClick={() => openRequestModal(item)}>
                        Request this item
                      </Button>
                    </CardContent>
                  </Card>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>

      {requestTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-[#faf8f4] dark:bg-zinc-900 shadow-2xl">
            <div className="relative border-b border-orange-100 dark:border-stone-800 bg-gradient-to-r from-[#b04a15]/10 to-transparent px-5 py-4">
              <div className="pr-8">
                <p className="text-xs font-bold uppercase tracking-wider text-[#b04a15] dark:text-[#ff8a65]">Requesting</p>
                <h2 className="mt-0.5 text-lg font-extrabold text-[#1c1108] dark:text-white leading-tight">{requestTarget.title}</h2>
                <p className="text-sm text-stone-500 dark:text-stone-400">{requestTarget.category} · {requestTarget.condition} · Qty {requestTarget.quantity} · {requestTarget.city}</p>
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
                  className="rounded-xl border-orange-200 dark:border-stone-700 focus-visible:ring-[#b04a15]/20 resize-none"
                />
                <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">{reason.length}/1000 characters (min 20)</p>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-[#b04a15]/20 bg-[#b04a15]/5 px-4 py-3">
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  Admin will review your reason and approve if valid. Contact details are shared only after approval.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-orange-100 dark:border-stone-800 bg-orange-50/30 dark:bg-zinc-950/30 px-5 py-4">
              <Button variant="ghost" onClick={closeRequestModal} disabled={submitting}>Cancel</Button>
              <Button onClick={handleSubmitRequest} disabled={submitting}
                className="btn-3d btn-shine bg-[#1c1108] hover:bg-[#2d1f0a] dark:bg-[#b04a15] dark:hover:bg-[#8f3b10] text-white rounded-xl px-6 font-semibold">
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : "Submit request"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
