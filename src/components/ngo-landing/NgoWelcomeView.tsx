"use client";

import Link from "next/link";
import { HandHeart, X } from "lucide-react";
import { useNgoStatus } from "./useNgoStatus";

const POINTS = ["Get your organisation verified", "Start drives for what you need", "Receive items and share proof"];

/** The welcome after an NGO logs in or signs up: NGO copy, and one next step that fits its verification state. */
export function NgoWelcomeView({ exiting, dismiss }: { exiting: boolean; dismiss: () => void }) {
  const status = useNgoStatus();
  const named = status.ngoName && status.ngoName !== "Your Organization" ? status.ngoName : "";
  const verified = status.status === "verified";
  const cta = verified
    ? { label: "Start your first drive", href: "/ngo/drives/new" }
    : { label: "Complete your verification", href: status.wizardHref || "/profile/ngo-details" };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center overflow-y-auto overscroll-contain bg-stone-950/80 px-5 py-16 backdrop-blur-xl ${exiting ? "ck-scrim-exit" : "ck-scrim-enter"}`}
      onClick={dismiss}
      data-testid="ngo-welcome"
    >
      <style>{`
        @keyframes ck-overlay-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ck-overlay-out { from { opacity: 1; } to { opacity: 0; } }
        .ck-scrim-enter { animation: ck-overlay-in 0.4s ease-out both; }
        .ck-scrim-exit { animation: ck-overlay-out 0.4s ease-in both; }
        @media (prefers-reduced-motion: reduce) { .ck-scrim-enter, .ck-scrim-exit { animation: none; } }
      `}</style>
      <button type="button" onClick={dismiss} aria-label="Close welcome message" className="absolute right-3 top-3 p-2 text-white/50 hover:text-white">
        <X className="h-7 w-7" aria-hidden />
      </button>
      <div role="dialog" aria-modal="true" aria-labelledby="ngo-welcome-title" className="relative my-auto w-full max-w-sm min-w-0 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.8rem] bg-gradient-to-br from-[#0B3D2E] to-[#2F8F5B] shadow-xl">
          <HandHeart className="h-10 w-10 text-white" aria-hidden />
        </div>
        <h2 id="ngo-welcome-title" className="mb-3 text-[26px] font-black tracking-tight text-white [overflow-wrap:anywhere] sm:text-3xl">
          {named ? `Welcome to CauseKind, ${named}` : "Welcome to CauseKind"}
        </h2>
        <ul className="mx-auto mb-8 max-w-xs space-y-1.5 text-left text-sm text-stone-300">
          {POINTS.map((p) => (
            <li key={p} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9A441]" aria-hidden />{p}</li>
          ))}
        </ul>
        {!status.isLoading && (
          <Link href={cta.href} onClick={dismiss}
            className="block w-full rounded-2xl bg-gradient-to-r from-[#1E6B4A] to-[#2F8F5B] py-3.5 text-base font-extrabold text-white shadow-lg hover:brightness-110">
            {cta.label}
          </Link>
        )}
      </div>
    </div>
  );
}
