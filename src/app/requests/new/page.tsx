"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createItemRequest } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";

const CATEGORIES = ["Medical aid", "Education", "Livelihood", "Relief", "Household"];
const URGENCIES = [
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

const empty = { title: "", category: "", quantity: 1, urgency: "NORMAL", city: "", pincode: "", description: "", imageUrl: "" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function NewRequestPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
  }, [user, router]);

  function set(field: string, value: string | number) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set("imageUrl", ev.target?.result as string ?? "");
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createItemRequest({ ...form, quantity: Number(form.quantity), imageUrl: form.imageUrl || null });
      toast.success("Request submitted for review!");
      router.push("/donee/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Request an item</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your request appears to nearby donors once admin approves. Donors anywhere in India can also sponsor the item with money.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Item name">
              <Input placeholder="e.g. Foldable wheelchair" value={form.title} onChange={(e) => set("title", e.target.value)} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <Select value={form.category} onValueChange={(v) => set("category", v)} required>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Quantity">
                <Input type="number" min={1} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} required />
              </Field>
              <Field label="Urgency">
                <Select value={form.urgency} onValueChange={(v) => set("urgency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{URGENCIES.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="City">
                <Input placeholder="Pune" value={form.city} onChange={(e) => set("city", e.target.value)} required />
              </Field>
              <Field label="Pincode">
                <Input placeholder="411001" value={form.pincode} onChange={(e) => set("pincode", e.target.value)} />
              </Field>
            </div>
            <Field label="Why you need this">
              <Textarea rows={4} placeholder="Be specific. Helps admin verify faster and donors connect with your story." value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <Field label="Photo (optional)">
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              {form.imageUrl ? (
                <div className="group relative aspect-video w-full overflow-hidden rounded-xl border bg-muted">
                  <Image src={form.imageUrl} alt="preview" fill className="object-cover" />
                  <button type="button" onClick={() => set("imageUrl", "")} className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => photoRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <ImagePlus className="h-6 w-6" />
                  <span className="font-medium">Click to add a photo</span>
                  <span className="text-xs">Shown on your request card · JPG or PNG</span>
                </button>
              )}
            </Field>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit for review"}
              </Button>
              <Link href="/donee/dashboard"><Button type="button" variant="outline">Cancel</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
