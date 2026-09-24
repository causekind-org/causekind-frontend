"use client";

import { useState } from "react";
import { superAdminRevealDonation, type SaRevealField, type SuperAdminRow } from "@/lib/api";
import { saTheme, type SaTheme } from "@/components/super-admin/saTheme";
import { Eye, Loader2, X } from "lucide-react";

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    return new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  return String(v);
}

function Row({ label, value, t }: { label: string; value: string; t: SaTheme }) {
  return (
    <div className={`flex justify-between gap-3 border-b py-1.5 last:border-0 ${t.cardFlat}`}>
      <span className={`text-xs ${t.muted}`}>{label}</span>
      <span className={`text-xs font-semibold text-right ${t.text}`}>{value}</span>
    </div>
  );
}

/**
 * A guest trust donation has no user account — the name/email/PAN it carries
 * were typed once, at checkout, and live only on the donation row itself.
 * This is the only place they're visible, so it shows everything the raw
 * table doesn't have room for rather than sending the agent to User 360 (which
 * needs an account to open).
 *
 * <p>Logged-in donors get the same summary plus a way into their full profile,
 * where the same PAN-reveal control already lives (see User360Panel's
 * PanRevealCard) — not duplicated here beyond what's needed for a guest.
 */
export function DonationDetailModal({
  row, isDark, onClose, onOpenProfile,
}: {
  row: SuperAdminRow;
  isDark: boolean;
  onClose: () => void;
  /** Only called when the donation has a real donorId to jump to. */
  onOpenProfile: (donorId: number) => void;
}) {
  const t = saTheme(isDark);
  const isGuest = row.donorId == null;
  const name = (row.donorName ?? row.guestName ?? "—") as string;
  const email = (row.donorEmail ?? row.guestEmail ?? "—") as string;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[85vh] sm:max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border shadow-2xl ${t.card}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex shrink-0 items-center justify-between px-5 py-4 border-b ${t.cardFlat}`}>
          <div className="min-w-0">
            <h3 className={`truncate text-sm font-bold ${t.heading}`}>{name}</h3>
            <p className={`text-xs ${t.muted}`}>
              {isGuest ? "Guest donation — no account" : `Donor #${row.donorId}`}
            </p>
          </div>
          <button onClick={onClose} className={`shrink-0 rounded-lg p-1.5 transition-colors ${t.btn}`} aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-1">
            <Row label="Email" value={email} t={t} />
            <Row label="Amount" value={`${fmt(row.currency)} ${fmt(row.amount)}`} t={t} />
            <Row label="Status" value={fmt(row.status)} t={t} />
            <Row label="Source" value={fmt(row.source)} t={t} />
            <Row label="Donor type" value={fmt(row.donorMode)} t={t} />
            <Row label="Campaign" value={fmt(row.campaignTitle)} t={t} />
            <Row label="Order ID" value={fmt(row.razorpayOrderId)} t={t} />
            <Row label="Payment ID" value={fmt(row.razorpayPaymentId)} t={t} />
            <Row label="Donated" value={fmt(row.createdAt)} t={t} />
          </div>

          {isGuest && (
            <div className="px-5 pb-4">
              <GuestPanReveal donationId={Number(row.id)} t={t} />
            </div>
          )}
        </div>

        {!isGuest && (
          <div className={`shrink-0 px-5 py-3.5 border-t ${t.cardFlat}`}>
            <button
              onClick={() => onOpenProfile(Number(row.donorId))}
              className={`w-full rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${t.btnAccent}`}
            >
              Open full profile (identity, PAN, timeline, restrictions…)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Guests have no user account — `superAdminReveal`'s `targetUserId` doesn't
 * apply, so this calls the donation-scoped sibling endpoint instead
 * (`/governance/reveal-donation`, only valid for `donorMode: "GUEST"`).
 * Same justification-required-before-value-shown shape as User360's PAN card.
 */
function GuestPanReveal({ donationId, t }: { donationId: number; t: SaTheme }) {
  const [field, setField] = useState<Extract<SaRevealField, "PAN" | "PAN_PHOTO">>("PAN");
  const [justification, setJustification] = useState("");
  const [revealing, setRevealing] = useState(false);
  const [revealed, setRevealed] = useState<{ field: string; value: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onReveal() {
    if (!justification.trim()) return;
    setRevealing(true);
    setError(null);
    setRevealed(null);
    try {
      setRevealed(await superAdminRevealDonation({ donationId, field, justification: justification.trim() }));
      setJustification("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The reveal was refused.");
    } finally {
      setRevealing(false);
    }
  }

  return (
    <div className={`rounded-xl border p-3 ${t.cardFlat}`}>
      <p className={`mb-2 text-xs font-bold ${t.heading}`}>PAN (captured at checkout)</p>
      <p className={`mb-2 text-[11px] ${t.muted}`}>
        Government ID — requires a stated reason, and every read is logged (see Governance).
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={field}
          onChange={(e) => setField(e.target.value as "PAN" | "PAN_PHOTO")}
          className={`rounded-lg border px-2.5 py-1.5 text-xs ${t.input}`}
        >
          <option value="PAN">PAN number</option>
          <option value="PAN_PHOTO">PAN photo</option>
        </select>
      </div>
      <textarea
        value={justification}
        onChange={(e) => setJustification(e.target.value)}
        rows={2}
        placeholder="Why do you need this? Recorded against your name, permanently."
        className={`mt-2 w-full rounded-lg border px-2.5 py-2 text-xs ${t.input} ${t.placeholder}`}
      />
      {error && <div className={`mt-2 rounded-lg border p-2.5 text-xs ${t.dangerPanel}`}>{error}</div>}
      <button
        type="button"
        onClick={onReveal}
        disabled={revealing || !justification.trim()}
        className={`mt-2 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${t.btn} disabled:opacity-40 disabled:pointer-events-none`}
      >
        {revealing ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
        Reveal
      </button>
      {revealed && (
        <div className={`mt-3 rounded-lg border p-3 ${t.dangerPanel}`}>
          {revealed.value === "" ? (
            <p className="text-xs italic opacity-80">
              No {revealed.field === "PAN_PHOTO" ? "PAN photo" : "PAN"} on file for this donation.
            </p>
          ) : revealed.field === "PAN_PHOTO" ? (
            // eslint-disable-next-line @next/next/no-img-element -- a
            // short-lived presigned S3 URL from the backend, not a static asset.
            <img src={revealed.value} alt="PAN card" className="max-h-56 rounded-lg" />
          ) : (
            <p className="break-all font-mono text-sm">{revealed.value}</p>
          )}
          <button type="button" onClick={() => setRevealed(null)} className="mt-1.5 text-[11px] underline opacity-80">
            Hide it
          </button>
        </div>
      )}
    </div>
  );
}
