"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2, Plus, Trash2 } from "lucide-react";
import {
  DESIGNATIONS,
  EMPTY_REPRESENTATIVE,
  IS_NGO_DEMO_MODE,
  MAX_REPRESENTATIVES,
  authorizationDocumentLabel,
  fieldText,
  getNgoStillNeededItems,
  isPersonalPan,
  isValidEmail,
  isValidMobile,
  isValidPan,
  normalizePan,
  type NGOFormState,
  type RepresentativeCard,
} from "@/features/ngo-registration/ngoRegistrationModel";
import { sendNgoRepresentativeEmailCode, verifyNgoRepresentativeEmailCode } from "@/lib/api";
import { controlClass } from "@/features/wizard-kit/WizardField";
import { cn } from "@/lib/utils";
import { DocUploadCard } from "@/features/ngo-registration/components/DocUploadCard";
import { IndianPhoneInput } from "@/features/ngo-registration/components/IndianPhoneInput";
import { NgoOtpInput } from "@/features/ngo-registration/components/NgoOtpInput";
import { CorrectionNote, type NgoCorrections } from "@/features/ngo-registration/components/CorrectionNote";
import { WizardSelect } from "@/features/ngo-registration/components/WizardSelect";
import { FilePreviewDialog, type PreviewFile } from "@/components/FilePreviewDialog";
import { getNgoFileLink } from "@/lib/api";
import { useMemo } from "react";

interface AuthorizedRepresentativeProps {
  data: NGOFormState;
  onChange: (patch: Partial<NGOFormState>) => void;
  onBack: () => void;
  onContinue: () => void;
  /** Items a reviewer asked to fix, with their notes (shown next to each). */
  corrections?: NgoCorrections;
}

/** Older applications flagged Representative 1 under these keys. */
const OLDER_KEYS: Record<string, string> = {
  fullName: "representativeName",
  designation: "designation",
  mobileNumber: "mobileNumber",
  email: "officialEmail",
};

