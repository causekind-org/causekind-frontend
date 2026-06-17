"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Country, State, City } from "country-state-city";
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
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { SearchableSelect, type SelectOption } from "@/components/profile/SearchableSelect";
import { useTranslations } from "next-intl";

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

// ── country-state-city option builders ───────────────────────────────────────

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

    // Run IP geolocation, profile fetch, donation/campaign history, and in-kind data in parallel
    Promise.all([
      detectCountryFromIP(),
      getProfile(),
      getMyDonations().catch((): Donation[] => []),
      getMyCampaigns().catch((): Campaign[] => []),
      getMyItemRequests().catch((): ItemRequest[] => []),
      getMyMatches().catch((): ItemMatch[] => []),
    ])
      .then(([detectedCountry, p, d, c, req, matches]) => {
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
                  const states = State.getStatesOfCountry(countryCode);
                  const matchedState = states.find(
                    (s) => s.name.toLowerCase() === stateName?.toLowerCase() ||
                           s.name.toLowerCase().includes(stateName?.toLowerCase() || "")
                  );
                  if (matchedState) {
                    setStateIso(matchedState.isoCode);
                    const cities = City.getCitiesOfState(countryCode, matchedState.isoCode);
                    const matchedCity = cities.find(
                      (c) => c.name.toLowerCase() === cityName?.toLowerCase()
                    );
                    if (matchedCity) {
                      setCityValue(matchedCity.name);
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
    const dialCode = getDialCode(dialCountry);
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
  const hasFirstGiver = completedDonations.length > 0;
  const hasCommunityHero = campaignsSupported >= 3;
  const hasEducationAdvocate = completedDonations.some((d) =>
    d.campaignTitle?.toLowerCase().includes("education")
  );

  const badges = [
    { label: t("badgeFirstGiver"), icon: Heart, earned: hasFirstGiver },
    { label: t("badgeCommunityHero"), icon: Award, earned: hasCommunityHero },
    { label: t("badgeEducationAdvocate"), icon: BookOpen, earned: hasEducationAdvocate },
  ];

  return (
    <div className="bg-[#F7F0E8] min-h-screen pb-28">

      {/* ── Page Header ── */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black text-stone-900">{t("myImpact")}</h1>
        <div className="w-10 h-10 rounded-full bg-[#C17A3A] flex items-center justify-center overflow-hidden shrink-0">
          {avatarDataUrl ? (
            <Image
              src={avatarDataUrl}
              alt={initials}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white font-bold text-sm">{initials}</span>
          )}
        </div>
      </div>

      {/* ── Hero Impact Card ── */}
      <div className="mx-5 mt-2 rounded-3xl overflow-hidden">
        <div className="bg-gradient-to-br from-[#C17A3A] to-[#8B4513] p-6 text-white relative">
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-wide opacity-80">{t("totalImpact")}</p>
            <p className="text-4xl font-black leading-tight mt-1">{formatINR(totalGiven)}</p>
            <p className="text-sm opacity-80 mt-1">{t("donated")}</p>
            <div className="border-t border-white/30 my-3" />
            <p className="text-sm font-semibold">
              {inKindCount} {inKindCount !== 1 ? t("inKindItemsGiven") : t("inKindItemGiven")}
            </p>
          </div>
          {/* Decorative illustration */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="40" cy="20" r="12" fill="white" />
              <path d="M18 70c0-12.15 9.85-22 22-22h0c12.15 0 22 9.85 22 22" stroke="white" strokeWidth="5" strokeLinecap="round" />
              <circle cx="16" cy="28" r="8" fill="white" />
              <path d="M2 62c0-8.84 5.37-16 12-16" stroke="white" strokeWidth="4" strokeLinecap="round" />
              <circle cx="64" cy="28" r="8" fill="white" />
              <path d="M78 62c0-8.84-5.37-16-12-16" stroke="white" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Supported Campaigns ── */}
      <div className="px-5 mt-6">
        <p className="text-lg font-bold text-stone-900 mb-3">{t("supportedCampaigns")}</p>
        {supportedCampaigns.length === 0 ? (
          <div className="bg-white rounded-2xl px-4 py-6 shadow-sm text-center">
            <p className="text-sm text-stone-400">{t("noCampaignsSupported")}</p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-3 -mx-0 scrollbar-hide">
            {supportedCampaigns.map((item) => {
              const campaignImage =
                campaigns.find((c) => c.id === item.id)?.imageUrl || "/images/hero-1.webp";
              return (
                <div
                  key={item.id}
                  className="w-48 shrink-0 bg-white rounded-2xl shadow-sm overflow-hidden"
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
                  <div className="px-3 py-2">
                    <p className="text-xs font-bold truncate text-stone-900">{item.title}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">{t("campaignLabel")}</p>
                    <p className="text-xs font-bold text-[#C17A3A] mt-1">{formatINR(item.amount)}</p>
                    <Link href={`/campaigns/${item.id}`}>
                      <button className="w-full mt-1.5 py-1 bg-[#C17A3A] text-white text-xs rounded-lg font-semibold hover:bg-[#a8642e] transition-colors">
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

      {/* ── Two-column grid: Badges + My Requests ── */}
      <div className="px-5 mt-6 grid grid-cols-2 gap-4">

        {/* Badges & Recognition */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-stone-900 mb-3">{t("badges")}</p>
          <div className="grid grid-cols-3 gap-2">
            {badges.map(({ label, icon: Icon, earned }) => (
              <div
                key={label}
                className={`flex flex-col items-center ${earned ? "" : "opacity-40"}`}
              >
                <div className="w-10 h-10 rounded-full bg-[#C17A3A]/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#C17A3A]" />
                </div>
                <p className="text-[9px] font-semibold text-stone-600 text-center mt-1 leading-tight">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* My Requests */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-stone-900 mb-3">{t("myRequests")}</p>
          {myRequests.length === 0 ? (
            <p className="text-xs text-stone-400">{t("noRequestsYet")}</p>
          ) : (
            <div className="space-y-0.5">
              {myRequests.slice(0, 3).map((req) => (
                <div key={req.id} className="flex items-center gap-2 py-1.5">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-stone-100 shrink-0 flex items-center justify-center">
                    {req.imageUrl ? (
                      <Image
                        src={req.imageUrl}
                        alt={req.title}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-4 h-4 text-stone-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold truncate text-stone-900">{req.title}</p>
                    <p className="text-[10px] text-stone-400 truncate">{req.city}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Account Settings ── */}
      <div className="px-5 mt-6 mb-6">
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          className="w-full flex items-center justify-between py-3 px-4 bg-white rounded-2xl shadow-sm"
        >
          <span className="text-sm font-bold text-stone-900">{t("accountSettings")}</span>
          <ChevronDown
            className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${settingsOpen ? "rotate-180" : ""}`}
          />
        </button>

        {settingsOpen && (
          <div className="bg-white rounded-2xl p-5 mt-3 shadow-sm">
            <form onSubmit={handleSave} className="space-y-5">

              {/* Avatar */}
              <div className="flex justify-center">
                <AvatarUpload
                  imageDataUrl={avatarDataUrl}
                  initials={initials}
                  onImageChange={handleAvatarChange}
                />
              </div>

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
                <div className="flex justify-between items-center">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    {t("emailAddress")}
                  </Label>
                  <span className="text-[10px] font-black text-stone-400 uppercase flex items-center gap-1">
                    <Shield className="w-3 h-3 text-[#C17A3A]" /> {t("systemId")}
                  </span>
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <Input
                    id="email"
                    className="pl-10 rounded-xl border-stone-200 py-5 font-medium bg-stone-50 text-stone-400 cursor-not-allowed"
                    value={profile?.email || ""}
                    disabled
                  />
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
                      renderSelectedLabel={(opt) => getDialCode(opt.value)}
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

              {/* Location: Country → State → City */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {t("location")}
                </Label>

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
                    <p className="text-xs text-stone-400 italic py-1">
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
                <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <div className="flex-1 min-w-0">
                    {profile?.latitude && profile?.longitude ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-stone-800">{t("locationSaved")}</p>
                          <p className="text-[10px] text-stone-400">
                            {profile.latitude.toFixed(4)}, {profile.longitude.toFixed(4)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-stone-800">{t("noGpsLocation")}</p>
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
              <div className="pt-1">
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
        )}
      </div>

    </div>
  );
}
