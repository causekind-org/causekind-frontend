"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ApiError,
  adminGetNgoDrives, adminGetNgoDrive, adminGetNgoDriveNgo, adminApproveNgoDrive,
  adminRequestNgoDriveChanges, adminRejectNgoDrive, adminGetNgoDriveProofs,
  adminApproveNgoDriveProof, adminRejectNgoDriveProof, adminGetNgoDriveOffers, adminGetNgoDriveOffer,
  type AdminDriveStatusFilter, type AdminDriveOfferFilter, type AdminDriveOfferDetail,
  type AdminPendingDriveOffer, type AdminProofDrive, type NgoDrive,
} from "@/lib/api";
import { driveConditionLabel, driveConditionRule } from "@/features/ngo-drives/driveConditions";

const field = "w-full rounded-lg border border-stone-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const button = "rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-zinc-700";
const primary = `${button} bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900`;
const card = "rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900 sm:p-7";
const label = (value?: string | null) => (value ?? "").toLowerCase().replace(/_/g, " ");

/** Error text plus the per-item reasons the server gave (field errors), like the NGO Applications panel. */
function useErrors() {
  const [error, setError] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const fail = useCallback((e: unknown, fallback: string) => {
    const body = e instanceof ApiError ? (e.data as { fieldErrors?: { message?: string }[] } | undefined) : undefined;
    const list = (body?.fieldErrors ?? []).map(f => f?.message ?? "").filter(Boolean);
    setItems(list);
    setError(list.length ? "Please fix the following:" : e instanceof Error && e.message ? e.message : fallback);
  }, []);
  const clear = useCallback(() => { setError(""); setItems([]); }, []);
  const view = error ? (
    <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
      <p>{error}</p>
      {items.length > 0 && <ul className="mt-2 list-disc pl-5 space-y-0.5">{items.map(i => <li key={i}>{i}</li>)}</ul>}
    </div>
  ) : null;
  return { fail, clear, view };
}

function Photo({ src, alt }: { src?: string | null; alt: string }) {
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="h-32 w-32 rounded-lg border border-stone-200 object-cover dark:border-zinc-700" />;
}

/* ── NGO Drives ──────────────────────────────────────────────────────────── */

const DRIVE_FILTERS: { value: AdminDriveStatusFilter; text: string }[] = [
  { value: "PENDING_REVIEW", text: "Pending" },
  { value: "CHANGES_REQUESTED", text: "Changes requested" },
  { value: "LIVE", text: "Live" },
  { value: "FULLY_PLEDGED", text: "Fully pledged" },
  { value: "COLLECTION_COMPLETE", text: "Collection complete" },
  { value: "PROOF_SUBMITTED", text: "Proof submitted" },
  { value: "FULFILLED", text: "Fulfilled" },
  { value: "CLOSED", text: "Closed" },
  { value: "CANCELLED", text: "Cancelled" },
  { value: "REJECTED", text: "Rejected" },
];


type DriveDecision = "approve" | "changes" | "reject";
const DRIVE_DECISIONS: { value: DriveDecision; text: string; confirm: string }[] = [
  { value: "approve", text: "Approve", confirm: "Approve drive" },
  { value: "changes", text: "Request changes", confirm: "Request changes" },
  { value: "reject", text: "Reject", confirm: "Reject drive" },
];

