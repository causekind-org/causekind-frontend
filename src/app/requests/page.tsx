"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getItemRequests, getMyItemListings, createMatch, type ItemRequest, type ItemListing } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Reveal } from "@/components/Reveal";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { Loader2, MapPin, Search, HandCoins, Package } from "lucide-react";
import Link from "next/link";

const CATEGORIES = ["All","Medical aid","Education","Livelihood","Relief","Household"];

export default function RequestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [myListings, setMyListings] = useState<ItemListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [donating, setDonating] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    const fetches: Promise<unknown>[] = [getItemRequests().then(setRequests).catch(() => toast.error("Failed to load item requests"))];
    if (user) fetches.push(getMyItemListings().then(setMyListings).catch(() => {}));
    Promise.all(fetches).finally(() => setLoading(false));
  }, [user]);

  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    return (!q || r.title.toLowerCase().includes(q) || r.city.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
      && (category === "All" || r.category === category);
  });

  function urgencyVariant(u: string) { return (u === "CRITICAL" || u === "HIGH") ? "destructive" as const : "outline" as const; }

  async function handleDonate(request: ItemRequest) {
    if (!user) { router.push("/login"); return; }
    const approved = myListings.filter(l => l.status === "APPROVED");
    if (!approved.length) { toast.error("You need an approved item listing first."); router.push("/items/new"); return; }
    const match = approved.find(l => l.category === request.category) ?? approved[0];
    setDonating(request.id);
    try { await createMatch(match.id, request.id); toast.success("Match request sent! Admin will review."); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed to create match"); }
    finally { setDonating(null); }
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
            <h1 className="text-2xl font-extrabold tracking-tight text-[#963c0d] dark:text-white sm:text-3xl">In-kind Requests</h1>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400 font-medium">Items people need. Contact details shared after admin approves your match.</p>
          </Reveal>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
              <Input className="pl-9 rounded-xl border-orange-100 dark:border-stone-800 focus-visible:ring-[#b04a15]/20 bg-white dark:bg-zinc-900 dark:text-stone-100" placeholder="Search by item, city, category…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Link href="/requests/new">
              <Button variant="outline" className="btn-3d rounded-xl border-orange-200 dark:border-stone-800 text-[#b04a15] dark:text-[#e07b3a] hover:bg-orange-50 dark:hover:bg-zinc-900 font-semibold">Request an item</Button>
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
        {loading ? <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-[#b04a15]" /></div>
          : filtered.length === 0 ? <p className="py-20 text-center text-stone-400 dark:text-stone-500 font-medium bg-white dark:bg-zinc-900 rounded-2xl border border-orange-100 dark:border-stone-850">{requests.length === 0 ? "No item requests yet." : "No requests match your search."}</p>
          : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((r, i) => (
                <Reveal key={r.id} delay={i * 70}>
                  <Card className="card-3d card-shimmer card-glow rounded-2xl border-2 border-orange-200 dark:border-orange-900/60 bg-white dark:bg-zinc-900 shadow-sm h-full overflow-hidden">
                    {/* Image section */}
                    <div className="relative w-full h-40 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-zinc-800 dark:to-zinc-900 overflow-hidden">
                      {r.imageUrl ? (
                        <Image src={r.imageUrl} alt={r.title} fill sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw" className="object-cover" />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-orange-300 dark:text-zinc-600">
                          <Package className="h-10 w-10" />
                          <span className="text-xs font-semibold text-orange-300 dark:text-zinc-600 uppercase tracking-wider">No photo</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    </div>
                    <CardContent className="space-y-3 p-5">
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-orange-100 dark:bg-zinc-800 text-[#b04a15] dark:text-[#e07b3a] border-0 font-semibold">{r.category}</Badge>
                        <Badge variant={urgencyVariant(r.urgency)} className="dark:border-stone-805">{r.urgency.charAt(0) + r.urgency.slice(1).toLowerCase()}</Badge>
                      </div>
                      <p className="font-bold text-stone-900 dark:text-stone-100 leading-tight">{r.title}</p>
                      <p className="text-sm text-stone-500 dark:text-stone-400">Qty: {r.quantity} · by {r.doneeName}</p>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs text-stone-400 dark:text-stone-500"><MapPin className="h-3 w-3 text-[#b04a15] dark:text-[#e07b3a]" /> {r.city}</span>
                        <Badge className="bg-[#b04a15] text-white border-0 text-xs">Verified</Badge>
                      </div>
                      <p className="text-xs text-stone-400 dark:text-stone-500">Contact details shared after admin approves your match</p>
                      <Button size="sm" className="btn-3d btn-shine w-full bg-[#963c0d] hover:bg-[#963c0d] dark:bg-[#b04a15] dark:hover:bg-[#963c0d] text-white rounded-xl font-semibold"
                        onClick={() => handleDonate(r)} disabled={donating === r.id}>
                        {donating === r.id ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Sending…</> : "Donate this item"}
                      </Button>
                    </CardContent>
                  </Card>
                </Reveal>
              ))}
            </div>
          )}
      </div>
      </div>{/* end z-10 */}
    </div>
  );
}
