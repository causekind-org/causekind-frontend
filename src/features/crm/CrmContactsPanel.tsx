"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import {
  crmAssignContact, crmClearDoNotCall, crmFollowups, crmListContacts, crmListStaff, crmReport,
  crmRevealPhone, crmSetDoNotCall,
  type CrmCallPurpose, type CrmContact, type CrmFollowup, type CrmReport, type CrmRole, type CrmStaff, type SaPage,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Phone, PhoneOff, X } from "lucide-react";
import { CrmContactActivity } from "./CrmContactActivity";
import { CrmWorkSummary } from "./CrmWorkSummary";

const ROLE_FILTERS: { label: string; value: CrmRole | null }[] = [
  { label: "All", value: null },
  { label: "Donors", value: "DONOR" },
  { label: "Donees", value: "DONEE" },
];

const OUTCOME_LABELS: Record<string, string> = {
  CONNECTED: "Connected", NO_ANSWER: "No answer", BUSY: "Busy",
  SWITCHED_OFF: "Switched off", WRONG_NUMBER: "Wrong number", CALLBACK: "Callback",
};

const selectClass = "h-8 rounded-md border bg-background px-2 text-sm";

function formatIst(value: string) {
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}

function istDay(date: Date) {
  return date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
}

function NextAction({ contact }: { contact: CrmContact }) {
  if (contact.doNotCall) return <Badge variant="destructive">Do not call</Badge>;
  if (contact.nextFollowUpAt) {
    const overdue = new Date(contact.nextFollowUpAt).getTime() < Date.now();
    return <Badge variant={overdue ? "destructive" : "secondary"}>{overdue ? "Overdue: " : ""}{formatIst(contact.nextFollowUpAt)} IST</Badge>;
  }
  if (contact.role === "DONEE" && !contact.hasRequest) return <Badge variant="outline">Never created a request</Badge>;
  return <span className="text-xs text-muted-foreground">None</span>;
}

