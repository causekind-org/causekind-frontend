"use client";
import { EXTERNAL_LINK_REL, linkDomain, safeExternalUrl } from "@/lib/externalLink";
import { driveDropOffAddress } from "@/features/ngo-drives/driveFormatters";

import { categoryDetailRows } from "@/features/ngo-drives/driveCategoryDetails";
import { serverDate } from "@/lib/serverTime";
import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
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
import { formatAgeRange } from "@/features/ngo-drives/driveOfferAge";
import { formatIST, formatISTDate } from "@/lib/formatIST";
import { AdminSearchBox, NoSearchResults, matchesQuery } from "@/components/admin/AdminSearchBox";
import { AdminStatusTabs } from "@/components/admin/AdminStatusTabs";
import { DecisionLine, reviewTabs, tabOptions, useAdminStatusTabs } from "@/components/admin/useAdminStatusTabs";
import { readUrlParam, statusIndexFromUrl, writeUrlParams } from "@/components/admin/adminUrlState";
import { AdminReviewTable, BackToList, TwoLine, labelWithCount, useServerTabCounts } from "@/components/admin/AdminReviewTable";
import { useReviewParam } from "@/components/admin/useReviewParam";

/** ?q= search state for a panel; cleared from the URL when the panel unmounts. */
function useUrlQuery(): [string, (q: string) => void] {
  const [query, setQuery] = useState(() => readUrlParam("q").trim().slice(0, 100));
  useEffect(() => { writeUrlParams({ q: query || null }); }, [query]);
  useEffect(() => () => writeUrlParams({ q: null, status: null }), []);
  return [query, setQuery];
}

/** ?status= tab state over a list of options (index; default first). */
function useUrlStatus<T extends { value: string }>(options: T[], fallback: number): [number, (i: number) => void] {
  const [index, setIndex] = useState(() => statusIndexFromUrl(options, fallback));
  useEffect(() => { writeUrlParams({ status: index === fallback ? null : options[index].value }); }, [index, fallback, options]);
  return [index, setIndex];
}

const field = "w-full rounded-lg border border-stone-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const button = "rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-zinc-700";
const primary = `${button} bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900`;
const card = "rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900 sm:p-7";
const label = (value?: string | null) => (value ?? "").toLowerCase().replace(/_/g, " ");
/** As label, capitalised, for standalone values ("High", "Both") rather than units after a number. */
const labelTitle = (value?: string | null) => label(value).replace(/^\w/, (c) => c.toUpperCase());

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

/**
 * A thumbnail that opens a full-screen viewer. The viewer shows every photo in the same
 * drive / offer / proof (the nearest [data-photo-group], else the card), with Prev/Next,
 * arrow keys and Escape, so an admin can actually inspect what was uploaded.
 */
function Photo({ src, alt }: { src?: string | null; alt: string }) {
  const [gallery, setGallery] = useState<{ urls: string[]; index: number } | null>(null);
  if (!src) return null;
  function openViewer(e: ReactMouseEvent<HTMLButtonElement>) {
    const root = e.currentTarget.closest("[data-photo-group]") ?? e.currentTarget.closest("article") ?? document.body;
    const urls = [...new Set([...root.querySelectorAll<HTMLImageElement>("img[data-admin-photo]")].map((i) => i.getAttribute("src") || "").filter(Boolean))];
    setGallery({ urls: urls.length ? urls : [src!], index: Math.max(0, urls.indexOf(src!)) });
  }
  return (
    <>
      <button type="button" onClick={openViewer} aria-label={`View ${alt} full size`}
        className="group relative block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d7fd6]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img data-admin-photo src={src} alt={alt} className="h-32 w-32 cursor-zoom-in rounded-lg border border-stone-200 object-cover transition group-hover:brightness-90 dark:border-zinc-700" />
      </button>
      {gallery && <PhotoViewer urls={gallery.urls} start={gallery.index} onClose={() => setGallery(null)} />}
    </>
  );
}

