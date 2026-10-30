"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2, RefreshCw } from "lucide-react";
import { getMyNgoProfileDocuments, requestNgoProfileChange, uploadNgoDocument, type NgoProfileDocument } from "@/lib/api";
import { documentLabel } from "@/features/ngo-registration/ngoRegistrationModel";
import { checkNgoDocumentFile } from "@/features/ngo-registration/components/DocUploadCard";
import { UploadedFilePreview } from "@/features/ngo-registration/components/UploadedFilePreview";
import { FilePreviewDialog } from "@/components/FilePreviewDialog";
import { useEntityUpdates } from "@/hooks/useEntityUpdates";

const DAY = 86_400_000;

/** Valid / Expiring soon (30 days) / Expired, only when an expiry is known. */
export function expiryStatus(expiresAt?: string | null, now = Date.now()): { label: string; tone: string } | null {
  if (!expiresAt) return null;
  const t = new Date(`${expiresAt.slice(0, 10)}T23:59:59+05:30`).getTime();
  if (Number.isNaN(t)) return null;
  if (t < now) return { label: "Expired", tone: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-100" };
  if (t - now <= 30 * DAY) return { label: "Expiring soon", tone: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" };
  return { label: "Valid", tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100" };
}

const fmt = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(/Z|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}${iso.length > 10 ? "Z" : "T00:00:00+05:30"}`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
};
const isImage = (d: NgoProfileDocument) => (d.mimeType ?? "").startsWith("image/");
const categoryId = (c?: string | null) => (c ?? "MUST_HAVE").toLowerCase().replace(/_/g, "-");

type Staged = { file: File; url: string; documentId: number };

/** One document: thumbnail (opens the preview), details, and "Update" (upload → send for review). */
function DocumentRow({ doc, onPreview, onSent }: { doc: NgoProfileDocument; onPreview: () => void; onSent: () => void }) {
  const [staged, setStaged] = useState<Staged | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [previewNew, setPreviewNew] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const chip = expiryStatus(doc.expiresAt);
  const pending = doc.pendingRequestId != null;
  const label = documentLabel(doc.type);

  useEffect(() => () => { if (staged) URL.revokeObjectURL(staged.url); }, [staged]);

  async function pick(file?: File) {
    if (!file) return;
    const err = checkNgoDocumentFile(file);
    if (err) return setError(err);
    setBusy(true); setError("");
    try {
      const res = await uploadNgoDocument(file, doc.type, categoryId(doc.category));
      setStaged({ file, url: URL.createObjectURL(file), documentId: res.documentId! });
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "We couldn't upload the file.");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!staged) return;
    setBusy(true); setError("");
    try {
      await requestNgoProfileChange(`documents.${doc.type}`, String(staged.documentId));
      setStaged(null);
      onSent();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "We couldn't send the update.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li data-testid="ngo-document" className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <button type="button" onClick={onPreview} aria-label={`Preview ${label}`}
          className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-200 bg-stone-50 dark:border-zinc-700 dark:bg-zinc-800">
          {isImage(doc) && doc.url
            // eslint-disable-next-line @next/next/no-img-element -- signed storage link
            ? <img src={doc.url} alt="" className="h-full w-full object-cover" />
            : <FileText className="size-6 text-stone-500" aria-hidden />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-stone-900 dark:text-stone-100">{label}</p>
            {chip && <span className={`rounded-full px-2 py-0.5 text-3xs font-bold ${chip.tone}`}>{chip.label}</span>}
            {pending && <span data-testid="doc-pending" className="rounded-full bg-amber-100 px-2 py-0.5 text-3xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">Pending review</span>}
          </div>
          <p className="truncate text-xs text-stone-600 dark:text-stone-400">{doc.fileName}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Uploaded {fmt(doc.uploadedAt)}{doc.expiresAt ? ` · Expires ${fmt(doc.expiresAt)}` : ""}
          </p>
          {pending && doc.pendingFileName && <p className="text-xs text-amber-800 dark:text-amber-200">New file waiting for review: {doc.pendingFileName}</p>}
        </div>
        {!pending && !staged && (
          <button type="button" onClick={() => input.current?.click()} disabled={busy} aria-label={`Update ${label}`}
            className="inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-lg border border-ngo-700/40 px-3 text-xs font-bold text-ngo-700 hover:bg-ngo-50 disabled:opacity-50 dark:text-ngo-300">
            {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <RefreshCw className="size-3.5" aria-hidden />} Update
          </button>
        )}
      </div>
      {staged && (
        <div className="space-y-2">
          <UploadedFilePreview file={{ name: staged.file.name, mimeType: staged.file.type, size: staged.file.size }} kind="document"
            label={`New ${label}`} localBlobUrl={staged.url} onPreview={() => setPreviewNew(true)}
            onReplace={() => input.current?.click()} onRemove={() => setStaged(null)} disabled={busy} />
          <p className="text-xs text-stone-500">Your current file stays live until our team approves the new one.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setStaged(null)} disabled={busy} className="min-h-[36px] rounded-lg border border-stone-300 px-3 text-xs font-semibold dark:border-zinc-700">Cancel</button>
            <button type="button" onClick={() => void send()} disabled={busy}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-ngo-700 px-3 text-xs font-bold text-white disabled:opacity-60">
              {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden />} Send for review
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-xs font-semibold text-red-600">{error}</p>}
      <input ref={input} type="file" className="hidden" data-testid={`doc-input-${doc.type}`}
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
      {staged && (
        <FilePreviewDialog files={[{ name: staged.file.name, url: staged.url, mimeType: staged.file.type }]}
          index={previewNew ? 0 : null} onIndexChange={() => {}} onClose={() => setPreviewNew(false)} />
      )}
    </li>
  );
}

/** /profile "Documents": every live document the NGO uploaded; replacements go to admin review. */
export function NgoDocumentsSection() {
  const [docs, setDocs] = useState<NgoProfileDocument[] | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<number | null>(null);

  const load = useCallback(() => {
    getMyNgoProfileDocuments().then((d) => { setDocs(d); setError(""); })
      .catch(() => { setDocs((p) => p ?? []); setError("We couldn't load your documents. Please refresh."); });
  }, []);
  useEffect(() => { load(); }, [load]);
  useEntityUpdates(["NGO_PROFILE_CHANGE"], load);

  return (
    <section aria-labelledby="ngo-documents-heading" data-testid="ngo-documents"
      className="min-w-0 rounded-2xl border border-[#EADBCE] bg-[#FAF7F2] p-5 shadow-sm dark:border-emerald-950/80 dark:bg-[#141E18] sm:p-6">
      <h3 id="ngo-documents-heading" className="mb-3 font-serif text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-xl">Documents</h3>
      {error && <p role="alert" className="mb-2 text-xs text-red-600">{error}</p>}
      {docs == null ? <Loader2 className="size-5 animate-spin text-stone-400" aria-label="Loading" />
        : docs.length === 0 ? <p className="text-xs text-stone-500">No documents yet.</p>
        : (
          <ul className="grid gap-3 md:grid-cols-2">
            {docs.map((d, i) => <DocumentRow key={d.id} doc={d} onPreview={() => setPreview(i)} onSent={load} />)}
          </ul>
        )}
      <FilePreviewDialog files={(docs ?? []).map((d) => ({ name: `${documentLabel(d.type)} · ${d.fileName ?? ""}`, url: d.url, mimeType: d.mimeType }))}
        index={preview} onIndexChange={setPreview} onClose={() => setPreview(null)} />
    </section>
  );
}