/** The staff call list: a worklist table, with calling and logging in a side panel. */
export function CrmContactsPanel({ canManage }: { canManage: boolean }) {
  const [role, setRole] = useState<CrmRole | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [name, setName] = useState("");
  const [noRequest, setNoRequest] = useState(false);
  const [unassigned, setUnassigned] = useState(false);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<SaPage<CrmContact> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<CrmStaff[]>([]);
  const [followups, setFollowups] = useState<CrmFollowup[]>([]);
  const [report, setReport] = useState<CrmReport | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Record<number, string>>({});
  const [purposes, setPurposes] = useState<Record<number, CrmCallPurpose>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reasonFor, setReasonFor] = useState<"set" | "clear" | null>(null);
  const [reason, setReason] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => { setName(nameInput); setPage(0); }, 300);
    return () => clearTimeout(timer);
  }, [nameInput]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    crmListContacts({ role, name, noRequest, unassigned, page })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load the call list."))
      .finally(() => setLoading(false));
  }, [role, name, noRequest, unassigned, page]);

  useEffect(load, [load]);

  useEffect(() => {
    crmFollowups().then(setFollowups).catch(() => {});
    crmReport(canManage).then(setReport).catch(() => {});
  }, [canManage, refreshKey]);

  useEffect(() => {
    if (canManage) crmListStaff().then(setStaff).catch(() => {});
  }, [canManage]);

  useEffect(() => {
    if (openId === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  function changed() {
    setRefreshKey((k) => k + 1);
    load();
  }

  function open(userId: number) {
    setOpenId(userId);
    setReasonFor(null);
    setReason("");
  }

  async function reveal(userId: number) {
    const purpose = purposes[userId];
    if (!purpose) return;
    setBusyId(userId);
    try {
      const { phone } = await crmRevealPhone(userId, purpose);
      setRevealed((prev) => ({ ...prev, [userId]: phone }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reveal this number.");
    } finally {
      setBusyId(null);
    }
  }

  async function saveReason(userId: number) {
    if (!reasonFor || !reason.trim()) return;
    setBusyId(userId);
    try {
      await (reasonFor === "clear" ? crmClearDoNotCall(userId, reason.trim()) : crmSetDoNotCall(userId, reason.trim()));
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setReasonFor(null);
      setReason("");
      changed();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save that.");
    } finally {
      setBusyId(null);
    }
  }

  async function assign(userId: number, ownerUserId: number | null) {
    setBusyId(userId);
    try {
      await crmAssignContact(userId, ownerUserId);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not assign this contact.");
    } finally {
      setBusyId(null);
    }
  }

  const now = Date.now();
  const today = istDay(new Date());
  const overdue = followups.filter((f) => new Date(f.dueAt).getTime() < now).length;
  const dueToday = followups.filter((f) => new Date(f.dueAt).getTime() >= now && istDay(new Date(f.dueAt)) === today).length;
  const selected = data?.items.find((c) => c.userId === openId) ?? null;

  const stats = [
    { label: "Overdue", value: overdue, alert: overdue > 0 },
    { label: "Due today", value: dueToday, alert: false },
    { label: canManage ? "Team calls today" : "My calls today", value: report?.callsToday ?? 0, alert: false },
    { label: "Contacts in this list", value: data?.totalItems ?? 0, alert: false },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
        {stats.map((s) => (
          <div key={s.label}>
            <p className={`text-xl font-bold tabular-nums leading-tight ${s.alert ? "text-destructive" : ""}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => setShowSummary((v) => !v)}>
          {showSummary ? "Hide follow-ups and report" : "Follow-ups and report"}
        </Button>
      </div>

      {showSummary && <CrmWorkSummary canManage={canManage} refreshKey={refreshKey} onChanged={changed} />}

      <div className="flex flex-wrap items-center gap-2">
        {ROLE_FILTERS.map((f) => (
          <Button key={f.label} size="sm" variant={role === f.value ? "default" : "outline"}
            onClick={() => { setRole(f.value); setPage(0); }}>
            {f.label}
          </Button>
        ))}
        <Input className="w-full sm:w-56" placeholder="Search by name" aria-label="Search by name"
          value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={noRequest}
            onChange={(e) => { setNoRequest(e.target.checked); setPage(0); }} />
          Never created a request
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={unassigned}
            onChange={(e) => { setUnassigned(e.target.checked); setPage(0); }} />
          Unassigned
        </label>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading && !data && (
        <div className="flex justify-center py-16"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
      )}
      {data && data.items.length === 0 && !loading && (
        <p className="py-10 text-center text-sm text-muted-foreground">No contacts match these filters.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Contact</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Next action</th>
                <th className="px-3 py-2 font-semibold">Last call</th>
                <th className="px-3 py-2 font-semibold">Owner</th>
                <th className="px-3 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.userId} className={`border-b last:border-0 ${openId === c.userId ? "bg-muted/50" : ""}`}>
                  <td className="px-3 py-2.5">
                    <p className="font-medium">{c.fullName}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">{[c.maskedPhone, c.city].filter(Boolean).join(" · ")}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant="secondary">{c.role === "DONOR" ? "Donor" : "Donee"}</Badge>
                    {c.identityReview && <Badge variant="outline" className="ml-1">Check number</Badge>}
                  </td>
                  <td className="px-3 py-2.5"><NextAction contact={c} /></td>
                  <td className="px-3 py-2.5">
                    {c.lastCallAt ? (
                      <>
                        <p>{OUTCOME_LABELS[c.lastCallOutcome ?? ""] ?? c.lastCallOutcome}{c.lastCallerName ? `, ${c.lastCallerName}` : ""}</p>
                        <p className="text-xs text-muted-foreground">{formatIst(c.lastCallAt)} IST</p>
                      </>
                    ) : <span className="text-xs text-muted-foreground">Not called</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {canManage ? (
                      <select aria-label={`Owner of ${c.fullName}`} className={selectClass}
                        value={c.ownerUserId ?? ""} disabled={busyId === c.userId}
                        onChange={(e) => assign(c.userId, e.target.value ? Number(e.target.value) : null)}>
                        <option value="">Unassigned</option>
                        {staff.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                      </select>
                    ) : (c.ownerName ?? "Unassigned")}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Button size="sm" variant={c.doNotCall ? "outline" : "default"} onClick={() => open(c.userId)}>
                      {c.doNotCall ? "View" : <><Phone className="size-4" aria-hidden /> Call</>}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {data.page + 1} of {data.totalPages}</span>
          <Button size="sm" variant="outline" disabled={!data.hasNext} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}

      {selected && (
        <aside aria-label={`Call ${selected.fullName}`}
          className="fixed inset-y-0 right-0 z-50 w-full max-w-md space-y-3 overflow-y-auto border-l bg-background p-4 shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-lg font-semibold">{selected.fullName}</p>
              <p className="text-xs text-muted-foreground">
                {[selected.maskedPhone, selected.maskedEmail, selected.city].filter(Boolean).join(" · ")}
              </p>
            </div>
            <Button size="sm" variant="ghost" aria-label="Close" onClick={() => setOpenId(null)}><X className="size-4" aria-hidden /></Button>
          </div>

          {selected.doNotCall && selected.doNotCallReason && (
            <p className="text-sm text-destructive">Do not call: {selected.doNotCallReason}</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {!selected.doNotCall && (revealed[selected.userId] ? (
              <a className="inline-flex items-center gap-1.5 text-sm font-medium underline" href={`tel:${revealed[selected.userId]}`}>
                <Phone className="size-4" aria-hidden /> {revealed[selected.userId]}
              </a>
            ) : (
              <>
                <select aria-label={`Why are you calling ${selected.fullName}?`} className={selectClass}
                  value={purposes[selected.userId] ?? ""}
                  onChange={(e) => setPurposes((prev) => ({ ...prev, [selected.userId]: e.target.value as CrmCallPurpose }))}>
                  <option value="" disabled>Call purpose</option>
                  <option value="SUPPORT">Support</option>
                  <option value="ONBOARDING">Onboarding</option>
                  {selected.role === "DONOR" && <option value="FUNDRAISING">Fundraising</option>}
                </select>
                <Button size="sm" disabled={!purposes[selected.userId] || busyId === selected.userId} onClick={() => reveal(selected.userId)}>
                  <Phone className="size-4" aria-hidden /> Show number
                </Button>
              </>
            ))}
            {!selected.doNotCall && (
              <Button size="sm" variant="outline" onClick={() => { setReasonFor("set"); setReason(""); }}>
                <PhoneOff className="size-4" aria-hidden /> Do not call
              </Button>
            )}
            {selected.doNotCall && canManage && (
              <Button size="sm" variant="outline" onClick={() => { setReasonFor("clear"); setReason(""); }}>Clear do not call</Button>
            )}
          </div>

          {reasonFor && (
            <div className="flex flex-wrap items-center gap-2">
              <Input className="w-full" maxLength={500} value={reason} autoFocus aria-label="Reason"
                placeholder={reasonFor === "clear" ? "Why can we call again?" : "What did they say?"}
                onChange={(e) => setReason(e.target.value)} />
              <Button size="sm" disabled={!reason.trim() || busyId === selected.userId} onClick={() => saveReason(selected.userId)}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setReasonFor(null)}>Cancel</Button>
            </div>
          )}

          <CrmContactActivity key={selected.userId} userId={selected.userId} role={selected.role} onChanged={changed} />
        </aside>
      )}
    </div>
  );
}
