"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapPin, Search, ShieldCheck } from "lucide-react";

const list = [
  { title: "Wheelchair (adult, foldable)", city: "Pune", category: "Medical aid", urgency: "High" },
  { title: "School uniforms, age 8–10 (10 sets)", city: "Bhopal", category: "Education", urgency: "Normal" },
  { title: "Sewing machine for livelihood", city: "Jaipur", category: "Livelihood", urgency: "Normal" },
  { title: "Winter blankets x 25", city: "Shimla", category: "Relief", urgency: "High" },
  { title: "Laptop for college student", city: "Bengaluru", category: "Education", urgency: "Normal" },
  { title: "Walker for elderly", city: "Kolkata", category: "Medical aid", urgency: "Normal" },
];

export default function RequestsPage() {
  const [search, setSearch] = useState("");
  const filtered = list.filter(
    (r) =>
      !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.city.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="border-b bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">In-kind requests</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Verified item requests from donees. Match within 10 km, or sponsor from anywhere in India.
            </p>
          </div>
          <Link href="/requests/new">
            <Button>Request an item</Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search items, cities, categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <Card key={r.title} className="transition hover:shadow-md">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{r.category}</Badge>
                  <Badge variant={r.urgency === "High" ? "destructive" : "outline"}>{r.urgency}</Badge>
                </div>
                <h3 className="font-semibold leading-snug">{r.title}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.city}</span>
                  <span className="flex items-center gap-1 text-primary"><ShieldCheck className="h-3 w-3" /> Verified</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="flex-1">Donate this item</Button>
                  <Button size="sm" variant="outline" className="flex-1">Sponsor (₹)</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Contact details share after admin approval of your match.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
