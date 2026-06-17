"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createItemListing, getProfile } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { Country, State, City } from "country-state-city";
import { SearchableSelect, type SelectOption } from "@/components/profile/SearchableSelect";

const CATEGORIES = ["Education", "Clothing", "Furniture", "Electronics", "Household", "Sports", "Medical aid"];
const CONDITIONS = ["Like new", "Good", "Fair"];

const empty = { title: "", category: "", quantity: 1, condition: "", city: "", pincode: "", description: "", imageUrl: "" };

function buildCountryOptions(): SelectOption[] {
  return Country.getAllCountries().map((c) => ({
    value: c.isoCode,
    label: c.name,
  }));
}

function buildStateOptions(countryIso: string): SelectOption[] {
  return State.getStatesOfCountry(countryIso).map((s) => ({
    value: s.isoCode,
    label: s.name,
  }));
}

function buildCityOptions(countryIso: string, stateIso: string): SelectOption[] {
  return City.getCitiesOfState(countryIso, stateIso).map((c) => ({
    value: c.name,
    label: c.name,
  }));
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function NewItemPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  // Location cascades states
  const [countryIso, setCountryIso] = useState<string>("");
  const [stateIso, setStateIso] = useState<string>("");
  const [cityValue, setCityValue] = useState<string>("");
  const [cityFreeText, setCityFreeText] = useState<string>("");

  // Derived option lists
  const countryOptions = buildCountryOptions();
  const stateOptions = countryIso ? buildStateOptions(countryIso) : [];
  const cityOptions = countryIso && stateIso ? buildCityOptions(countryIso, stateIso) : [];

  // Fallback to free-text for city
  const noStateOptions = countryIso !== "" && stateOptions.length === 0;
  const noCityOptions = stateIso !== "" && cityOptions.length === 0;
  const showCityFreeText = noStateOptions || noCityOptions;

  useEffect(() => {
    if (!user) { router.push("/login"); return; }

    // Fetch profile to auto-fill location
    getProfile()
      .then((p) => {
        if (p.city) {
          const parts = p.city.split(",").map((s) => s.trim());
          if (parts.length === 3) {
            const [cCity, cState, cCountry] = parts;
            setCountryIso(cCountry || "IN");
            setStateIso(cState || "");
            const states = State.getStatesOfCountry(cCountry);
            const cities = City.getCitiesOfState(cCountry, cState);
            if (cities.some((c) => c.name === cCity)) {
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

  function buildCityString(): string {
    if (showCityFreeText) {
      return [cityFreeText, stateIso, countryIso].filter(Boolean).join(", ");
    }
    return [cityValue, stateIso, countryIso].filter(Boolean).join(", ");
  }

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
    const cityStr = buildCityString();
    if (!cityStr) {
      toast.error("Please select or enter your city");
      return;
    }
    setSubmitting(true);
    try {
      await createItemListing({ ...form, city: cityStr, quantity: Number(form.quantity), imageUrl: form.imageUrl || null });
      toast.success("Item submitted for review!");
      router.push("/dashboard");
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
          <CardTitle>Post an item donation</CardTitle>
          <p className="text-sm text-muted-foreground">
            Once approved, your listing matches with donee requests within 10 km. Contact details are only shared after admin approves the connection.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Item name">
              <Input placeholder="e.g. Children's school books, Grade 4" value={form.title} onChange={(e) => set("title", e.target.value)} required />
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
              <Field label="Condition">
                <Select value={form.condition} onValueChange={(v) => set("condition", v)} required>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Pickup pincode">
                <Input placeholder="411001" value={form.pincode} onChange={(e) => set("pincode", e.target.value)} />
              </Field>
              <Field label="Country">
                <SearchableSelect
                  id="country"
                  options={countryOptions}
                  value={countryIso}
                  onChange={handleCountryChange}
                  placeholder="Select country"
                  searchPlaceholder="Search country…"
                />
              </Field>
              <Field label="State / Province">
                {noStateOptions ? (
                  <p className="text-xs text-stone-400 italic py-3 bg-stone-50/50 rounded-xl border border-stone-200 px-3">
                    No states listed for this country.
                  </p>
                ) : (
                  <SearchableSelect
                    id="state"
                    options={stateOptions}
                    value={stateIso}
                    onChange={handleStateChange}
                    placeholder="Select state"
                    disabledPlaceholder="Select country first"
                    disabled={!countryIso}
                    searchPlaceholder="Search state…"
                  />
                )}
              </Field>
              <Field label="City">
                {showCityFreeText ? (
                  <Input
                    id="city"
                    placeholder="Enter city name"
                    value={cityFreeText}
                    onChange={(e) => setCityFreeText(e.target.value)}
                    required
                  />
                ) : (
                  <SearchableSelect
                    id="city"
                    options={cityOptions}
                    value={cityValue}
                    onChange={setCityValue}
                    placeholder="Select city"
                    disabledPlaceholder="Select state first"
                    disabled={!stateIso && !noStateOptions}
                    searchPlaceholder="Search city…"
                  />
                )}
              </Field>
            </div>
            <Field label="Description">
              <Textarea rows={4} placeholder="Brief description, age of item, any defects, pickup preferences…" value={form.description} onChange={(e) => set("description", e.target.value)} />
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
                  <span className="text-xs">Shown on your listing card · JPG or PNG</span>
                </button>
              )}
            </Field>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit for review"}
              </Button>
              <Link href="/dashboard"><Button type="button" variant="outline">Cancel</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
