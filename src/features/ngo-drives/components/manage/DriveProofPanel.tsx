"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ImagePlus, Loader2, X } from "lucide-react";
import { formatIST } from "@/lib/formatIST";
import { uploadDistributionProof, type NgoDrive } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/features/ngo-drives/driveGiveState";

export const canUploadProof = (d: Pick<NgoDrive, "status" | "quantityReceived">) =>
  d.status === "COLLECTION_COMPLETE" || (d.status === "CLOSED" && d.quantityReceived > 0);

export const MAX_PROOF_PHOTOS = 10;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type ProofForm = {
  files: File[]; reached: string; distributedOn: string; location: string; quantity: string; note: string; consent: boolean;
};

/** The earliest allowed distribution date: the day collection completed (no "today" limit). */
export function minDistributionDate(d: Pick<NgoDrive, "collectionCompletedAt">): string | undefined {
  return d.collectionCompletedAt ? d.collectionCompletedAt.slice(0, 10) : undefined;
}

/** Every required field, checked live; the same rules the server enforces. */
export function validateProof(f: ProofForm, drive: Pick<NgoDrive, "quantityReceived" | "collectionCompletedAt">): Partial<Record<keyof ProofForm, string>> {
  const e: Partial<Record<keyof ProofForm, string>> = {};
  const max = Math.max(1, drive.quantityReceived ?? 0);
  if (f.files.length < 1) e.files = "Add at least 1 photo.";
  else if (f.files.length > MAX_PROOF_PHOTOS) e.files = `Up to ${MAX_PROOF_PHOTOS} photos.`;
  const reached = Number(f.reached);
  if (!f.reached.trim() || !Number.isInteger(reached) || reached < 1) e.reached = "Enter how many people you reached (at least 1).";
  const qty = Number(f.quantity);
  if (!f.quantity.trim() || !Number.isInteger(qty) || qty < 1 || qty > max) e.quantity = `Enter a quantity between 1 and ${max}.`;
  const min = minDistributionDate(drive);
  if (!f.distributedOn) e.distributedOn = "Pick the date of distribution.";
  else if (min && f.distributedOn < min) e.distributedOn = `Pick a date on or after ${min} (when collection completed).`;
  if (!f.location.trim()) e.location = "Add where the items were distributed.";
  if (!f.note.trim()) e.note = "Add a short note about the distribution.";
  if (!f.consent) e.consent = "Confirm faces are blurred or people gave consent.";
  return e;
}

const input = "mt-1.5 block w-full rounded-xl border bg-white p-2.5 text-sm font-normal text-stone-900 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ngo-600/30 dark:bg-zinc-950 dark:text-stone-100";
const ok = "border-stone-200 focus:border-ngo-600 dark:border-zinc-700";
const bad = "border-red-300 focus:border-red-500 dark:border-red-800";

