"use client";

import { CalendarDays, ExternalLink, MapPin, Repeat, StickyNote, Truck } from "lucide-react";
import { hasCoordinates, mapsHref } from "./adapters";
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
            {/* block, not inline: the link below is inline-flex, so an inline
                span ran straight into it — "Pinned locationOpen in Google Maps" */}
            <span className="block break-words">{s.address ?? "Pinned location"}</span>
            {showMap && (
              <a
                href={mapsHref(s.latitude!, s.longitude!)}
                target="_blank"
                rel="noopener noreferrer"
                // Reads as a control, not as run-on text: role-tinted fill, its
                // own line, an icon that says "leaves the page", and a 44px target.
                className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-[var(--handover-accent)]/30 bg-[var(--handover-soft)] px-3 text-sm font-semibold text-[var(--handover-on-soft)] transition-colors hover:border-[var(--handover-accent)]/60 hover:bg-[var(--handover-soft)]/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--handover-ring)]"
              >
                <MapPin className="size-4 shrink-0" aria-hidden />
                Open in Google Maps
                <ExternalLink className="size-3.5 shrink-0 opacity-70" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
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

function Row({ icon: Icon, label, children }: {
  icon: typeof CalendarDays; label: string; children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden />
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{label}</dt>
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
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">{title}</h2>
      )}
      {children}
    </section>
  );
}
