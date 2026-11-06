"use client";

import { useState, type ReactNode } from "react";
import {
  AlertTriangle, ExternalLink, FileText, History, Link2, Mail, MapPin, MessageSquare, Package, Phone, ShieldCheck, Truck, UserRound,
} from "lucide-react";
import {
  adminGenerateNonDeliveryConfirmation, adminUpdateReturnPickup, downloadNonDeliveryConfirmation,
  type AdminNonDeliveryCase, type AdminRepeatFlag,
  type AdminChatLine, type AdminDamageCase, type AdminIssueDetail, type AdminIssueLink, type AdminIssueParty, type AdminPurchaseCase,
  type IssueStatus, type ReturnPickupStatus,
} from "@/lib/api";
import { toast } from "@/lib/toast";
import { DamageGallery } from "@/features/purchase/DamageReport";
import { serverDate } from "@/lib/serverTime";
import { PartialDeliveryResolver } from "@/features/purchase/PartialDeliveryResolver";

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  OPEN: "Open",
  AWAITING_DONEE_INFO: "Awaiting donee info",
  PACKAGE_FOUND: "Package found",
  DONOR_REDONATING: "Donor re-donating",
  REPLACEMENT_IN_PROGRESS: "Replacement in progress",
  LATE_ARRIVAL_REPORTED: "Late arrival reported",
  DISPUTED: "Disputed",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};
const ISSUE_STATUS_TONE: Record<IssueStatus, string> = {
  OPEN: "bg-amber-100 text-amber-900 ring-amber-200",
  AWAITING_DONEE_INFO: "bg-sky-100 text-sky-900 ring-sky-200",
  PACKAGE_FOUND: "bg-teal-100 text-teal-900 ring-teal-200",
  LATE_ARRIVAL_REPORTED: "bg-sky-100 text-sky-900 ring-sky-200",
  DISPUTED: "bg-rose-100 text-rose-900 ring-rose-200",
  DONOR_REDONATING: "bg-violet-100 text-violet-900 ring-violet-200",
  REPLACEMENT_IN_PROGRESS: "bg-indigo-100 text-indigo-900 ring-indigo-200",
  RESOLVED: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  CLOSED: "bg-stone-100 text-stone-700 ring-stone-200",
};