function Field({ label, error, touched, children }: { label: string; error?: string; touched: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-stone-800 dark:text-stone-200">
      {label} <span className="text-red-600" aria-hidden>*</span>
      {children}
      {touched && error && <span role="alert" className="mt-1 block text-xs font-medium text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 text-3xs font-black uppercase tracking-[0.2em] text-ngo-700 dark:text-ngo-300">{title}</legend>
      {children}
    </fieldset>
  );
}

/** Distribution proof: the upload card while it is due, otherwise where it stands. */
export function DriveProofPanel({ drive, onSubmitted }: { drive: NgoDrive; onSubmitted: () => void | Promise<void> }) {
  const [form, setForm] = useState<ProofForm>(() => ({
    files: [], reached: String(drive.beneficiaryCount ?? ""), distributedOn: "", location: "",
    quantity: String(drive.quantityReceived ?? ""), note: "", consent: false,
  }));
  const [touched, setTouched] = useState<Partial<Record<keyof ProofForm, boolean>>>({});
  const [typeError, setTypeError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => form.files.map((f) => (typeof URL !== "undefined" && URL.createObjectURL ? URL.createObjectURL(f) : "")), [form.files]);
  useEffect(() => () => previews.forEach((u) => u && URL.revokeObjectURL?.(u)), [previews]);

  if (drive.status === "PROOF_SUBMITTED" || done) {
    return (
      <p data-testid="proof-submitted" className="flex items-center gap-2 rounded-2xl bg-sky-50 p-4 text-sm font-semibold text-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
        <CheckCircle2 className="h-4 w-4" aria-hidden /> Proof submitted{drive.beneficiariesReached ? ` (${drive.beneficiariesReached} people reached)` : ""}. Our team is reviewing it.
      </p>
    );
  }
  if (drive.status === "FULFILLED") {
    return (
      <p className="rounded-2xl bg-ngo-50 p-4 text-sm font-semibold text-ngo-900 dark:bg-ngo-950/30 dark:text-ngo-100">
        Proof approved. <Link href={`/drives/${drive.id}/proof`} className="underline">See the public impact report</Link>
      </p>
    );
  }
  if (!canUploadProof(drive)) return <p className="text-sm text-stone-500 dark:text-stone-400">You can upload distribution proof once collection is complete.</p>;

  const errors = validateProof(form, drive);
  const valid = Object.keys(errors).length === 0;
  const set = <K extends keyof ProofForm>(k: K, v: ProofForm[K]) => { setForm((f) => ({ ...f, [k]: v })); setTouched((t) => ({ ...t, [k]: true })); };

  function addFiles(list: FileList | File[] | null) {
    const incoming = Array.from(list ?? []);
    const wrong = incoming.filter((f) => !IMAGE_TYPES.includes(f.type));
    setTypeError(wrong.length ? `${wrong.map((f) => f.name).join(", ")}: only JPG or PNG photos.` : null);
    const images = incoming.filter((f) => IMAGE_TYPES.includes(f.type));
    setForm((f) => ({ ...f, files: [...f.files, ...images] }));
    setTouched((t) => ({ ...t, files: true }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ files: true, reached: true, distributedOn: true, location: true, quantity: true, note: true, consent: true });
    if (!valid || saving) return;
    setSaving(true);
    try {
      await uploadDistributionProof(drive.id, form.files, Number(form.reached), {
        distributedOn: form.distributedOn, location: form.location.trim(), quantityDistributed: Number(form.quantity),
        note: form.note.trim(), consentConfirmed: true,
      });
      setDone(true);
      toast.success("Proof submitted. It goes to our team for review.");
      await onSubmitted();
    } catch (err) { toast.error(errorMessage(err, "We couldn't upload your proof.")); }
    finally { setSaving(false); }
  }

  const missing = Object.values(errors).length;

  return (
    <form data-testid="proof-form" onSubmit={submit} noValidate className="relative space-y-6">
      {drive.adminReason && (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <strong>Proof needs another look:</strong> {drive.adminReason}
        </p>
      )}
      {drive.proofDueAt && <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Due by {formatIST(drive.proofDueAt)}</p>}

      <Group title="Photos">
        <div className="flex items-center justify-between text-sm font-semibold text-stone-800 dark:text-stone-200">
          <span>Distribution photos <span className="text-red-600" aria-hidden>*</span></span>
          <span data-testid="proof-photo-count" className={form.files.length > MAX_PROOF_PHOTOS ? "text-red-600" : "text-stone-500"}>{form.files.length}/{MAX_PROOF_PHOTOS}</span>
        </div>
        <button type="button" data-testid="proof-dropzone" onClick={() => fileInput.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${dragging ? "border-ngo-600 bg-ngo-50 dark:bg-ngo-950/30" : "border-ngo-300 bg-ngo-50/40 hover:bg-ngo-50 dark:border-ngo-800 dark:bg-ngo-950/10"}`}>
          <ImagePlus className="h-6 w-6 text-ngo-700 dark:text-ngo-300" aria-hidden />
          <span className="text-sm font-bold text-ngo-800 dark:text-ngo-200">Add photos</span>
          <span className="text-xs text-stone-500 dark:text-stone-400">JPG/PNG, up to {MAX_PROOF_PHOTOS}. Click or drag here.</span>
        </button>
        <input ref={fileInput} type="file" name="proofFiles" accept="image/jpeg,image/png,image/webp" multiple hidden data-testid="proof-file-input"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        {(typeError || (touched.files && errors.files)) && <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">{typeError ?? errors.files}</p>}
        {form.files.length > 0 && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-label="Selected photos">
            {form.files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-100 dark:border-zinc-800 dark:bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                {previews[i] && <img src={previews[i]} alt={f.name} className="h-full w-full object-cover" />}
                <button type="button" aria-label={`Remove ${f.name}`} onClick={() => set("files", form.files.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Group>

      <Group title="What happened">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="People reached" error={errors.reached} touched={!!touched.reached}>
            <input type="number" name="beneficiariesReached" min={1} value={form.reached} onChange={(e) => set("reached", e.target.value)} className={`${input} ${touched.reached && errors.reached ? bad : ok}`} />
          </Field>
          <Field label="Quantity distributed" error={errors.quantity} touched={!!touched.quantity}>
            <input type="number" name="quantityDistributed" min={1} max={Math.max(1, drive.quantityReceived ?? 0)} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} className={`${input} ${touched.quantity && errors.quantity ? bad : ok}`} />
          </Field>
          <Field label="Date of distribution" error={errors.distributedOn} touched={!!touched.distributedOn}>
            <input type="date" name="distributedOn" min={minDistributionDate(drive)} value={form.distributedOn} onChange={(e) => set("distributedOn", e.target.value)} className={`${input} ${touched.distributedOn && errors.distributedOn ? bad : ok}`} />
          </Field>
          <Field label="Location" error={errors.location} touched={!!touched.location}>
            <input type="text" name="location" maxLength={255} placeholder="e.g. Shivajinagar community hall" value={form.location} onChange={(e) => set("location", e.target.value)} className={`${input} ${touched.location && errors.location ? bad : ok}`} />
          </Field>
        </div>
      </Group>

      <Group title="Your note">
        <Field label="Short note" error={errors.note} touched={!!touched.note}>
          <textarea name="note" rows={3} maxLength={1000} placeholder="What happened on the day, who received the items" value={form.note} onChange={(e) => set("note", e.target.value)} className={`${input} ${touched.note && errors.note ? bad : ok}`} />
        </Field>
        <label className="flex items-start gap-2 text-sm text-stone-800 dark:text-stone-200">
          <input type="checkbox" name="consentConfirmed" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 h-4 w-4 accent-ngo-700" />
          <span>Faces are blurred, or the people in the photos gave their consent. <span className="text-red-600" aria-hidden>*</span></span>
        </label>
        {touched.consent && errors.consent && <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">{errors.consent}</p>}
      </Group>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-stone-100 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
        <p className="text-xs text-stone-500 dark:text-stone-400" data-testid="proof-submit-hint">
          {valid ? "Ready to send for review." : `${missing} ${missing === 1 ? "field needs" : "fields need"} your attention.`}
        </p>
        <Button type="submit" disabled={!valid || saving} className="rounded-xl bg-ngo-700 hover:bg-ngo-800">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit proof
        </Button>
      </div>
    </form>
  );
}
