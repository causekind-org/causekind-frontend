"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, FileText, Loader2, Upload } from "lucide-react";
import { LEGAL_STRUCTURES } from "@/features/ngo-registration/ngoRegistrationModel";
import { ngoPanCheck, ngoWizardPanCheck, type PanCheckResult, type PanCheckWarning } from "@/lib/api";

/**
 * PAN card feature: kept but not used yet; will be moved to another place later.
 * Nothing renders these components now.
 *
 * NGO-only signup fields for the PAN-card signup: legal structure, the PAN card upload,
 * the date of formation, the "read from your card" notes and the PAN letter warnings.
 * Donor and donee signup never render any of this.
 */

export const PAN_CARD_MAX_BYTES = 10 * 1024 * 1024;
const PAN_CARD_TYPES = ["image/jpeg", "image/png", "application/pdf"];
export const PAN_FORMAT = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export const NGO_SIGNUP_MESSAGES = {
  structureRequired: "Please choose your organization's legal structure.",
  panCardRequired: "Please upload your PAN card.",
  panCardType: "Please upload a JPG, PNG or PDF of your PAN card.",
  panCardSize: "That file is larger than 10 MB. Please upload a smaller photo or PDF.",
  dateRequired: "Please enter the date of formation.",
  dateInvalid: "Date of formation must be a date in the past.",
  readFromCard: "Read from your PAN card, please check",
  couldNotRead: "We couldn't read this, please type it.",
} as const;

export function panCardFileError(file: File): string | null {
  const name = file.name.toLowerCase();
  const typeOk = PAN_CARD_TYPES.includes(file.type) || /\.(jpe?g|png|pdf)$/.test(name);
  if (!typeOk) return NGO_SIGNUP_MESSAGES.panCardType;
  if (file.size > PAN_CARD_MAX_BYTES) return NGO_SIGNUP_MESSAGES.panCardSize;
  return null;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** A real calendar date strictly before today, or false. */
export function isValidPastDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d || y < 1800) return false;
  return value < todayIso();
}

export function dateOfFormationError(value: string): string | null {
  if (!value) return NGO_SIGNUP_MESSAGES.dateRequired;
  return isValidPastDate(value) ? null : NGO_SIGNUP_MESSAGES.dateInvalid;
}

const inputClass = (invalid: boolean) =>
  `w-full rounded-xl border px-3.5 py-2.5 sm:px-4 sm:py-3 text-base text-stone-900 dark:text-stone-100 bg-stone-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 transition ${
    invalid ? "border-red-400 focus:ring-red-200" : "border-stone-200 dark:border-zinc-800 focus:border-[var(--accent)] focus:ring-[var(--accent-20)]"
  }`;

function ErrorText({ id, msg }: { id: string; msg?: string | null }) {
  if (!msg) return null;
  return <p id={id} role="alert" className="text-xs text-red-600 dark:text-red-400 mt-1">{msg}</p>;
}

export function NgoLegalStructureField({ value, onChange, error, warnings }: {
  value: string; onChange: (v: string) => void; error?: string | null; warnings?: PanCheckWarning[];
}) {
  return (
    <div className="space-y-1">
      <label htmlFor="legalStructure" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
        Legal structure *
      </label>
      <select
        id="legalStructure"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? "legalStructure-error" : undefined}
        className={inputClass(!!error)}
      >
        <option value="">Select your legal structure</option>
        {LEGAL_STRUCTURES.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>
      <ErrorText id="legalStructure-error" msg={error} />
      <PanWarnings warnings={warnings} field="legalStructure" />
    </div>
  );
}

