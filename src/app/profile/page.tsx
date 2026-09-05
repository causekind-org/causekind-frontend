"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { useLocations } from "@/hooks/useLocations";
import { resolveLocationFromGPS, getDialCodes } from "@/app/actions/locations";
import {
  getProfile,
  updateProfile,
  updateLocation,
  getMyDonations,
  getMyCampaigns,
  getMyItemRequests,
  getMyItemListings,
  getMyMatches,
  type UserProfile,
  type Donation,
  type Campaign,
  type ItemRequest,
  type ItemListing,
  type ItemMatch,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { FEATURES } from "@/lib/features";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
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
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { SearchableSelect, type SelectOption } from "@/components/profile/SearchableSelect";
import { useTranslations } from "next-intl";
import { PHONE_LENGTHS, getDialCode } from "@/lib/phone";

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

/**
 * A human-looking name for someone whose profile hasn't loaded (or who never
 * filled one in). Showing the raw address instead put
 * "causekindorg@gmail.com" in the pass's italic serif name slot, where it wrapped
 * mid-domain and read as a broken field rather than a person.
 */
function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return (
    local
      .split(/[._\-+\d]+/)
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ") || email
  );
}

/** "DONEE" -> "Donee", "SUPER_ADMIN" -> "Super admin". Rendered uppercase by CSS. */
function humanizeRole(role: string): string {
  const r = role.replace(/_/g, " ").toLowerCase().trim();
  return r ? r[0].toUpperCase() + r.slice(1) : "";
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

/**
 * Splits a stored phone number into its dial code and the national number.
 *
 * <p>Matches the longest dial code that actually exists in the list rather than
 * guessing at the prefix length. A greedy `^(\+\d{1,4})` regex reads
 * "+911236547890" as dial code "+9112", finds no country with that code, and
 * falls back to putting the whole string — leading "+91" and all — into the
 * number field, which then renders as "+91 | +911236547890".
 *
 * <p>Whitespace is ignored while matching, so both "+91 1236547890" (what
 * `handleSave` writes) and "+911236547890" (older rows, or anything saved
 * elsewhere) parse the same way.
 *
 * <p>`preferredIso` disambiguates countries sharing a code (+1 is US, CA and a
 * dozen more); without a hint the longest matching code wins.
 */
function splitPhone(
  stored: string,
  dialCodes: any[],
  preferredIso?: string
): { iso: string | null; number: string } {
  const raw = stored.trim();
  if (!raw.startsWith("+")) {
    const digits = raw.replace(/\D/g, "");
    return { iso: null, number: digits.slice(0, 10) };
  }

  const rest = raw.slice(1).replace(/[\s()-]/g, "");

  let best: { iso: string; len: number; preferred: boolean } | null = null;

  for (const c of dialCodes) {
    const code = String(c?.phonecode ?? "").replace(/^\+/, "");
    if (!code || !rest.startsWith(code)) continue;
    const preferred = c.value === preferredIso;
    // A hit on the country we already expect outranks a merely longer code:
    // "+1 242…" is a US number far more often than it is a Bahamian one when
    // the rest of the profile says US. Otherwise the longest code wins.
    const better =
      !best ||
      (preferred && !best.preferred) ||
      (preferred === best.preferred && code.length > best.len);
    if (better) best = { iso: c.value, len: code.length, preferred };
  }

  if (!best) return { iso: null, number: raw.replace(/\D/g, "").slice(0, 10) };
  const digits = rest.slice(best.len);
  const maxLen = PHONE_LENGTHS[best.iso] ?? 10;
  return { iso: best.iso, number: digits.slice(0, maxLen) };
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");

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
  const [forceFreeTextCity, setForceFreeTextCity] = useState(false);

  // Donation history + campaign stats
  const [donations, setDonations] = useState<Donation[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // In-kind / requests / matches (full lists — the chronicle is built from them)
  const [myRequests, setMyRequests] = useState<ItemRequest[]>([]);
  const [myListings, setMyListings] = useState<ItemListing[]>([]);
  const [myMatches, setMyMatches] = useState<ItemMatch[]>([]);

  /**
   * True when any of the three in-kind fetches failed.
   *
   * <p>Each of those calls catches its own rejection and yields `[]` so one dead
   * endpoint cannot blank the whole profile. That is the right call for the page,
   * but an empty array is indistinguishable from "this user has done nothing" —
   * so without this flag a backend outage rendered a donor's earned milestones as
   * three greyed-out "Locked" stamps and a ledger of zeros. The page asserted, as
   * fact, that they had achieved nothing. Unknown has to look unknown.
   */
  const [activityLoadFailed, setActivityLoadFailed] = useState(false);
  const [activityRetrying, setActivityRetrying] = useState(false);

  // Settings panel toggle. The form lives in a modal rather than a section at
  // the foot of the page: opening it there put the fields a screen or two below
  // the button, so the click read as doing nothing.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storyExpanded, setStoryExpanded] = useState(false);

  // GPS location
  const [locStatus, setLocStatus] = useState<"idle" | "requesting" | "saved" | "error">("idle");

  // Derived option lists (memoized to avoid re-building every render)
  const { countries: countryOptions, states: stateOptions, cities: cityOptions, dialCodes: dialCodeOptions } = useLocations(countryIso, stateIso);
  const maxPhoneLength = PHONE_LENGTHS[dialCountry] ?? 10;

  // Whether we fall back to free-text for city
  const noStateOptions = countryIso !== "" && stateOptions.length === 0;
  const noCityOptions = stateIso !== "" && cityOptions.length === 0;
  // forceFreeTextCity covers GPS finding a real city that just isn't in the dataset's
  // list for this state — the "zero cities listed" checks alone miss that case.
  const showCityFreeText = noStateOptions || noCityOptions || forceFreeTextCity;

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

    // Set by the three in-kind catches below. A plain local, not state: it is
    // written while the promises settle and read once in `finally`, so a setter
    // per rejection would just queue redundant renders.
    let activityFailed = false;
    let profileFailed = false;

    // Run IP geolocation, profile fetch, donation/campaign history, and in-kind data in parallel
    Promise.all([
      detectCountryFromIP(),
      // Caught like the activity calls: a dead /auth/me used to reject the whole
      // Promise.all, so a single backend hiccup also threw away the donations,
      // listings and matches that had already come back, and left the page
      // claiming the signed-in donor was a nameless "MEMBER".
      getProfile().catch((): UserProfile | null => { profileFailed = true; return null; }),
      getMyDonations().catch((): Donation[] => []),
      getMyCampaigns().catch((): Campaign[] => []),
      // These three feed the milestones and the ledger. Still caught — but the
      // failure is recorded rather than discarded, so the UI can distinguish
      // "nothing yet" from "we could not find out". Campaigns and donations are
      // excluded on purpose: money features are flagged off (see `void campaigns`
      // below) and neither drives a milestone in that state.
      getMyItemRequests().catch((): ItemRequest[] => { activityFailed = true; return []; }),
      getMyItemListings({ silent401: true }).catch((): ItemListing[] => { activityFailed = true; return []; }),
      getMyMatches().catch((): ItemMatch[] => { activityFailed = true; return []; }),
      getDialCodes(),
    ])
      .then(([detectedCountry, p, d, c, req, listings, matches, serverDialCodes]) => {
        setProfile(p);
        setDonations(d);
        setCampaigns(c);
        setMyRequests(req);
        setMyListings(listings);
        setMyMatches(matches);

        if (!p) {
          // No profile: still resolve a sensible country so the settings form
          // and the dial-code picker are usable, then stop.
          setCountryIso(detectedCountry);
          setDialCountry(detectedCountry);
          toast.error(t("errorLoadProfile"));
          return;
        }

        setFullName(p.fullName);

        // Parse phone: if stored with a dial-code prefix, split it back out so
        // the dropdown and the input each hold their own half.
        if (p.phone) {
          const { iso, number } = splitPhone(p.phone, serverDialCodes, detectedCountry);
          if (iso) setDialCountry(iso);
          setPhoneNumber(number);
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
      .finally(() => {
        setActivityLoadFailed(activityFailed || profileFailed);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, router]);

  /**
   * Re-fetches only the three in-kind endpoints, for the Retry control.
   *
   * <p>Deliberately not the whole `Promise.all` above: that one also parses the
   * phone number and resolves the country/state/city selects from the profile,
   * and re-running it would stamp over anything the donor had typed into the
   * settings form since the page loaded.
   */
  const retryActivity = useCallback(async () => {
    setActivityRetrying(true);
    let failed = false;
    const [req, listings, matches] = await Promise.all([
      getMyItemRequests().catch((): ItemRequest[] => { failed = true; return []; }),
      getMyItemListings({ silent401: true }).catch((): ItemListing[] => { failed = true; return []; }),
      getMyMatches().catch((): ItemMatch[] => { failed = true; return []; }),
    ]);
    // Only adopt the results when every call came back. A partial success would
    // otherwise overwrite good state with the empty arrays from the failures.
    if (!failed) {
      setMyRequests(req);
      setMyListings(listings);
      setMyMatches(matches);
    }
    setActivityLoadFailed(failed);
    setActivityRetrying(false);
  }, []);

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
    setForceFreeTextCity(false);
  }

  // State change: reset city
  function handleStateChange(iso: string) {
    setStateIso(iso);
    setCityValue("");
    setCityFreeText("");
    setForceFreeTextCity(false);
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
                      setForceFreeTextCity(false);
                    } else if (cityName) {
                      setCityValue("");
                      setCityFreeText(cityName);
                      setForceFreeTextCity(true);
                    }
                  } else {
                    setStateIso("");
                    setCityValue("");
                    if (cityName) { setCityFreeText(cityName); setForceFreeTextCity(true); }
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

    const rawPhone = phoneNumber.replace(/\D/g, "");
    const dialCode = getDialCode(dialCountry, dialCodeOptions);
    // Backend requires phone formatted without spaces (e.g. "+919876543210")
    const fullPhone = dialCode && rawPhone ? `${dialCode}${rawPhone}` : rawPhone;
    const cityStr = buildCityString();

    if (!fullName.trim()) {
      toast.error(t("errorNoName"));
      return;
    }
    if (!rawPhone) {
      toast.error(t("errorNoPhone"));
      return;
    }
    const expectedPhoneLength = PHONE_LENGTHS[dialCountry] ?? 10;
    if (rawPhone.length !== expectedPhoneLength) {
      toast.error(`Phone number must be exactly ${expectedPhoneLength} digits`);
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
      setSettingsOpen(false);
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

  // The profile is the source of truth, but it can be missing (backend down, or
  // a fetch that failed). The signed-in session already carries an email and a
  // role, so fall back to those rather than to a blank name and a generic
  // "MEMBER" badge that contradicts what the user actually is.
  const displayName = fullName || profile?.fullName || nameFromEmail(user.email);
  const displayEmail = profile?.email ?? user.email;
  const displayRole = humanizeRole(profile?.role || user.role || "Member");
  const initials = getInitials(displayName);
  const isDonee = (profile?.role || user.role || "").toUpperCase() === "DONEE";

  // Section accents: copper for donors, the donee dashboard's navy for donees
  const acc = isDonee
    ? {
        eyebrow:   "text-[#1e3a60] dark:text-blue-400",
        rule:      "border-[#1e3a60]/60",
        softBg:    "bg-[#1e3a60]/10",
        icon:      "text-[#1e3a60] dark:text-blue-400",
        solidBtn:  "bg-[#1e3a60] hover:bg-[#162d4a]",
        timeline:  "border-[#1e3a60]/25 dark:border-blue-400/30",
        dotBorder: "border-[#1e3a60]",
        hoverText: "group-hover:text-[#1e3a60] dark:group-hover:text-blue-400",
        badge:     "bg-[#1e3a60] text-white shadow-lg shadow-[#1e3a60]/30",
        badgeRing: "border-[#1e3a60]/35",
        focusRing: "focus-visible:ring-[#1e3a60]/20",
        gpsBtn:    "bg-[#1e3a60] hover:bg-[#162d4a]",
      }
    : {
        eyebrow:   "text-[#8B4513] dark:text-[#C17A3A]",
        rule:      "border-[#C17A3A]/60",
        softBg:    "bg-[#C17A3A]/10",
        icon:      "text-[#C17A3A]",
        solidBtn:  "bg-[#C17A3A] hover:bg-[#a8642e]",
        timeline:  "border-[#C17A3A]/25 dark:border-[#C17A3A]/30",
        dotBorder: "border-[#C17A3A]",
        hoverText: "group-hover:text-[#8B4513] dark:group-hover:text-[#C17A3A]",
        badge:     "bg-[#C17A3A] text-white shadow-lg shadow-[#C17A3A]/30",
        badgeRing: "border-[#C17A3A]/35",
        focusRing: "focus-visible:ring-[#C17A3A]/20",
        gpsBtn:    "bg-[var(--ck-role-accent)] hover:bg-[#943e11]",
      };

  const completedDonations = donations.filter((d) => d.status === "COMPLETED");
  void campaigns;

  const fulfilledCount = myRequests.filter((r) => ["FULFILLED", "FULLY_FULFILLED"].includes(r.status)).length;

  // Role-aware milestones: a donee never "gives", a donor never "requests"
  const milestones = isDonee
    ? [
        { label: "First Need",     desc: "Posted your first request",  icon: Package,      earned: myRequests.length > 0 },
        { label: "First Match",    desc: "Matched with a donor",       icon: Handshake,    earned: myMatches.length > 0 },
        { label: "Need Fulfilled", desc: "Received an item",           icon: CheckCircle2, earned: fulfilledCount > 0 },
      ]
    : [
        { label: "First Listing",      desc: "Listed your first item",     icon: Package,      earned: myListings.length > 0 },
        { label: "First Match",        desc: "An item found its person",   icon: Handshake,    earned: myMatches.length > 0 || (FEATURES.money && completedDonations.length > 0) },
        { label: "Donation Completed", desc: "Delivered a donation",       icon: CheckCircle2, earned: myMatches.some((m) => ["FULFILLED", "COMPLETED"].includes(m.status)) || myListings.some((l) => ["DONATED", "FULFILLED", "PARTIALLY_DONATED"].includes(l.status)) },
      ];

  const ledger = isDonee
    ? [
        { n: myRequests.length, label: "needs posted"   },
        { n: myMatches.length,  label: "matches made"   },
        { n: fulfilledCount,    label: "needs received" },
      ]
    : [
        { n: myListings.length, label: "items listed" },
        { n: myMatches.filter((m) => !["FULFILLED", "COMPLETED", "CANCELLED", "REJECTED", "FAILED"].includes(m.status)).length, label: "active matches" },
        { n: myMatches.filter((m) => ["FULFILLED", "COMPLETED"].includes(m.status)).length, label: "donations completed" },
      ];

  // The chronicle: real events only, newest first
  const humanize = (v: string) => v.replace(/_/g, " ").toLowerCase();
  const story = [
    ...myListings.map((l) => ({
      at: new Date(l.submittedAt ?? l.createdAt).getTime(),
      title: `Listed "${l.title}"`,
      detail: `${l.category ?? "item"} - now ${humanize(l.status)}`,
      broken: ["REJECTED", "WITHDRAWN", "EXPIRED"].includes(l.status),
      done: ["DONATED", "FULFILLED", "PARTIALLY_DONATED"].includes(l.status),
    })),
    ...myRequests.map((r) => ({
      at: new Date(r.createdAt).getTime(),
      title: `Posted "${r.title}"`,
      detail: `${r.category} - now ${humanize(r.status)}`,
      broken: ["REJECTED", "EXPIRED"].includes(r.status),
      done: ["FULFILLED", "FULLY_FULFILLED"].includes(r.status),
    })),
    ...myMatches.map((m) => ({
      at: new Date(m.createdAt).getTime(),
      title: isDonee
        ? `Matched with a donor for "${m.requestTitle ?? m.listingTitle ?? "your request"}"`
        : `Your item matched: "${m.listingTitle ?? m.requestTitle ?? "an item"}"`,
      detail: `now ${humanize(m.status)}`,
      broken: ["REJECTED", "CANCELLED", "FAILED"].includes(m.status),
      done: ["FULFILLED", "COMPLETED"].includes(m.status),
    })),
    ...(FEATURES.money
      ? completedDonations.map((d) => ({
          at: new Date(d.createdAt).getTime(),
          title: `Donated ${formatINR(Number(d.amount))} to "${d.campaignTitle}"`,
          detail: "completed",
          broken: false,
          done: true,
        }))
      : []),
  ].sort((a, b) => b.at - a.at).slice(0, 12);

  // The chronicle is capped at 12 above, but 12 rows is still a long scroll on a
  // phone. Collapse to the newest few on mobile only; desktop always shows all.
  const STORY_COLLAPSED_COUNT = 5;

  const fmtDate = (at: number) =>
    new Date(at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="bg-[#F7F0E8] dark:bg-zinc-950 min-h-screen pb-28">

      {/* Header band: espresso/copper for donors, deep navy (donee dashboard theme) for donees */}
      <div className="relative overflow-hidden text-white"
        style={{ background: isDonee
          ? "linear-gradient(140deg, #0a1626 0%, #1e3a60 52%, #0a2040 100%)"
          : "linear-gradient(140deg, #2a1a10 0%, #40281a 52%, #241610 100%)" }}>
        <div className={`pointer-events-none absolute -top-24 right-[8%] w-[420px] h-[420px] rounded-full border ${isDonee ? "border-[#5b8fd6]/15" : "border-[#C17A3A]/15"}`} />
        <div className={`pointer-events-none absolute -bottom-32 -left-16 w-72 h-72 rounded-full border ${isDonee ? "border-[#5b8fd6]/10" : "border-[#C17A3A]/10"}`} />
        <div className="pointer-events-none absolute inset-0" style={{ background: isDonee
          ? "radial-gradient(ellipse at 75% 20%, rgba(96,165,250,0.14) 0%, transparent 55%)"
          : "radial-gradient(ellipse at 75% 20%, rgba(193,122,58,0.14) 0%, transparent 55%)" }} />

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-14 pb-2 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 sm:gap-10 lg:gap-16 items-center">
          <div data-tour="member-pass">
            <MemberPass
              name={displayName}
              role={displayRole}
              city={profile?.city}
              avatarDataUrl={avatarDataUrl}
              initials={initials}
            />
          </div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1 }} className="min-w-0">
            <p className={`text-3xs font-black uppercase tracking-[0.28em] ${isDonee ? "text-[#7fb0e8]" : "text-[#C17A3A]"}`}>CauseKind {displayRole}</p>
            <h1 className="mt-1.5 sm:mt-2 text-2xl sm:text-4xl md:text-5xl leading-[1.05] break-words"
              style={{ fontFamily: "var(--font-lora), serif", fontStyle: "italic", fontWeight: 600 }}>
              {displayName}
            </h1>
            <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 sm:gap-y-1.5 text-2xs sm:text-xs text-white/55">
              <span className="flex items-center gap-1.5"><Mail className={`w-3.5 h-3.5 ${isDonee ? "text-[#7fb0e8]" : "text-[#C17A3A]"}`} />{displayEmail}</span>
              {profile?.phone && <span className="flex items-center gap-1.5"><Phone className={`w-3.5 h-3.5 ${isDonee ? "text-[#7fb0e8]" : "text-[#C17A3A]"}`} />{profile.phone}</span>}
              {profile?.city && <span className="flex items-center gap-1.5"><MapPin className={`w-3.5 h-3.5 ${isDonee ? "text-[#7fb0e8]" : "text-[#C17A3A]"}`} />{profile.city}</span>}
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              data-tour="account-settings"
              className={`mt-4 sm:mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br px-4 py-2.5 sm:px-5 sm:py-3 text-2xs sm:text-xs font-bold uppercase tracking-wider text-[#faf8f5] shadow-lg ring-1 ring-white/20 transition-all hover:shadow-xl hover:-translate-y-0.5 ${
                isDonee
                  ? "from-[#3a6aa8] to-[#1e3a60] hover:from-[#4678b8] hover:to-[#26497a] shadow-[#0d1e36]/50 hover:shadow-[#0d1e36]/60"
                  : "from-[var(--ck-role-secondary)] to-[var(--ck-role-accent)] hover:from-[#e8894c] hover:to-[#c25620] shadow-[var(--ck-role-accent)]/40 hover:shadow-[var(--ck-role-accent)]/50"
              }`}
            >
              Edit account details
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        </div>

        {/* Live ledger: hairline strip inside the band */}
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
          <div data-tour="profile-ledger" className="mt-6 sm:mt-10 grid grid-cols-3 border-t border-white/10">
            {ledger.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                className={`py-4 sm:py-6 ${i > 0 ? "border-l border-white/10 pl-3 sm:pl-8" : ""}`}>
                {/* An em dash, not 0, when the fetch failed — the same reasoning
                    as the milestones: a confident "0 items listed" is a false
                    statement about this person, where "—" is merely unknown. */}
                <p className="text-2xl sm:text-4xl md:text-5xl tabular-nums leading-none" style={{ fontFamily: "var(--font-source-serif-4), serif" }}>
                  {activityLoadFailed ? "—" : stat.n}
                </p>
                <p className="text-4xs sm:text-3xs uppercase tracking-[0.16em] sm:tracking-[0.22em] text-white/40 mt-1 sm:mt-2 leading-tight">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 mt-8 sm:mt-12 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 sm:gap-12 items-start">

        {/* Your story: a chronicle of real events */}
        <section data-tour="story">
          <div className={`border-b-2 ${acc.rule} pb-2.5 sm:pb-3`}>
            <p className={`text-3xs font-black uppercase tracking-[0.24em] ${acc.eyebrow}`}>Your story</p>
            <p className="text-xs text-stone-400 mt-1">Everything that has happened on your CauseKind journey, newest first.</p>
          </div>

          {story.length === 0 ? (
            <div className="py-10 sm:py-14 text-center space-y-3">
              <div className={`w-11 h-11 sm:w-14 sm:h-14 ${acc.softBg} rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto`}>
                <BookOpen className={`w-6 h-6 ${acc.icon}`} />
              </div>
              <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Your story starts here</p>
              <p className="text-xs text-stone-400 max-w-[260px] mx-auto">
                {isDonee ? "Post your first need and this page will chronicle every step of it." : "List your first item and this page will chronicle every donation."}
              </p>
              <Link href={isDonee ? "/requests/new" : "/items/new"} className="inline-block">
                <Button size="sm" className={`${acc.solidBtn} text-white mt-2`}>
                  {isDonee ? "Post a need" : "List an item"}
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <ol className={`relative mt-2 border-l-2 ${acc.timeline} ml-2`}>
                {story.map((ev, i) => (
                  <motion.li key={`${ev.title}-${ev.at}`}
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: Math.min(i, STORY_COLLAPSED_COUNT) * 0.08 }}
                    className={`relative pl-6 py-2.5 sm:pl-8 sm:py-4 group ${
                      !storyExpanded && i >= STORY_COLLAPSED_COUNT ? "hidden sm:block" : ""}`}>
                    <span className={`absolute -left-[8px] sm:-left-[9px] top-3.5 sm:top-5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center ${
                      ev.broken ? "bg-red-500 border-red-500" : ev.done ? "bg-emerald-500 border-emerald-500" : `bg-[#F7F0E8] dark:bg-zinc-950 ${acc.dotBorder}`}`}>
                      {(ev.done || ev.broken) && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 sm:gap-x-4 gap-y-1">
                      <p className={`text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 leading-snug ${acc.hoverText} transition-colors`}
                        style={{ fontFamily: "var(--font-source-serif-4), serif" }}>
                        {ev.title}
                      </p>
                      <span className="text-3xs font-bold uppercase tracking-wider text-stone-400 shrink-0">{fmtDate(ev.at)}</span>
                    </div>
                    <p className={`text-2xs sm:text-xs mt-0.5 capitalize ${ev.broken ? "text-red-500" : ev.done ? "text-emerald-600" : "text-stone-400"}`}>{ev.detail}</p>
                  </motion.li>
                ))}
              </ol>

              {story.length > STORY_COLLAPSED_COUNT && (
                <button
                  type="button"
                  onClick={() => setStoryExpanded((v) => !v)}
                  className={`sm:hidden mt-3 ml-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-2xs font-bold uppercase tracking-wider ${acc.softBg} ${acc.eyebrow}`}
                >
                  {storyExpanded
                    ? "Show less"
                    : `Show ${story.length - STORY_COLLAPSED_COUNT} more`}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${storyExpanded ? "rotate-180" : ""}`} />
                </button>
              )}
            </>
          )}
        </section>

        {/* Milestone stamps */}
        <aside data-tour="milestones">
          <div className={`border-b-2 ${acc.rule} pb-2.5 sm:pb-3`}>
            <p className={`text-3xs font-black uppercase tracking-[0.24em] ${acc.eyebrow}`}>Milestones</p>
            <p className="text-xs text-stone-400 mt-1">Earned by doing, never bought.</p>
          </div>
          {/* A failed fetch must not render as "Locked". Locked is a claim about
              what this person has done; when the request never came back we do
              not know, and saying so is the only honest option. */}
          {activityLoadFailed ? (
            <div className="mt-4 sm:mt-6">
              <p className="text-xs text-stone-500 dark:text-zinc-400">
                Couldn&apos;t load your activity, so your milestones aren&apos;t shown.
              </p>
              <button
                type="button"
                onClick={() => void retryActivity()}
                disabled={activityRetrying}
                className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-2xs font-bold uppercase tracking-wider disabled:opacity-60 ${acc.softBg} ${acc.eyebrow}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${activityRetrying ? "animate-spin" : ""}`} aria-hidden />
                {activityRetrying ? "Retrying" : "Retry"}
              </button>
            </div>
          ) : (
          <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-5">
            {milestones.map(({ label, desc, icon: Icon, earned }, i) => (
              <motion.div key={label}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.15 + i * 0.12 }}
                className="flex items-center gap-3 sm:gap-4">
                <div className={`relative w-9 h-9 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shrink-0 ${
                  earned ? acc.badge : "border-2 border-dashed border-stone-300 dark:border-zinc-700 text-stone-300 dark:text-zinc-600"}`}>
                  {earned && <span className={`absolute inset-[-4px] rounded-full border ${acc.badgeRing}`} />}
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm sm:text-sm font-bold ${earned ? "text-stone-900 dark:text-stone-100" : "text-stone-400 dark:text-zinc-600"}`}>{label}</p>
                  <p className="text-3xs sm:text-2xs text-stone-400 dark:text-zinc-600 mt-0.5">{earned ? desc : `Locked - ${desc.toLowerCase()}`}</p>
                </div>
              </motion.div>
            ))}
          </div>
          )}
        </aside>
      </div>

      {/* Account settings, in a modal. `display: contents` on the form lets the
          dialog's own column layout (fixed header, scrolling body, pinned
          footer) apply to its children while the submit button stays a real
          form submit. */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className={`text-3xs font-black uppercase tracking-[0.24em] ${acc.eyebrow}`}>
              Account settings
            </DialogTitle>
            <DialogDescription>Update your name, phone number and location.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="contents">
            <DialogBody className="space-y-4 sm:space-y-5">
                    {/* Avatar Upload */}
                    <div className="flex justify-center">
                      <AvatarUpload
                        imageDataUrl={avatarDataUrl}
                        initials={initials}
                        onImageChange={handleAvatarChange}
                        tone={isDonee ? "navy" : "copper"}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                      {/* Full Name */}
                      <div className="space-y-1.5">
                        <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-stone-400">
                          {t("fullNameLabel")}
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                          <Input
                            id="fullName"
                            className={`pl-10 rounded-xl border-stone-200 py-3.5 sm:py-5 font-medium ${acc.focusRing}`}
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
                            className="pl-10 rounded-xl border-stone-200 py-3.5 sm:py-5 font-medium bg-stone-50 dark:bg-zinc-800 text-stone-400 cursor-not-allowed"
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
                        <div className="w-[96px] sm:w-[120px] shrink-0">
                          <SearchableSelect
                            options={dialCodeOptions}
                            value={dialCountry}
                            onChange={(iso) => {
                              setDialCountry(iso);
                              const maxLen = PHONE_LENGTHS[iso] ?? 10;
                              setPhoneNumber((prev) => prev.slice(0, maxLen));
                            }}
                            placeholder="+–"
                            searchPlaceholder="Search country…"
                            renderSelectedLabel={(opt) => getDialCode(opt.value, dialCodeOptions)}
                          />
                        </div>
                        <Input
                          id="phone"
                          type="tel"
                          inputMode="numeric"
                          maxLength={maxPhoneLength}
                          className={`flex-1 rounded-xl border-stone-200 py-3.5 sm:py-5 font-medium ${acc.focusRing}`}
                          placeholder={t("phonePlaceholder")}
                          value={phoneNumber}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "").slice(0, maxPhoneLength);
                            setPhoneNumber(digits);
                          }}
                        />
                      </div>
                    </div>

                    {/* Location Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
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
                              className={`pl-10 rounded-xl border-stone-200 py-3.5 sm:py-5 font-medium ${acc.focusRing}`}
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
                                <p className="text-3xs text-stone-400">
                                  {profile.latitude.toFixed(4)}, {profile.longitude.toFixed(4)}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                              <div>
                                <p className="text-xs font-bold text-stone-850 dark:text-white">{t("noGpsLocation")}</p>
                                <p className="text-3xs text-stone-400">{t("gpsMatchingNote")}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleUseMyLocation}
                          disabled={locStatus === "requesting"}
                          className={`shrink-0 flex items-center gap-1.5 rounded-lg ${acc.gpsBtn} px-3 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-60`}
                        >
                          {locStatus === "requesting" ? (
                            <><Loader2 className="w-3 h-3 animate-spin" /> {t("getting")}</>
                          ) : (
                            <><Navigation className="w-3 h-3" /> {t("useGps")}</>
                          )}
                        </button>
                      </div>
                      <p className="text-3xs text-stone-400 leading-relaxed">
                        {t("gpsPrivacyNote")}
                      </p>
                    </div>

            </DialogBody>

            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl py-4 font-bold text-sm"
                  disabled={saving}
                >
                  {tCommon("cancel")}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                className={`${acc.solidBtn} text-white rounded-xl py-4 font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition-colors`}
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
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* Interactive member pass: tilts toward the cursor with a moving glare */
function MemberPass({ name, role, city, avatarDataUrl, initials }: {
  name: string; role: string; city: string | null | undefined;
  avatarDataUrl: string | null; initials: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 });
  // Copper pass for donors, navy pass (donee dashboard palette) for donees
  const donee = role.toUpperCase() === "DONEE";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.6 }}
      style={{ perspective: "900px" }}
      className="mx-auto lg:mx-0 w-full max-w-[300px] sm:max-w-[360px]"
    >
      <div
        ref={ref}
        onMouseMove={(e) => {
          const r = ref.current?.getBoundingClientRect();
          if (!r) return;
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          setTilt({ rx: (0.5 - py) * 10, ry: (px - 0.5) * 12, gx: px * 100, gy: py * 100 });
        }}
        onMouseLeave={() => setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 })}
        className="relative rounded-2xl p-4 sm:p-6 overflow-hidden select-none transition-transform duration-150 ease-out motion-reduce:transition-none"
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transformStyle: "preserve-3d",
          background: donee
            ? "linear-gradient(135deg, #3a6aa8 0%, #1e3a60 60%, #0d1e36 100%)"
            : "linear-gradient(135deg, #C17A3A 0%, #8B4513 60%, #5e2f10 100%)",
          boxShadow: "0 24px 60px -18px rgba(0,0,0,0.55)",
        }}
      >
        {/* Cursor-following glare */}
        <div className="pointer-events-none absolute inset-0 transition-opacity"
          style={{ background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.22) 0%, transparent 55%)` }} />
        {/* Engraved edge line */}
        <div className="pointer-events-none absolute inset-2 rounded-xl border border-white/15" />

        <div className="relative flex items-start justify-between">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-white/15 border border-white/25 flex items-center justify-center">
            {avatarDataUrl ? (
              <Image src={avatarDataUrl} alt={initials} width={56} height={56} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-black text-lg sm:text-xl">{initials}</span>
            )}
          </div>
          <div className="text-right">
            <p className="text-5xs font-black uppercase tracking-[0.3em] text-white/50">CauseKind</p>
            <p className="text-5xs font-bold uppercase tracking-[0.2em] text-white/35 mt-0.5">In-kind network</p>
          </div>
        </div>

        <p className="relative mt-5 sm:mt-7 text-xl sm:text-2xl text-white leading-tight break-words"
          style={{ fontFamily: "var(--font-lora), serif", fontStyle: "italic", fontWeight: 600 }}>
          {name}
        </p>

        <div className="relative mt-4 sm:mt-6 flex items-end justify-between">
          <div>
            <p className="text-5xs font-black uppercase tracking-[0.25em] text-white/45">Role</p>
            <p className="text-xs font-black uppercase tracking-wider text-white mt-0.5">{role}</p>
          </div>
          {city && (
            <div className="text-right max-w-[55%]">
              <p className="text-5xs font-black uppercase tracking-[0.25em] text-white/45">Based in</p>
              <p className="text-xs font-bold text-white mt-0.5 truncate">{city}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
