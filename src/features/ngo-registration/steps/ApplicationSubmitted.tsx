"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileText,
  Mail,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  legalStructureLabel,
  type NGOFormState,
} from "@/features/ngo-registration/ngoRegistrationModel";

interface ApplicationSubmittedProps {
  data: NGOFormState;
  onReset: () => void;
}

export function ApplicationSubmitted({ data, onReset }: ApplicationSubmittedProps) {
  const [copied, setCopied] = useState(false);

  function copyAppId() {
    if (!data.applicationId) return;
    navigator.clipboard.writeText(data.applicationId);
    setCopied(true);
    toast.success("Application ID copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  }

  function handleDownloadSummary() {
    toast.success("Application summary downloaded (demo).");
  }

  return (
    <div className="space-y-6 py-2">
      {/* Top Success Badge */}
      <div className="text-center space-y-3">
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#b04a15] to-[#e07b3a] text-white shadow-lg shadow-[#b04a15]/25">
          <ShieldCheck className="h-9 w-9" strokeWidth={2.2} />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white shadow">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-3xs font-black uppercase tracking-widest text-[#b04a15] bg-[#b04a15]/10 px-2.5 py-1 rounded-full">
            Application Received
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-900 dark:text-stone-50 pt-1">
            Application Submitted!
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto">
            Your NGO registration for{" "}
            <span className="font-bold text-stone-800 dark:text-stone-200">
              {data.organizationName || "your organization"}
            </span>{" "}
            has been successfully submitted for verification.
          </p>
        </div>
      </div>

      {/* Reference Card */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50/80 dark:border-zinc-800 dark:bg-zinc-900/60 p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/70 dark:border-zinc-800 pb-3">
          <div>
            <p className="text-3xs uppercase font-bold text-stone-400">Application Reference ID</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-base sm:text-lg font-black text-[#b04a15]">
                {data.applicationId || "—"}
              </span>
              <button
                type="button"
                onClick={copyAppId}
                className="text-stone-400 hover:text-[#b04a15] p-1 transition-colors rounded"
                title="Copy Application ID"
                aria-label="Copy Application ID"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/50 px-2.5 py-1 text-3xs font-black uppercase tracking-wide text-amber-800 dark:text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Under Verification
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-3xs text-stone-400 font-semibold block">Legal Entity</span>
            <span className="font-bold text-stone-800 dark:text-stone-200 truncate block mt-0.5">
              {legalStructureLabel(data.legalStructure) || "Registered Organization"}
            </span>
          </div>
          <div>
            <span className="text-3xs text-stone-400 font-semibold block">Submitted At</span>
            <span className="font-bold text-stone-800 dark:text-stone-200 block mt-0.5">
              {data.submittedAt || "Just now"}
            </span>
          </div>
          <div>
            <span className="text-3xs text-stone-400 font-semibold block">Representative</span>
            <span className="font-bold text-stone-800 dark:text-stone-200 truncate block mt-0.5">
              {data.representativeName || "Representative"} ({data.designation || "Lead"})
            </span>
          </div>
          <div>
            <span className="text-3xs text-stone-400 font-semibold block">Email Updates To</span>
            <span className="font-bold text-stone-800 dark:text-stone-200 truncate block mt-0.5">
              {data.officialEmail || "Official Email"}
            </span>
          </div>
        </div>
      </div>

      {/* "What Happens Next" Timeline Tracker */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
          What Happens Next
        </h3>

        <div className="space-y-2.5">
          {/* Milestone 1: Done */}
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-950/10 p-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                1. Application & Documents Logged
              </p>
              <p className="text-3xs text-stone-500 dark:text-stone-400 mt-0.5">
                All submitted organizational details, legal certificates, and representative authorization have been securely stored.
              </p>
            </div>
          </div>

          {/* Milestone 2: In Progress */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/10 p-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white animate-pulse">
              <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  2. Document & Compliance Review
                </p>
                <span className="rounded bg-amber-200 dark:bg-amber-900/60 px-1.5 py-0.2 text-4xs font-black uppercase text-amber-800 dark:text-amber-300">
                  In Progress
                </span>
              </div>
              <p className="text-3xs text-stone-500 dark:text-stone-400 mt-0.5">
                Our verification desk evaluates your Trust Deed / Society MOA, Registration Certificate, and PAN against national registries within 2–3 business days.
              </p>
            </div>
          </div>

          {/* Milestone 3: Telephonic Check */}
          <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50/40 dark:border-zinc-800 dark:bg-zinc-900/30 p-3 opacity-75">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white dark:border-zinc-700 dark:bg-zinc-800 text-stone-400">
              <PhoneCall className="h-3 w-3" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
                3. Authorized Representative Call
              </p>
              <p className="text-3xs text-stone-500 dark:text-stone-400 mt-0.5">
                We may reach out to {data.representativeName || "the representative"} at {data.mobileNumber || "your registered number"} for a brief 2-minute verification call.
              </p>
            </div>
          </div>

          {/* Milestone 4: Activated */}
          <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50/40 dark:border-zinc-800 dark:bg-zinc-900/30 p-3 opacity-75">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white dark:border-zinc-700 dark:bg-zinc-800 text-stone-400">
              <Sparkles className="h-3 w-3" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
                4. Verified NGO Partner Badge & Dashboard
              </p>
              <p className="text-3xs text-stone-500 dark:text-stone-400 mt-0.5">
                Upon approval, your public verified profile goes live. You can receive items directly, run donation campaigns, and coordinate with verified donors.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-2">
        <button
          type="button"
          onClick={handleDownloadSummary}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-3 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <Download className="h-4 w-4 text-[#b04a15]" />
          Download Application Summary (PDF)
        </button>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#b04a15] hover:bg-[#963c0d] py-3 text-xs font-bold text-white transition-colors shadow-sm text-center"
          >
            Return to Home
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-stone-200 dark:border-zinc-700 px-3.5 py-3 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Home
          </Link>
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-stone-200 dark:border-zinc-700 px-3 py-3 text-xs font-bold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
            title="Start new registration"
          >
            Start Over
          </button>
        </div>
      </div>
    </div>
  );
}
