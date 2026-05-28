"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, MapPin, X } from "lucide-react";

const campaignQueue = [
  { title: "Tuition fees for engineering 2nd yr", by: "Aditya R.", city: "Pune", goal: 90000 },
  { title: "Emergency surgery for father", by: "Sneha K.", city: "Kolkata", goal: 250000 },
  { title: "Mid-day meals for 50 kids (1 month)", by: "Lakshmi T.", city: "Madurai", goal: 35000 },
];

const requestQueue = [
  { title: "Sewing machine", by: "Reshma P.", city: "Jaipur" },
  { title: "Laptop for college", by: "Ravi M.", city: "Bengaluru" },
];

const itemQueue = [
  { title: "Winter jackets x 6", by: "Anita D.", city: "Delhi" },
  { title: "Smartphone (Android)", by: "Vikas N.", city: "Hyderabad" },
];

const contactQueue = [
  { donor: "Anita D.", donee: "Reshma P.", item: "Sewing machine", distance: "6 km" },
  { donor: "Vikas N.", donee: "Ravi M.", item: "Laptop", distance: "9 km" },
];

function ApprovalRow({ title, meta }: { title: string; meta: string }) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{title}</p>
            <Badge variant="outline">Pending</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{meta}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">View</Button>
          <Button size="sm" variant="outline" className="gap-1">
            <X className="h-4 w-4" /> Reject
          </Button>
          <Button size="sm" className="gap-1">
            <Check className="h-4 w-4" /> Approve
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ApprovalsPage() {
  return (
    <div>
      <div className="border-b bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Approval queues</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review and approve submissions before they go live.
            </p>
          </div>
          <Link href="/admin/dashboard">
            <Button variant="outline">Back to dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <Tabs defaultValue="campaigns">
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="requests">Item requests</TabsTrigger>
            <TabsTrigger value="items">Item listings</TabsTrigger>
            <TabsTrigger value="contacts">Contact shares</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="mt-6 space-y-3">
            {campaignQueue.map((c) => (
              <ApprovalRow
                key={c.title}
                title={c.title}
                meta={`${c.by} · ${c.city} · Goal ₹${c.goal.toLocaleString("en-IN")}`}
              />
            ))}
          </TabsContent>

          <TabsContent value="requests" className="mt-6 space-y-3">
            {requestQueue.map((r) => (
              <ApprovalRow key={r.title} title={r.title} meta={`${r.by} · ${r.city}`} />
            ))}
          </TabsContent>

          <TabsContent value="items" className="mt-6 space-y-3">
            {itemQueue.map((i) => (
              <ApprovalRow key={i.title} title={i.title} meta={`${i.by} · ${i.city}`} />
            ))}
          </TabsContent>

          <TabsContent value="contacts" className="mt-6 space-y-3">
            {contactQueue.map((c) => (
              <Card key={c.item + c.donor}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-medium">{c.item}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.donor} → {c.donee}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {c.distance} apart
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1">
                      <X className="h-4 w-4" /> Reject
                    </Button>
                    <Button size="sm" className="gap-1">
                      <Check className="h-4 w-4" /> Approve &amp; share contact
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
