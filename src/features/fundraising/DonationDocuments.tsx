"use client";

import { useState } from "react";
import { downloadDonationDocument, type Donation } from "@/lib/api";
import { Icon } from "./ui";
import s from "./fundraising.module.css";
import { UiText, useUiText } from "@/components/UiText";

/**
 * A completed donation's documents (2026-10-30). Everything shown comes from the server: download buttons only
 * when it says a document is available, otherwise a status line. Never shown for unconfirmed payments, and a
 * document delay or delivery problem never changes the payment's own "confirmed" state around it.
 */
export function DonationDocuments({ d, compact = false }: { d: Donation; compact?: boolean }) {
  const ui = useUiText();
  const [busy, setBusy] = useState<"certificate" | "receipt" | null>(null);
  const [failed, setFailed] = useState(false);
  if (d.status !== "COMPLETED") return null;

  async function download(kind: "certificate" | "receipt") {
    setBusy(kind); setFailed(false);
    try {
      const blob = await downloadDonationDocument(d.id, kind);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${kind === "receipt" ? "Receipt" : "Certificate"}-${d.id}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch { setFailed(true); }
    finally { setBusy(null); }
  }

  const st = d.documentsStatus;
  const note = d.certificateAvailable || d.receiptAvailable ? null
    : st === "PENDING" || st === "PARTIAL" || st === "FAILED" || st === "AWAITING_CAPTURE_TIME"
      ? ui("Your donation certificate is being prepared. We'll email it to you, and it will appear here.")
    : st === "PAN_REVIEW"
      ? ui("We're checking your PAN details before issuing your 80G receipt and certificate.")
    : st === "UNCERTAIN" || st === "CAPTURE_TIME_REVIEW"
      ? ui("Your certificate is taking longer than usual. Contact support if it doesn't appear.")
    : st === "SUPPRESSED"
      ? ui("We can't email documents to your address. Contact support to get your certificate.")
    : st === "GAVE_UP"
      ? ui("We couldn't send your certificate. Contact support to get it.")
    : null;
  // The page doesn't update by itself (no polling yet), so say so wherever the state can still change.
  const refresh = !d.certificateAvailable && (st === "PENDING" || st === "PARTIAL" || st === "FAILED"
    || st === "AWAITING_CAPTURE_TIME" || st === "UNCERTAIN" || st === "CAPTURE_TIME_REVIEW" || st === "PAN_REVIEW");
  if (!d.certificateAvailable && !d.receiptAvailable && !note) return null;

  return (
    <div style={{ display: "flex", flexDirection: compact ? "row" : "column", gap: 8, flexWrap: "wrap", alignItems: compact ? "center" : "flex-start" }}>
      {(d.certificateAvailable || d.receiptAvailable) && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {d.certificateAvailable && (
            <button type="button" className={`${s.btn} ${compact ? s.bq : s.bs}`} disabled={busy !== null} onClick={() => void download("certificate")}>
              <Icon name="file" />{busy === "certificate" ? ui("Downloading…") : ui("Download certificate")}
            </button>
          )}
          {d.receiptAvailable && (
            <button type="button" className={`${s.btn} ${compact ? s.bq : s.bs}`} disabled={busy !== null} onClick={() => void download("receipt")}>
              <Icon name="file" />{busy === "receipt" ? ui("Downloading…") : ui("Download 80G receipt")}
            </button>
          )}
        </div>
      )}
      {note && <p className={`${s.small} ${s.muted}`}>{note}{refresh && <> <UiText>Refresh this page to check for updates.</UiText></>}</p>}
      {d.documentPolicy === "CERTIFICATE_ONLY" && !compact && <p className={`${s.small} ${s.muted}`}><UiText>The donation certificate is not a tax receipt.</UiText></p>}
      {failed && <p role="alert" className={s.errText}><Icon name="alert" /><UiText>The download didn&apos;t work. Try again in a moment.</UiText></p>}
    </div>
  );
}
