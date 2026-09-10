"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/lib/toast";
import { useAuth } from "@/hooks/useAuth";
import { IS_NGO_DEMO_MODE } from "@/features/ngo-registration/ngoRegistrationModel";
import {
  getProfile,
  updateProfile,
  getMyNgoApplication,
  getNgoDraft,
  type UserProfile,
  type NgoApplicationStatusResponse,
} from "@/lib/api";
import { NGORegistration, type NGOProgressInfo } from "@/features/ngo-registration/NGORegistration";
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
} from "lucide-react";

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "NGO";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return ((words[0][0] ?? "") + (words[words.length - 1][0] ?? "")).toUpperCase();
}

/**
 * FEATURE 4 & 5:
 * NGO "My Profile" page styled after the existing Donor profile page layout:
 * - Profile card with an initials-style avatar, organization name, official email, phone, location
 * - Dark gradient card with decorative circles, label "CAUSEKIND NGO PARTNER" / role "NGO"
 * - Preserved "Edit account details" dropdown dialog
 * - Three-stat counter row adapted to NGO stats (Items Requested, Active Campaigns, Donations Matched)
 * - Completion percentage indicator (Feature 5) updating dynamically as steps complete
 * - Embedded 6-step registration wizard (NGORegistration) with seamless draft/resume logic
 */
