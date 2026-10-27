"use client";

import { useEffect, useState } from "react";
import { Calendar, MapPin, Package, Users } from "lucide-react";
import { getNgoDriveProof, type NgoDriveProofResponse } from "@/lib/api";
import { FilePreviewDialog } from "@/components/FilePreviewDialog";
import { formatISTDate } from "@/lib/formatIST";
import { resolveMediaUrl } from "@/lib/mediaUrl";

const fmtDate = (d?: string | null) => (d ? formatISTDate(d) : null);

/**
 * Everything the NGO published with its distribution proof, in one card: photos (click to
 * enlarge), people reached, quantity, date, location, note, NGO. The proof is public only
 * after admin approval and never includes the internal consent flag.
 */
export function DriveProofCard({ proof, factsGridClassName = "grid-cols-2 sm:grid-cols-4" }: {
  proof: NgoDriveProofResponse;
  /** Column layout of the details grid (the NGO report uses 1/2/4). */
  factsGridClassName?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const photos = proof.media.filter((m) => m.mediaType !== "VIDEO")
    .map((m) => ({ ...m, mediaUrl: resolveMediaUrl(m.mediaUrl) ?? "" })).filter((m) => m.mediaUrl);
  const facts: [React.ComponentType<{ className?: string }>, string, string | null][] = [
    [Users, "People reached", proof.beneficiariesReached != null ? `${proof.beneficiariesReached}${proof.beneficiaryGroup ? ` ${proof.beneficiaryGroup.toLowerCase()}` : ""}` : null],
    [Package, "Quantity distributed", proof.quantityDistributed != null ? `${proof.quantityDistributed}${proof.itemName ? ` ${proof.itemName.toLowerCase()}` : ""}` : null],
    [Calendar, "Date", fmtDate(proof.distributedOn)],
    [MapPin, "Location", proof.location ?? null],
  ];
  const [broken, setBroken] = useState<Set<string>>(() => new Set());
  return (
    <section data-testid="drive-proof-card" className="rounded-2xl border border-ngo-200 bg-white p-5 shadow-sm dark:border-ngo-900/50 dark:bg-zinc-900">
      <p className="text-3xs font-black uppercase tracking-[0.2em] text-ngo-700 dark:text-ngo-300">Distribution proof{proof.ngoName ? ` · ${proof.ngoName}` : ""}</p>
      <dl className={`mt-3 grid gap-3 ${factsGridClassName}`}>
        {facts.filter(([, , v]) => v).map(([Icon, label, value]) => (
          <div key={label} className="rounded-xl bg-ngo-50 p-3 dark:bg-ngo-950/30">
            <dt className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-ngo-800 dark:text-ngo-200"><Icon className="h-3.5 w-3.5" aria-hidden />{label}</dt>
            <dd className="mt-1 break-words text-sm font-semibold text-stone-900 dark:text-stone-100">{value}</dd>
          </div>
        ))}
      </dl>
      {proof.ngoStatement && <p className="mt-4 rounded-xl border border-stone-100 bg-stone-50 p-3 text-sm italic text-stone-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-stone-300">&ldquo;{proof.ngoStatement}&rdquo;</p>}
      {photos.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Distribution photos">
          {photos.map((m, i) => (
            <li key={m.mediaUrl}>
              <button type="button" onClick={() => setOpen(i)} aria-label={`Enlarge photo ${i + 1}`} className="block aspect-square w-full overflow-hidden rounded-xl border border-stone-200 dark:border-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {broken.has(m.mediaUrl) ? (
                  <span className="flex h-full w-full items-center justify-center bg-stone-100 text-2xs text-stone-500 dark:bg-zinc-800">Photo unavailable</span>
                ) : (
                  <img src={m.mediaUrl} alt={`Distribution photo ${i + 1}`} className="h-full w-full object-cover"
                    onError={() => setBroken((b) => new Set(b).add(m.mediaUrl))} />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <FilePreviewDialog files={photos.map((m, i) => ({ name: `Distribution photo ${i + 1}`, url: m.mediaUrl, mimeType: "image/jpeg" }))}
        index={open} onIndexChange={setOpen} onClose={() => setOpen(null)} />
    </section>
  );
}

/** Loads the public proof for a drive and shows the card; nothing until it's published. */
export function DriveProofCardLoader({ driveId }: { driveId: number }) {
  const [proof, setProof] = useState<NgoDriveProofResponse | null>(null);
  useEffect(() => { getNgoDriveProof(driveId).then(setProof).catch(() => setProof(null)); }, [driveId]);
  return proof ? <DriveProofCard proof={proof} /> : null;
}
