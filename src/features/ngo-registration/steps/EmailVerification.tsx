"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, KeyRound, Loader2, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { OTPInput, REGEXP_ONLY_DIGITS } from "input-otp";
import { IS_NGO_DEMO_MODE, type NGOFormState } from "@/features/ngo-registration/ngoRegistrationModel";
import { cn } from "@/lib/utils";
import { verifyNgoOtp, resendNgoOtp } from "@/lib/api";

interface EmailVerificationProps {
  data: NGOFormState;
  onChange: (patch: Partial<NGOFormState>) => void;
  onBack: () => void;
  onVerified: () => void;
}

const OTP_LENGTH = 6;
const COOLDOWN_SECONDS = 60;

export function EmailVerification({ data, onChange, onBack, onVerified }: EmailVerificationProps) {
  const [code, setCode] = useState(data.emailOtp || "");
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleVerify(valueToVerify: string) {
    if (valueToVerify.length !== OTP_LENGTH) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }
    if (!data.applicationId) {
      setError("Application ID is missing. Please go back and re-submit.");
      return;
    }

    setError(null);
    setIsVerifying(true);

    // DEMO MODE ONLY: Bypass real backend /verify endpoint.
    // Accepts any 6-digit code, simulates a short delay, and proceeds to success.
    if (IS_NGO_DEMO_MODE) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
        onChange({ emailOtp: valueToVerify });
        onVerified();
      } finally {
        setIsVerifying(false);
      }
      return;
    }

    try {
      await verifyNgoOtp(data.applicationId, valueToVerify);
      onChange({ emailOtp: valueToVerify });
      onVerified();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed. Please try again.";
      setError(msg);
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || isResending) return;
    if (!data.applicationId) {
      setError("Application ID is missing. Please go back and re-submit.");
      return;
    }

    setIsResending(true);
    setError(null);
    setCode("");

    // DEMO MODE ONLY: Bypass real backend /resend-otp endpoint.
    // Simulates resetting the cooldown timer without hitting backend.
    if (IS_NGO_DEMO_MODE) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 300));
        setCooldown(COOLDOWN_SECONDS);
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 4000);
      } finally {
        setIsResending(false);
      }
      return;
    }

    try {
      await resendNgoOtp(data.applicationId);
      setCooldown(COOLDOWN_SECONDS);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not resend code. Please try again.";
      setError(msg);
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-2xs font-black uppercase tracking-widest text-[#b04a15]">
          Step 6 of 6
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
          Verify Official Email
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          We sent a 6-digit verification code to the official representative email:
        </p>
        <p className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 dark:bg-zinc-800 px-3 py-1.5 text-xs font-bold text-stone-800 dark:text-stone-200 mt-1">
          <Mail className="h-3.5 w-3.5 text-[#b04a15]" />
          {data.officialEmail || "representative@org.ngo"}
        </p>
      </div>

      {/* OTP Input Card */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50/60 dark:border-zinc-800 dark:bg-zinc-900/40 p-5 sm:p-6 space-y-4 text-center">
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
            Enter 6-Digit OTP Code
          </p>
          <p className="text-3xs text-stone-400">
            Check your inbox and spam/junk folder
          </p>
          {IS_NGO_DEMO_MODE && (
            <p className="text-3xs font-semibold text-amber-600 dark:text-amber-400">
              Demo Mode Active: Enter any 6 digits (e.g. 123456)
            </p>
          )}
        </div>

        {/* input-otp container */}
        <div className="flex justify-center my-2">
          <OTPInput
            maxLength={OTP_LENGTH}
            value={code}
            onChange={(val) => {
              setCode(val);
              if (error) setError(null);
              if (val.length === OTP_LENGTH) {
                handleVerify(val);
              }
            }}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            autoComplete="one-time-code"
            render={({ slots }) => (
              <div className="flex items-center gap-2 sm:gap-2.5">
                {slots.map((slot, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex h-12 w-10 sm:h-14 sm:w-12 items-center justify-center rounded-xl border bg-white dark:bg-zinc-900 font-mono text-lg sm:text-xl font-bold transition-all",
                      slot.isActive
                        ? "border-[#b04a15] ring-2 ring-[#b04a15]/25 shadow-sm"
                        : slot.char
                        ? "border-[#b04a15]/40 bg-[#b04a15]/[0.02]"
                        : "border-stone-200 dark:border-zinc-700 text-stone-400"
                    )}
                  >
                    {slot.char || ""}
                  </div>
                ))}
              </div>
            )}
          />
        </div>

        {error && (
          <p className="text-xs font-semibold text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {resendSuccess && (
          <p className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center justify-center gap-1">
            <Check className="h-3.5 w-3.5" /> New code sent successfully!
          </p>
        )}

        {/* Resend Affordance & Timer */}
        <div className="flex items-center justify-center gap-3 pt-1 text-xs">
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || isVerifying || isResending}
            className="inline-flex items-center gap-1 font-semibold text-[#b04a15] dark:text-[#e07b3a] hover:underline disabled:no-underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={cn("h-3 w-3", isResending && "animate-spin")} />
            {cooldown > 0 ? `Resend code in ${cooldown}s` : isResending ? "Sending..." : "Resend code"}
          </button>
        </div>

        {/* Application ID reference */}
        {data.applicationId && (
          <p className="text-3xs text-stone-400 border-t border-stone-200/70 dark:border-zinc-800 pt-3">
            Application reference:{" "}
            <span className="font-mono font-bold text-stone-600 dark:text-stone-300">
              {data.applicationId}
            </span>
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isVerifying || isResending}
          className="flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-zinc-700 bg-transparent px-4 py-2.5 text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]/40"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </button>
        <button
          type="button"
          onClick={() => handleVerify(code)}
          disabled={code.length !== OTP_LENGTH || isVerifying}
          className="flex items-center gap-2 rounded-xl bg-[#b04a15] hover:bg-[#963c0d] disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 text-sm font-bold text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b04a15]/40 shadow-sm"
        >
          {isVerifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" /> Verify & Submit
            </>
          )}
        </button>
      </div>
    </div>
  );
}
