"use client";

import { useState } from "react";
import type { HandoverProofPhoto } from "@/lib/api";
import { formatIST } from "@/lib/formatIST";
import { Panel } from "./HandoverScheduleSummary";

/**
 * Read-only record of the handover proof photos, under Contact in the side column
 * (below Contact on mobile too). The hub is also where History's "View details"
 * lands, so either side can look back at who took the photo and when
 * (owner, 24 Nov 2026). Taking or removing photos stays in the confirmation step.
 */
export function HandoverProofGallery({ photos, viewerRole }: {
  photos: HandoverProofPhoto[];
  viewerRole: "DONOR" | "DONEE";
}) {
  const [viewing, setViewing] = useState<string | null>(null);
  const who = (p: HandoverProofPhoto) =>
    p.uploaderRole === viewerRole ? "You" : p.uploaderRole === "DONOR" ? "The donor" : "The recipient";

  return (
    <Panel title="Handover proof photo">
      <ul className="grid grid-cols-3 gap-2" data-testid="handover-proof-gallery">
        {photos.map((p) => (
          <li key={p.id} className="space-y-1">
            <button type="button" onClick={() => p.url && setViewing(p.url)} disabled={!p.url}
              className="block aspect-square w-full overflow-hidden rounded-lg bg-stone-100 dark:bg-zinc-800"
              aria-label={`Open handover photo taken by ${who(p).toLowerCase()}`}>
              {p.url && (
                // eslint-disable-next-line @next/next/no-img-element -- presigned URL
                <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              )}
            </button>
            <p className="text-3xs leading-tight text-stone-500 dark:text-stone-400">
              {who(p)} · {formatIST(p.takenAt)}
            </p>
          </li>
        ))}
      </ul>

      {viewing && (
        <div role="dialog" aria-modal="true" aria-label="Handover photo"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setViewing(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- presigned URL */}
          <img src={viewing} alt="" className="max-h-[85vh] max-w-[92vw] rounded-xl object-contain" />
        </div>
      )}
    </Panel>
  );
}