export function NgoPanCardUpload({ file, onFile, reading, error }: {
  file: File | null; onFile: (f: File) => void; reading: boolean; error?: string | null;
}) {
  const pickRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/") || typeof URL.createObjectURL !== "function") {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const choose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onFile(f);
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor="panCard" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
        Upload your PAN card *
      </label>
      <p className="text-xs text-stone-500 dark:text-stone-400">JPG, PNG or PDF (e-PAN works too), up to 10 MB.</p>
      <input
        ref={pickRef}
        id="panCard"
        type="file"
        accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
        className="sr-only"
        aria-invalid={!!error || undefined}
        aria-describedby={error ? "panCard-error" : undefined}
        onChange={choose}
      />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1}
        aria-hidden="true" data-testid="panCardCamera" onChange={choose} />
      <div className="flex gap-2">
        <button type="button" onClick={() => pickRef.current?.click()}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-3 text-sm font-semibold transition hover:bg-[var(--accent-5)] ${
            error ? "border-red-400 text-red-700" : "border-[var(--accent-30)] text-[var(--accent)]"}`}>
          <Upload className="w-4 h-4" /> {file ? "Change file" : "Choose file"}
        </button>
        <button type="button" onClick={() => cameraRef.current?.click()}
          className="sm:hidden flex items-center justify-center gap-2 rounded-xl border border-[var(--accent-30)] px-3 py-3 text-sm font-semibold text-[var(--accent)]">
          <Camera className="w-4 h-4" /> Take a photo
        </button>
      </div>
      {file && (
        <div className="flex items-center gap-3 rounded-xl border border-stone-200 dark:border-zinc-800 p-2">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="PAN card preview" className="h-14 w-24 object-cover rounded-md" />
          ) : (
            <FileText className="h-8 w-8 text-stone-400" aria-hidden="true" />
          )}
          <span className="text-sm text-stone-700 dark:text-stone-300 truncate flex-1">{file.name}</span>
        </div>
      )}
      {reading && (
        <p role="status" className="flex items-center gap-2 text-xs text-stone-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading your PAN card…
        </p>
      )}
      <ErrorText id="panCard-error" msg={error} />
    </div>
  );
}

export function NgoDateOfFormationField({ value, onChange, onBlur, error }: {
  value: string; onChange: (v: string) => void; onBlur?: () => void; error?: string | null;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor="dateOfFormation" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
        Date of formation *
      </label>
      <input
        id="dateOfFormation"
        type="date"
        max={todayIso()}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? "dateOfFormation-error" : undefined}
        className={inputClass(!!error)}
      />
      <ErrorText id="dateOfFormation-error" msg={error} />
    </div>
  );
}

/** "Read from your PAN card" / "We couldn't read this" under a field. */
export function CardNote({ kind, id }: { kind: "card" | "unreadable" | null; id: string }) {
  if (!kind) return null;
  return (
    <p id={id} data-testid={id} className={`text-xs mt-1 ${kind === "card" ? "text-sky-700 dark:text-sky-300" : "text-amber-700 dark:text-amber-300"}`}>
      {kind === "card" ? NGO_SIGNUP_MESSAGES.readFromCard : NGO_SIGNUP_MESSAGES.couldNotRead}
    </p>
  );
}

/** PAN letter warnings for one field: red for a personal PAN, amber otherwise. Never blocking. */
export function PanWarnings({ warnings, field }: { warnings?: PanCheckWarning[]; field: string }) {
  const mine = (warnings ?? []).filter((w) => w.field === field);
  if (mine.length === 0) return null;
  return (
    <ul className="space-y-1 mt-1">
      {mine.map((w) => (
        <li key={w.code} data-testid={`pan-warning-${w.code}`} data-severity={w.severity}
          className={`text-xs rounded-lg px-2.5 py-1.5 border ${
            w.severity === "DANGER"
              ? "bg-red-50 border-red-300 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200"
              : "bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200"}`}>
          {w.message}
        </li>
      ))}
    </ul>
  );
}

/**
 * Live PAN letter checks from the backend helper, re-run (debounced) whenever the
 * structure, PAN or organization name changes. Empty until the PAN has a valid format.
 */
export function usePanCheck(enabled: boolean, pan: string, structure: string, organizationName: string, delayMs = 300) {
  const [result, setResult] = useState<PanCheckResult | null>(null);
  useEffect(() => {
    const p = pan.trim().toUpperCase();
    if (!enabled || !PAN_FORMAT.test(p)) {
      setResult(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      ngoPanCheck({ panNumber: p, legalStructure: structure, organizationName })
        .then((r) => { if (!cancelled) setResult(r); })
        .catch(() => { if (!cancelled) setResult(null); });
    }, delayMs);
    return () => { cancelled = true; clearTimeout(t); };
  }, [enabled, pan, structure, organizationName, delayMs]);
  return result;
}

/**
 * Wizard: the same checks against the PAN the NGO gave at signup (the wizard has no PAN
 * field), re-run when the structure or name changes. Silent on any error.
 */
export function useWizardPanCheck(enabled: boolean, structure: string, organizationName: string, delayMs = 300) {
  const [result, setResult] = useState<PanCheckResult | null>(null);
  useEffect(() => {
    if (!enabled || !structure) {
      setResult(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      try {
        ngoWizardPanCheck({ legalStructure: structure, organizationName })
          .then((r) => { if (!cancelled) setResult(r); })
          .catch(() => { if (!cancelled) setResult(null); });
      } catch {
        if (!cancelled) setResult(null);
      }
    }, delayMs);
    return () => { cancelled = true; clearTimeout(t); };
  }, [enabled, structure, organizationName, delayMs]);
  return result;
}
