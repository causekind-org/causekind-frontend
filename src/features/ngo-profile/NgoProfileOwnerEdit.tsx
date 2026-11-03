"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LimitCounter, overLimit, overLimitBorder, TEXT_LIMITS } from "@/components/TextLimit";
import { Loader2, Pencil, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import {
  getMyNgoProfileManage, removeNgoProfilePhoto, uploadNgoDocument, requestNgoProfileChange, updateNgoProfileCosmetic, uploadNgoProfilePhoto,
  type NgoProfileManage, type NgoProfileVerifiedField,
} from "@/lib/api";
import { UploadedFilePreview } from "@/features/ngo-registration/components/UploadedFilePreview";
import { OtherSpecifyField } from "@/features/ngo-registration/components/OtherSpecifyField";
import { DESIGNATIONS, isOtherChoice, otherTextError, mobileError } from "@/features/ngo-registration/ngoRegistrationModel";
import { compressImageIfNeeded } from "@/lib/imageCompression";
import { FilePreviewDialog } from "@/components/FilePreviewDialog";
import { toast } from "@/lib/toast";

/**
 * The NGO's own view of its public page: whether the viewer owns this page (the server decides:
 * the NGO's own profile has this slug), and its editable data. Donors and other NGOs get null.
 */
export function useNgoPageOwner(slug: string) {
  const { user } = useAuth();
  const [manage, setManage] = useState<NgoProfileManage | null>(null);
  const isNgo = (user?.role ?? "").toUpperCase() === "NGO_PARTNER";
  useEffect(() => {
    if (!isNgo) { setManage(null); return; }
    let live = true;
    getMyNgoProfileManage().then((m) => { if (live) setManage(m.slug === slug ? m : null); }).catch(() => { if (live) setManage(null); });
    return () => { live = false; };
  }, [isNgo, slug]);
  return { manage, setManage };
}

export function OwnerEditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={`Edit ${label}`} data-testid="owner-edit"
      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-emerald-700/30 bg-white px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50 dark:bg-zinc-900 dark:text-emerald-300">
      <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
    </button>
  );
}