/** `redelivery`: on a nothing-arrived issue the in-progress state is a redelivery, not a replacement. */
export function IssueStatusBadge({ status, redelivery = false }: { status: IssueStatus; redelivery?: boolean }) {
  const label = redelivery && status === "REPLACEMENT_IN_PROGRESS" ? "Redelivery in progress" : ISSUE_STATUS_LABEL[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-2xs font-bold ring-1 ${ISSUE_STATUS_TONE[status]}`}>{label}</span>;
}

/** Admin-only, information only: never shown to users and never blocks anyone. */
export function RepeatFlagBadge({ flag, who }: { flag: AdminRepeatFlag | null | undefined; who: "Donor" | "Donee" }) {
  if (!flag?.flagged) return null;
  return (
    <details className="inline-block align-middle">
      <summary className="cursor-pointer list-none rounded-full bg-rose-50 px-2.5 py-0.5 text-2xs font-bold text-rose-800 ring-1 ring-rose-200">
        ⚑ {who}: repeat claims ({flag.count})
      </summary>
      <div className="mt-1 max-w-xs rounded-xl border border-rose-200 bg-white p-2.5 text-xs text-stone-700 shadow-sm">
        <p>{flag.reason}. For information only; it never blocks anyone.</p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {flag.keys.map(k => (
            <li key={k}>
              {k.startsWith("pdi-")
                ? <a href={`/admin/dashboard?tab=issues&issue=${k}`} className="font-semibold text-[#b04a15] underline">Issue #{k.slice(4)}</a>
                : <span className="text-stone-500">Offer #{k.replace("offer-", "")} (not received yet)</span>}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

const OUTCOME_LABEL: Record<string, string> = {
  ALL: "Everything arrived", PARTIAL: "Only part arrived", DAMAGED: "Damaged or wrong items", NOT_ARRIVED: "Nothing arrived",
};
const ACTION_LABEL: Record<string, string> = {
  OPENED: "Issue opened", DONOR_REDONATE: "Donor will donate again", REDELIVERED: "Remaining items delivered",
  CLOSE_UNREACHABLE: "Closed: donor unreachable / not willing", CLOSE_REDONATION: "Closed while re-donating",
  REDONATION_COMPLETED: "Donor's new pledge completed", REQUEST_INFO: "Asked for more information",
  INFO_REPLY: "Answer received", INFO_UPLOAD: "More evidence added",
  VERIFY_DAMAGE: "Damage verified", RECLASSIFY: "Reclassified as usable", REPLACEMENT_IN_PROGRESS: "Replacement in progress",
  RETURN_PICKUP_NOT_NEEDED: "Return pickup: not needed", RETURN_PICKUP_SCHEDULED: "Return pickup: scheduled",
  RETURN_PICKUP_PICKED_UP: "Return pickup: picked up",
  PACKAGE_FOUND: "Package found later", CLOSE_DISPUTED: "Closed as disputed", CONFIRMATION_GENERATED: "Non-delivery confirmation generated",
  LATE_ARRIVAL_REPORTED: "Late arrival reported", LATE_ARRIVAL_CONFIRM: "Late arrival confirmed", LATE_ARRIVAL_DISMISS: "Late arrival dismissed",
};

function when(value: string | null | undefined): string {
  if (!value) return "—";
  const d = serverDate(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function Section({ title, icon, children, aside }: { title: string; icon?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-stone-500">{icon}{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Secondary detail stays folded until someone asks for it. */
function Fold({ title, count, icon, children, open = false }: { title: string; count?: number; icon?: ReactNode; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded-3xl border border-stone-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <span className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-stone-500">{icon}{title}{count != null && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-2xs text-stone-600">{count}</span>}</span>
        <span className="text-xs font-bold text-[#b04a15] group-open:hidden">Show</span>
        <span className="hidden text-xs font-bold text-[#b04a15] group-open:inline">Hide</span>
      </summary>
      <div className="border-t border-stone-100 px-5 py-4 sm:px-6">{children}</div>
    </details>
  );
}

function Tile({ label, value, tone = "plain", hint }: { label: string; value: ReactNode; tone?: "plain" | "green" | "amber" | "blue" | "yellow" | "red" | "grey"; hint?: string }) {
  const tones = {
    plain: "bg-stone-50 text-stone-900 ring-stone-200",
    green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    blue: "bg-sky-50 text-sky-800 ring-sky-200",
    yellow: "bg-yellow-50 text-yellow-800 ring-yellow-200",
    red: "bg-red-50 text-red-800 ring-red-200",
    grey: "bg-stone-100 text-stone-600 ring-stone-200",
  } as const;
  return (
    <div className={`rounded-2xl px-4 py-3 ring-1 ${tones[tone]}`}>
      <dt className="text-2xs font-bold uppercase tracking-wide opacity-70">{label}</dt>
      <dd className="mt-1 text-2xl font-black tabular-nums">{value}</dd>
      {hint && <p className="mt-0.5 text-2xs opacity-70">{hint}</p>}
    </div>
  );
}

function PartyCard({ label, p, flag }: { label: "Donor" | "Donee"; p: AdminIssueParty | null; flag?: AdminRepeatFlag | null }) {
  return (
    <div className="rounded-2xl border border-stone-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-2xs font-bold uppercase tracking-wide text-stone-500">{label}</p>
        <RepeatFlagBadge flag={flag} who={label} />
      </div>
      <p className="mt-1 text-base font-bold text-stone-900">{label}: {p?.name ?? "Unknown"}</p>
      <ul className="mt-3 space-y-1.5 text-sm">
        {p?.phone && (
          <li><a href={`tel:${p.phone}`} className="inline-flex items-center gap-2 font-semibold text-stone-800 hover:text-[#b04a15]"><Phone className="h-4 w-4 text-stone-400" aria-hidden />{p.phone}</a></li>
        )}
        {p?.email && (
          <li className="min-w-0"><a href={`mailto:${p.email}`} className="inline-flex min-w-0 items-center gap-2 font-semibold text-stone-800 hover:text-[#b04a15]"><Mail className="h-4 w-4 shrink-0 text-stone-400" aria-hidden /><span className="truncate">{p.email}</span></a></li>
        )}
        {p?.city && <li className="inline-flex items-center gap-2 text-stone-600"><MapPin className="h-4 w-4 text-stone-400" aria-hidden />{p.city}</li>}
        {!p?.phone && !p?.email && <li className="text-stone-500">No contact details on file.</li>}
      </ul>
      {p?.userId != null && (
        <a href={`/admin/dashboard?journeyUser=${p.userId}`} className="mt-3 inline-block text-xs font-bold text-[#b04a15] underline">User journey</a>
      )}
    </div>
  );
}

const LINK_ICON: Record<AdminIssueLink["kind"], ReactNode> = {
  REQUEST: <Link2 className="h-4 w-4" aria-hidden />,
  PRODUCT: <Package className="h-4 w-4" aria-hidden />,
  TRACKING: <Truck className="h-4 w-4" aria-hidden />,
  ORDER_PROOF: <FileText className="h-4 w-4" aria-hidden />,
  DELIVERY_PROOF: <ShieldCheck className="h-4 w-4" aria-hidden />,
  EVIDENCE: <FileText className="h-4 w-4" aria-hidden />,
};

/** Links as chips with a plain label: raw URLs are never shown. */
function LinkChips({ links }: { links: AdminIssueLink[] }) {
  if (!links.length) return <p className="text-sm text-stone-500">No links or proofs on file.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l, i) => (
        <a key={`${l.kind}-${i}`} href={l.url} target="_blank" rel="noopener noreferrer nofollow"
          className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-bold transition-colors ${
            l.kind === "DELIVERY_PROOF" || l.kind === "ORDER_PROOF"
              ? "border-[#b04a15]/30 bg-orange-50 text-[#b04a15] hover:bg-orange-100"
              : "border-stone-200 bg-white text-stone-800 hover:border-stone-400"}`}>
          {LINK_ICON[l.kind]} {l.label} <ExternalLink className="h-3.5 w-3.5 opacity-60" aria-hidden />
        </a>
      ))}
    </div>
  );
}

