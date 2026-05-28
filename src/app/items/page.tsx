"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapPin, Search, ShieldCheck } from "lucide-react";

const list = [
  {
    title: "Children's school books (Grade 4)",
    city: "Pune",
    category: "Education",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80&fit=crop",
  },
  {
    title: "Winter jackets x 6",
    city: "Delhi",
    category: "Clothing",
    condition: "Like new",
    image: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800&q=80&fit=crop",
  },
  {
    title: "Study desk",
    city: "Mumbai",
    category: "Furniture",
    condition: "Fair",
    image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80&fit=crop",
  },
  {
    title: "Smartphone (Android, 64GB)",
    city: "Hyderabad",
    category: "Electronics",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80&fit=crop",
  },
  {
    title: "Cooking utensils set",
    city: "Ahmedabad",
    category: "Household",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80&fit=crop",
  },
  {
    title: "Cricket kit (youth)",
    city: "Bengaluru",
    category: "Sports",
    condition: "Good",
    image: "https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=800&q=80&fit=crop",
  },
];

export default function ItemsPage() {
  const [search, setSearch] = useState("");
  const filtered = list.filter(
    (i) =>
      !search ||
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.city.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="border-b bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Donor item listings</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Items that donors near you have already pledged. All listings are admin-approved before showing here.
            </p>
          </div>
          <Link href="/items/new">
            <Button>List an item you own</Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search items, categories, cities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((i) => (
            <Card key={i.title} className="overflow-hidden transition hover:shadow-md">
              <div className="relative aspect-video bg-gradient-to-br from-secondary via-accent to-primary/20">
                <Image
                  src={i.image}
                  alt={i.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover object-center"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{i.category}</Badge>
                  <Badge variant="outline">{i.condition}</Badge>
                </div>
                <h3 className="font-semibold leading-snug">{i.title}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {i.city}</span>
                  <span className="flex items-center gap-1 text-primary"><ShieldCheck className="h-3 w-3" /> Verified</span>
                </div>
                <Button size="sm" className="w-full">Request this item</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
