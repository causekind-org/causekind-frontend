"use client";

import { serverDate } from "@/lib/serverTime";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "@/hooks/useAppRouter";
import dynamic from "next/dynamic";
import { toast } from "@/lib/toast";
import { useLocations } from "@/hooks/useLocations";
import {
  getProfile,
  updateProfile,
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
  ApiError,
  getDoneeNeedProfile,
  type DoneeNeedProfile,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
const NgoProfileView = dynamic(() => import("./ngo-view").then(m => m.NgoProfileView));
import { FEATURES } from "@/lib/features";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
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
  CheckCircle2,
  Gift,
  Handshake,
  Sparkles,
  Star,
  RefreshCw,
  ChevronRight,
  Lock,
} from "lucide-react";
import Link from "@/components/AppLink";
import { NewRequestLink } from "@/components/NewRequestLink";
import { RequestReadinessRail } from "@/components/RequestReadinessRail";
import { progressOf, needProfileItemLabel } from "@/lib/needProfileDocs";
import Image from "next/image";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { SearchableSelect, type SelectOption } from "@/components/profile/SearchableSelect";
import { useTranslations } from "next-intl";
import { PHONE_LENGTHS, getDialCode } from "@/lib/phone";
import { isNgoRole } from "@/lib/isNgoRole";

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

type EditField = "name" | "phone" | "photo" | "country" | "state" | "city";

