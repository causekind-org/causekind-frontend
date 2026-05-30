"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getItemListings, type ItemListing } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, Search } from "lucide-react";
import Link from "next/link";

const CATEGORIES = ["All", "Education", "Clothing", "Furniture", "Electronics", "Household", "Sports", "Medical aid"];

export default function ItemsPage() {
  const [items, setItems] = useState<ItemListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    getItemListings()
      .then(setItems)
      .catch(() => toast.error("Failed to load item listings"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((i) => {
    const q = search.toLowerCase();
    const matchSearch = !q || i.title.toLowerCase().includes(q) || i.city.toLowerCase().includes(q) || i.category.toLowerCase().includes(q);
    const matchCat = category === "All" || i.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div>
      <div className="border-b bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Item listings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Browse items donors are offering. Contact details shared after admin approves your match.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by item, city, category…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Link href="/items/new">
              <Button>List an item</Button>
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1 text-sm transition ${category === c ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/40"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">{items.length === 0 ? "No items listed yet." : "No items match your search."}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((i) => (
              <Card key={i.id} className="overflow-hidden">
                <div className="flex h-40 items-center justify-center bg-accent/30 text-4xl">📦</div>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{i.category}</Badge>
                    <Badge variant="outline">{i.condition}</Badge>
                  </div>
                  <p className="font-semibold leading-tight">{i.title}</p>
                  <p className="text-sm text-muted-foreground">Qty: {i.quantity} · by {i.donorName}</p>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {i.city}
                    </span>
                    <Badge variant="default" className="text-xs">Verified</Badge>
                  </div>
                  <Button size="sm" className="w-full" disabled>Request this item</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
