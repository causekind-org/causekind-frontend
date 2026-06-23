"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocations } from "@/hooks/useLocations";
import { resolveLocationFromGPS, getDialCodes } from "@/app/actions/locations";
import {
  getProfile,
  updateProfile,
  updateLocation,
  getMyDonations,
  getMyCampaigns,
  getMyItemRequests,
  getMyMatches,
  type UserProfile,
  type Donation,
  type Campaign,
  type ItemRequest,
  type ItemMatch,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { FEATURES } from "@/lib/features";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  User,
  Phone,
  MapPin,
  Mail,
  Shield,
  Heart,
  ChevronDown,
  Award,
  BookOpen,
  Package,
  Navigation,
  CheckCircle2,
  Gift,
  Handshake,
  Sparkles,
  Star,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { SearchableSelect, type SelectOption } from "@/components/profile/SearchableSelect";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/Reveal";

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

function getDialCode(isoCode: string, dialCodes: any[]): string {
  const country = dialCodes.find((c) => c.value === isoCode);
  if (!country?.phonecode) return "";
  return `+${country.phonecode}`;
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations("profile");

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

  // In-kind / requests
  const [myRequests, setMyRequests] = useState<ItemRequest[]>([]);
  const [inKindCount, setInKindCount] = useState(0);

  // Settings panel toggle
  const [settingsOpen, setSettingsOpen] = useState(false);

  // GPS location
  const [locStatus, setLocStatus] = useState<"idle" | "requesting" | "saved" | "error">("idle");

  // Derived option lists (memoized to avoid re-building every render)
  const { countries: countryOptions, states: stateOptions, cities: cityOptions, dialCodes: dialCodeOptions } = useLocations(countryIso, stateIso);

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

    // Run IP geolocation, profile fetch, donation/campaign history, and in-kind data in parallel
    Promise.all([
      detectCountryFromIP(),
      getProfile(),
      getMyDonations().catch((): Donation[] => []),
      getMyCampaigns().catch((): Campaign[] => []),
      getMyItemRequests().catch((): ItemRequest[] => []),
      getMyMatches().catch((): ItemMatch[] => []),
      getDialCodes(),
    ])
      .then(([detectedCountry, p, d, c, req, matches, serverDialCodes]) => {
        setProfile(p);
        setFullName(p.fullName);
        setDonations(d);
        setCampaigns(c);
        setMyRequests(req);
        setInKindCount(matches.length);

        // Parse phone: if stored with dial code prefix "+XX …" split it out
        if (p.phone) {
          const match = p.phone.match(/^(\+\d{1,4})\s*(.*)$/);
          if (match) {
            const foundCountry = serverDialCodes.find(
              (c) => `+${c.phonecode}` === match[1]
            );
            if (foundCountry) {
              setDialCountry(foundCountry.value);
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
            if (cCity) {
              setCityValue(cCity);
            } else {
              setCityFreeText(cCity);
            }
            if (!cState) {
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
        toast.error(t("errorLoadProfile"));
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

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      toast.error(t("errorNoGps"));
      return;
    }
    setLocStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const updated = await updateLocation(lat, lng);
          setProfile(updated);
          setLocStatus("saved");
          toast.success(t("successLocationSaved"));

          // Reverse-geocode to auto-fill the dropdown menus in UI
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`);
            if (res.ok) {
              const data = await res.json();
              const address = data.address;
              if (address) {
                const countryCode = address.country_code?.toUpperCase();
                const stateName = address.state;
                const cityName = address.city || address.town || address.village || address.suburb;

                if (countryCode) {
                  setDialCountry(countryCode);
                  setCountryIso(countryCode);
                  const { stateIso: resolvedState, cityValue: resolvedCity } = await resolveLocationFromGPS(countryCode, stateName, cityName);
                  
                  if (resolvedState) {
                    setStateIso(resolvedState);
                    if (resolvedCity) {
                      setCityValue(resolvedCity);
                      setCityFreeText("");
                    } else if (cityName) {
                      setCityValue("");
                      setCityFreeText(cityName);
                    }
                  } else {
                    setStateIso("");
                    setCityValue("");
                    if (cityName) setCityFreeText(cityName);
                  }
                }
              }
            }
          } catch (e) {
            console.error("Reverse geocoding failed", e);
          }
        } catch {
          setLocStatus("error");
          toast.error(t("errorLocationFailed"));
        }
      },
      (err) => {
        setLocStatus("error");
        toast.error(
          err.code === 1
            ? t("errorLocationDenied")
            : t("errorLocationUnavailable")
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const rawPhone = phoneNumber.trim();
    const dialCode = getDialCode(dialCountry, dialCodeOptions);
    const fullPhone = dialCode ? `${dialCode} ${rawPhone}` : rawPhone;
    const cityStr = buildCityString();

    if (!fullName.trim()) {
      toast.error(t("errorNoName"));
      return;
    }
    if (!rawPhone) {
      toast.error(t("errorNoPhone"));
      return;
    }
    if (!cityStr) {
      toast.error(t("errorNoCity"));
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
      toast.success(t("successProfileUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errorUpdateFailed"));
    } finally {
      setSaving(false);
    }
  }

  // Loading skeleton
  if (authLoading || loading) {
    return (
      <div className="bg-[#F7F0E8] min-h-screen pb-28">
        <div className="px-5 pt-14 pb-4 flex items-center justify-between">
          <div className="h-8 w-40 bg-stone-200 rounded-lg animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-stone-200 animate-pulse" />
        </div>
        <div className="mx-5 mt-2 rounded-3xl bg-stone-200 h-36 animate-pulse" />
        <div className="px-5 mt-6 space-y-3">
          <div className="h-5 w-44 bg-stone-200 rounded animate-pulse" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="w-48 shrink-0 h-44 bg-stone-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
        <div className="px-5 mt-6 grid grid-cols-2 gap-4">
          <div className="h-36 bg-stone-200 rounded-2xl animate-pulse" />
          <div className="h-36 bg-stone-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials = getInitials(fullName || profile?.fullName || user.email);

  const completedDonations = donations.filter((d) => d.status === "COMPLETED");
  const totalGiven = completedDonations.reduce((sum, d) => sum + Number(d.amount), 0);
  const campaignsSupported = new Set(completedDonations.map((d) => d.campaignId)).size;

  // Derive supported campaigns list (deduplicated by campaignId)
  const campaignMap = new Map<number, { id: number; title: string; amount: number }>();
  completedDonations.forEach((d) => {
    const existing = campaignMap.get(d.campaignId);
    if (existing) existing.amount += Number(d.amount);
    else campaignMap.set(d.campaignId, { id: d.campaignId, title: d.campaignTitle, amount: Number(d.amount) });
  });
  const supportedCampaigns = Array.from(campaignMap.values());

  // Badge eligibility
  const hasFirstGiver = FEATURES.money ? completedDonations.length > 0 : inKindCount > 0;
  const hasCommunityHero = FEATURES.money ? campaignsSupported >= 3 : inKindCount >= 3;
  const hasEducationAdvocate = FEATURES.money
    ? completedDonations.some((d) => d.campaignTitle?.toLowerCase().includes("education"))
    : myRequests.some((r) => r.category?.toLowerCase().includes("education"));

  const badges = [
    { label: "First Giver", icon: Heart, earned: hasFirstGiver },
    { label: "Community Hero", icon: Sparkles, earned: hasCommunityHero },
    { label: "Education Advocate", icon: Star, earned: hasEducationAdvocate },
  ];

  return (
    <div className="bg-[#F7F0E8] min-h-screen pb-28 pt-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Main Grid: Asymmetric 1fr / 3fr Split */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
          
          {/* LEFT: Sticky User Card */}
          <aside className="lg:sticky lg:top-24 bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-stone-100 dark:border-zinc-800 space-y-6 relative overflow-hidden">
            {/* Left accent stripe */}
            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#C17A3A]" />
            
            {/* Avatar & Initials */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-[#C17A3A] flex items-center justify-center overflow-hidden shadow-md">
                {avatarDataUrl ? (
                  <Image
                    src={avatarDataUrl}
                    alt={initials}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-2xl">{initials}</span>
                )}
              </div>
              <div>
                <h2 className="text-lg font-black text-stone-900 dark:text-white leading-tight">
                  {fullName || profile?.fullName}
                </h2>
                <p className="text-xs text-[#b04a15] font-black uppercase tracking-wider mt-1">
                  {profile?.role ?? "DONOR"}
                </p>
              </div>
            </div>

            <div className="border-t border-stone-100 dark:border-zinc-800 pt-4 space-y-3">
              <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
                <Mail className="w-3.5 h-3.5 text-[#C17A3A]" />
                <span className="truncate">{profile?.email}</span>
              </div>
              {profile?.phone && (
                <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
                  <Phone className="w-3.5 h-3.5 text-[#C17A3A]" />
                  <span>{profile.phone}</span>
                </div>
              )}
              {profile?.city && (
                <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
                  <MapPin className="w-3.5 h-3.5 text-[#C17A3A]" />
                  <span>{profile.city}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setSettingsOpen((v) => !v)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#C17A3A]/10 hover:bg-[#C17A3A]/15 text-[#C17A3A] text-xs font-bold rounded-xl transition-all"
            >
              <span>{settingsOpen ? "Close Settings" : "Account Settings"}</span>
            </button>
          </aside>

          {/* RIGHT: Main content */}
          <div className="space-y-8">
            
            {/* Page Title */}
            <div className="flex items-baseline justify-between gap-4">
              <h1 className="text-3xl font-black text-stone-900 dark:text-white tracking-tight">
                {t("myImpact")}
              </h1>
            </div>

            {/* ── Hero Impact Card ── */}
            <div className="rounded-3xl overflow-hidden shadow-sm">
              <div className="bg-gradient-to-br from-[#C17A3A] to-[#8B4513] p-8 text-white relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full border border-white/10 pointer-events-none" />
                <div className="absolute -top-4 -right-4 w-28 h-28 rounded-full border border-white/8 pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row justify-between sm:items-center gap-6">
                  {FEATURES.money ? (
                    <>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-80">{t("totalImpact")}</p>
                        <p className="text-5xl font-black leading-none mt-2 tracking-tight">{formatINR(totalGiven)}</p>
                        <p className="text-xs opacity-75 mt-1">{t("donated")}</p>
                      </div>

                      <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 shrink-0">
                        <div className="flex items-center gap-1 shrink-0">
                          <Package className="w-5 h-5 text-white/90" strokeWidth={2} />
                          {inKindCount > 1 && <Gift className="w-4 h-4 text-white/80" strokeWidth={2} />}
                        </div>
                        <div className="flex flex-col leading-none">
                          <span className="text-3xl font-black tabular-nums tracking-tight">{inKindCount}</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">
                            {inKindCount !== 1 ? t("inKindItemsGiven") : t("inKindItemGiven")}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest opacity-80">IN-KIND IMPACT</p>
                      <p className="text-5xl font-black leading-none mt-2 tracking-tight">{inKindCount}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {inKindCount !== 1 ? t("inKindItemsGiven") : t("inKindItemGiven")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Badges and My Requests Row (Asymmetric cards) */}
            <div className="grid grid-cols-1 md:grid-cols-[4fr_5fr] gap-6">
              
              {/* Badges Card */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-stone-100 dark:border-zinc-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50/50 dark:bg-zinc-850/20 rounded-bl-full pointer-events-none" />
                <h3 className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#C17A3A]" /> {t("badges")}
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {badges.map(({ label, icon: Icon, earned }) => (
                    <div
                      key={label}
                      className={`flex flex-col items-center transition-all ${earned ? "scale-100" : "opacity-35 scale-95"}`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#C17A3A]/10 flex items-center justify-center shadow-sm">
                        <Icon className="w-6 h-6 text-[#C17A3A]" />
                      </div>
                      <p className="text-[10px] font-extrabold text-stone-600 dark:text-stone-400 text-center mt-2 leading-tight">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* My Requests Card */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-stone-100 dark:border-zinc-800 relative">
                <h3 className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#C17A3A]" /> {t("myRequests")}
                </h3>
                {myRequests.length === 0 ? (
                  <p className="text-xs text-stone-400 dark:text-stone-505 py-4 font-medium">{t("noRequestsYet")}</p>
                ) : (
                  <div className="space-y-3">
                    {myRequests.slice(0, 3).map((req) => (
                      <div key={req.id} className="flex items-center gap-3 py-1.5 border-b border-stone-50 dark:border-zinc-800 last:border-0">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-stone-50 dark:bg-zinc-800 shrink-0 flex items-center justify-center relative">
                          {req.imageUrl ? (
                            <Image
                              src={req.imageUrl}
                              alt={req.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-stone-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate text-stone-900 dark:text-stone-100">{req.title}</p>
                          <p className="text-[10px] text-stone-400 truncate mt-0.5">{req.city} · Qty: {req.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Deduplicated Supported Campaigns */}
            {FEATURES.money && (
              <div className="space-y-4">
                <h3 className="text-lg font-black text-stone-900 dark:text-white tracking-tight">{t("supportedCampaigns")}</h3>
                {supportedCampaigns.length === 0 ? (
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-stone-100 dark:border-zinc-800 text-center">
                    <p className="text-sm text-stone-400 dark:text-stone-500 font-medium">{t("noCampaignsSupported")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {supportedCampaigns.map((item) => {
                      const campaignImage =
                        campaigns.find((c) => c.id === item.id)?.imageUrl || "/images/hero-1.webp";
                      return (
                        <div
                          key={item.id}
                          className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm overflow-hidden border border-stone-100 dark:border-zinc-800 hover:shadow-md transition-shadow"
                        >
                          <div className="h-28 w-full relative">
                            <Image
                              src={campaignImage}
                              alt={item.title}
                              fill
                              className="object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = "/images/hero-1.webp";
                              }}
                            />
                          </div>
                          <div className="p-4">
                            <p className="text-xs font-bold truncate text-stone-900 dark:text-stone-100">{item.title}</p>
                            <p className="text-[10px] text-stone-405 mt-0.5">{t("campaignLabel")}</p>
                            <p className="text-xs font-black text-[#C17A3A] mt-2">{formatINR(item.amount)}</p>
                            <Link href={`/campaigns/${item.id}`} className="block mt-3">
                              <button className="w-full py-2 bg-[#C17A3A]/10 hover:bg-[#C17A3A]/15 text-[#C17A3A] text-xs rounded-xl font-bold transition-all">
                                {t("donateNow")}
                              </button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Account Settings Forms */}
            {settingsOpen && (
              <Reveal>
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-stone-100 dark:border-zinc-800 space-y-6">
                  <h3 className="text-lg font-black text-stone-900 dark:text-white tracking-tight">Account Configuration</h3>
                  
                  <form onSubmit={handleSave} className="space-y-5">
                    {/* Avatar Upload */}
                    <div className="flex justify-center">
                      <AvatarUpload
                        imageDataUrl={avatarDataUrl}
                        initials={initials}
                        onImageChange={handleAvatarChange}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Full Name */}
                      <div className="space-y-1.5">
                        <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-stone-400">
                          {t("fullNameLabel")}
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                          <Input
                            id="fullName"
                            className="pl-10 rounded-xl border-stone-200 focus-visible:ring-[#C17A3A]/20 py-5 font-medium"
                            placeholder={t("fullNamePlaceholder")}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Email (read-only) */}
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-stone-400">
                          {t("emailAddress")}
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                          <Input
                            id="email"
                            className="pl-10 rounded-xl border-stone-200 py-5 font-medium bg-stone-50 dark:bg-zinc-800 text-stone-400 cursor-not-allowed"
                            value={profile?.email || ""}
                            disabled
                          />
                        </div>
                      </div>
                    </div>

                    {/* Phone with dial-code dropdown */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> {t("phoneNumber")}
                      </Label>
                      <div className="flex gap-2">
                        <div className="w-[120px] shrink-0">
                          <SearchableSelect
                            options={dialCodeOptions}
                            value={dialCountry}
                            onChange={setDialCountry}
                            placeholder="+–"
                            searchPlaceholder="Search country…"
                            renderSelectedLabel={(opt) => getDialCode(opt.value, dialCodeOptions)}
                          />
                        </div>
                        <Input
                          id="phone"
                          type="tel"
                          inputMode="numeric"
                          className="flex-1 rounded-xl border-stone-200 focus-visible:ring-[#C17A3A]/20 py-5 font-medium"
                          placeholder={t("phonePlaceholder")}
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                        />
                      </div>
                    </div>

                    {/* Location Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-1">
                        <Label htmlFor="country" className="text-xs text-stone-500">{t("country")}</Label>
                        <SearchableSelect
                          id="country"
                          options={countryOptions}
                          value={countryIso}
                          onChange={handleCountryChange}
                          placeholder={t("selectCountry")}
                          searchPlaceholder="Search country…"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="state" className="text-xs text-stone-500">{t("stateProvince")}</Label>
                        {noStateOptions ? (
                          <p className="text-xs text-stone-400 italic py-2">
                            {t("noStatesListed")}
                          </p>
                        ) : (
                          <SearchableSelect
                            id="state"
                            options={stateOptions}
                            value={stateIso}
                            onChange={handleStateChange}
                            placeholder={t("selectState")}
                            disabledPlaceholder={t("selectCountryFirst")}
                            disabled={!countryIso}
                            searchPlaceholder="Search state…"
                          />
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="city" className="text-xs text-stone-500">{t("cityLabel")}</Label>
                        {showCityFreeText ? (
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                            <Input
                              id="city"
                              className="pl-10 rounded-xl border-stone-200 focus-visible:ring-[#C17A3A]/20 py-5 font-medium"
                              placeholder={t("enterCity")}
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
                            placeholder={t("selectCity")}
                            disabledPlaceholder={t("selectStateFirst")}
                            disabled={!stateIso}
                            searchPlaceholder="Search city…"
                          />
                        )}
                      </div>
                    </div>

                    {/* GPS Coordinates */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                        <Navigation className="w-3.5 h-3.5" /> {t("gpsLocation")}
                      </Label>
                      <div className="flex items-center gap-3 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-800/20 p-3">
                        <div className="flex-1 min-w-0">
                          {profile?.latitude && profile?.longitude ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              <div>
                                <p className="text-xs font-bold text-stone-850 dark:text-white">{t("locationSaved")}</p>
                                <p className="text-[10px] text-stone-400">
                                  {profile.latitude.toFixed(4)}, {profile.longitude.toFixed(4)}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                              <div>
                                <p className="text-xs font-bold text-stone-850 dark:text-white">{t("noGpsLocation")}</p>
                                <p className="text-[10px] text-stone-400">{t("gpsMatchingNote")}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleUseMyLocation}
                          disabled={locStatus === "requesting"}
                          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-[#b04a15] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#943e11] disabled:opacity-60"
                        >
                          {locStatus === "requesting" ? (
                            <><Loader2 className="w-3 h-3 animate-spin" /> {t("getting")}</>
                          ) : (
                            <><Navigation className="w-3 h-3" /> {t("useGps")}</>
                          )}
                        </button>
                      </div>
                      <p className="text-[10px] text-stone-400 leading-relaxed">
                        {t("gpsPrivacyNote")}
                      </p>
                    </div>

                    {/* Save button */}
                    <div className="pt-2">
                      <Button
                        type="submit"
                        className="w-full bg-[#C17A3A] hover:bg-[#a8642e] text-white rounded-xl py-6 font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition-colors"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="size-4 animate-spin" /> {t("saving")}
                          </>
                        ) : (
                          t("saveProfileChanges")
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </Reveal>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
