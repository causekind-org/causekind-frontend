"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getItemRequests, type ItemRequest } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, Search } from "lucide-react";
import Link from "next/link";

const CATEGORIES = ["All", "Medical aid", "Education", "Livelihood", "Relief", "Household"];

export default function RequestsPage() {
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    getItemRequests()
      .then(setRequests)
      .catch(() => toast.error("Failed to load item requests"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = requests.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.title.toLowerCase().includes(q) || r.city.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
    const matchCat = category === "All" || r.category === category;
    return matchSearch && matchCat;
  });

  function urgencyVariant(urgency: string) {
    if (urgency === "CRITICAL" || urgency === "HIGH") return "destructive" as const;
    return "outline" as const;
  }

  return (
    <div>
      <div className="border-b bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">In-kind requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">Items donees need. Contact details shared after admin approves your match.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by item, city, category…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Link href="/requests/new">
              <Button variant="outline">Request an item</Button>
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
          <p className="py-20 text-center text-muted-foreground">{requests.length === 0 ? "No item requests yet." : "No requests match your search."}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <Card key={r.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{r.category}</Badge>
                    <Badge variant={urgencyVariant(r.urgency)}>{r.urgency.charAt(0) + r.urgency.slice(1).toLowerCase()}</Badge>
                  </div>
                  <p className="font-semibold leading-tight">{r.title}</p>
                  <p className="text-sm text-muted-foreground">Qty: {r.quantity} · by {r.doneeName}</p>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {r.city}
                    </span>
                    <Badge variant="default" className="text-xs">Verified</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Contact details share after admin approval of your match</p>
                  <Button size="sm" className="w-full" disabled>Donate this item</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
