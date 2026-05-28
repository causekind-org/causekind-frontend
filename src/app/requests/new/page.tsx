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

export default function NewRequestPage() {
  return (
    <div>
      <div className="border-b bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Request an item</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe what you need. Admin will verify before publishing it for donors.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Item name">
                <Input placeholder="e.g. Foldable wheelchair" />
              </Field>
              <Field label="Category">
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["Medical aid", "Education", "Livelihood", "Relief", "Household"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Quantity">
                <Input type="number" defaultValue={1} />
              </Field>
              <Field label="Urgency">
                <Select>
                  <SelectTrigger><SelectValue placeholder="Normal" /></SelectTrigger>
                  <SelectContent>
                    {["Normal", "High", "Critical"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="City">
                <Input placeholder="Pune" />
              </Field>
              <Field label="Pincode">
                <Input placeholder="411001" />
              </Field>
            </div>

            <Field label="Why you need this">
              <Textarea rows={5} placeholder="Be specific. Helps admin verify faster and donors connect with your story." />
            </Field>

            <Field label="Supporting documents (optional)">
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Doctor&apos;s note, school ID, etc.
                <div className="mt-2">
                  <Button variant="outline" size="sm">Choose files</Button>
                </div>
              </div>
            </Field>

            <div className="rounded-lg bg-accent/40 p-4 text-sm">
              Your request appears to nearby donors (default 10 km) once admin approves.
              Donors anywhere in India can also sponsor the item with money — our trust team purchases and delivers it.
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Link href="/donee/dashboard">
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
