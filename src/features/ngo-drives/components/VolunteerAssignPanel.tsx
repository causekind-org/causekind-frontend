"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, UserRound } from "lucide-react";
import {
  assignVolunteer, getVolunteerAssignOptions, resendVolunteerLink, unassignVolunteer,
  type NgoDriveOfferHandoverRecordResponse, type NgoDriveOfferResponse, type VolunteerAssignOptions, type VolunteerAssignRequest,
} from "@/lib/api";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE = /^[6-9]\d{9}$/;
const buttonBase = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold disabled:opacity-50";
const primary = `${buttonBase} bg-[var(--handover-accent)] text-[var(--handover-on-accent)]`;
const secondary = `${buttonBase} border border-stone-300 dark:border-zinc-700`;

const message = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/** The NGO chooses who collects a pickup, and manages that person's link. */
export function VolunteerAssignPanel({ offer, handover, onChanged }: {
  offer: NgoDriveOfferResponse;
  handover: NgoDriveOfferHandoverRecordResponse | null;
  onChanged: () => void;
}) {
  const wantsAssign = useSearchParams().get("assign") === "1";
  const [options, setOptions] = useState<VolunteerAssignOptions | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);
  const [confirmingUnassign, setConfirmingUnassign] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const refreshKey = `${handover?.scheduledDateTime}|${handover?.confirmation?.otpVerified}|${offer.status}`;

  const load = useCallback(async () => {
    try {
      setOptions(await getVolunteerAssignOptions(offer.driveId, offer.id));
    } catch (e) {
      setError(message(e, "We couldn't load the pickup person."));
    }
  }, [offer.driveId, offer.id]);

  useEffect(() => { void load(); }, [load, refreshKey]);
  useEffect(() => {
    if (wantsAssign && !autoOpened && options?.canAssign && !options.assignment) {
      setAutoOpened(true);
      setSheetOpen(true);
    }
  }, [wantsAssign, autoOpened, options]);

  if (!options) return error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null;
  const { assignment, canAssign } = options;
  if (!assignment && !canAssign) return null;

  const run = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
      onChanged();
    } catch (e) {
      setError(message(e, fallback));
    } finally {
      setBusy(false);
    }
  };

  const newLink = (copy: boolean) => run(async () => {
    const r = await resendVolunteerLink(offer.driveId, offer.id);
    setLink(r.link);
    if (copy) {
      await navigator.clipboard?.writeText(r.link).then(() => setCopied(true)).catch(() => setCopied(false));
    }
  }, "We couldn't create a new link.");

  return (
    <section data-testid="volunteer-panel" className="mb-4 space-y-3 rounded-xl border border-stone-200 p-4 dark:border-zinc-700">
      <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-stone-100">
        <UserRound className="size-4" aria-hidden /> Pickup person
      </h3>
      {assignment ? (
        <>
          <div className="text-sm text-stone-800 dark:text-stone-200">
            <p className="font-semibold">{assignment.name}{assignment.role ? ` (${assignment.role})` : ""}</p>
            <p className="break-words text-xs text-stone-600 dark:text-stone-300">{assignment.phone} · {assignment.email}</p>
            <p data-testid="volunteer-email-status" className={`mt-1 text-xs font-semibold ${assignment.emailStatus === "FAILED" ? "text-red-600" : "text-stone-600 dark:text-stone-300"}`}>
              {assignment.emailStatus === "FAILED" ? "Email failed" : assignment.emailStatus === "SENT" ? "Email sent" : "Sending email…"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {assignment.emailStatus === "FAILED" && (
              <button type="button" disabled={busy} onClick={() => void newLink(true)} className={primary}>Copy link</button>
            )}
            <button type="button" disabled={busy} onClick={() => void newLink(false)} className={secondary}>Resend link</button>
            {canAssign && <button type="button" disabled={busy} onClick={() => setSheetOpen(true)} className={secondary}>Reassign</button>}
            {canAssign && <button type="button" disabled={busy} onClick={() => setConfirmingUnassign(true)} className={secondary}>Unassign</button>}
          </div>
          {link && (
            <div className="space-y-1">
              <p className="text-xs text-stone-600 dark:text-stone-300">{copied ? "New link copied. The old one has stopped working." : "New link. The old one has stopped working."}</p>
              <Input readOnly aria-label="Pickup link" value={link} onFocus={(e) => e.target.select()} className="h-11" />
            </div>
          )}
        </>
      ) : (
        <button type="button" onClick={() => setSheetOpen(true)} className={primary}>Assign a person</button>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {sheetOpen && (
        <AssignSheet options={options} busy={busy} onClose={() => setSheetOpen(false)}
          onConfirm={(body) => {
            setLink(null);
            void run(async () => {
              await assignVolunteer(offer.driveId, offer.id, body);
              setSheetOpen(false);
            }, "We couldn't assign this person.");
          }} error={error} />
      )}

      <Dialog open={confirmingUnassign} onOpenChange={setConfirmingUnassign}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl">
          <DialogTitle>Unassign {assignment?.name}?</DialogTitle>
          <DialogDescription>Their link stops working and they get an email saying so.</DialogDescription>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setConfirmingUnassign(false)} className={secondary}>Keep</button>
            <button type="button" disabled={busy} className={primary} onClick={() => {
              setConfirmingUnassign(false);
              setLink(null);
              void run(() => unassignVolunteer(offer.driveId, offer.id), "We couldn't unassign this person.");
            }}>Confirm unassign</button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function AssignSheet({ options, busy, error, onClose, onConfirm }: {
  options: VolunteerAssignOptions;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (body: VolunteerAssignRequest) => void;
}) {
  const [choice, setChoice] = useState<number | "new" | null>(options.contacts.length === 0 ? "new" : null);
  const [extraEmail, setExtraEmail] = useState("");
  const [person, setPerson] = useState({ name: "", phone: "", email: "", role: "" });

  const chosen = typeof choice === "number" ? options.contacts[choice] : null;
  const needsEmail = chosen != null && !chosen.email;
  const valid = choice === "new"
    ? person.name.trim().length >= 2 && MOBILE.test(person.phone) && EMAIL.test(person.email.trim())
    : chosen != null && (!needsEmail || EMAIL.test(extraEmail.trim()));

  const confirm = () => {
    if (choice === "new") {
      onConfirm({ newPerson: { name: person.name.trim(), phone: `+91${person.phone}`, email: person.email.trim(), role: person.role.trim() || null } });
    } else if (typeof choice === "number") {
      onConfirm(needsEmail ? { contactIndex: choice, email: extraEmail.trim() } : { contactIndex: choice });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent data-testid="assign-sheet" className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-md space-y-3 overflow-y-auto rounded-2xl">
        <DialogTitle>Assign a person</DialogTitle>
        <DialogDescription>They get an email with the pickup details and a private link.</DialogDescription>
        <div role="radiogroup" aria-label="Person" className="space-y-2">
          {options.contacts.map((c, i) => (
            <label key={i} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-stone-200 p-3 text-sm dark:border-zinc-700">
              <input type="radio" name="assign-person" checked={choice === i} onChange={() => setChoice(i)} className="mt-1" />
              <span className="min-w-0 break-words">
                <span className="font-semibold">{c.name}</span>{c.role ? ` (${c.role})` : ""}
                <span className="block text-xs text-stone-600 dark:text-stone-300">{c.phone}</span>
              </span>
            </label>
          ))}
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-stone-200 p-3 text-sm font-semibold dark:border-zinc-700">
            <input type="radio" name="assign-person" checked={choice === "new"} onChange={() => setChoice("new")} />
            + Add new person
          </label>
        </div>
        {needsEmail && (
          <Input aria-label="Email for this person" type="email" placeholder="Email for this person" value={extraEmail}
            onChange={(e) => setExtraEmail(e.target.value)} className="h-11" />
        )}
        {choice === "new" && (
          <div className="space-y-2">
            <Input aria-label="New person name" placeholder="Name" maxLength={100} value={person.name} onChange={(e) => setPerson({ ...person, name: e.target.value })} className="h-11" />
            <div className="flex gap-2">
              <span aria-hidden className="flex h-11 shrink-0 items-center rounded-md border border-input px-3 text-sm">+91</span>
              <Input aria-label="New person phone" type="tel" inputMode="numeric" maxLength={10} placeholder="Mobile number" value={person.phone}
                onChange={(e) => setPerson({ ...person, phone: e.target.value.replace(/\D/g, "") })} className="h-11" />
            </div>
            <Input aria-label="New person email" type="email" placeholder="Email" value={person.email} onChange={(e) => setPerson({ ...person, email: e.target.value })} className="h-11" />
            <Input aria-label="New person role" placeholder="Role (optional)" maxLength={60} value={person.role}
              onChange={(e) => setPerson({ ...person, role: e.target.value.replace(/[^A-Za-z .,&-]/g, "") })} className="h-11" />
          </div>
        )}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondary}>Cancel</button>
          <button type="button" disabled={!valid || busy} onClick={confirm} className={primary}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}Confirm
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
