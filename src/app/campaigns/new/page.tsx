"use client";

import { FEATURES } from "@/lib/features";
import { ComingSoon } from "@/components/ComingSoon";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { createCampaign, getProfile } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, Link2, Loader2, Paperclip, Upload, X } from "lucide-react";
import { useLocations } from "@/hooks/useLocations";
import { SearchableSelect, type SelectOption } from "@/components/profile/SearchableSelect";
import { useTranslations } from "next-intl";

const CATEGORIES = ["Medical", "Education", "Disaster", "Community", "Livelihood"];

const empty = { title: "", category: "", targetAmount: "", description: "", imageUrl: "", videoUrl: "" };



function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <Label>{label}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {children}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

export default function NewCampaignPage() {
  if (!FEATURES.money) return <ComingSoon feature="campaigns" />;
  return <NewCampaignPageInner />;
}

function NewCampaignPageInner() {
  const t = useTranslations("campaignNew");
  const { user } = useAuth();
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [docs, setDocs] = useState<File[]>([]);
  const [form, setForm] = useState(empty);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [videoMode, setVideoMode] = useState<"link" | "upload">("link");
  const [videoFileName, setVideoFileName] = useState<string>("");

  // Location cascades states
  const [countryIso, setCountryIso] = useState<string>("");
  const [stateIso, setStateIso] = useState<string>("");
  const [cityValue, setCityValue] = useState<string>("");
  const [cityFreeText, setCityFreeText] = useState<string>("");

  // Derived option lists
  const { countries: countryOptions, states: stateOptions, cities: cityOptions } = useLocations(countryIso, stateIso);

  // Fallback to free-text for city
  const noStateOptions = countryIso !== "" && stateOptions.length === 0;
  const noCityOptions = stateIso !== "" && cityOptions.length === 0;
  const showCityFreeText = noStateOptions || noCityOptions;

  useEffect(() => {
    if (!user) { router.push("/login"); return; }

    // Fetch profile to auto-fill location and check role
    getProfile()
      .then((p) => {
        if (p.role !== "DONEE" && p.role !== "ADMIN") {
          toast.error("Access denied. Only beneficiaries can start campaigns.");
          router.push("/dashboard");
          return;
        }
        if (p.city) {
          const parts = p.city.split(",").map((s) => s.trim());
          if (parts.length === 3) {
            const [cCity, cState, cCountry] = parts;
            setCountryIso(cCountry || "IN");
            setStateIso(cState || "");
            if (cCity) {
              setCityValue(cCity);
            } else {
              setCityFreeText(cCity);
            }
          } else {
            setCountryIso("IN");
            setCityFreeText(p.city);
          }
        } else {
          setCountryIso("IN");
        }
      })
      .catch((err) => {
        console.error("Failed to load profile for location prefill:", err);
        setCountryIso("IN");
      });
  }, [user, router]);

  function handleCountryChange(iso: string) {
    setCountryIso(iso);
    setStateIso("");
    setCityValue("");
    setCityFreeText("");
  }

  function handleStateChange(iso: string) {
    setStateIso(iso);
    setCityValue("");
    setCityFreeText("");
  }

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
    const finalCity = showCityFreeText ? cityFreeText.trim() : cityValue.trim();
    const finalState = noStateOptions
      ? ""
      : (stateOptions.find((s) => s.value === stateIso)?.label || stateIso);

    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Campaign title is required";
    if (!form.category) errs.category = "Category is required";
    if (!form.targetAmount || parseFloat(form.targetAmount) <= 0) errs.targetAmount = "Enter a valid goal amount";
    if (!finalCity) errs.city = "City is required";
    if (!form.description.trim()) errs.description = "Description is required";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await createCampaign({
        title: form.title,
        category: form.category,
        targetAmount: parseFloat(form.targetAmount),
        city: finalCity,
        state: finalState,
        description: form.description,
        imageUrl: form.imageUrl || null,
        videoUrl: form.videoUrl || null,
      });
      toast.success(t("toastSuccess"));
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toastError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <div>
      <div className="border-b bg-gradient-to-b from-accent/40 to-transparent">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("heading")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("fieldCampaignTitle")} error={fieldErrors.title}>
                  <Input placeholder={t("placeholderCampaignTitle")} value={form.title} onChange={(e) => set("title", e.target.value)} className={fieldErrors.title ? "border-red-500" : ""} />
                </Field>
                <Field label={t("fieldCategory")} error={fieldErrors.category}>
                  <Select value={form.category} onValueChange={(v) => set("category", v)}>
                    <SelectTrigger className={fieldErrors.category ? "border-red-500" : ""}><SelectValue placeholder={t("placeholderCategory")} /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t("fieldGoalAmount")} error={fieldErrors.targetAmount}>
                  <Input type="number" min={1} placeholder="500000" value={form.targetAmount} onChange={(e) => set("targetAmount", e.target.value)} className={fieldErrors.targetAmount ? "border-red-500" : ""} />
                </Field>
                <Field label={t("fieldCountry")}>
                  <SearchableSelect
                    id="country"
                    options={countryOptions}
                    value={countryIso}
                    onChange={handleCountryChange}
                    placeholder={t("placeholderCountry")}
                    searchPlaceholder={t("searchCountry")}
                  />
                </Field>
                <Field label={t("fieldState")}>
                  {noStateOptions ? (
                    <p className="text-xs text-stone-400 italic py-3 bg-stone-50/50 rounded-xl border border-stone-200 px-3">
                      {t("noStatesListed")}
                    </p>
                  ) : (
                    <SearchableSelect
                      id="state"
                      options={stateOptions}
                      value={stateIso}
                      onChange={handleStateChange}
                      placeholder={t("placeholderState")}
                      disabledPlaceholder={t("disabledPlaceholderState")}
                      disabled={!countryIso}
                      searchPlaceholder={t("searchState")}
                    />
                  )}
                </Field>
                <Field label={t("fieldCity")} error={fieldErrors.city}>
                  {showCityFreeText ? (
                    <Input
                      id="city"
                      placeholder={t("placeholderCityInput")}
                      value={cityFreeText}
                      onChange={(e) => setCityFreeText(e.target.value)}
                      className={fieldErrors.city ? "border-red-500" : ""}
                    />
                  ) : (
                    <SearchableSelect
                      id="city"
                      options={cityOptions}
                      value={cityValue}
                      onChange={setCityValue}
                      placeholder={t("placeholderCity")}
                      disabledPlaceholder={t("disabledPlaceholderCity")}
                      disabled={!stateIso && !noStateOptions}
                      searchPlaceholder={t("searchCity")}
                    />
                  )}
                </Field>
              </div>

              <Field label={t("fieldStory")} error={fieldErrors.description}>
                <Textarea rows={6} placeholder={t("placeholderStory")} value={form.description} onChange={(e) => set("description", e.target.value)} className={fieldErrors.description ? "border-red-500" : ""} />
              </Field>

              {/* Campaign photos */}
              <Field label={t("fieldPhotos")} hint={t("hintPhotos")}>
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
                    <span className="font-medium">{t("clickToAddPhotos")}</span>
                    <span className="text-xs">{t("photoFormats")}</span>
                  </button>
                )}
              </Field>

              {/* Campaign video */}
              <Field label={t("fieldVideo")} hint={t("hintVideo")}>
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
                    <Link2 className="h-3 w-3" /> {t("pasteLink")}
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
                    <Upload className="h-3 w-3" /> {t("uploadFile")}
                  </button>
                </div>

                {videoMode === "link" && (
                  <Input
                    type="url"
                    placeholder={t("placeholderVideoUrl")}
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
                        <span className="font-medium">{t("clickToUploadVideo")}</span>
                        <span className="text-xs">{t("videoFormats")}</span>
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
              <Field label={t("fieldDocs")} hint={t("hintDocs")}>
                <input ref={docInputRef} type="file" accept=".pdf,.webp,.jpeg,.webp,.doc,.docx" multiple className="hidden" onChange={handleDocs} />
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
                  {docs.length > 0 ? t("addMoreDocuments") : t("chooseDocuments")}
                </button>
              </Field>

              <div className="rounded-lg bg-accent/40 p-4 text-sm">
                {t.rich("feeNotice", { b: (chunks) => <b>{chunks}</b> })}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Link href="/dashboard">
                  <Button type="button" variant="outline">{t("cancel")}</Button>
                </Link>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("submitting")}</> : t("submitForReview")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
