"use client";

import { useState } from "react";
import { CalendarDays, Check, Copy, ExternalLink, MapPin, Navigation, Repeat, StickyNote, Truck } from "lucide-react";
import { directionsHref, hasCoordinates, mapsHref, staticMapSrc } from "./adapters";
import type { HandoverViewModel } from "./model";

/**
 * The agreed logistics, read-only. The donor's edit affordance lives in the next-step
 * panel, not here — this is a reference card both roles see identically.
 */
export function HandoverScheduleSummary({ vm, onReschedule }: {
  vm: HandoverViewModel;
  onReschedule?: () => void;
}) {
  const s = vm.schedule;

  if (!s) {
    return (
      <Panel title="Schedule">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {vm.role === "DONOR"
            ? "You haven't set a time yet."
            : "The donor hasn't set a time yet. You'll be notified as soon as they do."}
        </p>
      </Panel>
    );
  }

  const showMap = hasCoordinates(s.latitude, s.longitude);
  const reschedulesLeft = Math.max(0, s.maxReschedules - s.rescheduleCount);
  const canReschedule = vm.role === "DONOR" && reschedulesLeft > 0 && !vm.closed && onReschedule;

  return (
    <Panel title="Schedule">
      <dl className="space-y-2.5 text-sm">
        <Row icon={CalendarDays} label="When">
          {s.scheduledAt
            ? new Date(s.scheduledAt).toLocaleString("en-IN", {
                weekday: "short", day: "numeric", month: "short",
                hour: "numeric", minute: "2-digit",
              })
            : "Not set"}
        </Row>
        <Row icon={Truck} label="How">{s.methodLabel ?? "Not set"}</Row>
        {(s.address || showMap) && (
          <Row icon={MapPin} label="Where">
            <HandoverPlace address={s.address} lat={showMap ? s.latitude : null} lng={showMap ? s.longitude : null} />
          </Row>
        )}
        {s.notes && <Row icon={StickyNote} label="Notes">{s.notes}</Row>}
        <Row icon={Repeat} label="Reschedules">
          {s.rescheduleCount} of {s.maxReschedules} used
          {reschedulesLeft === 0 && (
            <span className="ml-1 text-amber-600 dark:text-amber-400">— limit reached</span>
          )}
        </Row>
      </dl>

      {canReschedule && (
        <button
          type="button"
          onClick={onReschedule}
          className="mt-3 min-h-[44px] w-full rounded-lg border border-[var(--handover-accent)]/40 px-3 text-sm font-semibold text-[var(--handover-accent)] transition-colors hover:bg-[var(--handover-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--handover-ring)]"
        >
          Change the time
        </button>
      )}
      {vm.role === "DONEE" && !vm.closed && (
        <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
          Only the donor can change this. Ask in the chat if you need a different time.
        </p>
      )}
    </Panel>
  );
}

/**
 * The handover place: the address as the donor wrote it, a small map of the
 * pin that opens Google Maps, and the two things the person travelling needs,
 * directions and the address to copy.
 */
function HandoverPlace({ address, lat, lng }: { address: string | null; lat: number | null; lng: number | null }) {
  const pinned = lat != null && lng != null;
  const src = pinned ? staticMapSrc(lat, lng) : null;
  const [imgFailed, setImgFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked: the address is on screen to select */ }
  }

  const action = "inline-flex min-h-[44px] items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--handover-ring)]";
  const primary = `${action} border-[var(--handover-accent)]/30 bg-[var(--handover-soft)] text-[var(--handover-on-soft)] hover:border-[var(--handover-accent)]/60`;
  const secondary = `${action} border-stone-200 text-stone-700 hover:bg-stone-50 dark:border-zinc-700 dark:text-stone-200 dark:hover:bg-zinc-800`;

  return (
    <div className="space-y-2.5">
      <span className="block break-words font-medium text-stone-800 dark:text-stone-100">{address ?? "Pinned location"}</span>

      {pinned && src && !imgFailed && (
        <a
          href={mapsHref(lat, lng)} target="_blank" rel="noopener noreferrer"
          className="block overflow-hidden rounded-lg border border-stone-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--handover-ring)] dark:border-zinc-700"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- external Static Maps image; next/image would need the host configured and adds nothing here */}
          <img
            src={src} alt="Map of the handover spot. Opens Google Maps." loading="lazy"
            className="h-36 w-full object-cover sm:h-40" onError={() => setImgFailed(true)}
          />
        </a>
      )}

      <div className="flex flex-wrap gap-2">
        {pinned && (
          <>
            <a href={directionsHref(lat, lng)} target="_blank" rel="noopener noreferrer" className={primary}>
              <Navigation className="size-4 shrink-0" aria-hidden /> Directions
              <span className="sr-only">(opens Google Maps in a new tab)</span>
            </a>
            <a href={mapsHref(lat, lng)} target="_blank" rel="noopener noreferrer" className={secondary}>
              <MapPin className="size-4 shrink-0" aria-hidden /> Open in Google Maps
              <ExternalLink className="size-3.5 shrink-0 opacity-70" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </>
        )}
        {address && (
          <button type="button" onClick={() => void copy()} className={secondary}>
            {copied ? <Check className="size-4 shrink-0" aria-hidden /> : <Copy className="size-4 shrink-0" aria-hidden />}
            {copied ? "Copied" : "Copy address"}
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, children }: {
  icon: typeof CalendarDays; label: string; children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden />
      <div className="min-w-0 flex-1">
        <dt className="text-2xs font-semibold uppercase tracking-wide text-stone-400">{label}</dt>
        <dd className="text-stone-700 dark:text-stone-300">{children}</dd>
      </div>
    </div>
  );
}

/** Flat panel, 8px radius, no nesting — see the design notes in HandoverHubShell. */
export function Panel({ title, children, className = "" }: {
  title?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-lg border border-stone-200 bg-white p-3 sm:p-4 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
      {title && (
        <h2 className="mb-3 text-2xs font-bold uppercase tracking-wider text-stone-400">{title}</h2>
      )}
      {children}
    </section>
  );
}