function PhotoViewer({ urls, start, onClose }: { urls: string[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const n = urls.length;
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [go, onClose]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Photo viewer" data-testid="admin-photo-viewer"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4" onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
      <img src={urls[i]} alt={`Photo ${i + 1} of ${n}`} onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-[92vw] rounded-lg object-contain shadow-2xl" />
      <button type="button" aria-label="Close" onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-sm font-semibold text-stone-900 hover:bg-white">Close</button>
      {n > 1 && (
        <>
          <button type="button" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); go(-1); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-lg font-bold text-stone-900 hover:bg-white">‹</button>
          <button type="button" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); go(1); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-lg font-bold text-stone-900 hover:bg-white">›</button>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">{i + 1} / {n}</p>
        </>
      )}
    </div>,
    document.body,
  );
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
  const [statusIndex, setStatusIndex] = useUrlStatus(DRIVE_FILTERS, 0);
  const status = DRIVE_FILTERS[statusIndex].value;
  const [query, setQuery] = useUrlQuery();
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
  const [reviewId, setReviewId] = useReviewParam();
  const counts = useServerTabCounts(DRIVE_FILTERS.map(f => f.value), s => adminGetNgoDrives(s).then(r => r.length), drives);

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
  // ?review=<id> (a reload, or browser Back/Forward) opens that drive; no id shows the list.
  useEffect(() => {
    if (!reviewId) { setDetail(null); return; }
    if (detail?.id !== Number(reviewId)) void open(Number(reviewId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

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
  const shownDrives = drives.filter(x => matchesQuery(query, x.title, x.id, x.ngoUser?.fullName, (x as { ngoName?: string | null }).ngoName, x.itemName));
  return (
    <div className="space-y-6 text-stone-900 dark:text-stone-100">
      <AdminStatusTabs label="Drive status" options={DRIVE_FILTERS.map((f, i) => ({ label: labelWithCount(f.text, counts[i]) }))} selected={statusIndex}
        onSelect={i => { if (i !== statusIndex) { setStatusIndex(i); setReviewId(null); setDetail(null); } }} />
      <AdminSearchBox value={query} onChange={setQuery} label="Search drives" placeholder="Search drive title, ID, NGO name or item" />
      {errorView}
      {notice && <p role="status" className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900">{notice}</p>}
      {reviewId ? <BackToList onBack={() => setReviewId(null)} /> : (
        <section aria-label="Drives" className="min-w-0 space-y-3">
          {loading ? <p role="status">Loading drives…</p> : drives.length === 0 ? <p className="text-sm text-stone-500">No drives in this status.</p>
            : shownDrives.length === 0 ? <NoSearchResults query={query} onClear={() => setQuery("")} /> : (
            <AdminReviewTable label="Drives" rows={shownDrives} name={x => x.title} rowKey={x => x.id} highlight={x => x.status === "PENDING_REVIEW"}
              onReview={x => setReviewId(String(x.id))}
              columns={[
                { header: "Drive", cell: x => <TwoLine main={x.title} sub={(x as { ngoName?: string | null }).ngoName || x.ngoUser?.fullName} /> },
                { header: "Item", cell: x => <span className="ck-user-text">{x.itemName || "—"}</span> },
                { header: "Quantity", num: true, cell: x => `${x.quantityNeeded ?? "—"} ${label(x.unit)}` },
                { header: "Needed by", cell: x => x.neededBy || "—" },
                { header: "State", cell: x => <span className="capitalize">{label(x.status)}</span> },
              ]} />
          )}
        </section>
      )}
      {reviewId && (
        <section aria-label="Drive details" className={`min-w-0 ${card}`}>
          {!d ? <p role="status" className="text-sm text-stone-500">Loading drive…</p> : <>
            <h2 className="text-2xl font-bold ck-user-text">{d.title}</h2>
            {d.tagline && <p className="mt-1 text-sm italic text-stone-500">{d.tagline}</p>}
            <p className="mt-1 text-sm capitalize">{label(d.status)}</p>
            {ngo && (
              <p className="mt-2 text-sm">
                By <strong>{ngo.ngoName}</strong>
                {ngo.applicationId && <> · <Link className="underline" href={`/admin/dashboard?tab=ngo-applications&application=${encodeURIComponent(ngo.applicationId)}`}>
                  View NGO application ({label(ngo.applicationStatus)})</Link></>}
              </p>
            )}
            {d.locationLatitude != null && d.locationLongitude != null && (
              <div className="mt-4">
                <iframe
                  title="Drive location on the map"
                  className="h-48 w-full rounded-lg border border-stone-200 dark:border-zinc-700"
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=${d.locationLatitude},${d.locationLongitude}&z=15&output=embed`}
                />
              </div>
            )}
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              {Object.entries({
                Location: [d.locationArea, d.locationCity, d.locationPincode].filter(Boolean).join(", "),
                "Drop-off address": driveDropOffAddress(d),
                "Pickup radius": d.pickupRadiusKm != null ? `${d.pickupRadiusKm} km` : "Not set (older drive)",
                Category: d.category, Item: d.itemName, Quantity: `${d.quantityNeeded} ${label(d.unit)}`,
                "Condition accepted": [
                  driveConditionLabel(d.itemCondition),
                  driveConditionRule(d.itemCondition),
                  d.mustBeWorking ? "(Must be in working order)" : null,
                  d.requireClean ? "(Washed and clean)" : null,
                ].filter(Boolean).join(" · "),
                ...Object.fromEntries(categoryDetailRows(d.category, d.categoryDetails).map(r => [r.label, r.value])),
                Urgency: labelTitle(d.urgency),
                "People who will benefit": `${d.beneficiaryCount} · ${d.beneficiaryGroup}${d.beneficiaryDescription ? ` (${d.beneficiaryDescription})` : ""}`,
                "Needed by": d.neededBy,
                "Handover mode": labelTitle(d.handoverMode || "BOTH"),
                "Available days": (d.availableDays || "").split(",").join(", "),
                Hours: `${(d.availableFrom || "").slice(0, 5)} – ${(d.availableTo || "").slice(0, 5)}`,
                Contact: `${d.contactName} · ${d.contactPhone}`,
                "Alt contact": d.altContact,
                "Past work": safeExternalUrl(d.pastWorkUrl) && <a href={safeExternalUrl(d.pastWorkUrl)!} target="_blank" rel={EXTERNAL_LINK_REL} className="ck-user-text underline">{linkDomain(safeExternalUrl(d.pastWorkUrl)!)}</a>,
              }).filter(([, v]) => v).map(([name, value]) => <div key={name}><dt className="text-stone-500 ck-user-text">{name}</dt><dd className="mt-1 break-words ck-user-text">{value}</dd></div>)}
            </dl>
            {d.whoFor || d.whyNow || d.whatChanges ? (
              <div className="mt-5 space-y-2 text-sm border-t border-stone-100 pt-4 dark:border-zinc-800">
                <p className="text-stone-500 font-semibold">Drive Story</p>
                {d.whoFor && <div><span className="text-xs text-stone-500 font-medium">Who is this for:</span><p className="whitespace-pre-wrap">{d.whoFor}</p></div>}
                {d.whyNow && <div><span className="text-xs text-stone-500 font-medium">Why now:</span><p className="whitespace-pre-wrap ck-user-text">{d.whyNow}</p></div>}
                {d.whatChanges && <div><span className="text-xs text-stone-500 font-medium">What will change:</span><p className="whitespace-pre-wrap">{d.whatChanges}</p></div>}
              </div>
            ) : (
              <div className="mt-5 text-sm"><p className="text-stone-500">Why it&apos;s needed</p><p className="mt-1 whitespace-pre-wrap ck-user-text">{d.description}</p></div>
            )}
            {d.details && <div className="mt-4 text-sm"><p className="text-stone-500">Details</p><p className="mt-1 whitespace-pre-wrap ck-user-text">{d.details}</p></div>}
            {(d.changemakerName || d.changemakerWhy) && (
              <div className="mt-4 text-sm space-y-2 border-t border-stone-100 pt-3 dark:border-zinc-800">
                <p className="text-stone-500 font-semibold">Who is behind the drive</p>
                <div className="flex items-start gap-3">
                  {d.changemakerPhotoUrl && <Photo src={d.changemakerPhotoUrl} alt={d.changemakerName || "Changemaker"} />}
                  <div>
                    <p className="font-medium ck-user-text">{d.changemakerName} {d.changemakerRole ? `(${d.changemakerRole})` : ""}</p>
                    {d.changemakerWhy && <p className="mt-1 text-xs text-stone-600 dark:text-stone-400 italic whitespace-pre-wrap ck-user-text">{d.changemakerWhy}</p>}
                  </div>
                </div>
              </div>
            )}
            {Array.isArray(d.photos) && d.photos.length > 0 ? (
              <div className="mt-4 text-sm">
                {/* The cover is stored apart from the reference photos; show it first so the count is right. */}
                {(() => { const all = [...(d.coverPhotoUrl ? [{ url: d.coverPhotoUrl }] : []), ...d.photos]; return (<>
                <p className="mb-2 text-stone-500 font-semibold">Photos ({all.length})</p>
                <div className="flex flex-wrap gap-2">
                  {all.map((p, idx) => (
                    <div key={p.url || idx} className="relative">
                      <Photo src={p.url} alt={`Photo ${idx + 1}`} />
                      {idx === 0 && <span className="absolute bottom-1 left-1 bg-ngo-700 text-white text-[9px] px-1 py-0.5 rounded font-bold uppercase">Cover</span>}
                    </div>
                  ))}
                </div>
                </>); })()}
              </div>
            ) : d.referencePhotoUrl ? (
              <div className="mt-4 text-sm"><p className="mb-1 text-stone-500">Reference photo</p><Photo src={d.referencePhotoUrl} alt="Reference" /></div>
            ) : null}
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
      )}
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
  const [statusIndex, setStatusIndex] = useUrlStatus(OFFER_FILTERS, OFFER_FILTERS.findIndex(f => f.value === "IN_HANDOVER"));
  const status = OFFER_FILTERS[statusIndex].value;
  const [query, setQuery] = useUrlQuery();
  const [offers, setOffers] = useState<AdminPendingDriveOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<AdminDriveOfferDetail | null>(null);
  const { fail, clear, view: errorView } = useErrors();
  const [reviewId, setReviewId] = useReviewParam();
  const counts = useServerTabCounts(OFFER_FILTERS.map(f => f.value), s => adminGetNgoDriveOffers(s).then(r => r.length), offers);

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
  // Review opens the offer with its photos and handover already loaded.
  useEffect(() => {
    if (!reviewId) { setDetail(null); return; }
    if (detail?.id !== Number(reviewId)) void open(Number(reviewId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewId]);

  const when = (v?: string | null) => (v ? new Date(v).toLocaleString() : null);
  const empty = OFFER_FILTERS.find(f => f.value === status)?.empty;
  const shownOffers = offers.filter(o => matchesQuery(query, o.donorName, o.ngoName, o.driveTitle, o.id));
  const reviewing = reviewId ? offers.filter(o => String(o.id) === reviewId) : [];

  return (
    <div className="space-y-6 text-stone-900 dark:text-stone-100">
      <AdminStatusTabs label="Status" options={OFFER_FILTERS.map((f, i) => ({ label: labelWithCount(f.text, counts[i]) }))} selected={statusIndex}
        onSelect={i => { if (i !== statusIndex) { setReviewId(null); setDetail(null); setStatusIndex(i); } }} />
      <AdminSearchBox value={query} onChange={setQuery} label="Search drive offers" placeholder="Search donor, NGO, drive title or offer ID" />
      <p className="text-sm text-stone-500">Read only. The NGO accepts or declines each offer, and the handover starts as soon as it accepts.</p>
      {errorView}
      {reviewId && <BackToList onBack={() => setReviewId(null)} />}
      {loading ? <p role="status">Loading drive offers…</p> : reviewId ? (reviewing.length === 0 ? <p className="text-sm text-stone-500">This offer is not in this list.</p> : null)
        : offers.length === 0 ? <p className="text-sm text-stone-500">{empty}</p>
        : shownOffers.length === 0 ? <NoSearchResults query={query} onClear={() => setQuery("")} /> : (
        <AdminReviewTable label="Drive offers" rows={shownOffers} name={o => `${o.donorName || "Donor"} → ${o.driveTitle}`} rowKey={o => o.id} onReview={o => setReviewId(String(o.id))}
          columns={[
            { header: "Donor → drive", cell: o => <TwoLine main={`${o.donorName || "Donor"} → ${o.driveTitle}`} sub={o.ngoName} /> },
            { header: "Offering", cell: o => `${o.quantity ?? "?"} ${label(o.driveUnit)} of ${o.driveItemName ?? "items"}` },
            { header: "Submitted", cell: o => (o.submittedAt ? serverDate(o.submittedAt).toLocaleString() : "—") },
            { header: "State", cell: o => <span className="capitalize">{label(o.status)}</span> },
          ]} />
      )}
      {reviewing.map(o => (
        <article key={o.id} className={card}>
          <h2 className="text-lg font-bold">{o.donorName || "Donor"} → {o.driveTitle}</h2>
          <p className="mt-1 text-sm text-stone-500 ck-user-text">{o.ngoName} · <span className="capitalize">{label(o.status)}</span>{o.submittedAt ? ` · submitted ${serverDate(o.submittedAt).toLocaleString()}` : ""}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {([
              ["Offering", `${o.quantity ?? "?"} ${label(o.driveUnit)} of ${o.driveItemName ?? "items"}`],
              ["Condition", label(o.condition)],
              ["Item age", formatAgeRange(o.ageRange) || o.approximateAge],
              ["Size / spec", o.sizeSpec],
              ["Tested working", o.confirmedWorking != null ? (
                o.confirmedWorking ? (
                  <span className="inline-flex items-center gap-1.5 text-stone-800 dark:text-stone-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                    Tested and works
                  </span>
                ) : "No"
              ) : undefined],
              ["Washed & clean", o.confirmedClean != null ? (
                o.confirmedClean ? (
                  <span className="inline-flex items-center gap-1.5 text-stone-800 dark:text-stone-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                    Washed and clean
                  </span>
                ) : "No"
              ) : undefined],
              ["Known defects", o.knownDefects],
              ["Handover", label(o.handoverMethod)],
              ["Donor city", o.donorCity],
              ["Compatibility", label(o.compatibilityIndicator)],
              ["Notes for NGO", o.notesForNgo],
            ] as [string, React.ReactNode][]).filter(([_, value]) => value !== undefined).map(([name, value]) => (
              <div key={name}>
                <dt className="text-stone-500 ck-user-text">{name}</dt>
                <dd className="mt-1 break-words">{value || "Not provided"}</dd>
              </div>
            ))}
          </dl>
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
                  }).map(([name, value]) => <div key={name}><dt className="text-stone-500 ck-user-text">{name}</dt><dd className="mt-1">{value || "Not yet"}</dd></div>)}
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

const PROOF_TABS = reviewTabs("Waiting for review", "Rejected");
const proofStatus = (d: AdminProofDrive) => d.proofDecision ?? "PENDING";

export function NgoDriveProofsPanel({ onChange }: { onChange?: () => void }) {
  const [drives, setDrives] = useState<AdminProofDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [confirmApprove, setConfirmApprove] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const { index: statusIndex, setIndex: setStatusIndex, tab, query, setQuery } = useAdminStatusTabs(PROOF_TABS);
  const [enlarged, setEnlarged] = useState<string | null>(null);
  const { fail, clear, view: errorView } = useErrors();
  const [reviewId, setReviewId] = useReviewParam();

  // Every proof (waiting and decided) once: the tab counts and lists come from the same rows.
  const load = useCallback(async () => {
    setLoading(true);
    try { setDrives(await adminGetNgoDriveProofs("ALL")); }
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

  const inTab = drives.filter(x => tab.matches(proofStatus(x)));
  const shownProofs = inTab.filter(x => matchesQuery(query, x.ngoName, x.ngoUser?.fullName, x.title, x.id));
  const reviewing = reviewId ? drives.filter(x => String(x.id) === reviewId) : [];
  return (
    <div className="space-y-6 text-stone-900 dark:text-stone-100">
      {enlarged && (
        <div role="dialog" aria-modal="true" aria-label="Proof photo" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setEnlarged(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
          <img src={enlarged} alt="Proof photo, enlarged" className="max-h-[85vh] max-w-full rounded-lg object-contain" />
          <button type="button" className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-stone-900" onClick={() => setEnlarged(null)}>Close</button>
        </div>
      )}
      {errorView}
      {notice && <p role="status" className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900">{notice}</p>}
      <AdminStatusTabs label="Proof status" options={tabOptions(PROOF_TABS, drives, proofStatus)} selected={statusIndex} onSelect={i => { setReviewId(null); setStatusIndex(i); }} />
      <AdminSearchBox value={query} onChange={setQuery} label="Search distribution proofs" placeholder="Search NGO name, drive title or drive ID" />
      {reviewId && <BackToList onBack={() => setReviewId(null)} />}
      {loading ? <p role="status">Loading distribution proofs…</p> : reviewId ? null
        : inTab.length === 0 ? <p className="text-sm text-stone-500">{statusIndex === 0 ? "No distribution proofs are waiting for review." : "Nothing here."}</p>
        : shownProofs.length === 0 ? <NoSearchResults query={query} onClear={() => setQuery("")} /> : (
        <AdminReviewTable label="Distribution proofs" rows={shownProofs} name={d => d.title} rowTestId="proof-row" rowKey={d => `${d.id}-${d.proofDecidedAt ?? "waiting"}`}
          highlight={d => !d.proofDecision} onReview={d => setReviewId(String(d.id))}
          columns={[
            { header: "Drive", cell: d => <TwoLine main={d.title} sub={d.ngoName || d.ngoUser?.fullName} /> },
            { header: "Received / distributed", cell: d => `${d.quantityReceived ?? 0} / ${d.proofQuantityDistributed ?? "—"} ${label(d.unit)}` },
            { header: "Submitted", cell: d => formatIST(d.distributionProofSubmittedAt) || "—" },
            { header: "State", cell: d => (d.proofDecision === "APPROVED" ? "Approved" : d.proofDecision === "REJECTED" ? "Rejected" : "Waiting for review") },
          ]} />
      )}
      {reviewing.map(d => (
        <article key={`${d.id}-${d.proofDecidedAt ?? "waiting"}`} className={card} data-testid="proof-card">
          <ProofDetails d={d} onEnlarge={setEnlarged} />
          {d.proofDecision ? (
            <DecisionLine status={d.proofDecision} by={d.proofDecidedBy} at={d.proofDecidedAt} reason={d.proofDecisionReason} rejectedText="Rejected" />
          ) : <>
          <label className="mt-4 block text-sm">Reason (required to reject)
            <textarea className={field} rows={2} maxLength={500} value={reasons[d.id] ?? ""} disabled={busy === d.id}
              onChange={e => setReasons(prev => ({ ...prev, [d.id]: e.target.value }))} />
          </label>
          {confirmApprove === d.id ? (
            // Approving closes the drive as fulfilled and publishes the photos: ask once before it happens.
            <div className="mt-3 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-900 dark:border-green-800 dark:bg-green-950/30 dark:text-green-100" data-testid="proof-approve-confirm">
              <p className="font-semibold">Approve this proof? The drive becomes fulfilled and the photos go on its public page.</p>
              <div className="mt-2 flex gap-3">
                <button className={primary} disabled={busy === d.id} onClick={() => { setConfirmApprove(null); void decide(d, true); }}>Yes, approve</button>
                <button className={button} disabled={busy === d.id} onClick={() => setConfirmApprove(null)}>Cancel</button>
              </div>
            </div>
          ) : (
          <div className="mt-3 flex gap-3">
            <button className={primary} disabled={busy === d.id} onClick={() => setConfirmApprove(d.id)}>Approve</button>
            <button className={`${button} border-red-300 text-red-700`} disabled={busy === d.id} onClick={() => void decide(d, false)}>Reject</button>
          </div>
          )}
          </>}
        </article>
      ))}
    </div>
  );
}

/** Everything the NGO submitted with its distribution proof, as in its own drive report. */
export function ProofDetails({ d, onEnlarge }: { d: AdminProofDrive; onEnlarge: (url: string) => void }) {
  const photos = d.proofPhotoUrls?.length ? d.proofPhotoUrls : (d.distributionProofUrls || "").split("|").filter(Boolean);
  const unit = label(d.unit);
  const yesNo = (v?: boolean | null) => (v == null ? "Not reported" : v ? "Yes" : "No");
  const rows: [string, React.ReactNode][] = [
    ["Drive", <>{d.title} <span className="text-stone-500">· #{d.id}</span></>],
    ["NGO", d.ngoName || d.ngoUser?.fullName || "Not provided"],
    ["Collection dates", [d.collectionStartedAt || d.liveAt || d.createdAt, d.collectionCompletedAt].some(Boolean)
      ? `${formatISTDate(d.collectionStartedAt || d.liveAt || d.createdAt) || "?"} – ${formatISTDate(d.collectionCompletedAt) || "ongoing"}` : "Not recorded"],
    ["Quantity needed / received", `${d.quantityNeeded ?? "?"} / ${d.quantityReceived ?? 0} ${unit}`],
    ["People reached", d.beneficiariesReached != null ? `${d.beneficiariesReached} ${label(d.beneficiaryGroup)} (planned about ${d.beneficiaryCount})` : "Not reported"],
    ["Quantity distributed", d.proofQuantityDistributed != null ? `${d.proofQuantityDistributed} ${unit}` : "Not reported"],
    ["Distribution date", formatISTDate(d.proofDistributedOn) || "Not reported"],
    ["Location", d.proofLocation || "Not reported"],
    ["Note", d.proofNote || "None"],
    ["Faces blurred / consent confirmed", d.proofFacesBlurred != null && d.proofFacesBlurred !== d.proofConsentConfirmed
      ? `Faces blurred: ${yesNo(d.proofFacesBlurred)} · Consent: ${yesNo(d.proofConsentConfirmed)}` : yesNo(d.proofConsentConfirmed ?? d.proofFacesBlurred)],
    ["Submitted at", formatIST(d.distributionProofSubmittedAt) || "Not recorded"],
  ];
  const rejection = d.previousProofRejectionReason || d.previousRejectionReason || d.proofRejectionReason;
  const donors = d.proofDonors?.length ? d.proofDonors : (d.donors ?? []);
  return (
    <>
      <h2 className="text-lg font-bold ck-user-text">{d.title}</h2>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2" data-testid="proof-fields">
        {rows.map(([name, value]) => <div key={name}><dt className="text-stone-500 ck-user-text">{name}</dt><dd className="mt-1 whitespace-pre-wrap break-words ck-user-text">{value}</dd></div>)}
      </dl>
      {rejection && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><strong>Previous rejection reason:</strong> {rejection}</p>}
      <p className="mt-4 text-sm font-semibold text-stone-500">Photos ({photos.length})</p>
      <div className="mt-2 flex flex-wrap gap-3">
        {photos.map((url, i) => (
          <button key={url} type="button" aria-label={`Enlarge proof photo ${i + 1}`} onClick={() => onEnlarge(url)}>
            {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
            <img src={url} alt={`Proof photo ${i + 1}`} className="h-32 w-32 cursor-zoom-in rounded-lg border border-stone-200 object-cover dark:border-zinc-700" />
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm font-semibold text-stone-500">Donors</p>
      {donors.length === 0 ? <p className="text-sm text-stone-500">No donor list sent.</p> : (
        <ul className="mt-1 divide-y divide-stone-100 text-sm dark:divide-zinc-800" data-testid="proof-donors">
          {donors.map((x, i) => (
            <li key={x.offerId ?? i} className="py-2">
              <span className="font-semibold ck-user-text">{x.donorName}</span> · {x.quantity ?? "—"} {unit} · received {formatISTDate(x.receivedAt) || "—"}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
