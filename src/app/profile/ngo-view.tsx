"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { useAuth } from "@/hooks/useAuth";
import { IS_NGO_DEMO_MODE } from "@/features/ngo-registration/ngoRegistrationModel";
import { useLocations } from "@/hooks/useLocations";
import { resolveLocationFromGPS, getDialCodes } from "@/app/actions/locations";
import { PHONE_LENGTHS, getDialCode } from "@/lib/phone";
import { SearchableSelect } from "@/components/profile/SearchableSelect";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import {
  getProfile,
  updateProfile,
  updateLocation,
  getMyNgoApplication,
  getNgoDraft,
  saveNgoDraft,
  type UserProfile,
  type NgoApplicationStatusResponse,
} from "@/lib/api";
import {
  NGO_STEPS,
  NGO_STEP_FULL_TITLES,
  type NGOProgressInfo,
} from "@/features/ngo-registration/ngoRegistrationModel";
import { NgoReadinessRail } from "@/components/profile/NgoReadinessRail";
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
  Phone,
  MapPin,
  Mail,
  ChevronDown,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  CheckCircle2,
  PhoneCall,
  Download,
  ArrowRight,
  AlertCircle,
  Building2,
  Navigation,
  BookOpen,
  Megaphone,
} from "lucide-react";

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "NGO";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return ((words[0][0] ?? "") + (words[words.length - 1][0] ?? "")).toUpperCase();
}

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
  } catch {}
  return "IN";
}

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
  } catch {}
  return detectCountryCode();
}

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

function avatarKey(email: string) {
  return `ck_profile_image_${email}`;
}

