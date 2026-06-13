"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createCampaign } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, Link2, Loader2, Paperclip, Upload, X } from "lucide-react";

const CATEGORIES = ["Medical", "Education", "Disaster", "Community", "Livelihood"];

const empty = { title: "", category: "", targetAmount: "", city: "", state: "", description: "", imageUrl: "", videoUrl: "" };

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
  const { user } = useAuth();
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [docs, setDocs] = useState<File[]>([]);
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [videoMode, setVideoMode] = useState<"link" | "upload">("link");
  const [videoFileName, setVideoFileName] = useState<string>("");

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
  }, [user, router]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const newPhotos = [...photos, ...files].slice(0, 4);
    setPhotos(newPhotos);
    // Use first photo as card image
    if (newPhotos.length > 0 && !form.imageUrl) {
      const reader = new FileReader();
      reader.onload = (ev) => set("imageUrl", ev.target?.result as string ?? "");
      reader.readAsDataURL(newPhotos[0]);
    }
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

  function handleVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => set("videoUrl", ev.target?.result as string ?? "");
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function clearVideo() {
    set("videoUrl", "");
    setVideoFileName("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.category || !form.targetAmount || !form.city || !form.state || !form.description) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      await createCampaign({
        title: form.title,
        category: form.category,
        targetAmount: parseFloat(form.targetAmount),
        city: form.city,
        state: form.state,
        description: form.description,
        imageUrl: form.imageUrl || null,
        videoUrl: form.videoUrl || null,
      });
      toast.success("Campaign submitted for review!");
      router.push("/donee/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit campaign");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

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
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Campaign title">
                  <Input placeholder="e.g. Help Mira's heart surgery" value={form.title} onChange={(e) => set("title", e.target.value)} required />
                </Field>
                <Field label="Category">
                  <Select value={form.category} onValueChange={(v) => set("category", v)} required>
                    <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Goal amount (₹)">
                  <Input type="number" min={1} placeholder="500000" value={form.targetAmount} onChange={(e) => set("targetAmount", e.target.value)} required />
                </Field>
                <Field label="City">
                  <Input placeholder="Mumbai" value={form.city} onChange={(e) => set("city", e.target.value)} required />
                </Field>
                <Field label="State" hint="e.g. Maharashtra">
                  <Input placeholder="Maharashtra" value={form.state} onChange={(e) => set("state", e.target.value)} required />
                </Field>
              </div>

              <Field label="Your story">
                <Textarea rows={6} placeholder="Explain the situation, why funds are needed, how they'll be used..." value={form.description} onChange={(e) => set("description", e.target.value)} required />
              </Field>

              {/* Campaign photos */}
              <Field label="Campaign photos" hint="Upload up to 4 photos. Clear photos help donors connect with your cause.">
                <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-3">
                    {photos.map((file, i) => (
                      <div key={i} className="group relative aspect-video overflow-hidden rounded-lg border bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={URL.createObjectURL(file)} alt={file.name} className="h-full w-full object-cover object-center" />
                        <button type="button" onClick={() => removePhoto(i)} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {photos.length < 4 && (
                      <button type="button" onClick={() => photoInputRef.current?.click()} className="flex aspect-video items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                        <ImagePlus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                )}
                {photos.length === 0 && (
                  <button type="button" onClick={() => photoInputRef.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                    <ImagePlus className="h-8 w-8" />
                    <span className="font-medium">Click to add photos</span>
                    <span className="text-xs">JPG, PNG up to 10 MB each · Max 4 photos</span>
                  </button>
                )}
              </Field>

              {/* Campaign video */}
              <Field label="Campaign video (9:16 vertical)" hint="Vertical 9:16 video recommended (like a phone reel). Keep uploaded files short.">
                {/* Mode toggle pills */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => { setVideoMode("link"); clearVideo(); }}
                    className={[
                      "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-colors",
                      videoMode === "link"
                        ? "bg-[#b04a15] text-white border-[#b04a15]"
                        : "border-stone-300 text-stone-600 hover:border-[#b04a15] hover:text-[#b04a15]",
                    ].join(" ")}
                  >
                    <Link2 className="h-3 w-3" /> Paste link
                  </button>
                  <button
                    type="button"
                    onClick={() => { setVideoMode("upload"); clearVideo(); }}
                    className={[
                      "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-colors",
                      videoMode === "upload"
                        ? "bg-[#b04a15] text-white border-[#b04a15]"
                        : "border-stone-300 text-stone-600 hover:border-[#b04a15] hover:text-[#b04a15]",
                    ].join(" ")}
                  >
                    <Upload className="h-3 w-3" /> Upload file
                  </button>
                </div>

                {videoMode === "link" && (
                  <Input
                    type="url"
                    placeholder="https://youtube.com/shorts/..."
                    value={form.videoUrl}
                    onChange={(e) => set("videoUrl", e.target.value)}
                  />
                )}

                {videoMode === "upload" && (
                  <>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleVideoFile}
                    />
                    {!videoFileName ? (
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        <Upload className="h-8 w-8" />
                        <span className="font-medium">Click to upload video</span>
                        <span className="text-xs">MP4, MOV, WebM · Keep short for best performance</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                        <span className="truncate">{videoFileName}</span>
                        <button type="button" onClick={clearVideo} className="ml-2 shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* 9:16 preview */}
                {form.videoUrl && (
                  <div className="mt-3 flex justify-start">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                      src={form.videoUrl}
                      className="aspect-[9/16] w-40 rounded-lg object-cover"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  </div>
                )}
              </Field>

              {/* Supporting documents */}
              <Field label="Supporting documents" hint="Medical reports, ID proofs, hospital quotes, etc. Helps admin verify faster.">
                <input ref={docInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple className="hidden" onChange={handleDocs} />
                {docs.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {docs.map((file, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{file.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <button type="button" onClick={() => removeDoc(i)} className="ml-2 shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => docInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <Paperclip className="h-4 w-4" />
                  {docs.length > 0 ? "Add more documents" : "Choose documents"}
                </button>
              </Field>

              <div className="rounded-lg bg-accent/40 p-4 text-sm">
                You receive <b>95%</b> of the total amount raised. CauseKind deducts a transparent 5% platform fee only from the donee settlement — donors are never charged extra.
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Link href="/donee/dashboard">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit for review"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