const SENDER: Record<AdminChatLine["senderRole"], string> = { DONOR: "Donor", DONEE: "Donee", ADMIN: "CauseKind team" };

function ChatTranscript({ lines }: { lines: AdminChatLine[] }) {
  if (!lines.length) return <p className="text-sm text-stone-500">No messages.</p>;
  return (
    <ol className="space-y-2.5">
      {lines.map((l, i) => l.type === "SYSTEM" ? (
        <li key={i} className="text-center text-xs text-stone-500">
          <span className="rounded-full bg-stone-100 px-3 py-1">{l.text}</span> <span className="ms-1">{when(l.at)}</span>
        </li>
      ) : (
        <li key={i} className={`rounded-2xl px-3.5 py-2.5 text-sm ${l.type === "DELIVERY_UPDATE" ? "border border-amber-200 bg-amber-50" : l.senderRole === "DONOR" ? "bg-sky-50" : l.senderRole === "DONEE" ? "bg-stone-50" : "bg-violet-50"}`}>
          <p className="text-2xs font-bold text-stone-500">
            {SENDER[l.senderRole]}: {l.senderName ?? "Unknown"} · {when(l.at)}{l.type === "DELIVERY_UPDATE" ? " · Delivery update" : ""}
          </p>
          <p className="mt-0.5 whitespace-pre-line text-stone-800">{l.text}</p>
        </li>
      ))}
    </ol>
  );
}

/**
 * A purchase issue on one calm screen: request, quantities, both parties with
 * contacts, proofs as chips, the resolution actions, then the chat, delivery
 * updates and history folded below. Every title carries its label.
 */
