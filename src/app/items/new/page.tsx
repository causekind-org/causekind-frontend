"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function NewItemPage() {
  return (
    <div>
      <div className="border-b bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Post an item donation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            List something you already own. Admin will review and approve before donees can request it.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Item name">
                <Input placeholder="e.g. Children's school books, Grade 4" />
              </Field>
              <Field label="Category">
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["Education", "Clothing", "Furniture", "Electronics", "Household", "Sports", "Medical aid"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Quantity">
                <Input type="number" defaultValue={1} />
              </Field>
              <Field label="Condition">
                <Select>
                  <SelectTrigger><SelectValue placeholder="Like new" /></SelectTrigger>
                  <SelectContent>
                    {["Like new", "Good", "Fair"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Pickup city">
                <Input placeholder="Pune" />
              </Field>
              <Field label="Pickup pincode">
                <Input placeholder="411001" />
              </Field>
            </div>

            <Field label="Description">
              <Textarea rows={5} placeholder="Brief description, age of item, any defects, pickup preferences..." />
            </Field>

            <Field label="Photos">
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Upload 1–4 photos so donees know what to expect.
                <div className="mt-2">
                  <Button variant="outline" size="sm">Choose photos</Button>
                </div>
              </div>
            </Field>

            <div className="rounded-lg bg-accent/40 p-4 text-sm">
              Once approved, your listing matches with donee requests within 10 km.
              Contact details are only shared after admin approves the connection — keeping both sides safe.
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Link href="/dashboard">
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button>Submit for review</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
