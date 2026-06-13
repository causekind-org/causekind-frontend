"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Country, State, City } from "country-state-city";
import {
  getProfile,
  updateProfile,
  getMyDonations,
  getMyCampaigns,
  type UserProfile,
  type Donation,
  type Campaign,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  User,
  Phone,
  MapPin,
  Mail,
  ArrowLeft,
  Shield,
  Heart,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { SearchableSelect, type SelectOption } from "@/components/profile/SearchableSelect";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Derive a 1-2 letter ISO country code from navigator.language / Intl API (sync fallback) */
function detectCountryCode(): string {
  if (typeof window === "undefined") return "IN";
  try {
    const lang = navigator.language || "";
    const parts = lang.split("-");
    if (parts.length >= 2) {
      const region = parts[parts.length - 1].toUpperCase();
      if (/^[A-Z]{2,3}$/.test(region)) return region;
    }
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? "";
    const lparts = locale.split("-");
    if (lparts.length >= 2) {
      const region = lparts[lparts.length - 1].toUpperCase();
      if (/^[A-Z]{2,3}$/.test(region)) return region;
    }
  } catch {
    // ignore
  }
  return "IN";
}

/** IP-based country detection — falls back to detectCountryCode() on error */
async function detectCountryFromIP(): Promise<string> {
  try {
    const res = await fetch("https://ipwho.is/?output=json&fields=country_code", {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error("non-200");
    const data = await res.json();
    if (typeof data.country_code === "string" && /^[A-Z]{2}$/.test(data.country_code)) {
      return data.country_code;
    }
  } catch {
    // ignore
  }
  return detectCountryCode();
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 0) return "U";
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? "U";
  return ((words[0][0] ?? "") + (words[words.length - 1][0] ?? "")).toUpperCase();
}

function avatarKey(email: string) {
  return `ck_profile_image_${email}`;
}

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function toTitleCase(str: string) {
  return str.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}

// ── country-state-city option builders ───────────────────────────────────────

function buildCountryOptions(): SelectOption[] {
  return Country.getAllCountries().map((c) => ({
    value: c.isoCode,
    label: c.name,
    // No prefix: emoji flags render as 2-letter codes (e.g. "IN") on Windows
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

function buildDialCodeOptions(): SelectOption[] {
  return Country.getAllCountries()
    .filter((c) => c.phonecode)
    .map((c) => ({
      value: c.isoCode,
      label: `${c.name} (+${c.phonecode.replace(/^\+/, "")})`,
      prefix: c.flag ?? "",
    }));
}

function getDialCode(isoCode: string): string {
  const country = Country.getAllCountries().find((c) => c.isoCode === isoCode);
  if (!country?.phonecode) return "";
  const code = country.phonecode.replace(/^\+/, "");
  return `+${code}`;
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Basic fields
  const [fullName, setFullName] = useState("");

  // Avatar
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);

  // Phone
  const [dialCountry, setDialCountry] = useState<string>("IN");
  const [phoneNumber, setPhoneNumber] = useState(""); // digits only (no dial code)

  // Location cascades
  const [countryIso, setCountryIso] = useState<string>("");
  const [stateIso, setStateIso] = useState<string>("");
  const [cityValue, setCityValue] = useState<string>("");
  const [cityFreeText, setCityFreeText] = useState<string>(""); // free-text fallback

  // Donation history + campaign stats
  const [donations, setDonations] = useState<Donation[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // Derived option lists (memoized to avoid re-building every render)
  const countryOptions = buildCountryOptions();
  const dialCodeOptions = buildDialCodeOptions();
  const stateOptions = countryIso ? buildStateOptions(countryIso) : [];
  const cityOptions = countryIso && stateIso ? buildCityOptions(countryIso, stateIso) : [];

  // Whether we fall back to free-text for city
  const noStateOptions = countryIso !== "" && stateOptions.length === 0;
  const noCityOptions = stateIso !== "" && cityOptions.length === 0;
  const showCityFreeText = noStateOptions || noCityOptions;

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    // Load avatar from localStorage
    const savedAvatar = localStorage.getItem(avatarKey(user.email));
    if (savedAvatar) setAvatarDataUrl(savedAvatar);

    // Run IP geolocation, profile fetch, and donation/campaign history in parallel
    Promise.all([
      detectCountryFromIP(),
      getProfile(),
      getMyDonations().catch((): Donation[] => []),
      getMyCampaigns().catch((): Campaign[] => []),
    ])
      .then(([detectedCountry, p, d, c]) => {
        setProfile(p);
        setFullName(p.fullName);
        setDonations(d);
        setCampaigns(c);

        // Parse phone: if stored with dial code prefix "+XX …" split it out
        if (p.phone) {
          const match = p.phone.match(/^(\+\d{1,4})\s*(.*)$/);
          if (match) {
            const foundCountry = Country.getAllCountries().find(
              (c) => `+${c.phonecode.replace(/^\+/, "")}` === match[1]
            );
            if (foundCountry) {
              setDialCountry(foundCountry.isoCode);
              setPhoneNumber(match[2]);
            } else {
              setPhoneNumber(p.phone);
            }
          } else {
            setPhoneNumber(p.phone);
          }
        }

        // Location: try to parse city as "city, stateIso, countryIso"
        if (p.city) {
          const parts = p.city.split(",").map((s) => s.trim());
          if (parts.length === 3) {
            const [cCity, cState, cCountry] = parts;
            setCountryIso(cCountry || detectedCountry);
            setStateIso(cState || "");
            const states = State.getStatesOfCountry(cCountry);
            const cities = City.getCitiesOfState(cCountry, cState);
            if (cities.some((c) => c.name === cCity)) {
              setCityValue(cCity);
            } else {
              setCityFreeText(cCity);
            }
            if (states.length === 0) {
              setCityFreeText(cCity);
            }
          } else {
            setCountryIso(detectedCountry);
            setCityFreeText(p.city);
          }
        } else {
          setCountryIso(detectedCountry);
        }

        if (!p.phone) {
          setDialCountry(detectedCountry);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load profile details");
        const fallback = detectCountryCode();
        setCountryIso(fallback);
        setDialCountry(fallback);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, router]);

  // Avatar persistence
  const handleAvatarChange = useCallback(
    (dataUrl: string | null) => {
      setAvatarDataUrl(dataUrl);
      if (!user?.email) return;
      if (dataUrl) {
        localStorage.setItem(avatarKey(user.email), dataUrl);
      } else {
        localStorage.removeItem(avatarKey(user.email));
      }
    },
    [user?.email]
  );

  // Country change: reset state + city
  function handleCountryChange(iso: string) {
    setCountryIso(iso);
    setStateIso("");
    setCityValue("");
    setCityFreeText("");
  }

  // State change: reset city
  function handleStateChange(iso: string) {
    setStateIso(iso);
    setCityValue("");
    setCityFreeText("");
  }

  // Build the city string to persist
  function buildCityString(): string {
    if (showCityFreeText) {
      return [cityFreeText, stateIso, countryIso].filter(Boolean).join(", ");
    }
    return [cityValue, stateIso, countryIso].filter(Boolean).join(", ");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const rawPhone = phoneNumber.trim();
    const dialCode = getDialCode(dialCountry);
    const fullPhone = dialCode ? `${dialCode} ${rawPhone}` : rawPhone;
    const cityStr = buildCityString();

    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!rawPhone) {
      toast.error("Please enter a phone number");
      return;
    }
    if (!cityStr) {
      toast.error("Please select or enter your city");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateProfile({
        fullName: fullName.trim(),
        phone: fullPhone,
        city: cityStr,
      });
      setProfile(updated);
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  // Loading / auth guard renders
  if (authLoading || loading) {
    return (
      <div className="bg-[#faf8f4] dark:bg-zinc-950 min-h-[calc(100vh-3.5rem)] py-12 px-6 sm:px-10">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="h-5 w-36 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white dark:bg-zinc-900 border border-orange-100 dark:border-stone-800 h-20 animate-pulse"
              />
            ))}
          </div>
          <div className="rounded-2xl border-2 border-orange-100 dark:border-stone-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="p-6 border-b border-orange-100 dark:border-stone-800">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-stone-200 dark:bg-zinc-700 animate-pulse shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-24 bg-stone-200 dark:bg-zinc-700 rounded animate-pulse" />
                  <div className="h-3 w-40 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="h-5 w-16 bg-stone-100 dark:bg-zinc-800 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-20 bg-stone-100 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="h-11 w-full bg-stone-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
                </div>
              ))}
              <div className="h-12 w-full bg-stone-200 dark:bg-zinc-700 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials = getInitials(fullName || profile?.fullName || user.email);
  const selectedDialOption = dialCodeOptions.find((o) => o.value === dialCountry);
  const dialDisplay = selectedDialOption
    ? `${selectedDialOption.prefix ?? ""} ${getDialCode(dialCountry)}`
    : "";

  const completedDonations = donations.filter((d) => d.status === "COMPLETED");
  const totalGiven = completedDonations.reduce((sum, d) => sum + Number(d.amount), 0);
  const campaignsSupported = new Set(completedDonations.map((d) => d.campaignId)).size;

  const roleColorClass =
    profile?.role === "ADMIN"
      ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-0"
      : profile?.role === "DONEE"
      ? "bg-[#b04a15]/10 dark:bg-orange-900/20 text-[#b04a15] dark:text-orange-300 border-0"
      : "bg-sky-100 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border-0";

  return (
    <div className="bg-[#faf8f4] dark:bg-zinc-950 text-stone-900 dark:text-stone-100 min-h-[calc(100vh-3.5rem)] py-12 px-6 sm:px-10 transition-colors duration-300">
      <div className="max-w-2xl mx-auto space-y-6">

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-[#b04a15] dark:text-stone-400 dark:hover:text-amber-500 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-orange-100 dark:border-stone-800 p-4 text-center shadow-sm">
            <Heart className="h-4 w-4 text-[#b04a15] mx-auto mb-1" />
            <p className="text-base font-extrabold text-[#b04a15] leading-tight truncate">{formatINR(totalGiven)}</p>
            <p className="text-[10px] text-stone-400 font-semibold mt-0.5 uppercase tracking-wide">Total donated</p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-orange-100 dark:border-stone-800 p-4 text-center shadow-sm">
            <TrendingUp className="h-4 w-4 text-[#1e3a60] dark:text-[#4a7fba] mx-auto mb-1" />
            <p className="text-base font-extrabold text-[#1e3a60] dark:text-[#4a7fba] leading-tight">{campaignsSupported}</p>
            <p className="text-[10px] text-stone-400 font-semibold mt-0.5 uppercase tracking-wide">Causes helped</p>
          </div>
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-orange-100 dark:border-stone-800 p-4 text-center shadow-sm">
            <BarChart3 className="h-4 w-4 text-stone-400 dark:text-stone-500 mx-auto mb-1" />
            <p className="text-base font-extrabold text-stone-800 dark:text-stone-100 leading-tight">{campaigns.length}</p>
            <p className="text-[10px] text-stone-400 font-semibold mt-0.5 uppercase tracking-wide">Campaigns</p>
          </div>
        </div>

        <Card className="rounded-2xl border-2 border-orange-200 dark:border-stone-800 bg-white dark:bg-zinc-900 shadow-md overflow-hidden">
          <CardHeader className="border-b border-orange-100 dark:border-stone-800 bg-gradient-to-r from-orange-50/50 to-transparent p-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              {/* Avatar */}
              <AvatarUpload
                imageDataUrl={avatarDataUrl}
                initials={initials}
                onImageChange={handleAvatarChange}
              />
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">My Profile</CardTitle>
                <CardDescription className="text-stone-500 dark:text-stone-400">
                  View and update your personal details
                </CardDescription>
                <Badge className={`mt-2 text-xs font-bold ${roleColorClass}`}>
                  {toTitleCase(profile?.role ?? "DONOR")}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSave} className="space-y-5">

              {/* Full Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="fullName"
                  className="text-xs font-bold uppercase tracking-wider text-stone-400"
                >
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-stone-400" />
                  <Input
                    id="fullName"
                    className="pl-10 rounded-xl border-orange-200 dark:border-stone-800 focus-visible:ring-[#b04a15]/20 py-5 font-medium bg-white dark:bg-zinc-900 text-stone-800 dark:text-stone-100"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label
                    htmlFor="email"
                    className="text-xs font-bold uppercase tracking-wider text-stone-400"
                  >
                    Email Address
                  </Label>
                  <span className="text-[10px] font-black text-stone-400 uppercase flex items-center gap-1">
                    <Shield className="w-3 h-3 text-[#b04a15]" /> System ID
                  </span>
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-stone-400" />
                  <Input
                    id="email"
                    className="pl-10 rounded-xl border-stone-200 dark:border-stone-850 py-5 font-medium bg-stone-50 dark:bg-zinc-950 text-stone-400 cursor-not-allowed"
                    value={profile?.email || ""}
                    disabled
                  />
                </div>
              </div>

              {/* Phone with dial-code dropdown */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Phone Number
                </Label>
                <div className="flex gap-2">
                  {/* Dial-code picker */}
                  <div className="w-[120px] shrink-0">
                    <SearchableSelect
                      options={dialCodeOptions}
                      value={dialCountry}
                      onChange={setDialCountry}
                      placeholder="+–"
                      searchPlaceholder="Search country…"
                      renderSelectedLabel={(opt) => getDialCode(opt.value)}
                    />
                  </div>
                  {/* Number input */}
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    className="flex-1 rounded-xl border-orange-200 dark:border-stone-800 focus-visible:ring-[#b04a15]/20 py-5 font-medium bg-white dark:bg-zinc-900 text-stone-800 dark:text-stone-100"
                    placeholder="Enter phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                {dialDisplay && (
                  <p className="text-xs text-stone-400">
                    Will save as: <span className="font-semibold">{dialDisplay} {phoneNumber || "…"}</span>
                  </p>
                )}
              </div>

              {/* ── Location: Country → State → City ── */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Location
                </Label>

                {/* Country */}
                <div className="space-y-1">
                  <Label htmlFor="country" className="text-xs text-stone-500">Country</Label>
                  <SearchableSelect
                    id="country"
                    options={countryOptions}
                    value={countryIso}
                    onChange={handleCountryChange}
                    placeholder="Select country"
                    searchPlaceholder="Search country…"
                  />
                </div>

                {/* State */}
                <div className="space-y-1">
                  <Label htmlFor="state" className="text-xs text-stone-500">State / Province</Label>
                  {noStateOptions ? (
                    <p className="text-xs text-stone-400 italic py-1">
                      No states listed for this country — enter city below.
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
                </div>

                {/* City */}
                <div className="space-y-1">
                  <Label htmlFor="city" className="text-xs text-stone-500">City</Label>
                  {showCityFreeText ? (
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                      <Input
                        id="city"
                        className="pl-10 rounded-xl border-orange-200 dark:border-stone-800 focus-visible:ring-[#b04a15]/20 py-5 font-medium bg-white dark:bg-zinc-900 text-stone-800 dark:text-stone-100"
                        placeholder="Enter your city"
                        value={cityFreeText}
                        onChange={(e) => setCityFreeText(e.target.value)}
                      />
                    </div>
                  ) : (
                    <SearchableSelect
                      id="city"
                      options={cityOptions}
                      value={cityValue}
                      onChange={setCityValue}
                      placeholder="Select city"
                      disabledPlaceholder="Select state first"
                      disabled={!stateIso}
                      searchPlaceholder="Search city…"
                    />
                  )}
                </div>
              </div>

              {/* Save button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  className="btn-3d btn-shine w-full bg-[#b04a15] hover:bg-[#963c0d] text-white rounded-xl py-6 font-extrabold text-sm shadow-md flex items-center justify-center gap-2"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Saving Changes…
                    </>
                  ) : (
                    "Save Profile Changes"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Donation history */}
        {donations.length > 0 && (
          <Card className="rounded-2xl border-2 border-orange-200 dark:border-stone-800 bg-white dark:bg-zinc-900 shadow-md overflow-hidden">
            <CardHeader className="border-b border-orange-100 dark:border-stone-800 bg-gradient-to-r from-orange-50/30 to-transparent p-5">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Heart className="h-4 w-4 text-[#b04a15]" />
                Donation History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-2">
                {donations.slice(0, 6).map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-xl border border-orange-100 dark:border-stone-800 p-3 gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-stone-800 dark:text-stone-100 truncate">{d.campaignTitle}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {new Date(d.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-sm text-[#b04a15]">{formatINR(Number(d.amount))}</span>
                      <Badge
                        variant={d.status === "COMPLETED" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {d.status === "COMPLETED" ? "Done" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              {donations.length > 6 && (
                <Link href="/dashboard" className="block mt-3">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-stone-400 hover:text-[#b04a15]">
                    View all {donations.length} donations on dashboard
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