export function PurchaseIssueCase({ d, purchase, decidable, onDecided, extra }: {
  d: AdminIssueDetail;
  purchase: AdminPurchaseCase;
  decidable: boolean;
  onDecided: () => void;
  /** Anything else this issue carries (legacy resolver, sections, evidence, support case). */
  extra?: ReactNode;
}) {
  const s = d.summary;
  const outcome = purchase.deliveryOutcome ? OUTCOME_LABEL[purchase.deliveryOutcome] : null;
  return (
    <div className="space-y-5">
      <header className="space-y-3 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <IssueStatusBadge status={purchase.issueStatus} redelivery={!!purchase.nonDelivery && !purchase.damage} />
          <RepeatFlagBadge flag={purchase.donorFlag} who="Donor" />
          <RepeatFlagBadge flag={purchase.doneeFlag} who="Donee" />
          {outcome && <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-2xs font-bold text-stone-700">{outcome}</span>}
          {s.caseNumber && <span className="font-mono text-2xs text-stone-500">{s.caseNumber}</span>}
          <span className="text-2xs text-stone-500">Offer #{purchase.offerId} · opened {when(s.createdAt)}</span>
        </div>
        <h2 className="text-xl font-black text-stone-900 sm:text-2xl">Request: {purchase.requestTitle ?? "Untitled request"}</h2>
        <p className="text-sm text-stone-600"><span className="font-bold text-stone-800">Issue:</span> {s.description ?? "No description given."}</p>
      </header>

      <Section title="Quantities" icon={<Package className="h-4 w-4" aria-hidden />}>
        {purchase.damage ? <DamageTiles purchase={purchase} damage={purchase.damage} />
          : purchase.nonDelivery?.stillNothingArrived ? (
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Tile label="Pledged" value={purchase.pledged ?? "—"} tone="blue" />
              <Tile label="Received" value={purchase.received ?? 0} tone="red" />
              <Tile label="Still needed on request" value={purchase.stillNeededOnRequest} />
            </dl>
          ) : (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Tile label="Requested" value={purchase.requested} />
          <Tile label="Pledged" value={purchase.pledged ?? "—"} tone="blue" />
          <Tile label="Received" value={purchase.received ?? "—"} tone="green"
            hint={(purchase.redelivered ?? 0) > 0 ? `incl. ${purchase.redelivered} after the issue` : undefined} />
          <Tile label="Shortfall" value={purchase.shortfall ?? "—"} tone="amber" />
          <Tile label="Still needed on request" value={purchase.stillNeededOnRequest}
            hint={purchase.openOnRequest !== purchase.stillNeededOnRequest ? `${purchase.openOnRequest} not yet pledged` : undefined} />
        </dl>
        )}
      </Section>

      {purchase.damage && <DamageSection damage={purchase.damage} offerId={purchase.offerId} onChanged={onDecided} />}
      {purchase.nonDelivery && <NonDeliverySection nd={purchase.nonDelivery} purchase={purchase} onChanged={onDecided} />}

      <Section title="People" icon={<UserRound className="h-4 w-4" aria-hidden />}
        aside={<span className="text-2xs text-stone-400">Contacts are visible to admins only</span>}>
        <div className="grid gap-3 md:grid-cols-2">
          <PartyCard label="Donor" p={purchase.donor} flag={purchase.donorFlag} />
          <PartyCard label="Donee" p={purchase.donee} flag={purchase.doneeFlag} />
        </div>
      </Section>

      <Section title="Proofs and links" icon={<Link2 className="h-4 w-4" aria-hidden />}
        aside={<span className="text-2xs text-stone-400">Private files expire after 10 minutes; reload for fresh links</span>}>
        <LinkChips links={purchase.links} />
        {purchase.expectedDeliveryAt && <p className="mt-3 text-xs text-stone-500">Latest expected delivery: {when(purchase.expectedDeliveryAt)}</p>}
      </Section>

      {decidable && (purchase.partialDelivery || purchase.damage || purchase.nonDelivery) && (
        <Section title="Resolution" icon={<ShieldCheck className="h-4 w-4 text-[#b04a15]" aria-hidden />}>
          <PartialDeliveryResolver purchase={purchase} onDone={onDecided} />
        </Section>
      )}
      {d.resolution && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Resolution so far</p>
          <p className="mt-1 whitespace-pre-line text-sm text-emerald-950">{d.resolution}</p>
        </div>
      )}

      <Fold title="Delivery date updates" count={purchase.deliveryUpdates.length} icon={<Truck className="h-4 w-4" aria-hidden />}>
        <ChatTranscript lines={purchase.deliveryUpdates} />
      </Fold>
      <Fold title="Chat" count={purchase.chat.length} icon={<MessageSquare className="h-4 w-4" aria-hidden />}>
        <ChatTranscript lines={purchase.chat} />
      </Fold>
      <Fold title="Issue timeline" count={purchase.steps.length} icon={<History className="h-4 w-4" aria-hidden />} open={purchase.steps.length > 1}>
        {purchase.steps.length === 0 ? <p className="text-sm text-stone-500">Nothing recorded yet.</p> : (
          <ol className="relative space-y-3 border-s border-stone-200 ps-4">
            {purchase.steps.map((st, i) => (
              <li key={i} className="relative">
                <span aria-hidden className="absolute -start-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#b04a15]" />
                <p className="text-2xs font-bold uppercase tracking-wide text-stone-500">{when(st.at)} · {st.actor}</p>
                <p className="text-sm font-bold text-stone-900">{ACTION_LABEL[st.action] ?? st.action}</p>
                {st.note && <p className="mt-0.5 whitespace-pre-line text-sm text-stone-700">{st.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </Fold>
      {extra}
      {!purchase.partialDelivery && !purchase.damage && !purchase.nonDelivery && decidable && (
        <p className="flex items-center gap-1.5 text-xs text-stone-500"><AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Damaged and not-arrived resolutions are decided with the existing options below.</p>
      )}
    </div>
  );
}

function DamageTiles({ purchase, damage }: { purchase: AdminPurchaseCase; damage: AdminDamageCase }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      <Tile label="Pledged" value={purchase.pledged ?? "—"} tone="blue" />
      <Tile label="Arrived" value={damage.arrived} />
      <Tile label="Good" value={damage.good} tone="green" />
      <Tile label="Minor damage (usable)" value={damage.minorDamage} tone="yellow"
        hint={damage.reclassified > 0 ? `incl. ${damage.reclassified} reclassified` : undefined} />
      <Tile label="Unusable" value={damage.unusable} tone="red" />
      <Tile label="Missing" value={damage.missing} tone="grey" />
      <Tile label="Still needed on request" value={purchase.stillNeededOnRequest}
        hint={(purchase.redelivered ?? 0) > 0 ? `${purchase.redelivered} replaced` : undefined} />
    </dl>
  );
}

const PICKUP_LABEL: Record<ReturnPickupStatus, string> = { NOT_NEEDED: "Not needed", SCHEDULED: "Scheduled", PICKED_UP: "Picked up" };

/** The donee's photos and video, our team's review so far, and the return pickup. */
function DamageSection({ damage, offerId, onChanged }: { damage: AdminDamageCase; offerId: number; onChanged: () => void }) {
  return (
    <Section title="Damage" icon={<AlertTriangle className="h-4 w-4 text-red-600" aria-hidden />}
      aside={damage.verifiedAt
        ? <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-2xs font-bold text-emerald-800 ring-1 ring-emerald-200">Verified · {when(damage.verifiedAt)}</span>
        : <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-2xs font-bold text-amber-800 ring-1 ring-amber-200">Not yet reviewed</span>}>
      <DamageGallery items={damage.gallery.map(g => ({ kind: g.kind, label: g.label, url: g.url, status: g.status }))} />
      {damage.infoRequest && (
        <div className="mt-4 space-y-1 rounded-2xl bg-sky-50 p-3 text-sm text-sky-950">
          <p><strong>Asked:</strong> {damage.infoRequest}</p>
          <p><strong>Donee answered:</strong> {damage.infoReply ?? "Not yet"}</p>
        </div>
      )}
      <ReturnPickupControl offerId={offerId} damage={damage} onChanged={onChanged} />
    </Section>
  );
}

function ReturnPickupControl({ offerId, damage, onChanged }: { offerId: number; damage: AdminDamageCase; onChanged: () => void }) {
  const [status, setStatus] = useState<ReturnPickupStatus>(damage.returnPickupStatus ?? "SCHEDULED");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ok = note.trim().length >= 10;
  return (
    <div className="mt-4 rounded-2xl border border-stone-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-stone-900">
          Return pickup: {damage.returnPickupStatus ? PICKUP_LABEL[damage.returnPickupStatus] : "Not set"}
        </p>
        {!open && <button type="button" onClick={() => setOpen(true)} className="text-xs font-bold text-[#b04a15] underline">Update</button>}
      </div>
      {damage.returnPickupNote && <p className="mt-1 text-sm text-stone-600">{damage.returnPickupNote}</p>}
      {open && (
        <div className="mt-3 space-y-2">
          <select value={status} onChange={e => setStatus(e.target.value as ReturnPickupStatus)} aria-label="Pickup status"
            className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm">
            {(Object.keys(PICKUP_LABEL) as ReturnPickupStatus[]).map(k => <option key={k} value={k}>{PICKUP_LABEL[k]}</option>)}
          </select>
          <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} maxLength={2000} aria-label="Pickup note"
            placeholder={status === "SCHEDULED" ? "What the donee is told: when and how the seller collects the items." : "Admin note for the timeline."}
            className="block w-full rounded-xl border border-stone-300 p-2.5 text-sm" />
          <p className="text-2xs text-stone-500">Required, at least 10 characters. A scheduled pickup notifies the donee; the donor&apos;s contact is never shared.</p>
          <button type="button" disabled={!ok || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await adminUpdateReturnPickup(offerId, { status, note: note.trim() });
                toast.success("Return pickup updated");
                setOpen(false); setNote("");
                onChanged();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could not update the pickup");
              } finally {
                setBusy(false);
              }
            }}
            className="inline-flex min-h-10 items-center rounded-xl bg-[#b04a15] px-3.5 text-sm font-bold text-white disabled:opacity-50">
            Save pickup
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * A nothing-arrived report: delivery chips (proof or "Not submitted", latest expected
 * date, when "not received yet" was marked), the donee's checklist and declaration,
 * the non-delivery confirmation, and any late arrival reported after closure.
 */
function NonDeliverySection({ nd, purchase, onChanged }: { nd: AdminNonDeliveryCase; purchase: AdminPurchaseCase; onChanged: () => void }) {
  const orderProof = purchase.links.find(l => l.kind === "ORDER_PROOF");
  const deliveryProof = purchase.links.find(l => l.kind === "DELIVERY_PROOF");
  const chip = "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold ring-1";
  return (
    <Section title="Nothing arrived" icon={<Truck className="h-4 w-4" aria-hidden />}>
      <div className="flex flex-wrap gap-2">
        {orderProof
          ? <a href={orderProof.url} target="_blank" rel="noopener noreferrer nofollow" className={`${chip} bg-orange-50 text-[#b04a15] ring-[#b04a15]/30`}><FileText className="h-4 w-4" aria-hidden /> Order proof</a>
          : <span className={`${chip} bg-stone-100 text-stone-600 ring-stone-200`}>Order proof: none</span>}
        {deliveryProof
          ? <a href={deliveryProof.url} target="_blank" rel="noopener noreferrer nofollow" className={`${chip} bg-orange-50 text-[#b04a15] ring-[#b04a15]/30`}><ShieldCheck className="h-4 w-4" aria-hidden /> Delivery proof</a>
          : <span className={`${chip} bg-red-50 text-red-700 ring-red-200`}>Delivery proof: Not submitted</span>}
        <span className={`${chip} bg-stone-50 text-stone-800 ring-stone-200`}>Latest expected: {when(purchase.expectedDeliveryAt)}</span>
        {nd.notReceivedYetAt && <span className={`${chip} bg-amber-50 text-amber-900 ring-amber-200`}>&ldquo;Not received yet&rdquo; marked {when(nd.notReceivedYetAt)}</span>}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 p-4">
          <p className="text-2xs font-bold uppercase tracking-wide text-stone-500">Donee&apos;s checklist</p>
          <ul className="mt-2 space-y-1 text-sm">
            {([[nd.checkedNeighbours, "Checked with neighbours / building security"], [nd.checkedFamily, "Checked with family members at the address"],
              [nd.checkedTracking, "Checked the courier tracking / delivery OTP"]] as const).map(([ok, label]) => (
              <li key={label} className={ok ? "text-emerald-800" : "text-stone-400"}>{ok ? "✓" : "–"} {label}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-stone-200 p-4">
          <p className="text-2xs font-bold uppercase tracking-wide text-stone-500">Declaration</p>
          <p className="mt-2 text-sm text-stone-800">
            {nd.declaredAt ? <>&ldquo;I confirm I have not received any of these items&rdquo; · {when(nd.declaredAt)}</> : "Not declared."}
          </p>
          {nd.declarationNote && <p className="mt-1 text-sm text-stone-600">{nd.declarationNote}</p>}
        </div>
      </div>

      {nd.lateArrivalReportedAt && (
        <div className="mt-4 rounded-2xl bg-sky-50 p-4 text-sm text-sky-950">
          <p className="font-bold">Package arrived later · reported {when(nd.lateArrivalReportedAt)}</p>
          <p>{nd.lateArrivalQuantity} item{nd.lateArrivalQuantity === 1 ? "" : "s"}, {nd.lateArrivalCondition === "DAMAGED" ? "damaged (see the gallery)" : "good"}{nd.lateArrivalNote ? `: ${nd.lateArrivalNote}` : ""}</p>
        </div>
      )}

      {nd.declaredAt && <ConfirmationControl offerId={purchase.offerId} nd={nd} onChanged={onChanged} />}
    </Section>
  );
}

/** Generate (logged, needs a note) and download the donor's non-delivery confirmation. */
function ConfirmationControl({ offerId, nd, onChanged }: { offerId: number; nd: AdminNonDeliveryCase; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-4 rounded-2xl border border-stone-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-stone-900">
          Non-delivery confirmation: {nd.confirmationGeneratedAt ? `generated ${when(nd.confirmationGeneratedAt)}${nd.confirmationGeneratedBy ? ` by ${nd.confirmationGeneratedBy}` : ""}` : "not generated"}
        </p>
        <div className="flex gap-3">
          {nd.confirmationGeneratedAt && (
            <button type="button" onClick={() => void downloadNonDeliveryConfirmation(offerId).catch(e => toast.error(e instanceof Error ? e.message : "Download failed"))}
              className="text-xs font-bold text-[#b04a15] underline">Download PDF</button>
          )}
          {!open && <button type="button" onClick={() => setOpen(true)} className="text-xs font-bold text-[#b04a15] underline">
            {nd.confirmationGeneratedAt ? "Generate again" : "Generate non-delivery confirmation"}
          </button>}
        </div>
      </div>
      <p className="mt-1 text-2xs text-stone-500">For the donor&apos;s &ldquo;item not received&rdquo; claim with the seller. Carries no donee contact details; the donor downloads it from their history.</p>
      {open && (
        <div className="mt-3 space-y-2">
          <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} maxLength={2000} aria-label="Admin note for the confirmation"
            placeholder="Admin note (required): e.g. Donor asked for it to file a claim with the seller."
            className="block w-full rounded-xl border border-stone-300 p-2.5 text-sm" />
          <button type="button" disabled={note.trim().length < 10 || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await adminGenerateNonDeliveryConfirmation(offerId, note.trim());
                toast.success("Generated. The donor can download it from their history");
                setOpen(false); setNote("");
                onChanged();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could not generate it");
              } finally {
                setBusy(false);
              }
            }}
            className="inline-flex min-h-10 items-center rounded-xl bg-[#b04a15] px-3.5 text-sm font-bold text-white disabled:opacity-50">
            Generate
          </button>
        </div>
      )}
    </div>
  );
}
