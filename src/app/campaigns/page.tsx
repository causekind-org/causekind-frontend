"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getCampaigns, type Campaign } from "@/lib/api";

const CATEGORY_IMAGES: Record<string, string[]> = {
  Medical: ["/images/medical-1.png", "/images/medical-2.png"],
  Education: ["/images/hero-7.jpg"],
  Livelihood: ["/images/hero-3.jpg"],
  Community: ["/images/hero-6.jpg"],
};

function cardImage(category: string, id: number): string | null {
  const imgs = CATEGORY_IMAGES[category];
  return imgs ? imgs[id % imgs.length] : null;
}
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Loader2, MapPin, Search } from "lucide-react";

const CATEGORIES = ["All", "Medical", "Education", "Disaster Relief", "Animal Welfare", "Environment", "Community", "Other"];

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    getCampaigns()
      .then(setCampaigns)
      .catch(() => setError("Could not load campaigns. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      const matchesSearch =
        !search ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.city.toLowerCase().includes(search.toLowerCase()) ||
        c.doneeName.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "All" || c.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [campaigns, search, category]);

  return (
    <div>
      <div className="border-b bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Money campaigns</h1>
            <p className="mt-1 text-sm text-muted-foreground">Admin-verified causes from across India.</p>
          </div>
          <Link href="/campaigns/new">
            <Button>Start a campaign</Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        {/* Search + filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by cause, city, organizer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={category === c ? "default" : "outline"}
                onClick={() => setCategory(c)}
              >
                {c}
              </Button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && <p className="text-center text-destructive py-20">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-20">
            {campaigns.length === 0 ? "No approved campaigns yet." : "No campaigns match your search."}
          </p>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => {
              const pct = Math.min(100, Math.round((c.amountRaised / c.targetAmount) * 100));
              return (
                <Card key={c.id} className="overflow-hidden transition hover:shadow-md">
                  <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/20 via-accent to-secondary">
                    {cardImage(c.category, c.id) && (
                      <Image
                        src={cardImage(c.category, c.id)!}
                        alt={c.category}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover object-center"
                      />
                    )}
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between text-xs">
                      <Badge variant="secondary">{c.category}</Badge>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {c.city}
                      </span>
                    </div>
                    <h3 className="mt-3 font-semibold leading-snug line-clamp-2">{c.title}</h3>
                    <div className="mt-4 space-y-2">
                      <Progress value={pct} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">₹{formatINR(c.amountRaised)}</span>
                        <span>of ₹{formatINR(c.targetAmount)}</span>
                      </div>
                    </div>
                    <Link href={`/campaigns/${c.id}`}>
                      <Button size="sm" className="mt-4 w-full">View &amp; donate</Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