export default function ProfilePage() {
  const { user, isLoading: authLoading, updateUser } = useAuth();
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
  const [activityLoading, setActivityLoading] = useState(true);

  // Deliberately separate from activityLoadFailed: that flag drives the ledger
  // and Milestones, and retryActivity() refetches three unrelated endpoints.
  const [needProfile, setNeedProfile] = useState<DoneeNeedProfile | null>(null);
  const [needProfileLoadFailed, setNeedProfileLoadFailed] = useState(false);
  const [needProfileRetrying, setNeedProfileRetrying] = useState(false);
  const [activityRetrying, setActivityRetrying] = useState(false);

  // Settings panel toggle. The form lives in a modal rather than a section at
  // the foot of the page: opening it there put the fields a screen or two below
  // the button, so the click read as doing nothing.
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Settings-rows layout: null = the row list; otherwise the one editor shown.
  // Country, State and City share one "location" editor because changing the
  // country clears state and city — saving it alone would fail validation.
  const [editField, setEditField] = useState<null | EditField>(null);
  // Values as they were when an editor opened, so Back discards unsaved edits.
  const editSnapshot = useRef<{
    fullName: string; dialCountry: string; phoneNumber: string; countryIso: string;
    stateIso: string; cityValue: string; cityFreeText: string; forceFreeTextCity: boolean;
  } | null>(null);
  // Take the saved-values baseline each time the modal opens.
  useEffect(() => {
    if (settingsOpen) {
      editSnapshot.current = {
        fullName, dialCountry, phoneNumber, countryIso,
        stateIso, cityValue, cityFreeText, forceFreeTextCity,
      };
    }
    // Only on open: later edits must not move the baseline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsOpen]);
  const [storyExpanded, setStoryExpanded] = useState(false);

  // Derived option lists (memoized to avoid re-building every render)
  const { countries: countryOptions, states: stateOptions, cities: cityOptions, dialCodes: dialCodeOptions, dialCodesLoading } = useLocations(countryIso, stateIso);
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

    if (isNgoRole(user.role?.toUpperCase())) {
      setLoading(false);
      return;
    }

    // Load avatar from localStorage
    const savedAvatar = localStorage.getItem(avatarKey(user.email));
    if (savedAvatar) setAvatarDataUrl(savedAvatar);

    let cancelled = false;
    setLoading(true);
    setActivityLoading(true);
    let activityFailed = false;
    // Activity does not block the identity card or the account page.
    void Promise.all([
      getMyItemRequests().catch((): ItemRequest[] => { activityFailed = true; return []; }),
      getMyItemListings({ silent401: true }).catch((): ItemListing[] => { activityFailed = true; return []; }),
      getMyMatches().catch((): ItemMatch[] => { activityFailed = true; return []; }),
    ]).then(([req, listings, matches]) => {
      if (cancelled) return;
      setMyRequests(req);
      setMyListings(listings);
      setMyMatches(matches);
      setActivityLoadFailed(activityFailed);
      setActivityLoading(false);
    });
    if (FEATURES.money) {
      void Promise.all([
        getMyDonations().catch((): Donation[] => []),
        getMyCampaigns().catch((): Campaign[] => []),
      ]).then(([d, c]) => {
        if (!cancelled) { setDonations(d); setCampaigns(c); }
      });
    }

    // Only the actual profile controls identity readiness. Dial-code data is
    // already loaded by useLocations; do not request it again in this batch.
    const detectedCountry = detectCountryCode();
    getProfile()
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        if (!p) {
          // No profile: still resolve a sensible country so the settings form
          // and the dial-code picker are usable, then stop.
          setCountryIso(detectedCountry);
          setDialCountry(detectedCountry);
          toast.error(t("errorLoadProfile"));
          return;
        }

        setFullName(p.fullName);

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
        if (cancelled) return;
        console.error(err);
        toast.error(t("errorLoadProfile"));
        const fallback = detectCountryCode();
        setCountryIso(fallback);
        setDialCountry(fallback);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { cancelled = true; };
  }, [authLoading, user?.email, user?.role, router]);

  // Initialise the edit form from the one shared dial-code result, independently
  // of profile display. The edit button stays disabled until these are ready.
  useEffect(() => {
    if (!profile?.phone || dialCodesLoading) return;
    const { iso, number } = splitPhone(profile.phone, dialCodeOptions, detectCountryCode());
    if (iso) setDialCountry(iso);
    setPhoneNumber(number);
  }, [profile?.phone, dialCodeOptions, dialCodesLoading]);

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

  // Kept out of the main Promise.all: the role is only known once getProfile()
  // resolves, and firing this for a donor would 403 on every donor page view.
  const doneeRole = (profile?.role ?? "").toUpperCase().replace(/^ROLE_/, "") === "DONEE";
  useEffect(() => {
    if (!doneeRole) return;
    let cancelled = false;
    getDoneeNeedProfile()
      .then((np) => { if (!cancelled) { setNeedProfile(np); setNeedProfileLoadFailed(false); } })
      .catch((e) => {
        if (cancelled) return;
        /*
          A 404 means this server has no need-profile endpoint, so there is no
          readiness to report and no amount of retrying will produce any. The
          rail renders on `needProfile || needProfileLoadFailed`, so leaving both
          falsy removes it rather than parking a permanent "Couldn't check your
          request readiness — Retry" on the profile, which invites the donee to
          keep pressing a button that cannot work.

          Every other failure still sets the flag: those are genuinely
          retryable, and the rail's error state is the honest thing to show.
        */
        if (e instanceof ApiError && e.status === 404) return;
        setNeedProfileLoadFailed(true);
      });
    return () => { cancelled = true; };
  }, [doneeRole]);

  const retryNeedProfile = useCallback(async () => {
    setNeedProfileRetrying(true);
    try {
      setNeedProfile(await getDoneeNeedProfile());
      setNeedProfileLoadFailed(false);
    } catch {
      setNeedProfileLoadFailed(true);
    } finally {
      setNeedProfileRetrying(false);
    }
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

  // The saved values, taken when the modal opens and after each save. The one
  // Save button in the header shows only while the form differs from these.
  function currentValues() {
    return {
      fullName, dialCountry, phoneNumber, countryIso,
      stateIso, cityValue, cityFreeText, forceFreeTextCity,
    };
  }
  const settingsDirty = (() => {
    const s = editSnapshot.current;
    if (!s) return false;
    const c = currentValues();
    return (Object.keys(c) as (keyof typeof c)[]).some((k) => c[k] !== s[k]);
  })();

  // Rows only open and close; edits are kept until Save or the modal closes.
  function openEditor(field: EditField) {
    setEditField(field);
  }

  // Closing the modal without saving: put the saved values back.
  function closeEditor() {
    const s = editSnapshot.current;
    if (s) {
      setFullName(s.fullName);
      setDialCountry(s.dialCountry);
      setPhoneNumber(s.phoneNumber);
      setCountryIso(s.countryIso);
      setStateIso(s.stateIso);
      setCityValue(s.cityValue);
      setCityFreeText(s.cityFreeText);
      setForceFreeTextCity(s.forceFreeTextCity);
    }
    // Keep the baseline: the modal may stay open after Cancel.
    setEditField(null);
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
      // Keep the signed-in user in step, so screens that read useAuth (e.g. the
      // fundraising "About you" step) show the new name and phone without a reload.
      updateUser?.({ fullName: updated.fullName ?? undefined, phone: updated.phone ?? undefined });
      toast.success(t("successProfileUpdated"));
      if (updated.documentWarning) toast.warning(updated.documentWarning, { duration: 12000 });
      // Modal stays open; what was just saved becomes the new baseline.
      editSnapshot.current = currentValues();
      setEditField(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errorUpdateFailed"));
    } finally {
      setSaving(false);
    }
  }

  const isNgo = isNgoRole(user?.role?.toUpperCase());
  if (!authLoading && isNgo) {
    return <NgoProfileView />;
  }

  // Loading skeleton
  if (authLoading) {
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
  const displayName = fullName || profile?.fullName || user.fullName || nameFromEmail(user.email);
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

  const readiness = needProfile ? progressOf(needProfile.missing) : null;
  const nextMissingLabel = needProfile?.missing[0]
    ? needProfileItemLabel(needProfile.missing[0])
    : undefined;

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
      at: serverDate(l.submittedAt ?? l.createdAt).getTime(),
      title: `Listed "${l.title}"`,
      detail: `${l.category ?? "item"} - now ${humanize(l.status)}`,
      broken: ["REJECTED", "WITHDRAWN", "EXPIRED"].includes(l.status),
      done: ["DONATED", "FULFILLED", "PARTIALLY_DONATED"].includes(l.status),
    })),
    ...myRequests.map((r) => ({
      at: serverDate(r.createdAt).getTime(),
      title: `Posted "${r.title}"`,
      detail: `${r.category} - now ${humanize(r.status)}`,
      broken: ["REJECTED", "EXPIRED"].includes(r.status),
      done: ["FULFILLED", "FULLY_FULFILLED"].includes(r.status),
    })),
    ...myMatches.map((m) => ({
      at: serverDate(m.createdAt).getTime(),
      title: isDonee
        ? `Matched with a donor for "${m.requestTitle ?? m.listingTitle ?? "your request"}"`
        : `Your item matched: "${m.listingTitle ?? m.requestTitle ?? "an item"}"`,
      detail: `now ${humanize(m.status)}`,
      broken: ["REJECTED", "CANCELLED", "FAILED"].includes(m.status),
      done: ["FULFILLED", "COMPLETED"].includes(m.status),
    })),
    ...(FEATURES.money
      ? completedDonations.map((d) => ({
          at: serverDate(d.createdAt).getTime(),
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
              disabled={loading || dialCodesLoading}
              data-tour="account-settings"
              className={`mt-4 sm:mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br px-4 py-2.5 sm:px-5 sm:py-3 text-2xs sm:text-xs font-bold uppercase tracking-wider text-[#faf8f5] shadow-lg ring-1 ring-white/20 transition-all hover:shadow-xl hover:-translate-y-0.5 ${
                isDonee
                  ? "from-[#3a6aa8] to-[#1e3a60] hover:from-[#4678b8] hover:to-[#26497a] shadow-[#0d1e36]/50 hover:shadow-[#0d1e36]/60"
                  : "from-[var(--ck-role-secondary)] to-[var(--ck-role-accent)] hover:from-[#e8894c] hover:to-[#c25620] shadow-[var(--ck-role-accent)]/40 hover:shadow-[var(--ck-role-accent)]/50"
              }`}
            >
              {loading || dialCodesLoading ? "Loading account details…" : "Edit account details"}
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
                  {activityLoading || activityLoadFailed ? "—" : stat.n}
                </p>
                <p className="text-4xs sm:text-3xs uppercase tracking-[0.16em] sm:tracking-[0.22em] text-white/40 mt-1 sm:mt-2 leading-tight">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* A sibling of the ledger, not a child: the tour spotlights
              data-tour="profile-ledger" by querySelector, and nesting this
              inside would grow the highlight past what the tour copy describes.
              Nothing renders while the check is in flight — a meter that sweeps
              in a beat later is a second entrance, not a skeleton, and it never
              flashes "0 items left". */}
          {isDonee && (needProfile || needProfileLoadFailed) && (
            <RequestReadinessRail
              pct={readiness?.pct ?? 0}
              remaining={needProfile?.missing.length ?? 0}
              complete={needProfile?.complete ?? false}
              nextLabel={nextMissingLabel}
              failed={needProfileLoadFailed}
              retrying={needProfileRetrying}
              onRetry={() => void retryNeedProfile()}
            />
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 mt-8 sm:mt-12 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 sm:gap-12 items-start">

        {/* Your story: a chronicle of real events */}
        <section data-tour="story">
          <div className={`border-b-2 ${acc.rule} pb-2.5 sm:pb-3`}>
            <p className={`text-3xs font-black uppercase tracking-[0.24em] ${acc.eyebrow}`}>Your story</p>
            <p className="text-xs text-stone-400 mt-1">Everything that has happened on your CauseKind journey, newest first.</p>
          </div>

          {activityLoading ? (
            <p role="status" className="py-8 text-sm text-stone-500">Loading your activity…</p>
          ) : story.length === 0 ? (
            <div className="py-10 sm:py-14 text-center space-y-3">
              <div className={`w-11 h-11 sm:w-14 sm:h-14 ${acc.softBg} rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto`}>
                <BookOpen className={`w-6 h-6 ${acc.icon}`} />
              </div>
              <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">Your story starts here</p>
              <p className="text-xs text-stone-400 max-w-[260px] mx-auto">
                {isDonee ? "Post your first need and this page will chronicle every step of it." : "List your first item and this page will chronicle every donation."}
              </p>
              <NewRequestLink href={isDonee ? "/requests/new" : "/items/new"} className="inline-block">
                <Button size="sm" className={`${acc.solidBtn} text-white mt-2`}>
                  {isDonee ? "Post a need" : "List an item"}
                </Button>
              </NewRequestLink>
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
          {activityLoading ? (
            <p role="status" className="py-6 text-sm text-stone-500">Loading milestones…</p>
          ) : activityLoadFailed ? (
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

      {/* Account settings — "Settings rows" layout (design #4, 2026-11-25).
          Rows expand IN PLACE (2026-11-25 rev): tapping a row opens its input or
          dropdown right under it, with Save / Cancel there. Country, State and
          City share one Save at the foot of the LOCATION box, because changing
          the country clears state and city. Every Save sends the whole profile
          via handleSave (the backend takes name + phone + city together). */}
      <Dialog
        open={settingsOpen}
        onOpenChange={(open) => {
          if (!open) closeEditor();
          setSettingsOpen(open);
        }}
      >
        <DialogContent className="max-w-md bg-[#f5f0ea] dark:bg-zinc-950" showCloseButton={false}>
          {(() => {
            const countryLabel = countryOptions.find((o) => o.value === countryIso)?.label ?? countryIso;
            const stateLabel = stateOptions.find((o) => o.value === stateIso)?.label ?? stateIso;
            const cityLabel = showCityFreeText ? cityFreeText : cityValue;
            const dial = getDialCode(dialCountry, dialCodeOptions);
            const phoneLabel = phoneNumber ? `${dial ? `${dial} ` : ""}${phoneNumber}` : "";
            const notSet = <span className="text-stone-400 dark:text-zinc-500">—</span>;
            const rowCls =
              "flex min-h-[54px] w-full items-center gap-3 px-4 text-left transition-colors hover:bg-stone-50 dark:hover:bg-zinc-800/60 focus-visible:outline-none focus-visible:bg-stone-50 dark:focus-visible:bg-zinc-800/60";
            const divider = "border-b border-[#f3ebe2] dark:border-zinc-800";
            const chevron = (open: boolean) => (
              <ChevronRight
                className={`size-4 shrink-0 text-stone-400 transition-transform ${open ? "rotate-90" : ""}`}
                aria-hidden
              />
            );
            const toggle = (f: EditField) => (editField === f ? setEditField(null) : openEditor(f));

            const locRows: { key: "country" | "state" | "city"; label: string; value: string }[] = [
              { key: "country", label: t("country"), value: countryLabel },
              { key: "state", label: t("stateProvince"), value: stateLabel },
              { key: "city", label: t("cityLabel"), value: cityLabel },
            ];

            return (
              <form onSubmit={handleSave} className="contents">
                <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-0 px-5 pb-2 pt-5 pr-5">
                  <DialogTitle className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">
                    {t("settingsTitle")}
                  </DialogTitle>
                  <DialogDescription className="sr-only">{t("settingsDescription")}</DialogDescription>
                  {settingsDirty ? (
                    // One Save for every change, shown only once something changed.
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={closeEditor}
                        disabled={saving}
                        className="h-11 px-3 text-sm font-bold text-stone-500 dark:text-zinc-400"
                      >
                        {tCommon("cancel")}
                      </button>
                      <Button
                        type="submit"
                        disabled={saving}
                        className={`${acc.solidBtn} h-10 rounded-xl px-5 text-sm font-extrabold text-white`}
                      >
                        {saving ? <Loader2 className="size-4 animate-spin" /> : tCommon("save")}
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { closeEditor(); setSettingsOpen(false); }}
                      className={`h-11 px-3 text-[15px] font-extrabold ${acc.eyebrow}`}
                    >
                      {t("settingsDone")}
                    </button>
                  )}
                </DialogHeader>
                  <DialogBody className="space-y-4 px-4 pb-6">
                    {/* Photo card */}
                    <div className="overflow-hidden rounded-[18px] bg-white dark:bg-zinc-900">
                      <button
                        type="button"
                        onClick={() => toggle("photo")}
                        aria-expanded={editField === "photo"}
                        className="flex w-full items-center gap-3.5 p-4 text-left"
                      >
                        <span className={`flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl font-extrabold text-white ${acc.solidBtn}`}>
                          {avatarDataUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={avatarDataUrl} alt="" className="size-full object-cover" />
                            : initials}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-[17px] font-extrabold text-stone-900 dark:text-stone-100">{displayName}</span>
                          <span className="text-[13px] text-stone-500 dark:text-zinc-400">{t("tapToChangePhoto")}</span>
                        </span>
                        {chevron(editField === "photo")}
                      </button>
                      {editField === "photo" && (
                        <div className="flex flex-col items-center gap-3 border-t border-[#f3ebe2] px-4 pb-4 pt-3 dark:border-zinc-800">
                          <AvatarUpload
                            imageDataUrl={avatarDataUrl}
                            initials={initials}
                            onImageChange={handleAvatarChange}
                            tone={isDonee ? "navy" : "copper"}
                          />
                          <p className="text-center text-xs text-stone-500 dark:text-zinc-400">{t("photoSavesInstantly")}</p>
                        </div>
                      )}
                    </div>

                    <p className="px-1 text-xs font-extrabold tracking-[0.08em] text-stone-500 dark:text-zinc-400">{t("sectionAccount")}</p>
                    <div className="overflow-hidden rounded-[18px] bg-white dark:bg-zinc-900">
                      {/* Name */}
                      <div className={divider}>
                        <button type="button" onClick={() => toggle("name")} aria-expanded={editField === "name"} className={rowCls}>
                          <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-[#fbeee2] text-[#8a4318] dark:bg-[#C17A3A]/15 dark:text-[#e0a06a]"><User className="size-4" aria-hidden /></span>
                          <span className="flex-1 font-semibold text-stone-900 dark:text-stone-100">{t("fullNameLabel")}</span>
                          {editField !== "name" && (
                            <span className="max-w-[45%] truncate text-sm text-stone-500 dark:text-zinc-400">{fullName || notSet}</span>
                          )}
                          {chevron(editField === "name")}
                        </button>
                        {editField === "name" && (
                          <div className="space-y-2 px-4 pb-4">
                            <Input
                              id="fullName"
                              aria-label={t("fullNameLabel")}
                              autoFocus
                              className={`rounded-xl border-stone-200 py-5 font-medium ${acc.focusRing}`}
                              placeholder={t("fullNamePlaceholder")}
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                            />
                          </div>
                        )}
                      </div>

                      {/* Email — read-only */}
                      <div className={`flex min-h-[54px] w-full items-center gap-3 px-4 ${divider}`}>
                        <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-[#e7edf5] text-[#1f3a5f] dark:bg-blue-400/15 dark:text-blue-300"><Mail className="size-4" aria-hidden /></span>
                        <span className="flex-1 font-semibold text-stone-900 dark:text-stone-100">{t("emailAddress")}</span>
                        <span className="max-w-[50%] truncate text-[13px] text-stone-500 dark:text-zinc-400">{displayEmail}</span>
                        <Lock className="size-3.5 shrink-0 text-stone-400" aria-label={t("emailLocked")} />
                      </div>

                      {/* Phone */}
                      <div>
                        <button type="button" onClick={() => toggle("phone")} aria-expanded={editField === "phone"} className={rowCls}>
                          <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-[#e6f1ea] text-[#2f6b4f] dark:bg-emerald-400/15 dark:text-emerald-300"><Phone className="size-4" aria-hidden /></span>
                          <span className="flex-1 font-semibold text-stone-900 dark:text-stone-100">{t("phoneNumber")}</span>
                          {editField !== "phone" && (
                            <span className="max-w-[45%] truncate text-sm text-stone-500 dark:text-zinc-400">{phoneLabel || notSet}</span>
                          )}
                          {chevron(editField === "phone")}
                        </button>
                        {editField === "phone" && (
                          <div className="space-y-2 px-4 pb-4">
                            <div className="flex gap-2">
                              <div className="w-[110px] shrink-0">
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
                                aria-label={t("phoneNumber")}
                                autoFocus
                                maxLength={maxPhoneLength}
                                className={`flex-1 rounded-xl border-stone-200 py-5 font-medium ${acc.focusRing}`}
                                placeholder={t("phonePlaceholder")}
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, maxPhoneLength))}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="px-1 text-xs font-extrabold tracking-[0.08em] text-stone-500 dark:text-zinc-400">{t("sectionLocation")}</p>
                    <div className="rounded-[18px] bg-white dark:bg-zinc-900">
                      {locRows.map((row, i) => {
                        const open = editField === row.key;
                        return (
                          <div key={row.key} className={i < 2 ? divider : ""}>
                            <button
                              type="button"
                              onClick={() => toggle(row.key)}
                              aria-expanded={open}
                              className={`${rowCls} ${i === 0 ? "rounded-t-[18px]" : ""}`}
                            >
                              <span className="flex-1 font-semibold text-stone-900 dark:text-stone-100">{row.label}</span>
                              {!open && (
                                <span className="max-w-[50%] truncate text-sm text-stone-500 dark:text-zinc-400">{row.value || notSet}</span>
                              )}
                              {chevron(open)}
                            </button>
                            {open && (
                              <div className="px-4 pb-4">
                                {row.key === "country" && (
                                  <SearchableSelect
                                    id="country"
                                    placement="inline"
                                    options={countryOptions}
                                    value={countryIso}
                                    onChange={(v) => { handleCountryChange(v); setEditField("state"); }}
                                    placeholder={t("selectCountry")}
                                    searchPlaceholder="Search country…"
                                  />
                                )}
                                {row.key === "state" && (noStateOptions ? (
                                  <p className="py-2 text-xs italic text-stone-400">{t("noStatesListed")}</p>
                                ) : (
                                  <SearchableSelect
                                    id="state"
                                    placement="inline"
                                    options={stateOptions}
                                    value={stateIso}
                                    onChange={(v) => { handleStateChange(v); setEditField("city"); }}
                                    placeholder={t("selectState")}
                                    disabledPlaceholder={t("selectCountryFirst")}
                                    disabled={!countryIso}
                                    searchPlaceholder="Search state…"
                                  />
                                ))}
                                {row.key === "city" && (showCityFreeText ? (
                                  <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
                                    <Input
                                      id="city"
                                      aria-label={t("cityLabel")}
                                      autoFocus
                                      className={`rounded-xl border-stone-200 py-5 pl-10 font-medium ${acc.focusRing}`}
                                      placeholder={t("enterCity")}
                                      value={cityFreeText}
                                      onChange={(e) => setCityFreeText(e.target.value)}
                                    />
                                  </div>
                                ) : (
                                  <SearchableSelect
                                    id="city"
                                    placement="inline"
                                    options={cityOptions}
                                    value={cityValue}
                                    onChange={setCityValue}
                                    placeholder={t("selectCity")}
                                    disabledPlaceholder={t("selectStateFirst")}
                                    disabled={!stateIso}
                                    searchPlaceholder="Search city…"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <p className="px-1 text-xs text-stone-500 dark:text-zinc-400">
                      {t("rowsSaveHint")}
                    </p>
                  </DialogBody>
              </form>
            );
          })()}
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