/** "Pending review" while a change waits; the reason when the latest one was not approved. */
export function ChangeStatusNote({ manage, fields }: { manage: NgoProfileManage | null; fields: NgoProfileVerifiedField[] }) {
  if (!manage) return null;
  const latest = fields.map((f) => manage.requests.find((r) => r.field === f)).filter(Boolean);
  const pending = latest.filter((r) => r!.status === "PENDING");
  const rejected = latest.filter((r) => r!.status === "REJECTED");
  if (pending.length === 0 && rejected.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {pending.length > 0 && <p data-testid="change-pending" className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-2xs font-bold text-amber-800">Pending review</p>}
      {rejected.map((r) => (
        <p key={r!.id} data-testid="change-rejected" className="text-xs font-semibold text-red-600 dark:text-red-400">
          Change not approved{r!.adminReason ? `: ${r!.adminReason}` : ""}
        </p>
      ))}
    </div>
  );
}

export type OwnerEditKind = "photos" | "about" | "details" | "representatives";

const input = "w-full min-h-[44px] rounded-lg border border-stone-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

/**
 * One card's editor. Cosmetic cards (photos, about, contact, links) save at once; identity
 * fields and representatives send a change request an admin reviews.
 */
export function OwnerEditDialog({ kind, manage, onSaved, onClose }: {
  kind: OwnerEditKind | null; manage: NgoProfileManage;
  /** {@code publicChanged}: false for a verified-field request (donors keep seeing the current value). */
  onSaved: (m: NgoProfileManage, publicChanged: boolean) => void; onClose: () => void;
}) {
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [about, setAbout] = useState(manage.aboutUs ?? "");
  const [phone, setPhone] = useState(manage.organizationPhone ?? "");
  const [officialEmail, setOfficialEmail] = useState(manage.officialEmail ?? "");
  // existing: a person already on the page (name/role edits only, unless "replace"); new or replaced people need every detail.
  type RepRow = { fullName: string; designation: string; existing: boolean; replace: boolean; mobileNumber: string; email: string; panNumber: string; idProof: { documentId: number; name: string } | null };
  const blankRep = (existing: boolean): Omit<RepRow, "fullName" | "designation"> => ({ existing, replace: false, mobileNumber: "", email: "", panNumber: "", idProof: null });
  const [reps, setReps] = useState<RepRow[]>(manage.representatives.length
    ? manage.representatives.map((r) => ({ fullName: r.fullName, designation: r.designation ?? "", ...blankRep(true) }))
    : [{ fullName: "", designation: "", ...blankRep(false) }]);
  const [uploadingRep, setUploadingRep] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<number | null>(null);
  // The photos card stages everything; "Save changes" commits it.
  type PhotoType = "cover" | "logo" | "office_photo";
  type StagedPhoto = { key: number; type: PhotoType; file: File; url: string };
  const [staged, setStaged] = useState<StagedPhoto[]>([]);
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const stagedKey = useRef(0);
  const dirty = staged.length > 0 || removedIds.length > 0;
  const resetStaged = () => { staged.forEach((p) => URL.revokeObjectURL(p.url)); setStaged([]); setRemovedIds([]); setConfirmDiscard(false); };
  const requestClose = () => { if (kind === "photos" && dirty) setConfirmDiscard(true); else onClose(); };
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadType = useRef<"cover" | "logo" | "office_photo">("office_photo");

  useEffect(() => { setError(""); setNote(""); }, [kind]);

  const run = useCallback(async (job: () => Promise<NgoProfileManage | void>, done: string, publicChanged = true) => {
    setBusy(true); setError(""); setNote("");
    try {
      const m = await job();
      if (m) onSaved(m, publicChanged);
      setNote(done);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "We couldn't save that. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [onSaved]);

  async function saveCosmetic() {
    if (kind === "about") {
      const t = about.trim();
      if (t.length < 100 || t.length > 2000) return setError("Write 100 to 2000 characters about your NGO.");
      return run(() => updateNgoProfileCosmetic({ aboutUs: t }), "Saved. It now shows on your page.");
    }
  }

  // One Save for the card: the phone saves at once; a new official email goes to review.
  async function saveDetails() {
    const nextPhone = phone.trim();
    const nextEmail = officialEmail.trim();
    const phoneChanged = nextPhone !== (manage.organizationPhone ?? "");
    const emailChanged = nextEmail !== (manage.officialEmail ?? "");
    if (!phoneChanged && !emailChanged) return setNote("Nothing to save.");
    if (phoneChanged) { const err = mobileError(nextPhone); if (err) return setError(err); }
    if (emailChanged && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) return setError("Enter a valid email address.");
    await run(async () => {
      let m: NgoProfileManage | undefined;
      if (phoneChanged) m = await updateNgoProfileCosmetic({ organizationPhone: nextPhone });
      if (emailChanged) {
        await requestNgoProfileChange("officialEmail", nextEmail);
        m = await getMyNgoProfileManage();
      }
      return m;
    }, emailChanged ? "Saved. The new email goes live after our team reviews it." : "Saved. It now shows on your page.", phoneChanged);
  }

  const needsDetails = (r: RepRow) => !r.existing || r.replace;

  async function sendRepresentatives() {
    for (const [i, r] of reps.entries()) {
      const who = `Representative ${i + 1}`;
      if (r.fullName.trim().length < 2) return setError(`${who}: enter the full name.`);
      if (!r.designation.trim() || (isOtherChoice(r.designation, DESIGNATIONS) && otherTextError(r.designation))) return setError(`${who}: choose or specify the role (2–60 letters).`);
      if (!needsDetails(r)) continue;
      const m = mobileError(r.mobileNumber); if (m) return setError(`${who}: ${m}`);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())) return setError(`${who}: enter a valid email address.`);
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(r.panNumber.trim().toUpperCase())) return setError(`${who}: enter the 10-character PAN.`);
      if (!r.idProof) return setError(`${who}: upload the ID proof.`);
    }
    await run(async () => {
      await requestNgoProfileChange("representatives", JSON.stringify(reps.map((r) => needsDetails(r)
        ? { fullName: r.fullName.trim(), designation: r.designation.trim(), mobileNumber: r.mobileNumber.trim(), email: r.email.trim(),
            panNumber: r.panNumber.trim().toUpperCase(), idProofDocumentId: r.idProof!.documentId }
        : { fullName: r.fullName.trim(), designation: r.designation.trim() })), reason.trim() || undefined);
      return getMyNgoProfileManage();
    }, "Sent for review. Your page keeps the current list until it's approved.", false);
  }

  async function uploadIdProof(i: number, file: File | undefined) {
    if (!file) return;
    setUploadingRep(i); setError("");
    try {
      const res = await uploadNgoDocument(file, "rep-id-proof", "must-have");
      setReps((p) => p.map((x, j) => (j === i ? { ...x, idProof: { documentId: res.documentId!, name: file.name } } : x)));
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "We couldn't upload the ID proof.");
    } finally {
      setUploadingRep(null);
    }
  }

  function stage(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError(`${file.name} is larger than 5 MB.`);
    setError(""); setNote("");
    const type = uploadType.current;
    const replaces = replaceId.current;
    replaceId.current = null;
    if (replaces != null) setRemovedIds((p) => [...p, replaces]);
    const entry = { key: ++stagedKey.current, type, file, url: URL.createObjectURL(file) };
    // One cover and one logo: a new one replaces a staged one.
    setStaged((p) => [...p.filter((x) => type === "office_photo" || x.type !== type), entry]);
  }

  async function savePhotos() {
    setBusy(true); setError("");
    try {
      let m: NgoProfileManage = manage;
      for (const id of removedIds) m = await removeNgoProfilePhoto(id);
      for (const p of staged) m = await uploadNgoProfilePhoto(p.type, await compressImageIfNeeded(p.file));
      onSaved(m, true);
      resetStaged();
      toast.success("Photos saved.");
      onClose();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "We couldn't save the photos. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const replaceId = useRef<number | null>(null);
  const pick = (t: PhotoType, replaces: number | null = null) => { uploadType.current = t; replaceId.current = replaces; fileInput.current?.click(); };
  const byType = (t: string) => manage.photos.filter((p) => p.type === t && !removedIds.includes(p.id));
  const titled: Record<OwnerEditKind, string> = {
    photos: "Cover, logo and photos", about: "About us", details: "Organization details", representatives: "Representatives / trustees",
  };
  const verified = kind === "representatives";
  const previewFiles = manage.photos.map((p) => ({ name: p.type.replace("_", " ").toLowerCase(), url: p.url, mimeType: "image/jpeg" }));

  return (
    <Dialog open={kind != null} onOpenChange={(o) => { if (!o) requestClose(); }}>
      <DialogContent data-ck-role-theme="ngo" className="block max-h-[90vh] max-w-lg overflow-y-auto p-6">
        {kind && <DialogTitle className="text-lg font-bold text-stone-900 dark:text-stone-100">Edit {titled[kind].toLowerCase()}</DialogTitle>}
        <DialogDescription className="mt-1 text-xs text-stone-500">
          {verified ? "Verified details change only after our team reviews them. Until then donors see the current value."
            : kind === "photos" ? "Nothing changes on your page until you save."
            : kind === "details" ? "The phone saves right away; a new official email goes to our team for review."
            : "Changes show on your page right away."}
        </DialogDescription>

        <div className="mt-4 space-y-3">
          {kind === "photos" && (
            <>
              {(["COVER", "LOGO"] as const).map((t) => {
                const p = byType(t)[0];
                const label = t === "COVER" ? "Cover photo" : "Logo";
                const type = t === "COVER" ? "cover" : "logo";
                const fresh = staged.find((x) => x.type === type);
                return fresh ? (
                  <UploadedFilePreview key={t} file={{ name: fresh.file.name, mimeType: fresh.file.type, size: fresh.file.size }} kind="photo" label={label}
                    localBlobUrl={fresh.url} onPreview={() => {}} onReplace={() => pick(type)}
                    onRemove={() => setStaged((x) => x.filter((y) => y.key !== fresh.key))} disabled={busy} />
                ) : p ? (
                  <UploadedFilePreview key={t} file={{ name: label, photoId: p.id, s3Url: p.url, mimeType: "image/jpeg" }} kind="photo" label={label}
                    localBlobUrl={p.url} onPreview={() => setPreview(manage.photos.indexOf(p))}
                    onReplace={() => pick(type)} onRemove={() => setRemovedIds((x) => [...x, p.id])} disabled={busy} />
                ) : (
                  <button key={t} type="button" onClick={() => pick(type)} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-300 text-xs font-semibold">
                    <Plus className="h-4 w-4" aria-hidden /> Add {label.toLowerCase()}
                  </button>
                );
              })}
              <p className="pt-2 text-xs font-bold text-stone-700 dark:text-stone-200">Organisation photos</p>
              {byType("OFFICE_PHOTO").map((p, i) => (
                <UploadedFilePreview key={p.id} file={{ name: `Photo ${i + 1}`, photoId: p.id, s3Url: p.url, mimeType: "image/jpeg" }} kind="photo"
                  label={`Organisation photo ${i + 1}`} localBlobUrl={p.url} onPreview={() => setPreview(manage.photos.indexOf(p))}
                  onReplace={() => pick("office_photo", p.id)} onRemove={() => setRemovedIds((x) => [...x, p.id])} disabled={busy} />
              ))}
              {staged.filter((x) => x.type === "office_photo").map((x) => (
                <UploadedFilePreview key={x.key} file={{ name: x.file.name, mimeType: x.file.type, size: x.file.size }} kind="photo" label="New organisation photo"
                  localBlobUrl={x.url} onPreview={() => {}} onReplace={() => { setStaged((p) => p.filter((y) => y.key !== x.key)); pick("office_photo"); }}
                  onRemove={() => setStaged((p) => p.filter((y) => y.key !== x.key))} disabled={busy} />
              ))}
              <button type="button" onClick={() => pick("office_photo")} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-300 text-xs font-semibold">
                <Plus className="h-4 w-4" aria-hidden /> Add organisation photo
              </button>
              <input ref={fileInput} type="file" accept="image/jpeg, image/png, image/webp" className="hidden" data-testid="owner-photo-input"
                onChange={(e) => { stage(e.target.files?.[0]); e.target.value = ""; }} />
            </>
          )}

          {kind === "about" && (
            <div className="space-y-1">
              <label htmlFor="owner-about" className="text-xs font-bold">About us</label>
              <textarea id="owner-about" rows={7} value={about} onChange={(e) => setAbout(e.target.value)} aria-invalid={overLimit(about, TEXT_LIMITS.aboutUs)}
                className={`${input} py-2 ${overLimit(about, TEXT_LIMITS.aboutUs) ? overLimitBorder : ""}`} />
              <LimitCounter id="owner-about-count" value={about} max={TEXT_LIMITS.aboutUs} />
              <p className="text-right text-3xs text-stone-500">{about.trim().length}/2000 (at least 100)</p>
            </div>
          )}

          {kind === "details" && (() => {
            const emailPending = manage.requests.some((r) => r.field === "officialEmail" && r.status === "PENDING");
            return (
              <>
                <dl data-testid="details-readonly" className="grid gap-2 rounded-lg bg-stone-50 p-3 text-sm dark:bg-zinc-800/60">
                  {[["Legal name", manage.organizationName], ["PAN", manage.panNumber], ["Registration number", manage.registrationNumber]].map(([label, value]) => (
                    <div key={label}><dt className="text-3xs font-bold uppercase text-stone-500">{label}</dt><dd className="font-semibold">{value || "—"}</dd></div>
                  ))}
                </dl>
                <div className="space-y-1">
                  <label htmlFor="owner-phone" className="text-xs font-bold">Organization phone (+91)</label>
                  <input id="owner-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="owner-officialEmail" className="text-xs font-bold">Official email <span className="font-normal text-stone-400">(changes after review)</span></label>
                  <input id="owner-officialEmail" type="email" value={officialEmail} disabled={emailPending} onChange={(e) => setOfficialEmail(e.target.value)} className={input} />
                  <ChangeStatusNote manage={manage} fields={["officialEmail"]} />
                </div>
              </>
            );
          })()}

          {kind === "representatives" && (
            <>
              {reps.map((r, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-stone-200 p-3 dark:border-zinc-700">
                  <input aria-label={`Representative ${i + 1} name`} value={r.fullName} placeholder="Full name"
                    onChange={(e) => setReps((p) => p.map((x, j) => (j === i ? { ...x, fullName: e.target.value } : x)))} className={input} />
                  <select aria-label={`Representative ${i + 1} role`} className={input}
                    value={isOtherChoice(r.designation, DESIGNATIONS) ? "Other" : r.designation}
                    onChange={(e) => setReps((p) => p.map((x, j) => (j === i ? { ...x, designation: e.target.value } : x)))}>
                    <option value="">Role</option>
                    {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {isOtherChoice(r.designation, DESIGNATIONS) && (
                    <OtherSpecifyField id={`owner-rep-${i}-other`} value={r.designation}
                      onChange={(t) => setReps((p) => p.map((x, j) => (j === i ? { ...x, designation: t || "Other" } : x)))} />
                  )}
                  {r.existing && (
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={r.replace} onChange={(e) => setReps((p) => p.map((x, j) => (j === i ? { ...x, replace: e.target.checked } : x)))} />
                      Replace this person (enter the new person&apos;s details)
                    </label>
                  )}
                  {needsDetails(r) && (
                    <div data-testid="rep-details" className="space-y-2">
                      <input aria-label={`Representative ${i + 1} mobile`} placeholder="Mobile (+91)" inputMode="tel" value={r.mobileNumber}
                        onChange={(e) => setReps((p) => p.map((x, j) => (j === i ? { ...x, mobileNumber: e.target.value } : x)))} className={input} />
                      <input aria-label={`Representative ${i + 1} email`} placeholder="Email" type="email" value={r.email}
                        onChange={(e) => setReps((p) => p.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))} className={input} />
                      <input aria-label={`Representative ${i + 1} PAN`} placeholder="PAN" maxLength={10} value={r.panNumber}
                        onChange={(e) => setReps((p) => p.map((x, j) => (j === i ? { ...x, panNumber: e.target.value.toUpperCase() } : x)))} className={input} />
                      {r.idProof ? (
                        <UploadedFilePreview file={{ name: r.idProof.name, documentId: r.idProof.documentId }} kind="document" label={`Representative ${i + 1} ID proof`}
                          onPreview={() => {}} onReplace={() => document.getElementById(`owner-rep-${i}-idproof`)?.click()}
                          onRemove={() => setReps((p) => p.map((x, j) => (j === i ? { ...x, idProof: null } : x)))} disabled={uploadingRep === i} />
                      ) : (
                        <button type="button" onClick={() => document.getElementById(`owner-rep-${i}-idproof`)?.click()} disabled={uploadingRep === i}
                          className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-300 text-xs font-semibold">
                          {uploadingRep === i ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />} Upload ID proof
                        </button>
                      )}
                      <input id={`owner-rep-${i}-idproof`} data-testid={`rep-${i}-idproof-input`} type="file" accept="application/pdf, image/jpeg, image/png" className="hidden"
                        onChange={(e) => { void uploadIdProof(i, e.target.files?.[0]); e.target.value = ""; }} />
                    </div>
                  )}
                  {reps.length > 1 && (
                    <button type="button" onClick={() => setReps((p) => p.filter((_, j) => j !== i))} className="text-xs font-semibold text-red-600">Remove</button>
                  )}
                </div>
              ))}
              {reps.length < 5 && (
                <button type="button" onClick={() => setReps((p) => [...p, { fullName: "", designation: "", ...blankRep(false) }])} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
                  <Plus className="h-3.5 w-3.5" aria-hidden /> Add person
                </button>
              )}
            </>
          )}

          {verified && (
            <div className="space-y-1">
              <label htmlFor="owner-reason" className="text-xs font-bold">Reason <span className="font-normal text-stone-400">(optional)</span></label>
              <input id="owner-reason" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className={input} />
            </div>
          )}
        </div>

        {error && <p role="alert" className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
        {note && <p role="status" className="mt-3 text-xs font-semibold text-emerald-700 ck-user-text">{note}</p>}
        {confirmDiscard && (
          <div role="alertdialog" aria-label="Discard changes?" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
            Discard changes?
            <span className="flex gap-2">
              <button type="button" onClick={() => setConfirmDiscard(false)} className="min-h-[36px] rounded-lg border border-stone-300 bg-white px-3">Keep editing</button>
              <button type="button" onClick={() => { resetStaged(); onClose(); }} className="min-h-[36px] rounded-lg bg-red-600 px-3 text-white">Discard</button>
            </span>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={requestClose} className="min-h-[40px] rounded-lg border border-stone-300 px-4 text-xs font-semibold">Close</button>
          {kind === "photos" && (
            <button type="button" disabled={busy || !dirty} onClick={() => void savePhotos()} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-700 px-4 text-xs font-bold text-white disabled:opacity-60">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />} Save changes
            </button>
          )}
          {kind === "details" && (
            <button type="button" disabled={busy} onClick={() => void saveDetails()} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-700 px-4 text-xs font-bold text-white disabled:opacity-60">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />} Save
            </button>
          )}
          {kind === "about" && (
            <button type="button" disabled={busy} onClick={() => void saveCosmetic()} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-700 px-4 text-xs font-bold text-white disabled:opacity-60">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />} Save
            </button>
          )}
          {kind === "representatives" && (
            <button type="button" disabled={busy || manage.requests.some((r) => r.field === "representatives" && r.status === "PENDING")} onClick={() => void sendRepresentatives()}
              className="min-h-[40px] rounded-lg bg-emerald-700 px-4 text-xs font-bold text-white disabled:opacity-60">Send for review</button>
          )}
        </div>
        <FilePreviewDialog files={previewFiles} index={preview} onIndexChange={setPreview} onClose={() => setPreview(null)} />
      </DialogContent>
    </Dialog>
  );
}
