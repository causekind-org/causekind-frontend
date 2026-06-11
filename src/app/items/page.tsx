"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getItemListings, type ItemListing } from "@/lib/api";
import { Reveal } from "@/components/Reveal";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, Search, Package } from "lucide-react";
import Link from "next/link";

const CATEGORIES = ["All","Education","Clothing","Furniture","Electronics","Household","Sports","Medical aid"];

export default function ItemsPage() {
  const [items, setItems] = useState<ItemListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    getItemListings().then(setItems).catch(() => toast.error("Failed to load item listings")).finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    return (!q || i.title.toLowerCase().includes(q) || i.city.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
      && (category === "All" || i.category === category);
  });

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
              <span className="text-xs font-bold text-[#b04a15] dark:text-[#ff8a65] uppercase tracking-widest">Donor Offerings</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1c1108] dark:text-white sm:text-3xl">Item Listings</h1>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400 font-medium">Browse items donors are offering. Contact details shared after admin approves your match.</p>
          </Reveal>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
              <Input className="pl-9 rounded-xl border-orange-100 dark:border-stone-800 focus-visible:ring-[#b04a15]/20 bg-white dark:bg-zinc-900 dark:text-stone-100" placeholder="Search by item, city, category…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Link href="/items/new">
              <Button className="btn-3d btn-shine bg-[#1c1108] hover:bg-[#2d1f0a] dark:bg-[#b04a15] dark:hover:bg-[#8f3b10] text-white rounded-xl font-semibold">List an item</Button>
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                  category === c
                    ? "bg-[#b04a15] border-[#b04a15] text-white shadow-sm shadow-orange-900/20"
                    : "border-orange-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-[#b04a15] dark:hover:border-[#ff8a65] hover:text-[#b04a15] dark:hover:text-[#ff8a65] bg-white dark:bg-zinc-900"
                }`}>{c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {loading ? <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-[#b04a15]" /></div>
          : filtered.length === 0 ? <p className="py-20 text-center text-stone-400 dark:text-stone-500 font-medium bg-white dark:bg-zinc-900 rounded-2xl border border-orange-100 dark:border-stone-850">{items.length === 0 ? "No items listed yet." : "No items match your search."}</p>
          : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((item, i) => (
                <Reveal key={item.id} delay={i * 70}>
                  <Card className="card-3d card-shimmer card-glow overflow-hidden rounded-2xl border-orange-100/50 dark:border-stone-850/50 bg-white dark:bg-zinc-900 shadow-sm h-full">
                    <div className="flex h-40 items-center justify-center bg-gradient-to-br from-[#b04a15]/8 to-[#1e3a60]/8 dark:from-[#b04a15]/15 dark:to-[#1e3a60]/15 text-4xl">📦</div>
                    <CardContent className="space-y-3 p-5">
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-orange-100 dark:bg-zinc-800 text-[#b04a15] dark:text-[#ff8a65] border-0 font-semibold">{item.category}</Badge>
                        <Badge variant="outline" className="border-orange-200 dark:border-stone-800 text-stone-600 dark:text-stone-400">{item.condition}</Badge>
                      </div>
                      <p className="font-bold text-stone-900 dark:text-stone-100 leading-tight">{item.title}</p>
                      <p className="text-sm text-stone-500 dark:text-stone-400">Qty: {item.quantity} · by {item.donorName}</p>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs text-stone-400 dark:text-stone-500"><MapPin className="h-3 w-3 text-[#b04a15] dark:text-[#ff8a65]" /> {item.city}</span>
                        <Badge className="bg-[#b04a15] text-white border-0 text-xs">Verified</Badge>
                      </div>
                      <Button size="sm" className="w-full bg-stone-100 dark:bg-zinc-950 text-stone-400 dark:text-stone-600 rounded-xl font-semibold cursor-not-allowed" disabled>Request this item</Button>
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