/** Step 3 — Authorized Representatives */
export function AuthorizedRepresentative({ data, onChange, onBack, onContinue, corrections }: AuthorizedRepresentativeProps) {
  const reps = data.representatives?.length ? data.representatives : [EMPTY_REPRESENTATIVE];
  // Stable keys so each card keeps its own email-code state when another card is removed.
  const nextKey = useRef(reps.length);
  const [keys, setKeys] = useState<number[]>(() => reps.map((_, i) => i));
  useEffect(() => {
    if (keys.length !== reps.length) {
      setKeys(reps.map((_, i) => nextKey.current + i));
      nextKey.current += reps.length;
    }
  }, [reps.length, keys.length]);

  function updateCard(index: number, patch: Partial<RepresentativeCard>) {
    const next = reps.map((card, i) => (i === index ? { ...card, ...patch } : card));
    onChange({ representatives: next });
  }

  function addCard() {
    if (reps.length >= MAX_REPRESENTATIVES) return;
    setKeys((k) => [...k, nextKey.current++]);
    onChange({ representatives: [...reps, { ...EMPTY_REPRESENTATIVE }] });
  }

  function removeCard(index: number) {
    if (index === 0) return;
    setKeys((k) => k.filter((_, i) => i !== index));
    onChange({ representatives: reps.filter((_, i) => i !== index) });
  }

  const missing = getNgoStillNeededItems("authorized-rep", data);

  // Full-size preview dialog for all uploaded files in this step
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const previewFiles = useMemo(() => {
    const out: { id: string; file: PreviewFile }[] = [];
    if (data.authorizationLetter && !data.authorizationLetter.demo) {
      out.push({
        id: "auth",
        file: {
          name: `${authorizationDocumentLabel(data.legalStructure)}: ${data.authorizationLetter.name}`,
          mimeType: data.authorizationLetter.mimeType,
          resolve:
            data.authorizationLetter.documentId != null
              ? async () => (await getNgoFileLink("document", data.authorizationLetter!.documentId!)).url
              : undefined,
          url: data.authorizationLetter.documentId == null ? data.authorizationLetter.s3Url : undefined,
        },
      });
    }
    reps.forEach((r, i) => {
      if (r.idProof && !r.idProof.demo) {
        out.push({
          id: `rep-${i}`,
          file: {
            name: `${r.fullName || `Representative ${i + 1}`} ID proof: ${r.idProof.name}`,
            mimeType: r.idProof.mimeType,
            resolve:
              r.idProof.documentId != null
                ? async () => (await getNgoFileLink("document", r.idProof!.documentId!)).url
                : undefined,
            url: r.idProof.documentId == null ? r.idProof.s3Url : undefined,
          },
        });
      }
    });
    return out;
  }, [data.authorizationLetter, data.legalStructure, reps]);

  const openPreview = (id: string) => {
    const idx = previewFiles.findIndex((x) => x.id === id);
    if (idx >= 0) setPreviewIndex(idx);
  };

  return (
    <div className="space-y-6">
      <FilePreviewDialog
        files={previewFiles.map((x) => x.file)}
        index={previewIndex}
        onIndexChange={setPreviewIndex}
        onClose={() => setPreviewIndex(null)}
      />
      {/* Header */}
      <div className="space-y-1">
        <span className="text-2xs font-black uppercase tracking-widest text-ngo-700 dark:text-ngo-300">
          Step 3 of 6
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
          Authorized Representatives
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          The people your organization has authorized to manage this CauseKind account.
        </p>
      </div>

      {/* Section A: authorization document */}
      <section className="space-y-1.5" aria-label="Authorization document">
        <h3 className="text-2xs font-black uppercase tracking-widest text-stone-400">A. Authorization document</h3>
        <DocUploadCard
          key={`auth-${data.legalStructure}`}
          docId="authorization-letter"
          label={authorizationDocumentLabel(data.legalStructure)}
          hint="It should name the people below and what they may do for the organization."
          category="must-have"
          uploaded={data.authorizationLetter}
          onUpload={(file) => onChange({ authorizationLetter: file })}
          onRemove={() => onChange({ authorizationLetter: null })}
          onPreview={() => openPreview("auth")}
        />
        <CorrectionNote note={corrections?.authorizationLetter} field="authorizationLetter" />
      </section>

      {/* Section B: one card per person */}
      <section className="space-y-3" aria-label="Representatives">
        <h3 className="text-2xs font-black uppercase tracking-widest text-stone-400">B. Representatives</h3>
        {reps.map((card, index) => (
          <RepresentativeCardEditor
            key={keys[index] ?? index}
            index={index}
            card={card}
            corrections={corrections}
            onChange={(patch) => updateCard(index, patch)}
            onRemove={index > 0 ? () => removeCard(index) : undefined}
            onPreview={() => openPreview(`rep-${index}`)}
          />
        ))}
      </section>

      {/* Section C: add */}
      <div>
        <button
          type="button"
          onClick={addCard}
          disabled={reps.length >= MAX_REPRESENTATIVES}
          className="inline-flex items-center gap-1.5 rounded-xl border border-ngo-700/40 px-4 py-2 text-xs font-bold text-ngo-700 hover:bg-ngo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-ngo-300 dark:hover:bg-ngo-900/30"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add representative
        </button>
        <p className="mt-1 text-3xs text-stone-500 dark:text-stone-400">
          {reps.length >= MAX_REPRESENTATIVES
            ? `You can add up to ${MAX_REPRESENTATIVES} representatives.`
            : `Optional. Up to ${MAX_REPRESENTATIVES} representatives; Representative 1 is required.`}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex flex-col items-end gap-2 pt-2">
        <div className="flex w-full items-center justify-between gap-3">
          <button type="button" onClick={onBack} className="flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-zinc-700 bg-transparent px-4 py-2.5 text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700/40">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </button>
          <button type="button" onClick={onContinue} disabled={missing.length > 0} className="flex items-center gap-1.5 rounded-xl bg-ngo-700 disabled:bg-stone-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed hover:bg-ngo-600 active:bg-ngo-800 px-5 py-2.5 text-sm font-bold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ngo-700/40">
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {missing.length > 0 && (
          <p className="text-3xs text-stone-500 dark:text-stone-400 text-right pr-1">
            Still needed: {missing.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}

interface RepresentativeCardEditorProps {
  index: number;
  card: RepresentativeCard;
  corrections?: NgoCorrections;
  onChange: (patch: Partial<RepresentativeCard>) => void;
  onRemove?: () => void;
  onPreview?: () => void;
}

function RepresentativeCardEditor({ index, card, corrections, onChange, onRemove, onPreview }: RepresentativeCardEditorProps) {
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"send" | "verify" | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [panTouched, setPanTouched] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const prefix = `rep-${index}`;
  const pan = normalizePan(card.panNumber);

  function note(fieldName: string) {
    const key = `representatives.${index}.${fieldName}`;
    const older = index === 0 && OLDER_KEYS[fieldName] ? corrections?.[OLDER_KEYS[fieldName]] : undefined;
    return <CorrectionNote note={corrections?.[key] ?? older} field={corrections?.[key] ? key : OLDER_KEYS[fieldName]} />;
  }

  async function sendCode() {
    setCodeError(null);
    // TEMPORARY Demo Mode (development builds only): any 6 digits verify, nothing is sent.
    if (IS_NGO_DEMO_MODE) {
      setCodeSent(true);
      return;
    }
    setBusy("send");
    try {
      const res = await sendNgoRepresentativeEmailCode(fieldText(card.email), fieldText(card.fullName));
      if (res.verified) {
        onChange({ emailVerified: true });
        setCodeSent(false);
      } else {
        setCodeSent(true);
      }
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : "We couldn't send the code. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function verifyCode(value: string = code) {
    setBusy("verify");
    setCodeError(null);
    try {
      if (!IS_NGO_DEMO_MODE) await verifyNgoRepresentativeEmailCode(fieldText(card.email), value.trim());
      onChange({ emailVerified: true });
      setCodeSent(false);
      setCode("");
    } catch (err) {
      // Wrong code: show why, clear the boxes and put the cursor back in them.
      setCodeError(err instanceof Error ? err.message : "That code didn't work. Please try again.");
      setCode("");
      setTimeout(() => codeRef.current?.focus(), 0);
    } finally {
      setBusy(null);
    }
  }

  const labelClass = "block text-xs font-semibold text-stone-700 dark:text-stone-300";
  const required = <span className="text-ngo-700 dark:text-ngo-300" aria-hidden>*</span>;

  return (
    <div role="group" aria-label={`Representative ${index + 1}`}
      className="space-y-3 rounded-xl border border-[#EADBCE] bg-[#FAF7F2] p-4 dark:border-emerald-950/80 dark:bg-[#141E18]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-stone-800 dark:text-stone-200">
          Representative {index + 1}
          <span className="ml-2 text-3xs font-black uppercase tracking-wide text-stone-400">
            {index === 0 ? "Required" : "Optional"}
          </span>
        </p>
        {onRemove && (
          <button type="button" onClick={onRemove} aria-label={`Remove representative ${index + 1}`}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 text-2xs font-bold text-stone-400 hover:text-red-600 transition-colors">
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor={`${prefix}-name`} className={labelClass}>Full name {required}</label>
          <input id={`${prefix}-name`} name={`${prefix}-name`} type="text" autoComplete="off" value={card.fullName}
            onChange={(e) => onChange({ fullName: e.target.value })} className={cn(controlClass, "min-h-[44px]")} />
          {note("fullName")}
        </div>
        <div className="space-y-1">
          <label htmlFor={`${prefix}-designation`} className={labelClass}>Designation / role {required}</label>
          <WizardSelect
            id={`${prefix}-designation`}
            value={card.designation}
            onChange={(val) => onChange({ designation: val })}
            options={DESIGNATIONS}
            aria-label="Designation / role"
          />
          {note("designation")}
        </div>
        <div className="space-y-1">
          <label htmlFor={`${prefix}-mobile`} className={labelClass}>Mobile number {required}</label>
          <IndianPhoneInput
            id={`${prefix}-mobile`}
            name={`${prefix}-mobile`}
            value={card.mobileNumber}
            hasError={!!fieldText(card.mobileNumber) && !isValidMobile(card.mobileNumber)}
            aria-invalid={!!fieldText(card.mobileNumber) && !isValidMobile(card.mobileNumber)}
            onChange={(formattedVal) => onChange({ mobileNumber: formattedVal })}
          />
          {fieldText(card.mobileNumber) && !isValidMobile(card.mobileNumber) && (
            <p className="text-3xs font-semibold text-red-600 dark:text-red-400">Enter a 10-digit mobile number.</p>
          )}
          {note("mobileNumber")}
        </div>
        <div className="space-y-1">
          <label htmlFor={`${prefix}-pan`} className={labelClass}>PAN number {required}</label>
          <input
            id={`${prefix}-pan`}
            name={`${prefix}-pan`}
            type="text"
            autoComplete="off"
            maxLength={10}
            value={card.panNumber}
            onBlur={() => setPanTouched(true)}
            aria-invalid={!!((panTouched && !pan) || (pan.length > 0 && !isValidPan(pan)))}
            onChange={(e) => {
              onChange({ panNumber: e.target.value.toUpperCase() });
              if (panTouched) setPanTouched(false);
            }}
            className={cn(controlClass, "min-h-[44px] font-mono uppercase", ((panTouched && !pan) || (pan.length > 0 && !isValidPan(pan))) && "border-red-400")}
          />
          {panTouched && !pan && (
            <p className="text-3xs font-semibold text-red-600 dark:text-red-400">PAN number is required.</p>
          )}
          {pan.length > 0 && !isValidPan(pan) && (
            <p className="text-3xs font-semibold text-red-600 dark:text-red-400">A PAN is 5 letters, 4 digits and 1 letter.</p>
          )}
          {isValidPan(pan) && !isPersonalPan(pan) && (
            <p className="flex items-start gap-1 text-3xs font-semibold text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              This is not a personal PAN (its 4th letter is not P). Please use this person&apos;s own PAN.
            </p>
          )}
          {note("panNumber")}
        </div>
      </div>

      {/* Email with code */}
      <div className="space-y-1">
        <label htmlFor={`${prefix}-email`} className={labelClass}>Email {required}</label>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <input id={`${prefix}-email`} name={`${prefix}-email`} type="email" autoComplete="off" value={card.email}
            onChange={(e) => {
              onChange({ email: e.target.value, emailVerified: false });
              setCodeSent(false);
              setCode("");
              setCodeError(null);
            }}
            className={cn(controlClass, "min-w-0 flex-1 min-h-[44px]")} />
          {card.emailVerified ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 py-1 sm:py-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden />
              Verified
            </span>
          ) : (
            <button type="button" onClick={sendCode} disabled={!isValidEmail(card.email) || busy !== null}
              className="w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center rounded-lg border border-ngo-700/50 px-4 py-2 text-xs font-bold text-ngo-700 hover:bg-ngo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-ngo-300">
              {busy === "send" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label="Sending" /> : codeSent ? "Resend code" : "Send code"}
            </button>
          )}
        </div>
        {!card.emailVerified && codeSent && (
          <div className="space-y-1.5 pt-1">
            <p className="text-3xs font-semibold text-stone-600 dark:text-stone-300">
              Enter the 6-digit code we sent to {fieldText(card.email)}
            </p>
            <NgoOtpInput ref={codeRef} id={`${prefix}-code`} aria-label={`6-digit code for representative ${index + 1}`}
              value={code} disabled={busy === "verify"}
              onChange={(v) => { setCode(v); if (codeError) setCodeError(null); }}
              onComplete={(v) => void verifyCode(v)} />
            {busy === "verify" && <p className="flex items-center gap-1 text-3xs text-stone-500"><Loader2 className="h-3 w-3 animate-spin" /> Checking…</p>}
          </div>
        )}
        {codeError && <p role="alert" className="text-3xs font-semibold text-red-600 dark:text-red-400">{codeError}</p>}
        {note("email")}
      </div>

      {/* ID proof */}
      <div className="space-y-1">
        <DocUploadCard
          docId="rep-id-proof"
          inputId={`${prefix}-id-proof`}
          label={`ID proof of Representative ${index + 1}`}
          hint="PAN card preferred; another government ID is accepted"
          category="must-have"
          uploaded={card.idProof}
          onUpload={(file) => onChange({ idProof: file })}
          onRemove={() => onChange({ idProof: null })}
          onPreview={onPreview}
        />
        {note("idProof")}
      </div>
    </div>
  );
}