export function NgoDriveReviewPanel({ onChange }: { onChange?: () => void }) {
  const [status, setStatus] = useState<AdminDriveStatusFilter>("PENDING_REVIEW");
  const [drives, setDrives] = useState<NgoDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<NgoDrive | null>(null);
  const [ngo, setNgo] = useState<{ ngoName: string; applicationId?: string; applicationStatus?: string } | null>(null);
  const [reason, setReason] = useState("");
  /** Picked first; approve needs no reason, the other two need their own. */
  const [choice, setChoice] = useState<DriveDecision | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const { fail, clear, view: errorView } = useErrors();

  const load = useCallback(async () => {
    setLoading(true); clear();
    try { setDrives(await adminGetNgoDrives(status)); }
    catch (e) { setDrives([]); fail(e, "Could not load drives."); }
    finally { setLoading(false); }
  }, [status, clear, fail]);
  useEffect(() => { void load(); }, [load]);

  async function open(id: number) {
    clear(); setNotice(""); setReason(""); setChoice(null); setNgo(null);
    try {
      const [drive, owner] = await Promise.all([adminGetNgoDrive(id), adminGetNgoDriveNgo(id)]);
      setDetail(drive); setNgo(owner);
    } catch (e) { fail(e, "Could not open this drive."); }
  }

  async function decide(kind: "approve" | "changes" | "reject") {
    if (!detail || busy) return;
    setBusy(true); clear(); setNotice("");
    try {
      if (kind === "approve") await adminApproveNgoDrive(detail.id);
      else if (kind === "changes") await adminRequestNgoDriveChanges(detail.id, reason.trim());
      else await adminRejectNgoDrive(detail.id, reason.trim());
      setChoice(null); setReason("");
      setNotice(kind === "approve" ? "Approved. The drive is live and the NGO has been notified."
        : kind === "changes" ? "Changes requested. The NGO can edit and resubmit." : "Drive rejected. The NGO can see your reason.");
      setDetail(await adminGetNgoDrive(detail.id));
      await load();
      onChange?.();
    } catch (e) { fail(e, "Could not save the decision."); }
    finally { setBusy(false); }
  }

  const d = detail;
  return (
    <div className="space-y-6 text-stone-900 dark:text-stone-100">
      <label className="block max-w-xs text-sm">Drive status
        <select className={field} value={status} onChange={e => { setStatus(e.target.value as AdminDriveStatusFilter); setDetail(null); }}>
          {DRIVE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.text}</option>)}
        </select>
      </label>
      {errorView}
      {notice && <p role="status" className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900">{notice}</p>}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <section aria-label="Drives" className="space-y-3">
          {loading ? <p role="status">Loading drives…</p> : drives.length === 0 ? <p className="text-sm text-stone-500">No drives in this status.</p> : null}
          {drives.map(drive => (
            <button key={drive.id} onClick={() => void open(drive.id)}
              className={`w-full rounded-xl border bg-white p-4 text-left dark:bg-zinc-900 ${d?.id === drive.id ? "border-ngo-700 ring-1 ring-ngo-700" : "border-stone-200 dark:border-zinc-700"}`}>
              <span className="block font-semibold">{drive.title}</span>
              <span className="mt-1 block text-xs text-stone-500">{drive.ngoUser?.fullName}</span>
              <span className="mt-2 block text-sm capitalize">{label(drive.status)}</span>
            </button>
          ))}
        </section>
        <section aria-label="Drive details" className={card}>
          {!d ? <p className="text-sm text-stone-500">Select a drive to review it.</p> : <>
            <h2 className="text-2xl font-bold">{d.title}</h2>
            <p className="mt-1 text-sm capitalize">{label(d.status)}</p>
            {ngo && (
              <p className="mt-2 text-sm">
                By <strong>{ngo.ngoName}</strong>
                {ngo.applicationId && <> · <Link className="underline" href={`/admin/dashboard?tab=ngo-applications&application=${encodeURIComponent(ngo.applicationId)}`}>
                  View NGO application ({label(ngo.applicationStatus)})</Link></>}
              </p>
            )}
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              {Object.entries({
                Category: d.category, Item: d.itemName, Quantity: `${d.quantityNeeded} ${label(d.unit)}`,
                "Condition accepted": [driveConditionLabel(d.itemCondition), driveConditionRule(d.itemCondition)].filter(Boolean).join(" · "),
                Urgency: label(d.urgency),
                "People who will benefit": `${d.beneficiaryCount} · ${d.beneficiaryGroup}`,
                "Needed by": d.neededBy, "Available days": (d.availableDays || "").split(",").join(", "),
                Hours: `${(d.availableFrom || "").slice(0, 5)} – ${(d.availableTo || "").slice(0, 5)}`,
                Contact: `${d.contactName} · ${d.contactPhone}`,
              }).map(([name, value]) => <div key={name}><dt className="text-stone-500">{name}</dt><dd className="mt-1 break-words">{value || "Not provided"}</dd></div>)}
            </dl>
            <div className="mt-5 text-sm"><p className="text-stone-500">Why it&apos;s needed</p><p className="mt-1 whitespace-pre-wrap">{d.description}</p></div>
            {d.details && <div className="mt-4 text-sm"><p className="text-stone-500">Details</p><p className="mt-1 whitespace-pre-wrap">{d.details}</p></div>}
            {d.referencePhotoUrl && <div className="mt-4 text-sm"><p className="mb-1 text-stone-500">Reference photo</p><Photo src={d.referencePhotoUrl} alt="Reference" /></div>}
            {d.adminReason && <p className="mt-4 rounded-lg bg-stone-50 p-3 text-sm dark:bg-zinc-800"><strong>Last reason given:</strong> {d.adminReason}</p>}
            {d.status === "PENDING_REVIEW" && (
              <div className="mt-6 space-y-4 border-t border-stone-200 pt-6 dark:border-zinc-700">
                <h3 className="font-bold">Record your decision</h3>
                <fieldset className="flex flex-wrap gap-2" aria-label="Decision">
                  {DRIVE_DECISIONS.map(option => (
                    <label key={option.value}
                      className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold ${choice === option.value
                        ? (option.value === "reject" ? "border-red-400 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200" : "border-ngo-700 bg-ngo-50 text-ngo-900 dark:bg-ngo-900/30 dark:text-ngo-100")
                        : "border-stone-300 dark:border-zinc-700"}`}>
                      <input type="radio" name="drive-decision" value={option.value} checked={choice === option.value} disabled={busy}
                        onChange={() => { setChoice(option.value); setReason(""); clear(); }} />
                      {option.text}
                    </label>
                  ))}
                </fieldset>
                {choice && choice !== "approve" && (
                  <label className="block text-sm">{choice === "changes" ? "What needs to change" : "Reason for rejection"}
                    <span className="text-red-600" aria-hidden> *</span>
                    <textarea className={field} rows={3} maxLength={500} value={reason} disabled={busy} required
                      onChange={e => setReason(e.target.value)} />
                  </label>
                )}
                {choice && (
                  <button className={choice === "reject" ? `${button} border-red-300 bg-red-700 text-white` : primary}
                    disabled={busy || (choice !== "approve" && !reason.trim())} onClick={() => void decide(choice)}>
                    {busy ? "Saving…" : DRIVE_DECISIONS.find(o => o.value === choice)!.confirm}
                  </button>
                )}
              </div>
            )}
          </>}
        </section>
      </div>
    </div>
  );
}

/* ── Drive offers ────────────────────────────────────────────────────────── */

const OFFER_FILTERS: { value: AdminDriveOfferFilter; text: string; empty: string }[] = [
  { value: "PENDING", text: "Waiting for the NGO", empty: "No donor offers are waiting for the NGO's decision." },
  { value: "APPROVED", text: "Accepted by the NGO", empty: "No accepted offers waiting for a handover plan." },
  { value: "IN_HANDOVER", text: "In handover", empty: "No offers are in handover." },
  { value: "COMPLETED", text: "Completed", empty: "No completed offers yet." },
  { value: "REJECTED", text: "Rejected or declined", empty: "No rejected offers." },
  { value: "CANCELLED", text: "Cancelled or withdrawn", empty: "No cancelled offers." },
];

/**
 * Donor offers to NGO drives and their handovers. Monitor only: the NGO accepts or
 * declines each offer and the handover starts right away, so there is nothing for an
 * admin to approve here. Never shows donor contact details.
 */
export function NgoDriveOffersPanel() {
  const [status, setStatus] = useState<AdminDriveOfferFilter>("IN_HANDOVER");
  const [offers, setOffers] = useState<AdminPendingDriveOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<AdminDriveOfferDetail | null>(null);
  const { fail, clear, view: errorView } = useErrors();

  const load = useCallback(async () => {
    setLoading(true);
    try { setOffers(await adminGetNgoDriveOffers(status)); }
    catch (e) { setOffers([]); fail(e, "Could not load drive offers."); }
    finally { setLoading(false); }
  }, [fail, status]);
  useEffect(() => { void load(); }, [load]);

  async function open(id: number) {
    clear();
    if (detail?.id === id) { setDetail(null); return; }
    try { setDetail(await adminGetNgoDriveOffer(id)); }
    catch (e) { fail(e, "Could not load this offer."); }
  }

  const when = (v?: string | null) => (v ? new Date(v).toLocaleString() : null);
  const empty = OFFER_FILTERS.find(f => f.value === status)?.empty;

  return (
    <div className="space-y-6 text-stone-900 dark:text-stone-100">
      <label className="block text-sm font-semibold">Status
        <select className={`${field} mt-1 max-w-xs`} value={status} onChange={e => { setDetail(null); setStatus(e.target.value as AdminDriveOfferFilter); }}>
          {OFFER_FILTERS.map(f => <option key={f.value} value={f.value}>{f.text}</option>)}
        </select>
      </label>
      <p className="text-sm text-stone-500">Read only. The NGO accepts or declines each offer, and the handover starts as soon as it accepts.</p>
      {errorView}
      {loading ? <p role="status">Loading drive offers…</p> : offers.length === 0 ? <p className="text-sm text-stone-500">{empty}</p> : null}
      {offers.map(o => (
        <article key={o.id} className={card}>
          <h2 className="text-lg font-bold">{o.donorName || "Donor"} → {o.driveTitle}</h2>
          <p className="mt-1 text-sm text-stone-500">{o.ngoName} · <span className="capitalize">{label(o.status)}</span>{o.submittedAt ? ` · submitted ${new Date(o.submittedAt).toLocaleString()}` : ""}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {Object.entries({
              Offering: `${o.quantity ?? "?"} ${label(o.driveUnit)} of ${o.driveItemName ?? "items"}`,
              Condition: label(o.condition), Age: o.approximateAge, "Known defects": o.knownDefects,
              Handover: label(o.handoverMethod), "Donor city": o.donorCity,
              Compatibility: label(o.compatibilityIndicator), "Notes for NGO": o.notesForNgo,
            }).map(([name, value]) => <div key={name}><dt className="text-stone-500">{name}</dt><dd className="mt-1 break-words">{value || "Not provided"}</dd></div>)}
          </dl>
          <button className={`${button} mt-4`} aria-expanded={detail?.id === o.id} onClick={() => void open(o.id)}>
            {detail?.id === o.id ? "Hide details" : "View details"}
          </button>
          {detail?.id === o.id && (
            <section aria-label="Offer details" className="mt-4 space-y-3 border-t border-stone-200 pt-4 text-sm dark:border-zinc-700">
              {detail.photos.length > 0
                ? <div className="flex flex-wrap gap-2">{detail.photos.map((url, i) => <Photo key={url} src={url} alt={`Offer photo ${i + 1}`} />)}</div>
                : <p className="text-stone-500">No approved photos.</p>}
              {detail.handover ? (
                <dl className="grid gap-3 sm:grid-cols-2">
                  {Object.entries({
                    "Handover method": label(detail.handover.method),
                    Scheduled: when(detail.handover.scheduledAt),
                    "At risk": detail.handover.atRisk ? "Yes" : "No",
                    "Donor confirmed": when(detail.handover.donorConfirmedAt),
                    "NGO confirmed receipt": when(detail.handover.ngoConfirmedAt),
                    "Delivery OTP verified": detail.handover.otpVerified ? "Yes" : "No",
                  }).map(([name, value]) => <div key={name}><dt className="text-stone-500">{name}</dt><dd className="mt-1">{value || "Not yet"}</dd></div>)}
                </dl>
              ) : <p className="text-stone-500">No handover scheduled yet.</p>}
              {(detail.rejectionReason || detail.ngoDeclineReason) && <p><span className="text-stone-500">Reason: </span>{detail.rejectionReason || detail.ngoDeclineReason}</p>}
            </section>
          )}
        </article>
      ))}
    </div>
  );
}

/* ── Distribution proofs ─────────────────────────────────────────────────── */

export function NgoDriveProofsPanel({ onChange }: { onChange?: () => void }) {
  const [drives, setDrives] = useState<AdminProofDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const { fail, clear, view: errorView } = useErrors();

  const load = useCallback(async () => {
    setLoading(true);
    try { setDrives(await adminGetNgoDriveProofs()); }
    catch (e) { setDrives([]); fail(e, "Could not load distribution proofs."); }
    finally { setLoading(false); }
  }, [fail]);
  useEffect(() => { void load(); }, [load]);

  async function decide(drive: AdminProofDrive, approve: boolean) {
    setBusy(drive.id); clear(); setNotice("");
    try {
      if (approve) await adminApproveNgoDriveProof(drive.id);
      else await adminRejectNgoDriveProof(drive.id, (reasons[drive.id] ?? "").trim());
      setNotice(approve ? "Proof approved. The drive is fulfilled." : "Proof rejected. The NGO can see your reason and upload new photos.");
      await load();
      onChange?.();
    } catch (e) { fail(e, "Could not save the decision."); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-6 text-stone-900 dark:text-stone-100">
      {errorView}
      {notice && <p role="status" className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900">{notice}</p>}
      {loading ? <p role="status">Loading distribution proofs…</p> : drives.length === 0 ? <p className="text-sm text-stone-500">No distribution proofs are waiting for review.</p> : null}
      {drives.map(d => (
        <article key={d.id} className={card}>
          <h2 className="text-lg font-bold">{d.title}</h2>
          <p className="mt-1 text-sm text-stone-500">{d.ngoUser?.fullName}{d.distributionProofSubmittedAt ? ` · submitted ${new Date(d.distributionProofSubmittedAt).toLocaleString()}` : ""}</p>
          <p className="mt-3 text-sm">
            Received {d.quantityReceived ?? 0} of {d.quantityNeeded} {label(d.unit)} · reached {d.beneficiariesReached ?? "not reported"} {label(d.beneficiaryGroup)}
            <span className="block text-xs text-stone-500">The drive planned for about {d.beneficiaryCount}.</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {(d.distributionProofUrls || "").split("|").filter(Boolean).map((url, i) => <Photo key={url} src={url} alt={`Proof photo ${i + 1}`} />)}
          </div>
          <label className="mt-4 block text-sm">Reason (required to reject)
            <textarea className={field} rows={2} maxLength={500} value={reasons[d.id] ?? ""} disabled={busy === d.id}
              onChange={e => setReasons(prev => ({ ...prev, [d.id]: e.target.value }))} />
          </label>
          <div className="mt-3 flex gap-3">
            <button className={primary} disabled={busy === d.id} onClick={() => void decide(d, true)}>Approve</button>
            <button className={`${button} border-red-300 text-red-700`} disabled={busy === d.id} onClick={() => void decide(d, false)}>Reject</button>
          </div>
        </article>
      ))}
    </div>
  );
}
