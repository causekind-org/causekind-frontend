"use client";

import { useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Upload, Check, FileText, Loader2 } from "lucide-react";
import {
  DESIGNATIONS,
  IS_NGO_DEMO_MODE,
  type NGOFormState,
  type UploadedFile,
} from "@/features/ngo-registration/ngoRegistrationModel";
import { uploadNgoDocument } from "@/lib/api";
import { controlClass } from "@/features/wizard-kit/WizardField";
import { cn } from "@/lib/utils";
import { LocalTestUploadButton } from "@/components/LocalTestUploadButton";

interface AuthorizedRepresentativeProps {
  data: NGOFormState;
  onChange: (patch: Partial<NGOFormState>) => void;
  onBack: () => void;
  onContinue: () => void;
}

/** Step 3 — Authorized Representative */
export function AuthorizedRepresentative({ data, onChange, onBack, onContinue }: AuthorizedRepresentativeProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const authLetterRef = useRef<HTMLInputElement>(null);
  const [draggingLetter, setDraggingLetter] = useState(false);
  const [uploadingLetter, setUploadingLetter] = useState(false);
  const [letterError, setLetterError] = useState<string | null>(null);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!data.representativeName.trim()) next.representativeName = "Full name is required.";
    if (!data.designation) next.designation = "Please select a designation.";
    if (!data.mobileNumber.trim()) next.mobileNumber = "Mobile number is required.";
    if (!data.officialEmail.trim()) next.officialEmail = "Official email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.officialEmail)) next.officialEmail = "Enter a valid email address.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleContinue() {
    if (validate()) onContinue();
  }

  function err(key: string) {
    return errors[key] ? (
      <p className="mt-1 text-3xs font-semibold text-red-600 dark:text-red-400">{errors[key]}</p>
    ) : null;
  }

  // The letter is a real upload like every other document: the backend only
  // attaches files it has an upload record for, so a name on its own is not a file.
  async function handleLetterFiles(files: FileList | null) {
    if (!files || files.length === 0 || uploadingLetter) return;
    const file = files[0];
    setUploadingLetter(true);
    setLetterError(null);
    try {
      const res = await uploadNgoDocument(file, "authorization-letter", "supporting");
      onChange({
        authorizationLetter: {
          name: file.name,
          documentId: res.documentId,
          s3Key: res.s3Key,
          s3Url: res.fileUrl ?? undefined,
          size: file.size,
          mimeType: file.type,
          demo: false,
        },
      });
    } catch (err) {
      setLetterError(err instanceof Error ? err.message : "Upload failed. Please check the file and try again.");
    } finally {
      setUploadingLetter(false);
    }
  }

  // Demo mode never reaches the backend, so a placeholder is enough there.
  function markLetterDemo() {
    onChange({ authorizationLetter: { name: "authorization-letter-demo.pdf", demo: true } });
  }

  const letter = data.authorizationLetter;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-2xs font-black uppercase tracking-widest text-ngo-700 dark:text-ngo-300">
          Step 3 of 6
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
          Authorized Representative
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          The person responsible for managing this CauseKind account.
        </p>
      </div>

      <div className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1">
          <label htmlFor="rep-name" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
            Full Name <span className="text-ngo-700 dark:text-ngo-300" aria-hidden>*</span>
          </label>
          <input
            id="rep-name"
            type="text"
            autoComplete="name"
            placeholder="e.g. Priya Sharma"
            value={data.representativeName}
            aria-invalid={!!errors.representativeName}
            onChange={(e) => { onChange({ representativeName: e.target.value }); if (errors.representativeName) setErrors((p) => ({ ...p, representativeName: "" })); }}
            className={cn(controlClass, errors.representativeName && "border-red-400")}
          />
          {err("representativeName")}
        </div>

        {/* Designation */}
        <div className="space-y-1">
          <label htmlFor="rep-designation" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
            Designation <span className="text-ngo-700 dark:text-ngo-300" aria-hidden>*</span>
          </label>
          <select
            id="rep-designation"
            value={data.designation}
            aria-invalid={!!errors.designation}
            onChange={(e) => { onChange({ designation: e.target.value }); if (errors.designation) setErrors((p) => ({ ...p, designation: "" })); }}
            className={cn(controlClass, "cursor-pointer", errors.designation && "border-red-400")}
          >
            <option value="">Select designation</option>
            {DESIGNATIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {err("designation")}
        </div>

        {/* Mobile Number */}
        <div className="space-y-1">
          <label htmlFor="rep-mobile" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
            Mobile Number <span className="text-ngo-700 dark:text-ngo-300" aria-hidden>*</span>
          </label>
          <input
            id="rep-mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            value={data.mobileNumber}
            aria-invalid={!!errors.mobileNumber}
            onChange={(e) => { onChange({ mobileNumber: e.target.value }); if (errors.mobileNumber) setErrors((p) => ({ ...p, mobileNumber: "" })); }}
            className={cn(controlClass, errors.mobileNumber && "border-red-400")}
          />
          {err("mobileNumber")}
        </div>

        {/* Official Email */}
        <div className="space-y-1">
          <label htmlFor="rep-email" className="block text-sm font-semibold text-stone-700 dark:text-stone-300">
            Official Email Address <span className="text-ngo-700 dark:text-ngo-300" aria-hidden>*</span>
          </label>
          <input
            id="rep-email"
            type="email"
            autoComplete="email"
            placeholder="priya@helpinghands.org"
            value={data.officialEmail}
            aria-invalid={!!errors.officialEmail}
            onChange={(e) => { onChange({ officialEmail: e.target.value }); if (errors.officialEmail) setErrors((p) => ({ ...p, officialEmail: "" })); }}
            className={cn(controlClass, errors.officialEmail && "border-red-400")}
          />
          {err("officialEmail")}
        </div>

        {/* Authorization Letter */}
        <div className="space-y-1.5">
          <div>
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
              Authorization Letter
            </p>
            <p className="text-3xs text-stone-400 dark:text-stone-500 mt-0.5">
              A letter on organization letterhead authorizing this person to manage the account
            </p>
          </div>

          {letter ? (
            <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/20 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
                  <Check className="h-4 w-4 text-green-600" strokeWidth={2.5} />
                </span>
                <div className="min-w-0">
                  <p className="text-2xs font-bold text-stone-800 dark:text-stone-200 truncate flex items-center gap-1">
                    <FileText className="h-3 w-3 shrink-0" aria-hidden />
                    {letter.demo ? "Demo upload" : letter.name}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => onChange({ authorizationLetter: null })} className="shrink-0 text-2xs font-bold text-stone-400 hover:text-red-500 transition-colors">Remove</button>
            </div>
          ) : (
            <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-50/60 dark:bg-zinc-900/40 overflow-hidden">
              <input
                ref={authLetterRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="sr-only"
                id="auth-letter-upload"
                disabled={uploadingLetter}
                onChange={(e) => handleLetterFiles(e.target.files)}
              />
              <LocalTestUploadButton onFile={(f) => handleLetterFiles([f] as any)} accept="pdf,image" />
              <div
                role="button"
                tabIndex={0}
                onDragOver={(e) => { e.preventDefault(); setDraggingLetter(true); }}
                onDragLeave={() => setDraggingLetter(false)}
                onDrop={(e) => { e.preventDefault(); setDraggingLetter(false); handleLetterFiles(e.dataTransfer.files); }}
                onClick={() => { if (!uploadingLetter) authLetterRef.current?.click(); }}
                onKeyDown={(e) => { if (!uploadingLetter && (e.key === "Enter" || e.key === " ")) authLetterRef.current?.click(); }}
                aria-label="Upload authorization letter"
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 py-5 cursor-pointer border-2 border-dashed m-3 rounded-lg transition-colors",
                  draggingLetter ? "border-ngo-700 bg-ngo-700/5" : "border-stone-200 dark:border-zinc-700 hover:border-ngo-700/50"
                )}
              >
                {uploadingLetter ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-ngo-700" aria-hidden />
                    <p className="text-2xs font-bold text-ngo-700">Uploading & scanning letter…</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-stone-400" aria-hidden />
                    <p className="text-2xs font-semibold text-stone-500 dark:text-stone-400">Upload Authorization Letter</p>
                    <p className="text-3xs text-stone-400">Must be on organization letterhead with seal</p>
                    <p className="text-3xs text-stone-400">PDF, JPG or PNG · Max 5 MB</p>
                  </>
                )}
              </div>
              {IS_NGO_DEMO_MODE && (
                <div className="border-t border-stone-100 dark:border-zinc-800 px-3.5 py-2 flex items-center justify-between">
                  <p className="text-3xs text-stone-400">Demo mode</p>
                  <button type="button" onClick={markLetterDemo} className="text-3xs font-bold text-ngo-700 dark:text-ngo-300 hover:underline underline-offset-2">Mark as uploaded ✓</button>
                </div>
              )}
              {letterError && (
                <div className="border-t border-red-100 dark:border-red-950/50 bg-red-50/70 dark:bg-red-950/20 px-3.5 py-2 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />
                  <p className="text-3xs text-red-700 dark:text-red-300 font-medium">{letterError}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-zinc-700 bg-transparent px-4 py-2.5 text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700/40">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </button>
        <button type="button" onClick={handleContinue} className="flex items-center gap-1.5 rounded-xl bg-ngo-700 hover:bg-ngo-600 active:bg-ngo-800 px-5 py-2.5 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700/40">
          Continue
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
