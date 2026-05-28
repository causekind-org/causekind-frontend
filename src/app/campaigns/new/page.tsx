"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, Paperclip, X } from "lucide-react";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <Label>{label}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export default function NewCampaignPage() {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [docs, setDocs] = useState<File[]>([]);

  function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPhotos((prev) => [...prev, ...files].slice(0, 4));
    e.target.value = "";
  }

  function handleDocs(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setDocs((prev) => [...prev, ...files]);
    e.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function removeDoc(index: number) {
    setDocs((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="border-b bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Start a money campaign</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell your story honestly. Our admin team will verify and approve within 24–48 hours.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Campaign title">
                <Input placeholder="e.g. Help Mira's heart surgery" />
              </Field>
              <Field label="Category">
                <Select>
                  <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
                  <SelectContent>
                    {["Medical", "Education", "Disaster", "Community", "Livelihood"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Goal amount (₹)">
                <Input type="number" placeholder="500000" />
              </Field>
              <Field label="Duration (days)">
                <Input type="number" defaultValue={45} />
              </Field>
              <Field label="Beneficiary name">
                <Input placeholder="Full name" />
              </Field>
              <Field label="City">
                <Input placeholder="Mumbai" />
              </Field>
            </div>

            <Field label="Your story">
              <Textarea rows={6} placeholder="Explain the situation, why funds are needed, how they'll be used..." />
            </Field>

            {/* ── Campaign photos ── */}
            <Field
              label="Campaign photos"
              hint="Upload up to 4 photos. Clear photos help donors connect with your cause."
            >
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotos}
              />

              {photos.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-3">
                  {photos.map((file, i) => (
                    <div key={i} className="group relative aspect-video overflow-hidden rounded-lg border bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-full w-full object-cover object-center"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {photos.length < 4 && (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="flex aspect-video items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      <ImagePlus className="h-5 w-5" />
                    </button>
                  )}
                </div>
              )}

              {photos.length === 0 && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <ImagePlus className="h-8 w-8" />
                  <span className="font-medium">Click to add photos</span>
                  <span className="text-xs">JPG, PNG up to 10 MB each · Max 4 photos</span>
                </button>
              )}
            </Field>

            {/* ── Supporting documents ── */}
            <Field
              label="Supporting documents"
              hint="Medical reports, ID proofs, hospital quotes, etc. Helps admin verify faster."
            >
              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                multiple
                className="hidden"
                onChange={handleDocs}
              />

              {docs.length > 0 && (
                <div className="mb-3 space-y-2">
                  {docs.map((file, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{file.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button type="button" onClick={() => removeDoc(i)} className="ml-2 shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Paperclip className="h-4 w-4" />
                {docs.length > 0 ? "Add more documents" : "Choose documents"}
              </button>
            </Field>

            <div className="rounded-lg bg-accent/40 p-4 text-sm">
              You receive <b>95%</b> of the total amount raised. CauseKind deducts a transparent
              5% platform fee only from the donee settlement — donors are never charged extra.
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