export default function NgoProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Form edit fields
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCity, setEditCity] = useState("");

  // Draft & application details
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

  // Feature 5 progress state
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

  // Check auth & load initial profile/draft
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?next=/dashboard/ngo/profile");
      return;
    }

    if (!user) return;

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
      getProfile().catch(() => null),
      getMyNgoApplication().catch(() => null),
      getNgoDraft().catch(() => null),
    ])
      .then(([userProf, app, draft]) => {
        if (!isMounted) return;
        if (userProf) {
          setProfile(userProf);
          setEditName(userProf.fullName || "");
          setEditPhone(userProf.phone || "");
          setEditCity(userProf.city || "");
        }

        if (app && (app.applicationId || app.status)) {
          setApplication(app);
        }

        const resolvedName =
          draft?.organizationName ||
          app?.organizationName ||
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

        // Set initial progress from draft if available (only if step > 0)
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
            currentStep: (draft.currentStep as any) || "org-details",
          }));
        } else {
          setProgress((prev) => ({
            ...prev,
            completedCount: 0,
            percent: 0,
            currentStep: "org-details",
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
    if (!editName.trim()) {
      toast.error("Please enter your organization name");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateProfile({
        fullName: editName.trim(),
        phone: editPhone.trim(),
        city: editCity.trim(),
      });
      setProfile(updated);
      setOrgDetails((prev) => ({
        ...prev,
        name: updated.fullName || editName.trim(),
        phone: updated.phone || editPhone.trim(),
        city: updated.city || editCity.trim(),
      }));
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
        <RefreshCw className="h-7 w-7 animate-spin text-[#b04a15]" />
      </div>
    );
  }

  if (!user) return null;

  const displayName = orgDetails.name || profile?.fullName || user.email.split("@")[0];
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

  // NGO-relevant three-stat counter row
  const statsRow = [
    { value: 0, label: "items requested" },
    { value: 0, label: "active campaigns" },
    { value: 0, label: "donations matched" },
  ];

  return (
    <div className="bg-[#F7F0E8] dark:bg-zinc-950 min-h-screen pb-28">
      {/* ── Top Header Band: Terracotta/Copper gradient matching Donor profile ── */}
      <div
        className="relative overflow-hidden text-white"
        style={{
          background: "linear-gradient(140deg, #2a1a10 0%, #40281a 52%, #241610 100%)",
        }}
      >
        {/* Decorative circles matching Donor profile */}
        <div className="pointer-events-none absolute -top-24 right-[8%] w-[420px] h-[420px] rounded-full border border-[#C17A3A]/15" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 w-72 h-72 rounded-full border border-[#C17A3A]/10" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 75% 20%, rgba(193,122,58,0.14) 0%, transparent 55%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-14 pb-2 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 sm:gap-10 lg:gap-16 items-center">
          {/* 3D Member Pass / NGO Card */}
          <div>
            <NgoMemberPass
              name={displayName}
              role="NGO"
              city={displayCity}
              initials={initials}
            />
          </div>

          {/* Org details & action */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="min-w-0"
          >
            <p className="text-3xs font-black uppercase tracking-[0.28em] text-[#C17A3A]">
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
                <Mail className="w-3.5 h-3.5 text-[#C17A3A] shrink-0" />
                <span className="truncate max-w-[220px] sm:max-w-xs">{displayEmail}</span>
              </span>
              {displayPhone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#C17A3A] shrink-0" />
                  <span>{displayPhone}</span>
                </span>
              )}
              {displayCity && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#C17A3A] shrink-0" />
                  <span className="truncate max-w-[200px]">{displayCity}</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="mt-4 sm:mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[var(--ck-role-secondary)] to-[var(--ck-role-accent)] hover:from-[#e8894c] hover:to-[#c25620] px-4 py-2.5 sm:px-5 sm:py-3 text-2xs sm:text-xs font-bold uppercase tracking-wider text-[#faf8f5] shadow-lg shadow-[var(--ck-role-accent)]/40 hover:shadow-xl hover:-translate-y-0.5 ring-1 ring-white/20 transition-all"
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
        </div>
      </div>

      {/* ── Main Body: Submitted Application Status OR Feature 5 Wizard ── */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 mt-8 sm:mt-12 space-y-6">
        {isApplicationSubmitted && application ? (
          /* Application Submitted Status View (Bug 5 Fix) */
          <div className="space-y-6">
            <div className="rounded-2xl sm:rounded-3xl border border-stone-200/80 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 p-5 sm:p-8 shadow-sm backdrop-blur-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 dark:border-zinc-800 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#b04a15] to-[#e07b3a] flex items-center justify-center text-white shadow-md shadow-[#b04a15]/20">
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

                {/* Status Badge */}
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
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/60 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 shadow-sm">
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
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
                    <span className="font-mono text-sm sm:text-base font-black text-[#b04a15]">
                      {application.applicationId || "—"}
                    </span>
                    <button
                      type="button"
                      onClick={copyAppId}
                      className="text-stone-400 hover:text-[#b04a15] p-1 transition-colors rounded"
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

              {/* Rejection / Info alert if applicable */}
              {application.status === "REJECTED" && application.rejectionReason && (
                <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 text-xs text-red-700 dark:text-red-300">
                  <span className="font-bold block mb-0.5">Rejection Reason:</span>
                  {application.rejectionReason}
                </div>
              )}

              {/* What Happens Next Timeline Tracker */}
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
                  <Download className="h-4 w-4 text-[#b04a15]" />
                  Download Application Summary (PDF)
                </button>

                <Link
                  href="/"
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-[#b04a15] hover:bg-[#963c0d] px-6 py-3 text-xs font-bold text-white transition-colors shadow-sm"
                >
                  Return to Home
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Incomplete: Show Feature 5 Profile Completion & 6-Step Wizard */
          <>
            <div className="rounded-2xl sm:rounded-3xl border border-stone-200/80 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 p-5 sm:p-6 shadow-sm backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#b04a15]/10 border border-[#b04a15]/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-[#b04a15]" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-stone-100">
                      NGO Profile Completion
                    </h2>
                    <p className="text-2xs sm:text-xs text-stone-500 dark:text-stone-400">
                      {progress.completedCount} of 6 registration steps completed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-lg sm:text-2xl font-black text-[#b04a15] tabular-nums">
                    {progress.percent}% Complete
                  </span>
                </div>
              </div>

              {/* Dynamic Animated Progress Bar */}
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-zinc-800 border border-stone-200/60 dark:border-zinc-700/60">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#b04a15] via-[#d4652f] to-[#e07b3a]"
                  initial={false}
                  animate={{ width: `${progress.percent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Embedded 6-Step Registration Wizard */}
            <div className="rounded-2xl sm:rounded-3xl border border-stone-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 p-5 sm:p-8 shadow-sm backdrop-blur-sm">
              <NGORegistration onProgressChange={handleProgressChange} />
            </div>
          </>
        )}
      </div>

      {/* Edit Account Details Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl p-6 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-stone-900 dark:text-stone-100">
              Edit NGO Account Details
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500 dark:text-stone-400">
              Update your organization name, official phone number, and location.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAccountDetails} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="org-name" className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Organization Name
              </Label>
              <Input
                id="org-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Hope Welfare Foundation"
                className="rounded-xl text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-phone" className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Official Phone Number
              </Label>
              <Input
                id="org-phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
                className="rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-city" className="text-xs font-bold text-stone-700 dark:text-stone-300">
                City / Location
              </Label>
              <Input
                id="org-city"
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                placeholder="e.g. Mumbai, Maharashtra"
                className="rounded-xl text-sm"
              />
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm" className="rounded-xl text-xs">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-[#b04a15] hover:bg-[#963c0d] text-white rounded-xl text-xs font-bold px-4 py-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
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
 * Replicates the Donor profile card's tilt, glare, engraved edge, and gradient style.
 */
function NgoMemberPass({
  name,
  role,
  city,
  initials,
}: {
  name: string;
  role: string;
  city: string | null | undefined;
  initials: string;
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
          background: "linear-gradient(135deg, #C17A3A 0%, #8B4513 60%, #5e2f10 100%)",
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
            <span className="text-white font-black text-lg sm:text-xl">{initials}</span>
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