export function NgoProfileView() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Avatar
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);

  // Form edit fields
  const [editOrgName, setEditOrgName] = useState("");
  const [dialCountry, setDialCountry] = useState<string>("IN");
  const [phoneNumber, setPhoneNumber] = useState(""); // digits only

  // Location dropdowns
  const [countryIso, setCountryIso] = useState<string>("");
  const [stateIso, setStateIso] = useState<string>("");
  const [cityValue, setCityValue] = useState<string>("");
  const [cityFreeText, setCityFreeText] = useState<string>("");
  const [forceFreeTextCity, setForceFreeTextCity] = useState(false);

  // GPS Location
  const [locStatus, setLocStatus] = useState<"idle" | "requesting" | "saved" | "error">("idle");

  const { countries: countryOptions, states: stateOptions, cities: cityOptions, dialCodes: dialCodeOptions } =
    useLocations(countryIso, stateIso);
  const maxPhoneLength = PHONE_LENGTHS[dialCountry] ?? 10;

  const noStateOptions = countryIso !== "" && stateOptions.length === 0;
  const noCityOptions = stateIso !== "" && cityOptions.length === 0;
  const showCityFreeText = noStateOptions || noCityOptions || forceFreeTextCity;

  // Organization identity & display details
  const [orgDetails, setOrgDetails] = useState<{
    name: string;
    email: string;
    phone: string;
    city: string;
  }>({
    name: "",
    email: "",
    phone: "",
    city: "",
  });

  // Progress state
  const [progress, setProgress] = useState<NGOProgressInfo>({
    completedCount: 0,
    totalSteps: 6,
    percent: 0,
    currentStep: "org-details",
  });

  // Submitted application state
  const [application, setApplication] = useState<NgoApplicationStatusResponse | null>(null);
  const [copiedAppId, setCopiedAppId] = useState(false);

  const handleProgressChange = useCallback((info: NGOProgressInfo) => {
    setProgress((prev) => {
      if (
        prev.completedCount === info.completedCount &&
        prev.percent === info.percent &&
        prev.currentStep === info.currentStep
      ) {
        return prev;
      }
      return info;
    });
  }, []);

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

  function handleCountryChange(iso: string) {
    setCountryIso(iso);
    setStateIso("");
    setCityValue("");
    setCityFreeText("");
    setForceFreeTextCity(false);
  }

  function handleStateChange(iso: string) {
    setStateIso(iso);
    setCityValue("");
    setCityFreeText("");
    setForceFreeTextCity(false);
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
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
          toast.success("GPS location saved successfully");

          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`
            );
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
                  const { stateIso: resolvedState, cityValue: resolvedCity } =
                    await resolveLocationFromGPS(countryCode, stateName, cityName);

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
                    if (cityName) {
                      setCityFreeText(cityName);
                      setForceFreeTextCity(true);
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.error("Reverse geocoding failed", e);
          }
        } catch {
          setLocStatus("error");
          toast.error("Failed to save location");
        }
      },
      (err) => {
        setLocStatus("error");
        toast.error(
          err.code === 1 ? "Location permission denied" : "Location unavailable"
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  // Check auth & load initial profile/draft/locations
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/profile");
      return;
    }

    if (!user) return;

    if (user.email) {
      const savedAvatar = localStorage.getItem(avatarKey(user.email));
      if (savedAvatar) setAvatarDataUrl(savedAvatar);
    }

    const userIdentifier =
      user.id ?? user.userId ?? user.email.toLowerCase().replace(/[^a-z0-9]/g, "_");

    let isMounted = true;

    // Load initial draft progress from demo localStorage if in demo mode
    if (IS_NGO_DEMO_MODE) {
      try {
        const demoAppRaw = localStorage.getItem(`ngo-demo-application-${userIdentifier}`);
        if (demoAppRaw) {
          const parsedApp = JSON.parse(demoAppRaw);
          if (parsedApp?.applicationId) {
            setApplication({
              applicationId: parsedApp.applicationId,
              organizationName: parsedApp.organizationName || "",
              status: parsedApp.status || "UNDER_REVIEW",
              submittedAt: parsedApp.submittedAt || new Date().toISOString(),
              verifiedAt: null,
              updatedAt: null,
              rejectionReason: null,
              needsInformationDetails: null,
            });
          }
        }

        const demoRaw = localStorage.getItem(`ngo-demo-draft-${userIdentifier}`);
        if (demoRaw) {
          const parsed = JSON.parse(demoRaw);
          if (parsed && typeof parsed === "object") {
            const savedStep = parsed.currentStep as string;
            const STEPS = [
              "org-details",
              "legal-documents",
              "authorized-rep",
              "org-photos",
              "review-submit",
              "email-verification",
            ];
            const stepIdx = STEPS.indexOf(savedStep);
            const count = stepIdx > 0 ? stepIdx : 0;
            setProgress({
              completedCount: count,
              totalSteps: 6,
              percent: Math.round((count / 6) * 100),
              currentStep: (savedStep as any) || "org-details",
            });
            if (parsed.organizationName) {
              setOrgDetails((prev) => ({
                ...prev,
                name: parsed.organizationName || prev.name,
                email: parsed.officialEmail || prev.email,
                phone: parsed.mobileNumber || prev.phone,
                city: parsed.registeredOfficeAddress || prev.city,
              }));
            }
          }
        }
      } catch {}
    }

    Promise.all([
      detectCountryFromIP(),
      getProfile().catch(() => null),
      getMyNgoApplication().catch(() => null),
      getNgoDraft().catch(() => null),
      getDialCodes(),
    ])
      .then(([detectedCountry, userProf, app, draft, serverDialCodes]) => {
        if (!isMounted) return;

        if (userProf) {
          setProfile(userProf);
          setEditOrgName(userProf.organizationName || userProf.fullName || "");

          if (userProf.phone) {
            const { iso, number } = splitPhone(userProf.phone, serverDialCodes, detectedCountry);
            if (iso) setDialCountry(iso);
            setPhoneNumber(number);
          } else {
            setDialCountry(detectedCountry);
          }

          if (userProf.city) {
            const parts = userProf.city.split(",").map((s) => s.trim());
            if (parts.length === 3) {
              const [cCity, cState, cCountry] = parts;
              setCountryIso(cCountry || detectedCountry);
              setStateIso(cState || "");
              setCityValue(cCity);
            } else {
              setCountryIso(detectedCountry);
              setCityFreeText(userProf.city);
              setForceFreeTextCity(true);
            }
          } else {
            setCountryIso(detectedCountry);
          }
        } else {
          setCountryIso(detectedCountry);
          setDialCountry(detectedCountry);
        }

        if (app && (app.applicationId || app.status)) {
          setApplication(app);
        }

        const resolvedName =
          draft?.organizationName ||
          app?.organizationName ||
          userProf?.organizationName ||
          userProf?.fullName ||
          user.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, " ");

        const resolvedEmail =
          draft?.officialEmail ||
          userProf?.email ||
          user.email;

        const resolvedPhone =
          draft?.mobileNumber ||
          userProf?.phone ||
          "";

        const resolvedCity =
          draft?.registeredOfficeAddress ||
          userProf?.city ||
          "";

        setOrgDetails({
          name: resolvedName,
          email: resolvedEmail,
          phone: resolvedPhone,
          city: resolvedCity,
        });

        if (!editOrgName && resolvedName) {
          setEditOrgName(resolvedName);
        }

        if (draft?.currentStep) {
          const STEPS = [
            "org-details",
            "legal-documents",
            "authorized-rep",
            "org-photos",
            "review-submit",
            "email-verification",
          ];
          const stepIdx = STEPS.indexOf(draft.currentStep);
          const count = stepIdx > 0 ? stepIdx : 0;
          setProgress((prev) => ({
            ...prev,
            completedCount: count,
            percent: Math.round((count / 6) * 100),
            currentStep: (draft.currentStep as any) || prev.currentStep,
          }));
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user, authLoading, router]);

  async function handleSaveAccountDetails(e: React.FormEvent) {
    e.preventDefault();

    const rawPhone = phoneNumber.replace(/\D/g, "");
    const dialCode = getDialCode(dialCountry, dialCodeOptions);
    const fullPhone = dialCode && rawPhone ? `${dialCode}${rawPhone}` : rawPhone;
    const cityStr = showCityFreeText
      ? [cityFreeText, stateIso, countryIso].filter(Boolean).join(", ")
      : [cityValue, stateIso, countryIso].filter(Boolean).join(", ");

    if (!editOrgName.trim()) {
      toast.error("Please enter your organization name");
      return;
    }
    if (!rawPhone) {
      toast.error("Please enter your official phone number");
      return;
    }
    const expectedPhoneLength = PHONE_LENGTHS[dialCountry] ?? 10;
    if (rawPhone.length !== expectedPhoneLength) {
      toast.error(`Phone number must be exactly ${expectedPhoneLength} digits`);
      return;
    }

    setSaving(true);
    try {
      // Maps Organization Name to organizationName (and fullName for backend model parity)
      const updated = await updateProfile({
        organizationName: editOrgName.trim(),
        fullName: editOrgName.trim(),
        phone: fullPhone,
        city: cityStr,
      });

      setProfile(updated);
      setOrgDetails((prev) => ({
        ...prev,
        name: updated.organizationName || updated.fullName || editOrgName.trim(),
        phone: updated.phone || fullPhone,
        city: updated.city || cityStr,
      }));

      // Sync with NGO draft if applicable
      saveNgoDraft({
        organizationName: editOrgName.trim(),
        mobileNumber: fullPhone,
        registeredOfficeAddress: cityStr,
      }).catch(() => {});

      if (IS_NGO_DEMO_MODE && user) {
        const userIdentifier =
          user.id ?? user.userId ?? user.email.toLowerCase().replace(/[^a-z0-9]/g, "_");
        try {
          const draftKey = `ngo-demo-draft-${userIdentifier}`;
          const existingDraft = localStorage.getItem(draftKey);
          if (existingDraft) {
            const parsed = JSON.parse(existingDraft);
            parsed.organizationName = editOrgName.trim();
            parsed.mobileNumber = fullPhone;
            parsed.registeredOfficeAddress = cityStr;
            localStorage.setItem(draftKey, JSON.stringify(parsed));
          }
        } catch {}
      }

      toast.success("Account details updated successfully");
      setSettingsOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="bg-[#F7F0E8] dark:bg-zinc-950 min-h-screen flex items-center justify-center">
        <RefreshCw className="h-7 w-7 animate-spin text-[#4338CA]" />
      </div>
    );
  }

  if (!user) return null;

  const displayName = orgDetails.name || profile?.organizationName || profile?.fullName || user.email.split("@")[0];
  const displayEmail = orgDetails.email || profile?.email || user.email;
  const displayPhone = orgDetails.phone || profile?.phone || "";
  const displayCity = orgDetails.city || profile?.city || "";
  const initials = getInitials(displayName);

  const isApplicationSubmitted =
    application?.status === "UNDER_REVIEW" ||
    application?.status === "APPROVED" ||
    application?.status === "REJECTED" ||
    application?.status === "PENDING_VERIFICATION" ||
    application?.status === "NEEDS_INFORMATION";

  function copyAppId() {
    if (!application?.applicationId) return;
    navigator.clipboard.writeText(application.applicationId);
    setCopiedAppId(true);
    toast.success("Application ID copied to clipboard!");
    setTimeout(() => setCopiedAppId(false), 2500);
  }

  function handleDownloadSummary() {
    toast.success("Application summary downloaded.");
  }

  function formatSubmissionDate(dateStr?: string | null) {
    if (!dateStr) return "Recently submitted";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  }

  const statsRow = [
    { value: 0, label: "items requested" },
    { value: 0, label: "active campaigns" },
    { value: 0, label: "donations matched" },
  ];

  const nextIncompleteStep = NGO_STEPS.find((_, idx) => idx >= progress.completedCount);
  const nextStepLabel = nextIncompleteStep ? NGO_STEP_FULL_TITLES[nextIncompleteStep] : undefined;

  const milestones = [
    {
      label: "Profile Submitted",
      desc: "Application submitted for compliance review",
      icon: ShieldCheck,
      earned: isApplicationSubmitted,
    },
    {
      label: "Verified Partner",
      desc: "Approved and verified CauseKind NGO partner",
      icon: Sparkles,
      earned: application?.status === "APPROVED",
    },
    {
      label: "First Campaign",
      desc: "Launched first community campaign",
      icon: Megaphone,
      earned: false,
    },
  ];

  interface StoryEvent {
    title: string;
    detail: string;
    at: string;
    done?: boolean;
    broken?: boolean;
  }

  const story: StoryEvent[] = [];
  if (application?.status === "APPROVED") {
    story.push({
      title: "Partner Verified",
      detail: "Application approved and verified partner badge awarded",
      at: application.verifiedAt || application.updatedAt || application.submittedAt || new Date().toISOString(),
      done: true,
    });
  }
  if (isApplicationSubmitted && application) {
    story.push({
      title: "Application Submitted",
      detail: "Legal partner registration submitted and under compliance review",
      at: application.submittedAt || new Date().toISOString(),
      done: true,
    });
  }

  return (
    <div className="bg-[#F7F0E8] dark:bg-zinc-950 min-h-screen pb-28">
      {/* ── Top Header Band: Governance Indigo gradient ── */}
      <div
        className="relative overflow-hidden text-white"
        style={{
          background: "linear-gradient(140deg, #1e1b4b 0%, #312e81 52%, #1e1b4b 100%)",
        }}
      >
        <div className="pointer-events-none absolute -top-24 right-[8%] w-[420px] h-[420px] rounded-full border border-[#6366F1]/15" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 w-72 h-72 rounded-full border border-[#6366F1]/10" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 75% 20%, rgba(99,102,241,0.18) 0%, transparent 55%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-14 pb-2 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 sm:gap-10 lg:gap-16 items-center">
          <div>
            <NgoMemberPass
              name={displayName}
              role="NGO"
              city={displayCity}
              initials={initials}
              avatarUrl={avatarDataUrl}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="min-w-0"
          >
            <p className="text-3xs font-black uppercase tracking-[0.28em] text-[#6366F1]">
              CAUSEKIND NGO PARTNER
            </p>
            <h1
              className="mt-1.5 sm:mt-2 text-2xl sm:text-4xl md:text-5xl leading-[1.05] break-words"
              style={{
                fontFamily: "var(--font-lora), serif",
                fontStyle: "italic",
                fontWeight: 600,
              }}
            >
              {displayName}
            </h1>
            <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 sm:gap-y-1.5 text-2xs sm:text-xs text-white/60">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#6366F1] shrink-0" />
                <span className="truncate max-w-[220px] sm:max-w-xs">{displayEmail}</span>
              </span>
              {displayPhone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#6366F1] shrink-0" />
                  <span>{displayPhone}</span>
                </span>
              )}
              {displayCity && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#6366F1] shrink-0" />
                  <span className="truncate max-w-[200px]">{displayCity}</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="mt-4 sm:mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#4338CA] hover:from-[#4f46e5] hover:to-[#3730a3] px-4 py-2.5 sm:px-5 sm:py-3 text-2xs sm:text-xs font-bold uppercase tracking-wider text-[#faf8f5] shadow-lg shadow-[#4338CA]/40 hover:shadow-xl hover:-translate-y-0.5 ring-1 ring-white/20 transition-all"
            >
              Edit account details
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        </div>

          {/* Hairline 3-stat counter strip */}
          <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mt-6 sm:mt-10 grid grid-cols-3 border-t border-white/10">
              {statsRow.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                  className={`py-4 sm:py-6 ${
                    i > 0 ? "border-l border-white/10 pl-3 sm:pl-8" : ""
                  }`}
                >
                  <p
                    className="text-2xl sm:text-4xl md:text-5xl tabular-nums leading-none text-white"
                    style={{ fontFamily: "var(--font-source-serif-4), serif" }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-4xs sm:text-3xs uppercase tracking-[0.16em] sm:tracking-[0.22em] text-white/40 mt-1 sm:mt-2 leading-tight">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Complete your profile readiness rail inside hero band */}
            <NgoReadinessRail
              pct={progress.percent}
              completedCount={progress.completedCount}
              totalSteps={6}
              isSubmitted={isApplicationSubmitted}
              status={application?.status}
              nextStepLabel={nextStepLabel}
            />
          </div>
        </div>

      {/* ── Main Body: 2-column layout with Your Journey & Milestones (matching Donee) ── */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 mt-8 sm:mt-12 space-y-8">
        {/* If application is submitted, show application status & compliance details */}
        {isApplicationSubmitted && application && (
          <div className="rounded-2xl sm:rounded-3xl border border-stone-200/80 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 p-5 sm:p-8 shadow-sm backdrop-blur-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 dark:border-zinc-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4338CA] to-[#6366F1] flex items-center justify-center text-white shadow-md shadow-[#4338CA]/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-black text-stone-900 dark:text-stone-100">
                    Application Submitted
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
                    Your legal partner registration has been submitted and is currently being processed.
                  </p>
                </div>
              </div>

              <div className="self-start sm:self-auto">
                {application.status === "APPROVED" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800/60 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 shadow-sm">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    Approved & Verified
                  </span>
                ) : application.status === "REJECTED" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800/60 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-red-800 dark:text-red-300 shadow-sm">
                    <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                    Rejected
                  </span>
                ) : application.status === "NEEDS_INFORMATION" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 dark:bg-sky-950/50 border border-sky-300 dark:border-sky-800/60 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-sky-800 dark:text-sky-300 shadow-sm">
                    <Clock className="h-3.5 w-3.5 text-sky-600" />
                    Action Required
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF2FF] dark:bg-[#4338CA]/20 border border-[#6366F1]/30 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[#4338CA] dark:text-[#6366F1] shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-[#6366F1] animate-pulse" />
                    Under Review
                  </span>
                )}
              </div>
            </div>

            {/* Reference Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-stone-50/80 dark:bg-zinc-800/50 p-4 sm:p-5 rounded-2xl border border-stone-200/60 dark:border-zinc-700/60 text-xs">
              <div>
                <span className="text-3xs uppercase font-bold text-stone-400 block">Application Reference ID</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="font-mono text-sm sm:text-base font-black text-[#4338CA]">
                    {application.applicationId || "—"}
                  </span>
                  <button
                    type="button"
                    onClick={copyAppId}
                    className="text-stone-400 hover:text-[#6366F1] p-1 transition-colors rounded"
                    title="Copy Application ID"
                    aria-label="Copy Application ID"
                  >
                    {copiedAppId ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-3xs uppercase font-bold text-stone-400 block">Submission Date</span>
                <span className="font-bold text-stone-800 dark:text-stone-200 text-sm block mt-1">
                  {formatSubmissionDate(application.submittedAt)}
                </span>
              </div>

              <div>
                <span className="text-3xs uppercase font-bold text-stone-400 block">Organization</span>
                <span className="font-bold text-stone-800 dark:text-stone-200 text-sm truncate block mt-1">
                  {application.organizationName || displayName}
                </span>
              </div>

              <div>
                <span className="text-3xs uppercase font-bold text-stone-400 block">Official Email</span>
                <span className="font-bold text-stone-800 dark:text-stone-200 text-sm truncate block mt-1">
                  {displayEmail}
                </span>
              </div>
            </div>

            {application.status === "REJECTED" && application.rejectionReason && (
              <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 text-xs text-red-700 dark:text-red-300">
                <span className="font-bold block mb-0.5">Rejection Reason:</span>
                {application.rejectionReason}
              </div>
            )}

            {/* Next steps timeline */}
            <div className="space-y-3 pt-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Verification Process & Next Steps
              </h3>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-950/10 p-3.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      1. Application & Documents Logged
                    </p>
                    <p className="text-3xs text-stone-500 dark:text-stone-400 mt-0.5">
                      Your registration details, 80G/12A or Trust/Society certificates, and authorized representative info have been securely recorded.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/10 p-3.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white animate-pulse">
                    <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                        2. Legal Document & Compliance Review
                      </p>
                      <span className="rounded bg-amber-200 dark:bg-amber-900/60 px-1.5 py-0.2 text-4xs font-black uppercase text-amber-800 dark:text-amber-300">
                        In Progress
                      </span>
                    </div>
                    <p className="text-3xs text-stone-500 dark:text-stone-400 mt-0.5">
                      Our compliance team validates your registration number, PAN, and constitution documents within 2–3 business days.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50/40 dark:border-zinc-800 dark:bg-zinc-900/30 p-3.5 opacity-80">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white dark:border-zinc-700 dark:bg-zinc-800 text-stone-400">
                    <PhoneCall className="h-3 w-3" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      3. Representative Verification Call
                    </p>
                    <p className="text-3xs text-stone-500 dark:text-stone-400 mt-0.5">
                      A team member may reach out to your authorized representative for a brief introductory call.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50/40 dark:border-zinc-800 dark:bg-zinc-900/30 p-3.5 opacity-80">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white dark:border-zinc-700 dark:bg-zinc-800 text-stone-400">
                    <Sparkles className="h-3 w-3" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      4. Verified NGO Partner Badge & Active Platform Access
                    </p>
                    <p className="text-3xs text-stone-500 dark:text-stone-400 mt-0.5">
                      Upon approval, your public verified profile goes live to receive in-kind donations and run verified community campaigns.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadSummary}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 py-3 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
              >
                <Download className="h-4 w-4 text-[#4338CA]" />
                Download Application Summary (PDF)
              </button>

              <Link
                href="/profile/ngo-details"
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-stone-50 dark:hover:bg-zinc-800 px-5 py-3 text-xs font-bold text-stone-700 dark:text-stone-300 transition-colors shadow-sm"
              >
                View / Edit Submission Details
              </Link>

              <Link
                href="/"
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-[#4338CA] hover:bg-[#6366F1] px-6 py-3 text-xs font-bold text-white transition-colors shadow-sm"
              >
                Return to Home
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* 2-Column Grid: Your Journey (left) & Milestones (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 sm:gap-12 items-start">
          {/* Your Journey: a chronicle of real events */}
          <section data-tour="story">
            <div className="border-b-2 border-stone-200 dark:border-zinc-800 pb-2.5 sm:pb-3">
              <p className="text-3xs font-black uppercase tracking-[0.24em] text-[#4338CA] dark:text-[#6366F1]">
                Your Journey
              </p>
              <p className="text-xs text-stone-400 mt-1">
                Everything that has happened on your CauseKind journey, newest first.
              </p>
            </div>

            {story.length === 0 ? (
              <div className="py-10 sm:py-14 text-center space-y-3">
                <div className="w-11 h-11 sm:w-14 sm:h-14 bg-[#EEF2FF] dark:bg-[#4338CA]/20 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto">
                  <BookOpen className="w-6 h-6 text-[#4338CA] dark:text-[#6366F1]" />
                </div>
                <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">
                  Your story starts here
                </p>
                <p className="text-xs text-stone-400 max-w-[280px] mx-auto">
                  Complete your NGO profile to unlock verification, verified badges, and community campaigns.
                </p>
                <Link href="/profile/ngo-details" className="inline-block">
                  <Button size="sm" className="bg-[#4338CA] hover:bg-[#6366F1] text-white mt-2">
                    Complete Profile
                  </Button>
                </Link>
              </div>
            ) : (
              <ol className="relative mt-2 border-l-2 border-stone-200 dark:border-zinc-800 ml-2">
                {story.map((ev, i) => (
                  <motion.li
                    key={`${ev.title}-${ev.at}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="relative pl-6 py-2.5 sm:pl-8 sm:py-4 group"
                  >
                    <span
                      className={`absolute -left-[8px] sm:-left-[9px] top-3.5 sm:top-5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center ${
                        ev.broken
                          ? "bg-red-500 border-red-500"
                          : ev.done
                          ? "bg-emerald-500 border-emerald-500"
                          : "bg-[#F7F0E8] dark:bg-zinc-950 border-stone-300"
                      }`}
                    >
                      {(ev.done || ev.broken) && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 sm:gap-x-4 gap-y-1">
                      <p
                        className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 leading-snug hover:text-[#4338CA] transition-colors"
                        style={{ fontFamily: "var(--font-source-serif-4), serif" }}
                      >
                        {ev.title}
                      </p>
                      <span className="text-3xs font-bold uppercase tracking-wider text-stone-400 shrink-0">
                        {formatSubmissionDate(ev.at)}
                      </span>
                    </div>
                    <p
                      className={`text-2xs sm:text-xs mt-0.5 capitalize ${
                        ev.broken
                          ? "text-red-500"
                          : ev.done
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-stone-400"
                      }`}
                    >
                      {ev.detail}
                    </p>
                  </motion.li>
                ))}
              </ol>
            )}
          </section>

          {/* Milestones: Earned by doing, never bought */}
          <aside data-tour="milestones">
            <div className="border-b-2 border-stone-200 dark:border-zinc-800 pb-2.5 sm:pb-3">
              <p className="text-3xs font-black uppercase tracking-[0.24em] text-[#4338CA] dark:text-[#6366F1]">
                Milestones
              </p>
              <p className="text-xs text-stone-400 mt-1">Earned by doing, never bought.</p>
            </div>

            <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-5">
              {milestones.map(({ label, desc, icon: Icon, earned }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.15 + i * 0.12 }}
                  className="flex items-center gap-3 sm:gap-4"
                >
                  <div
                    className={`relative w-9 h-9 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shrink-0 ${
                      earned
                        ? "bg-gradient-to-tr from-[#4338CA] to-[#6366F1] text-white shadow-md shadow-[#4338CA]/20"
                        : "border-2 border-dashed border-stone-300 dark:border-zinc-700 text-stone-300 dark:text-zinc-600"
                    }`}
                  >
                    {earned && (
                      <span className="absolute inset-[-4px] rounded-full border border-indigo-200 dark:border-indigo-800/40" />
                    )}
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-sm sm:text-sm font-bold ${
                        earned ? "text-stone-900 dark:text-stone-100" : "text-stone-400 dark:text-zinc-600"
                      }`}
                    >
                      {label}
                    </p>
                    <p className="text-3xs sm:text-2xs text-stone-400 dark:text-zinc-600 mt-0.5">
                      {earned ? desc : `Locked - ${desc.toLowerCase()}`}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {/* ── Edit Account Details Modal Matching Donee's Full Field Set ── */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xs font-black uppercase tracking-[0.24em] text-[#4338CA] dark:text-[#6366F1]">
              Account settings
            </DialogTitle>
            <DialogDescription>
              Update your organization name, official phone number, and location.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAccountDetails} className="contents">
            <DialogBody className="space-y-4 sm:space-y-5">
              {/* Avatar Upload */}
              <div className="flex justify-center">
                <AvatarUpload
                  imageDataUrl={avatarDataUrl}
                  initials={initials}
                  onImageChange={handleAvatarChange}
                  tone="indigo"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* Organization Name (Maps explicitly to organizationName) */}
                <div className="space-y-1.5">
                  <Label htmlFor="orgName" className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    Organization Name
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <Input
                      id="orgName"
                      className="pl-10 rounded-xl border-stone-200 py-3.5 sm:py-5 font-medium focus-visible:ring-[#4338CA]"
                      placeholder="e.g. Hope Welfare Foundation"
                      value={editOrgName}
                      onChange={(e) => setEditOrgName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Email Address (read-only/disabled) */}
                <div className="space-y-1.5">
                  <Label htmlFor="orgEmail" className="text-xs font-bold uppercase tracking-wider text-stone-400">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <Input
                      id="orgEmail"
                      className="pl-10 rounded-xl border-stone-200 py-3.5 sm:py-5 font-medium bg-stone-50 dark:bg-zinc-800 text-stone-400 cursor-not-allowed"
                      value={displayEmail}
                      disabled
                    />
                  </div>
                </div>
              </div>

              {/* Phone with dial-code dropdown */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Official Phone Number
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
                    className="flex-1 rounded-xl border-stone-200 py-3.5 sm:py-5 font-medium focus-visible:ring-[#4338CA]"
                    placeholder="Phone number"
                    value={phoneNumber}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, maxPhoneLength);
                      setPhoneNumber(digits);
                    }}
                  />
                </div>
              </div>

              {/* Location Selection (Country / State / City) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
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

                <div className="space-y-1">
                  <Label htmlFor="state" className="text-xs text-stone-500">State / Province</Label>
                  {noStateOptions ? (
                    <p className="text-xs text-stone-400 italic py-2">
                      No states listed
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

                <div className="space-y-1">
                  <Label htmlFor="city" className="text-xs text-stone-500">City</Label>
                  {showCityFreeText ? (
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                      <Input
                        id="city"
                        className="pl-10 rounded-xl border-stone-200 py-3.5 sm:py-5 font-medium focus-visible:ring-[#4338CA]"
                        placeholder="Enter city"
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

              {/* GPS Coordinates & "Use GPS" */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5" /> GPS Location
                </Label>
                <div className="flex items-center gap-3 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-800/20 p-3">
                  <div className="flex-1 min-w-0">
                    {profile?.latitude && profile?.longitude ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-stone-850 dark:text-white">Location saved</p>
                          <p className="text-3xs text-stone-400">
                            {profile.latitude.toFixed(4)}, {profile.longitude.toFixed(4)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-stone-850 dark:text-white">No GPS location saved</p>
                          <p className="text-3xs text-stone-400">Enables precise donor and item match routing nearby</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={locStatus === "requesting"}
                    className="shrink-0 flex items-center gap-1.5 rounded-lg bg-[#4338CA] hover:bg-[#6366F1] px-3 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-60"
                  >
                    {locStatus === "requesting" ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Getting…</>
                    ) : (
                      <><Navigation className="w-3 h-3" /> Use GPS</>
                    )}
                  </button>
                </div>
                <p className="text-3xs text-stone-400 leading-relaxed">
                  Your exact coordinates are never shown publicly. Only approximate proximity (e.g. ~2.4 km away) is used for matching.
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
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                className="bg-[#4338CA] hover:bg-[#6366F1] text-white rounded-xl py-4 font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition-colors"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save Profile Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Interactive 3D Member Pass for NGO Partner
 */
function NgoMemberPass({
  name,
  role,
  city,
  initials,
  avatarUrl,
}: {
  name: string;
  role: string;
  city: string | null | undefined;
  initials: string;
  avatarUrl?: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 });

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
          background: "linear-gradient(135deg, #6366F1 0%, #4338CA 60%, #312E81 100%)",
          boxShadow: "0 24px 60px -18px rgba(0,0,0,0.55)",
        }}
      >
        {/* Cursor-following glare */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity"
          style={{
            background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.22) 0%, transparent 55%)`,
          }}
        />
        {/* Engraved edge line */}
        <div className="pointer-events-none absolute inset-2 rounded-xl border border-white/15" />

        <div className="relative flex items-start justify-between">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-white/15 border border-white/25 flex items-center justify-center">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-black text-lg sm:text-xl">{initials}</span>
            )}
          </div>
          <div className="text-right">
            <p className="text-5xs font-black uppercase tracking-[0.3em] text-white/50">CauseKind</p>
            <p className="text-5xs font-bold uppercase tracking-[0.2em] text-white/35 mt-0.5">
              NGO Partner Network
            </p>
          </div>
        </div>

        <p
          className="relative mt-5 sm:mt-7 text-xl sm:text-2xl text-white leading-tight break-words"
          style={{
            fontFamily: "var(--font-lora), serif",
            fontStyle: "italic",
            fontWeight: 600,
          }}
        >
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
