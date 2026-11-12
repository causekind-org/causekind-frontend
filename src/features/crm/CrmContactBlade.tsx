"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";
import {
  crmClearDoNotCall, crmRevealPhone, crmSetDoNotCall,
  type CrmCallPurpose, type CrmContact,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, History, LayoutGrid, Phone, PhoneCall, PhoneOff, RefreshCw } from "lucide-react";
import { CrmActivityLog, CrmLogCallForm } from "./CrmContactActivity";

type View = "overview" | "log" | "call";

const MENU: { id: View; label: string; icon: typeof History }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "log", label: "Activity log", icon: History },
  { id: "call", label: "Log a call", icon: PhoneCall },
];

const OUTCOME_LABELS: Record<string, string> = {
  CONNECTED: "Connected", NO_ANSWER: "No answer", BUSY: "Busy",
  SWITCHED_OFF: "Switched off", WRONG_NUMBER: "Wrong number", CALLBACK: "Callback",
};

const selectClass = "h-8 rounded-md border bg-background px-2 text-sm";
const commandClass = "inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-50";

function formatIst(value: string) {
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST";
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

/** One contact as an Azure-style resource page: breadcrumb, command bar, its own menu. */
export function CrmContactBlade({ contact, canManage, onBack, onChanged }: {
  contact: CrmContact; canManage: boolean; onBack: () => void; onChanged: () => void;
}) {
  const [view, setView] = useState<View>("log");
  const [purpose, setPurpose] = useState<CrmCallPurpose | "">("");
  const [phone, setPhone] = useState<string | null>(null);
  const [reasonFor, setReasonFor] = useState<"set" | "clear" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [logKey, setLogKey] = useState(0);

  function changed() {
    setLogKey((k) => k + 1);
    onChanged();
  }

  async function reveal() {
    if (!purpose) return;
    setBusy(true);
    try {
      const res = await crmRevealPhone(contact.userId, purpose);
      setPhone(res.phone);
      changed();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not show this number.");
    } finally {
      setBusy(false);
    }
  }

  async function saveReason() {
    if (!reasonFor || !reason.trim()) return;
    setBusy(true);
    try {
      await (reasonFor === "clear" ? crmClearDoNotCall(contact.userId, reason.trim()) : crmSetDoNotCall(contact.userId, reason.trim()));
      setPhone(null);
      setReasonFor(null);
      setReason("");
      changed();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that.");
    } finally {
      setBusy(false);
    }
  }

  const facts: [string, string][] = [
    ["Type", contact.role === "DONOR" ? "Donor" : "Donee"],
    ["Phone", phone ?? contact.maskedPhone ?? "None"],
    ["Email", contact.maskedEmail ?? "None"],
    ["City", contact.city ?? "None"],
    ["Registered", formatIst(contact.registeredAt)],
    ["Assigned to", contact.assignedCallerName ?? "Unassigned"],
    ["Next follow-up", contact.nextFollowUpAt ? formatIst(contact.nextFollowUpAt) : "None"],
    ["Last call", contact.lastCallAt
      ? `${OUTCOME_LABELS[contact.lastCallOutcome ?? ""] ?? contact.lastCallOutcome}${contact.lastCallerName ? `, ${contact.lastCallerName}` : ""} · ${formatIst(contact.lastCallAt)}`
      : "Not called"],
    ["Do not call", contact.doNotCall ? `Yes: ${contact.doNotCallReason ?? ""}` : "No"],
    ["Number check", contact.identityReview ? "Reported wrong" : "No"],
  ];

  return (
    <div className="-m-4 flex min-h-[calc(100vh-8rem)] flex-col bg-background">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 px-6 pt-3 text-sm text-muted-foreground">
        <button type="button" onClick={onBack} className="text-blue-700 hover:underline">Contacts</button>
        <span aria-hidden>›</span>
        <span className="truncate">{contact.fullName}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-3 px-6 pb-3 pt-2">
        <div className={`flex size-10 items-center justify-center rounded-md font-semibold text-white ${contact.role === "DONOR" ? "bg-[#c2410c]" : "bg-[#1e3a5f]"}`}>
          {initials(contact.fullName)}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{contact.fullName}</h1>
          <p className="text-xs text-muted-foreground">
            {contact.role === "DONOR" ? "Donor" : "Donee"}{contact.city ? ` · ${contact.city}` : ""} · Registered {formatIst(contact.registeredAt)}
          </p>
        </div>
      </div>

      <div role="toolbar" aria-label="Contact actions" className="flex flex-wrap items-center gap-1 border-y px-4 py-1.5">
        <button type="button" className={commandClass} onClick={onBack}><ArrowLeft className="size-4" aria-hidden /> Back</button>
        {!contact.doNotCall && (phone ? (
          <a className={commandClass} href={`tel:${phone}`}><Phone className="size-4" aria-hidden /> {phone}</a>
        ) : (
          <span className="inline-flex flex-wrap items-center gap-1.5 px-1">
            <select aria-label={`Why are you calling ${contact.fullName}?`} className={selectClass} value={purpose}
              onChange={(e) => setPurpose(e.target.value as CrmCallPurpose)}>
              <option value="" disabled>Call purpose</option>
              <option value="SUPPORT">Support</option>
              <option value="ONBOARDING">Onboarding</option>
              {contact.role === "DONOR" && <option value="FUNDRAISING">Fundraising</option>}
            </select>
            <button type="button" className={commandClass} disabled={!purpose || busy} onClick={reveal}>
              <Phone className="size-4" aria-hidden /> Show number
            </button>
          </span>
        ))}
        <button type="button" className={commandClass} onClick={() => setView("call")}><PhoneCall className="size-4" aria-hidden /> Log a call</button>
        {!contact.doNotCall && (
          <button type="button" className={`${commandClass} text-red-700 hover:bg-red-50`} onClick={() => { setReasonFor("set"); setReason(""); }}>
            <PhoneOff className="size-4" aria-hidden /> Do not call
          </button>
        )}
        {contact.doNotCall && canManage && (
          <button type="button" className={commandClass} onClick={() => { setReasonFor("clear"); setReason(""); }}>Clear do not call</button>
        )}
        <button type="button" className={`${commandClass} ml-auto text-foreground hover:bg-muted`} onClick={changed}>
          <RefreshCw className="size-4" aria-hidden /> Refresh
        </button>
      </div>

      {reasonFor && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-6 py-2">
          <Input className="w-full sm:w-96" maxLength={500} value={reason} autoFocus aria-label="Reason"
            placeholder={reasonFor === "clear" ? "Why can we call again?" : "What did they say?"}
            onChange={(e) => setReason(e.target.value)} />
          <Button size="sm" disabled={!reason.trim() || busy} onClick={saveReason}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setReasonFor(null)}>Cancel</Button>
        </div>
      )}
      {contact.doNotCall && (
        <p className="border-b bg-red-50 px-6 py-2 text-sm text-red-800">This person asked not to be called{contact.doNotCallReason ? `: ${contact.doNotCallReason}` : "."}</p>
      )}

      <div className="flex flex-1 flex-wrap">
        <aside className="w-full border-b py-2 md:w-52 md:border-b-0 md:border-r">
          {MENU.map((m) => {
            const active = m.id === view;
            const Icon = m.icon;
            return (
              <button key={m.id} type="button" onClick={() => setView(m.id)} aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-2 border-l-[3px] px-4 py-2 text-left text-sm ${
                  active ? "border-blue-700 bg-blue-50 font-semibold text-blue-900" : "border-transparent hover:bg-muted"
                }`}>
                <Icon className="size-4" aria-hidden /> {m.label}
              </button>
            );
          })}
        </aside>

        <main className="min-w-0 flex-1 p-4 md:p-6">
          {view === "overview" && (
            <dl className="grid max-w-3xl gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              {facts.map(([k, v]) => (
                <div key={k} className="border-b pb-2">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {view === "log" && <CrmActivityLog key={logKey} userId={contact.userId} />}
          {view === "call" && (
            <CrmLogCallForm userId={contact.userId} role={contact.role} onChanged={() => { changed(); setView("log"); }} />
          )}
        </main>
      </div>
    </div>
  );
}
