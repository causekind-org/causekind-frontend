"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import {
  getMyNgoProfileManage, removeNgoProfilePhoto, requestNgoProfileChange, updateNgoProfileCosmetic, uploadNgoProfilePhoto,
  type NgoProfileManage, type NgoProfileVerifiedField,
} from "@/lib/api";
import { UploadedFilePreview } from "@/features/ngo-registration/components/UploadedFilePreview";
import { OtherSpecifyField } from "@/features/ngo-registration/components/OtherSpecifyField";
import { DESIGNATIONS, isOtherChoice, otherTextError, mobileError } from "@/features/ngo-registration/ngoRegistrationModel";
import { compressImageIfNeeded } from "@/lib/imageCompression";
import { FilePreviewDialog } from "@/components/FilePreviewDialog";

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

export type OwnerEditKind = "photos" | "about" | "contact" | "links" | "identity" | "representatives";

const VERIFIED_LABELS: Record<Exclude<NgoProfileVerifiedField, "representatives">, string> = {
  organizationName: "Legal name", panNumber: "PAN", registrationNumber: "Registration number", officialEmail: "Official email",
};
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
  const [address, setAddress] = useState(manage.registeredOfficeAddress ?? "");
  const [links, setLinks] = useState<string[]>(manage.links.length ? manage.links : [""]);
  const [identity, setIdentity] = useState<Record<string, string>>({
    organizationName: manage.organizationName ?? "", panNumber: manage.panNumber ?? "",
    registrationNumber: manage.registrationNumber ?? "", officialEmail: manage.officialEmail ?? "",
  });
  const [reps, setReps] = useState(manage.representatives.length ? manage.representatives.map((r) => ({ fullName: r.fullName, designation: r.designation ?? "" })) : [{ fullName: "", designation: "" }]);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<number | null>(null);
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
    if (kind === "contact") {
      const err = mobileError(phone);
      if (err) return setError(err);
      if (address.trim().length < 10) return setError("Enter the full address (10 to 300 characters).");
      return run(() => updateNgoProfileCosmetic({ organizationPhone: phone.trim(), registeredOfficeAddress: address.trim() }), "Saved. It now shows on your page.");
    }
    if (kind === "links") {
      const list = links.map((l) => l.trim()).filter(Boolean);
      if (list.some((l) => !/^https:\/\/\S+$/.test(l))) return setError("Each link must start with https://");
      return run(() => updateNgoProfileCosmetic({ links: list }), "Saved. It now shows on your page.");
    }
  }

  async function sendIdentity(field: Exclude<NgoProfileVerifiedField, "representatives">) {
    await run(async () => {
      await requestNgoProfileChange(field, identity[field], reason.trim() || undefined);
      return getMyNgoProfileManage();
    }, "Sent for review. Your page keeps the current value until it's approved.", false);
  }

  async function sendRepresentatives() {
    for (const r of reps) {
      if (r.fullName.trim().length < 2) return setError("Each representative needs a full name.");
      if (isOtherChoice(r.designation, DESIGNATIONS) && otherTextError(r.designation)) return setError("Please specify each role (2–60 letters).");
    }
    await run(async () => {
      await requestNgoProfileChange("representatives", JSON.stringify(reps.map((r) => ({ fullName: r.fullName.trim(), designation: r.designation.trim() }))), reason.trim() || undefined);
      return getMyNgoProfileManage();
    }, "Sent for review. Your page keeps the current list until it's approved.", false);
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError(`${file.name} is larger than 5 MB.`);
    await run(async () => uploadNgoProfilePhoto(uploadType.current, await compressImageIfNeeded(file)), "Photo saved.");
  }

  const pick = (t: "cover" | "logo" | "office_photo") => { uploadType.current = t; fileInput.current?.click(); };
  const byType = (t: string) => manage.photos.filter((p) => p.type === t);
  const titled: Record<OwnerEditKind, string> = {
    photos: "Cover, logo and photos", about: "About us", contact: "Contact phone and address", links: "Links",
    identity: "Legal details", representatives: "Representatives / trustees",
  };
  const verified = kind === "identity" || kind === "representatives";
  const previewFiles = manage.photos.map((p) => ({ name: p.type.replace("_", " ").toLowerCase(), url: p.url, mimeType: "image/jpeg" }));

  return (
    <Dialog open={kind != null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent data-ck-role-theme="ngo" className="block max-h-[90vh] max-w-lg overflow-y-auto p-6">
        {kind && <DialogTitle className="text-lg font-bold text-stone-900 dark:text-stone-100">Edit {titled[kind].toLowerCase()}</DialogTitle>}
        <DialogDescription className="mt-1 text-xs text-stone-500">
          {verified ? "Verified details change only after our team reviews them. Until then donors see the current value."
            : "Changes show on your page right away."}
        </DialogDescription>

        <div className="mt-4 space-y-3">
          {kind === "photos" && (
            <>
              {(["COVER", "LOGO"] as const).map((t) => {
                const p = byType(t)[0];
                const label = t === "COVER" ? "Cover photo" : "Logo";
                return p ? (
                  <UploadedFilePreview key={t} file={{ name: label, photoId: p.id, s3Url: p.url, mimeType: "image/jpeg" }} kind="photo" label={label}
                    localBlobUrl={p.url} onPreview={() => setPreview(manage.photos.indexOf(p))}
                    onReplace={() => pick(t === "COVER" ? "cover" : "logo")} onRemove={() => run(() => removeNgoProfilePhoto(p.id), "Removed.")} disabled={busy} />
                ) : (
                  <button key={t} type="button" onClick={() => pick(t === "COVER" ? "cover" : "logo")} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-300 text-xs font-semibold">
                    <Plus className="h-4 w-4" aria-hidden /> Add {label.toLowerCase()}
                  </button>
                );
              })}
              <p className="pt-2 text-xs font-bold text-stone-700 dark:text-stone-200">Organisation photos</p>
              {byType("OFFICE_PHOTO").map((p, i) => (
                <UploadedFilePreview key={p.id} file={{ name: `Photo ${i + 1}`, photoId: p.id, s3Url: p.url, mimeType: "image/jpeg" }} kind="photo"
                  label={`Organisation photo ${i + 1}`} localBlobUrl={p.url} onPreview={() => setPreview(manage.photos.indexOf(p))}
                  onReplace={() => pick("office_photo")} onRemove={() => run(() => removeNgoProfilePhoto(p.id), "Removed.")} disabled={busy} />
              ))}
              <button type="button" onClick={() => pick("office_photo")} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-stone-300 text-xs font-semibold">
                <Plus className="h-4 w-4" aria-hidden /> Add organisation photo
              </button>
              <input ref={fileInput} type="file" accept="image/jpeg, image/png, image/webp" className="hidden" data-testid="owner-photo-input"
                onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
            </>
          )}

          {kind === "about" && (
            <div className="space-y-1">
              <label htmlFor="owner-about" className="text-xs font-bold">About us</label>
              <textarea id="owner-about" rows={7} maxLength={2000} value={about} onChange={(e) => setAbout(e.target.value)} className={`${input} py-2`} />
              <p className="text-right text-3xs text-stone-500">{about.trim().length}/2000 (at least 100)</p>
            </div>
          )}

          {kind === "contact" && (
            <>
              <div className="space-y-1">
                <label htmlFor="owner-phone" className="text-xs font-bold">Contact phone (+91)</label>
                <input id="owner-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
              </div>
              <div className="space-y-1">
                <label htmlFor="owner-address" className="text-xs font-bold">Address</label>
                <textarea id="owner-address" rows={3} maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} className={`${input} py-2`} />
              </div>
            </>
          )}

          {kind === "links" && (
            <>
              {links.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <input aria-label={`Link ${i + 1}`} value={l} placeholder="https://" onChange={(e) => setLinks((p) => p.map((x, j) => (j === i ? e.target.value : x)))} className={input} />
                  <button type="button" aria-label={`Remove link ${i + 1}`} onClick={() => setLinks((p) => p.filter((_, j) => j !== i))} className="shrink-0 px-2 text-stone-500 hover:text-red-600">
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ))}
              {links.length < 3 && (
                <button type="button" onClick={() => setLinks((p) => [...p, ""])} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
                  <Plus className="h-3.5 w-3.5" aria-hidden /> Add link
                </button>
              )}
            </>
          )}

          {kind === "identity" && (Object.keys(VERIFIED_LABELS) as (keyof typeof VERIFIED_LABELS)[]).map((f) => {
            const pending = manage.requests.some((r) => r.field === f && r.status === "PENDING");
            return (
              <div key={f} className="space-y-1">
                <label htmlFor={`owner-${f}`} className="text-xs font-bold">{VERIFIED_LABELS[f]}</label>
                <div className="flex gap-2">
                  <input id={`owner-${f}`} value={identity[f]} disabled={pending} onChange={(e) => setIdentity((p) => ({ ...p, [f]: e.target.value }))} className={input} />
                  <button type="button" disabled={busy || pending} onClick={() => void sendIdentity(f)}
                    className="shrink-0 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white disabled:opacity-50">
                    {pending ? "Pending review" : "Send for review"}
                  </button>
                </div>
              </div>
            );
          })}

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
                  {reps.length > 1 && (
                    <button type="button" onClick={() => setReps((p) => p.filter((_, j) => j !== i))} className="text-xs font-semibold text-red-600">Remove</button>
                  )}
                </div>
              ))}
              {reps.length < 5 && (
                <button type="button" onClick={() => setReps((p) => [...p, { fullName: "", designation: "" }])} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
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
        {note && <p role="status" className="mt-3 text-xs font-semibold text-emerald-700">{note}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-[40px] rounded-lg border border-stone-300 px-4 text-xs font-semibold">Close</button>
          {(kind === "about" || kind === "contact" || kind === "links") && (
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
