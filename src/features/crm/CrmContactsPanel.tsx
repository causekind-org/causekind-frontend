"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import {
  crmAssignCaller, crmCallers, crmFollowups, crmListContacts, crmReport,
  type CrmCaller, type CrmContact, type CrmFollowup, type CrmReport, type CrmRole, type SaPage,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Phone } from "lucide-react";
import { CrmContactBlade } from "./CrmContactBlade";
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

/** The staff call list: a worklist table; a contact opens as its own page. */
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
  const [callers, setCallers] = useState<CrmCaller[]>([]);
  const [followups, setFollowups] = useState<CrmFollowup[]>([]);
  const [report, setReport] = useState<CrmReport | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
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
    crmCallers().then(setCallers).catch(() => {});
  }, [refreshKey]);


  function changed() {
    setRefreshKey((k) => k + 1);
    load();
  }

  function open(userId: number) {
    setOpenId(userId);
  }


  async function assign(userId: number, callerId: number | null) {
    setBusyId(userId);
    try {
      await crmAssignCaller(userId, callerId);
      changed();
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

  if (selected) {
    return <CrmContactBlade key={selected.userId} contact={selected} canManage={canManage}
      onBack={() => setOpenId(null)} onChanged={changed} />;
  }

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
                <th className="px-3 py-2 font-semibold">Assigned to</th>
                <th className="px-3 py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.userId} className={`border-b last:border-0 ${openId === c.userId ? "bg-muted/50" : ""}`}>
                  <td className="px-3 py-2.5">
                    <button type="button" onClick={() => open(c.userId)}
                      className="text-left font-medium text-blue-700 hover:underline">
                      {c.fullName}
                    </button>
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
                    <select aria-label={`Assigned caller for ${c.fullName}`} className={selectClass}
                      value={c.assignedCallerId ?? ""} disabled={busyId === c.userId}
                      onChange={(e) => assign(c.userId, e.target.value ? Number(e.target.value) : null)}>
                      <option value="">Unassigned</option>
                      {c.assignedCallerId && !callers.some((x) => x.id === c.assignedCallerId) && (
                        <option value={c.assignedCallerId}>{c.assignedCallerName ?? "Removed name"}</option>
                      )}
                      {callers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
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

    </div>
  );
}
